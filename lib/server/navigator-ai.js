import 'server-only';
import { FACILITY_TYPES, INTENTS, SPECIALTIES, SPECIALTY_KEYS } from '@/lib/navigator';
import { HttpError } from './auth';
import { getClient, parseStructured, toHttpError } from './claude';

/* Module 6 · "Send User Query to AI" → "Extract Healthcare Service /
   Specialty / Location". One Claude call with a strict JSON schema; the
   route turns the result into search parameters. */

const MODEL = process.env.SHIFA_NAVIGATOR_MODEL || 'claude-opus-5';

const SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: Object.keys(INTENTS) },
    specialty: { type: 'string', enum: ['', ...SPECIALTY_KEYS] },
    service: { type: 'string' },
    governorate: { type: 'string', enum: ['', 'north', 'gaza', 'middle', 'khanyounis', 'rafah'] },
    facilityType: { type: 'string', enum: ['', ...FACILITY_TYPES] },
    medicineName: { type: 'string' },
    emergency: { type: 'boolean' },
    reply: { type: 'string' },
    clarifyingQuestion: { type: 'string' }
  },
  required: ['intent', 'specialty', 'service', 'governorate', 'facilityType', 'medicineName', 'emergency', 'reply', 'clarifyingQuestion'],
  additionalProperties: false
};

const SYSTEM = `You are the Health Navigator of Shifa, a healthcare platform for the Gaza Strip. People describe what they need in Arabic (often Palestinian dialect) or English. Your job is routing, not medicine: turn the message into search parameters for Shifa's directory of doctors, hospitals and health centres, pharmacies and medicines. The app runs the search and shows the results under your reply.

Fields:
- intent: what to search. "doctor" for a specialist or a symptom a doctor should see; "facility" for a hospital, clinic, health centre or a service such as dialysis, X-ray, lab tests, vaccination or delivery; "pharmacy" for a pharmacy; "medicine" when they need a specific medicine; "emergency" for anything that may be life-threatening; "general" when there is nothing to search yet.
- specialty: the best-fitting specialty key for a doctor search, or "" if none fits. Keys: ${SPECIALTIES.map((s) => s.key + ' (' + s.label + ')').join(', ')}.
- service: the healthcare service they need in short Arabic (e.g. "غسيل كلى", "أشعة", "تطعيم"), or "".
- governorate: north (شمال غزة: Jabalia, Beit Lahia, Beit Hanoun), gaza (Gaza City: Rimal, Shujaiya, Tal al-Hawa, Sheikh Radwan, Zeitoun), middle (الوسطى: Deir al-Balah, Nuseirat, Bureij, Maghazi, Zawaida), khanyounis (Khan Younis, al-Mawasi, Bani Suheila, Abasan), rafah. Use "" when no place is mentioned; "قطاع غزة" alone means the whole Strip, which is "".
- facilityType: hospital, clinic, phc (primary care centre), field (field hospital), gov (government hospital), complex (medical complex), or "".
- medicineName: the medicine as they wrote it, if any.
- emergency: true for signs such as heavy bleeding, loss of consciousness, severe breathing difficulty, chest pain, stroke signs, seizures, serious injuries, poisoning, burns, or thoughts of self-harm. When true, intent is "emergency".
- reply: one or two short sentences in Arabic telling the person what you are searching for (for example "سأبحث لك عن أطباء أطفال في خان يونس."). When emergency is true, the reply first tells them to call the ambulance on 101 or go to the nearest emergency department now.
- clarifyingQuestion: one short Arabic question when the request is too vague to search (intent "general"), otherwise "".

Rules: never diagnose, name a condition the person may have, or recommend a treatment or a dose. A symptom only selects a specialty. Do not invent places, doctors or medicines. Earlier turns of the conversation, when given, are context for short follow-ups such as "وفي رفح؟".`;

/* history: [{ role: 'user' | 'assistant', text }] — the last few turns. */
export async function navigate(query, history = []) {
  const context = history
    .filter((turn) => turn && turn.text)
    .slice(-6)
    .map((turn) => (turn.role === 'user' ? 'المستخدم: ' : 'المساعد: ') + String(turn.text).slice(0, 500))
    .join('\n');

  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      /* Server-side fallback: if a safety classifier declines, the API
         retries on Anthropic's recommended model instead of refusing. */
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{
        role: 'user',
        content: (context ? 'المحادثة السابقة:\n' + context + '\n\n' : '') + 'الرسالة الحالية:\n' + query
      }]
    });
  } catch (error) {
    throw toHttpError(error, 'المساعد الذكي');
  }

  const parsed = parseStructured(response, 'المساعد الذكي');
  if (!parsed || !INTENTS[parsed.intent]) throw new HttpError(502, 'أعادت خدمة المساعد الذكي نتيجة غير مفهومة. حاول مجدداً.');

  return {
    intent: parsed.intent,
    specialty: SPECIALTY_KEYS.includes(parsed.specialty) ? parsed.specialty : '',
    service: String(parsed.service || '').slice(0, 60),
    governorate: parsed.governorate || '',
    facilityType: FACILITY_TYPES.includes(parsed.facilityType) ? parsed.facilityType : '',
    medicineName: String(parsed.medicineName || '').slice(0, 80),
    emergency: !!parsed.emergency || parsed.intent === 'emergency',
    reply: String(parsed.reply || '').slice(0, 600),
    clarifyingQuestion: String(parsed.clarifyingQuestion || '').slice(0, 300)
  };
}
