import 'server-only';
import { geo, parseIsoDate, validate, REVIEWER_ROLES } from '@/lib/vocab';
import { availableQuantity } from '@/lib/matching';
import { HttpError, validationError } from './auth';

export const COLLECTION = 'donations';

/* Approved, and possibly already linked to drug requests since. */
export const ACCEPTED = ['approved', 'matched', 'delivered'];

/* Medicine closer than this to expiry is not worth routing to a patient. */
export const MIN_SHELF_LIFE_DAYS = 30;

export const UNITS = ['علبة', 'شريط', 'قرص', 'كبسولة', 'زجاجة', 'أمبولة', 'قلم', 'بخاخ', 'أنبوب'];

/* Validates and normalises a donation payload (Module 8 · "Add Validation").
   Returns the clean record fields or throws a 400 envelope. */
export function parseDonation(body) {
  const medicineName = String(body.medicineName || '').trim();
  const quantity = Number(body.quantity);
  const unit = String(body.unit || '').trim();
  const expiryDate = String(body.expiryDate || '').trim();
  const governorate = geo.normalize(body.governorate);
  const address = String(body.address || '').trim();
  const donorName = String(body.donorName || '').trim();
  const donorPhone = String(body.donorPhone || '').trim();
  const pickupNotes = String(body.notes || '').trim();
  const condition = String(body.condition || '').trim();

  const errors = {};
  if (medicineName.length < 2) errors.MedicineName = ['أدخل اسم الدواء (حرفان على الأقل).'];
  if (medicineName.length > 200) errors.MedicineName = ['اسم الدواء طويل جداً.'];
  if (!Number.isInteger(quantity) || quantity < 1) errors.Quantity = ['الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر.'];
  else if (quantity > 10000) errors.Quantity = ['الكمية كبيرة جداً. تواصل مع الصيدلية مباشرة للتبرعات الكبيرة.'];
  if (unit && !UNITS.includes(unit)) errors.Unit = ['وحدة غير معروفة.'];

  const expiry = parseIsoDate(expiryDate);
  if (!expiry) {
    errors.ExpiryDate = ['أدخل تاريخ انتهاء الصلاحية.'];
  } else {
    const minimum = new Date();
    minimum.setHours(0, 0, 0, 0);
    minimum.setDate(minimum.getDate() + MIN_SHELF_LIFE_DAYS);
    if (expiry < minimum) {
      errors.ExpiryDate = ['لا يمكن قبول دواء منتهي الصلاحية أو تنتهي صلاحيته خلال أقل من ' + MIN_SHELF_LIFE_DAYS + ' يوماً.'];
    }
  }

  if (!governorate) errors.Governorate = ['اختر المحافظة.'];
  if (address.length < 3) errors.Address = ['أدخل عنوان الاستلام بالتفصيل.'];
  if (donorName.length < 3) errors.DonorName = ['أدخل اسم المتبرع (3 أحرف على الأقل).'];
  if (!validate.phone(donorPhone)) errors.DonorPhone = ['رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.'];
  if (!body.confirmSealed) errors.ConfirmSealed = ['يجب التأكيد على أن الدواء مغلق وبحالة سليمة.'];
  if (pickupNotes.length > 1000) errors.Notes = ['الملاحظات يجب ألا تتجاوز 1000 حرف.'];

  if (Object.keys(errors).length) throw validationError(errors);

  return {
    medicineName,
    quantity,
    unit: unit || 'علبة',
    expiryDate,
    governorate,
    address,
    donorName,
    donorPhone,
    condition: condition || 'sealed',
    notes: pickupNotes
  };
}

export function isReviewer(user) {
  return REVIEWER_ROLES.includes(user.role);
}

/* Donors see their own donations; reviewers see all of them. */
export function canView(user, donation) {
  return donation.donorId === user.id || isReviewer(user);
}

export function daysUntil(isoDate) {
  const date = parseIsoDate(isoDate);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

export function publicDonation(donation, user) {
  const view = { ...donation, daysToExpiry: daysUntil(donation.expiryDate), availableQuantity: availableQuantity(donation) };
  /* Contact details only go to the donor and to reviewers. */
  if (!canView(user, donation)) {
    delete view.donorPhone;
    delete view.address;
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
