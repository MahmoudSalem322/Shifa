'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { notifications } from '@/lib/notifications';
import { APPOINTMENT_STATUS, formatDate, timeLabel, WEEKDAYS_AR } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { CancelAppointmentButton } from '@/components/appointment-actions';
import { AsyncBlock, Badge, Button, ButtonLink, Card, CardTitle, Icon } from '@/components/ui';

/* Module 4 · Feature 3 — manage my appointments: upcoming vs previous,
   status, details and cancellation (GET/PATCH /api/appointments). */

const DAY_MS = 24 * 60 * 60 * 1000;

function AppointmentRow({ appointment, onChange }) {
  const status = APPOINTMENT_STATUS[appointment.status] || APPOINTMENT_STATUS.confirmed;
  const day = new Date(appointment.date + 'T00:00');
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
      <div className="flex items-center gap-space-sm min-w-0">
        <div className={'w-16 shrink-0 rounded-xl flex flex-col items-center py-1 ' + (appointment.upcoming ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-text-muted')}>
          <span className="font-label-sm text-label-sm">{WEEKDAYS_AR[day.getDay()]}</span>
          <span className="font-headline-md text-headline-md leading-tight">{day.getDate()}</span>
          <span className="font-label-sm text-label-sm">{new Intl.DateTimeFormat('ar', { month: 'short' }).format(day)}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <Link href={'/appointments/' + encodeURIComponent(appointment.id)} className="font-headline-sm text-headline-sm text-text-heading hover:text-primary truncate">
            {appointment.doctorName}
          </Link>
          <span className="font-body-sm text-body-sm text-text-muted">{[appointment.specialization, appointment.facilityName].filter(Boolean).join(' · ')}</span>
          <span className="font-label-md text-label-md text-text-body flex items-center gap-1">
            <Icon name="schedule" className="text-[16px] text-text-primary" />
            {timeLabel(appointment.time)} - {timeLabel(appointment.endTime)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-space-2xs">
        <Badge className={status.cls}>{status.label}</Badge>
        <ButtonLink href={'/appointments/' + encodeURIComponent(appointment.id)} tone="soft" className="!py-1.5">التفاصيل</ButtonLink>
        {appointment.upcoming ? <CancelAppointmentButton appointment={appointment} className="!py-1.5" onCancelled={onChange} /> : null}
      </div>
    </div>
  );
}

export default function MyAppointmentsPage() {
  const [tab, setTab] = useState('upcoming');
  const state = useAsync(async () => (await api.appointments.mine()).appointments, []);
  const all = useMemo(() => state.data || [], [state.data]);

  const { upcoming, previous } = useMemo(() => ({
    upcoming: all.filter((a) => a.upcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    previous: all.filter((a) => !a.upcoming)
  }), [all]);

  /* Reminder: a notification for anything in the next 24 hours, once. */
  useEffect(() => {
    const now = Date.now();
    upcoming.forEach((a) => {
      const starts = Date.parse(a.startsAt);
      if (starts - now < DAY_MS) {
        notifications.add({
          type: 'reminder',
          title: 'تذكير بالموعد',
          message: 'لديك موعد مع ' + a.doctorName + ' ' + formatDate(a.date) + ' الساعة ' + timeLabel(a.time) + '.',
          ref: a.id,
          dedupe: true
        });
      }
    });
  }, [upcoming]);

  const list = tab === 'upcoming' ? upcoming : previous;
  const next = upcoming[0];

  return (
    <>
      <PageHeader title="مواعيدي والحجوزات" subtitle="المواعيد القادمة والسابقة وحالتها" />
      <PageBody>
        <RoleGate allow={['Patient', 'Donor']} message="المواعيد متاحة لحسابات المرضى">
          {next ? (
            <div className="bg-gradient-to-l from-primary-container to-text-heading text-on-primary rounded-2xl p-space-md lg:p-space-lg shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Icon name="alarm" className="text-[30px]" /></span>
                <div>
                  <span className="font-label-md text-label-md text-white/80">موعدك القادم</span>
                  <h2 className="font-headline-lg text-headline-lg">{next.doctorName}</h2>
                  <p className="font-body-md text-body-md text-white/85">
                    {formatDate(next.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {timeLabel(next.time)}
                  </p>
                </div>
              </div>
              <Link href={'/appointments/' + encodeURIComponent(next.id)} className="inline-flex items-center justify-center gap-2 px-space-md py-3 rounded-xl bg-white text-text-heading font-label-lg text-label-lg shadow-sm shrink-0">
                تفاصيل الموعد <Icon name="arrow_back" />
              </Link>
            </div>
          ) : null}

          <Card>
            <CardTitle
              icon="calendar_month"
              actions={<>
                <Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>
                <ButtonLink href="/doctors" icon="add">حجز موعد جديد</ButtonLink>
              </>}
            >
              مواعيدي
            </CardTitle>

            <div className="flex gap-space-2xs" role="tablist">
              {[['upcoming', 'القادمة', upcoming.length], ['previous', 'السابقة والملغاة', previous.length]].map(([key, label, count]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={'px-space-sm py-1.5 rounded-full font-label-md text-label-md transition-colors ' +
                    (tab === key ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-text-body hover:bg-surface-container')}>
                  {label} ({count})
                </button>
              ))}
            </div>

            <AsyncBlock
              state={state}
              empty={{
                when: !list.length,
                icon: tab === 'upcoming' ? 'event_available' : 'history',
                title: tab === 'upcoming' ? 'لا توجد مواعيد قادمة' : 'لا توجد مواعيد سابقة',
                hint: tab === 'upcoming' ? 'ابحث عن طبيب واختر وقتاً متاحاً من جدوله.' : undefined,
                action: tab === 'upcoming' ? <Link href="/doctors" className="shifa-state__action">ابحث عن طبيب</Link> : null
              }}
            >
              <div className="flex flex-col gap-space-xs">
                {list.map((a) => <AppointmentRow key={a.id} appointment={a} onChange={() => state.reload()} />)}
              </div>
            </AsyncBlock>
          </Card>
        </RoleGate>
      </PageBody>
    </>
  );
}
