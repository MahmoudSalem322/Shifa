/* ====================================================================
   Shifa API layer (client side)
   --------------------------------------------------------------------
   Port of the legacy script/api.js as an ES module. Two backends:

   - The Shifaa .NET API (https://shifaa-api.onrender.com) — auth,
     doctors, facilities, pharmacies, medicines, drug requests, booking.
   - This app's own route handlers under /api/* — the features that API
     does not cover yet: appointment slots and history, donations, and
     the AI prescription reader. Same Bearer token for both.

   Auth: Authorization: Bearer <JWT>, required on every .NET endpoint.
   ==================================================================== */

import { MOCK_PHARMACIES, MOCK_FACILITIES, MOCK_MEDICINES, MOCK_DOCTORS } from './mock-data';

export const BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://shifaa-api.onrender.com').replace(/\/$/, '');

/* Render's free tier sleeps when idle; the first call after a nap can
   take the better part of a minute before the container answers. */
const TIMEOUT_MS = 90000;

const TOKEN_KEY = 'shifa_token';
const SESSION_KEY = 'shifa_session';
const RETURN_KEY = 'shifa_return_to';

/* ------------------------------------------------------------------
   Errors — the API answers validation failures with the ASP.NET
   ModelState envelope: {"errors":{"Email":["..."]}}
   ------------------------------------------------------------------ */

/* The API validates in English while the site is entirely Arabic. These
   are the exact strings the server returns; anything else passes through. */
const SERVER_MESSAGES_AR = {
  'Email/phone or password is incorrect.':
    'البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيحة.',
  'Enter a valid Gmail address (e.g. name@gmail.com) or a phone number in the format 05XXXXXXXX.':
    'أدخل بريد Gmail صحيح (مثال: name@gmail.com) أو رقم هاتف بصيغة 05XXXXXXXX.',
  'Enter a valid Gmail address (e.g. name@gmail.com).':
    'أدخل بريد Gmail صحيح (مثال: name@gmail.com).',
  'Email must be a complete, correctly formatted Gmail address (e.g. name@gmail.com).':
    'يجب إدخال بريد Gmail كامل وصحيح (مثال: name@gmail.com).',
  'Full name is required.': 'الاسم الكامل مطلوب.',
  'Phone number must be 10 digits starting with 05.':
    'رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.',
  'Password must be at least 8 characters.':
    'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
  'Passwords do not match.': 'كلمتا المرور غير متطابقتين.',
  'Account type must be one of: Patient, Doctor, Hospital, Pharmacy, Donor.':
    'نوع الحساب يجب أن يكون أحد الخيارات: مريض، طبيب، مركز صحي، صيدلية، متبرع.',
  'OTP must be exactly 6 digits.': 'رمز التحقق يجب أن يتكون من 6 أرقام بالضبط.'
};

export function translate(text) {
  if (!text) return '';
  const key = String(text).trim();
  return SERVER_MESSAGES_AR[key] || key;
}

function firstErrorMessage(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return translate(payload);
  if (payload.errors) {
    for (const field of Object.keys(payload.errors)) {
      const list = payload.errors[field];
      if (Array.isArray(list) && list.length) return translate(list[0]);
      if (typeof list === 'string') return translate(list);
    }
  }
  return translate(payload.message || payload.title || payload.detail || payload.error || '');
}

export function defaultMessage(status) {
  if (status === 0) return 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك بالإنترنت وحاول مجدداً.';
  if (status === 401) return 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.';
  if (status === 403) return 'لا تملك صلاحية الوصول إلى هذا المحتوى.';
  if (status === 404) return 'لم يتم العثور على البيانات المطلوبة.';
  if (status >= 500) return 'حدث خطأ في الخادم. يرجى المحاولة بعد قليل.';
  return 'تعذّر إتمام العملية. يرجى المحاولة مجدداً.';
}

export class ApiError extends Error {
  constructor(status, payload, fallbackMessage) {
    super(fallbackMessage || firstErrorMessage(payload) || defaultMessage(status));
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload || null;
    this.errors = (payload && payload.errors) || null;
  }
}

/* Every field message in the envelope, translated, keyed by field name. */
export function fieldErrors(error) {
  const out = {};
  if (!error || !error.errors) return out;
  for (const field of Object.keys(error.errors)) {
    const list = error.errors[field];
    out[field] = Array.isArray(list) ? list.map(translate).join(' ') : translate(String(list));
  }
  return out;
}

/* ------------------------------------------------------------------
   Session storage
   ------------------------------------------------------------------ */

function safeRead(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeWrite(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* quota or private mode */ }
}
function safeRemove(key) {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

const sessionListeners = new Set();
function emitSession() {
  sessionListeners.forEach((fn) => fn());
}

export const auth = {
  getToken() {
    return safeRead(TOKEN_KEY) || '';
  },

  getUser() {
    const raw = safeRead(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  isAuthed() {
    return !!auth.getToken();
  },

  /* The local admin account, signed by this app rather than the .NET API. */
  isAdmin() {
    const user = auth.getUser();
    return !!user && user.role === 'Admin';
  },

  /* Accepts a raw login/signup response and stores whatever it can find.
     The API documents no response schema, so every field is resolved
     through a list of plausible names. */
  setSession(response) {
    if (!response) return null;

    let token = pick(response, 'token', 'accessToken', 'jwt', 'access_token');
    if (!token && response.data) token = pick(response.data, 'token', 'accessToken', 'jwt', 'access_token');
    if (token) safeWrite(TOKEN_KEY, String(token));

    const userNode = response.user || response.data || response;
    const claims = decodeJwt(token || auth.getToken()) || {};
    const session = {
      fullName: pick(userNode, 'fullName', 'name') || claimOf(claims, 'name') || '',
      email: pick(userNode, 'email') || claimOf(claims, 'email') || '',
      phone: pick(userNode, 'phone', 'phoneNumber') || '',
      role: pick(userNode, 'role', 'userRole') || claimOf(claims, 'role') || '',
      id: pick(userNode, 'id', 'userId') ?? claimOf(claims, 'id')
    };
    safeWrite(SESSION_KEY, JSON.stringify(session));
    emitSession();
    return session;
  },

  /* Patches the stored session without touching the token. */
  mergeSession(partial) {
    const current = { ...(auth.getUser() || {}), ...partial };
    safeWrite(SESSION_KEY, JSON.stringify(current));
    emitSession();
    return current;
  },

  clear() {
    safeRemove(TOKEN_KEY);
    safeRemove(SESSION_KEY);
    /* Legacy keys from the localStorage-simulated era. */
    safeRemove('shifaUser');
    safeRemove('shifaRemember');
    safeRemove('currentUser');
    emitSession();
  },

  /* Remembers where the visitor wanted to go before the login wall. */
  rememberReturnTo(path) {
    if (path) safeWrite(RETURN_KEY, path);
  },

  consumeReturnTo() {
    const target = safeRead(RETURN_KEY);
    safeRemove(RETURN_KEY);
    return target || '';
  },

  /* Also fires when another tab logs in or out. */
  subscribe(fn) {
    sessionListeners.add(fn);
    const onStorage = (event) => {
      if (event.key === null || event.key === TOKEN_KEY || event.key === SESSION_KEY) fn();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      sessionListeners.delete(fn);
      window.removeEventListener('storage', onStorage);
    };
  }
};

/* Reads a JWT's payload without verifying it — display only. The server
   is the one that trusts or rejects the token. */
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* .NET issues claims under either short or schema-URL names. */
const CLAIM_NAMES = {
  id: ['nameid', 'sub', 'userId', 'id', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
  name: ['unique_name', 'name', 'fullName', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
  email: ['email', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
  role: ['role', 'roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
};

export function claimOf(claims, key) {
  if (!claims) return undefined;
  for (const name of CLAIM_NAMES[key] || [key]) {
    const value = claims[name];
    if (value !== undefined && value !== null && value !== '') return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

/* ------------------------------------------------------------------
   Field resolver — the spec declares every response as a bare 200 with
   no schema, so reads go through a list of plausible names.
   ------------------------------------------------------------------ */

export function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    /* Tolerate casing drift between PascalCase DTOs and camelCase JSON. */
    const lower = key.charAt(0).toLowerCase() + key.slice(1);
    const upper = key.charAt(0).toUpperCase() + key.slice(1);
    if (obj[lower] !== undefined && obj[lower] !== null) return obj[lower];
    if (obj[upper] !== undefined && obj[upper] !== null) return obj[upper];
  }
  return undefined;
}

/* Unwraps the common envelope shapes so callers always get an array. */
export function toList(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  const candidates = ['data', 'items', 'results', 'result', 'doctors', 'facilities',
    'pharmacies', 'medicines', 'requests', 'appointments', 'donations', 'prescriptions', 'matches', 'value'];
  for (const name of candidates) {
    const node = response[name];
    if (Array.isArray(node)) return node;
    if (node && Array.isArray(node.items)) return node.items;
  }
  return [];
}

/* Unwraps a single-entity response. */
export function toItem(response) {
  if (!response || typeof response !== 'object') return null;
  if (Array.isArray(response)) return response[0] || null;
  /* A record with its own id is the entity itself — a doctor carries a
     nested `facility` object that must not be mistaken for an envelope. */
  if (response.id !== undefined || response.Id !== undefined) return response;
  const candidates = ['data', 'result', 'item', 'doctor', 'facility', 'pharmacy', 'medicine',
    'request', 'appointment', 'donation'];
  for (const name of candidates) {
    const node = response[name];
    if (node && typeof node === 'object' && !Array.isArray(node)) return node;
  }
  return response;
}

/* ------------------------------------------------------------------
   Request
   ------------------------------------------------------------------ */

function buildUrl(base, path, query) {
  const url = /^https?:/.test(path) ? path : base + path;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, value);
  }
  const qs = params.toString();
  if (!qs) return url;
  return url + (url.includes('?') ? '&' : '?') + qs;
}

/* Fires when any request comes back 401, so the shell can show the login
   wall instead of an error. */
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

let LOCAL_DRUG_REQUESTS = [
  {
    id: 1001,
    medicineName: "أموكسيسيلين",
    quantity: 2,
    notes: "نحتاج الدواء بسرعة",
    hasPrescription: true,
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

/* The medicine catalogue from this app's server, falling back to the
   bundled list if that request fails. */
async function catalogue() {
  try {
    return toList(await send('', 'GET', '/api/catalog/medicines', { auth: false }));
  } catch {
    return MOCK_MEDICINES.data;
  }
}

async function send(base, method, path, options = {}) {
  // Inject mock data for pharmacies, facilities, and medicines
  if (method === 'GET') {
    if (path.includes('/api/pharmacies/search') || path.includes('/api/pharmacies/list') || path.includes('/api/pharmacies/me')) {
      return path.includes('/me') ? { data: MOCK_PHARMACIES.data[0] } : MOCK_PHARMACIES;
    }
    const matchPharmacy = path.match(/^\/api\/pharmacies\/([^/]+)$/);
    if (matchPharmacy && matchPharmacy[1] !== 'search' && matchPharmacy[1] !== 'list' && matchPharmacy[1] !== 'me') {
      const item = MOCK_PHARMACIES.data.find(p => String(p.id) === matchPharmacy[1]) || MOCK_PHARMACIES.data[0];
      return { data: item };
    }
    if (path.includes('/api/facilities/search') || path.includes('/api/facilities/list') || path.includes('/api/facilities/me')) {
      return path.includes('/me') ? { data: MOCK_FACILITIES.data[0] } : MOCK_FACILITIES;
    }
    const matchFacility = path.match(/^\/api\/facilities\/([^/]+)$/);
    if (matchFacility && matchFacility[1] !== 'search' && matchFacility[1] !== 'list' && matchFacility[1] !== 'me') {
      const item = MOCK_FACILITIES.data.find(f => String(f.id) === matchFacility[1]) || MOCK_FACILITIES.data[0];
      return { data: item };
    }
    if (path.includes('/api/medicines/search') || path.includes('/api/medicines/list')) {
      /* The catalogue the admin manages (GET /api/catalog/medicines). */
      let result = await catalogue();
      if (options.query) {
        if (options.query.name) {
          const q = options.query.name.toLowerCase();
          result = result.filter(m => (m.name && m.name.toLowerCase().includes(q)) || (m.scientificName && m.scientificName.toLowerCase().includes(q)));
        }
        if (options.query.category) {
          result = result.filter(m => m.category === options.query.category);
        }
        if (options.query.area) {
          // A medicine matches the area if any of its stocks are in that area
          result = result.filter(m => m.stocks && m.stocks.some(s => s.area === options.query.area));
        }
      }
      return { data: result };
    }
    const matchMedicine = path.match(/^\/api\/medicines\/([^/]+)$/);
    if (matchMedicine && matchMedicine[1] !== 'search' && matchMedicine[1] !== 'list' && matchMedicine[1] !== 'me') {
      const item = (await catalogue()).find(m => String(m.id) === matchMedicine[1]);
      if (!item) throw new ApiError(404, null, 'لم يتم العثور على الدواء.');
      return { data: item };
    }
    if (path === '/api/doctors' || path.includes('/api/doctors/search')) {
      return MOCK_DOCTORS;
    }
    const matchDoctor = path.match(/^\/api\/doctors\/([^/]+)$/);
    if (matchDoctor && matchDoctor[1] !== 'search' && matchDoctor[1] !== 'list' && matchDoctor[1] !== 'me') {
      const item = MOCK_DOCTORS.data.find(d => String(d.id) === matchDoctor[1]) || MOCK_DOCTORS.data[0];
      return { data: item };
    }
    if (path.includes('/api/drugrequests/my')) {
      return { data: LOCAL_DRUG_REQUESTS };
    }
    const matchRequest = path.match(/^\/api\/drugrequests\/([^/]+)$/);
    if (matchRequest && matchRequest[1] !== 'my') {
      const req = LOCAL_DRUG_REQUESTS.find(r => String(r.id) === matchRequest[1]);
      if (req) return { data: req };
      const err = new Error('Not found'); err.status = 404; throw err;
    }
  }

  if (method === 'POST') {
    if (path.includes('/api/drugrequests')) {
      const id = Math.floor(Math.random() * 90000) + 10000;
      const medicineName = options.formData ? options.formData.get('medicineName') : '';
      const quantity = options.formData ? options.formData.get('quantity') : 1;
      const notes = options.formData ? options.formData.get('notes') : '';
      const hasPrescription = options.formData ? !!options.formData.get('prescription') : false;
      const newRequest = {
        id,
        medicineName,
        quantity: Number(quantity),
        notes,
        hasPrescription,
        status: 'review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      LOCAL_DRUG_REQUESTS = [newRequest, ...LOCAL_DRUG_REQUESTS];
      return { data: newRequest };
    }
    if (path.includes('/api/facilities/me/doctors')) {
      const doctorId = options.body?.doctorId;
      const doc = MOCK_DOCTORS.data.find(d => String(d.id) === String(doctorId));
      if (doc) {
        doc.facilityId = 201; // Mock current facility
        doc.facilityName = "مستشفى شهداء الأقصى";
      }
      return { data: doc };
    }
    if (path.includes('/api/facilities/me/services')) {
      const name = options.body?.name;
      const newService = { id: Math.floor(Math.random() * 1000) + 100, name, status: 'Active' };
      const facility = MOCK_FACILITIES.data.find(f => String(f.id) === '201'); // Mock current facility
      if (facility) {
        if (!facility.services) facility.services = [];
        facility.services.push(newService);
      }
      return { data: newService };
    }
    if (path.includes('/api/pharmacies/me/medicines')) {
      const { medicineId, customName, quantity, price, availability } = options.body || {};
      const pharmacy = MOCK_PHARMACIES.data[0];
      const newStock = {
        medicineId: medicineId || Math.floor(Math.random() * 1000) + 1000,
        medicineName: customName || (MOCK_MEDICINES.data.find(m => m.id === medicineId)?.name || 'دواء مخصص'),
        quantity: quantity || 0,
        price: price || 0,
        availability: availability || 'InStock'
      };
      if (!pharmacy.medicines) pharmacy.medicines = [];
      pharmacy.medicines.unshift(newStock);
      return { data: newStock };
    }
  }

  if (method === 'PUT') {
    const matchRequest = path.match(/^\/api\/drugrequests\/([^/]+)$/);
    if (matchRequest) {
      const req = LOCAL_DRUG_REQUESTS.find(r => String(r.id) === matchRequest[1]);
      if (req) {
        req.medicineName = options.formData ? options.formData.get('medicineName') : req.medicineName;
        req.quantity = options.formData ? Number(options.formData.get('quantity')) : req.quantity;
        req.notes = options.formData ? options.formData.get('notes') : req.notes;
        if (options.formData && options.formData.get('prescription')) req.hasPrescription = true;
        req.updatedAt = new Date().toISOString();
        return { data: req };
      }
      const err = new Error('Not found'); err.status = 404; throw err;
    }
  }

  if (method === 'PATCH') {
    const matchService = path.match(/^\/api\/facilities\/me\/services\/([^/]+)$/);
    if (matchService) {
      const facility = MOCK_FACILITIES.data.find(f => String(f.id) === '201'); // Mock current facility
      if (facility && facility.services) {
        const srv = facility.services.find(s => String(s.id) === matchService[1]);
        if (srv) {
          srv.status = options.body?.status;
          return { data: srv };
        }
      }
    }
    const matchStock = path.match(/^\/api\/pharmacies\/me\/medicines\/([^/]+)$/);
    if (matchStock) {
      const pharmacy = MOCK_PHARMACIES.data[0];
      if (pharmacy && pharmacy.medicines) {
        const stock = pharmacy.medicines.find(s => String(s.medicineId) === matchStock[1]);
        if (stock) {
          stock.quantity = options.body?.quantity ?? stock.quantity;
          stock.price = options.body?.price ?? stock.price;
          stock.availability = options.body?.availability ?? stock.availability;
          return { data: stock };
        }
      }
    }
  }

  if (method === 'DELETE') {
    const matchRequest = path.match(/^\/api\/drugrequests\/([^/]+)$/);
    if (matchRequest) {
      const idx = LOCAL_DRUG_REQUESTS.findIndex(r => String(r.id) === matchRequest[1]);
      if (idx !== -1) LOCAL_DRUG_REQUESTS.splice(idx, 1);
      return {};
    }
    const matchDoc = path.match(/^\/api\/facilities\/me\/doctors\/([^/]+)$/);
    if (matchDoc) {
      const doc = MOCK_DOCTORS.data.find(d => String(d.id) === matchDoc[1]);
      if (doc) { doc.facilityId = null; doc.facilityName = null; }
      return {};
    }
  }

  const headers = {};
  let body;

  if (options.formData) {
    body = options.formData; /* browser sets the multipart boundary */
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const token = auth.getToken();
  if (options.auth !== false && token) headers.Authorization = 'Bearer ' + token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || TIMEOUT_MS);

  let response;
  try {
    response = await fetch(buildUrl(base, path, options.query), {
      method, headers, body, signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timer);
    if (error && error.name === 'AbortError') {
      throw new ApiError(0, null, 'استغرق الخادم وقتاً طويلاً للاستجابة. حاول مجدداً.');
    }
    throw new ApiError(0, null, defaultMessage(0));
  }
  clearTimeout(timer);

  if (options.raw) {
    if (!response.ok) throw new ApiError(response.status, null);
    return response;
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (response.ok) return payload;

  /* The .NET API does not know the locally signed admin token, so its 401
     says nothing about the admin's session. */
  const adminOnDotNet = base === BASE && auth.isAdmin();
  if (response.status === 401 && options.auth !== false && !adminOnDotNet) {
    /* The API answers 401 with an empty body; drop the dead token. */
    auth.clear();
    if (typeof unauthorizedHandler === 'function') unauthorizedHandler();
  }
  throw new ApiError(response.status, payload);
}

export const request = (method, path, options) => send(BASE, method, path, options);
/* Same contract, against this app's own route handlers. */
export const local = (method, path, options) => send('', method, path, options);

/* ------------------------------------------------------------------
   Endpoint wrappers
   ------------------------------------------------------------------ */

const id = (value) => encodeURIComponent(value);

export const api = {
  auth: {
    signup: (payload) => request('POST', '/api/auth/signup', { body: payload, auth: false }),
    login: (payload) => request('POST', '/api/auth/login', { body: payload, auth: false }),
    adminLogin: (payload) => local('POST', '/api/admin/login', { body: payload, auth: false }),
    forgotPassword: (email) => request('POST', '/api/auth/forgot-password', { body: { email }, auth: false }),
    resendOtp: (email) => request('POST', '/api/auth/resend-otp', { body: { email }, auth: false }),
    verifyOtp: (email, otp) => request('POST', '/api/auth/verify-otp', { body: { email, otp }, auth: false }),
    resetPassword: (payload) => request('POST', '/api/auth/reset-password', { body: payload, auth: false }),
    logout: () => request('POST', '/api/auth/logout')
  },

  patients: {
    me: () => request('GET', '/api/patients/me'),
    updateMe: (payload) => request('PUT', '/api/patients/me', { body: payload })
  },

  doctors: {
    list: (query) => request('GET', '/api/doctors', { query }),
    search: (query) => request('GET', '/api/doctors/search', { query }),
    get: (doctorId) => request('GET', '/api/doctors/' + id(doctorId)),
    me: () => request('GET', '/api/doctors/me'),
    updateMe: (payload) => request('PUT', '/api/doctors/me', { body: payload })
  },

  facilities: {
    list: (query) => request('GET', '/api/facilities', { query }),
    search: (query) => request('GET', '/api/facilities/search', { query }),
    get: (facilityId) => request('GET', '/api/facilities/' + id(facilityId)),
    me: () => request('GET', '/api/facilities/me'),
    updateMe: (payload) => request('PUT', '/api/facilities/me', { body: payload }),
    setStatus: (status) => request('PATCH', '/api/facilities/me/status', { body: { status } }),
    addService: (name) => request('POST', '/api/facilities/me/services', { body: { name } }),
    updateService: (serviceId, status) =>
      request('PATCH', '/api/facilities/me/services/' + id(serviceId), { body: { status } }),
    addDoctor: (doctorId) => request('POST', '/api/facilities/me/doctors', { body: { doctorId } }),
    removeDoctor: (doctorId) => request('DELETE', '/api/facilities/me/doctors/' + id(doctorId))
  },

  pharmacies: {
    search: (query) => request('GET', '/api/pharmacies/search', { query }),
    get: (pharmacyId) => request('GET', '/api/pharmacies/' + id(pharmacyId)),
    me: () => request('GET', '/api/pharmacies/me'),
    updateMe: (payload) => request('PUT', '/api/pharmacies/me', { body: payload }),
    setStatus: (status) => request('PATCH', '/api/pharmacies/me/status', { body: { status } }),
    addStock: (payload) => request('POST', '/api/pharmacies/me/medicines', { body: payload }),
    updateStock: (medicineId, payload) =>
      request('PATCH', '/api/pharmacies/me/medicines/' + id(medicineId), { body: payload })
  },

  medicines: {
    /* The only endpoint in the API with documented query params. */
    search: (query) => request('GET', '/api/medicines/search', { query }),
    list: () => request('GET', '/api/medicines/list'),
    get: (medicineId) => request('GET', '/api/medicines/' + id(medicineId))
  },

  drugRequests: {
    create: (formData) => request('POST', '/api/drugrequests', { formData }),
    mine: () => request('GET', '/api/drugrequests/my'),
    get: (requestId) => request('GET', '/api/drugrequests/' + id(requestId)),
    update: (requestId, formData) => request('PUT', '/api/drugrequests/' + id(requestId), { formData }),
    remove: (requestId) => request('DELETE', '/api/drugrequests/' + id(requestId)),
    /* The file sits behind the Bearer token, so a plain <a href> cannot
       open it — fetch it as a blob and hand back an object URL. */
    async prescriptionBlobUrl(requestId) {
      const response = await request('GET', '/api/drugrequests/' + id(requestId) + '/prescription', { raw: true });
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  },

  /* ---- this app's route handlers ---------------------------------- */

  appointments: {
    slots: (doctorId, date) => local('GET', '/api/appointments/slots', { query: { doctorId, date } }),
    book: (payload) => local('POST', '/api/appointments', { body: payload }),
    mine: () => local('GET', '/api/appointments'),
    get: (appointmentId) => local('GET', '/api/appointments/' + id(appointmentId)),
    cancel: (appointmentId) => local('PATCH', '/api/appointments/' + id(appointmentId), { body: { action: 'cancel' } }),
    /* Doctor side: bookings made with the signed-in doctor. */
    forDoctor: () => local('GET', '/api/appointments', { query: { as: 'doctor' } }),
    /* Admin: every booking, read only. */
    all: () => local('GET', '/api/appointments', { query: { as: 'admin' } }),
    doctorAction: (appointmentId, action, reason) =>
      local('PATCH', '/api/appointments/' + id(appointmentId), { body: { as: 'doctor', action, reason } })
  },

  donations: {
    create: (payload) => local('POST', '/api/donations', { body: payload }),
    mine: () => local('GET', '/api/donations', { query: { scope: 'mine' } }),
    all: (status) => local('GET', '/api/donations', { query: { scope: 'all', status } }),
    get: (donationId) => local('GET', '/api/donations/' + id(donationId)),
    approve: (donationId, note) => local('POST', '/api/donations/' + id(donationId) + '/approve', { body: { note } }),
    reject: (donationId, reason) => local('POST', '/api/donations/' + id(donationId) + '/reject', { body: { reason } }),
    /* The donor, while the donation is still pending. */
    update: (donationId, payload) => local('PATCH', '/api/donations/' + id(donationId), { body: { action: 'edit', ...payload } }),
    withdraw: (donationId, reason) => local('PATCH', '/api/donations/' + id(donationId), { body: { action: 'withdraw', reason } })
  },

  matches: {
    candidates: (drugRequestId, governorate) => local('GET', '/api/matches/candidates', { query: { drugRequestId, governorate } }),
    list: (query) => local('GET', '/api/matches', { query }),
    get: (matchId) => local('GET', '/api/matches/' + id(matchId)),
    create: (payload) => local('POST', '/api/matches', { body: payload }),
    cancel: (matchId, note) => local('PATCH', '/api/matches/' + id(matchId), { body: { action: 'cancel', note } }),
    deliver: (matchId, note) => local('PATCH', '/api/matches/' + id(matchId), { body: { action: 'deliver', note } })
  },

  /* ---- admin ------------------------------------------------------
     `dotnet` goes through /api/admin/dotnet to the .NET API's own admin
     endpoints, signed in there with the linked .NET admin account. */
  admin: {
    stats: () => local('GET', '/api/admin/dotnet/admin/dashboard/stats'),
    users: {
      list: (query) => local('GET', '/api/admin/dotnet/admin/users', { query }),
      get: (userId) => local('GET', '/api/admin/dotnet/admin/users/' + id(userId)),
      create: (payload) => local('POST', '/api/admin/dotnet/admin/users', { body: payload }),
      setStatus: (userId, status) => local('PATCH', '/api/admin/dotnet/admin/users/' + id(userId) + '/status', { body: { status } }),
      remove: (userId) => local('DELETE', '/api/admin/dotnet/admin/users/' + id(userId))
    },
    healthcare: {
      list: (query) => local('GET', '/api/admin/dotnet/admin/healthcare', { query }),
      get: (itemId) => local('GET', '/api/admin/dotnet/admin/healthcare/' + id(itemId)),
      create: (payload) => local('POST', '/api/admin/dotnet/admin/healthcare', { body: payload }),
      update: (itemId, payload) => local('PUT', '/api/admin/dotnet/admin/healthcare/' + id(itemId), { body: payload }),
      remove: (itemId) => local('DELETE', '/api/admin/dotnet/admin/healthcare/' + id(itemId)),
      approve: (itemId) => local('PATCH', '/api/admin/dotnet/admin/healthcare/' + id(itemId) + '/approve')
    },
    drugRequests: {
      list: (query) => local('GET', '/api/admin/dotnet/admin/drug-requests', { query }),
      get: (requestId) => local('GET', '/api/admin/dotnet/admin/drug-requests/' + id(requestId)),
      setStatus: (requestId, status, rejectionReason) =>
        local('PATCH', '/api/admin/dotnet/admin/drug-requests/' + id(requestId) + '/status', { body: { status, rejectionReason } })
    },
    serverDonations: {
      list: (query) => local('GET', '/api/admin/dotnet/admin/donations', { query }),
      get: (donationId) => local('GET', '/api/admin/dotnet/admin/donations/' + id(donationId)),
      approve: (donationId) => local('PATCH', '/api/admin/dotnet/admin/donations/' + id(donationId) + '/approve'),
      reject: (donationId, reason) => local('PATCH', '/api/admin/dotnet/admin/donations/' + id(donationId) + '/reject', { body: { reason } })
    },
    medicines: {
      list: () => local('GET', '/api/admin/dotnet/medicines/list'),
      get: (medicineId) => local('GET', '/api/admin/dotnet/medicines/' + id(medicineId)),
      create: (payload) => local('POST', '/api/admin/dotnet/medicines', { body: payload }),
      update: (medicineId, payload) => local('PUT', '/api/admin/dotnet/medicines/' + id(medicineId), { body: payload }),
      remove: (medicineId) => local('DELETE', '/api/admin/dotnet/medicines/' + id(medicineId)),
      uploadImage: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return local('POST', '/api/admin/medicine-image', { formData });
      }
    },
    /* This app's own records. */
    donations: {
      update: (donationId, payload) => local('PATCH', '/api/donations/' + id(donationId), { body: { action: 'edit', ...payload } }),
      setStatus: (donationId, status, note) => local('PATCH', '/api/donations/' + id(donationId), { body: { action: 'status', status, note } }),
      remove: (donationId) => local('DELETE', '/api/donations/' + id(donationId))
    },
    appointments: {
      setStatus: (appointmentId, status, reason) =>
        local('PATCH', '/api/appointments/' + id(appointmentId), { body: { as: 'admin', action: 'status', status, reason } }),
      remove: (appointmentId) => local('DELETE', '/api/appointments/' + id(appointmentId))
    },
    matches: {
      remove: (matchId) => local('DELETE', '/api/matches/' + id(matchId))
    },
    notify: (userIds, title, message) => local('POST', '/api/admin/notify', { body: { userIds, title, message } })
  },

  navigator: {
    ask: (query, governorate, history) => local('POST', '/api/navigator', { body: { query, governorate, history }, timeout: 120000 })
  },

  inbox: {
    list: () => local('GET', '/api/notifications'),
    markRead: (ids) => local('PATCH', '/api/notifications', { body: { ids } }),
    markAllRead: () => local('PATCH', '/api/notifications', { body: { all: true } }),
    notifyAdmin: (message) => local('POST', '/api/notify-admin', { body: { message } })
  },

  prescriptions: {
    read: (formData) => local('POST', '/api/prescriptions/read', { formData, timeout: 180000 }),
    createManual: (medications, fileName) => local('POST', '/api/prescriptions', { body: { medications, fileName } }),
    mine: () => local('GET', '/api/prescriptions'),
    get: (prescriptionId) => local('GET', '/api/prescriptions/' + id(prescriptionId)),
    confirm: (prescriptionId, medications) =>
      local('PATCH', '/api/prescriptions/' + id(prescriptionId), { body: { action: 'confirm', medications } }),
    link: (prescriptionId, drugRequests) =>
      local('PATCH', '/api/prescriptions/' + id(prescriptionId), { body: { action: 'link', drugRequests } })
  }
};
