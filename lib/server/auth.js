import 'server-only';
import { claimOf } from '@/lib/api';
import { roles } from '@/lib/vocab';

/* Identifies the caller of a route handler from the same Bearer token the
   browser sends to the Shifaa .NET API.

   This app does not hold the API's signing key, so it cannot verify the
   JWT itself. Instead it asks the API: a request to an authorised
   endpoint either comes back 401 (bad/expired token) or anything else
   (the token is genuine). Only then are the token's claims trusted.
   Results are cached briefly so a page load does not hit Render per call. */

export const API_BASE = (process.env.SHIFA_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'https://shifaa-api.onrender.com').replace(/\/$/, '');

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || null;
  }
}

function decodePayload(token) {
  const part = String(token).split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export function bearerToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
}

async function tokenIsGenuine(token) {
  const hit = cache.get(token);
  if (hit && hit.expires > Date.now()) return hit.ok;

  /* GET /api/medicines/{id} needs any valid token; id 0 never exists, so
     a genuine token gets 404 and a forged or expired one gets 401. */
  let ok = false;
  try {
    const response = await fetch(API_BASE + '/api/medicines/0', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
      signal: AbortSignal.timeout(90000)
    });
    ok = response.status !== 401;
  } catch {
    throw new HttpError(503, 'تعذّر التحقق من الجلسة لأن خادم شفاء لا يستجيب. حاول بعد قليل.');
  }

  cache.set(token, { ok, expires: Date.now() + CACHE_MS });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return ok;
}

/* Returns { token, id, name, email, role } or throws HttpError(401). */
export async function requireUser(request) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, 'يجب تسجيل الدخول أولاً.');

  const claims = decodePayload(token);
  if (!claims) throw new HttpError(401, 'رمز الجلسة غير صالح.');
  if (claims.exp && claims.exp * 1000 < Date.now()) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');

  if (!(await tokenIsGenuine(token))) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');

  const email = claimOf(claims, 'email') || '';
  const id = claimOf(claims, 'id') ?? email;
  if (id === undefined || id === '') throw new HttpError(401, 'تعذّر تحديد هوية المستخدم من رمز الجلسة.');

  return {
    token,
    id: String(id),
    name: claimOf(claims, 'name') || '',
    email,
    role: roles.normalize(claimOf(claims, 'role') || '')
  };
}

export function requireRole(user, allowed, message) {
  if (!allowed.includes(user.role)) {
    throw new HttpError(403, message || 'لا تملك صلاحية تنفيذ هذا الإجراء.');
  }
}

/* Calls the .NET API on the user's behalf. */
export async function backend(user, method, path, body) {
  const headers = { Authorization: 'Bearer ' + user.token };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(API_BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(90000)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  return { ok: response.ok, status: response.status, payload };
}

/* Wraps a handler so thrown HttpErrors become JSON responses. */
export function handle(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return Response.json({ message: error.message, ...(error.extra || {}) }, { status: error.status });
      }
      console.error('[shifa] route handler failed', error);
      return Response.json({ message: 'حدث خطأ غير متوقع في الخادم.' }, { status: 500 });
    }
  };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'صيغة الطلب غير صحيحة.');
  }
}

/* ASP.NET-style validation envelope so the client's fieldErrors() works. */
export function validationError(errors) {
  const first = Object.values(errors)[0];
  return new HttpError(400, Array.isArray(first) ? first[0] : String(first), { errors });
}
