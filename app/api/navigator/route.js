import { handle, HttpError, readJson, requireUser } from '@/lib/server/auth';
import { navigate } from '@/lib/server/navigator-ai';
import { searchDirectory } from '@/lib/server/navigator-search';
import { describeSearch, parseWithRules } from '@/lib/navigator';
import { geo } from '@/lib/vocab';
import { createRateLimit } from '@/lib/server/rate-limit';

/* POST /api/navigator { query, history?, governorate? }
   Module 6 · "Create AI Navigator API". Claude extracts the service,
   specialty and location; the directory search runs on the result.
   "Handle AI Errors": if the AI is unavailable, not configured or
   declines, a keyword parser takes over so the person still gets
   results, and the response says so. */

const rateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'أرسلت أسئلة كثيرة خلال وقت قصير. انتظر بضع دقائق ثم حاول مجدداً.'
});

export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const query = String(body.query || '').trim();
  if (query.length < 2) throw new HttpError(400, 'اكتب ما تبحث عنه.');
  if (query.length > 500) throw new HttpError(400, 'الرسالة طويلة جداً. اختصرها في 500 حرف.');
  /* Only the user's own earlier messages are trusted as context; the
     assistant side is whatever the client says it was. */
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((turn) => turn && typeof turn === 'object')
    .slice(-6)
    .map((turn) => ({ role: turn.role === 'assistant' ? 'assistant' : 'user', text: String(turn.text || '').slice(0, 500) }));
  rateLimit(user.id);

  let parsed;
  let source = 'ai';
  let aiNotice = '';
  try {
    parsed = await navigate(query, history);
  } catch (error) {
    /* Any failure, expected or not, falls back to keywords. */
    if (!(error instanceof HttpError)) console.error('[shifa] navigator AI failed', error);
    source = 'rules';
    aiNotice = error instanceof HttpError && error.extra && error.extra.code === 'ai_not_configured'
      ? 'المساعد الذكي غير مفعّل حالياً، فاستخدمنا البحث بالكلمات المفتاحية.'
      : 'تعذّر الوصول إلى المساعد الذكي' + (error instanceof HttpError ? ' (' + error.message + ')' : '') + ' فاستخدمنا البحث بالكلمات المفتاحية.';
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
