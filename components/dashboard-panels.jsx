'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, auth, toItem, toList } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import {
  FACILITY_STATUSES, facilityTypeLabel, normalizeDoctor, normalizeFacility, normalizeMedicine, normalizePharmacy, normalizeStocks,
  PHARMACY_STATUSES, SERVICE_STATUSES, serviceStatus, statusLabel, TONE_BADGE, TONE_SOLID, validate
} from '@/lib/vocab';
import { useToast } from './toast';
import { AsyncBlock, Badge, Button, ButtonLink, Card, CardTitle, EmptyState, Field, Icon, inputClass, Modal } from './ui';

/* Role panels for /dashboard — ports of the Doctor, Pharmacy and Hospital
   sections of dashboard.js. PUT bodies are full replacements, so each save
   starts from the loaded profile and overwrites only the edited fields. */

const selectClass = inputClass + ' cursor-pointer';

/* ------------------------------------------------------------------ */
/* Doctor                                                             */
/* ------------------------------------------------------------------ */

export function DoctorPanel() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [busy, setBusy] = useState(false);

  const state = useAsync(async () => {
    const raw = toItem(await api.doctors.me()) || {};
    const doctor = normalizeDoctor(raw);
    /* Listing facilities can be forbidden for doctor accounts (403); fall
       back to the facility already on the profile so saving keeps it. */
    let list = [];
    try {
      list = toList(await api.facilities.list()).map(normalizeFacility).filter(Boolean);
    } catch { /* fallback below */ }
    if (!list.length && doctor.facilityId != null) list = [{ id: doctor.facilityId, name: doctor.facilityName || 'المنشأة #' + doctor.facilityId }];
    return { raw, doctor, list };
  }, []);

  useEffect(() => {
    if (!state.data) return;
    const d = state.data.doctor;
    setFacilities(state.data.list);
    setForm({
      fullName: d.name === 'طبيب' ? '' : d.name, phone: d.phone, specialization: d.specialization, licenseNumber: d.licenseNumber,
      yearsOfExperience: d.experience ? String(d.experience) : '', bio: d.bio, facilityId: d.facilityId != null ? String(d.facilityId) : '',
      workDays: d.workDays, workHours: d.workHours, consultationDurationMinutes: String(d.durationMinutes || 20)
    });
  }, [state.data]);

  const save = async () => {
    const missing = [];
    if (!form.fullName.trim()) missing.push('الاسم');
    if (!form.phone) missing.push('رقم الهاتف');
    if (!form.specialization.trim()) missing.push('التخصص');
    if (!form.licenseNumber.trim()) missing.push('رقم الترخيص');
    if (!form.facilityId) missing.push('المنشأة');
    if (!form.workDays.trim()) missing.push('أيام العمل');
    if (!form.workHours.trim()) missing.push('ساعات العمل');
    if (missing.length) return toast('يرجى استكمال: ' + missing.join('، '));
    if (!validate.phone(form.phone)) return toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.');

    setBusy(true);
    try {
      await api.doctors.updateMe({
        ...state.data.raw,
        fullName: form.fullName.trim(),
        phone: form.phone,
        specialization: form.specialization.trim(),
        licenseNumber: form.licenseNumber.trim(),
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        bio: form.bio,
        facilityId: Number(form.facilityId),
        workDays: form.workDays.trim(),
        workHours: form.workHours.trim(),
        consultationDurationMinutes: Number(form.consultationDurationMinutes) || 20
      });
      auth.mergeSession({ fullName: form.fullName.trim(), phone: form.phone });
      toast('تم حفظ الملف المهني.');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (key) => (event) => setForm({ ...form, [key]: key === 'phone' ? event.target.value.replace(/[^0-9]/g, '') : event.target.value });

  return (
    <Card id="doctor-panel">
      <CardTitle
        icon="stethoscope"
        actions={<>
          <ButtonLink href="/my-profile" tone="soft" icon="tune">المحرّر الكامل</ButtonLink>
          <Button icon="save" busy={busy} busyLabel="جارٍ الحفظ…" onClick={save} disabled={!form}>حفظ</Button>
        </>}
      >
        ملفي المهني
      </CardTitle>
      <AsyncBlock state={state}>
        {form ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field label="الاسم الكامل" htmlFor="doc-name" required><input id="doc-name" className={inputClass} value={form.fullName} onChange={set('fullName')} /></Field>
            <Field label="رقم الهاتف" htmlFor="doc-phone" required>
              <input id="doc-phone" className={inputClass + ' text-left'} dir="ltr" maxLength={10} inputMode="numeric" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="التخصص" htmlFor="doc-specialization" required><input id="doc-specialization" className={inputClass} value={form.specialization} onChange={set('specialization')} /></Field>
            <Field label="رقم الترخيص" htmlFor="doc-license" required><input id="doc-license" className={inputClass} value={form.licenseNumber} onChange={set('licenseNumber')} /></Field>
            <Field label="المنشأة" htmlFor="doc-facility" required>
              <select id="doc-facility" className={selectClass} value={form.facilityId} onChange={set('facilityId')}>
                <option value="">{facilities.length ? 'اختر المنشأة' : 'لا توجد منشآت متاحة'}</option>
                {facilities.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="سنوات الخبرة" htmlFor="doc-experience"><input id="doc-experience" type="number" min="0" className={inputClass} value={form.yearsOfExperience} onChange={set('yearsOfExperience')} /></Field>
            <Field label="أيام العمل" htmlFor="doc-workdays" required hint="تُستخدم لعرض الأيام المتاحة للحجز">
              <input id="doc-workdays" className={inputClass} placeholder="الأحد، الإثنين، الثلاثاء" value={form.workDays} onChange={set('workDays')} />
            </Field>
            <Field label="ساعات العمل" htmlFor="doc-workhours" required hint="مثال: 09:00 - 14:00 — تُقسم إلى أوقات حجز">
              <input id="doc-workhours" className={inputClass + ' text-left'} dir="ltr" placeholder="09:00 - 14:00" value={form.workHours} onChange={set('workHours')} />
            </Field>
            <Field label="مدة الكشف" htmlFor="doc-duration" required>
              <select id="doc-duration" className={selectClass} value={form.consultationDurationMinutes} onChange={set('consultationDurationMinutes')}>
                {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={String(m)}>{m} دقيقة</option>)}
              </select>
            </Field>
            <Field label="نبذة تعريفية" htmlFor="doc-bio" className="md:col-span-2">
              <textarea id="doc-bio" rows={4} className={inputClass + ' resize-none'} value={form.bio} onChange={set('bio')} />
            </Field>
          </div>
        ) : null}
      </AsyncBlock>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Donation review shortcut (pharmacies and health centres)          */
/* ------------------------------------------------------------------ */

function DonationReviewCard() {
  const state = useAsync(async () => (await api.donations.all('pending')).donations, []);
  const pending = state.data || [];
  return (
    <Card>
      <CardTitle icon="fact_check" count={pending.length} actions={<ButtonLink href="/donations/review" icon="arrow_back">فتح قائمة المراجعة</ButtonLink>}>
        تبرعات بانتظار المراجعة
      </CardTitle>
      <AsyncBlock state={state} skeleton={1} empty={{ when: !pending.length, icon: 'inbox', title: 'لا توجد تبرعات بانتظار المراجعة' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
          {pending.slice(0, 4).map((d) => (
            <Link key={d.id} href={'/donations/' + encodeURIComponent(d.id)} className="flex items-center justify-between gap-2 p-space-sm rounded-xl bg-surface-subtle hover:bg-surface-container-low">
              <span className="font-label-lg text-label-lg text-text-heading truncate" dir="auto">{d.medicineName}</span>
              <span className="font-body-sm text-body-sm text-text-muted shrink-0">{d.quantity} {d.unit}</span>
            </Link>
          ))}
        </div>
      </AsyncBlock>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pharmacy                                                           */
/* ------------------------------------------------------------------ */

/* Segmented control over an organisation's operating states. */
function StatusSwitch({ value, options, onChange, label = 'حالة العمل' }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="inline-flex flex-wrap rounded-lg bg-surface-container-low p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={busy}
          onClick={async () => { if (value === option.value) return; setBusy(true); try { await onChange(option.value); } finally { setBusy(false); } }}
          className={'px-space-sm py-1.5 rounded-md font-label-md text-label-md transition-colors disabled:opacity-60 ' +
            (value === option.value ? TONE_SOLID[option.tone] : 'text-text-body hover:bg-surface-container-high')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const knownStatus = (list, value, fallback) => (list.some((s) => s.value === value) ? value : fallback);

export function PharmacyPanel() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('Open');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const state = useAsync(async () => {
    const raw = toItem(await api.pharmacies.me()) || {};
    return { raw, pharmacy: normalizePharmacy(raw), stocks: normalizeStocks(raw) };
  }, []);

  useEffect(() => {
    if (!state.data) return;
    const p = state.data.pharmacy;
    setForm({ name: p.name === 'صيدلية' ? '' : p.name, phone: p.phone, address: p.address, workingHours: p.workingHours,
      isGovernmentApproved: p.governmentApproved, acceptsInsurance: p.acceptsInsurance, hasColdChain: p.hasColdChain });
    setStatus(knownStatus(PHARMACY_STATUSES, p.status, 'Open'));
  }, [state.data]);

  const save = async () => {
    if (form.name.trim().length < 3 || !form.address.trim() || !form.phone) return toast('الاسم والعنوان ورقم الهاتف مطلوبة.');
    if (!validate.orgPhone(form.phone)) return toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 02 أو 04 أو 05 أو 09.');
    setBusy(true);
    try {
      await api.pharmacies.updateMe({ ...state.data.raw, ...form, name: form.name.trim(), address: form.address.trim() });
      auth.mergeSession({ fullName: form.name.trim(), phone: form.phone });
      toast('تم حفظ بيانات الصيدلية.');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (next) => {
    try {
      await api.pharmacies.setStatus(next);
      setStatus(next);
      toast('تم تحديث الحالة.');
    } catch (error) {
      toast(error.message);
    }
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  return (
    <>
      <Card id="pharmacy-panel">
        <CardTitle icon="local_pharmacy" actions={<>
          <StatusSwitch value={status} options={PHARMACY_STATUSES} onChange={changeStatus} />
          <Button icon="save" busy={busy} busyLabel="جارٍ الحفظ…" onClick={save} disabled={!form}>حفظ</Button>
        </>}>
          بيانات الصيدلية
        </CardTitle>
        <AsyncBlock state={state}>
          {form ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <Field label="اسم الصيدلية" htmlFor="ph-name" required><input id="ph-name" className={inputClass} value={form.name} onChange={set('name')} /></Field>
              <Field label="رقم الهاتف" htmlFor="ph-phone" required><input id="ph-phone" className={inputClass + ' text-left'} dir="ltr" maxLength={10} value={form.phone} onChange={set('phone')} /></Field>
              <Field label="العنوان" htmlFor="ph-address" required className="md:col-span-2"><input id="ph-address" className={inputClass} value={form.address} onChange={set('address')} /></Field>
              <Field label="ساعات العمل" htmlFor="ph-hours"><input id="ph-hours" className={inputClass} placeholder="24/7 أو 08:00 - 22:00" value={form.workingHours} onChange={set('workingHours')} /></Field>
              <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
                {[['isGovernmentApproved', 'معتمدة حكومياً'], ['acceptsInsurance', 'تقبل التأمين'], ['hasColdChain', 'سلسلة تبريد']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer font-label-md text-label-md text-text-body">
                    <input type="checkbox" checked={!!form[key]} onChange={set(key)} /><span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </AsyncBlock>
      </Card>

      <Card id="pharmacy-stock">
        <CardTitle icon="inventory_2" count={state.data ? state.data.stocks.length : undefined} actions={<Button icon="add" onClick={() => setAdding(true)}>إضافة دواء</Button>}>
          مخزون الأدوية
        </CardTitle>
        <AsyncBlock state={state} empty={{ when: state.data && !state.data.stocks.length, icon: 'inventory_2', title: 'لا توجد أدوية في المخزون بعد' }}>
          <div className="flex flex-col gap-space-xs">
            {state.data ? state.data.stocks.map((stock, index) => <StockRow key={(stock.medicineId ?? 'x') + '-' + index} stock={stock} />) : null}
          </div>
        </AsyncBlock>
      </Card>

      <DonationReviewCard />
      <AddStockModal open={adding} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); state.reload(); }} />
    </>
  );
}

function StockRow({ stock }) {
  const toast = useToast();
  const [values, setValues] = useState({ quantity: String(stock.quantity), price: stock.price ? String(stock.price) : '', availability: stock.availability || '' });
  const [busy, setBusy] = useState(false);

  const update = async () => {
    const quantity = Number(values.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return toast('الكمية غير صحيحة.');
    setBusy(true);
    try {
      await api.pharmacies.updateStock(stock.medicineId, {
        quantity,
        price: Number(values.price) || 0,
        availability: values.availability || (quantity === 0 ? 'OutOfStock' : quantity <= 15 ? 'LowStock' : 'InStock')
      });
      toast('تم تحديث المخزون.');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
      <div className="flex flex-col">
        <span className="font-headline-sm text-headline-sm text-text-heading">{stock.medicineName || 'دواء #' + (stock.medicineId ?? '')}</span>
        {stock.batchNumber ? <span className="font-label-sm text-label-sm text-text-muted" dir="ltr">Batch: {stock.batchNumber}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-space-2xs">
        <input aria-label="الكمية" type="number" min="0" className="w-24 bg-surface-container-lowest py-1.5 px-2 rounded-lg text-center font-label-md focus:outline-none"
          value={values.quantity} onChange={(e) => setValues({ ...values, quantity: e.target.value })} />
        <input aria-label="السعر" type="number" min="0" step="0.01" placeholder="السعر ₪" className="w-28 bg-surface-container-lowest py-1.5 px-2 rounded-lg text-center font-label-md focus:outline-none"
          value={values.price} onChange={(e) => setValues({ ...values, price: e.target.value })} />
        <select aria-label="التوفر" className="bg-surface-container-lowest py-1.5 px-2 rounded-lg font-label-md focus:outline-none cursor-pointer"
          value={values.availability} onChange={(e) => setValues({ ...values, availability: e.target.value })}>
          <option value="">تلقائي</option>
          <option value="InStock">متوفر</option>
          <option value="LowStock">كمية محدودة</option>
          <option value="OutOfStock">نفد</option>
        </select>
        <Button className="!py-1.5" busy={busy} busyLabel="…" disabled={stock.medicineId == null || stock.medicineId === ''} onClick={update}>تحديث</Button>
      </div>
    </div>
  );
}

/* Replaces the legacy window.prompt() picker. The medicine must already
   exist in the catalogue (/api/medicines/list). */
function AddStockModal({ open, onClose, onAdded }) {
  const toast = useToast();
  const catalogue = useAsync(async () => (open ? toList(await api.medicines.list()).map(normalizeMedicine).filter(Boolean) : null), [open]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ medicineId: '', quantity: '1', price: '', unit: 'علبة', batchNumber: '', expiryDate: '' });
  const [busy, setBusy] = useState(false);

  /* Start clean each time it opens, so the last medicine is not added twice by mistake. */
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setForm({ medicineId: '', quantity: '1', price: '', unit: 'علبة', batchNumber: '', expiryDate: '' });
  }, [open]);

  const list = (catalogue.data || []).filter((m) => !query || (m.name + ' ' + m.scientificName).toLowerCase().includes(query.toLowerCase())).slice(0, 50);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.medicineId) return toast('اختر الدواء من القائمة.');
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return toast('الكمية غير صحيحة.');
    setBusy(true);
    try {
      await api.pharmacies.addStock({
        medicineId: Number(form.medicineId),
        quantity,
        unit: form.unit || undefined,
        price: Number(form.price) || 0,
        batchNumber: form.batchNumber || undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        availability: quantity === 0 ? 'OutOfStock' : quantity <= 15 ? 'LowStock' : 'InStock'
      });
      toast('تمت إضافة الدواء للمخزون.');
      onAdded();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة دواء للمخزون" wide>
      <form className="flex flex-col gap-space-sm" onSubmit={submit} noValidate>
        <input className={inputClass} placeholder="ابحث في كتالوج الأدوية…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث في الكتالوج" />
        <div className="max-h-56 overflow-y-auto flex flex-col gap-1 rounded-xl bg-surface-subtle p-1">
          {catalogue.loading ? <p className="p-space-sm text-text-muted font-body-sm">جارٍ تحميل الكتالوج…</p> : null}
          {catalogue.error ? <p className="p-space-sm text-state-danger font-body-sm">{catalogue.error.message}</p> : null}
          {!catalogue.loading && !catalogue.error && !list.length ? <EmptyState icon="search_off" title="لا توجد أدوية مطابقة" /> : null}
          {list.map((m) => (
            <label key={m.id} className={'flex items-center gap-2 p-space-xs rounded-lg cursor-pointer ' + (String(m.id) === form.medicineId ? 'bg-primary-fixed/50' : 'hover:bg-surface-container-low')}>
              <input type="radio" name="medicine" checked={String(m.id) === form.medicineId} onChange={() => setForm({ ...form, medicineId: String(m.id) })} />
              <span className="font-label-lg text-label-lg text-text-heading">{m.name}</span>
              {m.scientificName ? <span className="font-body-sm text-body-sm text-text-muted">{m.scientificName}</span> : null}
              {m.isCritical ? <Badge className="bg-error-container text-state-danger">حرج</Badge> : null}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-space-xs">
          <Field label="الكمية" htmlFor="stk-qty" required><input id="stk-qty" type="number" min="0" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="السعر (₪)" htmlFor="stk-price"><input id="stk-price" type="number" min="0" step="0.01" className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="الوحدة" htmlFor="stk-unit"><input id="stk-unit" className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          <Field label="رقم التشغيلة" htmlFor="stk-batch"><input id="stk-batch" dir="ltr" className={inputClass} value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></Field>
          <Field label="تاريخ الانتهاء" htmlFor="stk-expiry"><input id="stk-expiry" type="date" className={inputClass} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
        </div>
        <div className="flex gap-space-xs">
          <Button type="submit" icon="add" busy={busy} busyLabel="جارٍ الإضافة…" className="flex-1">إضافة</Button>
          <Button tone="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Hospital / facility                                                */
/* ------------------------------------------------------------------ */

export function FacilityPanel() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('Open');
  const [busy, setBusy] = useState(false);
  const [newService, setNewService] = useState('');
  const [adding, setAdding] = useState(false);

  const state = useAsync(async () => {
    const raw = toItem(await api.facilities.me()) || {};
    return { raw, facility: normalizeFacility(raw) };
  }, []);

  useEffect(() => {
    if (!state.data) return;
    const f = state.data.facility;
    /* Keep whatever type the record has (gov, phc, field…), not only the two listed. */
    setForm({ name: f.name === 'منشأة صحية' ? '' : f.name, type: f.type || 'Hospital', address: f.address,
      phone: f.phone, workingHours: f.workingHours, emergencyStatus: f.emergency });
    setStatus(knownStatus(FACILITY_STATUSES, f.status, 'Open'));
  }, [state.data]);

  const save = async () => {
    if (form.name.trim().length < 3 || !form.address.trim() || !form.phone || !form.workingHours.trim()) {
      return toast('الاسم والعنوان والهاتف وساعات العمل مطلوبة.');
    }
    if (!validate.orgPhone(form.phone)) return toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 02 أو 04 أو 05 أو 09.');
    setBusy(true);
    try {
      await api.facilities.updateMe({ ...state.data.raw, ...form, name: form.name.trim() });
      auth.mergeSession({ fullName: form.name.trim(), phone: form.phone });
      toast('تم حفظ بيانات المنشأة.');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (next) => {
    try {
      await api.facilities.setStatus(next);
      setStatus(next);
      toast('تم تحديث الحالة.');
    } catch (error) {
      toast(error.message);
    }
  };

  const addService = async (event) => {
    event.preventDefault();
    if (newService.trim().length < 2) return toast('أدخل اسم الخدمة.');
    setAdding(true);
    try {
      await api.facilities.addService(newService.trim());
      setNewService('');
      toast('تمت إضافة الخدمة.');
      state.reload();
    } catch (error) {
      toast(error.message);
    } finally {
      setAdding(false);
    }
  };

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  return (
    <>
      <Card id="facility-panel">
        <CardTitle icon="domain" actions={<>
          <StatusSwitch value={status} options={FACILITY_STATUSES} onChange={changeStatus} label="حالة المنشأة" />
          <Button icon="save" busy={busy} busyLabel="جارٍ الحفظ…" onClick={save} disabled={!form}>حفظ</Button>
        </>}>
          بيانات المنشأة
        </CardTitle>
        <AsyncBlock state={state}>
          {form ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <Field label="اسم المنشأة" htmlFor="fac-name" required><input id="fac-name" className={inputClass} value={form.name} onChange={set('name')} /></Field>
              <Field label="النوع" htmlFor="fac-type" required>
                <select id="fac-type" className={selectClass} value={form.type} onChange={set('type')}>
                  <option value="Hospital">مستشفى</option>
                  <option value="Clinic">عيادة</option>
                  {form.type && !['Hospital', 'Clinic'].includes(form.type) ? <option value={form.type}>{facilityTypeLabel(form.type)}</option> : null}
                </select>
              </Field>
              <Field label="العنوان" htmlFor="fac-address" required className="md:col-span-2"><input id="fac-address" className={inputClass} value={form.address} onChange={set('address')} /></Field>
              <Field label="رقم الهاتف" htmlFor="fac-phone" required><input id="fac-phone" className={inputClass + ' text-left'} dir="ltr" maxLength={10} value={form.phone} onChange={set('phone')} /></Field>
              <Field label="ساعات العمل" htmlFor="fac-hours" required><input id="fac-hours" className={inputClass} placeholder="24/7" value={form.workingHours} onChange={set('workingHours')} /></Field>
              <label className="flex items-center gap-2 cursor-pointer font-label-md text-label-md text-text-body">
                <input type="checkbox" checked={!!form.emergencyStatus} onChange={set('emergencyStatus')} /><span>قسم طوارئ فعّال</span>
              </label>
            </div>
          ) : null}
        </AsyncBlock>
      </Card>

      <Card id="facility-services">
        <CardTitle icon="health_and_safety" count={state.data ? state.data.facility.services.length : undefined}>الخدمات والأقسام</CardTitle>
        <form className="flex gap-space-xs" onSubmit={addService}>
          <input className={inputClass} placeholder="اسم خدمة أو قسم جديد" value={newService} onChange={(e) => setNewService(e.target.value)} aria-label="خدمة جديدة" maxLength={200} />
          <Button type="submit" icon="add" busy={adding} busyLabel="…">إضافة</Button>
        </form>
        <AsyncBlock state={state} empty={{ when: state.data && !state.data.facility.services.length, icon: 'health_and_safety', title: 'لا توجد خدمات مسجّلة بعد' }}>
          <div className="flex flex-col gap-space-xs">
            {state.data ? state.data.facility.services.map((service, index) => <ServiceRow key={(service.id ?? 's') + '-' + index} service={service} />) : null}
          </div>
        </AsyncBlock>
      </Card>

      <DonationReviewCard />
    </>
  );
}

function ServiceRow({ service }) {
  const toast = useToast();
  const [status, setStatus] = useState(serviceStatus(service.status));

  const update = async (next) => {
    try {
      await api.facilities.updateService(service.id, next);
      setStatus(next);
      toast('تم تحديث حالة الخدمة.');
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
      <span className="font-headline-sm text-headline-sm text-text-heading">{service.name}</span>
      {service.id == null ? (
        <Badge className={TONE_BADGE.neutral}>{statusLabel(status)}</Badge>
      ) : (
        <StatusSwitch value={status} options={SERVICE_STATUSES} onChange={update} label={'حالة ' + service.name} />
      )}
    </div>
  );
}
