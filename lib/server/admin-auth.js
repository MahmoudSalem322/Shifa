import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
/* Circular with ./auth, which is fine: HttpError is only used inside functions. */
import { HttpError } from './auth';

/* The .NET API has no Admin role, so the admin account lives here: its
   credentials come from the environment and this app signs the session
   token itself (HS256). requireUser() recognises these tokens by their
   issuer and verifies them locally instead of asking the .NET API. */

export const ADMIN_ISSUER = 'shifa-local';
export const ADMIN_ID = 'admin-1';
export const ADMIN_EMAIL = 'admin@shifa.local';
const TTL_SECONDS = 12 * 60 * 60;

function secret() {
  const value = process.env.ADMIN_TOKEN_SECRET || '';
  if (value.length < 32) throw new HttpError(503, 'حساب الإدارة غير مهيأ على هذا الخادم.');
  return value;
}

export function adminName() {
  return process.env.ADMIN_NAME || 'مدير النظام';
}

const base64url = (input) => Buffer.from(input).toString('base64url');

function signature(data) {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

function sameText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    /* Still do a comparison so a length mismatch does not answer faster. */
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function checkAdminCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || '';
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  if (!expectedUser || !expectedPassword) throw new HttpError(503, 'حساب الإدارة غير مهيأ على هذا الخادم.');
  const userOk = sameText(String(username || '').trim().toLowerCase(), expectedUser.toLowerCase());
  const passwordOk = sameText(String(password || ''), expectedPassword);
  return userOk && passwordOk;
}

export function signAdminToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: ADMIN_ISSUER,
    sub: ADMIN_ID,
    name: adminName(),
    email: ADMIN_EMAIL,
    role: 'Admin',
    iat: now,
    exp: now + TTL_SECONDS
  }));
  return header + '.' + payload + '.' + signature(header + '.' + payload);
}

/* Returns the claims of a genuine, unexpired admin token, or null. */
export function verifyAdminToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  if (!sameText(sig, signature(header + '.' + payload))) return null;
  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!claims || claims.iss !== ADMIN_ISSUER || claims.role !== 'Admin') return null;
  if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
  return claims;
}
