import { handle, HttpError, readJson } from '@/lib/server/auth';
import { ADMIN_EMAIL, ADMIN_ID, adminName, checkAdminCredentials, signAdminToken } from '@/lib/server/admin-auth';

/* Failed attempts per client, so the password cannot be guessed at speed. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map();

function clientKey(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
}

/* POST /api/admin/login { username, password } — the local admin account.
   Answers in the same shape auth.setSession() reads from the .NET login. */
export const POST = handle(async (request) => {
  const key = clientKey(request);
  const record = failures.get(key);
  if (record && record.until > Date.now() && record.count >= MAX_FAILURES) {
    throw new HttpError(429, 'محاولات كثيرة. حاول مجدداً بعد ربع ساعة.');
  }

  const body = await readJson(request);
  if (!checkAdminCredentials(body.username, body.password)) {
    const current = record && record.until > Date.now() ? record : { count: 0, until: Date.now() + WINDOW_MS };
    failures.set(key, { ...current, count: current.count + 1 });
    throw new HttpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة.', { errors: { Credentials: ['اسم المستخدم أو كلمة المرور غير صحيحة.'] } });
  }
  failures.delete(key);

  return Response.json({
    token: signAdminToken(),
    user: { id: ADMIN_ID, fullName: adminName(), email: ADMIN_EMAIL, role: 'Admin' }
  });
});
