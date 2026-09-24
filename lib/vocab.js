/* Shared vocabulary, validation and record normalisers. Everything here
   is pure, so it is safe to import from both client pages and route
   handlers. */

import { pick } from './api';

/* ------------------------------------------------------------------
   Governorates — every legacy page shipped its own slugs for the same
   five governorates; everything funnels through here.
   ------------------------------------------------------------------ */

const GOV_CANONICAL = {
  gaza: 'غزة',
  north: 'شمال غزة',
  middle: 'الوسطى',
  khanyounis: 'خان يونس',
  rafah: 'رفح'
};

const GOV_ALIASES = {
  'gaza': 'gaza', 'gaza-city': 'gaza', 'غزة': 'gaza', 'مدينة غزة': 'gaza',
  'north': 'north', 'north-gaza': 'north', 'شمال غزة': 'north', 'الشمال': 'north',
  'middle': 'middle', 'deir': 'middle', 'deir-balah': 'middle', 'deir-al-balah': 'middle',
  'الوسطى': 'middle', 'دير البلح': 'middle',
  'khanyounis': 'khanyounis', 'khan': 'khanyounis', 'khan-younis': 'khanyounis',
  'khan-yunis': 'khanyounis', 'خان يونس': 'khanyounis', 'خانيونس': 'khanyounis',
  'rafah': 'rafah', 'رفح': 'rafah'
};

/* Towns and camps people write instead of the governorate. Only used
   when searching free text. */
const PLACE_ALIASES = {
  'جباليا': 'north', 'بيت لاهيا': 'north', 'بيت حانون': 'north', 'jabalia': 'north', 'beit lahia': 'north', 'beit hanoun': 'north',
  'الشجاعية': 'gaza', 'الرمال': 'gaza', 'الشاطئ': 'gaza', 'الزيتون': 'gaza', 'تل الهوى': 'gaza',
  'النصيرات': 'middle', 'البريج': 'middle', 'المغازي': 'middle', 'الزوايدة': 'middle', 'nuseirat': 'middle', 'bureij': 'middle', 'maghazi': 'middle',
  'بني سهيلا': 'khanyounis', 'عبسان': 'khanyounis', 'خزاعة': 'khanyounis', 'القرارة': 'khanyounis', 'المواصي': 'khanyounis',
  'khan younis': 'khanyounis', 'khan yunis': 'khanyounis', 'deir al-balah': 'middle', 'deir al balah': 'middle',
  'north gaza': 'north', 'gaza city': 'gaza'
};

const TEXT_ALIASES = Object.entries({ ...GOV_ALIASES, ...PLACE_ALIASES })
  .filter(([alias]) => /[؀-ۿ]/.test(alias) || /[a-z] [a-z]|^[a-z]{4,}$/.test(alias))
  .sort((x, y) => y[0].length - x[0].length);

/* "قطاع غزة" / "Gaza Strip" names the whole strip, not Gaza governorate. */
const STRIP = /قطاع\s*غزة|gaza\s*strip|فلسطين|palestine/gi;

export const geo = {
  normalize(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const direct = GOV_ALIASES[raw.toLowerCase()] || GOV_ALIASES[raw];
    if (direct) return direct;
    /* Free-text addresses ("رفح - قطاع غزة", "النصيرات"): longest alias
       first so "شمال غزة" is not read as "غزة", and a specific place wins
       over a bare "غزة", which is often just the city of the strip. */
    const textValue = raw.toLowerCase().replace(STRIP, ' ');
    let fallback = '';
    for (const [alias, slug] of TEXT_ALIASES) {
      if (!textValue.includes(alias)) continue;
      if (slug !== 'gaza') return slug;
      fallback = fallback || slug;
    }
    return fallback;
  },
  label(value) {
    const slug = geo.normalize(value);
    return slug ? GOV_CANONICAL[slug] : (value || '');
  },
  all() {
    return Object.keys(GOV_CANONICAL).map((slug) => ({ slug, label: GOV_CANONICAL[slug] }));
  }
};

/* ------------------------------------------------------------------
   Roles — the API expects Patient | Doctor | Hospital | Pharmacy | Donor.
   ------------------------------------------------------------------ */

const ROLE_TO_AR = {
  Patient: 'مريض',
  Doctor: 'طبيب',
  Hospital: 'مركز صحي',
  Pharmacy: 'صيدلية',
  Donor: 'متبرع'
};

export const roles = {
  toArabic(role) {
    return ROLE_TO_AR[roles.normalize(role)] || role || '';
  },
  normalize(role) {
    if (!role) return '';
    const key = String(role).trim();
    for (const canonical of Object.keys(ROLE_TO_AR)) {
      if (canonical.toLowerCase() === key.toLowerCase()) return canonical;
      if (ROLE_TO_AR[canonical] === key) return canonical;
    }
    return key;
  },
  all() {
    return Object.keys(ROLE_TO_AR).map((value) => ({ value, label: ROLE_TO_AR[value] }));
  }
};

/* Who may review donations: the organisations that would receive them. */
export const REVIEWER_ROLES = ['Pharmacy', 'Hospital'];

/* ------------------------------------------------------------------
   Validation, mirroring the server so users are not told their input is
   fine and then rejected by the API.
   ------------------------------------------------------------------ */

export const validate = {
  gmail: (value) => /^[^\s@]+@gmail\.com$/i.test(String(value || '').trim()),
  phone: (value) => /^05\d{8}$/.test(String(value || '').trim()),
  /* Organisation lines: UpdatePharmacy/FacilityProfileRequestDto.phone */
  orgPhone: (value) => /^0[2459]\d{8}$/.test(String(value || '').trim()),
  password: (value) => String(value || '').length >= 8,
  otp: (value) => /^\d{6}$/.test(String(value || '').trim()),
  emailOrPhone: (value) => validate.gmail(value) || validate.phone(value)
};

/* ------------------------------------------------------------------
   Normalisers — every read goes through pick() because the API
   publishes no response schema.
   ------------------------------------------------------------------ */

export function normalizeDoctor(raw) {
  if (!raw) return null;
  const facility = raw.facility && typeof raw.facility === 'object' ? raw.facility : null;
  return {
    id: pick(raw, 'id', 'doctorId'),
    name: pick(raw, 'fullName', 'name', 'doctorName') || 'طبيب',
    specialization: pick(raw, 'specialization', 'specialty', 'specializationName') || '',
    licenseNumber: pick(raw, 'licenseNumber', 'license') || '',
    experience: Number(pick(raw, 'yearsOfExperience', 'experienceYears', 'experience')) || 0,
    bio: pick(raw, 'bio', 'about', 'description') || '',
    rating: Number(pick(raw, 'rating', 'averageRating', 'rate')) || 0,
    reviewsCount: Number(pick(raw, 'reviewsCount', 'reviewCount', 'totalReviews')) || 0,
    /* The live API nests a `facility` object (or null) instead of a flat id. */
    facilityId: pick(raw, 'facilityId') ?? (facility ? pick(facility, 'id', 'facilityId') : undefined),
    facilityName: pick(raw, 'facilityName', 'hospitalName', 'workplace') ||
      (facility ? pick(facility, 'name') || '' : (typeof raw.facility === 'string' ? raw.facility : '')),
    facilityAddress: facility ? pick(facility, 'address') || '' : '',
    area: pick(raw, 'area', 'city', 'governorate', 'location') || '',
    phone: pick(raw, 'phone', 'phoneNumber') || '',
    workDays: pick(raw, 'workDays', 'workingDays') || '',
    workHours: pick(raw, 'workHours', 'workingHours') || '',
    durationMinutes: Number(pick(raw, 'consultationDurationMinutes', 'sessionDuration')) || 0,
    image: pick(raw, 'imageUrl', 'photoUrl', 'avatarUrl', 'image', 'profileImage') || '',
    latitude: pick(raw, 'latitude'),
    longitude: pick(raw, 'longitude')
  };
}

export function normalizeFacility(raw) {
  if (!raw) return null;
  const rawServices = pick(raw, 'services', 'facilityServices') || [];
  const services = (Array.isArray(rawServices) ? rawServices : []).map((service) => {
    if (typeof service === 'string') return { id: null, name: service, status: '' };
    return {
      id: pick(service, 'id', 'serviceId'),
      name: pick(service, 'name', 'serviceName') || '',
      status: pick(service, 'status') || ''
    };
  }).filter((service) => service.name);

  return {
    id: pick(raw, 'id', 'facilityId'),
    name: pick(raw, 'name', 'facilityName') || 'منشأة صحية',
    type: pick(raw, 'type', 'facilityType') || '',
    address: pick(raw, 'address', 'location') || '',
    phone: pick(raw, 'phone', 'phoneNumber') || '',
    workingHours: pick(raw, 'workingHours', 'workHours') || '',
    emergency: !!pick(raw, 'emergencyStatus', 'hasEmergency', 'isEmergency'),
    status: pick(raw, 'status') || '',
    rating: Number(pick(raw, 'rating', 'averageRating')) || 0,
    reviewsCount: Number(pick(raw, 'reviewsCount', 'reviewCount')) || 0,
    area: pick(raw, 'area', 'city', 'governorate') || '',
    image: pick(raw, 'imageUrl', 'photoUrl', 'image') || '',
    latitude: pick(raw, 'latitude'),
    longitude: pick(raw, 'longitude'),
    services
  };
}

const FACILITY_TYPE_LABELS = {
  hospital: 'مستشفى',
  clinic: 'عيادة',
  gov: 'مستشفى حكومي',
  complex: 'مجمع طبي',
  field: 'مستشفى ميداني',
  phc: 'مركز رعاية أولية'
};

export function facilityTypeLabel(type) {
  if (!type) return '';
  return FACILITY_TYPE_LABELS[String(type).trim().toLowerCase()] || type;
}

export const STATUS_LABELS = {
  Open: 'مفتوحة',
  Closed: 'مغلقة',
  Busy: 'مزدحمة',
  Emergency: 'طوارئ فقط',
  Partial: 'تشغيل جزئي',
  Available: 'متاحة',
  Limited: 'محدودة',
  Unavailable: 'متوقفة',
  InStock: 'متوفر',
  LowStock: 'كمية محدودة',
  OutOfStock: 'نفدت الكمية'
};

export const statusLabel = (value) => STATUS_LABELS[value] || value || '';

/* Operating states an organisation can set, as the legacy dashboard sent
   them to PATCH /me/status and /me/services/{id}. */
export const PHARMACY_STATUSES = [
  { value: 'Open', label: 'مفتوحة', tone: 'success' },
  { value: 'Busy', label: 'مزدحمة', tone: 'warning' },
  { value: 'Closed', label: 'مغلقة', tone: 'danger' }
];
export const FACILITY_STATUSES = [
  { value: 'Open', label: 'تعمل بكامل طاقتها', tone: 'success' },
  { value: 'Emergency', label: 'طوارئ فقط', tone: 'warning' },
  { value: 'Partial', label: 'تشغيل جزئي', tone: 'warning' },
  { value: 'Closed', label: 'متوقفة', tone: 'danger' }
];
export const SERVICE_STATUSES = [
  { value: 'Available', label: 'متاحة', tone: 'success' },
  { value: 'Limited', label: 'محدودة', tone: 'warning' },
  { value: 'Unavailable', label: 'متوقفة', tone: 'danger' }
];

const STATUS_TONE = {
  Open: 'success', Available: 'success', InStock: 'success',
  Busy: 'warning', Emergency: 'warning', Partial: 'warning', Limited: 'warning', LowStock: 'warning',
  Closed: 'danger', Unavailable: 'danger', OutOfStock: 'danger'
};
export const TONE_BADGE = {
  success: 'bg-state-success-subtle text-state-success',
  warning: 'bg-state-warning-subtle text-state-warning',
  danger: 'bg-error-container text-state-danger',
  neutral: 'bg-surface-container-high text-text-body'
};
export const TONE_SOLID = {
  success: 'bg-state-success text-on-state',
  warning: 'bg-state-warning text-on-state',
  danger: 'bg-state-danger text-on-state'
};
export const statusTone = (value) => STATUS_TONE[value] || 'neutral';

/* Services saved before the three-state list used Open / Closed. */
export function serviceStatus(value) {
  if (value === 'Open') return 'Available';
  if (value === 'Closed') return 'Unavailable';
  return SERVICE_STATUSES.some((s) => s.value === value) ? value : 'Available';
}

export function normalizePharmacy(raw) {
  if (!raw) return null;
  return {
    id: pick(raw, 'id', 'pharmacyId'),
    name: pick(raw, 'name', 'pharmacyName') || 'صيدلية',
    address: pick(raw, 'address', 'location') || '',
    phone: pick(raw, 'phone', 'phoneNumber') || '',
    workingHours: pick(raw, 'workingHours', 'workHours') || '',
    status: pick(raw, 'status') || '',
    governmentApproved: !!pick(raw, 'isGovernmentApproved', 'governmentApproved'),
    acceptsInsurance: !!pick(raw, 'acceptsInsurance'),
    hasColdChain: !!pick(raw, 'hasColdChain'),
    rating: Number(pick(raw, 'rating', 'averageRating')) || 0,
    reviewsCount: Number(pick(raw, 'reviewsCount', 'reviewCount')) || 0,
    area: pick(raw, 'area', 'city', 'governorate') || '',
    latitude: pick(raw, 'latitude'),
    longitude: pick(raw, 'longitude')
  };
}

/* A medicine may arrive with the pharmacies that stock it attached under
   any of several names; the fields follow AddPharmacyStockDto. */
export function normalizeStocks(raw) {
  const list = pick(raw, 'pharmacies', 'stocks', 'pharmacyStocks', 'medicines', 'availability');
  if (!Array.isArray(list)) return [];
  return list.map((entry) => {
    const nestedMedicine = entry.medicine && typeof entry.medicine === 'object' ? entry.medicine : null;
    const nestedPharmacy = entry.pharmacy && typeof entry.pharmacy === 'object' ? entry.pharmacy : null;
    return {
      pharmacyId: pick(entry, 'pharmacyId') ?? (nestedPharmacy ? pick(nestedPharmacy, 'id') : pick(entry, 'id')),
      pharmacyName: pick(entry, 'pharmacyName') || (nestedPharmacy ? pick(nestedPharmacy, 'name') : '') || pick(entry, 'name') || '',
      medicineId: pick(entry, 'medicineId') ?? (nestedMedicine ? pick(nestedMedicine, 'id') : undefined),
      medicineName: pick(entry, 'medicineName') || (nestedMedicine ? pick(nestedMedicine, 'name') : '') ||
        (typeof entry.medicine === 'string' ? entry.medicine : ''),
      address: pick(entry, 'address', 'location') || (nestedPharmacy ? pick(nestedPharmacy, 'address') : '') || '',
      phone: pick(entry, 'phone', 'phoneNumber') || (nestedPharmacy ? pick(nestedPharmacy, 'phone') : '') || '',
      area: pick(entry, 'area', 'city', 'governorate') || '',
      quantity: Number(pick(entry, 'quantity')) || 0,
      unit: pick(entry, 'unit') || '',
      availability: pick(entry, 'availability', 'stockStatus') || '',
      batchNumber: pick(entry, 'batchNumber') || '',
      expiryDate: pick(entry, 'expiryDate') || '',
      price: Number(pick(entry, 'price')) || 0
    };
  }).filter((stock) => stock.pharmacyName || stock.medicineName || stock.pharmacyId != null || stock.medicineId != null);
}

export function normalizeMedicine(raw) {
  if (!raw) return null;
  return {
    id: pick(raw, 'id', 'medicineId'),
    name: pick(raw, 'name', 'medicineName', 'tradeName') || 'دواء',
    scientificName: pick(raw, 'scientificName', 'genericName') || '',
    category: pick(raw, 'category') || '',
    description: pick(raw, 'description') || '',
    dosage: pick(raw, 'dosage') || '',
    atcCode: pick(raw, 'atcCode') || '',
    isCritical: !!pick(raw, 'isCritical'),
    packageInfo: pick(raw, 'packageInfo') || '',
    storageConditions: pick(raw, 'storageConditions') || '',
    manufacturer: pick(raw, 'manufacturer') || '',
    requiresColdChain: !!pick(raw, 'requiresColdChain'),
    stocks: normalizeStocks(raw)
  };
}

export function stockTone(stock) {
  const text = String(stock.availability || '').toLowerCase();
  const label = statusLabel(stock.availability);
  if (stock.quantity === 0 || text.includes('out') || text.includes('نفد')) {
    return { cls: 'bg-error-container text-state-danger', label: label || 'نفدت الكمية', level: 'out' };
  }
  if (text.includes('low') || (stock.quantity > 0 && stock.quantity <= 15)) {
    return { cls: 'bg-state-warning-subtle text-state-warning', label: label || 'كمية محدودة', level: 'critical' };
  }
  return { cls: 'bg-state-success-subtle text-state-success', label: label || 'متوفر', level: 'available' };
}

/* ------------------------------------------------------------------
   Drug requests (Module 5)
   ------------------------------------------------------------------ */

export const DRUG_REQUEST_STATUS = {
  pending: { label: 'قيد الانتظار', cls: 'bg-state-warning-subtle text-state-warning', icon: 'hourglass_top' },
  submitted: { label: 'تم الإرسال', cls: 'bg-state-info-subtle text-state-info', icon: 'send' },
  underreview: { label: 'قيد المراجعة', cls: 'bg-state-warning-subtle text-state-warning', icon: 'manage_search' },
  approved: { label: 'مقبول', cls: 'bg-state-success-subtle text-state-success', icon: 'task_alt' },
  matched: { label: 'تمت المطابقة', cls: 'bg-state-info-subtle text-state-info', icon: 'join' },
  fulfilled: { label: 'تم التنفيذ', cls: 'bg-state-success-subtle text-state-success', icon: 'check_circle' },
  completed: { label: 'مكتمل', cls: 'bg-state-success-subtle text-state-success', icon: 'check_circle' },
  rejected: { label: 'مرفوض', cls: 'bg-error-container text-state-danger', icon: 'block' },
  cancelled: { label: 'ملغى', cls: 'bg-surface-container-high text-text-muted', icon: 'cancel' }
};

export function drugRequestStatus(value) {
  const key = String(value || 'pending').toLowerCase().replace(/[\s_-]/g, '');
  return DRUG_REQUEST_STATUS[key] || { label: value || 'قيد الانتظار', cls: 'bg-state-info-subtle text-state-info', icon: 'info' };
}

export function normalizeDrugRequest(raw) {
  if (!raw) return null;
  return {
    id: pick(raw, 'id', 'requestId', 'drugRequestId'),
    medicineName: pick(raw, 'medicineName', 'medicine', 'name') || 'دواء',
    quantity: pick(raw, 'quantity') ?? '',
    notes: pick(raw, 'notes') || '',
    status: pick(raw, 'status') || 'Pending',
    createdAt: pick(raw, 'createdAt', 'requestDate', 'createdOn', 'date') || '',
    updatedAt: pick(raw, 'updatedAt', 'modifiedAt') || '',
    hasPrescription: !!pick(raw, 'prescriptionPath', 'prescriptionUrl', 'prescriptionFileName', 'hasPrescription'),
    prescriptionName: pick(raw, 'prescriptionFileName', 'prescriptionName') || ''
  };
}

/* ------------------------------------------------------------------
   Appointments (Module 4) & donations (Module 8)
   ------------------------------------------------------------------ */

export const APPOINTMENT_STATUS = {
  confirmed: { label: 'مؤكد', cls: 'bg-state-success-subtle text-state-success' },
  completed: { label: 'منتهٍ', cls: 'bg-surface-container-high text-text-primary' },
  cancelled: { label: 'ملغى', cls: 'bg-error-container text-state-danger' }
};

export const DONATION_STATUS = {
  pending: { label: 'قيد المراجعة', cls: 'bg-state-warning-subtle text-state-warning', icon: 'hourglass_top' },
  approved: { label: 'مقبول', cls: 'bg-state-success-subtle text-state-success', icon: 'verified' },
  rejected: { label: 'مرفوض', cls: 'bg-error-container text-state-danger', icon: 'block' },
  matched: { label: 'محجوز لطلبات', cls: 'bg-state-info-subtle text-state-info', icon: 'join' },
  delivered: { label: 'تم التسليم', cls: 'bg-state-success-subtle text-state-success', icon: 'task_alt' }
};

/* Module 9 — a donation linked to a drug request. */
export const MATCH_STATUS = {
  reserved: { label: 'بانتظار التسليم', cls: 'bg-state-warning-subtle text-state-warning', icon: 'inventory_2' },
  delivered: { label: 'تم التسليم', cls: 'bg-state-success-subtle text-state-success', icon: 'task_alt' },
  cancelled: { label: 'ملغاة', cls: 'bg-surface-container-high text-text-muted', icon: 'cancel' }
};

/* ------------------------------------------------------------------
   Dates
   ------------------------------------------------------------------ */

export const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function isoDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/* YYYY-MM-DD parsed as local time, so weekday checks do not drift across UTC.
   Impossible dates ("2026-09-31", which Date would roll into October) are
   rejected rather than silently moved. */
export function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function formatDate(value, options) {
  if (!value) return '';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseIsoDate(value) : new Date(value);
  if (!date || isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ar', options || { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatExpiry(value) {
  return formatDate(value, { year: 'numeric', month: 'long' });
}

/* 24h "HH:MM" → Arabic 12h label. */
export function timeLabel(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (isNaN(h)) return hhmm || '';
  const suffix = h < 12 ? 'ص' : 'م';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return String(hour).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0') + ' ' + suffix;
}

/* Placeholder for records with no photo. */
export const DOCTOR_FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">' +
    '<rect width="128" height="128" fill="#d3e4fe"/>' +
    '<circle cx="64" cy="50" r="22" fill="#0f766e"/>' +
    '<path d="M20 128c0-26 20-44 44-44s44 18 44 44z" fill="#0f766e"/></svg>'
  );
