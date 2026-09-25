'use client';

import { useMemo, useState } from 'react';
import { api, fieldErrors, pick, toList } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { AdminBlock, DetailsModal, readItem, recordId, searchClass, useAdminAction } from '@/components/admin-kit';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, CardTitle, Field, Icon, inputClass, Modal } from '@/components/ui';

/* Admin · the medicine catalogue on the .NET API: add, edit, delete
   (POST/PUT/DELETE /api/medicines). Fields follow CreateMedicineDto. */

const TEXT_FIELDS = [
  { key: 'name', label: 'الاسم التجاري', required: true },
  { key: 'scientificName', label: 'الاسم العلمي' },
  { key: 'category', label: 'التصنيف' },
  { key: 'dosage', label: 'الجرعة / التركيز' },
  { key: 'manufacturer', label: 'الشركة المصنعة' },
  { key: 'atcCode', label: 'رمز ATC', ltr: true },
  { key: 'packageInfo', label: 'معلومات العبوة' },
  { key: 'storageConditions', label: 'ظروف التخزين' }
];

/* Picture: upload a file (stored by this app) or keep / remove the current one. */
function ImagePicker({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return setError('حجم الصورة أكبر من 3 ميغابايت.');
    setBusy(true);
    setError('');
    try {
      onChange((await api.admin.medicines.uploadImage(file)).imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="md:col-span-2 flex items-center gap-space-md p-space-sm rounded-xl bg-surface-subtle">
      {value
        ? <img src={value} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" />
        : <span className="w-24 h-24 rounded-xl bg-surface-container-high text-text-muted flex items-center justify-center shrink-0"><Icon name="image" className="text-[36px]" /></span>}
      <div className="flex flex-col gap-space-2xs">
        <span className="font-label-lg text-label-lg text-text-heading">صورة الدواء</span>
        <span className="font-body-sm text-body-sm text-text-muted">JPG أو PNG أو WEBP، حتى 3 ميغابايت.</span>
        <div className="flex flex-wrap gap-space-2xs">
          <label className={'inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg font-label-lg text-label-lg cursor-pointer bg-primary/10 text-text-primary hover:bg-primary/20' + (busy ? ' opacity-60 pointer-events-none' : '')}>
            <Icon name="upload" className="text-[18px]" />{busy ? 'جارٍ الرفع…' : value ? 'تغيير الصورة' : 'رفع صورة'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={upload} />
          </label>
          {value ? <Button tone="ghost" icon="delete" onClick={() => onChange('')}>إزالة</Button> : null}
        </div>
        {error ? <span className="font-label-sm text-label-sm text-state-danger" role="alert">{error}</span> : null}
      </div>
    </div>
  );
}

function MedicineForm({ record, onClose, onSaved }) {
  const editing = record && record !== 'new';
  const [form, setForm] = useState(() => {
    const base = Object.fromEntries(TEXT_FIELDS.map(({ key }) => [key, editing ? String(pick(record, key) ?? '') : '']));
    return {
      ...base,
      description: editing ? String(pick(record, 'description') ?? '') : '',
      imageUrl: editing ? String(pick(record, 'imageUrl') ?? '') : '',
      avgDailyConsumption: editing ? String(pick(record, 'avgDailyConsumption') ?? 0) : '0',
      isCritical: editing ? !!pick(record, 'isCritical') : false,
      requiresColdChain: editing ? !!pick(record, 'requiresColdChain') : false
    };
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (name.length < 2 || name.length > 200) return setError('اسم الدواء بين 2 و 200 حرف.');
    const consumption = Number(form.avgDailyConsumption || 0);
    if (!Number.isInteger(consumption) || consumption < 0) return setError('الاستهلاك اليومي رقم صحيح غير سالب.');
    const payload = {
      ...Object.fromEntries(TEXT_FIELDS.map(({ key }) => [key, form[key].trim() || null])),
      name,
      description: form.description.trim() || null,
      imageUrl: form.imageUrl || '',
      isCritical: form.isCritical,
      requiresColdChain: form.requiresColdChain,
      avgDailyConsumption: consumption
    };
    setBusy(true);
    setError('');
    try {
      if (editing) await api.admin.medicines.update(recordId(record), payload);
      else await api.admin.medicines.create(payload);
      onSaved(editing ? 'تم حفظ الدواء.' : 'تمت إضافة الدواء.');
    } catch (err) {
      setError(Object.values(fieldErrors(err)).join(' ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!record} onClose={onClose} title={editing ? 'تعديل دواء' : 'إضافة دواء'} wide>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-space-md" onSubmit={submit} noValidate>
        <ImagePicker value={form.imageUrl} onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))} />
        {TEXT_FIELDS.map(({ key, label, required, ltr }) => (
          <Field key={key} label={label} htmlFor={'md-' + key} required={required}>
            <input id={'md-' + key} dir={ltr ? 'ltr' : 'auto'} className={inputClass} value={form[key]} onChange={set(key)} />
          </Field>
        ))}
        <Field label="متوسط الاستهلاك اليومي" htmlFor="md-avg">
          <input id="md-avg" type="number" min="0" className={inputClass} value={form.avgDailyConsumption} onChange={set('avgDailyConsumption')} />
        </Field>
        <div className="flex flex-col gap-space-xs justify-end">
          <label className="flex items-center gap-2 cursor-pointer font-label-md text-label-md text-text-body"><input type="checkbox" checked={form.isCritical} onChange={set('isCritical')} /> دواء حرج</label>
          <label className="flex items-center gap-2 cursor-pointer font-label-md text-label-md text-text-body"><input type="checkbox" checked={form.requiresColdChain} onChange={set('requiresColdChain')} /> يحتاج سلسلة تبريد</label>
        </div>
        <Field label="الوصف" htmlFor="md-desc" className="md:col-span-2">
          <textarea id="md-desc" rows={3} className={inputClass} value={form.description} onChange={set('description')} />
        </Field>
        {error ? <p className="md:col-span-2 font-label-md text-label-md text-state-danger" role="alert">{error}</p> : null}
        <div className="md:col-span-2"><Button type="submit" icon="save" busy={busy} busyLabel="جارٍ الحفظ…">{editing ? 'حفظ التعديلات' : 'إضافة'}</Button></div>
      </form>
    </Modal>
  );
}

export default function AdminMedicinesPage() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const search = useDebounced(query);
  const state = useAsync(async () => toList(await api.admin.medicines.list()), []);
  const { busy, run } = useAdminAction(state.reload);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = state.data || [];
    return q ? all.filter((m) => [pick(m, 'name'), pick(m, 'scientificName'), pick(m, 'category')].join(' ').toLowerCase().includes(q)) : all;
  }, [state.data, search]);

  const openEdit = async (item) => {
    try { setEditing({ ...item, ...readItem(await api.admin.medicines.get(recordId(item))) }); } catch { setEditing(item); }
  };

  return (
    <>
      <PageHeader title="إدارة الأدوية" subtitle="قائمة الأدوية في خادم شفاء: إضافة وتعديل وحذف" />
      <PageBody>
        <RoleGate allow={['Admin']} message="هذه الصفحة متاحة للإدارة فقط">
          <Card>
            <CardTitle icon="medication" count={state.data ? items.length : undefined} actions={
              <>
                <Button icon="add" onClick={() => setEditing('new')}>إضافة دواء</Button>
                <Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>
              </>
            }>
              الأدوية
            </CardTitle>

            <div className="relative md:max-w-sm">
              <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
              <input className={searchClass} placeholder="ابحث بالاسم أو التصنيف" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
            </div>

            <AdminBlock state={state} empty={{ when: !items.length, icon: 'medication', title: 'لا توجد أدوية مطابقة' }}>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-xs">
                {items.map((m) => {
                  const id = recordId(m);
                  const name = pick(m, 'name') || '—';
                  return (
                    <div key={id} className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex items-start justify-between gap-space-sm">
                        {pick(m, 'imageUrl')
                          ? <img src={pick(m, 'imageUrl')} alt="" loading="lazy" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          : <span className="w-16 h-16 rounded-xl bg-surface-container-high text-text-muted flex items-center justify-center shrink-0"><Icon name="medication" /></span>}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-headline-sm text-headline-sm text-text-heading truncate" dir="auto">{name}</span>
                          <span className="font-body-sm text-body-sm text-text-muted truncate" dir="auto">
                            {[pick(m, 'scientificName'), pick(m, 'category'), pick(m, 'dosage')].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {pick(m, 'isCritical') ? <Badge className="bg-error-container text-state-danger">حرج</Badge> : null}
                          {pick(m, 'requiresColdChain') ? <Badge className="bg-state-info-subtle text-state-info">تبريد</Badge> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-space-2xs">
                        <Button tone="soft" icon="visibility" className="!py-1.5" onClick={() => setViewing(m)}>التفاصيل</Button>
                        <Button tone="soft" icon="edit" className="!py-1.5" onClick={() => openEdit(m)}>تعديل</Button>
                        <Button tone="danger" icon="delete" className="!py-1.5" busy={busy === 'del' + id} busyLabel="…"
                          onClick={() => run('del' + id, () => api.admin.medicines.remove(id), { confirm: 'حذف ' + name + ' من قائمة الأدوية؟', success: 'تم حذف الدواء.' })}>حذف</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AdminBlock>
          </Card>

          <DetailsModal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? pick(viewing, 'name') || 'الدواء' : ''}
            recordKey={viewing ? recordId(viewing) : null} load={() => api.admin.medicines.get(recordId(viewing))} />
          {editing ? (
            <MedicineForm key={editing === 'new' ? 'new' : recordId(editing)} record={editing} onClose={() => setEditing(null)}
              onSaved={(message) => { setEditing(null); state.reload(); toast(message); }} />
          ) : null}
        </RoleGate>
      </PageBody>
    </>
  );
}
