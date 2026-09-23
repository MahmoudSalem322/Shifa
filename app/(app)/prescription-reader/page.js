'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, pick, toItem, toList } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { notifications } from '@/lib/notifications';
import { formatDateTime } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { PrescriptionUpload } from '@/components/prescription-upload';
import { useToast } from '@/components/toast';
import { AsyncBlock, Badge, Button, Card, CardTitle, Icon, inputClass } from '@/components/ui';

/* Module 7 — AI Prescription Reader.
   Feature 1: upload → validate → AI extraction (POST /api/prescriptions/read)
              → review and edit → confirm (PATCH …/{id} action=confirm).
   Feature 2: confirmed medicines become drug requests on the .NET API
              (POST /api/drugrequests, with the prescription attached), and
              the prescription is linked to them (PATCH …/{id} action=link). */

const PRESCRIPTION_STATUS = {
  extracted: { label: 'بانتظار المراجعة', cls: 'bg-state-warning-subtle text-state-warning', icon: 'rate_review' },
  confirmed: { label: 'مؤكدة', cls: 'bg-state-info-subtle text-state-info', icon: 'fact_check' },
  requested: { label: 'تم إرسال الطلبات', cls: 'bg-state-success-subtle text-state-success', icon: 'task_alt' }
};

const CONFIDENCE = {
  high: { label: 'قراءة واضحة', cls: 'bg-state-success-subtle text-state-success' },
  medium: { label: 'راجِع القراءة', cls: 'bg-state-warning-subtle text-state-warning' },
  low: { label: 'قراءة غير مؤكدة', cls: 'bg-error-container text-state-danger' }
};

const EMPTY_ROW = { name: '', strength: '', dosage: '', frequency: '', duration: '', quantity: 1, quantityUnit: '', notes: '', confidence: 'high', edited: true };

function StepHeader({ step }) {
  const steps = ['رفع الوصفة', 'مراجعة البيانات', 'إرسال الطلبات'];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="خطوات القراءة">
      {steps.map((label, index) => (
        <li key={label} className={'flex items-center gap-2 p-space-xs rounded-xl ' + (index === step ? 'bg-primary-container text-on-primary shadow-sm' : index < step ? 'bg-state-success-subtle text-state-success' : 'bg-surface-card text-text-muted')}>
          <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-label-md shrink-0">
            {index < step ? <Icon name="check" className="text-[18px]" /> : index + 1}
          </span>
          <span className="font-label-md text-label-md">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export default function PrescriptionReaderPage() {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState(null);
  const [record, setRecord] = useState(null);      // stored prescription
  const [rows, setRows] = useState([]);            // editable medicines
  const [confirming, setConfirming] = useState(false);
  const [rowErrors, setRowErrors] = useState({});
  const [selected, setSelected] = useState({});
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState({});      // index → { state, id, message }

  const history = useAsync(async () => toList(await api.prescriptions.mine()), []);

  const step = !record && !rows.length ? 0 : record && record.status !== 'extracted' ? 2 : 1;

  const reset = () => {
    setFile(null); setRecord(null); setRows([]); setReadError(null);
    setRowErrors({}); setSelected({}); setResults({});
  };

  /* ---- Feature 1: read ------------------------------------------- */

  const read = async () => {
    if (!file) return setReadError({ message: 'اختر صورة الوصفة أولاً.' });
    setReading(true);
    setReadError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await api.prescriptions.read(form);
      const prescription = response.prescription;
      setRecord(prescription);
      setRows(prescription.medications.map((m) => ({ ...m, quantity: m.quantity || 1, edited: false })));
      notifications.add({
        type: 'prescription',
        title: 'تمت قراءة الوصفة',
        message: prescription.medications.length
          ? 'استُخرج ' + prescription.medications.length + ' دواء. راجع البيانات قبل التأكيد.'
          : 'لم يتم العثور على أدوية في الصورة.',
        ref: prescription.id
      });
      history.reload();
    } catch (error) {
      setReadError(error);
    } finally {
      setReading(false);
    }
  };

  const startManual = () => {
    setReadError(null);
    setRecord(null);
    setRows([{ ...EMPTY_ROW }]);
  };

  /* ---- review / edit --------------------------------------------- */

  const updateRow = (index, key, value) => {
    setRows((list) => list.map((row, i) => (i === index ? { ...row, [key]: value, edited: true } : row)));
    setRowErrors((errors) => ({ ...errors, [index]: undefined }));
  };

  const validateRows = () => {
    const errors = {};
    rows.forEach((row, index) => {
      const quantity = Number(row.quantity);
      if (String(row.name).trim().length < 2) errors[index] = 'اسم الدواء مطلوب.';
      else if (!Number.isInteger(quantity) || quantity < 1) errors[index] = 'أدخل كمية صحيحة.';
    });
    setRowErrors(errors);
    return !Object.keys(errors).length;
  };

  const confirm = async () => {
    if (!rows.length) return toast('أضف دواءً واحداً على الأقل.');
    if (!validateRows()) return toast('راجع الحقول المظللة قبل التأكيد.');
    setConfirming(true);
    const medications = rows.map((row) => ({ ...row, quantity: Number(row.quantity) }));
    try {
      const response = record
        ? await api.prescriptions.confirm(record.id, medications)
        : await api.prescriptions.createManual(medications, file ? file.name : '');
      setRecord(response.prescription);
      setRows(response.prescription.medications);
      setSelected(Object.fromEntries(response.prescription.medications.map((_, i) => [i, true])));
      toast('تم تأكيد بيانات الوصفة وحفظها.');
      history.reload();
    } catch (error) {
      toast(error.message);
    } finally {
      setConfirming(false);
    }
  };

  /* ---- Feature 2: send as drug requests --------------------------- */

  const sendRequests = async () => {
    const indexes = rows.map((_, i) => i).filter((i) => selected[i] && !(results[i] && results[i].state === 'sent'));
    if (!indexes.length) return toast('اختر دواءً واحداً على الأقل.');
    setSending(true);
    const created = [];
    for (const index of indexes) {
      const med = rows[index];
      setResults((r) => ({ ...r, [index]: { state: 'sending' } }));
      const payload = new FormData();
      payload.append('medicineName', [med.name, med.strength].filter(Boolean).join(' '));
      payload.append('quantity', String(med.quantity));
      payload.append('notes', [
        med.dosage && 'الجرعة: ' + med.dosage,
        med.frequency && 'التكرار: ' + med.frequency,
        med.duration && 'المدة: ' + med.duration,
        med.notes,
        'من وصفة مقروءة عبر قارئ الوصفات الذكي (' + record.id + ')'
      ].filter(Boolean).join(' | ').slice(0, 1000));
      if (file) payload.append('prescription', file);
      try {
        const response = await api.drugRequests.create(payload);
        const id = pick(toItem(response) || {}, 'id', 'requestId', 'drugRequestId');
        created.push({ id: id ?? '', medicineName: med.name, quantity: med.quantity });
        setResults((r) => ({ ...r, [index]: { state: 'sent', id } }));
      } catch (error) {
        setResults((r) => ({ ...r, [index]: { state: 'failed', message: error.status === 403 ? 'طلب الأدوية متاح لحسابات المرضى فقط.' : error.message } }));
      }
    }

    const linkable = created.filter((c) => c.id !== '');
    if (linkable.length) {
      try {
        const response = await api.prescriptions.link(record.id, linkable);
        setRecord(response.prescription);
        notifications.add({
          type: 'drug_submitted',
          title: 'تم إرسال طلبات الوصفة',
          message: 'أُرسل ' + linkable.length + ' طلب دواء من الوصفة المقروءة.',
          ref: record.id
        });
        history.reload();
      } catch (error) {
        toast('أُرسلت الطلبات لكن تعذّر ربطها بالوصفة: ' + error.message);
      }
    }
    setSending(false);
  };

  const aiUnavailable = readError && readError.payload && readError.payload.code === 'ai_not_configured';

  return (
    <>
      <PageHeader title="قارئ الوصفات الذكي" subtitle="صوّر وصفتك ودع الذكاء الاصطناعي يستخرج الأدوية والجرعات" />
      <PageBody>
        <RoleGate allow={['Patient', 'Donor']} message="قارئ الوصفات متاح لحسابات المرضى">
          <StepHeader step={step} />

          {/* Step 1 — upload */}
          {step === 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-lg">
              <Card className="lg:col-span-3">
                <CardTitle icon="document_scanner">ارفع صورة الوصفة</CardTitle>
                <PrescriptionUpload file={file} onChange={(f) => { setFile(f); setReadError(null); }} label="صورة أو ملف الوصفة" optional={false} />
                {readError ? (
                  <div className={'p-space-sm rounded-xl flex items-start gap-2 font-label-md text-label-md ' + (aiUnavailable ? 'bg-state-warning-subtle text-state-warning' : 'bg-state-danger-subtle text-state-danger')} role="alert">
                    <Icon name={aiUnavailable ? 'info' : 'error'} className="text-[20px]" />
                    <span>{readError.message}</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-space-xs">
                  <Button icon="auto_awesome" busy={reading} busyLabel="جارٍ قراءة الوصفة…" onClick={read} disabled={!file}>قراءة الوصفة</Button>
                  <Button tone="soft" icon="edit_note" onClick={startManual}>إدخال الأدوية يدوياً</Button>
                </div>
                {reading ? (
                  <p className="font-body-sm text-body-sm text-text-muted">قد تستغرق قراءة الوصفات المكتوبة بخط اليد حتى دقيقة.</p>
                ) : null}
              </Card>
              <Card className="lg:col-span-2">
                <CardTitle icon="tips_and_updates">لقراءة أدق</CardTitle>
                <ul className="flex flex-col gap-space-xs font-body-md text-body-md text-text-body">
                  {[
                    ['light_mode', 'صوّر الوصفة في إضاءة جيدة ومن دون ظلال.'],
                    ['crop_free', 'اجعل الوصفة كاملة داخل الصورة ومستقيمة.'],
                    ['blur_off', 'تأكد أن الخط واضح وغير مهتز.'],
                    ['fact_check', 'ستراجع كل دواء وتعدّله قبل إرسال أي طلب.']
                  ].map(([icon, text]) => (
                    <li key={icon} className="flex items-start gap-2"><Icon name={icon} className="text-text-primary text-[20px]" />{text}</li>
                  ))}
                </ul>
                <p className="font-body-sm text-body-sm text-text-muted p-space-sm rounded-xl bg-surface-subtle">
                  القارئ الآلي يساعد في نسخ الوصفة فقط ولا يقدّم استشارة طبية. اعتمد دائماً على تعليمات طبيبك والصيدلي.
                </p>
              </Card>
            </div>
          ) : null}

          {/* Step 2 — review & edit */}
          {step === 1 ? (
            <Card>
              <CardTitle
                icon="rate_review"
                count={rows.length}
                actions={<Button tone="ghost" icon="restart_alt" onClick={reset}>البدء من جديد</Button>}
              >
                راجع الأدوية المستخرجة
              </CardTitle>

              {record && record.extracted ? (
                <div className="flex flex-wrap gap-space-xs font-body-sm text-body-sm text-text-muted">
                  {record.extracted.doctorName ? <span className="px-2 py-1 rounded-lg bg-surface-subtle">الطبيب: {record.extracted.doctorName}</span> : null}
                  {record.extracted.patientName ? <span className="px-2 py-1 rounded-lg bg-surface-subtle">المريض: {record.extracted.patientName}</span> : null}
                  {record.extracted.prescriptionDate ? <span className="px-2 py-1 rounded-lg bg-surface-subtle">تاريخ الوصفة: {record.extracted.prescriptionDate}</span> : null}
                </div>
              ) : null}

              {record && record.extracted && (!record.extracted.isPrescription || record.extracted.readability === 'unreadable') ? (
                <div className="p-space-sm rounded-xl bg-state-warning-subtle text-state-warning flex items-center gap-2 font-label-md text-label-md">
                  <Icon name="warning" />
                  {!record.extracted.isPrescription ? 'لا تبدو الصورة وصفة طبية.' : 'الصورة غير واضحة بما يكفي للقراءة.'} يمكنك إضافة الأدوية يدوياً أو رفع صورة أوضح.
                </div>
              ) : null}

              {record && record.extracted && record.extracted.warnings.length ? (
                <ul className="flex flex-col gap-1 p-space-sm rounded-xl bg-state-warning-subtle text-state-warning font-body-sm text-body-sm">
                  {record.extracted.warnings.map((w, i) => <li key={i} className="flex items-start gap-1"><Icon name="info" className="text-[16px] mt-0.5" />{w}</li>)}
                </ul>
              ) : null}

              <div className="flex flex-col gap-space-sm">
                {rows.map((row, index) => (
                  <div key={index} className={'p-space-sm rounded-xl border ' + (rowErrors[index] ? 'border-state-danger/50 bg-state-danger-subtle/40' : 'border-border-soft bg-surface-subtle')}>
                    <div className="flex items-center justify-between gap-2 mb-space-xs">
                      <span className="font-label-md text-label-md text-text-heading flex items-center gap-2">
                        دواء {index + 1}
                        {!row.edited && CONFIDENCE[row.confidence] ? <Badge className={CONFIDENCE[row.confidence].cls}>{CONFIDENCE[row.confidence].label}</Badge> : null}
                        {row.edited ? <Badge className="bg-surface-container-high text-text-primary" icon="edit">معدّل</Badge> : null}
                      </span>
                      <button type="button" aria-label={'حذف دواء ' + (index + 1)} onClick={() => setRows(rows.filter((_, i) => i !== index))}
                        className="w-8 h-8 rounded-lg text-state-danger hover:bg-state-danger-subtle flex items-center justify-center">
                        <Icon name="delete" className="text-[20px]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-space-xs">
                      <label className="col-span-2 flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">اسم الدواء *</span>
                        <input className={inputClass} dir="auto" value={row.name} onChange={(e) => updateRow(index, 'name', e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">التركيز</span>
                        <input className={inputClass} dir="auto" value={row.strength} placeholder="500mg" onChange={(e) => updateRow(index, 'strength', e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">الجرعة</span>
                        <input className={inputClass} value={row.dosage} placeholder="قرص واحد" onChange={(e) => updateRow(index, 'dosage', e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">التكرار</span>
                        <input className={inputClass} value={row.frequency} placeholder="3 مرات يومياً" onChange={(e) => updateRow(index, 'frequency', e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">المدة</span>
                        <input className={inputClass} value={row.duration} placeholder="7 أيام" onChange={(e) => updateRow(index, 'duration', e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">الكمية *</span>
                        <input className={inputClass} type="number" min="1" value={row.quantity} onChange={(e) => updateRow(index, 'quantity', e.target.value)} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">الوحدة</span>
                        <input className={inputClass} value={row.quantityUnit} placeholder="علبة" onChange={(e) => updateRow(index, 'quantityUnit', e.target.value)} />
                      </label>
                      <label className="col-span-2 md:col-span-4 flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-text-muted">ملاحظات</span>
                        <input className={inputClass} value={row.notes} onChange={(e) => updateRow(index, 'notes', e.target.value)} />
                      </label>
                    </div>
                    {rowErrors[index] ? <p className="font-label-sm text-label-sm text-state-danger mt-1" role="alert">{rowErrors[index]}</p> : null}
                  </div>
                ))}
                {!rows.length ? (
                  <p className="font-body-md text-body-md text-text-muted text-center py-space-md">لا توجد أدوية. أضف دواءً يدوياً.</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-space-xs">
                <Button tone="soft" icon="add" onClick={() => setRows([...rows, { ...EMPTY_ROW }])}>إضافة دواء</Button>
                <Button icon="fact_check" busy={confirming} busyLabel="جارٍ الحفظ…" onClick={confirm} disabled={!rows.length}>تأكيد بيانات الوصفة</Button>
              </div>
            </Card>
          ) : null}

          {/* Step 3 — connect with drug requests */}
          {step === 2 ? (
            <Card>
              <CardTitle
                icon="send"
                actions={<>
                  <Badge className={PRESCRIPTION_STATUS[record.status].cls + ' text-label-md py-1 px-3'} icon={PRESCRIPTION_STATUS[record.status].icon}>{PRESCRIPTION_STATUS[record.status].label}</Badge>
                  <Button tone="ghost" icon="document_scanner" onClick={reset}>قراءة وصفة أخرى</Button>
                </>}
              >
                إرسال الأدوية كطلبات
              </CardTitle>
              <p className="font-body-md text-body-md text-text-muted">
                اختر الأدوية التي تريد طلبها. سيُنشأ طلب دواء منفصل لكل دواء{file ? ' مع إرفاق صورة الوصفة' : ''}، ويمكنك متابعتها من صفحة طلبات الأدوية.
              </p>
              <div className="flex flex-col gap-space-xs">
                {rows.map((row, index) => {
                  const result = results[index];
                  return (
                    <label key={index} className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-subtle cursor-pointer">
                      <input type="checkbox" checked={!!selected[index]} disabled={sending || (result && result.state === 'sent')}
                        onChange={(e) => setSelected({ ...selected, [index]: e.target.checked })} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-label-lg text-label-lg text-text-heading" dir="auto">{row.name} {row.strength ? <span className="text-text-muted font-body-sm">{row.strength}</span> : null}</span>
                        <span className="font-body-sm text-body-sm text-text-muted">
                          الكمية: {row.quantity} {row.quantityUnit} {[row.dosage, row.frequency, row.duration].filter(Boolean).length ? '· ' + [row.dosage, row.frequency, row.duration].filter(Boolean).join(' · ') : ''}
                        </span>
                        {result && result.state === 'failed' ? <span className="font-label-sm text-label-sm text-state-danger">{result.message}</span> : null}
                      </div>
                      {result && result.state === 'sending' ? <Badge className="bg-state-info-subtle text-state-info" icon="progress_activity">جارٍ الإرسال</Badge> : null}
                      {result && result.state === 'sent' ? (
                        result.id != null ? (
                          <Link href={'/drug-requests/' + encodeURIComponent(result.id)} className="shrink-0"><Badge className="bg-state-success-subtle text-state-success" icon="check_circle">طلب #{result.id}</Badge></Link>
                        ) : <Badge className="bg-state-success-subtle text-state-success" icon="check_circle">تم الإرسال</Badge>
                      ) : null}
                      {result && result.state === 'failed' ? <Badge className="bg-error-container text-state-danger" icon="error">فشل</Badge> : null}
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-space-xs">
                <Button icon="send" busy={sending} busyLabel="جارٍ إرسال الطلبات…" onClick={sendRequests}>إرسال الطلبات المحددة</Button>
                {record.status === 'requested' ? <Link href="/drug-requests" className="inline-flex items-center gap-1 px-space-md py-2.5 rounded-lg bg-surface-container-low text-text-primary font-label-lg text-label-lg">متابعة الطلبات <Icon name="arrow_back" className="text-[18px]" /></Link> : null}
              </div>
            </Card>
          ) : null}

          {/* History */}
          <Card>
            <CardTitle icon="history" count={(history.data || []).length}>وصفاتي السابقة</CardTitle>
            <AsyncBlock state={history} skeleton={2} empty={{ when: !(history.data || []).length, icon: 'receipt_long', title: 'لم تقرأ أي وصفة بعد' }}>
              <div className="flex flex-col gap-space-xs">
                {(history.data || []).map((p) => {
                  const status = PRESCRIPTION_STATUS[p.status] || PRESCRIPTION_STATUS.extracted;
                  return (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <span className="w-11 h-11 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center shrink-0">
                          <Icon name={p.source === 'manual' ? 'edit_note' : 'document_scanner'} />
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-lg text-label-lg text-text-heading truncate">
                            {p.medications.map((m) => m.name).join('، ') || 'بدون أدوية'}
                          </span>
                          <span className="font-body-sm text-body-sm text-text-muted">
                            {formatDateTime(p.createdAt)} · {p.medications.length} دواء{p.drugRequestIds && p.drugRequestIds.length ? ' · ' + p.drugRequestIds.length + ' طلب' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-2xs">
                        <Badge className={status.cls} icon={status.icon}>{status.label}</Badge>
                        {p.status !== 'requested' ? (
                          <Button tone="soft" className="!py-1.5" onClick={() => {
                            setFile(null);
                            setRecord(p);
                            setRows(p.medications.map((m) => ({ ...m, edited: p.status !== 'extracted' })));
                            setSelected(Object.fromEntries(p.medications.map((_, i) => [i, true])));
                            setResults({});
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}>متابعة</Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AsyncBlock>
          </Card>
        </RoleGate>
      </PageBody>
    </>
  );
}
