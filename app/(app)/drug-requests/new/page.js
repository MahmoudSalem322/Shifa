'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, fieldErrors, pick, toItem } from '@/lib/api';
import { notifications } from '@/lib/notifications';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { PrescriptionUpload } from '@/components/prescription-upload';
import { Button, ButtonLink, Card, CardTitle, Field, Icon, inputClass } from '@/components/ui';

/* Module 5 · Feature 1 — create a drug request.
   POST /api/drugrequests (multipart: medicineName, quantity, notes,
   prescription). The .NET API stores the prescription file and hands back
   the request, whose id is the reference shown on the success screen. */

const MAX_NOTES = 500;

export default function NewDrugRequestPage() {
  const [form, setForm] = useState({ medicineName: '', quantity: '1', notes: '' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [created, setCreated] = useState(null);

  /* Prefilled from "طلب الدواء" buttons on the medicine pages. */
  useEffect(() => {
    const medicine = new URLSearchParams(window.location.search).get('medicine');
    if (medicine) setForm((f) => ({ ...f, medicineName: medicine }));
  }, []);

  const set = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const validateForm = () => {
    const next = {};
    const name = form.medicineName.trim();
    const quantity = Number(form.quantity);
    if (!name) next.medicineName = 'اسم الدواء مطلوب.';
    else if (name.length < 2) next.medicineName = 'اسم الدواء قصير جداً.';
    else if (name.length > 200) next.medicineName = 'اسم الدواء طويل جداً.';
    if (!form.quantity) next.quantity = 'الكمية مطلوبة.';
    else if (!Number.isInteger(quantity) || quantity < 1) next.quantity = 'الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر.';
    else if (quantity > 1000) next.quantity = 'الكمية كبيرة جداً لطلب واحد.';
    if (form.notes.length > MAX_NOTES) next.notes = 'الملاحظات يجب ألا تتجاوز ' + MAX_NOTES + ' حرف.';
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validateForm()) return;

    const payload = new FormData();
    payload.append('medicineName', form.medicineName.trim());
    payload.append('quantity', String(Number(form.quantity)));
    payload.append('notes', form.notes.trim());
    if (file) payload.append('prescription', file);

    setBusy(true);
    try {
      const response = await api.drugRequests.create(payload);
      const item = toItem(response) || {};
      const id = pick(item, 'id', 'requestId', 'drugRequestId');
      const record = {
        id,
        medicineName: form.medicineName.trim(),
        quantity: Number(form.quantity),
        uploaded: !!file,
        fileRef: pick(item, 'prescriptionPath', 'prescriptionUrl', 'prescriptionFileName') || (file ? file.name : '')
      };
      setCreated(record);
      notifications.add({
        type: 'drug_submitted',
        title: 'تم إرسال طلب الدواء',
        message: 'تم استلام طلبك لـ ' + record.medicineName + (id != null ? ' (رقم الطلب #' + id + ')' : '') + '.',
        ref: 'drug_' + id
      });
    } catch (error) {
      const fields = fieldErrors(error);
      const mapped = {};
      for (const [key, text] of Object.entries(fields)) {
        const k = key.toLowerCase();
        if (k.includes('medicine')) mapped.medicineName = text;
        else if (k.includes('quantity')) mapped.quantity = text;
        else if (k.includes('note')) mapped.notes = text;
        else if (k.includes('prescription') || k.includes('file')) mapped.prescription = text;
      }
      if (error.status === 413) mapped.prescription = 'حجم الملف أكبر مما يقبله الخادم.';
      if (error.status === 415) mapped.prescription = 'رفض الخادم نوع الملف.';
      setErrors(mapped);
      setServerError(error.status === 403 ? 'طلب الأدوية متاح لحسابات المرضى فقط.' : error.message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <>
        <PageHeader title="طلب دواء جديد" subtitle="تم إرسال الطلب" />
        <PageBody narrow>
          <Card className="items-center text-center py-space-2xl">
            <span className="w-20 h-20 rounded-full bg-state-success-subtle text-state-success flex items-center justify-center">
              <Icon name="task_alt" className="text-[48px]" />
            </span>
            <h1 className="font-headline-xl text-headline-xl text-text-heading">تم إرسال طلبك بنجاح</h1>
            <p className="font-body-lg text-body-lg text-text-muted max-w-md">
              طلبك لـ <strong className="text-text-body">{created.medicineName}</strong> (الكمية: {created.quantity}) قيد المعالجة الآن، وستجد حالته في صفحة طلباتي.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm w-full max-w-md text-right">
              <div className="p-space-sm rounded-xl bg-surface-subtle">
                <span className="font-label-sm text-label-sm text-text-muted block">رقم الطلب</span>
                <span className="font-headline-md text-headline-md text-text-heading" dir="ltr">{created.id != null ? '#' + created.id : '—'}</span>
              </div>
              <div className="p-space-sm rounded-xl bg-surface-subtle">
                <span className="font-label-sm text-label-sm text-text-muted block">الوصفة الطبية</span>
                <span className={'font-label-lg text-label-lg ' + (created.uploaded ? 'text-state-success' : 'text-text-muted')}>
                  {created.uploaded ? 'تم رفع الوصفة بنجاح' : 'لم تُرفق وصفة'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-space-xs">
              {created.id != null ? (
                <ButtonLink href={'/drug-requests/' + encodeURIComponent(created.id)} icon="visibility">عرض تفاصيل الطلب</ButtonLink>
              ) : null}
              <ButtonLink href="/drug-requests" tone="soft" icon="list_alt">كل طلباتي</ButtonLink>
              <Button tone="ghost" icon="add" onClick={() => { setCreated(null); setForm({ medicineName: '', quantity: '1', notes: '' }); setFile(null); }}>
                طلب دواء آخر
              </Button>
            </div>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="طلب دواء جديد" subtitle="اطلب الدواء الذي تحتاجه وأرفق وصفتك الطبية" />
      <PageBody narrow>
        <RoleGate allow={['Patient', 'Donor']} message="طلب الأدوية متاح لحسابات المرضى">
          <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
            <Link href="/drug-requests" className="hover:text-text-primary">طلبات الأدوية</Link>
            <Icon name="chevron_left" className="text-[18px]" />
            <span className="text-text-body">طلب جديد</span>
          </nav>

          <Card>
            <CardTitle icon="medication">بيانات الطلب</CardTitle>
            <form className="flex flex-col gap-space-md" onSubmit={submit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <Field label="اسم الدواء" htmlFor="dr-medicine" required error={errors.medicineName} className="md:col-span-2">
                  <input id="dr-medicine" className={inputClass} placeholder="مثال: إنسولين لانتوس 100 وحدة" value={form.medicineName} onChange={set('medicineName')}
                    aria-invalid={!!errors.medicineName} maxLength={200} />
                </Field>
                <Field label="الكمية المطلوبة" htmlFor="dr-quantity" required error={errors.quantity}>
                  <input id="dr-quantity" type="number" min="1" max="1000" step="1" className={inputClass} value={form.quantity} onChange={set('quantity')}
                    aria-invalid={!!errors.quantity} />
                </Field>
              </div>

              <Field label="ملاحظات إضافية" htmlFor="dr-notes" error={errors.notes} hint={form.notes.length + ' / ' + MAX_NOTES}>
                <textarea id="dr-notes" rows={3} className={inputClass + ' resize-none'} value={form.notes} onChange={set('notes')}
                  placeholder="مثال: الجرعة، الشكل الدوائي المفضل، أو أي بديل مقبول" aria-invalid={!!errors.notes} />
              </Field>

              <PrescriptionUpload file={file} onChange={(f) => { setFile(f); setErrors({ ...errors, prescription: '' }); }} error={errors.prescription} />

              <div className="p-space-sm rounded-xl bg-state-info-subtle text-state-info flex items-start gap-2 font-body-sm text-body-sm">
                <Icon name="lock" className="text-[20px]" />
                <span>تُرفع الوصفة مباشرة إلى خادم شفاء وتُحفظ مرتبطة بطلبك، ولا يطّلع عليها إلا الجهة التي تعالج الطلب.</span>
              </div>

              {serverError ? (
                <div className="p-space-sm rounded-xl bg-state-danger-subtle text-state-danger flex items-center gap-2 font-label-md text-label-md" role="alert">
                  <Icon name="error" className="text-[20px]" /> {serverError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-space-xs">
                <Button type="submit" busy={busy} busyLabel={file ? 'جارٍ رفع الوصفة وإرسال الطلب…' : 'جارٍ الإرسال…'} icon="send">إرسال الطلب</Button>
                <ButtonLink href="/prescription-reader" tone="soft" icon="document_scanner">اقرأ الوصفة بالذكاء الاصطناعي</ButtonLink>
              </div>
            </form>
          </Card>
        </RoleGate>
      </PageBody>
    </>
  );
}
