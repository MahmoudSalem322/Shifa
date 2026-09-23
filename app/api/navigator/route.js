import { handle, HttpError, readJson, requireUser } from '@/lib/server/auth';
import { navigate } from '@/lib/server/navigator-ai';
import { searchDirectory } from '@/lib/server/navigator-search';
import { describeSearch, parseWithRules } from '@/lib/navigator';
import { geo } from '@/lib/vocab';

/* POST /api/navigator { query, history?, governorate? }
   Module 6 · "Create AI Navigator API". Claude extracts the service,
   specialty and location; the directory search runs on the result.
   "Handle AI Errors": if the AI is unavailable, not configured or
   declines, a keyword parser takes over so the person still gets
   results, and the response says so. */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const recent = new Map();

function rateLimit(userId) {
  const now = Date.now();
  const hits = (recent.get(userId) || []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    throw new HttpError(429, 'أرسلت أسئلة كثيرة خلال وقت قصير. انتظر بضع دقائق ثم حاول مجدداً.');
  }
  hits.push(now);
  recent.set(userId, hits);
  if (recent.size > 1000) recent.delete(recent.keys().next().value);
}

export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const query = String(body.query || '').trim();
  if (query.length < 2) throw new HttpError(400, 'اكتب ما تبحث عنه.');
  if (query.length > 500) throw new HttpError(400, 'الرسالة طويلة جداً. اختصرها في 500 حرف.');
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  rateLimit(user.id);

  let parsed;
  let source = 'ai';
  let aiNotice = '';
  try {
    parsed = await navigate(query, history);
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    source = 'rules';
    aiNotice = error.extra && error.extra.code === 'ai_not_configured'
      ? 'المساعد الذكي غير مفعّل حالياً، فاستخدمنا البحث بالكلمات المفتاحية.'
      : 'تعذّر الوصول إلى المساعد الذكي (' + error.message + ') فاستخدمنا البحث بالكلمات المفتاحية.';
    parsed = parseWithRules(query);
  }

  /* A governorate picked in the UI wins over one inferred from the text. */
  const picked = geo.normalize(body.governorate);
  if (picked && !parsed.governorate) parsed.governorate = picked;

  const search = parsed.intent === 'general'
    ? { params: { intent: 'general', governorate: parsed.governorate }, results: { doctors: [], facilities: [], pharmacies: [], medicines: [] }, notes: [], total: 0 }
    : await searchDirectory(user, parsed);

  return Response.json({
    source,
    aiNotice,
    reply: parsed.reply || describeSearch(parsed),
    clarifyingQuestion: parsed.clarifyingQuestion,
    emergency: parsed.emergency,
    ...search
  });
});
