import { backend, handle, HttpError, readJson, requireUser } from '@/lib/server/auth';
import { pick, toList } from '@/lib/api';
import { COLLECTION, parseMedications, publicPrescription } from '@/lib/server/prescriptions';
import { store } from '@/lib/server/store';

export const GET = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const items = await store.read(COLLECTION);
  const record = items.find((p) => p.id === id && p.userId === user.id);
  if (!record) throw new HttpError(404, 'لم يتم العثور على الوصفة.');
  return Response.json({ prescription: publicPrescription(record) });
});

/* PATCH /api/prescriptions/{id}
   { action: 'confirm', medications }  — Module 7 · "Confirm Prescription
     Data" + "Save Extracted Data": the reviewed/edited list replaces the
     AI draft (the original extraction is kept alongside it).
   { action: 'link', drugRequests: [{ id, medicineName, quantity }] } —
     Feature 2 · "Connect Prescription with Drug Request". */
export const PATCH = handle(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  const body = await readJson(request);

  /* A link must point at the caller's own drug requests on the .NET API. */
  let ownRequestIds = null;
  if (body.action === 'link') {
    const response = await backend(user, 'GET', '/api/drugrequests/my');
    if (response.status === 401) throw new HttpError(401, 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
    if (!response.ok) throw new HttpError(502, 'تعذّر التحقق من طلبات الأدوية على خادم شفاء.');
    ownRequestIds = new Set(toList(response.payload).map((item) => String(pick(item, 'id', 'requestId', 'drugRequestId'))));
  }

  const updated = await store.update(COLLECTION, (items) => {
    const index = items.findIndex((p) => p.id === id && p.userId === user.id);
    if (index === -1) throw new HttpError(404, 'لم يتم العثور على الوصفة.');
    const current = items[index];
    const now = new Date().toISOString();
    let next;

    if (body.action === 'confirm') {
      if (current.status === 'requested') throw new HttpError(409, 'تم إرسال طلبات هذه الوصفة مسبقاً.');
      next = { ...current, status: 'confirmed', medications: parseMedications(body.medications), confirmedAt: now };
    } else if (body.action === 'link') {
      if (current.status === 'extracted') throw new HttpError(409, 'أكّد بيانات الوصفة أولاً.');
      const links = (Array.isArray(body.drugRequests) ? body.drugRequests : [])
        .slice(0, 50)
        .filter((r) => r && (r.id !== undefined && r.id !== null && r.id !== '') && ownRequestIds.has(String(r.id)))
        .map((r) => ({ id: String(r.id), medicineName: String(r.medicineName || '').slice(0, 200), quantity: Number(r.quantity) || 0 }));
      if (!links.length) throw new HttpError(400, 'لا توجد طلبات أدوية لربطها.');
      const known = new Set((current.drugRequests || []).map((r) => r.id));
      const drugRequests = [...(current.drugRequests || []), ...links.filter((r) => !known.has(r.id))];
      next = { ...current, status: 'requested', drugRequests, drugRequestIds: drugRequests.map((r) => r.id), requestedAt: current.requestedAt || now };
    } else {
      throw new HttpError(400, 'إجراء غير مدعوم.');
    }

    const copy = items.slice();
    copy[index] = next;
    return { items: copy, result: next };
  });

  return Response.json({ prescription: publicPrescription(updated) });
});
