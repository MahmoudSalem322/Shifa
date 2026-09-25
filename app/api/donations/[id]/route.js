import { handle, HttpError, isAdmin, readJson, requireUser } from '@/lib/server/auth';
import { COLLECTION, canView, parseDonation, publicDonation } from '@/lib/server/donations';
import { settleDonationStatus } from '@/lib/server/matches';
import { notify } from '@/lib/server/notify';
import { store } from '@/lib/server/store';
import { DONATION_STATUS } from '@/lib/vocab';

/* Statuses the admin may set by hand; matched / delivered follow the
   donation's matches. */
const ADMIN_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];

const hasActiveMatches = (donation) => (donation.allocations || []).some((a) => a.status === 'reserved');

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
  if (isAdmin(user)) return adminPatch(user, id, body);
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

/* Admin: { action: 'edit', ...fields } at any stage, or
   { action: 'status', status, note? } to set the status by hand. */
async function adminPatch(user, id, body) {
  if (body.action !== 'edit' && body.action !== 'status') throw new HttpError(400, 'إجراء غير مدعوم.');
  const fields = body.action === 'edit' ? parseDonation({ confirmSealed: true, ...body }) : null;
  const status = String(body.status || '');
  if (body.action === 'status' && !ADMIN_STATUSES.includes(status)) throw new HttpError(400, 'حالة غير معروفة.');
  const note = String(body.note ?? '').trim().slice(0, 500);

  const { before, after } = await store.update(COLLECTION, (items) => {
    const index = items.findIndex((d) => d.id === id);
    if (index === -1) throw new HttpError(404, 'لم يتم العثور على التبرع.');
    const current = items[index];
    const now = new Date().toISOString();
    const by = user.name || 'الإدارة';
    let next;
    if (fields) {
      const linked = (current.allocations || []).filter((a) => a.status !== 'cancelled').reduce((sum, a) => sum + a.quantity, 0);
      if (fields.quantity < linked) throw new HttpError(409, 'الكمية أقل من المرتبط بطلبات الأدوية (' + linked + ').');
      next = { ...current, ...fields, updatedAt: now, history: [...(current.history || []), { status: current.status, at: now, by, note: 'عدّلت الإدارة بيانات التبرع' }] };
      next.status = settleDonationStatus(next);
    } else {
      if (status !== 'approved' && hasActiveMatches(current)) {
        throw new HttpError(409, 'هذا التبرع محجوز لطلبات أدوية. ألغِ المطابقات المرتبطة به أولاً.');
      }
      next = { ...current, status, updatedAt: now };
      if (status === 'approved' || status === 'rejected') {
        Object.assign(next, { reviewedAt: now, reviewedBy: by, reviewerId: current.reviewerId || user.id, reviewerRole: current.reviewerRole || 'Admin', reviewNote: note });
      }
      if (status === 'approved') next.status = settleDonationStatus(next);
      next.history = [...(current.history || []), { status: next.status, at: now, by, note: note || 'غيّرت الإدارة حالة التبرع' }];
    }
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: { before: current, after: next } };
  });

  if (!fields && before.status !== after.status) {
    await notify([{
      userId: after.donorId,
      type: 'info',
      title: 'تم تحديث حالة تبرعك',
      message: after.medicineName + ' — ' + (DONATION_STATUS[after.status] || {}).label + (note ? ' — ' + note : ''),
      href: '/donations/' + after.id
    }]);
  }

  return Response.json({ donation: publicDonation(after, user), message: fields ? 'تم حفظ تعديلات التبرع.' : 'تم تحديث حالة التبرع.' });
}

/* DELETE /api/donations/{id} — admin only. A donation still reserved for
   drug requests cannot go until those matches are cancelled. */
export const DELETE = handle(async (request, { params }) => {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, 'حذف التبرعات متاح للإدارة فقط.');
  const { id } = await params;
  await store.update(COLLECTION, (items) => {
    const current = items.find((d) => d.id === id);
    if (!current) throw new HttpError(404, 'لم يتم العثور على التبرع.');
    if (hasActiveMatches(current)) throw new HttpError(409, 'هذا التبرع محجوز لطلبات أدوية. ألغِ المطابقات المرتبطة به أولاً.');
    return { items: items.filter((d) => d.id !== id), result: null };
  });
  return Response.json({ message: 'تم حذف التبرع.' });
});
