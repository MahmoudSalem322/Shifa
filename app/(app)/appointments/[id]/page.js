'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { APPOINTMENT_STATUS, formatDate, formatDateTime, timeLabel } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { CancelAppointmentButton } from '@/components/appointment-actions';
import { AsyncBlock, Badge, ButtonLink, Card, CardTitle, Icon, InfoRow } from '@/components/ui';

/* Module 4 · Feature 3 — "Add View Appointment Details". */
export default function AppointmentDetailsPage() {
  const { id } = useParams();
  const state = useAsync(async () => (await api.appointments.get(id)).appointment, [id]);
  const a = state.data;
  const status = a ? APPOINTMENT_STATUS[a.status] || APPOINTMENT_STATUS.confirmed : null;

  return (
    <>
      <PageHeader title="تفاصيل الموعد" subtitle={a ? a.doctorName : ''} />
      <PageBody narrow>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href="/appointments" className="hover:text-text-primary">مواعيدي</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body">تفاصيل الموعد</span>
        </nav>

        <AsyncBlock state={state}>
          {a ? (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-14 h-14 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center"><Icon name="event" className="text-[30px]" /></span>
                  <div className="flex flex-col">
                    <h1 className="font-headline-xl text-headline-xl text-text-heading">{a.doctorName}</h1>
                    <span className="font-body-md text-body-md text-text-muted">{a.specialization}</span>
                  </div>
                </div>
                <Badge className={status.cls + ' text-label-md py-1 px-3'}>{status.label}</Badge>
              </div>

              <CardTitle icon="event_note">الموعد</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <InfoRow icon="event" label="التاريخ">{formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</InfoRow>
                <InfoRow icon="schedule" label="الوقت">{timeLabel(a.time) + ' - ' + timeLabel(a.endTime) + ' (' + a.durationMinutes + ' دقيقة)'}</InfoRow>
                <InfoRow icon="local_hospital" label="المكان">{[a.facilityName, a.facilityAddress].filter(Boolean).join('، ')}</InfoRow>
                <InfoRow icon="tag" label="رقم الحجز"><span dir="ltr">{a.backendId ? '#' + a.backendId : a.id}</span></InfoRow>
              </div>

              <CardTitle icon="person">المريض</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <InfoRow icon="badge" label="الاسم">{a.patientName}</InfoRow>
                <InfoRow icon="call" label="الهاتف"><span dir="ltr">{a.phone}</span></InfoRow>
              </div>
              {a.notes ? (
                <div className="p-space-sm rounded-xl bg-surface-subtle">
                  <span className="font-label-sm text-label-sm text-text-muted block mb-1">سبب الزيارة</span>
                  <p className="font-body-md text-body-md text-text-body whitespace-pre-line">{a.notes}</p>
                </div>
              ) : null}

              <div className="font-body-sm text-body-sm text-text-muted flex flex-col gap-1">
                <span>تاريخ الحجز: {formatDateTime(a.createdAt)}</span>
                {a.cancelledAt ? <span className="text-state-danger">تم الإلغاء: {formatDateTime(a.cancelledAt)}</span> : null}
              </div>

              <div className="flex flex-wrap gap-space-xs pt-space-xs border-t border-border-soft">
                {a.upcoming ? <CancelAppointmentButton appointment={a} onCancelled={(updated) => state.setData(updated)} /> : null}
                <ButtonLink href={'/doctors/' + encodeURIComponent(a.doctorId)} tone="soft" icon="person">ملف الطبيب</ButtonLink>
                {!a.upcoming ? <ButtonLink href={'/doctors/' + encodeURIComponent(a.doctorId) + '/book'} icon="event_repeat">حجز موعد جديد</ButtonLink> : null}
              </div>
            </Card>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}
