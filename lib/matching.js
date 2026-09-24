/* Module 9 · "Create Matching Logic" — pure functions, shared by the
   matching API and its tests.

   A donation matches a drug request when:
   - the medicine is the same (names compared after Arabic/Latin
     normalisation, with a small typo tolerance; a stated strength such as
     "500mg" must agree when both sides give one),
   - it still has units that are not reserved for another request,
   - it will not expire before the patient can use it, and
   - it is approved by a pharmacy or health centre.
   Location does not exclude a donation; it ranks nearer ones first. */

import { MEDICINE_ALIASES } from './medicine-aliases';
import { geo, parseIsoDate } from './vocab';
import { daysFromClinicToday } from './clock';

/* Below this the donation is not offered at all. */
export const MATCH_MIN_DAYS_TO_EXPIRY = 14;
/* Below this it is offered with a warning. */
export const MATCH_SOON_DAYS = 45;

/* North → south, so the distance between two governorates is |i - j|. */
const GOV_ORDER = ['north', 'gaza', 'middle', 'khanyounis', 'rafah'];

/* Harakat, superscript alef and tatweel. Not a plain U+064B–U+0670
   range: that would also swallow the Arabic-Indic digits ٠–٩ (U+0660–0669). */
const ARABIC_DIACRITICS = /[ً-ٰٟـ]/g;
/* Longest unit spellings first ("غرام" before "غ"), Arabic units in their
   normalised spelling (ة → ه), and no letter straight after the unit so
   "20 gastro" is not read as 20 g. */
const STRENGTH = /(\d+(?:[.,]\d+)?)\s*(ميكروغرام|mcg|µg|ملجم|ملغ|مغ|mg|غرام|غ|g|ml|مل|iu|وحده|%)(?!\p{L})/giu;
/* Words that describe the package, not the medicine. */
const NOISE = new Set([
  'tab', 'tabs', 'tablet', 'tablets', 'cap', 'caps', 'capsule', 'capsules', 'syrup', 'syr', 'susp', 'suspension',
  'inj', 'injection', 'amp', 'cream', 'oint', 'ointment', 'drops', 'spray',
  'اقراص', 'قرص', 'حبوب', 'حبه', 'كبسول', 'كبسوله', 'كبسولات', 'شراب', 'معلق', 'حقن', 'حقنه', 'ابره', 'امبول', 'امبوله',
  'كريم', 'مرهم', 'نقط', 'قطره', 'بخاخ', 'علبه', 'شريط'
]);

const UNIT_SCALE = { g: 1000, 'غ': 1000, 'غرام': 1000, mcg: 0.001, 'µg': 0.001, 'ميكروغرام': 0.001 };
const UNIT_BASE = { 'ملغ': 'mg', 'مغ': 'mg', 'ملجم': 'mg', g: 'mg', 'غ': 'mg', 'غرام': 'mg', mcg: 'mg', 'µg': 'mg', 'ميكروغرام': 'mg', 'مل': 'ml', 'وحده': 'iu' };

function normalizeLetters(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

/* "بنادول 500 ملغ أقراص" → { key: 'بنادول', strengths: ['500mg'] } */
export function parseMedicineName(name) {
  const text = normalizeLetters(name);
  const strengths = [];
  const withoutStrength = text.replace(STRENGTH, (_, amount, unit) => {
    const raw = unit.toLowerCase();
    const value = Number(amount.replace(',', '.')) * (UNIT_SCALE[raw] || 1);
    strengths.push(+value.toFixed(3) + (UNIT_BASE[raw] || raw));
    return ' ';
  });
  const tokens = withoutStrength
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((token) => token && !NOISE.has(token) && !/^\d+$/.test(token));
  return { key: tokens.join(' '), tokens, strengths };
}

/* Folded name → its entry in the Arabic/English table, built once. */
let aliasIndex = null;
function aliasOf(key) {
  if (!aliasIndex) {
    aliasIndex = new Map();
    for (const entry of MEDICINE_ALIASES) {
      for (const name of entry.names) {
        const parsed = parseMedicineName(name).key;
        if (parsed && !aliasIndex.has(parsed)) aliasIndex.set(parsed, entry);
      }
    }
  }
  return aliasIndex.get(key) || null;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/* 0 … 1. Returns 0 when strengths are stated on both sides and differ. */
export function compareMedicineNames(requested, offered) {
  const a = parseMedicineName(requested);
  const b = parseMedicineName(offered);
  if (!a.key || !b.key) return { score: 0, reason: 'name' };

  if (a.strengths.length && b.strengths.length && !a.strengths.some((s) => b.strengths.includes(s))) {
    return { score: 0, reason: 'strength' };
  }

  if (a.key === b.key) return { score: 1, reason: 'exact' };

  /* "بنادول" = "Panadol"; "Panadol" ~ "Paracetamol" (same ingredient, other brand). */
  const aliasA = aliasOf(a.key);
  const aliasB = aliasOf(b.key);
  if (aliasA && aliasB) {
    if (aliasA === aliasB) return { score: 1, reason: 'exact' };
    if (aliasA.generic === aliasB.generic) return { score: 0.9, reason: 'generic' };
  }
  /* Both names are known and they are different medicines ("Insulin"
     vs "Insulin Glargine" can be listed as different generics): do not
     let the looser rules below call them the same. */
  if (aliasA && aliasB && aliasA.generic !== aliasB.generic) return { score: 0, reason: 'name' };

  /* "Panadol" vs "Panadol Extra" — one name contains the other as whole words. */
  const shorter = a.tokens.length <= b.tokens.length ? a.tokens : b.tokens;
  const longer = shorter === a.tokens ? b.tokens : a.tokens;
  if (shorter.every((token) => longer.includes(token))) return { score: 0.85, reason: 'contains' };

  /* Typos: "اموكسيسيلين" vs "اموكسيسلين". Short names must match exactly. */
  const distance = levenshtein(a.key, b.key);
  const length = Math.max(a.key.length, b.key.length);
  if (length >= 5 && distance <= Math.max(1, Math.floor(length * 0.2))) {
    return { score: +(1 - distance / length).toFixed(2), reason: 'similar' };
  }
  return { score: 0, reason: 'name' };
}

export function governorateDistance(from, to) {
  const a = GOV_ORDER.indexOf(geo.normalize(from));
  const b = GOV_ORDER.indexOf(geo.normalize(to));
  if (a === -1 || b === -1) return null;
  return Math.abs(a - b);
}

/* Whole days from today in Gaza; `today` is any instant on the day to count from. */
export function daysUntil(isoDate, today = new Date()) {
  if (!parseIsoDate(isoDate)) return null;
  return daysFromClinicToday(isoDate, today);
}

export function availableQuantity(donation) {
  const reserved = (donation.allocations || [])
    .filter((allocation) => allocation.status !== 'cancelled')
    .reduce((sum, allocation) => sum + allocation.quantity, 0);
  return Math.max(0, donation.quantity - reserved);
}

/* Checks one donation against a request. Returns null when it is not a
   match, otherwise the match with a score and the checks that were made. */
export function evaluateDonation(request, donation, { governorate, today } = {}) {
  if (donation.status !== 'approved' && donation.status !== 'matched') return null;

  const name = compareMedicineNames(request.medicineName, donation.medicineName);
  if (!name.score) return null;

  const available = availableQuantity(donation);
  if (available < 1) return null;

  const days = daysUntil(donation.expiryDate, today);
  if (days == null || days < MATCH_MIN_DAYS_TO_EXPIRY) return null;

  const required = Math.max(1, Number(request.quantity) || 1);
  const coverage = Math.min(1, available / required);
  const distance = governorateDistance(governorate, donation.governorate);

  /* Name dominates, then how much of the need it covers, then distance.
     Ties go to the donation that expires first, so less medicine is wasted. */
  const score =
    name.score * 60 +
    coverage * 25 +
    (distance == null ? 5 : Math.max(0, 15 - distance * 5));

  return {
    donationId: donation.id,
    score: Math.round(score),
    nameMatch: name.reason,
    requiredQuantity: required,
    availableQuantity: available,
    offerQuantity: Math.min(available, required),
    fullCoverage: available >= required,
    daysToExpiry: days,
    expiresSoon: days < MATCH_SOON_DAYS,
    distance,
    sameGovernorate: distance === 0
  };
}

export function findMatches(request, donations, options) {
  return donations
    .map((donation) => {
      const match = evaluateDonation(request, donation, options);
      return match ? { ...match, donation } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.daysToExpiry - b.daysToExpiry);
}

/* Module 9 · "Update Request Status". The .NET API has no endpoint to
   change a drug request's status, so the status a patient sees is
   derived from the matches recorded for it. */
export function applyMatchStatus(request, matches) {
  if (!request || /rejected|cancel|fulfilled|completed/i.test(String(request.status))) return request;
  const linked = (matches || []).filter((m) => String(m.drugRequestId) === String(request.id) && m.status !== 'cancelled');
  if (!linked.length) return request;
  const required = Math.max(1, Number(request.quantity) || 1);
  const delivered = linked.filter((m) => m.status === 'delivered').reduce((sum, m) => sum + m.quantity, 0);
  const reserved = linked.reduce((sum, m) => sum + m.quantity, 0);
  return {
    ...request,
    status: delivered >= required ? 'Fulfilled' : 'Matched',
    matchedQuantity: reserved,
    deliveredQuantity: delivered
  };
}
