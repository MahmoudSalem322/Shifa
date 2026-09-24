import { handle, HttpError, readJson, requireRole, requireUser } from '@/lib/server/auth';
import { ACCEPTED, COLLECTION, isReviewer, parseDonation, publicDonation } from '@/lib/server/donations';
import { store } from '@/lib/server/store';

/* GET /api/donations?scope=mine|all&status=pending|approved|rejected
   Module 8 · "Create Get Donations API". `mine` is every account's own
   donations; `all` is the review queue, for pharmacies and health centres. */
export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'mine';
  const status = searchParams.get('status') || '';

  if (scope === 'all' && !isReviewer(user)) {
    throw new HttpError(403, 'مراجعة التبرعات متاحة للصيدليات والمراكز الصحية فقط.');
  }

  const items = await store.read(COLLECTION);
  const list = items
    .filter((d) => (scope === 'all' ? d.status !== 'withdrawn' : d.donorId === user.id))
    /* 'approved' also covers donations since matched or delivered (Module 9). */
    .filter((d) => (status ? (status === 'approved' ? ACCEPTED.includes(d.status) : d.status === status) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => publicDonation(d, user));

  const counts = scope === 'all'
    ? items.filter((d) => d.status !== 'withdrawn').reduce((acc, d) => {
      const key = ACCEPTED.includes(d.status) ? 'approved' : d.status;
      return { ...acc, [key]: (acc[key] || 0) + 1 };
    }, { pending: 0, approved: 0, rejected: 0 })
    : undefined;

  return Response.json({ donations: list, counts });
});

/* POST /api/donations — Module 8 · "Create Donation API" + "Submit Donation".
   Every donation starts as pending until a pharmacy or centre reviews it. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  requireRole(user, ['Patient', 'Donor'], 'التبرع بالأدوية متاح لحسابات المتبرعين والمرضى.');
  const fields = parseDonation(await readJson(request));

  const donation = await store.update(COLLECTION, (items) => {
    const record = {
      id: store.newId('don'),
      ...fields,
      donorId: user.id,
      donorEmail: user.email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      history: [{ status: 'pending', at: new Date().toISOString(), by: fields.donorName }]
    };
    return { items: [...items, record], result: record };
  });

  return Response.json({ donation: publicDonation(donation, user), message: 'تم استلام تبرعك وهو الآن قيد المراجعة.' }, { status: 201 });
});
