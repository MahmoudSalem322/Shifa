import { handle, readJson, requireUser } from '@/lib/server/auth';
import { COLLECTION } from '@/lib/server/notify';
import { store } from '@/lib/server/store';

/* GET — the caller's server-side notifications, newest first. */
export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const items = (await store.read(COLLECTION)).filter((item) => item.userId === user.id);
  return Response.json({ items: items.map(({ userId, ...rest }) => rest) });
});

/* PATCH { ids: [...] } marks those read; { all: true } marks everything. */
export const PATCH = handle(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const ids = new Set(Array.isArray(body.ids) ? body.ids.map(String) : []);
  await store.update(COLLECTION, (items) => ({
    items: items.map((item) =>
      item.userId === user.id && (body.all || ids.has(item.id)) ? { ...item, read: true } : item),
    result: null
  }));
  return Response.json({ ok: true });
});
