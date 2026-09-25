'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { clinicToday } from '@/lib/clock';
import { DONATION_STATUS, MATCH_STATUS, formatDate, geo, timeLabel } from '@/lib/vocab';
import { ACCEPTED, donationStatus } from './donations';
import { MatchRow } from './matches';
import { ReviewActions } from './review-actions';
import { AdminBlock, RecordDetails } from './admin-kit';
import { AsyncBlock, Badge, ButtonLink, Card, CardTitle, Icon } from './ui';

/* The admin's dashboard: platform-wide numbers, the donations waiting for
   a decision and the matches waiting for hand-over. The admin manages
   donations and matches but never donates. */

const ADMIN_LINKS = [
  { href: '/admin/users', icon: 'group', title: 'الحسابات المسجلة', text: 'عرض المستخدمين وتعديل حالتهم وحذفهم وإضافتهم' },
  { href: '/admin/healthcare', icon: 'domain_add', title: 'الجهات الصحية', text: 'إضافة وتعديل واعتماد المراكز والصيدليات والأطباء' },
  { href: '/admin/medicines', icon: 'medication', title: 'إدارة الأدوية', text: 'إضافة وتعديل وحذف الأدوية' },
  { href: '/admin/drug-requests', icon: 'prescriptions', title: 'طلبات الأدوية', text: 'كل طلبات المرضى وتغيير حالتها' },
  { href: '/admin/server-donations', icon: 'cloud', title: 'تبرعات الخادم المركزي', text: 'قبول ورفض التبرعات المسجلة على الخادم' },
  { href: '/donations/review', icon: 'fact_check', title: 'إدارة التبرعات', text: 'قبول ورفض ومتابعة كل التبرعات' },
  { href: '/matches', icon: 'join', title: 'مطابقة التبرعات', text: 'تأكيد التسليم أو إلغاء المطابقات' },
  { href: '/admin/appointments', icon: 'event_note', title: 'كل المواعيد', text: 'حجوزات المرضى عند الأطباء' },
  { href: '/doctors', icon: 'person_search', title: 'دليل الأطباء', text: 'الأطباء وتخصصاتهم' },
  { href: '/facilities', icon: 'domain', title: 'المراكز والمستشفيات', text: 'المراكز الصحية وخدماتها' },
  { href: '/pharmacies', icon: 'store', title: 'الصيدليات', text: 'الصيدليات وحالتها' }
];

/* GET /api/admin/dashboard/stats on the .NET API, whatever it reports. */
function ServerStats() {
  const state = useAsync(() => api.admin.stats(), []);
  const stats = state.data && typeof state.data === 'object' ? (state.data.data && typeof state.data.data === 'object' ? state.data.data : state.data) : null;
  return (
    <Card id="server-stats">
      <CardTitle icon="monitoring">إحصائيات خادم شفاء</CardTitle>
      <AdminBlock state={state} empty={{ when: !stats || !Object.keys(stats).length, icon: 'monitoring', title: 'لا توجد إحصائيات' }}>
        <RecordDetails record={stats} />
      </AdminBlock>
    </Card>
  );
}

function Stat({ label, value, icon, cls, href }) {
  return (
    <Link href={href} className="bg-surface-card rounded-xl p-space-sm shadow-sm hover:shadow-md transition-all flex items-center gap-space-sm">
      <span className={'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ' + cls}><Icon name={icon} /></span>
      <div className="flex flex-col min-w-0">
        <span className="font-headline-lg text-headline-lg text-text-heading leading-none">{value}</span>
        <span className="font-label-sm text-label-sm text-text-muted truncate">{label}</span>
      </div>
    </Link>
  );
}

function StatGroup({ title, icon, children }) {
  return (
    <section className="flex flex-col gap-space-2xs">
      <h2 className="font-label-lg text-label-lg text-text-muted flex items-center gap-1"><Icon name={icon} className="text-[18px]" /> {title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-sm">{children}</div>
    </section>
  );
}

export function AdminPanel() {
  const donations = useAsync(async () => (await api.donations.all()).donations, []);
  const matches = useAsync(async () => (await api.matches.list()).matches, []);
  const appointments = useAsync(async () => (await api.appointments.all()).appointments, []);

  const donationList = donations.data || [];
  const matchList = matches.data || [];
  const appointmentList = appointments.data || [];

  const show = (state, value) => (state.data ? value : '—');
  const donationCount = (status) => donationList.filter((d) => d.status === status).length;
  const matchCount = (status) => matchList.filter((m) => m.status === status).length;

  const today = clinicToday();
  const todays = appointmentList.filter((a) => a.date === today && a.status !== 'cancelled');
  const upcoming = appointmentList.filter((a) => a.upcoming);

  const pending = donationList
    .filter((d) => d.status === 'pending')
    .sort((a, b) => String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999')));
  const waiting = matchList.filter((m) => m.status === 'reserved');

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-space-sm">
        {ADMIN_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="bg-surface-card rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col gap-space-2xs group">
            <span className="w-12 h-12 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
              <Icon name={link.icon} className="text-[26px]" />
            </span>
            <span className="font-headline-sm text-headline-sm text-text-heading">{link.title}</span>
            <span className="font-body-sm text-body-sm text-text-muted">{link.text}</span>
          </Link>
        ))}
      </div>

      <ServerStats />

      <StatGroup title="تبرعات الموقع" icon="volunteer_activism">
        {['pending', 'approved', 'matched', 'delivered', 'rejected', 'withdrawn'].map((status) => (
          <Stat key={status} href="/donations/review" label={DONATION_STATUS[status].label} icon={DONATION_STATUS[status].icon}
            cls={DONATION_STATUS[status].cls} value={show(donations, donationCount(status))} />
        ))}
      </StatGroup>

      <StatGroup title="المطابقات والمواعيد" icon="insights">
        {['reserved', 'delivered', 'cancelled'].map((status) => (
          <Stat key={status} href="/matches" label={'مطابقات ' + MATCH_STATUS[status].label} icon={MATCH_STATUS[status].icon}
            cls={MATCH_STATUS[status].cls} value={show(matches, matchCount(status))} />
        ))}
        <Stat href="/admin/appointments" label="مواعيد اليوم" icon="today" cls="bg-primary/10 text-text-primary" value={show(appointments, todays.length)} />
        <Stat href="/admin/appointments" label="مواعيد قادمة" icon="event_upcoming" cls="bg-primary/10 text-text-primary" value={show(appointments, upcoming.length)} />
        <Stat href="/donations/review" label="تبرعات متاحة للمطابقة" icon="inventory_2" cls="bg-state-success-subtle text-state-success"
          value={show(donations, donationList.filter((d) => ACCEPTED.includes(d.status) && d.availableQuantity > 0).length)} />
      </StatGroup>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
        <Card id="pending-donations">
          <CardTitle icon="hourglass_top" count={pending.length} actions={<ButtonLink href="/donations/review" tone="soft">إدارة التبرعات</ButtonLink>}>
            بانتظار المراجعة
          </CardTitle>
          <AsyncBlock state={donations} skeleton={2} empty={{ when: !pending.length, icon: 'task_alt', title: 'لا توجد تبرعات بانتظار المراجعة' }}>
            <div className="flex flex-col gap-space-xs">
              {pending.slice(0, 5).map((d) => (
                <div key={d.id} className="flex flex-col gap-space-2xs p-space-sm rounded-xl bg-surface-subtle">
                  <div className="flex items-center justify-between gap-space-sm">
                    <Link href={'/donations/' + encodeURIComponent(d.id)} className="flex flex-col min-w-0 hover:text-text-primary">
                      <span className="font-headline-sm text-headline-sm text-text-heading truncate" dir="auto">{d.medicineName}</span>
                      <span className="font-body-sm text-body-sm text-text-muted truncate">
                        {d.quantity} {d.unit} · {geo.label(d.governorate)}{d.donorName ? ' · ' + d.donorName : ''}
                        {d.expiryDate ? ' · تنتهي ' + formatDate(d.expiryDate, { month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </Link>
                    <Badge className={donationStatus(d.status).cls} icon={donationStatus(d.status).icon}>{donationStatus(d.status).label}</Badge>
                  </div>
                  <ReviewActions donation={d} compact onDone={() => donations.reload()} />
                </div>
              ))}
            </div>
          </AsyncBlock>
        </Card>

        <Card id="waiting-matches">
          <CardTitle icon="local_shipping" count={waiting.length} actions={<ButtonLink href="/matches" tone="soft">كل المطابقات</ButtonLink>}>
            مطابقات بانتظار التسليم
          </CardTitle>
          <AsyncBlock state={matches} skeleton={2} empty={{ when: !waiting.length, icon: 'join', title: 'لا توجد مطابقات بانتظار التسليم' }}>
            <div className="flex flex-col gap-space-xs">
              {waiting.slice(0, 5).map((m) => <MatchRow key={m.id} match={m} />)}
            </div>
          </AsyncBlock>
        </Card>
      </div>

      <Card id="today-appointments">
        <CardTitle icon="today" count={todays.length} actions={<ButtonLink href="/admin/appointments" tone="soft">كل المواعيد</ButtonLink>}>
          مواعيد اليوم
        </CardTitle>
        <AsyncBlock state={appointments} skeleton={2} empty={{ when: !todays.length, icon: 'event_available', title: 'لا توجد مواعيد اليوم' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
            {todays.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-text-heading truncate">{a.patientName}</span>
                  <span className="font-body-sm text-body-sm text-text-muted truncate">{a.doctorName}</span>
                </div>
                <span className="font-label-md text-label-md text-text-body shrink-0">{timeLabel(a.time)}</span>
              </div>
            ))}
          </div>
        </AsyncBlock>
      </Card>
    </>
  );
}
