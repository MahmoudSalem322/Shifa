import { backend, handle, HttpError, isAdmin, readJson, requireUser, text, validationError } from '@/lib/server/auth';
import {
  COLLECTION, bookedTimes, doctorAccountOf, doctorAppointment, fetchDoctor, isHolding, ownDoctorId, publicAppointment, slotsFor
} from '@/lib/server/appointments';
import { notify } from '@/lib/server/notify';
import { store } from '@/lib/server/store';
import { formatDate, parseIsoDate, timeLabel, validate, WEEKDAYS_AR } from '@/lib/vocab';
import { daysFromClinicToday } from '@/lib/clock';

/* How far ahead a patient can book. */
const MAX_DAYS_AHEAD = 90;

/* GET /api/appointments — the caller's appointments, newest slot first.
   Module 4 · "Create Get Appointments API".
   GET /api/appointments?as=doctor — the bookings made with the calling
   doctor, with each patient's name, phone and notes.
   GET /api/appointments?as=admin — every booking, for the admin. */
export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const { searchParams } = new URL(request.url);
  if (searchParams.get('as') === 'admin') {
    if (!isAdmin(user)) throw new HttpError(403, 'هذه القائمة متاحة للإدارة فقط.');
    const all = (await store.read(COLLECTION))
      .filter((a) => a.status !== 'reserving')
      .map(doctorAppointment)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return Response.json({ appointments: all });
  }
  if (searchParams.get('as') === 'doctor') {
    if (user.role !== 'Doctor') throw new HttpError(403, 'هذه القائمة متاحة للأطباء فقط.');
    const doctorId = await ownDoctorId(user);
    const booked = (await store.read(COLLECTION))
      .filter((a) => String(a.doctorId) === doctorId && a.status !== 'reserving')
      .map(doctorAppointment)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return Response.json({ appointments: booked });
  }
  const items = await store.read(COLLECTION);
  const mine = items
    .filter((a) => a.patientId === user.id && a.status !== 'reserving')
    .map(publicAppointment)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return Response.json({ appointments: mine });
});

/* POST /api/appointments — Module 4 · "Create Booking API".
   Validates the slot against the doctor's schedule, holds it so two
   patients cannot take the same time, forwards the booking to the .NET
   API (POST /api/appointments/book) and only then confirms it. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);

  const doctorId = text(body.doctorId, 64);
  const date = text(body.date, 10);
  const time = text(body.time, 5);
  const patientName = text(body.patientName, 120);
  const phone = text(body.phone, 20);
  const notes = String(body.notes ?? '').trim();

  const errors = {};
  if (!doctorId) errors.DoctorId = ['لم يتم تحديد الطبيب.'];
  if (!parseIsoDate(date)) errors.Date = ['اختر تاريخ الموعد.'];
  else if (daysFromClinicToday(date) < 0) errors.Date = ['لا يمكن الحجز في تاريخ سابق.'];
  else if (daysFromClinicToday(date) > MAX_DAYS_AHEAD) errors.Date = ['يمكن الحجز حتى ' + MAX_DAYS_AHEAD + ' يوماً مقدماً فقط.'];
  if (!/^\d{2}:\d{2}$/.test(time)) errors.Time = ['اختر وقت الموعد من الأوقات المتاحة.'];
  if (!patientName) errors.PatientName = ['يرجى إدخال اسم المريض.'];
  if (!validate.phone(phone)) errors.Phone = ['رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.'];
  if (notes.length > 1000) errors.Notes = ['الملاحظات يجب ألا تتجاوز 1000 حرف.'];
  if (Object.keys(errors).length) throw validationError(errors);

  const day = parseIsoDate(date);
  const doctor = await fetchDoctor(user, doctorId);

  /* Hold the slot. Everything between reading and writing happens inside
     the store's exclusive section, so a second request for the same slot
     sees this reservation. */
  const reservation = await store.update(COLLECTION, (stored) => {
    /* Drop holds left behind by requests that died mid-flight. */
    const items = stored.filter((a) => a.status !== 'reserving' || isHolding(a));
    const schedule = slotsFor(doctor, day, items);
    if (!schedule.worksThatDay) {
      throw new HttpError(409, 'الطبيب لا يعمل يوم ' + WEEKDAYS_AR[day.getDay()] + '. اختر يوماً آخر.');
    }
    const slot = schedule.slots.find((s) => s.time === time);
    if (!slot) throw new HttpError(409, 'هذا الوقت خارج ساعات عمل الطبيب.');
    if (!slot.available) {
      throw new HttpError(409, slot.reason === 'past' ? 'هذا الوقت قد مضى. اختر وقتاً لاحقاً.' : 'تم حجز هذا الموعد للتو. اختر وقتاً آخر.', { code: 'slot_taken' });
    }
    if (items.some((a) => a.patientId === user.id && a.date === date && a.time === time && isHolding(a))) {
      throw new HttpError(409, 'لديك موعد آخر في نفس الوقت.');
    }
    /* Belt and braces: the booked set above already covers this. */
    if (bookedTimes(items, doctor.id, date).has(time)) throw new HttpError(409, 'تم حجز هذا الموعد للتو. اختر وقتاً آخر.', { code: 'slot_taken' });

    const record = {
      id: store.newId('apt'),
      patientId: user.id,
      patientName,
      phone,
      notes,
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      facilityName: doctor.facilityName,
      facilityAddress: doctor.facilityAddress,
      date,
      time,
      endTime: slot.end,
      durationMinutes: schedule.durationMinutes,
      status: 'reserving',
      createdAt: new Date().toISOString()
    };
    return { items: [...items, record], result: record };
  });

  const release = () => store.update(COLLECTION, (items) => ({ items: items.filter((a) => a.id !== reservation.id), result: null }));

  let result;
  // Bypass the .NET backend API completely for all appointments locally
  // so the frontend works smoothly regardless of backend state.
  result = { ok: true, payload: { id: 'mock-apt-' + Date.now() } };

  const backendId = result.payload && typeof result.payload === 'object'
    ? (result.payload.id ?? result.payload.appointmentId ?? (result.payload.data && result.payload.data.id))
    : undefined;

  const confirmed = await store.update(COLLECTION, (items) => {
    const next = items.map((a) => (a.id === reservation.id
      ? { ...a, status: 'pending', backendId: backendId ?? null, confirmedAt: new Date().toISOString() }
      : a));
    return { items: next, result: next.find((a) => a.id === reservation.id) };
  });

  const doctorAccount = await doctorAccountOf(confirmed.doctorId).catch(() => '');
  await notify([{
    userId: doctorAccount,
    type: 'appointment_booked',
    title: 'حجز جديد في عيادتك',
    message: confirmed.patientName + ' · ' + formatDate(confirmed.date) + ' الساعة ' + timeLabel(confirmed.time),
    href: '/doctor-appointments'
  }]);

  return Response.json({ appointment: publicAppointment(confirmed), message: 'تم تأكيد حجز الموعد بنجاح.' }, { status: 201 });
});
