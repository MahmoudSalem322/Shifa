import { handle, readJson, requireUser } from '@/lib/server/auth';
import { COLLECTION, parseMedications, publicPrescription } from '@/lib/server/prescriptions';
import { store } from '@/lib/server/store';

/* GET /api/prescriptions — the caller's prescriptions, newest first. */
export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const items = await store.read(COLLECTION);
  const mine = items
    .filter((p) => p.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicPrescription);
  return Response.json({ prescriptions: mine });
});

/* POST /api/prescriptions — a prescription entered by hand (the AI reader
   was unavailable or the patient chose to type it). Stored already
   confirmed, since the patient wrote every line. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const medications = parseMedications(body.medications);

  const record = await store.update(COLLECTION, (items) => {
    const now = new Date().toISOString();
    const entry = {
      id: store.newId('rx'),
      userId: user.id,
      status: 'confirmed',
      source: 'manual',
      fileName: String(body.fileName || '').slice(0, 120),
      extracted: null,
      medications,
      drugRequestIds: [],
      createdAt: now,
      confirmedAt: now
    };
    return { items: [...items, entry], result: entry };
  });

  return Response.json({ prescription: publicPrescription(record) }, { status: 201 });
});
