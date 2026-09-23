import 'server-only';
import { normalizeDoctor } from '@/lib/vocab';
import { toItem } from '@/lib/api';
import { buildSlots } from '@/lib/schedule';
import { backend, HttpError } from './auth';
import { store } from './store';

export const COLLECTION = 'appointments';

/* Reads the doctor from the .NET API with the caller's token. */
export async function fetchDoctor(user, doctorId) {
  const result = await backend(user, 'GET', '/api/doctors/' + encodeURIComponent(doctorId));
  if (result.status === 404) throw new HttpError(404, 'لم يتم العثور على الطبيب.');
  if (result.status === 401) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  if (!result.ok) throw new HttpError(502, 'تعذّر تحميل بيانات الطبيب من الخادم.');
  const doctor = normalizeDoctor(toItem(result.payload));
  if (!doctor) throw new HttpError(404, 'لم يتم العثور على الطبيب.');
  return doctor;
}

/* A reservation waits at most this long on the .NET API; one older than
   that belongs to a request that died mid-flight and no longer holds. */
const RESERVATION_TTL_MS = 3 * 60 * 1000;

export function isHolding(appointment, now = Date.now()) {
  if (appointment.status === 'confirmed') return true;
  return appointment.status === 'reserving' && now - Date.parse(appointment.createdAt) < RESERVATION_TTL_MS;
}

/* Times already held for a doctor on a date: confirmed bookings plus
   reservations still waiting on the .NET API. */
export function bookedTimes(items, doctorId, date) {
  return new Set(
    items
      .filter((a) => String(a.doctorId) === String(doctorId) && a.date === date && isHolding(a))
      .map((a) => a.time)
  );
}

export function slotsFor(doctor, date, items) {
  return buildSlots({
    date,
    workDays: doctor.workDays,
    workHours: doctor.workHours,
    durationMinutes: doctor.durationMinutes,
    booked: bookedTimes(items, doctor.id, dateKey(date))
  });
}

export function dateKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/* "Upcoming" vs "previous" is derived from the slot, not stored. */
export function withTiming(appointment, now = new Date()) {
  const [h, m] = String(appointment.time || '00:00').split(':').map(Number);
  const [y, mo, d] = String(appointment.date).split('-').map(Number);
  const startsAt = new Date(y, mo - 1, d, h || 0, m || 0);
  const past = startsAt.getTime() < now.getTime();
  let status = appointment.status;
  if (status === 'confirmed' && past) status = 'completed';
  return { ...appointment, status, startsAt: startsAt.toISOString(), upcoming: !past && appointment.status === 'confirmed' };
}

export function publicAppointment(appointment) {
  /* eslint-disable-next-line no-unused-vars */
  const { patientId, ...rest } = withTiming(appointment);
  return rest;
}

export const readAppointments = () => store.read(COLLECTION);
