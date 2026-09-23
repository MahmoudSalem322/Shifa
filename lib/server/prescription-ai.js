import 'server-only';
import { HttpError } from './auth';
import { getClient, parseStructured, toHttpError } from './claude';

/* Module 7 · "Send Image to OCR/AI API" → "Extract Medicine Names /
   Dosage / Quantity" → "Return Extracted Data".

   One Claude vision call with a strict JSON schema, so the response is
   always the shape the review screen expects. Requires ANTHROPIC_API_KEY
   (or another credential the Anthropic SDK can resolve) on the server. */

const MODEL = process.env.SHIFA_PRESCRIPTION_MODEL || 'claude-opus-5';

const SCHEMA = {
  type: 'object',
  properties: {
    isPrescription: { type: 'boolean' },
    readability: { type: 'string', enum: ['clear', 'partial', 'unreadable'] },
    doctorName: { type: 'string' },
    patientName: { type: 'string' },
    prescriptionDate: { type: 'string' },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          genericName: { type: 'string' },
          strength: { type: 'string' },
          dosageForm: { type: 'string' },
          dosage: { type: 'string' },
          frequency: { type: 'string' },
          duration: { type: 'string' },
          quantity: { type: 'integer' },
          quantityUnit: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: 'string' }
        },
        required: ['name', 'genericName', 'strength', 'dosageForm', 'dosage', 'frequency', 'duration', 'quantity', 'quantityUnit', 'confidence', 'notes'],
        additionalProperties: false
      }
    },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['isPrescription', 'readability', 'doctorName', 'patientName', 'prescriptionDate', 'medications', 'warnings'],
  additionalProperties: false
};

const SYSTEM = `You read medical prescriptions for Shifa, a healthcare platform used in Gaza. Patients upload a photo or PDF of a prescription; you transcribe the medicines so the patient can review them and request the medicine from a pharmacy. A person always reviews and corrects your output before anything is submitted.

Transcribe only what is written. Prescriptions are often handwritten, in Arabic, English or Latin abbreviations (e.g. "1x3", "tid", "bid", "prn", "tab", "cap", "syr"). Expand abbreviations into plain Arabic in the dosage/frequency/duration fields (for example "قرص واحد" and "3 مرات يومياً"), but keep the medicine name exactly as written, in its original script, correcting only obvious misspellings of well-known drug names.

Field rules:
- quantity: the number of units to dispense, when the prescription states it or it follows unambiguously from dose × frequency × duration. Use 0 when it cannot be determined. quantityUnit names the unit (علبة, شريط, قرص, زجاجة, ...), or an empty string.
- Any other field that is not on the prescription is an empty string. Never invent a dose, strength or duration.
- confidence: "low" whenever handwriting is ambiguous or you are choosing between candidate readings; mention the alternatives in notes.
- If the image is not a prescription, set isPrescription to false and return no medications. If it is too blurry to read, set readability to "unreadable".
- warnings: short Arabic notes the patient should see, such as illegible lines or a date that looks old. Do not give medical advice.

All free-text output (dosage, frequency, duration, notes, warnings) is in Arabic.`;

export async function extractPrescription({ bytes, mediaType }) {
  const data = Buffer.from(bytes).toString('base64');
  const source = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data } };

  let response;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      /* Server-side fallback: if a safety classifier declines, the API
         retries on Anthropic's recommended model instead of refusing. */
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{
        role: 'user',
        content: [source, { type: 'text', text: 'استخرج الأدوية من هذه الوصفة الطبية.' }]
      }]
    });
  } catch (error) {
    const mapped = toHttpError(error, 'القراءة الذكية', 'يمكنك إدخال الأدوية يدوياً.');
    if (mapped instanceof HttpError && mapped.status === 422) {
      throw new HttpError(422, 'تعذّرت معالجة هذا الملف. جرّب صورة أوضح بصيغة JPG أو PNG.');
    }
    throw mapped;
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'تعذّرت قراءة هذا الملف كوصفة طبية. أدخل الأدوية يدوياً.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new HttpError(422, 'الوصفة أطول من المتوقع ولم تكتمل قراءتها. جرّب تصوير جزء منها أو أدخل الأدوية يدوياً.');
  }

  const parsed = parseStructured(response, 'القراءة الذكية');

  return {
    model: response.model,
    isPrescription: !!parsed.isPrescription,
    readability: parsed.readability || 'partial',
    doctorName: parsed.doctorName || '',
    patientName: parsed.patientName || '',
    prescriptionDate: parsed.prescriptionDate || '',
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter(Boolean).slice(0, 10) : [],
    medications: (Array.isArray(parsed.medications) ? parsed.medications : [])
      .filter((m) => m && String(m.name || '').trim())
      .slice(0, 30)
      .map((m) => ({
        name: String(m.name).trim(),
        genericName: m.genericName || '',
        strength: m.strength || '',
        dosageForm: m.dosageForm || '',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
        quantity: Number.isInteger(m.quantity) && m.quantity > 0 ? m.quantity : 0,
        quantityUnit: m.quantityUnit || '',
        confidence: ['high', 'medium', 'low'].includes(m.confidence) ? m.confidence : 'medium',
        notes: m.notes || ''
      }))
  };
}
