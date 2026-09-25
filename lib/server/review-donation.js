import 'server-only';
import { handle, HttpError, readJson, requireUser } from './auth';
import { COLLECTION, assertPending, managesDonations, publicDonation } from './donations';
import { notify } from './notify';
import { store } from './store';

/* Shared body of POST /api/donations/{id}/approve and /reject —
   Module 8 · "Create Approve/Reject Donation API" + "Update Donation Status". */
export function reviewHandler(decision) {
  return handle(async (request, { params }) => {
    const user = await requireUser(request);
    if (!managesDonations(user)) throw new HttpError(403, 'مراجعة التبرعات متاحة للصيدليات والمراكز الصحية والإدارة فقط.');

    const { id } = await params;
    const body = await readJson(request);
    const note = String((decision === 'approved' ? body.note : body.reason) || '').trim();

    if (decision === 'rejected' && note.length < 3) {
      throw new HttpError(400, 'اذكر سبب الرفض ليصل إلى المتبرع.', { errors: { Reason: ['اذكر سبب الرفض ليصل إلى المتبرع.'] } });
    }
    if (note.length > 500) throw new HttpError(400, 'الملاحظة يجب ألا تتجاوز 500 حرف.');

    const updated = await store.update(COLLECTION, (items) => {
      const index = items.findIndex((d) => d.id === id);
      if (index === -1) throw new HttpError(404, 'لم يتم العثور على التبرع.');
      assertPending(items[index]);
      if (items[index].donorId === user.id) throw new HttpError(403, 'لا يمكنك مراجعة تبرعك الخاص.');

      const now = new Date().toISOString();
      const reviewer = user.name || user.email || 'جهة المراجعة';
      const next = {
        ...items[index],
        status: decision,
        reviewedAt: now,
        reviewedBy: reviewer,
        reviewerId: user.id,
        reviewerRole: user.role,
        reviewNote: note,
        history: [...(items[index].history || []), { status: decision, at: now, by: reviewer, note }]
      };
      const copy = items.slice();
      copy[index] = next;
      return { items: copy, result: next };
    });

    await notify([{
      userId: updated.donorId,
      type: decision === 'approved' ? 'donation_approved' : 'donation_rejected',
      title: decision === 'approved' ? 'تم قبول تبرعك' : 'تم رفض تبرعك',
      message: updated.medicineName + (note ? ' — ' + note : ''),
      href: '/donations/' + updated.id
    }]);

    return Response.json({
      donation: publicDonation(updated, user),
      message: decision === 'approved' ? 'تم قبول التبرع.' : 'تم رفض التبرع.'
    });
  });
}
