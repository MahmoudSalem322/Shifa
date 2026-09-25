import { handle, readJson, requireUser } from '@/lib/server/auth';
import { notify } from '@/lib/server/notify';

export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);

  await notify([{
    userId: 'admin-1',
    type: 'info',
    title: 'طلب جديد من ' + user.name,
    message: body.message,
    href: '#'
  }]);

  return Response.json({ ok: true });
});
