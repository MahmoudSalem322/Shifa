import { handle, HttpError, isAdmin, requireUser } from '@/lib/server/auth';
import { dotnetAdmin } from '@/lib/server/dotnet-admin';

/* /api/admin/dotnet/{path} → the .NET API's /api/{path}, called with the
   linked .NET admin account. Only the admin may use it, and only the
   admin endpoints listed in the Swagger spec (plus medicine CRUD) pass. */

const ID = '\\d+';
const ALLOWED = {
  GET: [
    'admin/dashboard/stats',
    `admin/(users|donations|drug-requests|healthcare)(/${ID})?`,
    `medicines/list`,
    `medicines/${ID}`
  ],
  POST: ['admin/users', 'admin/healthcare', 'medicines'],
  PUT: [`admin/healthcare/${ID}`, `medicines/${ID}`],
  PATCH: [
    `admin/users/${ID}/status`,
    `admin/donations/${ID}/(approve|reject)`,
    `admin/drug-requests/${ID}/status`,
    `admin/healthcare/${ID}/approve`
  ],
  DELETE: [`admin/users/${ID}`, `admin/healthcare/${ID}`, `medicines/${ID}`]
};

function allowed(method, path) {
  return (ALLOWED[method] || []).some((pattern) => new RegExp('^' + pattern + '$').test(path));
}

function proxy(method) {
  return handle(async (request, { params }) => {
    const user = await requireUser(request);
    if (!isAdmin(user)) throw new HttpError(403, 'هذه العملية متاحة للإدارة فقط.');

    const { path } = await params;
    const target = (path || []).map((part) => encodeURIComponent(part)).join('/');
    if (!allowed(method, target)) throw new HttpError(404, 'عملية غير معروفة.');

    const query = Object.fromEntries(new URL(request.url).searchParams);
    let body;
    if (method !== 'GET' && method !== 'DELETE') {
      const text = await request.text();
      if (text) {
        try { body = JSON.parse(text); } catch { throw new HttpError(400, 'صيغة الطلب غير صحيحة.'); }
      } else if (method === 'PATCH') {
        body = {};
      }
    }

    const result = await dotnetAdmin(method, '/api/' + target, { query, body });
    if (result.ok) return Response.json(result.payload ?? { ok: true }, { status: result.status === 204 ? 200 : result.status });

    const payload = result.payload && typeof result.payload === 'object' ? result.payload : {};
    if (!payload.message && !payload.title && !payload.errors) {
      payload.message = result.status === 404 ? 'لم يتم العثور على العنصر على خادم شفاء.' : 'رفض خادم شفاء هذه العملية (' + result.status + ').';
    }
    return Response.json(payload, { status: result.status });
  });
}

export const GET = proxy('GET');
export const POST = proxy('POST');
export const PUT = proxy('PUT');
export const PATCH = proxy('PATCH');
export const DELETE = proxy('DELETE');
