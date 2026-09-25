'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { clinicToday } from '@/lib/clock';
import { APPOINTMENT_STATUS, formatDate, formatDateTime, timeLabel, WEEKDAYS_AR } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { useToast } from '@/components/toast';
import { AsyncBlock, Badge, Button, Card, CardTitle, Field, Icon, inputClass, Modal } from '@/components/ui';

/* The doctor's side of Module 4: every booking made with the signed-in
   doctor, today's first, with attendance (attended / no-show) once a slot
   has started and cancellation before it. The patient is notified of
   each change (GET /api/appointments?as=doctor, PATCH …/{id}). */

const TABS = [
  { key: 'today', label: 'اليوم', icon: 'today' },
  { key: 'upcoming', label: 'القادمة', icon: 'event_upcoming' },
  { key: 'previous', label: 'السابقة', icon: 'history' }
];

function CancelByDoctor({ appointment, onDone }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (reason.trim().length < 3) return toast('اذكر سبب الإلغاء ليصل إلى المريض.');
    setBusy(true);
    try {
      const response = await api.appointments.doctorAction(appointment.id, 'cancel', reason.trim());
      toast(response.message);
      setOpen(false);
      onDone();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button tone="danger" icon="event_busy" className="!py-1.5" onClick={() => setOpen(true)}>إلغاء</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="إلغاء الموعد" eyebrow={appointment.patientName}>
        <div className="flex flex-col gap-space-sm">
          <p className="font-body-md text-body-md text-text-muted">
            موعد {formatDate(appointment.date)} الساعة {timeLabel(appointment.time)}. سيصل السبب إلى المريض ويصبح الوقت متاحاً للحجز.
          </p>
          <Field label="سبب الإلغاء" htmlFor={'cancel-' + appointment.id} required>
            <textarea id={'cancel-' + appointment.id} rows={3} maxLength={500} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex gap-space-xs">
            <Button tone="danger" busy={busy} busyLabel="جارٍ الإلغاء…" onClick={cancel} className="flex-1">تأكيد الإلغاء</Button>
            <Button tone="ghost" onClick={() => setOpen(false)}>تراجع</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Attendance({ appointment, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');

  const mark = async (action) => {
    setBusy(action);
    try {
      const response = await api.appointments.doctorAction(appointment.id, action);
      toast(response.message);
      onDone();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <Button tone="success" icon="how_to_reg" className="!py-1.5" busy={busy === 'complete'} busyLabel="…" disabled={!!busy} onClick={() => mark('complete')}>حضر</Button>
      <Button tone="soft" icon="person_off" className="!py-1.5" busy={busy === 'no_show'} busyLabel="…" disabled={!!busy} onClick={() => mark('no_show')}>لم يحضر</Button>
    </>
  );
}

function ConfirmByDoctor({ appointment, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const response = await api.appointments.doctorAction(appointment.id, 'confirm');
      toast(response.message);
      onDone();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button tone="success" icon="check_circle" className="!py-1.5" busy={busy} busyLabel="…" disabled={busy} onClick={confirm}>تأكيد</Button>
  );
}

function DoctorAppointmentRow({ appointment, onChange }) {
  const status = APPOINTMENT_STATUS[appointment.status] || APPOINTMENT_STATUS.confirmed;
  const day = new Date(appointment.date + 'T00:00');
  const isPending = appointment.recordedStatus === 'pending';
  const isConfirmed = appointment.recordedStatus === 'confirmed';

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
      <div className="flex items-start gap-space-sm min-w-0">
        <div className={'w-16 shrink-0 rounded-xl flex flex-col items-center py-1 ' + (appointment.upcoming ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-text-muted')}>
          <span className="font-label-sm text-label-sm">{WEEKDAYS_AR[day.getDay()]}</span>
          <span className="font-headline-md text-headline-md leading-tight">{day.getDate()}</span>
          <span className="font-label-sm text-label-sm">{new Intl.DateTimeFormat('ar', { month: 'short' }).format(day)}</span>
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="font-headline-sm text-headline-sm text-text-heading truncate">{appointment.patientName}</span>
          <span className="font-label-md text-label-md text-text-body flex items-center gap-1">
            <Icon name="schedule" className="text-[16px] text-text-primary" />
            {timeLabel(appointment.time)} - {timeLabel(appointment.endTime)}
          </span>
          {appointment.phone ? (
            <a href={'tel:' + appointment.phone} className="font-body-sm text-body-sm text-text-primary hover:underline flex items-center gap-1" dir="ltr">
              <Icon name="call" className="text-[16px]" />{appointment.phone}
            </a>
          ) : null}
          {appointment.notes ? <p className="font-body-sm text-body-sm text-text-muted whitespace-pre-line">{appointment.notes}</p> : null}
          {appointment.status === 'cancelled' ? (
            <span className="font-body-sm text-body-sm text-text-muted">
              {appointment.cancelledBy === 'doctor' ? 'ألغيته أنت' : 'ألغاه المريض'}{appointment.cancelledAt ? ' · ' + formatDateTime(appointment.cancelledAt) : ''}
              {appointment.cancelReason ? ' — ' + appointment.cancelReason : ''}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-space-2xs">
        <Badge className={status.cls}>
          {isPending ? status.label : (isConfirmed && !appointment.upcoming ? 'بانتظار تسجيل الحضور' : status.label)}
        </Badge>
        {isPending ? <ConfirmByDoctor appointment={appointment} onDone={onChange} /> : null}
        {(isPending || (isConfirmed && appointment.upcoming)) ? <CancelByDoctor appointment={appointment} onDone={onChange} /> : null}
        {isConfirmed && !appointment.upcoming ? <Attendance appointment={appointment} onDone={onChange} /> : null}
      </div>
    </div>
  );
}

export default function DoctorAppointmentsPage() {
  const [tab, setTab] = useState('today');
  const state = useAsync(async () => (await api.appointments.forDoctor()).appointments, []);

  const groups = useMemo(() => {
    const all = state.data || [];
    const today = clinicToday();
    return {
      today: all.filter((a) => a.date === today && a.status !== 'cancelled'),
      upcoming: all.filter((a) => a.upcoming && a.date !== today),
      /* Newest first; includes cancelled ones for the record. */
      previous: all.filter((a) => !a.upcoming && a.date !== today).slice().reverse()
    };
  }, [state.data]);

  const list = groups[tab];
  const waiting = (state.data || []).filter((a) => a.recordedStatus === 'confirmed' && !a.upcoming).length;

  return (
    <>
      <PageHeader title="مواعيد العيادة" subtitle="الحجوزات عندك وتسجيل حضور المرضى" />
      <PageBody>
        <RoleGate allow={['Doctor']} message="هذه الصفحة متاحة لحسابات الأطباء">
          <div className="grid grid-cols-3 gap-space-sm">
            {TABS.map((t) => (
              <div key={t.key} className="bg-surface-card rounded-xl p-space-sm shadow-sm flex flex-col sm:flex-row items-center gap-space-xs text-center sm:text-right">
                <Icon name={t.icon} className="text-[28px] text-text-primary" />
                <div className="flex flex-col">
                  <span className="font-headline-lg text-headline-lg text-text-heading leading-none">{state.data ? groups[t.key].length : '—'}</span>
                  <span className="font-label-sm text-label-sm text-text-muted">{t.label}</span>
                </div>
              </div>
            ))}
          </div>

          {waiting ? (
            <p className="p-space-sm rounded-xl bg-state-warning-subtle text-state-warning font-label-md text-label-md flex items-center gap-2">
              <Icon name="pending_actions" /> لديك {waiting} {waiting === 1 ? 'موعد' : 'مواعيد'} بانتظار تسجيل الحضور أو الغياب.
            </p>
          ) : null}

          <Card>
            <CardTitle icon="event_note" count={list.length} actions={<Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>}>
              الحجوزات
            </CardTitle>
            <div className="flex flex-wrap gap-space-2xs" role="tablist">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                  className={'px-space-sm py-1.5 rounded-full font-label-md text-label-md flex items-center gap-1 transition-colors ' +
                    (tab === t.key ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-text-body hover:bg-surface-container-high')}>
                  <Icon name={t.icon} className="text-[18px]" /> {t.label}
                </button>
              ))}
            </div>
            <AsyncBlock state={state} empty={{
              when: !list.length,
              icon: 'event_available',
              title: tab === 'today' ? 'لا توجد مواعيد اليوم' : tab === 'upcoming' ? 'لا توجد مواعيد قادمة' : 'لا توجد مواعيد سابقة',
              hint: 'تظهر هنا الحجوزات التي يجريها المرضى من صفحتك في دليل الأطباء.'
            }}>
              <div className="flex flex-col gap-space-xs">
                {list.map((a) => <DoctorAppointmentRow key={a.id} appointment={a} onChange={state.reload} />)}
              </div>
            </AsyncBlock>
          </Card>
        </RoleGate>
      </PageBody>
    </>
  );
}
