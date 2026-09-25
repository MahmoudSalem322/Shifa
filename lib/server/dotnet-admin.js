import 'server-only';
import { pick, toList } from '@/lib/api';
import { API_BASE, HttpError } from './auth';
import { mockAdmin } from './admin-mock';
import { cleanImageUrl, imageMap, rememberImage } from './medicine-images';

/* The .NET API's own admin endpoints (/api/admin/*, medicine CRUD) need a
   token whose role is Admin on that server. The local admin session is
   signed by this app, so the server signs in to .NET with a real admin
   account from the environment and calls those endpoints on the admin's
   behalf. The token is cached until shortly before it expires.
   Until that account is set, lib/server/admin-mock.js answers instead. */

let cached = null; /* { token, expires } */

export function configured() {
  return !!(process.env.SHIFA_ADMIN_EMAIL && process.env.SHIFA_ADMIN_PASSWORD);
}

function expiryOf(token) {
  try {
    const claims = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
    if (claims.exp) return claims.exp * 1000;
  } catch { /* opaque token */ }
  return Date.now() + 30 * 60 * 1000;
}

async function signIn() {
  if (!configured()) {
    throw new HttpError(503, 'لم يُربط حساب أدمن خادم شفاء بعد. أضف SHIFA_ADMIN_EMAIL و SHIFA_ADMIN_PASSWORD إلى ملف .env.local ثم أعد تشغيل الخادم.', { code: 'dotnet_admin_missing' });
  }
  let response;
  try {
    response = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone: process.env.SHIFA_ADMIN_EMAIL, password: process.env.SHIFA_ADMIN_PASSWORD, rememberMe: true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(90000)
    });
  } catch {
    throw new HttpError(503, 'تعذّر الوصول إلى خادم شفاء. حاول بعد قليل.');
  }
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  const token = pick(payload, 'token', 'accessToken', 'jwt', 'access_token') ||
    (payload && payload.data ? pick(payload.data, 'token', 'accessToken', 'jwt', 'access_token') : undefined);
  if (!response.ok || !token) {
    throw new HttpError(502, 'تعذّر تسجيل دخول حساب أدمن خادم شفاء. تحقّق من SHIFA_ADMIN_EMAIL و SHIFA_ADMIN_PASSWORD.', { code: 'dotnet_admin_login_failed' });
  }
  cached = { token: String(token), expires: expiryOf(token) - 60 * 1000 };
  return cached.token;
}

async function adminToken(fresh) {
  if (!fresh && cached && cached.expires > Date.now()) return cached.token;
  return signIn();
}

/* Calls the .NET API as its admin. Retries once with a new token on 401.
   POST /api/admin/users does not exist on .NET, so a new account goes
   through the public signup there (the user then confirms by OTP). */
export async function dotnetAdmin(method, path, { query, body } = {}) {
  if (!configured()) return mockAdmin(method, path, { query, body });
  if (method === 'POST' && path === '/api/admin/users') return signupUser(body || {});
  if (path.startsWith('/api/medicines')) return withMedicineImages(method, path, { query, body });
  return callDotnet(method, path, { query, body });
}

/* The .NET medicine DTOs reject unknown fields, so the picture is kept
   here by id and merged back into what the admin reads. */
async function withMedicineImages(method, path, { query, body }) {
  let imageUrl;
  let payload = body;
  if (body && typeof body === 'object' && 'imageUrl' in body) {
    ({ imageUrl, ...payload } = body);
  }
  const result = await callDotnet(method, path, { query, body: payload });
  if (!result.ok) return result;
  const idInPath = (path.match(/^\/api\/medicines\/(\d+)$/) || [])[1];
  if (method === 'GET') {
    const images = await imageMap();
    const withImage = (m) => (m && typeof m === 'object' && images.has(String(pick(m, 'id'))) ? { ...m, imageUrl: images.get(String(pick(m, 'id'))) } : m);
    if (idInPath) return { ...result, payload: result.payload && result.payload.data ? { ...result.payload, data: withImage(result.payload.data) } : withImage(result.payload) };
    return { ...result, payload: { data: toList(result.payload).map(withImage) } };
  }
  if (imageUrl !== undefined && (method === 'PUT' || method === 'POST')) {
    const node = result.payload && result.payload.data ? result.payload.data : result.payload;
    const id = idInPath || pick(node, 'id', 'medicineId');
    if (id !== undefined) await rememberImage(id, cleanImageUrl(imageUrl));
  }
  if (method === 'DELETE' && idInPath) await rememberImage(idInPath, '');
  return result;
}

async function callDotnet(method, path, { query, body } = {}) {
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const headers = { Authorization: 'Bearer ' + (await adminToken(attempt > 0)) };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(90000)
      });
    } catch {
      throw new HttpError(503, 'تعذّر الوصول إلى خادم شفاء. حاول بعد قليل.');
    }
    if (response.status === 401 && attempt === 0) {
      cached = null;
      continue;
    }
    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = { message: text }; }
    }
    if (response.status === 403) {
      throw new HttpError(403, 'حساب خادم شفاء المربوط لا يملك صلاحية الأدمن.', { code: 'dotnet_admin_forbidden' });
    }
    return { ok: response.ok, status: response.status, payload };
  }
  throw new HttpError(502, 'رفض خادم شفاء جلسة الأدمن.');
}

async function signupUser(body) {
  let response;
  try {
    response = await fetch(API_BASE + '/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: body.fullName, email: body.email, phone: body.phone,
        password: body.password, confirmPassword: body.confirmPassword, role: body.role
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(90000)
    });
  } catch {
    throw new HttpError(503, 'تعذّر الوصول إلى خادم شفاء. حاول بعد قليل.');
  }
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
  if (response.ok) return { ok: true, status: 201, payload: { message: 'تم إنشاء الحساب. سيصل رمز تفعيل إلى بريد المستخدم ليؤكده.' } };
  return { ok: false, status: response.status, payload };
}
