import { handle, HttpError, readJson, requireRole, requireUser } from '@/lib/server/auth';
import { COLLECTION as DONATIONS } from '@/lib/server/donations';
import { COLLECTION, canViewMatch, loadOwnDrugRequest, publicMatch, reservedFor, settleDonationStatus } from '@/lib/server/matches';
import { notify } from '@/lib/server/notify';
import { store } from '@/lib/server/store';
import { evaluateDonation } from '@/lib/matching';
import { geo } from '@/lib/vocab';

/* GET /api/matches?drugRequestId=…&donationId=… — the matches the caller is part of:
   a patient's requests, a donor's donations, or all of them for reviewers. */
export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const { searchParams } = new URL(request.url);
  const drugRequestId = searchParams.get('drugRequestId') || '';
  const scope = searchParams.get('scope') || '';
  const donationId = searchParams.get('donationId') || '';

  const items = await store.read(COLLECTION);
  const list = items
    .filter((m) => canViewMatch(user, m))
    /* Reviewers can narrow to what they personally are part of. */
    .filter((m) => (scope === 'mine' ? m.requesterId === user.id || m.donorId === user.id : true))
    .filter((m) => (drugRequestId ? String(m.drugRequestId) === String(drugRequestId) : true))
    .filter((m) => (donationId ? m.donationId === donationId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((m) => publicMatch(m, user));
  return Response.json({ matches: list });
});

/* POST /api/matches { drugRequestId, donationId, quantity?, governorate? }
   Module 9 · Feature 2 — "Select Matching Donation" → "Link Donation to
   Drug Request" → "Update Request/Donation Status" → "Create Matching
   Record" → "Send Notification". */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  requireRole(user, ['Patient', 'Donor'], 'ربط التبرعات بطلبات الأدوية متاح لأصحاب الطلبات.');
  const body = await readJson(request);
  const drugRequestId = String(body.drugRequestId || '');
  const donationId = String(body.donationId || '');
  if (!drugRequestId || !donationId) throw new HttpError(400, 'حدّد طلب الدواء والتبرع.');
  const governorate = geo.normalize(body.governorate);

  const drugRequest = await loadOwnDrugRequest(user, drugRequestId);
  const required = Math.max(1, Number(drugRequest.quantity) || 1);
  const matchId = store.newId('mat');
  const now = new Date().toISOString();

  /* The donations collection is the lock: checking what is left and
     reserving it happen in one step, so two patients cannot both take
     the last units. */
  const { donation, quantity, evaluation } = await store.update(DONATIONS, (items) => {
    const index = items.findIndex((d) => d.id === donationId);
    if (index === -1) throw new HttpError(404, 'لم يتم العثور على التبرع.');
    const current = items[index];
    if (current.donorId === user.id) throw new HttpError(409, 'لا يمكنك ربط طلبك بتبرعك الخاص.');

    const outstanding = required - reservedFor(items, drugRequestId);
    if (outstanding <= 0) throw new HttpError(409, 'الكمية المطلوبة في هذا الطلب محجوزة بالكامل من تبرعات أخرى.');

    const result = evaluateDonation({ medicineName: drugRequest.medicineName, quantity: outstanding }, current, { governorate });
    if (!result) throw new HttpError(409, 'لم يعد هذا التبرع متاحاً لهذا الطلب. حدّث القائمة واختر تبرعاً آخر.');

    const asked = Number(body.quantity);
    const take = Number.isInteger(asked) && asked > 0 ? Math.min(asked, result.offerQuantity) : result.offerQuantity;

    const next = {
      ...current,
      allocations: [...(current.allocations || []), { matchId, drugRequestId, quantity: take, status: 'reserved', at: now }]
    };
    next.status = settleDonationStatus(next);
    next.history = [...(current.history || []), {
      status: next.status, at: now, by: 'ربط بطلب دواء', note: 'تم حجز ' + take + ' ' + (current.unit || '') + ' لطلب دواء #' + drugRequestId
    }];
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: { donation: next, quantity: take, evaluation: result } };
  });

  const match = {
    id: matchId,
    status: 'reserved',
    drugRequestId,
    requesterId: user.id,
    requesterName: user.name || user.email || '',
    requestMedicineName: drugRequest.medicineName,
    requiredQuantity: required,
    quantity,
    governorate,
    donationId: donation.id,
    donationMedicineName: donation.medicineName,
    unit: donation.unit,
    expiryDate: donation.expiryDate,
    donationGovernorate: donation.governorate,
    donorId: donation.donorId,
    donorName: donation.donorName,
    donorPhone: donation.donorPhone,
    donorAddress: donation.address,
    reviewerId: donation.reviewerId || '',
    reviewedBy: donation.reviewedBy || '',
    nameMatch: evaluation.nameMatch,
    score: evaluation.score,
    createdAt: now,
    history: [{ status: 'reserved', at: now, by: user.name || 'صاحب الطلب' }]
  };

  try {
    await store.update(COLLECTION, (items) => ({ items: [...items, match], result: null }));
  } catch (error) {
    /* Give the units back if the record could not be written. */
    await store.update(DONATIONS, (items) => ({
      items: items.map((d) => {
        if (d.id !== donation.id) return d;
        const released = { ...d, allocations: (d.allocations || []).filter((a) => a.matchId !== matchId) };
        released.status = settleDonationStatus(released);
        return released;
      }),
      result: null
    })).catch(() => {});
    throw error;
  }

  const units = quantity + ' ' + (donation.unit || '');
  await notify([
    { userId: user.id, type: 'match_created', title: 'تم ربط طلبك بتبرع', message: 'تم حجز ' + units + ' من ' + donation.medicineName + ' لطلبك #' + drugRequestId + '.', href: '/matches/' + matchId },
    { userId: donation.donorId, type: 'match_created', title: 'تبرعك سيصل إلى مريض', message: 'تمت مطابقة ' + units + ' من تبرعك بـ ' + donation.medicineName + ' مع طلب دواء.', href: '/matches/' + matchId },
    { userId: donation.reviewerId, type: 'match_created', title: 'مطابقة جديدة بانتظار التسليم', message: donation.medicineName + ' · ' + units + ' لطلب #' + drugRequestId + '.', href: '/matches/' + matchId }
  ]);

  return Response.json({ match: publicMatch(match, user), message: 'تم ربط التبرع بطلبك.' }, { status: 201 });
});

