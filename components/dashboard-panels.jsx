'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, auth, toItem, toList } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import {
  FACILITY_STATUSES, facilityTypeLabel, normalizeDoctor, normalizeFacility, normalizeMedicine, normalizePharmacy, normalizeStocks,
  PHARMACY_STATUSES, TONE_SOLID, validate
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
  const state = useAsync(async () => {
    const raw = toItem(await api.doctors.me()) || {};
    return { doctor: normalizeDoctor(raw) };
  }, []);

  return (
    <Card id="doctor-panel">
      <CardTitle icon="stethoscope">
        ملفي المهني
      </CardTitle>
      <AsyncBlock state={state}>
        {state.data && state.data.doctor ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">الاسم الكامل</span>
              <span className="font-body-md text-body-md text-text-heading">{state.data.doctor.name || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">رقم الهاتف</span>
              <span className="font-body-md text-body-md text-text-heading" dir="ltr">{state.data.doctor.phone || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">التخصص</span>
              <span className="font-body-md text-body-md text-text-heading">{state.data.doctor.specialization || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">رقم الترخيص</span>
              <span className="font-body-md text-body-md text-text-heading">{state.data.doctor.licenseNumber || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">المنشأة</span>
              <span className="font-body-md text-body-md text-text-heading">{state.data.doctor.facilityName || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">سنوات الخبرة</span>
              <span className="font-body-md text-body-md text-text-heading">{state.data.doctor.experience ? `${state.data.doctor.experience} سنوات` : '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">أيام العمل</span>
              <span className="font-body-md text-body-md text-text-heading">{state.data.doctor.workDays || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">ساعات العمل</span>
              <span className="font-body-md text-body-md text-text-heading" dir="ltr">{state.data.doctor.workHours || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted">مدة الكشف</span>
              <span className="font-body-md text-body-md text-text-heading">{state.data.doctor.durationMinutes ? `${state.data.doctor.durationMinutes} دقيقة` : '—'}</span>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <span className="font-label-sm text-label-sm text-text-muted">نبذة تعريفية</span>
              <span className="font-body-md text-body-md text-text-heading whitespace-pre-wrap">{state.data.doctor.bio || '—'}</span>
            </div>
          </div>
        ) : null}
      </AsyncBlock>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Donation review shortcut (pharmacies and health centres)          */
/* ------------------------------------------------------------------ */

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

    </>
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
  const [addingDoctor, setAddingDoctor] = useState(false);

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
    </>
  );
}




