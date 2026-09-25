'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, toList } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import {
  drugRequestStatus, formatDate, normalizeDrugRequest, roles, timeLabel
} from '@/lib/vocab';
import { clinicToday } from '@/lib/clock';
import { applyMatchStatus } from '@/lib/matching';
import { PageBody, PageHeader, useLogout } from '@/components/app-shell';
import { AdminPanel } from '@/components/admin-panel';
import { DoctorPanel, FacilityPanel, PharmacyPanel } from '@/components/dashboard-panels';
import { donationStatus } from '@/components/donations';
import { AsyncBlock, Badge, Button, ButtonLink, Card, CardTitle, Icon } from '@/components/ui';

/* Port of dashboard.html + script/dashboard.js — one page for every role.
     Patient / Donor : quick actions, appointments, drug requests, donations
     Doctor          : professional profile      (GET|PUT /api/doctors/me)
     Pharmacy        : profile, status, stock    (GET|PUT /api/pharmacies/me)
     Hospital        : profile, status, services (GET|PUT /api/facilities/me)
     Admin           : platform numbers, review queue, matches, appointments */

const ROLE_PROFILE_API = { Doctor: 'doctors', Pharmacy: 'pharmacies', Hospital: 'facilities', Patient: 'patients' };

/* Who is signed in, with a way to the account settings page. */
function AccountSummary({ session }) {
  const user = session.user;
  return (
    <Card id="account" className="!flex-row items-center justify-between flex-wrap">
      <div className="flex items-center gap-space-sm min-w-0">
        <span className="w-12 h-12 rounded-full bg-primary/10 text-text-primary flex items-center justify-center shrink-0"><Icon name="account_circle" className="text-[28px]" /></span>
        <div className="flex flex-col min-w-0">
          <span className="font-headline-sm text-headline-sm text-text-heading truncate">{user.fullName || 'حسابي'}</span>
          <span className="font-body-sm text-body-sm text-text-muted truncate" dir="auto">{[roles.toArabic(session.role), user.email].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <ButtonLink href="/account" tone="soft" icon="manage_accounts">إدارة الحساب</ButtonLink>
    </Card>
  );
}

/* Today's bookings at a glance for doctors. */
function DoctorToday() {
  const state = useAsync(async () => {
    const today = clinicToday();
    return (await api.appointments.forDoctor()).appointments.filter((a) => a.date === today && a.status !== 'cancelled');
  }, []);
  const list = state.data || [];
  return (
    <Card id="doctor-today">
      <CardTitle icon="today" count={list.length} actions={<ButtonLink href="/doctor-appointments" tone="soft">كل المواعيد</ButtonLink>}>
        مواعيد اليوم
      </CardTitle>
      <AsyncBlock state={state} skeleton={2} empty={{ when: !list.length, icon: 'event_available', title: 'لا توجد مواعيد اليوم' }}>
        <div className="flex flex-col gap-space-xs">
          {list.slice(0, 6).map((a) => (
            <Link key={a.id} href="/doctor-appointments" className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle hover:bg-surface-container-low">
              <span className="font-headline-sm text-headline-sm text-text-heading truncate">{a.patientName}</span>
              <span className="font-label-md text-label-md text-text-body shrink-0">{timeLabel(a.time)}</span>
            </Link>
          ))}
        </div>
      </AsyncBlock>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { href: '/health-navigator', icon: 'assistant', title: 'المساعد الذكي', text: 'صف ما تحتاجه ونرشدك للجهة المناسبة' },
  { href: '/doctors', icon: 'calendar_add_on', title: 'حجز موعد', text: 'اختر طبيباً ووقتاً متاحاً' },
  { href: '/drug-requests/new', icon: 'medication', title: 'طلب دواء', text: 'أرفق وصفتك وتابع الطلب' },
  { href: '/prescription-reader', icon: 'document_scanner', title: 'قراءة وصفة', text: 'استخراج الأدوية بالذكاء الاصطناعي' },
  { href: '/donations/new', icon: 'volunteer_activism', title: 'إضافة تبرع', text: 'ساهم بدوائك أو أجهزتك الطبية الفائضة' }
];

function PatientPanels({ role }) {
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

  const visibleActions = role === 'Donor' 
    ? QUICK_ACTIONS.filter((a) => a.href === '/donations/new')
    : QUICK_ACTIONS;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-space-sm">
        {visibleActions.map((action) => (
          <Link key={action.href} href={action.href} className="bg-surface-card rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col gap-space-2xs group">
            <span className="w-12 h-12 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
              <Icon name={action.icon} className="text-[26px]" />
            </span>
            <span className="font-headline-sm text-headline-sm text-text-heading">{action.title}</span>
            <span className="font-body-sm text-body-sm text-text-muted">{action.text}</span>
          </Link>
        ))}
      </div>

      {role !== 'Donor' && (
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
      )}

      <Card id="donations">
        <CardTitle icon="volunteer_activism" count={(donations.data || []).length} actions={<ButtonLink href="/donations" tone="soft">عرض الكل</ButtonLink>}>
          تبرعاتي
        </CardTitle>
        <AsyncBlock state={donations} skeleton={1} empty={{ when: !(donations.data || []).length, icon: 'volunteer_activism', title: 'لم تتبرع بعد', action: <Link href="/donations/new" className="shifa-state__action">تبرع الآن</Link> }}>
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
        <AccountSummary session={session} />
        {role === 'Doctor' ? <DoctorToday /> : null}
        {role === 'Doctor' ? <DoctorPanel /> : null}
        {role === 'Pharmacy' ? <PharmacyPanel /> : null}
        {role === 'Hospital' ? <FacilityPanel /> : null}
        {role === 'Admin' ? <AdminPanel /> : null}
        {role === 'Patient' || role === 'Donor' || (!ROLE_PROFILE_API[role] && role !== 'Admin') ? <PatientPanels role={role} /> : null}
        <div className="flex justify-end">
          <Button tone="danger" icon="logout" onClick={logout}>تسجيل الخروج</Button>
        </div>
      </PageBody>
    </>
  );
}
