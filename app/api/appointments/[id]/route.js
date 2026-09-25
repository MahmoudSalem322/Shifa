import { handle, HttpError, isAdmin, readJson, requireUser } from '@/lib/server/auth';
import {
  COLLECTION, doctorAccountOf, doctorAppointment, ownDoctorId, publicAppointment, withTiming
} from '@/lib/server/appointments';
import { notify } from '@/lib/server/notify';
import { store } from '@/lib/server/store';
import { APPOINTMENT_STATUS, formatDate, timeLabel } from '@/lib/vocab';

/* GET /api/appointments/{id} — Module 4 · "View Appointment Details". */
export const GET = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const items = await store.read(COLLECTION);
  const appointment = items.find((a) => a.id === id && a.patientId === user.id && a.status !== 'reserving');
  if (!appointment) throw new HttpError(404, 'لم يتم العثور على الموعد.');
  return Response.json({ appointment: publicAppointment(appointment) });
});

const DOCTOR_ACTIONS = {
  confirm: { status: 'confirmed', message: 'تم تأكيد الموعد وإبلاغ المريض.', title: 'تم تأكيد موعدك' },
  complete: { status: 'completed', message: 'تم تسجيل حضور المريض.', title: 'اكتمل موعدك' },
  no_show: { status: 'no_show', message: 'تم تسجيل عدم حضور المريض.', title: 'سُجّل غيابك عن الموعد' },
  cancel: { status: 'cancelled', message: 'تم إلغاء الموعد وإبلاغ المريض.', title: 'ألغى الطبيب موعدك' }
};

/* PATCH /api/appointments/{id}
   Patient: { action: 'cancel', reason? } — Module 4 · "Create Cancel
     Appointment API" + "Update Appointment Status". Frees the slot.
   Doctor:  { action: 'complete' | 'no_show' | 'cancel', reason?, as: 'doctor' }
     — attendance once the slot has started, or cancellation before it.
   The .NET API has no cancel endpoint, so the change is recorded here.
   TODO(api): forward to the .NET API once it exposes cancellation. */
export const PATCH = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const body = await readJson(request);
  const reason = String(body.reason ?? '').trim().slice(0, 500);
  const now = new Date().toISOString();

  if (body.as === 'admin') return adminPatch(user, id, body, reason, now);

  if (body.as === 'doctor') {
    if (user.role !== 'Doctor') throw new HttpError(403, 'هذا الإجراء متاح للأطباء فقط.');
    const action = DOCTOR_ACTIONS[body.action];
    if (!action) throw new HttpError(400, 'إجراء غير مدعوم.');
    const doctorId = await ownDoctorId(user);

    const updated = await store.update(COLLECTION, (items) => {
      const index = items.findIndex((a) => a.id === id && String(a.doctorId) === doctorId && a.status !== 'reserving');
      if (index === -1) throw new HttpError(404, 'لم يتم العثور على الموعد.');
      const stored = items[index];
      if (stored.status === 'cancelled' || stored.status === 'completed' || stored.status === 'no_show') {
        throw new HttpError(409, 'تم تحديث حالة هذا الموعد مسبقاً ولا يمكن تغييرها.');
      }
      const timing = withTiming(stored);
      if (body.action === 'confirm' && stored.status !== 'pending') throw new HttpError(409, 'هذا الموعد مؤكد مسبقاً.');
      if (body.action === 'cancel' && !timing.upcoming) throw new HttpError(409, 'لا يمكن إلغاء موعد بدأ وقته. سجّل الحضور أو الغياب بدلاً من ذلك.');
      if ((body.action === 'complete' || body.action === 'no_show') && timing.upcoming) throw new HttpError(409, 'يمكن تسجيل الحضور أو الغياب بعد بدء وقت الموعد.');
      const next = {
        ...stored,
        status: action.status,
        updatedAt: now,
        ...(body.action === 'cancel' ? { cancelledAt: now, cancelledBy: 'doctor', cancelReason: reason } : 
           (body.action === 'confirm' ? { confirmedAt: now } : { attendanceAt: now }))
      };
      const copy = items.slice();
      copy[index] = next;
      return { items: copy, result: next };
    });

    await notify([{
      userId: updated.patientId,
      type: body.action === 'cancel' ? 'appointment_cancelled' : 'appointment_' + action.status,
      title: action.title,
      message: 'موعدك مع ' + updated.doctorName + ' ' + formatDate(updated.date) + ' الساعة ' + timeLabel(updated.time) + (reason ? ' — ' + reason : ''),
      href: '/appointments/' + updated.id
    }]);

    return Response.json({ appointment: doctorAppointment(updated), message: action.message });
  }

  if (body.action !== 'cancel') throw new HttpError(400, 'إجراء غير مدعوم.');

  const updated = await store.update(COLLECTION, (items) => {
    const index = items.findIndex((a) => a.id === id && a.patientId === user.id);
    if (index === -1) throw new HttpError(404, 'لم يتم العثور على الموعد.');
    const current = withTiming(items[index]);
    if (items[index].status === 'cancelled') throw new HttpError(409, 'تم إلغاء هذا الموعد مسبقاً.');
    if (!current.upcoming) throw new HttpError(409, 'لا يمكن إلغاء موعد انتهى وقته.');
    const next = { ...items[index], status: 'cancelled', cancelledAt: now, cancelledBy: 'patient', cancelReason: reason };
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: next };
  });

  const doctorAccount = await doctorAccountOf(updated.doctorId).catch(() => '');
  await notify([{
    userId: doctorAccount,
    type: 'appointment_cancelled',
    title: 'ألغى مريض موعده',
    message: updated.patientName + ' · ' + formatDate(updated.date) + ' الساعة ' + timeLabel(updated.time),
    href: '/doctor-appointments'
  }]);

  return Response.json({ appointment: publicAppointment(updated), message: 'تم إلغاء الموعد.' });
});

/* Admin: { as: 'admin', action: 'status', status, reason? } sets any
   status; the patient and the doctor are told. */
async function adminPatch(user, id, body, reason, now) {
  if (!isAdmin(user)) throw new HttpError(403, 'هذا الإجراء متاح للإدارة فقط.');
  const status = String(body.status || '');
  if (body.action !== 'status' || !APPOINTMENT_STATUS[status] || status === 'reserving') throw new HttpError(400, 'حالة غير معروفة.');

  const updated = await store.update(COLLECTION, (items) => {
    const index = items.findIndex((a) => a.id === id && a.status !== 'reserving');
    if (index === -1) throw new HttpError(404, 'لم يتم العثور على الموعد.');
    const next = {
      ...items[index],
      status,
      updatedAt: now,
      ...(status === 'cancelled' ? { cancelledAt: now, cancelledBy: 'admin', cancelReason: reason } : {})
    };
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: next };
  });

  const label = APPOINTMENT_STATUS[status].label;
  const when = formatDate(updated.date) + ' الساعة ' + timeLabel(updated.time);
  const doctorAccount = await doctorAccountOf(updated.doctorId).catch(() => '');
  await notify([
    { userId: updated.patientId, type: status === 'cancelled' ? 'appointment_cancelled' : 'info', title: 'حدّثت الإدارة موعدك: ' + label, message: 'موعدك مع ' + updated.doctorName + ' ' + when + (reason ? ' — ' + reason : ''), href: '/appointments/' + updated.id },
    { userId: doctorAccount, type: 'info', title: 'حدّثت الإدارة موعداً: ' + label, message: updated.patientName + ' · ' + when, href: '/doctor-appointments' }
  ]);

  return Response.json({ appointment: doctorAppointment(updated), message: 'تم تحديث حالة الموعد.' });
}

/* DELETE /api/appointments/{id} — admin only; frees the slot. */
export const DELETE = handle(async (request, { params }) => {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, 'حذف المواعيد متاح للإدارة فقط.');
  const { id } = await params;
  await store.update(COLLECTION, (items) => {
    if (!items.some((a) => a.id === id)) throw new HttpError(404, 'لم يتم العثور على الموعد.');
    return { items: items.filter((a) => a.id !== id), result: null };
  });
  return Response.json({ message: 'تم حذف الموعد.' });
});
