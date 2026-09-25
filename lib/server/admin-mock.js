import 'server-only';
import { MOCK_DOCTORS, MOCK_FACILITIES, MOCK_MEDICINES, MOCK_PHARMACIES } from '@/lib/mock-data';
import { cleanImageUrl } from './medicine-images';
import { store } from './store';

/* Stand-in for the .NET API's admin endpoints while no .NET admin account
   is linked (SHIFA_ADMIN_EMAIL / SHIFA_ADMIN_PASSWORD unset). Same paths,
   same query parameters, answers shaped like a paged API, and every
   change is kept in ./data so the admin pages work end to end.
   Seeded on first use from lib/mock-data.js plus demo accounts. */

const C = {
  users: 'mock-admin-users',
  healthcare: 'mock-admin-healthcare',
  medicines: 'mock-admin-medicines',
  requests: 'mock-admin-drug-requests',
  donations: 'mock-admin-donations',
  meta: 'mock-admin-meta'
};

/* Bump when the seeded medicine catalogue grows, so existing data picks
   up the new medicines and pictures without losing the admin's edits. */
const CATALOGUE_VERSION = 2;

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const PATIENTS = ['أحمد خالد الحلو', 'سارة محمود عبد الله', 'يوسف إبراهيم شعت', 'مريم سالم أبو ندى', 'خالد عمر الأسطل'];
const DONORS = ['جمعية الإحسان الخيرية', 'ليلى حسن المصري', 'عبد الرحمن ناصر'];

function seedUsers() {
  let n = 1;
  const phone = () => '059' + String(1000000 + n * 7919).slice(-7);
  const user = (fullName, role, extra = {}) => {
    const id = n;
    const record = {
      id,
      fullName,
      email: role.toLowerCase() + id + '@shifa.test',
      phone: phone(),
      role,
      status: 'Active',
      emailConfirmed: true,
      createdAt: daysAgo(90 - id),
      ...extra
    };
    n += 1;
    return record;
  };
  return [
    ...MOCK_FACILITIES.data.map((f) => user(f.name, 'Hospital', { linkedId: f.id })),
    ...MOCK_PHARMACIES.data.map((p) => user(p.name, 'Pharmacy', { linkedId: p.id })),
    ...MOCK_DOCTORS.data.map((d) => user(d.name, 'Doctor', { linkedId: d.id, specialization: d.specialization })),
    ...PATIENTS.map((name, i) => user(name, 'Patient', i === 4 ? { status: 'Suspended' } : {})),
    ...DONORS.map((name) => user(name, 'Donor')),
    user('مستخدم بانتظار التفعيل', 'Patient', { status: 'Inactive', emailConfirmed: false })
  ];
}

function seedHealthcare() {
  return [
    ...MOCK_FACILITIES.data.map((f) => ({
      id: f.id, kind: 'Facility', type: f.type || 'Hospital', name: f.name, address: f.address || '', phone: f.phone || '',
      email: '', specialization: '', status: 'Approved', createdAt: daysAgo(60)
    })),
    ...MOCK_PHARMACIES.data.map((p) => ({
      id: p.id, kind: 'Pharmacy', type: 'Pharmacy', name: p.name, address: p.address || '', phone: p.phone || '',
      email: '', specialization: '', status: 'Approved', createdAt: daysAgo(55)
    })),
    ...MOCK_DOCTORS.data.map((d) => ({
      id: d.id, kind: 'Doctor', type: 'Doctor', name: d.name, address: d.facilityName || '', phone: '',
      email: '', specialization: d.specialization || '', status: 'Approved', createdAt: daysAgo(50)
    })),
    { id: 901, kind: 'Facility', type: 'Clinic', name: 'عيادة الرحمة الجديدة', address: 'غزة، الرمال', phone: '082811111', email: '', specialization: 'طب عام', status: 'Pending', createdAt: daysAgo(2) },
    { id: 902, kind: 'Pharmacy', type: 'Pharmacy', name: 'صيدلية الأمل', address: 'خان يونس، البلد', phone: '082822222', email: '', specialization: '', status: 'Pending', createdAt: daysAgo(1) }
  ];
}

function seedMedicines() {
  return MOCK_MEDICINES.data.map((m) => ({
    ...m,
    id: m.id,
    name: m.name,
    scientificName: m.scientificName || '',
    category: m.category || '',
    description: m.description || '',
    dosage: m.dosage || '',
    atcCode: m.atcCode || '',
    isCritical: !!m.isCritical,
    packageInfo: m.packageInfo || '',
    storageConditions: m.storageConditions || '',
    manufacturer: m.manufacturer || '',
    requiresColdChain: !!m.requiresColdChain,
    avgDailyConsumption: m.avgDailyConsumption || 0,
    imageUrl: m.imageUrl || '',
    stocks: m.stocks || []
  }));
}

function seedRequests(users) {
  const patients = users.filter((u) => u.role === 'Patient' && u.status === 'Active');
  const rows = [
    ['أموكسيسيلين 500', 2, 'Pending'], ['إنسولين لانتوس', 1, 'UnderReview'], ['بانادول أدفانس', 3, 'Approved'],
    ['فنتولين بخاخ', 1, 'Rejected'], ['ميتفورمين 850', 4, 'Fulfilled'], ['أوجمنتين 1 غ', 2, 'Pending']
  ];
  return rows.map(([medicineName, quantity, status], i) => ({
    id: 5001 + i,
    medicineName,
    quantity,
    status,
    patientId: patients[i % patients.length].id,
    patientName: patients[i % patients.length].fullName,
    notes: i === 1 ? 'حالة سكري، الحاجة عاجلة' : '',
    hasPrescription: i % 2 === 0,
    rejectionReason: status === 'Rejected' ? 'الوصفة غير واضحة' : '',
    createdAt: daysAgo(10 - i)
  }));
}

function seedDonations() {
  const rows = [
    ['بانادول أدفانس', 5, 'علبة', 'غزة', 'جمعية الإحسان الخيرية', 'Pending'],
    ['أموكسيسيلين', 3, 'علبة', 'خان يونس', 'ليلى حسن المصري', 'Pending'],
    ['جهاز قياس ضغط', 1, 'قطعة', 'الوسطى', 'عبد الرحمن ناصر', 'Approved'],
    ['إنسولين', 2, 'قلم', 'غزة', 'جمعية الإحسان الخيرية', 'Rejected']
  ];
  return rows.map(([medicineName, quantityAmount, quantityUnit, governorate, donorName, status], i) => ({
    id: 7001 + i,
    medicineName,
    quantityAmount,
    quantityUnit,
    governorate,
    donorName,
    donorPhone: '05977' + String(10000 + i * 137).slice(-5),
    detailedAddress: 'عنوان تجريبي ' + (i + 1),
    expiryDate: quantityUnit === 'قطعة' ? null : '2027-0' + (i + 3) + '-01',
    status,
    rejectionReason: status === 'Rejected' ? 'العبوة مفتوحة' : '',
    createdAt: daysAgo(6 - i)
  }));
}

/* Adds catalogue medicines missing from older data and fills in pictures
   for seeded ones that have none; medicines the admin deleted or edited
   stay as they are. Runs once per CATALOGUE_VERSION. */
async function upgradeCatalogue() {
  const [meta] = await store.read(C.meta);
  if (meta && meta.catalogueVersion >= CATALOGUE_VERSION) return;
  const seeded = seedMedicines();
  const deleted = new Set((meta && meta.deletedMedicines) || []);
  await store.update(C.medicines, (items) => {
    const byId = new Map(items.map((m) => [String(m.id), m]));
    const merged = items.map((m) => {
      const seed = seeded.find((s) => String(s.id) === String(m.id));
      return seed && !m.imageUrl ? { ...seed, ...m, imageUrl: seed.imageUrl, stocks: m.stocks || seed.stocks } : m;
    });
    const added = seeded.filter((s) => !byId.has(String(s.id)) && !deleted.has(String(s.id)));
    return { items: [...merged, ...added], result: null };
  });
  await store.update(C.meta, (rows) => ({ items: [{ ...(rows[0] || {}), catalogueVersion: CATALOGUE_VERSION }], result: null }));
}

/* The medicine catalogue, as the public medicine pages read it. */
export async function catalogueMedicines() {
  await ensureSeeded();
  return store.read(C.medicines);
}

/* Seeds every collection once, the first time any is read. */
async function ensureSeeded() {
  const users = await store.read(C.users);
  if (users.length) return upgradeCatalogue();
  const seededUsers = seedUsers();
  await store.update(C.users, (items) => ({ items: items.length ? items : seededUsers, result: null }));
  await store.update(C.healthcare, (items) => ({ items: items.length ? items : seedHealthcare(), result: null }));
  await store.update(C.medicines, (items) => ({ items: items.length ? items : seedMedicines(), result: null }));
  await store.update(C.requests, (items) => ({ items: items.length ? items : seedRequests(seededUsers), result: null }));
  await store.update(C.donations, (items) => ({ items: items.length ? items : seedDonations(), result: null }));
  await store.update(C.meta, () => ({ items: [{ catalogueVersion: CATALOGUE_VERSION }], result: null }));
}

/* ------------------------------------------------------------------ */

const ok = (payload, status = 200) => ({ ok: true, status, payload });
const fail = (status, message) => ({ ok: false, status, payload: { message } });
const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

function paged(items, query, searchFields) {
  let list = items;
  const q = String(query.search || '').trim().toLowerCase();
  if (q) list = list.filter((item) => searchFields.some((field) => String(item[field] ?? '').toLowerCase().includes(q)));
  for (const key of ['role', 'status', 'kind', 'type']) {
    if (query[key]) list = list.filter((item) => same(item[key], query[key]));
  }
  list = list.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
  return { items: list.slice((page - 1) * pageSize, page * pageSize), totalCount: list.length, page, pageSize };
}

async function findOne(collection, id) {
  return (await store.read(collection)).find((item) => String(item.id) === String(id)) || null;
}

async function patch(collection, id, changes) {
  return store.update(collection, (items) => {
    const index = items.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return { items, result: null };
    const next = { ...items[index], ...changes, updatedAt: new Date().toISOString() };
    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: next };
  });
}

async function remove(collection, id) {
  return store.update(collection, (items) => {
    const exists = items.some((item) => String(item.id) === String(id));
    return { items: items.filter((item) => String(item.id) !== String(id)), result: exists };
  });
}

async function insert(collection, record) {
  return store.update(collection, (items) => {
    const id = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const next = { id, createdAt: new Date().toISOString(), ...record };
    return { items: [...items, next], result: next };
  });
}

const clean = (value, max = 300) => (value === null || value === undefined ? '' : String(value).trim().slice(0, max));

const KIND_OF_TYPE = { Pharmacy: 'Pharmacy', Doctor: 'Doctor' };

function healthcareFields(body) {
  const type = clean(body.type, 40) || 'Hospital';
  return {
    type,
    kind: KIND_OF_TYPE[type] || 'Facility',
    name: clean(body.name, 200),
    address: clean(body.address),
    phone: clean(body.phone, 20),
    email: clean(body.email, 120),
    specialization: clean(body.specialization, 200)
  };
}

function medicineFields(body) {
  return {
    name: clean(body.name, 200),
    scientificName: clean(body.scientificName, 200),
    category: clean(body.category, 100),
    description: clean(body.description, 2000),
    dosage: clean(body.dosage, 100),
    atcCode: clean(body.atcCode, 20),
    isCritical: !!body.isCritical,
    packageInfo: clean(body.packageInfo, 200),
    storageConditions: clean(body.storageConditions, 200),
    manufacturer: clean(body.manufacturer, 200),
    requiresColdChain: !!body.requiresColdChain,
    avgDailyConsumption: Math.max(0, Number(body.avgDailyConsumption) || 0),
    imageUrl: cleanImageUrl(body.imageUrl)
  };
}

const ROLES = ['Patient', 'Doctor', 'Hospital', 'Pharmacy', 'Donor'];

/* Answers like dotnetAdmin(): { ok, status, payload }. */
export async function mockAdmin(method, path, { query = {}, body = {} } = {}) {
  await ensureSeeded();
  const parts = path.replace(/^\/api\//, '').split('/');
  const [first, second, id, action] = parts;

  if (first === 'medicines') {
    const medId = second && second !== 'list' ? second : null;
    if (method === 'GET' && second === 'list') return ok({ data: await store.read(C.medicines) });
    if (method === 'GET' && medId) return (await findOne(C.medicines, medId)) ? ok(await findOne(C.medicines, medId)) : fail(404, 'الدواء غير موجود.');
    if (method === 'POST') {
      const fields = medicineFields(body);
      if (fields.name.length < 2) return fail(400, 'اسم الدواء مطلوب.');
      return ok(await insert(C.medicines, fields), 201);
    }
    if (method === 'PUT' && medId) {
      const fields = medicineFields(body);
      if (fields.name.length < 2) return fail(400, 'اسم الدواء مطلوب.');
      const updated = await patch(C.medicines, medId, fields);
      return updated ? ok(updated) : fail(404, 'الدواء غير موجود.');
    }
    if (method === 'DELETE' && medId) {
      if (!(await remove(C.medicines, medId))) return fail(404, 'الدواء غير موجود.');
      /* Remember it so a catalogue upgrade does not bring it back. */
      await store.update(C.meta, (rows) => {
        const meta = rows[0] || { catalogueVersion: CATALOGUE_VERSION };
        return { items: [{ ...meta, deletedMedicines: [...new Set([...(meta.deletedMedicines || []), String(medId)])] }], result: null };
      });
      return ok({ message: 'تم حذف الدواء.' });
    }
  }

  if (first !== 'admin') return fail(404, 'عملية غير معروفة.');

  if (second === 'dashboard') {
    const [users, healthcare, medicines, requests, donations] = await Promise.all(Object.values(C).map((c) => store.read(c)));
    const byRole = (role) => users.filter((u) => u.role === role).length;
    return ok({
      mode: 'بيانات تجريبية (لم يُربط حساب أدمن خادم شفاء)',
      totalUsers: users.length,
      patients: byRole('Patient'),
      doctors: byRole('Doctor'),
      hospitals: byRole('Hospital'),
      pharmacies: byRole('Pharmacy'),
      donors: byRole('Donor'),
      suspendedUsers: users.filter((u) => !same(u.status, 'Active')).length,
      healthcareProviders: healthcare.length,
      pendingProviders: healthcare.filter((h) => same(h.status, 'Pending')).length,
      medicines: medicines.length,
      drugRequests: requests.length,
      pendingDrugRequests: requests.filter((r) => /pending|review/i.test(r.status)).length,
      serverDonations: donations.length,
      pendingServerDonations: donations.filter((d) => same(d.status, 'Pending')).length
    });
  }

  if (second === 'users') {
    if (method === 'GET' && !id) return ok(paged(await store.read(C.users), query, ['fullName', 'email', 'phone']));
    if (method === 'GET') return (await findOne(C.users, id)) ? ok(await findOne(C.users, id)) : fail(404, 'المستخدم غير موجود.');
    if (method === 'POST' && !id) {
      const record = {
        fullName: clean(body.fullName, 120), email: clean(body.email, 120).toLowerCase(), phone: clean(body.phone, 20),
        role: ROLES.includes(body.role) ? body.role : 'Patient', status: 'Active', emailConfirmed: true
      };
      if (record.fullName.length < 3 || !record.email.includes('@')) return fail(400, 'أدخل الاسم والبريد الإلكتروني.');
      const users = await store.read(C.users);
      if (users.some((u) => u.email === record.email)) return fail(409, 'هذا البريد مسجّل مسبقاً.');
      return ok({ ...(await insert(C.users, record)), message: 'تم إنشاء الحساب.' }, 201);
    }
    if (method === 'PATCH' && action === 'status') {
      const status = clean(body.status, 40);
      if (!status) return fail(400, 'حدّد الحالة.');
      const updated = await patch(C.users, id, { status });
      return updated ? ok({ ...updated, message: 'تم تحديث حالة الحساب.' }) : fail(404, 'المستخدم غير موجود.');
    }
    if (method === 'DELETE') return (await remove(C.users, id)) ? ok({ message: 'تم حذف الحساب.' }) : fail(404, 'المستخدم غير موجود.');
  }

  if (second === 'healthcare') {
    if (method === 'GET' && !id) return ok(paged(await store.read(C.healthcare), query, ['name', 'address', 'specialization', 'phone']));
    if (method === 'GET') return (await findOne(C.healthcare, id)) ? ok(await findOne(C.healthcare, id)) : fail(404, 'الجهة غير موجودة.');
    if (method === 'POST') {
      const fields = healthcareFields(body);
      if (fields.name.length < 2) return fail(400, 'اسم الجهة مطلوب.');
      return ok({ ...(await insert(C.healthcare, { ...fields, status: 'Pending' })), message: 'تمت إضافة الجهة.' }, 201);
    }
    if (method === 'PUT') {
      const fields = healthcareFields(body);
      if (fields.name.length < 2) return fail(400, 'اسم الجهة مطلوب.');
      const updated = await patch(C.healthcare, id, fields);
      return updated ? ok(updated) : fail(404, 'الجهة غير موجودة.');
    }
    if (method === 'PATCH' && action === 'approve') {
      const updated = await patch(C.healthcare, id, { status: 'Approved' });
      return updated ? ok({ ...updated, message: 'تم اعتماد الجهة.' }) : fail(404, 'الجهة غير موجودة.');
    }
    if (method === 'DELETE') return (await remove(C.healthcare, id)) ? ok({ message: 'تم حذف الجهة.' }) : fail(404, 'الجهة غير موجودة.');
  }

  if (second === 'drug-requests') {
    if (method === 'GET' && !id) return ok(paged(await store.read(C.requests), query, ['medicineName', 'patientName']));
    if (method === 'GET') return (await findOne(C.requests, id)) ? ok(await findOne(C.requests, id)) : fail(404, 'الطلب غير موجود.');
    if (method === 'PATCH' && action === 'status') {
      const status = clean(body.status, 40);
      if (!status) return fail(400, 'حدّد الحالة.');
      const updated = await patch(C.requests, id, { status, rejectionReason: /reject/i.test(status) ? clean(body.rejectionReason, 500) : '' });
      return updated ? ok({ ...updated, message: 'تم تحديث حالة الطلب.' }) : fail(404, 'الطلب غير موجود.');
    }
  }

  if (second === 'donations') {
    if (method === 'GET' && !id) return ok(paged(await store.read(C.donations), query, ['medicineName', 'donorName']));
    if (method === 'GET') return (await findOne(C.donations, id)) ? ok(await findOne(C.donations, id)) : fail(404, 'التبرع غير موجود.');
    if (method === 'PATCH' && (action === 'approve' || action === 'reject')) {
      const current = await findOne(C.donations, id);
      if (!current) return fail(404, 'التبرع غير موجود.');
      if (!same(current.status, 'Pending')) return fail(409, 'تمت مراجعة هذا التبرع مسبقاً.');
      const updated = await patch(C.donations, id, action === 'approve'
        ? { status: 'Approved', rejectionReason: '' }
        : { status: 'Rejected', rejectionReason: clean(body.reason, 500) });
      return ok({ ...updated, message: action === 'approve' ? 'تم قبول التبرع.' : 'تم رفض التبرع.' });
    }
  }

  return fail(404, 'عملية غير معروفة.');
}
