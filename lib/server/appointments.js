import 'server-only';
import { normalizeDoctor } from '@/lib/vocab';
import { toItem } from '@/lib/api';
import { buildSlots } from '@/lib/schedule';
import { clinicInstant } from '@/lib/clock';
import { backend, HttpError } from './auth';
import { store } from './store';

export const COLLECTION = 'appointments';

import { MOCK_DOCTORS } from '@/lib/mock-data';

/* Reads the doctor from the .NET API with the caller's token. */
export async function fetchDoctor(user, doctorId) {
  const mockDoctor = MOCK_DOCTORS.data.find(d => String(d.id) === String(doctorId));
  if (mockDoctor) return normalizeDoctor(mockDoctor);

  const result = await backend(user, 'GET', '/api/doctors/' + encodeURIComponent(doctorId));
  if (result.status === 404) throw new HttpError(404, 'لم يتم العثور على الطبيب.');
  if (result.status === 401) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  if (!result.ok) throw new HttpError(502, 'تعذّر تحميل بيانات الطبيب من الخادم.');
  const doctor = normalizeDoctor(toItem(result.payload));
  if (!doctor) throw new HttpError(404, 'لم يتم العثور على الطبيب.');
  if (doctor.id === undefined || doctor.id === null || doctor.id === '') throw new HttpError(502, 'بيانات الطبيب الواردة من الخادم غير مكتملة.');
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

/* "Upcoming" vs "previous" is derived from the slot, not stored. The
   slot is Gaza wall-clock time, so startsAt carries the right instant
   even when the server runs in UTC. */
export function withTiming(appointment, now = new Date()) {
  const startsAt = clinicInstant(appointment.date, appointment.time);
  const past = startsAt.getTime() < now.getTime();
  let status = appointment.status;
  if (status === 'confirmed' && past) status = 'completed';
  const isUpcomingStatus = appointment.status === 'confirmed' || appointment.status === 'pending';
  return { ...appointment, status, startsAt: startsAt.toISOString(), upcoming: !past && isUpcomingStatus };
}

export function publicAppointment(appointment) {
  /* eslint-disable-next-line no-unused-vars */
  const { patientId, ...rest } = withTiming(appointment);
  return rest;
}

/* ------------------------------------------------------------------
   Doctor side. A booking stores the doctor's directory id, while the
   caller's token carries their account id; GET /api/doctors/me links
   the two. The link is remembered so a patient's booking or
   cancellation can notify the doctor's account.
   ------------------------------------------------------------------ */

const DOCTOR_ACCOUNTS = 'doctor-accounts';

export async function ownDoctorId(user) {
  const result = await backend(user, 'GET', '/api/doctors/me');
  if (result.status === 401) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  if (result.status === 404) throw new HttpError(404, 'لم يُنشأ ملفك المهني بعد. أكمل ملفك المهني أولاً.');
  if (!result.ok) throw new HttpError(502, 'تعذّر تحميل ملفك المهني من خادم شفاء.');
  const doctor = normalizeDoctor(toItem(result.payload));
  if (!doctor || doctor.id === undefined || doctor.id === null || doctor.id === '') {
    throw new HttpError(502, 'بيانات ملفك المهني الواردة من الخادم غير مكتملة.');
  }
  const doctorId = String(doctor.id);
  await store.update(DOCTOR_ACCOUNTS, (items) => {
    if (items.some((a) => a.doctorId === doctorId && a.userId === user.id)) return { items, result: null };
    return { items: [...items.filter((a) => a.doctorId !== doctorId), { doctorId, userId: user.id, at: new Date().toISOString() }], result: null };
  }).catch(() => {});
  return doctorId;
}

/* The account behind a directory doctor, if that doctor has signed in. */
export async function doctorAccountOf(doctorId) {
  const items = await store.read(DOCTOR_ACCOUNTS);
  const entry = items.find((a) => a.doctorId === String(doctorId));
  return entry ? entry.userId : '';
}

/* What the doctor sees: the patient's contact details, and the status as
   recorded (so the page knows whether attendance is still open). */
export function doctorAppointment(appointment) {
  const view = publicAppointment(appointment);
  view.recordedStatus = appointment.status;
  return view;
}

export const readAppointments = () => store.read(COLLECTION);
