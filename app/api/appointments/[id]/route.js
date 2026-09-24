import { handle, HttpError, readJson, requireUser } from '@/lib/server/auth';
import { COLLECTION, publicAppointment, withTiming } from '@/lib/server/appointments';
import { store } from '@/lib/server/store';

/* GET /api/appointments/{id} — Module 4 · "View Appointment Details". */
export const GET = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const items = await store.read(COLLECTION);
  const appointment = items.find((a) => a.id === id && a.patientId === user.id && a.status !== 'reserving');
  if (!appointment) throw new HttpError(404, 'لم يتم العثور على الموعد.');
  return Response.json({ appointment: publicAppointment(appointment) });
});

/* PATCH /api/appointments/{id} { action: 'cancel' }
   Module 4 · "Create Cancel Appointment API" + "Update Appointment Status".
   The .NET API has no cancel endpoint, so the cancellation is recorded
   here and frees the slot for other patients.
   TODO(api): forward to the .NET API once it exposes cancellation. */
export const PATCH = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const body = await readJson(request);
  if (body.action !== 'cancel') throw new HttpError(400, 'إجراء غير مدعوم.');

  const updated = await store.update(COLLECTION, (items) => {
    const index = items.findIndex((a) => a.id === id && a.patientId === user.id);
    if (index === -1) throw new HttpError(404, 'لم يتم العثور على الموعد.');
    const current = withTiming(items[index]);
    if (items[index].status === 'cancelled') throw new HttpError(409, 'تم إلغاء هذا الموعد مسبقاً.');
    if (!current.upcoming) throw new HttpError(409, 'لا يمكن إلغاء موعد انتهى وقته.');
    const next = { ...items[index], status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: String(body.reason ?? '').slice(0, 500) };
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: next };
  });

  return Response.json({ appointment: publicAppointment(updated), message: 'تم إلغاء الموعد.' });
});
