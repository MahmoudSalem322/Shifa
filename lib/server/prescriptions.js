import 'server-only';
import { validationError } from './auth';

export const COLLECTION = 'prescriptions';

/* Prescription lifecycle, surfaced as "Display Prescription Status":
   extracted → confirmed → requested (drug requests created from it). */
export const PRESCRIPTION_STATUS = ['extracted', 'confirmed', 'requested'];

/* Validates the medicines the patient reviewed and edited. */
export function parseMedications(list) {
  if (!Array.isArray(list) || !list.length) {
    throw validationError({ Medications: ['أضف دواءً واحداً على الأقل قبل التأكيد.'] });
  }
  if (list.length > 30) throw validationError({ Medications: ['عدد الأدوية كبير جداً.'] });

  const errors = {};
  const clean = list.map((m, index) => {
    const name = String((m && m.name) || '').trim();
    const quantity = Number(m && m.quantity);
    if (name.length < 2) errors['Medications[' + index + '].Name'] = ['اسم الدواء رقم ' + (index + 1) + ' مطلوب.'];
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      errors['Medications[' + index + '].Quantity'] = ['أدخل كمية صحيحة للدواء "' + (name || index + 1) + '".'];
    }
    const text = (key, max = 200) => String((m && m[key]) || '').trim().slice(0, max);
    return {
      name: name.slice(0, 200),
      strength: text('strength'),
      dosageForm: text('dosageForm'),
      dosage: text('dosage'),
      frequency: text('frequency'),
      duration: text('duration'),
      quantity,
      quantityUnit: text('quantityUnit', 40),
      notes: text('notes', 500),
      edited: !!(m && m.edited)
    };
  });
  if (Object.keys(errors).length) throw validationError(errors);
  return clean;
}

export function publicPrescription(record) {
  /* eslint-disable-next-line no-unused-vars */
  const { userId, ...rest } = record;
  return rest;
}
