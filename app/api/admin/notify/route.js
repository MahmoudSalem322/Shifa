import { handle, HttpError, isAdmin, readJson, requireUser, text } from '@/lib/server/auth';
import { notify } from '@/lib/server/notify';

/* POST /api/admin/notify { userIds: [...], title, message } — the admin
   sends a notice to one or more accounts' in-app inbox. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, 'إرسال الإشعارات متاح للإدارة فقط.');
  const body = await readJson(request);
  const userIds = (Array.isArray(body.userIds) ? body.userIds : []).map((id) => text(id, 64)).filter(Boolean).slice(0, 500);
  const title = text(body.title, 120);
  const message = text(body.message, 1000);
  if (!userIds.length) throw new HttpError(400, 'حدّد مستلماً واحداً على الأقل.');
  if (title.length < 2) throw new HttpError(400, 'أدخل عنوان الإشعار.');

  await notify(userIds.map((userId) => ({ userId, type: 'info', title, message, href: '' })));
  return Response.json({ message: userIds.length === 1 ? 'تم إرسال الإشعار.' : 'تم إرسال الإشعار إلى ' + userIds.length + ' حساب.' });
});
