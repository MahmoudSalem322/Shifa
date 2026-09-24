import { handle, HttpError, readJson, requireUser } from '@/lib/server/auth';
import { COLLECTION, canView, parseDonation, publicDonation } from '@/lib/server/donations';
import { store } from '@/lib/server/store';

/* GET /api/donations/{id} — Module 8 · "Display Donation Details". */
export const GET = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const items = await store.read(COLLECTION);
  const donation = items.find((d) => d.id === id && canView(user, d));
  if (!donation) throw new HttpError(404, 'لم يتم العثور على التبرع.');
  return Response.json({ donation: publicDonation(donation, user) });
});

/* PATCH /api/donations/{id} — the donor, while it is still pending:
   { action: 'edit', ...same fields as POST } corrects the donation;
   { action: 'withdraw', reason? } takes it off the review queue.
   Once a pharmacy or centre has reviewed it, it can no longer change. */
export const PATCH = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const body = await readJson(request);
  if (body.action !== 'edit' && body.action !== 'withdraw') throw new HttpError(400, 'إجراء غير مدعوم.');
  /* Validate before taking the lock. */
  const fields = body.action === 'edit' ? parseDonation(body) : null;
  const reason = String(body.reason ?? '').trim().slice(0, 500);

  const updated = await store.update(COLLECTION, (items) => {
    const index = items.findIndex((d) => d.id === id && d.donorId === user.id);
    if (index === -1) throw new HttpError(404, 'لم يتم العثور على التبرع.');
    const current = items[index];
    if (current.status !== 'pending') {
      throw new HttpError(409, current.status === 'withdrawn'
        ? 'تم سحب هذا التبرع مسبقاً.'
        : 'لا يمكن تعديل التبرع أو سحبه بعد مراجعته.');
    }
    const now = new Date().toISOString();
    const by = (fields && fields.donorName) || current.donorName || user.name || '';
    const next = body.action === 'edit'
      ? { ...current, ...fields, updatedAt: now, history: [...(current.history || []), { status: 'pending', at: now, by, note: 'عدّل المتبرع بيانات التبرع' }] }
      : { ...current, status: 'withdrawn', withdrawnAt: now, updatedAt: now, history: [...(current.history || []), { status: 'withdrawn', at: now, by, note: reason }] };
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: next };
  });

  return Response.json({
    donation: publicDonation(updated, user),
    message: body.action === 'edit' ? 'تم حفظ تعديلات التبرع.' : 'تم سحب التبرع.'
  });
});
