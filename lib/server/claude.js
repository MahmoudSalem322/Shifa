import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from './auth';

/* Shared Claude client for the AI features (Module 6 health navigator,
   Module 7 prescription reader). Requires ANTHROPIC_API_KEY (or another
   credential the Anthropic SDK can resolve) on the server. */

let client = null;
export function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

/* Turns an SDK failure into an HttpError with an Arabic message.
   `service` names the feature in that message ("القراءة الذكية"). */
export function toHttpError(error, service, fallbackHint = '') {
  const notConfigured = () => new HttpError(503, 'خدمة ' + service + ' غير مفعّلة على الخادم.' + (fallbackHint ? ' ' + fallbackHint : ''), { code: 'ai_not_configured' });

  if (error instanceof Anthropic.RateLimitError) {
    return new HttpError(429, 'خدمة ' + service + ' مشغولة حالياً. حاول بعد دقيقة.');
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error('[shifa] Anthropic credentials rejected', error.status);
    return notConfigured();
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error('[shifa] Anthropic request rejected', error.message);
    return new HttpError(422, 'تعذّرت معالجة هذا الطلب.');
  }
  /* APIConnectionError extends APIError, so it is checked first. */
  if (error instanceof Anthropic.APIConnectionError) {
    return new HttpError(502, 'تعذّر الاتصال بخدمة ' + service + '. حاول مجدداً.');
  }
  if (error instanceof Anthropic.APIError) {
    console.error('[shifa] Anthropic API error', error.status, error.message);
    return new HttpError(502, 'تعذّر الاتصال بخدمة ' + service + '. حاول مجدداً.');
  }
  /* No API key or profile: the SDK fails before sending anything, with
     a plain Error ("Could not resolve authentication method…"). */
  if (error instanceof Anthropic.AnthropicError || /authentication method|api.?key/i.test(String(error && error.message))) {
    console.error('[shifa] Anthropic client not configured', error.message);
    return notConfigured();
  }
  return error;
}

/* The text of a structured-output response, parsed. Throws HttpError on
   refusal, truncation or unparsable output. */
export function parseStructured(response, service) {
  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'تعذّر على خدمة ' + service + ' معالجة هذا الطلب.', { code: 'refusal' });
  }
  if (response.stop_reason === 'max_tokens') {
    throw new HttpError(422, 'الرد أطول من المتوقع ولم يكتمل. جرّب طلباً أقصر.', { code: 'max_tokens' });
  }
  const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, 'أعادت خدمة ' + service + ' نتيجة غير مفهومة. حاول مجدداً.');
  }
}
