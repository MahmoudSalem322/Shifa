import 'server-only';
import { toList } from '@/lib/api';
import { governorateDistance } from '@/lib/matching';
import { fold, specialtyOf } from '@/lib/navigator';
import { geo, normalizeDoctor, normalizeFacility, normalizeMedicine, normalizePharmacy } from '@/lib/vocab';
import { backend, HttpError } from './auth';

/* Module 6 · "Convert AI Result to Search Parameters" → "Search
   Healthcare Database". The .NET API documents no query parameters for
   its search endpoints, so the likely names are sent and the same filters
   run here too, whichever way the server behaves — as the directory
   pages do. When the strict filter leaves nothing, the location is
   relaxed and the result says so. */

const LIMIT = 6;

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.append(key, value);
  const text = search.toString();
  return text ? '?' + text : '';
}

async function fetchList(user, path, params = {}) {
  let response;
  try {
    response = await backend(user, 'GET', path + query(params));
  } catch {
    return [];
  }
  /* An expired session is the user's problem to fix, not an empty result. */
  if (response.status === 401) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  return response.ok ? toList(response.payload) : [];
}

/* Keeps records in the governorate; if none are, returns the nearest
   ones instead and flags that the area was widened. */
function byGovernorate(records, governorate, locate) {
  if (!governorate) return { items: records, widened: false };
  const exact = records.filter((record) => locate(record) === governorate);
  if (exact.length) return { items: exact, widened: false };
  const ranked = records
    .map((record) => ({ record, distance: governorateDistance(governorate, locate(record)) }))
    .sort((a, b) => (a.distance ?? 9) - (b.distance ?? 9))
    .map((entry) => entry.record);
  return { items: ranked, widened: ranked.length > 0 };
}

async function searchDoctors(user, parsed) {
  const specialty = specialtyOf(parsed.specialty);
  let raw = await fetchList(user, '/api/doctors/search', { specialization: specialty ? specialty.match : '', area: parsed.governorate });
  if (!raw.length) raw = await fetchList(user, '/api/doctors');
  let doctors = raw.map(normalizeDoctor).filter(Boolean);
  if (specialty) doctors = doctors.filter((doctor) => fold(doctor.specialization).includes(fold(specialty.match)));
  const located = byGovernorate(doctors, parsed.governorate, (d) => geo.normalize(d.area) || geo.normalize(d.facilityAddress));
  const items = located.items.slice().sort((a, b) => b.rating - a.rating).slice(0, LIMIT);
  return { items, widened: located.widened };
}

async function searchFacilities(user, parsed) {
  let raw = await fetchList(user, '/api/facilities/search');
  if (!raw.length) raw = await fetchList(user, '/api/facilities');
  let facilities = raw.map(normalizeFacility).filter(Boolean);
  let serviceMissing = false;

  if (parsed.emergency) {
    facilities = facilities.filter((f) => f.emergency);
  } else {
    if (parsed.facilityType) {
      const typed = facilities.filter((f) => String(f.type).toLowerCase() === parsed.facilityType);
      if (typed.length) facilities = typed;
    }
    if (parsed.service) {
      const wanted = fold(parsed.service);
      const offering = facilities.filter((f) =>
        f.services.some((s) => fold(s.name).includes(wanted) || wanted.includes(fold(s.name))) || fold(f.name).includes(wanted));
      if (offering.length) facilities = offering;
      else serviceMissing = true;
    }
  }

  const located = byGovernorate(facilities, parsed.governorate, (f) => geo.normalize(f.area) || geo.normalize(f.address));
  /* Open ones first. */
  const items = located.items.slice()
    .sort((a, b) => (/closed/i.test(a.status) ? 1 : 0) - (/closed/i.test(b.status) ? 1 : 0) || b.rating - a.rating)
    .slice(0, LIMIT);
  return { items, widened: located.widened, serviceMissing };
}

async function searchPharmacies(user, parsed) {
  let raw = await fetchList(user, '/api/pharmacies/search', { area: parsed.governorate });
  if (!raw.length) raw = await fetchList(user, '/api/pharmacies/search');
  const pharmacies = raw.map(normalizePharmacy).filter(Boolean);
  const located = byGovernorate(pharmacies, parsed.governorate, (p) => geo.normalize(p.area) || geo.normalize(p.address));
  const items = located.items.slice()
    .sort((a, b) => (/closed/i.test(a.status) ? 1 : 0) - (/closed/i.test(b.status) ? 1 : 0) || b.rating - a.rating)
    .slice(0, LIMIT);
  return { items, widened: located.widened };
}

async function searchMedicines(user, parsed) {
  if (!parsed.medicineName) return { items: [], widened: false };
  const raw = await fetchList(user, '/api/medicines/search', { name: parsed.medicineName, area: parsed.governorate ? geo.label(parsed.governorate) : '' });
  const wanted = fold(parsed.medicineName);
  const medicines = raw.map(normalizeMedicine).filter(Boolean)
    .filter((m) => {
      const name = fold(m.name);
      const scientific = fold(m.scientificName);
      /* A record with no name of its own gets a placeholder; never let
         that placeholder match every query that mentions "دواء". */
      const hasName = name.length >= 3 && name !== fold('دواء');
      return (hasName && (name.includes(wanted) || wanted.includes(name))) || (scientific.length >= 3 && scientific.includes(wanted));
    });
  /* Stocks in the patient's governorate first. */
  const items = medicines.slice(0, LIMIT).map((m) => ({
    ...m,
    stocks: parsed.governorate
      ? m.stocks.slice().sort((a, b) => (governorateDistance(parsed.governorate, a.area || a.address) ?? 9) - (governorateDistance(parsed.governorate, b.area || b.address) ?? 9))
      : m.stocks
  }));
  return { items, widened: false };
}

/* Runs the searches the intent calls for. */
export async function searchDirectory(user, parsed) {
  const results = { doctors: [], facilities: [], pharmacies: [], medicines: [] };
  const notes = [];
  const where = geo.label(parsed.governorate);

  const jobs = [];
  if (parsed.intent === 'doctor') {
    jobs.push(searchDoctors(user, parsed).then((r) => {
      results.doctors = r.items;
      if (r.widened) notes.push('لا يوجد أطباء بهذا التخصص مسجلون في ' + where + '، هذه أقرب النتائج.');
    }));
  }
  if (parsed.intent === 'facility' || parsed.intent === 'emergency') {
    jobs.push(searchFacilities(user, parsed).then((r) => {
      results.facilities = r.items;
      if (r.serviceMissing) notes.push('لم نجد منشأة تذكر خدمة "' + parsed.service + '" في بياناتها. تواصل مع المنشأة للتأكد قبل التوجه إليها.');
      if (r.widened) notes.push('لا توجد نتائج مسجلة في ' + where + '، هذه الأقرب إليك.');
    }));
  }
  if (parsed.intent === 'pharmacy' || (parsed.intent === 'medicine' && !parsed.medicineName)) {
    jobs.push(searchPharmacies(user, parsed).then((r) => {
      results.pharmacies = r.items;
      if (r.widened) notes.push('لا توجد صيدليات مسجلة في ' + where + '، هذه الأقرب إليك.');
    }));
  }
  if ((parsed.intent === 'medicine' || parsed.intent === 'pharmacy') && parsed.medicineName) {
    jobs.push(searchMedicines(user, parsed).then((r) => { results.medicines = r.items; }));
  }
  await Promise.all(jobs);

  return {
    params: {
      intent: parsed.intent,
      specialty: parsed.specialty,
      specialtyMatch: specialtyOf(parsed.specialty) ? specialtyOf(parsed.specialty).match : '',
      service: parsed.service,
      governorate: parsed.governorate,
      facilityType: parsed.facilityType,
      medicineName: parsed.medicineName,
      emergency: parsed.emergency
    },
    results,
    notes,
    total: results.doctors.length + results.facilities.length + results.pharmacies.length + results.medicines.length
  };
}
