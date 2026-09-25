'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, toItem, toList } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { notifications } from '@/lib/notifications';
import { drugRequestStatus, formatDateTime, normalizeDrugRequest } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { applyMatchStatus } from '@/lib/matching';
import { MatchingDonations, RequestMatches } from '@/components/matches';
import { PrescriptionUpload } from '@/components/prescription-upload';
import { useToast } from '@/components/toast';
import { AsyncBlock, Badge, Button, ButtonLink, Card, CardTitle, Field, Icon, InfoRow, inputClass, Modal } from '@/components/ui';

/* Module 5 · Feature 3 — "Create Request Details Page". */

const STEPS = [
  { key: 'submitted', label: 'تم إرسال الطلب', icon: 'send' },
  { key: 'review', label: 'قيد المراجعة', icon: 'manage_search' },
  { key: 'matched', label: 'تم توفير الدواء', icon: 'inventory_2' },
  { key: 'done', label: 'تم التسليم', icon: 'task_alt' }
];

function stepIndex(status) {
  const key = String(status || '').toLowerCase();
  if (/fulfilled|completed|delivered/.test(key)) return 3;
  if (/matched|found|approved|ready/.test(key)) return 2;
  if (/review|processing/.test(key)) return 1;
  return 0;
}

const isOpen = (status) => !/fulfilled|completed|delivered|rejected|cancel/i.test(String(status || ''));

export default function DrugRequestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState(false);

  const state = useAsync(async () => {
    const [response, prescriptions, matchList] = await Promise.all([
      api.drugRequests.get(id),
      api.prescriptions.mine().catch(() => null),
      api.matches.list({ drugRequestId: id }).catch(() => null)
    ]);
    const matches = (matchList && matchList.matches) || [];
    /* Module 9: a request linked to a donation shows as matched / fulfilled. */
    const request = applyMatchStatus(normalizeDrugRequest(toItem(response)), matches);
    const linked = prescriptions
      ? toList(prescriptions).find((p) => (p.drugRequestIds || []).map(String).includes(String(id)))
      : null;
    return { request, raw: toItem(response), linked, matches };
  }, [id]);

  const request = state.data && state.data.request;
  const matches = (state.data && state.data.matches) || [];
  const activeMatches = matches.filter((m) => m.status === 'reserved');

  /* Offer "view prescription" when the record says a file is attached, or
     when it says nothing either way (the API documents no schema). */
  const raw = (state.data && state.data.raw) || {};
  const prescriptionKnown = Object.keys(raw).some((key) => /^(prescription(path|url|filename)|hasprescription)$/i.test(key));
  const showPrescription = !!request && (request.hasPrescription || !prescriptionKnown);

  const viewPrescription = async () => {
    setBusy('file');
    /* Open the tab synchronously so popup blockers allow it. */
    const tab = window.open('', '_blank');
    try {
      const url = await api.drugRequests.prescriptionBlobUrl(id);
      if (tab) tab.location.href = url; else window.location.href = url;
      /* The new tab has loaded it by then; free the memory. */
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      if (tab) tab.close();
      toast(error.status === 404 ? 'لا توجد وصفة مرفقة بهذا الطلب.' : error.message);
    } finally {
      setBusy('');
    }
  };

  const cancel = async () => {
    if (!window.confirm('هل تريد إلغاء هذا الطلب؟ لا يمكن التراجع عن الإلغاء.')) return;
    setBusy('cancel');
    try {
      /* Give reserved donation units back before the request disappears. */
      for (const match of activeMatches) {
        await api.matches.cancel(match.id, 'أُلغي طلب الدواء');
      }
      await api.drugRequests.remove(id);
      notifications.add({ type: 'drug_cancelled', title: 'تم إلغاء طلب الدواء', message: 'تم إلغاء طلبك لـ ' + request.medicineName + '.', ref: 'drug_' + id });
      toast('تم إلغاء الطلب.');
      router.push('/drug-requests');
    } catch (error) {
      toast(error.message);
      setBusy('');
      /* Some matches may already be released; show the real state. */
      state.reload();
    }
  };

  const status = request ? drugRequestStatus(request.status) : null;
  const current = request ? stepIndex(request.status) : 0;
  const rejected = request && /rejected|cancel/i.test(request.status);

  return (
    <>
      <PageHeader title="تفاصيل طلب الدواء" subtitle={request ? 'طلب رقم #' + request.id : ''} />
      <PageBody narrow>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href="/drug-requests" className="hover:text-text-primary">طلبات الأدوية</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body" dir="ltr">#{id}</span>
        </nav>

        <AsyncBlock state={state} empty={{ when: !request, title: 'لم يتم العثور على الطلب' }}>
          {request ? (
            <>
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                  <div className="flex items-start gap-space-sm">
                    <span className="w-14 h-14 rounded-xl bg-state-success-subtle text-state-success flex items-center justify-center shrink-0">
                      <Icon name="medication" className="text-[30px]" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h1 className="font-headline-xl text-headline-xl text-text-heading">{request.medicineName}</h1>
                      <span className="font-body-md text-body-md text-text-muted" dir="ltr">#{request.id}</span>
                    </div>
                  </div>
                  <Badge className={status.cls + ' text-label-md py-1 px-3'} icon={status.icon}>{status.label}</Badge>
                </div>

                {/* Progress */}
                {rejected ? (
                  <div className="p-space-sm rounded-xl bg-state-danger-subtle text-state-danger flex items-center gap-2 font-label-md text-label-md">
                    <Icon name="block" /> {status.label} — تواصل مع الصيدلية أو أرسل طلباً جديداً إذا ما زلت بحاجة إلى الدواء.
                  </div>
                ) : (
                  <ol className="grid grid-cols-4 gap-2" aria-label="مراحل الطلب">
                    {STEPS.map((step, index) => (
                      <li key={step.key} className="flex flex-col items-center gap-1 text-center">
                        <span className={
                          'w-10 h-10 rounded-full flex items-center justify-center ' +
                          (index <= current ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-text-muted')
                        }>
                          <Icon name={step.icon} className="text-[20px]" />
                        </span>
                        <span className={'font-label-sm text-label-sm ' + (index <= current ? 'text-text-heading' : 'text-text-muted')}>{step.label}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <InfoRow icon="tag" label="رقم الطلب"><span dir="ltr">#{request.id}</span></InfoRow>
                  <InfoRow icon="numbers" label="الكمية المطلوبة">{String(request.quantity || '—')}</InfoRow>
                  <InfoRow icon="event" label="تاريخ الطلب">{formatDateTime(request.createdAt)}</InfoRow>
                  <InfoRow icon="update" label="آخر تحديث">{formatDateTime(request.updatedAt) || formatDateTime(request.createdAt)}</InfoRow>
                </div>

                {request.notes ? (
                  <div className="p-space-sm rounded-xl bg-surface-subtle">
                    <span className="font-label-sm text-label-sm text-text-muted block mb-1">ملاحظات</span>
                    <p className="font-body-md text-body-md text-text-body whitespace-pre-line">{request.notes}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-space-xs">
                  {showPrescription ? (
                    <Button tone="soft" icon="description" busy={busy === 'file'} busyLabel="جارٍ فتح الوصفة…" onClick={viewPrescription}>
                      عرض الوصفة المرفقة
                    </Button>
                  ) : null}
                  {isOpen(request.status) ? (
                    <>
                      {activeMatches.length ? null : <Button tone="soft" icon="edit" onClick={() => setEditing(true)}>تعديل الطلب</Button>}
                      <Button tone="danger" icon="cancel" busy={busy === 'cancel'} busyLabel="جارٍ الإلغاء…" onClick={cancel}>إلغاء الطلب</Button>
                    </>
                  ) : null}
                </div>
              </Card>

              {matches.length ? (
                <Card>
                  <CardTitle icon="inventory_2" count={matches.length}>التبرعات المرتبطة بهذا الطلب</CardTitle>
                  <RequestMatches matches={matches} />
                </Card>
              ) : null}

              {isOpen(request.status) ? (
                <Card>
                  <MatchingDonations request={request} onLinked={() => state.reload()} />
                </Card>
              ) : null}

              {state.data.linked ? (
                <Card>
                  <CardTitle icon="document_scanner">الوصفة المقروءة المرتبطة</CardTitle>
                  <p className="font-body-md text-body-md text-text-muted">
                    أُنشئ هذا الطلب من وصفة قرأها قارئ الوصفات الذكي بتاريخ {formatDateTime(state.data.linked.createdAt)}.
                  </p>
                  <div className="flex flex-col gap-space-2xs">
                    {(state.data.linked.medications || []).map((m, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 p-space-xs rounded-lg bg-surface-subtle">
                        <span className="font-label-lg text-label-lg text-text-heading">{m.name} {m.strength ? <span className="text-text-muted font-body-sm">({m.strength})</span> : null}</span>
                        <span className="font-body-sm text-body-sm text-text-muted">{[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}</span>
                      </div>
                    ))}
                  </div>
                  <ButtonLink href="/prescription-reader" tone="soft" icon="history" className="self-start">سجل الوصفات</ButtonLink>
                </Card>
              ) : null}

              <EditRequestModal
                open={editing}
                request={request}
                onClose={() => setEditing(false)}
                onSaved={() => { setEditing(false); toast('تم حفظ التعديلات.'); state.reload(); }}
              />
            </>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}

/* PUT /api/drugrequests/{id} — same multipart shape as create. */
function EditRequestModal({ open, request, onClose, onSaved }) {
  const [form, setForm] = useState({ medicineName: request.medicineName, quantity: String(request.quantity || 1), notes: request.notes });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* Each opening starts from the request as it is now. */
  useEffect(() => {
    if (!open) return;
    setForm({ medicineName: request.medicineName, quantity: String(request.quantity || 1), notes: request.notes });
    setFile(null);
    setError('');
  }, [open, request]);

  const save = async (event) => {
    event.preventDefault();
    const quantity = Number(form.quantity);
    if (form.medicineName.trim().length < 2) return setError('اسم الدواء مطلوب.');
    if (!Number.isInteger(quantity) || quantity < 1) return setError('الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر.');
    const payload = new FormData();
    payload.append('medicineName', form.medicineName.trim());
    payload.append('quantity', String(quantity));
    payload.append('notes', form.notes.trim());
    if (file) payload.append('prescription', file);
    setBusy(true);
    setError('');
    try {
      await api.drugRequests.update(request.id, payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="تعديل طلب الدواء" eyebrow={'طلب #' + request.id}>
      <form className="flex flex-col gap-space-sm" onSubmit={save} noValidate>
        <Field label="اسم الدواء" htmlFor="edit-medicine" required>
          <input id="edit-medicine" className={inputClass} value={form.medicineName} onChange={(e) => setForm({ ...form, medicineName: e.target.value })} />
        </Field>
        <Field label="الكمية" htmlFor="edit-quantity" required>
          <input id="edit-quantity" type="number" min="1" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </Field>
        <Field label="ملاحظات" htmlFor="edit-notes">
          <textarea id="edit-notes" rows={3} className={inputClass + ' resize-none'} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <PrescriptionUpload file={file} onChange={setFile} label="استبدال الوصفة" />
        {error ? <p className="font-label-md text-label-md text-state-danger" role="alert">{error}</p> : null}
        <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-border-soft">
          <Button tone="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" busy={busy} busyLabel="جارٍ الحفظ…" icon="save">حفظ التعديلات</Button>
        </div>
      </form>
    </Modal>
  );
}
