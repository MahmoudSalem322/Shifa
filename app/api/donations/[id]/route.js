import { handle, HttpError, requireUser } from '@/lib/server/auth';
import { COLLECTION, canView, publicDonation } from '@/lib/server/donations';
import { store } from '@/lib/server/store';

/* GET /api/donations/{id} — Module 8 · "Display Donation Details". */
export const GET = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const items = await store.read(COLLECTION);
  const donation = items.find((d) => d.id === id);
  if (!donation || !canView(user, donation)) throw new HttpError(404, 'لم يتم العثور على التبرع.');
  return Response.json({ donation: publicDonation(donation, user) });
});
