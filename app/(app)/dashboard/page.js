'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, auth, toItem, toList } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import {
  drugRequestStatus, formatDate, normalizeDrugRequest, roles, timeLabel, validate
} from '@/lib/vocab';
import { applyMatchStatus } from '@/lib/matching';
import { PageBody, PageHeader, useLogout } from '@/components/app-shell';
import { DoctorPanel, FacilityPanel, PharmacyPanel } from '@/components/dashboard-panels';
import { useToast } from '@/components/toast';
import { donationStatus } from '@/components/donations';
import { AsyncBlock, Badge, Button, ButtonLink, Card, CardTitle, Field, Icon, inputClass } from '@/components/ui';

/* Port of dashboard.html + script/dashboard.js — one page for every role.
     Patient / Donor : quick actions, appointments, drug requests, donations
     Doctor          : professional profile      (GET|PUT /api/doctors/me)
     Pharmacy        : profile, status, stock    (GET|PUT /api/pharmacies/me)
     Hospital        : profile, status, services (GET|PUT /api/facilities/me) */

const ROLE_PROFILE_API = { Doctor: 'doctors', Pharmacy: 'pharmacies', Hospital: 'facilities', Patient: 'patients' };

function AccountCard({ session }) {
  const toast = useToast();
  const role = session.role;
  const user = session.user;
  const [form, setForm] = useState({ fullName: user.fullName || '', phone: user.phone || '', age: '', gender: '' });
  const [busy, setBusy] = useState(false);

  /* Patients have a profile endpoint with age and gender. */
  const patient = useAsync(async () => (role === 'Patient' ? toItem(await api.patients.me()) : null), [role]);
  useEffect(() => {
    const p = patient.data;
    if (!p) return;
    setForm((f) => ({
      ...f,
      fullName: p.fullName || p.name || f.fullName,
      phone: p.phone || f.phone,
      age: p.age != null ? String(p.age) : '',
      gender: p.gender || ''
    }));
  }, [patient.data]);

  const save = async () => {
    const fullName = form.fullName.trim();
    if (fullName.length < 3) return toast('يرجى إدخال الاسم (3 أحرف على الأقل).');
    if (form.phone && !validate.phone(form.phone)) return toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.');

    if (role === 'Patient') {
      if (!form.gender) return toast('يرجى اختيار الجنس.');
      const age = form.age === '' ? undefined : Number(form.age);
      if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 150)) return toast('العمر غير صحيح.');
      setBusy(true);
      try {
        await api.patients.updateMe({ ...(patient.data || {}), fullName, phone: form.phone || undefined, age, gender: form.gender });
        auth.mergeSession({ fullName, phone: form.phone });
        toast('تم حفظ بيانات الحساب.');
      } catch (error) {
        toast(error.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    /* Doctor / Pharmacy / Hospital save through their own panel below;
       Donor has no profile endpoint at all. */
    auth.mergeSession({ fullName, phone: form.phone });
    toast(ROLE_PROFILE_API[role]
      ? 'تم التحديث. احفظ الملف المهني أدناه لإرسال التعديلات إلى الخادم.'
      : 'تم الحفظ على هذا الجهاز — الخادم لا يوفّر تعديل بيانات هذا النوع من الحسابات.');
  };

  return (
    <Card id="account">
      <CardTitle icon="account_circle" actions={<Button icon="save" busy={busy} busyLabel="جارٍ الحفظ…" onClick={save}>حفظ التعديلات</Button>}>
        بيانات الحساب
      </CardTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <Field label="الاسم الكامل" htmlFor="account-name">
          <input id="account-name" className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </Field>
        <Field label="رقم الهاتف" htmlFor="account-phone">
          <input id="account-phone" className={inputClass + ' text-left'} dir="ltr" inputMode="numeric" maxLength={10} placeholder="05XXXXXXXX"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })} />
        </Field>
        <Field label="البريد الإلكتروني" htmlFor="account-email" hint="لا يمكن تغيير البريد الإلكتروني">
          <input id="account-email" readOnly dir="ltr" className={inputClass + ' bg-surface-subtle text-text-muted text-left'} value={user.email || ''} />
        </Field>
        <Field label="نوع الحساب" htmlFor="account-role">
          <input id="account-role" readOnly className={inputClass + ' bg-surface-subtle text-text-muted'} value={roles.toArabic(role)} />
        </Field>
        {role === 'Patient' ? (
          <>
            <Field label="العمر" htmlFor="account-age">
              <input id="account-age" type="number" min="0" max="150" className={inputClass} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </Field>
            <Field label="الجنس" htmlFor="account-gender" required>
              <select id="account-gender" className={inputClass + ' cursor-pointer'} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">اختر</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </Field>
          </>
        ) : null}
      </div>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { href: '/health-navigator', icon: 'assistant', title: 'المساعد الذكي', text: 'صف ما تحتاجه ونرشدك للجهة المناسبة' },
  { href: '/doctors', icon: 'calendar_add_on', title: 'حجز موعد', text: 'اختر طبيباً ووقتاً متاحاً' },
  { href: '/drug-requests/new', icon: 'medication', title: 'طلب دواء', text: 'أرفق وصفتك وتابع الطلب' },
  { href: '/prescription-reader', icon: 'document_scanner', title: 'قراءة وصفة', text: 'استخراج الأدوية بالذكاء الاصطناعي' },
  { href: '/donations/new', icon: 'volunteer_activism', title: 'تبرع بدواء', text: 'ساهم بدوائك الفائض' }
];

function PatientPanels() {
  const appointments = useAsync(async () => (await api.appointments.mine()).appointments.filter((a) => a.upcoming), []);
  const requests = useAsync(async () => {
    const [response, matchList] = await Promise.all([
      api.drugRequests.mine(),
      api.matches.list({ scope: 'mine' }).catch(() => null)
    ]);
    const matches = (matchList && matchList.matches) || [];
    return toList(response).map(normalizeDrugRequest).filter(Boolean).map((r) => applyMatchStatus(r, matches));
  }, []);
  const donations = useAsync(async () => (await api.donations.mine()).donations, []);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-space-sm">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} className="bg-surface-card rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col gap-space-2xs group">
            <span className="w-12 h-12 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
              <Icon name={action.icon} className="text-[26px]" />
            </span>
            <span className="font-headline-sm text-headline-sm text-text-heading">{action.title}</span>
            <span className="font-body-sm text-body-sm text-text-muted">{action.text}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
        <Card id="appointments">
          <CardTitle icon="calendar_month" count={(appointments.data || []).length} actions={<ButtonLink href="/appointments" tone="soft">عرض الكل</ButtonLink>}>
            مواعيدي القادمة
          </CardTitle>
          <AsyncBlock state={appointments} skeleton={2} empty={{ when: !(appointments.data || []).length, icon: 'event_available', title: 'لا توجد مواعيد قادمة', action: <Link href="/doctors" className="shifa-state__action">حجز موعد</Link> }}>
            <div className="flex flex-col gap-space-xs">
              {(appointments.data || []).slice(0, 4).map((a) => (
                <Link key={a.id} href={'/appointments/' + encodeURIComponent(a.id)} className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle hover:bg-surface-container-low">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <span className="w-11 h-11 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center shrink-0"><Icon name="event" /></span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-headline-sm text-headline-sm text-text-heading truncate">{a.doctorName}</span>
                      <span className="font-body-sm text-body-sm text-text-muted">{a.specialization}</span>
                    </div>
                  </div>
                  <span className="font-label-md text-label-md text-text-body text-left shrink-0">{formatDate(a.date, { day: 'numeric', month: 'short' })} · {timeLabel(a.time)}</span>
                </Link>
              ))}
            </div>
          </AsyncBlock>
        </Card>

        <Card id="drug-requests">
          <CardTitle icon="prescriptions" count={(requests.data || []).length} actions={<ButtonLink href="/drug-requests" tone="soft">عرض الكل</ButtonLink>}>
            طلبات الأدوية
          </CardTitle>
          <AsyncBlock state={requests} skeleton={2} empty={{ when: !(requests.data || []).length, icon: 'medication', title: 'لا توجد طلبات أدوية بعد', action: <Link href="/drug-requests/new" className="shifa-state__action">طلب دواء</Link> }}>
            <div className="flex flex-col gap-space-xs">
              {(requests.data || []).slice(0, 4).map((r) => {
                const status = drugRequestStatus(r.status);
                return (
                  <Link key={r.id} href={'/drug-requests/' + encodeURIComponent(r.id)} className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle hover:bg-surface-container-low">
                    <div className="flex flex-col min-w-0">
                      <span className="font-headline-sm text-headline-sm text-text-heading truncate">{r.medicineName}</span>
                      <span className="font-body-sm text-body-sm text-text-muted"><span dir="ltr">#{r.id}</span> · الكمية {r.quantity}</span>
                    </div>
                    <Badge className={status.cls}>{status.label}</Badge>
                  </Link>
                );
              })}
            </div>
          </AsyncBlock>
        </Card>
      </div>

      <Card id="donations">
        <CardTitle icon="volunteer_activism" count={(donations.data || []).length} actions={<ButtonLink href="/donations" tone="soft">عرض الكل</ButtonLink>}>
          تبرعاتي
        </CardTitle>
        <AsyncBlock state={donations} skeleton={1} empty={{ when: !(donations.data || []).length, icon: 'volunteer_activism', title: 'لم تتبرع بأي دواء بعد', action: <Link href="/donations/new" className="shifa-state__action">تبرع الآن</Link> }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
            {(donations.data || []).slice(0, 4).map((d) => (
              <Link key={d.id} href={'/donations/' + encodeURIComponent(d.id)} className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle hover:bg-surface-container-low">
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-text-heading truncate" dir="auto">{d.medicineName}</span>
                  <span className="font-body-sm text-body-sm text-text-muted">{d.quantity} {d.unit}</span>
                </div>
                <Badge className={donationStatus(d.status).cls} icon={donationStatus(d.status).icon}>{donationStatus(d.status).label}</Badge>
              </Link>
            ))}
          </div>
        </AsyncBlock>
      </Card>
    </>
  );
}

export default function DashboardPage() {
  const session = useSession();
  const logout = useLogout();
  const [refreshKey, setRefreshKey] = useState(0);
  if (!session) return null;
  const role = session.role;

  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        subtitle={'أهلاً ' + (session.user.fullName || 'بك')}
        actions={<button type="button" onClick={() => setRefreshKey((k) => k + 1)} aria-label="تحديث" className="w-11 h-11 rounded-full flex items-center justify-center text-text-body hover:bg-surface-subtle"><Icon name="refresh" /></button>}
      />
      <PageBody key={refreshKey}>
        <AccountCard session={session} />
        {role === 'Doctor' ? <DoctorPanel /> : null}
        {role === 'Pharmacy' ? <PharmacyPanel /> : null}
        {role === 'Hospital' ? <FacilityPanel /> : null}
        {role === 'Patient' || role === 'Donor' || !ROLE_PROFILE_API[role] ? <PatientPanels /> : null}
        <div className="flex justify-end">
          <Button tone="danger" icon="logout" onClick={logout}>تسجيل الخروج</Button>
        </div>
      </PageBody>
    </>
  );
}
