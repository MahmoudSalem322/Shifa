import 'server-only';
import { geo, parseIsoDate, validate, REVIEWER_ROLES } from '@/lib/vocab';
import { availableQuantity, daysUntil } from '@/lib/matching';
import { HttpError, isAdmin, text, validationError } from './auth';

export const COLLECTION = 'donations';

/* Approved, and possibly already linked to drug requests since. */
export const ACCEPTED = ['approved', 'matched', 'delivered'];

/* Medicine closer than this to expiry is not worth routing to a patient. */
export const MIN_SHELF_LIFE_DAYS = 30;

export const UNITS = ['علبة', 'شريط', 'قرص', 'كبسولة', 'زجاجة', 'أمبولة', 'قلم', 'بخاخ', 'أنبوب'];

/* Validates and normalises a donation payload (Module 8 · "Add Validation").
   Returns the clean record fields or throws a 400 envelope. */
export function parseDonation(body) {
  const donationType = body.donationType === 'equipment' ? 'equipment' : 'medicine';
  const medicineName = String(body.medicineName ?? '').trim();
  const quantity = Number(body.quantity);
  const unit = text(body.unit, 40);
  const expiryDate = text(body.expiryDate, 10);
  const governorate = geo.normalize(body.governorate);
  const address = String(body.address ?? '').trim();
  const donorName = String(body.donorName ?? '').trim();
  const donorPhone = text(body.donorPhone, 20);
  const pickupNotes = String(body.notes ?? '').trim();
  const condition = text(body.condition, 40);

  const errors = {};
  if (medicineName.length < 2) errors.MedicineName = [donationType === 'equipment' ? 'أدخل اسم الجهاز (حرفان على الأقل).' : 'أدخل اسم الدواء (حرفان على الأقل).'];
  if (medicineName.length > 200) errors.MedicineName = [donationType === 'equipment' ? 'اسم الجهاز طويل جداً.' : 'اسم الدواء طويل جداً.'];
  if (!Number.isInteger(quantity) || quantity < 1) errors.Quantity = ['الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر.'];
  else if (quantity > 10000) errors.Quantity = ['الكمية كبيرة جداً. تواصل مع الصيدلية مباشرة للتبرعات الكبيرة.'];
  
  if (donationType === 'medicine' && unit && !UNITS.includes(unit)) errors.Unit = ['وحدة غير معروفة.'];

  if (donationType === 'medicine') {
    const expiry = parseIsoDate(expiryDate);
    if (!expiry) {
      errors.ExpiryDate = ['أدخل تاريخ انتهاء الصلاحية.'];
    } else {
      if (daysUntil(expiryDate) < MIN_SHELF_LIFE_DAYS) {
        errors.ExpiryDate = ['لا يمكن قبول دواء منتهي الصلاحية أو تنتهي صلاحيته خلال أقل من ' + MIN_SHELF_LIFE_DAYS + ' يوماً.'];
      }
    }
  }

  if (!governorate) errors.Governorate = ['اختر المحافظة.'];
  if (address.length < 3) errors.Address = ['أدخل عنوان الاستلام بالتفصيل.'];
  else if (address.length > 300) errors.Address = ['العنوان طويل جداً.'];
  if (donorName.length < 3) errors.DonorName = ['أدخل اسم المتبرع (3 أحرف على الأقل).'];
  else if (donorName.length > 120) errors.DonorName = ['اسم المتبرع طويل جداً.'];
  if (condition && !['sealed', 'opened', 'used', 'new'].includes(condition)) errors.Condition = ['حالة التبرع غير معروفة.'];
  if (!validate.phone(donorPhone)) errors.DonorPhone = ['رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.'];
  if (donationType === 'medicine' && !body.confirmSealed) errors.ConfirmSealed = ['يجب التأكيد على أن الدواء مغلق وبحالة سليمة.'];
  if (pickupNotes.length > 1000) errors.Notes = ['الملاحظات يجب ألا تتجاوز 1000 حرف.'];

  if (Object.keys(errors).length) throw validationError(errors);

  return {
    donationType,
    medicineName,
    quantity,
    unit: unit || (donationType === 'equipment' ? 'قطعة' : 'علبة'),
    expiryDate: donationType === 'equipment' ? '' : expiryDate,
    governorate,
    address,
    donorName,
    donorPhone,
    condition: condition || (donationType === 'equipment' ? 'new' : 'sealed'),
    notes: pickupNotes
  };
}

export function isReviewer(user) {
  return REVIEWER_ROLES.includes(user.role);
}

/* Pharmacies, centres and the admin manage the donation queue. */
export function managesDonations(user) {
  return isReviewer(user) || isAdmin(user);
}

/* Donors see their own donations; reviewers and the admin see all of them. */
export function canView(user, donation) {
  return donation.donorId === user.id || managesDonations(user);
}

/* The donor's phone and pickup address go to the donor and, once a
   pharmacy or centre approves the donation, to that reviewer only. Other
   reviewers see the medicine, quantity, expiry and governorate, which is
   all a review needs. The admin sees everything. */
export function seesContact(user, donation) {
  return donation.donorId === user.id || isAdmin(user) || (!!donation.reviewerId && donation.reviewerId === user.id);
}

export function publicDonation(donation, user) {
  const view = { ...donation, daysToExpiry: daysUntil(donation.expiryDate), availableQuantity: availableQuantity(donation) };
  if (!seesContact(user, donation)) {
    delete view.donorPhone;
    delete view.address;
    delete view.donorEmail;
    view.allocations = (donation.allocations || []).map(({ drugRequestId, ...rest }) => rest);
  }
  delete view.donorId;
  delete view.reviewerId;
  view.isMine = donation.donorId === user.id;
  return view;
}

export function assertPending(donation) {
  if (donation.status !== 'pending') {
    throw new HttpError(409, donation.status === 'rejected' ? 'تم رفض هذا التبرع مسبقاً.' : 'تم قبول هذا التبرع مسبقاً.');
  }
}
