import { handle, HttpError, isAdmin, readJson, requireUser } from '@/lib/server/auth';
import { COLLECTION as DONATIONS } from '@/lib/server/donations';
import { COLLECTION, canViewMatch, handlesMatch, publicMatch, settleDonationStatus } from '@/lib/server/matches';
import { notify } from '@/lib/server/notify';
import { store } from '@/lib/server/store';

/* GET /api/matches/{id} — Module 9 · "Display Match Details". */
export const GET = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const match = (await store.read(COLLECTION)).find((m) => m.id === id);
  if (!match || !canViewMatch(user, match)) throw new HttpError(404, 'لم يتم العثور على المطابقة.');
  return Response.json({ match: publicMatch(match, user) });
});

/* PATCH /api/matches/{id} { action: 'cancel' | 'deliver', note? }
   cancel  — the patient or a reviewer, while reserved; the units go back
             to the donation.
   deliver — the pharmacy or centre that approved the donation confirms
             the hand-over. */
export const PATCH = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const body = await readJson(request);
  const action = body.action;
  if (action !== 'cancel' && action !== 'deliver') throw new HttpError(400, 'إجراء غير معروف.');
  const note = String(body.note || '').trim().slice(0, 500);
  const now = new Date().toISOString();
  const nextStatus = action === 'cancel' ? 'cancelled' : 'delivered';

  /* The match record decides the transition, so two clicks cannot both win. */
  const match = await store.update(COLLECTION, (items) => {
    const index = items.findIndex((m) => m.id === id);
    if (index === -1 || !canViewMatch(user, items[index])) throw new HttpError(404, 'لم يتم العثور على المطابقة.');
    const current = items[index];
    const reviewer = handlesMatch(user, current);
    if (current.status !== 'reserved') {
      throw new HttpError(409, current.status === 'delivered' ? 'تم تسليم هذا الدواء مسبقاً.' : 'تم إلغاء هذه المطابقة مسبقاً.');
    }
    if (action === 'deliver' && !reviewer) throw new HttpError(403, 'تأكيد التسليم متاح للجهة التي راجعت التبرع فقط.');
    if (action === 'cancel' && !reviewer && current.requesterId !== user.id) throw new HttpError(403, 'لا تملك صلاحية إلغاء هذه المطابقة.');

    const by = user.name || user.email || '';
    const next = {
      ...current,
      status: nextStatus,
      updatedAt: now,
      ...(action === 'deliver' ? { deliveredAt: now, deliveredBy: by } : { cancelledAt: now, cancelledBy: by }),
      history: [...(current.history || []), { status: nextStatus, at: now, by, note }]
    };
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: next };
  });

  try {
    await store.update(DONATIONS, (items) => ({
      items: items.map((d) => {
        if (d.id !== match.donationId) return d;
        const next = {
          ...d,
          allocations: (d.allocations || []).map((a) => (a.matchId === match.id ? { ...a, status: nextStatus, updatedAt: now } : a))
        };
        next.status = settleDonationStatus(next);
        if (next.status !== d.status) next.history = [...(d.history || []), { status: next.status, at: now, by: user.name || '' }];
        return next;
      }),
      result: null
    }));
  } catch (error) {
    /* Put the match back so the units are not left reserved against a
       match that says otherwise. */
    await store.update(COLLECTION, (items) => ({
      items: items.map((m) => (m.id === match.id && m.status === nextStatus && m.updatedAt === now
        ? { ...m, status: 'reserved', history: (m.history || []).slice(0, -1) }
        : m)),
      result: null
    })).catch(() => {});
    throw error;
  }

  const units = match.quantity + ' ' + (match.unit || '');
  const href = '/matches/' + match.id;
  if (action === 'deliver') {
    await notify([
      { userId: match.requesterId, type: 'match_delivered', title: 'تم تسليم الدواء', message: 'استلمت ' + units + ' من ' + match.donationMedicineName + '.', href },
      { userId: match.donorId, type: 'match_delivered', title: 'وصل تبرعك إلى مريض', message: 'تم تسليم ' + units + ' من ' + match.donationMedicineName + '. شكراً لك.', href },
      /* When the admin confirms, the reviewing pharmacy or centre hears of it too. */
      ...(match.reviewerId && match.reviewerId !== user.id
        ? [{ userId: match.reviewerId, type: 'match_delivered', title: 'تم تأكيد تسليم مطابقة', message: match.donationMedicineName + ' · ' + units + ' — بواسطة الإدارة.', href }]
        : [])
    ]);
  } else {
    const others = [match.requesterId, match.donorId, match.reviewerId].filter((uid) => uid && uid !== user.id);
    await notify(others.map((userId) => ({
      userId,
      type: 'match_cancelled',
      title: 'أُلغيت مطابقة دواء',
      message: match.donationMedicineName + ' · ' + units + (note ? ' — ' + note : ''),
      href
    })));
  }

  return Response.json({
    match: publicMatch(match, user),
    message: action === 'deliver' ? 'تم تأكيد التسليم.' : 'تم إلغاء المطابقة وإعادة الكمية إلى التبرع.'
  });
});

/* DELETE /api/matches/{id} — admin only, once the match is delivered or
   cancelled; a reserved match is cancelled first so its units go back. */
export const DELETE = handle(async (request, { params }) => {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, 'حذف المطابقات متاح للإدارة فقط.');
  const { id } = await params;
  await store.update(COLLECTION, (items) => {
    const current = items.find((m) => m.id === id);
    if (!current) throw new HttpError(404, 'لم يتم العثور على المطابقة.');
    if (current.status === 'reserved') throw new HttpError(409, 'ألغِ المطابقة أولاً لتعود الكمية إلى التبرع، ثم احذفها.');
    return { items: items.filter((m) => m.id !== id), result: null };
  });
  return Response.json({ message: 'تم حذف المطابقة.' });
});
