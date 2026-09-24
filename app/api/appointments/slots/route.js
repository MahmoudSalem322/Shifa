import { handle, HttpError, requireUser } from '@/lib/server/auth';
import { fetchDoctor, readAppointments, slotsFor } from '@/lib/server/appointments';
import { parseIsoDate } from '@/lib/vocab';
import { daysFromClinicToday } from '@/lib/clock';

/* GET /api/appointments/slots?doctorId=&date=YYYY-MM-DD
   Module 4 · "Create Available Slots API". Builds the day's slots from
   the doctor's workDays / workHours / consultationDurationMinutes and
   marks the ones already booked or already past. */
export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctorId');
  const date = parseIsoDate(searchParams.get('date'));

  if (!doctorId) throw new HttpError(400, 'لم يتم تحديد الطبيب.');
  if (!date) throw new HttpError(400, 'صيغة التاريخ غير صحيحة.');

  if (daysFromClinicToday(searchParams.get('date')) < 0) throw new HttpError(400, 'لا يمكن الحجز في تاريخ سابق.');

  const doctor = await fetchDoctor(user, doctorId);
  const items = await readAppointments();
  const result = slotsFor(doctor, date, items);

  return Response.json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
      facilityName: doctor.facilityName,
      workDays: doctor.workDays,
      workHours: doctor.workHours,
      durationMinutes: result.durationMinutes
    },
    date: searchParams.get('date'),
    ...result
  });
});
