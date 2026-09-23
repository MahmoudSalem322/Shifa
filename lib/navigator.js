/* Module 6 — AI Health Navigator vocabulary, shared by the AI prompt, the
   keyword fallback and the result screen. Pure, so it is safe on both
   client and server. */

import { geo } from './vocab';

/* `match` is what a doctor's free-text specialization is searched for;
   `hints` are the words a patient might use instead. */
export const SPECIALTIES = [
  { key: 'cardiology', label: 'أمراض القلب', match: 'قلب', hints: ['قلب', 'القلب', 'خفقان', 'ضغط الدم', 'شرايين'] },
  { key: 'pediatrics', label: 'طب الأطفال', match: 'أطفال', hints: ['طفل', 'اطفال', 'أطفال', 'ابني', 'بنتي', 'رضيع', 'مولود', 'تطعيم'] },
  { key: 'internal', label: 'الباطنية', match: 'باطن', hints: ['باطنية', 'باطني', 'معدة', 'هضم', 'إسهال', 'اسهال', 'قولون', 'سكري', 'سكر'] },
  { key: 'orthopedics', label: 'العظام والمفاصل', match: 'عظام', hints: ['عظم', 'عظام', 'كسر', 'مفصل', 'ركبة', 'ظهر', 'فقرات', 'رضوض'] },
  { key: 'obgyn', label: 'النساء والولادة', match: 'نساء', hints: ['حامل', 'حمل', 'ولادة', 'نسائية', 'دورة شهرية'] },
  { key: 'surgery', label: 'الجراحة العامة', match: 'جراحة', hints: ['جراحة', 'عملية', 'زائدة', 'فتق', 'جرح'] },
  { key: 'ophthalmology', label: 'العيون', match: 'عيون', hints: ['عين', 'عيون', 'نظر', 'نظارة', 'رؤية'] },
  { key: 'dermatology', label: 'الجلدية', match: 'جلد', hints: ['جلد', 'جلدية', 'حكة', 'طفح', 'حبوب', 'أكزيما', 'اكزيما', 'حروق'] },
  { key: 'ent', label: 'الأنف والأذن والحنجرة', match: 'أنف', hints: ['أذن', 'اذن', 'أنف', 'انف', 'حنجرة', 'لوز', 'سمع'] },
  { key: 'neurology', label: 'الأعصاب', match: 'أعصاب', hints: ['أعصاب', 'اعصاب', 'صداع', 'دوخة', 'تنميل', 'صرع'] },
  { key: 'dentistry', label: 'الأسنان', match: 'أسنان', hints: ['أسنان', 'اسنان', 'ضرس', 'لثة'] },
  { key: 'psychiatry', label: 'الطب النفسي', match: 'نفس', hints: ['نفسي', 'نفسية', 'قلق', 'اكتئاب', 'أرق', 'صدمة'] },
  { key: 'urology', label: 'المسالك البولية', match: 'مسالك', hints: ['مسالك', 'بول', 'كلى', 'حصوة', 'بروستات'] },
  { key: 'chest', label: 'الأمراض الصدرية', match: 'صدر', hints: ['صدر', 'سعال', 'كحة', 'ربو', 'تنفس'] },
  { key: 'oncology', label: 'الأورام', match: 'أورام', hints: ['ورم', 'أورام', 'سرطان', 'كيماوي'] },
  { key: 'general', label: 'طب عام', match: 'عام', hints: ['طبيب عام', 'فحص عام', 'حرارة', 'انفلونزا', 'زكام'] }
];

export const SPECIALTY_KEYS = SPECIALTIES.map((s) => s.key);
export const specialtyOf = (key) => SPECIALTIES.find((s) => s.key === key) || null;

export const INTENTS = {
  doctor: { label: 'طبيب', icon: 'stethoscope' },
  facility: { label: 'مستشفى أو مركز صحي', icon: 'local_hospital' },
  pharmacy: { label: 'صيدلية', icon: 'local_pharmacy' },
  medicine: { label: 'دواء', icon: 'medication' },
  emergency: { label: 'طوارئ', icon: 'emergency' },
  general: { label: 'استفسار عام', icon: 'help' }
};

export const FACILITY_TYPES = ['hospital', 'clinic', 'phc', 'field', 'gov', 'complex'];

/* Signs that must never wait for a search result. */
const EMERGENCY_WORDS = [
  'نزيف', 'ينزف', 'فقد الوعي', 'فاقد الوعي', 'إغماء', 'اغماء', 'غيبوبة', 'ضيق تنفس شديد', 'لا يتنفس', 'ما بيتنفس', 'اختناق',
  'ألم شديد في الصدر', 'الم شديد في الصدر', 'ألم في الصدر', 'جلطة', 'سكتة', 'تشنج', 'حادث', 'إصابة بالرأس', 'حرق شديد',
  'تسمم', 'انتحار', 'طلق ناري', 'شظية', 'قصف', 'نزف'
];

const WORDS = {
  pharmacy: ['صيدلية', 'صيدليه', 'صيدليات'],
  medicine: ['دواء', 'دوا', 'علاج', 'حبوب', 'أقراص', 'اقراص', 'شراب', 'مضاد', 'إبرة', 'ابرة', 'انسولين', 'إنسولين'],
  facility: ['مستشفى', 'مشفى', 'مستوصف', 'مركز صحي', 'عيادة', 'مختبر', 'تحاليل', 'أشعة', 'اشعة', 'غسيل كلى', 'غسيل الكلى', 'تطعيم', 'ولادة']
};

const SERVICE_WORDS = ['غسيل كلى', 'غسيل الكلى', 'أشعة', 'اشعة', 'مختبر', 'تحاليل', 'تطعيم', 'ولادة', 'علاج طبيعي', 'عمليات', 'طوارئ', 'أسنان', 'تصوير مقطعي', 'رنين'];

/* Whole-word match that tolerates Arabic prefixes (و، ب، ل، ف، ك، ال) and
   suffixes, so "بالعيون" finds "عيون" but "انتظار" does not find "نظر". */
const PREFIX = /^(?:و|ف)?(?:ب|ل|ك)?(?:ال)?/;
function tokens(text) {
  return String(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
const has = (text, words) => {
  const list = tokens(text);
  return words.some((word) => {
    if (word.includes(' ')) return text.includes(word);
    return list.some((token) => token.startsWith(word) || token.replace(PREFIX, '').startsWith(word));
  });
};

/* Towns and camps people name instead of the governorate. */
const PLACES = [
  ['جباليا', 'north'], ['بيت لاهيا', 'north'], ['بيت حانون', 'north'],
  ['النصيرات', 'middle'], ['البريج', 'middle'], ['المغازي', 'middle'], ['الزوايدة', 'middle'], ['دير البلح', 'middle'],
  ['الرمال', 'gaza'], ['الشجاعية', 'gaza'], ['تل الهوا', 'gaza'], ['الشيخ رضوان', 'gaza'], ['الزيتون', 'gaza'],
  ['المواصي', 'khanyounis'], ['بني سهيلا', 'khanyounis'], ['عبسان', 'khanyounis']
];

export function detectGovernorate(text) {
  /* "قطاع غزة" is the whole Strip, not Gaza governorate. */
  const clean = String(text || '').replace(/قطاع\s+غزة/g, ' ');
  const place = PLACES.find(([name]) => clean.includes(name));
  return place ? place[1] : geo.normalize(clean);
}

/* Keyword fallback when the AI service is unavailable or not configured.
   Deliberately conservative: it only fills a field when a word for it
   is actually in the text. */
export function parseWithRules(query) {
  const text = String(query || '').trim();
  const emergency = has(text, EMERGENCY_WORDS);
  const specialty = SPECIALTIES.find((s) => has(text, s.hints));
  const service = SERVICE_WORDS.find((word) => has(text, [word])) || '';

  let intent = 'general';
  if (emergency) intent = 'emergency';
  else if (has(text, WORDS.pharmacy)) intent = 'pharmacy';
  else if (has(text, WORDS.medicine)) intent = 'medicine';
  else if (service || has(text, WORDS.facility)) intent = 'facility';
  else if (specialty || /دكتور|طبيب|دكتورة|طبيبة/.test(text)) intent = 'doctor';

  /* A medicine name is whatever follows the word for medicine. */
  let medicineName = '';
  if (intent === 'medicine' || intent === 'pharmacy') {
    const match = /(?:دواء|دوا|علاج|حبوب|أقراص|اقراص|شراب|فيها|عندها|يتوفر|متوفر)\s+([\p{L}\p{N}\- ]{2,40}?)(?:\s+(?:في|ب|بـ|قريب|عند|وين|ضمن)|[؟?.,،]|$)/u.exec(text);
    if (match) medicineName = match[1].trim();
  }

  return {
    intent,
    specialty: specialty ? specialty.key : '',
    service,
    governorate: detectGovernorate(text),
    facilityType: '',
    medicineName,
    emergency,
    reply: '',
    clarifyingQuestion: intent === 'general' ? 'اكتب نوع الخدمة أو التخصص الذي تبحث عنه، والمحافظة إن أمكن.' : ''
  };
}

/* Arabic letter folding for loose comparisons ("أطفال" = "اطفال"). */
export function fold(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/* The sentence shown when the reply did not come from the AI. */
export function describeSearch(parsed) {
  const where = parsed.governorate ? ' في ' + geo.label(parsed.governorate) : '';
  const specialty = specialtyOf(parsed.specialty);
  switch (parsed.intent) {
    case 'emergency':
      return 'إذا كانت الحالة طارئة اتصل بالإسعاف على 101 أو توجّه فوراً لأقرب قسم طوارئ. هذه أقسام الطوارئ المسجلة' + where + '.';
    case 'doctor':
      return 'أبحث لك عن ' + (specialty ? 'أطباء في تخصص ' + specialty.label : 'أطباء') + where + '.';
    case 'facility':
      return 'أبحث لك عن ' + (parsed.service ? 'منشآت تقدم خدمة ' + parsed.service : 'مستشفيات ومراكز صحية') + where + '.';
    case 'pharmacy':
      return 'أبحث لك عن صيدليات' + (parsed.medicineName ? ' يتوفر فيها ' + parsed.medicineName : '') + where + '.';
    case 'medicine':
      return 'أبحث لك عن ' + (parsed.medicineName ? 'دواء ' + parsed.medicineName : 'الدواء') + ' وأماكن توفره' + where + '.';
    default:
      return parsed.clarifyingQuestion || 'لم أفهم ما تبحث عنه بعد. اكتب نوع الخدمة أو التخصص والمحافظة.';
  }
}
