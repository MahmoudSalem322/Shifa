'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, auth, toItem } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import { normalizeDoctor, normalizeFacility, normalizePharmacy, roles, validate } from '@/lib/vocab';
import { PageBody, PageHeader, useLogout } from '@/components/app-shell';
import { DarkModeToggle, useDarkMode } from '@/components/dark-mode';
import { useToast } from '@/components/toast';
import { AsyncBlock, Button, ButtonLink, Card, CardTitle, Field, Icon, inputClass } from '@/components/ui';

/* Account settings for every role: name and phone (plus age and gender
   for patients), saved through the role's own profile endpoint. The PUT
   endpoints replace the whole record, so each save starts from the loaded
   profile. Donor accounts have no profile endpoint on the .NET API, so
   their changes stay on this device and the page says so. */

const PROFILE = {
  Patient: {
    load: async () => toItem(await api.patients.me()) || {},
    read: (raw) => ({ fullName: raw.fullName || raw.name || '', phone: raw.phone || '', age: raw.age != null ? String(raw.age) : '', gender: raw.gender || '' }),
    save: (raw, form) => api.patients.updateMe({
      ...raw, fullName: form.fullName, phone: form.phone || undefined,
      age: form.age === '' ? undefined : Number(form.age), gender: form.gender
    }),
    phoneOk: validate.phone
  },
  Doctor: {
    load: async () => toItem(await api.doctors.me()) || {},
    read: (raw) => { const d = normalizeDoctor(raw); return { fullName: d.name === 'طبيب' ? '' : d.name, phone: d.phone }; },
    save: (raw, form) => {
      const d = normalizeDoctor(raw);
      return api.doctors.updateMe({
        ...raw,
        fullName: form.fullName,
        phone: form.phone,
        ...(d.facilityId != null ? { facilityId: Number(d.facilityId) } : {})
      });
    },
    phoneOk: validate.phone
  },
  Pharmacy: {
    load: async () => toItem(await api.pharmacies.me()) || {},
    read: (raw) => { const p = normalizePharmacy(raw); return { fullName: p.name === 'صيدلية' ? '' : p.name, phone: p.phone }; },
    save: (raw, form) => api.pharmacies.updateMe({ ...raw, name: form.fullName, phone: form.phone }),
    phoneOk: validate.orgPhone
  },
  Hospital: {
    load: async () => toItem(await api.facilities.me()) || {},
    read: (raw) => { const f = normalizeFacility(raw); return { fullName: f.name === 'منشأة صحية' ? '' : f.name, phone: f.phone }; },
    save: (raw, form) => api.facilities.updateMe({ ...raw, name: form.fullName, phone: form.phone }),
    phoneOk: validate.orgPhone
  }
};

const PHONE_HINT = {
  personal: 'رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.',
  org: 'رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 02 أو 04 أو 05 أو 09.'
};

export default function AccountPage() {
  const session = useSession();
  const toast = useToast();
  const logout = useLogout();
  const { isDark } = useDarkMode();
  const role = session ? session.role : '';
  const profile = PROFILE[role];

  const state = useAsync(async () => (profile ? profile.load() : null), [role]);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    const fromSession = { fullName: session.user.fullName || '', phone: session.user.phone || '', age: '', gender: '' };
    if (!profile) { setForm((f) => f || fromSession); return; }
    if (state.data) setForm({ ...fromSession, ...profile.read(state.data) });
  }, [session, profile, state.data]);

  if (!session) return null;
  const org = role === 'Pharmacy' || role === 'Hospital';

  const set = (key) => (event) => {
    const value = key === 'phone' ? event.target.value.replace(/[^0-9]/g, '') : event.target.value;
    setForm({ ...form, [key]: value });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const save = async (event) => {
    event.preventDefault();
    const fullName = form.fullName.trim();
    const next = {};
    if (fullName.length < 3) next.fullName = 'أدخل الاسم (3 أحرف على الأقل).';
    const phoneOk = profile ? profile.phoneOk : validate.phone;
    if ((form.phone || profile) && !phoneOk(form.phone)) next.phone = org ? PHONE_HINT.org : PHONE_HINT.personal;
    if (role === 'Patient') {
      if (!form.gender) next.gender = 'اختر الجنس.';
      const age = form.age === '' ? null : Number(form.age);
      if (age !== null && (!Number.isInteger(age) || age < 0 || age > 150)) next.age = 'العمر غير صحيح.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      if (profile) await profile.save(state.data || {}, { ...form, fullName });
      auth.mergeSession({ fullName, phone: form.phone });
      toast(profile ? 'تم حفظ بيانات الحساب.' : 'تم الحفظ على هذا الجهاز.');
      if (profile) state.reload();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="حسابي" subtitle="بيانات الحساب والإعدادات" />
      <PageBody narrow>
        <Card>
          <CardTitle icon="account_circle">بيانات الحساب</CardTitle>
          {!profile ? (
            <p className="p-space-sm rounded-xl bg-state-info-subtle text-state-info font-body-sm text-body-sm flex items-start gap-2">
              <Icon name="info" className="text-[18px] mt-0.5" />
              خادم شفاء لا يوفّر حتى الآن تعديل بيانات حسابات المتبرعين، لذلك تُحفظ تعديلاتك على هذا الجهاز فقط وتُستخدم لتعبئة النماذج تلقائياً.
            </p>
          ) : null}
          <AsyncBlock state={profile ? state : { loading: false, error: null, data: true }} skeleton={2}>
            {form ? (
              <form className="flex flex-col gap-space-md" onSubmit={save} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <Field label={org ? 'اسم المنشأة' : 'الاسم الكامل'} htmlFor="acc-name" required error={errors.fullName}>
                    <input id="acc-name" className={inputClass} value={form.fullName} onChange={set('fullName')} maxLength={120} autoComplete="name" />
                  </Field>
                  <Field label="رقم الهاتف" htmlFor="acc-phone" required={!!profile && role !== 'Patient'} error={errors.phone}>
                    <input id="acc-phone" className={inputClass + ' text-left'} dir="ltr" inputMode="numeric" maxLength={10} placeholder="05XXXXXXXX"
                      value={form.phone} onChange={set('phone')} autoComplete="tel" />
                  </Field>
                  <Field label="البريد الإلكتروني" htmlFor="acc-email" hint="لا يمكن تغيير البريد الإلكتروني">
                    <input id="acc-email" readOnly dir="ltr" className={inputClass + ' bg-surface-subtle text-text-muted text-left'} value={session.user.email || ''} />
                  </Field>
                  <Field label="نوع الحساب" htmlFor="acc-role">
                    <input id="acc-role" readOnly className={inputClass + ' bg-surface-subtle text-text-muted'} value={roles.toArabic(role) || '—'} />
                  </Field>
                  {role === 'Patient' ? (
                    <>
                      <Field label="العمر" htmlFor="acc-age" error={errors.age}>
                        <input id="acc-age" type="number" min="0" max="150" className={inputClass} value={form.age} onChange={set('age')} />
                      </Field>
                      <Field label="الجنس" htmlFor="acc-gender" required error={errors.gender}>
                        <select id="acc-gender" className={inputClass + ' cursor-pointer'} value={form.gender} onChange={set('gender')}>
                          <option value="">اختر</option>
                          <option value="ذكر">ذكر</option>
                          <option value="أنثى">أنثى</option>
                        </select>
                      </Field>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-space-xs">
                  <Button type="submit" icon="save" busy={busy} busyLabel="جارٍ الحفظ…">حفظ التعديلات</Button>
                  {role === 'Doctor' ? <ButtonLink href="/my-profile" tone="soft" icon="badge">الملف المهني الكامل</ButtonLink> : null}
                  {org ? <ButtonLink href="/dashboard" tone="soft" icon="tune">بيانات المنشأة الكاملة</ButtonLink> : null}
                </div>
              </form>
            ) : null}
          </AsyncBlock>
        </Card>

        <Card>
          <CardTitle icon="settings">الإعدادات</CardTitle>
          <div className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg text-text-heading">المظهر</span>
              <span className="font-body-sm text-body-sm text-text-muted">{isDark ? 'الوضع الداكن مفعّل' : 'الوضع الفاتح مفعّل'}</span>
            </div>
            <DarkModeToggle />
          </div>
          <div className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg text-text-heading">كلمة المرور</span>
              <span className="font-body-sm text-body-sm text-text-muted">نرسل رمز تحقق إلى بريدك ثم تختار كلمة مرور جديدة.</span>
            </div>
            <Link href="/login?view=forgot" className="inline-flex items-center gap-1 px-space-sm py-2 rounded-lg bg-surface-container-low text-text-primary font-label-md text-label-md hover:bg-surface-container-high">
              <Icon name="lock_reset" className="text-[18px]" /> تغيير كلمة المرور
            </Link>
          </div>
          <div className="flex justify-end">
            <Button tone="danger" icon="logout" onClick={logout}>تسجيل الخروج</Button>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
