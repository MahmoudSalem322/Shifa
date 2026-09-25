'use client';

import { useState } from 'react';
import { api, fieldErrors, pick } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import {
  AdminBlock, DetailsModal, PAGE_SIZE, Pager, readItem, readPage, recordId, searchClass, selectClass, StatusBadge, statusOptions, useAdminAction
} from '@/components/admin-kit';
import { useToast } from '@/components/toast';
import { Button, Card, CardTitle, Field, Icon, inputClass, Modal } from '@/components/ui';

/* Admin · healthcare providers on the .NET API (hospitals, clinics,
   pharmacies, doctors): browse, add, edit, approve and delete
   (/api/admin/healthcare). */

const KINDS = [
  { value: '', label: 'كل الجهات' },
  { value: 'Facility', label: 'مراكز ومستشفيات' },
  { value: 'Pharmacy', label: 'صيدليات' },
  { value: 'Doctor', label: 'أطباء' }
];
const TYPES = ['Hospital', 'Clinic', 'Pharmacy', 'Doctor'];
const TYPE_AR = { Hospital: 'مستشفى', Clinic: 'عيادة / مركز', Pharmacy: 'صيدلية', Doctor: 'طبيب' };
const FIELDS = ['type', 'name', 'address', 'phone', 'email', 'specialization'];

function ProviderForm({ record, onClose, onSaved }) {
  const editing = record && record !== 'new';
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((key) => [key, editing ? String(pick(record, key) ?? '') : key === 'type' ? 'Hospital' : ''])));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return setError('أدخل الاسم.');
    setBusy(true);
    setError('');
    const payload = Object.fromEntries(FIELDS.map((key) => [key, form[key].trim() || null]));
    try {
      if (editing) await api.admin.healthcare.update(recordId(record), payload);
      else await api.admin.healthcare.create(payload);
      onSaved(editing ? 'تم حفظ التعديلات.' : 'تمت إضافة الجهة.');
    } catch (err) {
      setError(Object.values(fieldErrors(err)).join(' ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!record} onClose={onClose} title={editing ? 'تعديل جهة صحية' : 'إضافة جهة صحية'} wide>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-space-md" onSubmit={submit} noValidate>
        <Field label="النوع" htmlFor="hc-type" required>
          <input id="hc-type" list="hc-types" className={inputClass} value={form.type} onChange={set('type')} />
          <datalist id="hc-types">{TYPES.map((t) => <option key={t} value={t}>{TYPE_AR[t]}</option>)}</datalist>
        </Field>
        <Field label="الاسم" htmlFor="hc-name" required><input id="hc-name" className={inputClass} value={form.name} onChange={set('name')} /></Field>
        <Field label="العنوان" htmlFor="hc-address" className="md:col-span-2"><input id="hc-address" className={inputClass} value={form.address} onChange={set('address')} /></Field>
        <Field label="الهاتف" htmlFor="hc-phone"><input id="hc-phone" dir="ltr" className={inputClass + ' text-left'} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="البريد الإلكتروني" htmlFor="hc-email"><input id="hc-email" dir="ltr" className={inputClass + ' text-left'} value={form.email} onChange={set('email')} /></Field>
        <Field label="التخصص" htmlFor="hc-spec" hint="للأطباء والمراكز المتخصصة" className="md:col-span-2"><input id="hc-spec" className={inputClass} value={form.specialization} onChange={set('specialization')} /></Field>
        {error ? <p className="md:col-span-2 font-label-md text-label-md text-state-danger" role="alert">{error}</p> : null}
        <div className="md:col-span-2"><Button type="submit" icon="save" busy={busy} busyLabel="جارٍ الحفظ…">{editing ? 'حفظ التعديلات' : 'إضافة'}</Button></div>
      </form>
    </Modal>
  );
}

export default function AdminHealthcarePage() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const search = useDebounced(query);

  const state = useAsync(
    async () => readPage(await api.admin.healthcare.list({ search: search.trim(), kind, status, page, pageSize: PAGE_SIZE })),
    [search, kind, status, page]
  );
  const { busy, run } = useAdminAction(state.reload);
  const items = (state.data && state.data.items) || [];
  const statuses = statusOptions(items, ['Pending', 'Approved']);
  const filter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  /* The list may be a summary; edit from the full record. */
  const openEdit = async (item) => {
    try { setEditing({ ...item, ...readItem(await api.admin.healthcare.get(recordId(item))) }); } catch { setEditing(item); }
  };

  return (
    <>
      <PageHeader title="الجهات الصحية" subtitle="المستشفيات والمراكز والصيدليات والأطباء: إضافة وتعديل واعتماد وحذف" />
      <PageBody>
        <RoleGate allow={['Admin']} message="هذه الصفحة متاحة للإدارة فقط">
          <Card>
            <CardTitle icon="domain" count={state.data ? (state.data.total ?? items.length) : undefined} actions={
              <>
                <Button icon="add_business" onClick={() => setEditing('new')}>إضافة جهة</Button>
                <Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>
              </>
            }>
              الجهات
            </CardTitle>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs">
              <div className="relative">
                <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
                <input className={searchClass} placeholder="ابحث بالاسم أو العنوان" value={query} onChange={filter(setQuery)} aria-label="بحث" />
              </div>
              <select className={selectClass} value={kind} onChange={filter(setKind)} aria-label="الفئة">
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <select className={selectClass} value={status} onChange={filter(setStatus)} aria-label="الحالة">
                <option value="">كل الحالات</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <AdminBlock state={state} empty={{ when: !items.length, icon: 'domain_disabled', title: 'لا توجد جهات مطابقة' }}>
              <div className="flex flex-col gap-space-xs">
                {items.map((item) => {
                  const id = recordId(item);
                  const name = pick(item, 'name', 'fullName') || '—';
                  const itemStatus = pick(item, 'status', 'approvalStatus');
                  const approved = pick(item, 'isApproved', 'approved') === true || /approved|active/i.test(String(itemStatus || ''));
                  return (
                    <div key={(pick(item, 'kind') || '') + id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex flex-col min-w-0">
                        <span className="font-headline-sm text-headline-sm text-text-heading truncate">{name}</span>
                        <span className="font-body-sm text-body-sm text-text-muted truncate" dir="auto">
                          {[TYPE_AR[pick(item, 'type')] || pick(item, 'type', 'kind'), pick(item, 'specialization'), pick(item, 'address'), pick(item, 'phone')].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-2xs">
                        {itemStatus ? <StatusBadge value={itemStatus} /> : null}
                        {!approved ? (
                          <Button tone="soft" icon="verified" className="!py-1.5" busy={busy === 'ok' + id} busyLabel="…"
                            onClick={() => run('ok' + id, () => api.admin.healthcare.approve(id), { success: 'تم اعتماد الجهة.' })}>اعتماد</Button>
                        ) : null}
                        <Button tone="soft" icon="visibility" className="!py-1.5" onClick={() => setViewing(item)}>التفاصيل</Button>
                        <Button tone="soft" icon="edit" className="!py-1.5" onClick={() => openEdit(item)}>تعديل</Button>
                        <Button tone="danger" icon="delete" className="!py-1.5" busy={busy === 'del' + id} busyLabel="…"
                          onClick={() => run('del' + id, () => api.admin.healthcare.remove(id), { confirm: 'حذف ' + name + ' نهائياً؟', success: 'تم الحذف.' })}>حذف</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pager page={page} setPage={setPage} count={items.length} total={state.data && state.data.total} />
            </AdminBlock>
          </Card>

          <DetailsModal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? pick(viewing, 'name') || 'التفاصيل' : ''}
            recordKey={viewing ? recordId(viewing) : null} load={() => api.admin.healthcare.get(recordId(viewing))} />
          {editing ? (
            <ProviderForm key={editing === 'new' ? 'new' : recordId(editing)} record={editing} onClose={() => setEditing(null)}
              onSaved={(message) => { setEditing(null); state.reload(); toast(message); }} />
          ) : null}
        </RoleGate>
      </PageBody>
    </>
  );
}
