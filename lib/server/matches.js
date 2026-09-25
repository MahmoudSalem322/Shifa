import 'server-only';
import { pick, toList } from '@/lib/api';
import { availableQuantity } from '@/lib/matching';
import { normalizeDrugRequest } from '@/lib/vocab';
import { backend, HttpError, isAdmin } from './auth';
import { isReviewer } from './donations';

export const COLLECTION = 'matches';

const CLOSED_REQUEST = /fulfilled|completed|delivered|rejected|cancel/i;

/* Loads one of the caller's own drug requests from the .NET API. Going
   through /my (rather than /{id}) guarantees it belongs to the caller. */
export async function loadOwnDrugRequest(user, drugRequestId) {
  const response = await backend(user, 'GET', '/api/drugrequests/my');
  if (response.status === 401) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  if (!response.ok) throw new HttpError(502, 'تعذّر تحميل طلبات الأدوية من خادم شفاء.');
  const raw = toList(response.payload).find((item) => String(pick(item, 'id', 'requestId', 'drugRequestId')) === String(drugRequestId));
  if (!raw) throw new HttpError(404, 'لم يتم العثور على طلب الدواء ضمن طلباتك.');
  const request = normalizeDrugRequest(raw);
  if (CLOSED_REQUEST.test(String(request.status))) {
    throw new HttpError(409, 'هذا الطلب مغلق ولا يمكن مطابقته مع تبرع.');
  }
  return request;
}

/* Units already reserved or delivered for a request, across donations. */
export function reservedFor(donations, drugRequestId) {
  let total = 0;
  for (const donation of donations) {
    for (const allocation of donation.allocations || []) {
      if (String(allocation.drugRequestId) === String(drugRequestId) && allocation.status !== 'cancelled') {
        total += allocation.quantity;
      }
    }
  }
  return total;
}

/* Donation status follows its allocations once it has been approved. */
export function settleDonationStatus(donation) {
  if (!['approved', 'matched', 'delivered'].includes(donation.status)) return donation.status;
  if (availableQuantity(donation) > 0) return 'approved';
  const active = (donation.allocations || []).filter((a) => a.status !== 'cancelled');
  return active.length && active.every((a) => a.status === 'delivered') ? 'delivered' : 'matched';
}

/* The pharmacy or centre that approved the donation handles its hand-over.
   Older records without a reviewerId fall back to any reviewer. The admin
   can step in on any match. */
export function handlesMatch(user, match) {
  return isAdmin(user) || isReviewer(user) && (!match.reviewerId || match.reviewerId === user.id);
}

export function canViewMatch(user, match) {
  return match.requesterId === user.id || match.donorId === user.id || handlesMatch(user, match);
}

/* What each party may see. The donor's phone and pickup address go only
   to the reviewer handling the hand-over. */
export function publicMatch(match, user) {
  const view = { ...match };
  const reviewer = handlesMatch(user, match);
  view.isRequester = match.requesterId === user.id;
  view.isDonor = match.donorId === user.id;
  view.isReviewer = reviewer;
  view.isAdmin = isAdmin(user);
  view.canCancel = match.status === 'reserved' && (view.isRequester || reviewer);
  view.canDeliver = match.status === 'reserved' && reviewer;
  if (!reviewer) {
    delete view.donorPhone;
    delete view.donorAddress;
  }
  if (!reviewer && !view.isDonor) delete view.donorName;
  if (!reviewer && !view.isRequester) delete view.requesterName;
  delete view.requesterId;
  delete view.donorId;
  delete view.reviewerId;
  return view;
}

/* A donation as a patient sees it in the candidates list. */
export function candidateView(candidate) {
  const { donation, ...rest } = candidate;
  return {
    ...rest,
    donation: {
      id: donation.id,
      medicineName: donation.medicineName,
      unit: donation.unit,
      expiryDate: donation.expiryDate,
      governorate: donation.governorate,
      condition: donation.condition,
      reviewedBy: donation.reviewedBy || '',
      reviewerRole: donation.reviewerRole || ''
    }
  };
}
