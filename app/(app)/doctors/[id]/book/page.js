'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, fieldErrors, toItem } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import { notifications } from '@/lib/notifications';
import { parseWorkDays } from '@/lib/schedule';
import { DOCTOR_FALLBACK_AVATAR, formatDate, isoDate, normalizeDoctor, parseIsoDate, timeLabel, validate, WEEKDAYS_AR } from '@/lib/vocab';
import { clinicToday } from '@/lib/clock';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { AsyncBlock, Button, ButtonLink, Card, CardTitle, Field, Icon, InfoRow, inputClass, Modal, Skeleton } from '@/components/ui';

/* Module 4 · Feature 1 (view available appointments) and Feature 2 (book).
   Working days/hours come from the doctor record; the day's slots come
   from GET /api/appointments/slots, which also marks booked and past
   times; the booking goes through POST /api/appointments, which re-checks
   the slot and refuses a double booking. */

const HORIZON_DAYS = 21;

/* Starts from today in Gaza, whatever the device's time zone. */
function upcomingDays() {
  const days = [];
  const start = parseIsoDate(clinicToday());
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function BookAppointmentPage() {
  const { id } = useParams();
  const session = useSession();
  const doctorState = useAsync(async () => normalizeDoctor(toItem(await api.doctors.get(id))), [id]);
  const doctor = doctorState.data;

  const days = useMemo(upcomingDays, []);
  const workDays = doctor ? parseWorkDays(doctor.workDays) : null;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [form, setForm] = useState({ patientName: '', phone: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bookError, setBookError] = useState('');
  const [booked, setBooked] = useState(null);

  /* Open on the first day the doctor works. */
  useEffect(() => {
    if (!doctor || date) return;
    const first = days.find((d) => !workDays || workDays.has(d.getDay()));
    if (first) setDate(isoDate(first));
  }, [doctor, workDays, days, date]);

  useEffect(() => {
    if (!session) return;
    setForm((f) => ({ ...f, patientName: f.patientName || session.user.fullName || '', phone: f.phone || session.user.phone || '' }));
  }, [session]);

  const slotsState = useAsync(async () => (date ? api.appointments.slots(id, date) : null), [id, date]);
  const slots = slotsState.data;

  const pickDate = (value) => { setDate(value); setTime(''); setBookError(''); };

  const review = (event) => {
    event.preventDefault();
    const next = {};
    if (!time) next.time = 'اختر وقتاً من الأوقات المتاحة.';
    if (form.patientName.trim().length < 3) next.patientName = 'أدخل اسم المريض الكامل.';
    if (!validate.phone(form.phone)) next.phone = 'رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.';
    if (form.notes.length > 1000) next.notes = 'الملاحظات يجب ألا تتجاوز 1000 حرف.';
    setErrors(next);
    if (!Object.keys(next).length) setConfirming(true);
  };

  const book = async () => {
    setBusy(true);
    setBookError('');
    try {
      const response = await api.appointments.book({ doctorId: doctor.id, date, time, ...form });
      setBooked(response.appointment);
      setConfirming(false);
      notifications.add({
        type: 'confirmation',
        title: 'تم طلب حجز الموعد',
        message: 'موعدك مع ' + doctor.name + ' يوم ' + WEEKDAYS_AR[new Date(date + 'T00:00').getDay()] + ' ' + formatDate(date) + ' الساعة ' + timeLabel(time) + '.',
        ref: response.appointment.id
      });
    } catch (error) {
      setConfirming(false);
      const fields = fieldErrors(error);
      if (Object.keys(fields).length) {
        setErrors({ patientName: fields.PatientName, phone: fields.Phone, notes: fields.Notes, time: fields.Time || fields.Date });
      }
      setBookError(error.message);
      if (error.status === 409) {
        setTime('');
        slotsState.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  if (booked) {
    return (
      <>
        <PageHeader title="حجز موعد" subtitle="تم تأكيد الحجز" />
        <PageBody narrow>
          <Card className="items-center text-center py-space-2xl">
            <span className="w-20 h-20 rounded-full bg-state-success-subtle text-state-success flex items-center justify-center">
              <Icon name="event_available" className="text-[46px]" />
            </span>
            <h1 className="font-headline-xl text-headline-xl text-text-heading">بانتظار تأكيد الطبيب</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm w-full text-right">
              <InfoRow icon="stethoscope" label="الطبيب">{booked.doctorName}</InfoRow>
              <InfoRow icon="event" label="التاريخ">{WEEKDAYS_AR[new Date(booked.date + 'T00:00').getDay()] + ' ' + formatDate(booked.date)}</InfoRow>
              <InfoRow icon="schedule" label="الوقت">{timeLabel(booked.time) + ' - ' + timeLabel(booked.endTime)}</InfoRow>
            </div>
            <p className="font-body-md text-body-md text-text-muted">تم استلام طلب الحجز بنجاح ونحن بانتظار تأكيد الطبيب له. سنقوم بإبلاغك فور تأكيده. يمكنك إلغاء الموعد من صفحة مواعيدي.</p>
            <div className="flex flex-wrap items-center justify-center gap-space-xs">
              <ButtonLink href={'/appointments/' + encodeURIComponent(booked.id)} icon="visibility">تفاصيل الموعد</ButtonLink>
              <ButtonLink href="/appointments" tone="soft" icon="calendar_month">كل مواعيدي</ButtonLink>
            </div>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="حجز موعد" subtitle="اختر اليوم والوقت المناسب من جدول الطبيب" />
      <PageBody>
        <RoleGate allow={['Patient', 'Donor']} message="حجز المواعيد متاح لحسابات المرضى">
          <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
            <Link href="/doctors" className="hover:text-text-primary">البحث عن طبيب</Link>
            <Icon name="chevron_left" className="text-[18px]" />
            <Link href={'/doctors/' + encodeURIComponent(id)} className="hover:text-text-primary">{doctor ? doctor.name : '…'}</Link>
            <Icon name="chevron_left" className="text-[18px]" />
            <span className="text-text-body">حجز موعد</span>
          </nav>

          <AsyncBlock state={doctorState}>
            {doctor ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-start">
                <div className="lg:col-span-2 flex flex-col gap-space-lg">
                  {/* Doctor + schedule */}
                  <Card>
                    <div className="flex items-center gap-space-sm">
                      <img src={doctor.image || DOCTOR_FALLBACK_AVATAR} alt="" className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                      <div className="flex flex-col">
                        <span className="font-headline-md text-headline-md text-text-heading">{doctor.name}</span>
                        <span className="font-label-md text-label-md text-text-primary">{doctor.specialization}</span>
                        {doctor.facilityName ? <span className="font-body-sm text-body-sm text-text-muted">{doctor.facilityName}</span> : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                      <InfoRow icon="calendar_month" label="أيام العمل">{doctor.workDays}</InfoRow>
                      <InfoRow icon="schedule" label="ساعات العمل">{doctor.workHours}</InfoRow>
                      <InfoRow icon="timer" label="مدة الكشف">{(slots && slots.durationMinutes) || doctor.durationMinutes ? ((slots && slots.durationMinutes) || doctor.durationMinutes) + ' دقيقة' : ''}</InfoRow>
                    </div>
                  </Card>

                  {/* Date */}
                  <Card>
                    <CardTitle icon="event">اختر اليوم</CardTitle>
                    <div className="flex gap-space-2xs overflow-x-auto pb-2 -mx-1 px-1" role="listbox" aria-label="الأيام المتاحة">
                      {days.map((d) => {
                        const value = isoDate(d);
                        const works = !workDays || workDays.has(d.getDay());
                        const active = value === date;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="option"
                            aria-selected={active}
                            disabled={!works}
                            onClick={() => pickDate(value)}
                            title={works ? '' : 'الطبيب لا يعمل في هذا اليوم'}
                            className={
                              'flex flex-col items-center min-w-[4.5rem] px-space-xs py-space-2xs rounded-xl transition-all shrink-0 ' +
                              (active ? 'bg-primary-container text-on-primary shadow-md'
                                : works ? 'bg-surface-subtle text-text-body hover:bg-surface-container-high'
                                  : 'bg-surface-subtle text-text-muted/50 line-through cursor-not-allowed')
                            }
                          >
                            <span className="font-label-sm text-label-sm">{WEEKDAYS_AR[d.getDay()]}</span>
                            <span className="font-headline-md text-headline-md leading-tight">{d.getDate()}</span>
                            <span className="font-label-sm text-label-sm opacity-80">{new Intl.DateTimeFormat('ar', { month: 'short' }).format(d)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Slots */}
                  <Card>
                    <CardTitle icon="schedule">
                      الأوقات المتاحة {date ? <span className="font-body-md text-body-md text-text-muted">— {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span> : null}
                    </CardTitle>
                    {slotsState.loading ? <Skeleton count={1} /> : null}
                    {slotsState.error ? (
                      <div className="p-space-sm rounded-xl bg-state-danger-subtle text-state-danger font-label-md text-label-md flex items-center gap-2">
                        <Icon name="error" /> {slotsState.error.message}
                        <button type="button" className="underline mr-auto" onClick={slotsState.reload}>إعادة المحاولة</button>
                      </div>
                    ) : null}
                    {slots && !slotsState.loading && slots.date === date ? (
                      !slots.knownHours ? (
                        <p className="font-body-md text-body-md text-text-muted">لم يحدد الطبيب ساعات عمل يمكن قراءتها ({doctor.workHours || 'غير متوفرة'}). تواصل مع العيادة مباشرة.</p>
                      ) : !slots.worksThatDay ? (
                        <p className="font-body-md text-body-md text-text-muted">الطبيب لا يعمل في هذا اليوم. اختر يوماً آخر.</p>
                      ) : !slots.slots.length ? (
                        <p className="font-body-md text-body-md text-text-muted">لا توجد أوقات في هذا اليوم.</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-space-2xs">
                            {slots.slots.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => { setTime(slot.time); setErrors({ ...errors, time: '' }); }}
                                aria-pressed={time === slot.time}
                                title={slot.reason === 'booked' ? 'محجوز' : slot.reason === 'past' ? 'انتهى الوقت' : ''}
                                className={
                                  'py-2 rounded-lg font-label-md text-label-md transition-all ' +
                                  (time === slot.time ? 'bg-primary-container text-on-primary shadow-md'
                                    : slot.available ? 'bg-state-success-subtle text-state-success hover:bg-primary-container hover:text-on-primary'
                                      : 'bg-surface-subtle text-text-muted/60 line-through cursor-not-allowed')
                                }
                              >
                                {timeLabel(slot.time)}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-space-sm font-label-sm text-label-sm text-text-muted">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-state-success-subtle border border-state-success/30" /> متاح</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-surface-subtle border border-border-soft" /> محجوز أو منتهٍ</span>
                            <span>{slots.slots.filter((s) => s.available).length} من {slots.slots.length} متاحة</span>
                          </div>
                        </>
                      )
                    ) : null}
                    {errors.time ? <p className="font-label-sm text-label-sm text-state-danger" role="alert">{errors.time}</p> : null}
                  </Card>
                </div>

                {/* Booking form */}
                <Card className="lg:sticky lg:top-space-md">
                  <CardTitle icon="edit_calendar">بيانات الحجز</CardTitle>
                  <div className="flex flex-col gap-space-2xs p-space-sm rounded-xl bg-surface-subtle font-body-md text-body-md">
                    <span className="flex items-center gap-2"><Icon name="stethoscope" className="text-text-primary text-[20px]" />{doctor.name}</span>
                    <span className="flex items-center gap-2"><Icon name="event" className="text-text-primary text-[20px]" />{date ? formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'لم يُختر اليوم'}</span>
                    <span className={'flex items-center gap-2 ' + (time ? '' : 'text-text-muted')}><Icon name="schedule" className="text-text-primary text-[20px]" />{time ? timeLabel(time) : 'لم يُختر الوقت'}</span>
                  </div>
                  <form className="flex flex-col gap-space-sm" onSubmit={review} noValidate>
                    <Field label="اسم المريض الكامل" htmlFor="b-name" required error={errors.patientName}>
                      <input id="b-name" className={inputClass} value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
                    </Field>
                    <Field label="رقم الهاتف" htmlFor="b-phone" required error={errors.phone}>
                      <input id="b-phone" className={inputClass + ' text-left'} dir="ltr" inputMode="numeric" maxLength={10} placeholder="05XXXXXXXX"
                        value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })} />
                    </Field>
                    <Field label="سبب الزيارة (اختياري)" htmlFor="b-notes" error={errors.notes}>
                      <textarea id="b-notes" rows={2} className={inputClass + ' resize-none'} value={form.notes} maxLength={1000}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="اذكر بإيجاز سبب الاستشارة" />
                    </Field>
                    {bookError ? (
                      <div className="p-space-sm rounded-xl bg-state-danger-subtle text-state-danger font-label-md text-label-md flex items-start gap-2" role="alert">
                        <Icon name="error" className="text-[20px]" />{bookError}
                      </div>
                    ) : null}
                    <Button type="submit" icon="event_available" disabled={!time}>متابعة الحجز</Button>
                  </form>
                </Card>
              </div>
            ) : null}
          </AsyncBlock>

          <Modal open={confirming} onClose={() => !busy && setConfirming(false)} title="تأكيد الحجز" eyebrow="راجع تفاصيل الموعد">
            {doctor ? (
              <div className="flex flex-col gap-space-sm">
                <InfoRow icon="stethoscope" label="الطبيب">{doctor.name + (doctor.specialization ? ' — ' + doctor.specialization : '')}</InfoRow>
                <InfoRow icon="event" label="التاريخ">{date ? formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}</InfoRow>
                <InfoRow icon="schedule" label="الوقت">{timeLabel(time)}</InfoRow>
                <InfoRow icon="person" label="المريض">{form.patientName + ' · ' + form.phone}</InfoRow>
                <div className="flex gap-space-xs pt-space-xs">
                  <Button className="flex-1" icon="check_circle" busy={busy} busyLabel="جارٍ تأكيد الحجز…" onClick={book}>تأكيد الحجز</Button>
                  <Button tone="ghost" disabled={busy} onClick={() => setConfirming(false)}>رجوع</Button>
                </div>
              </div>
            ) : null}
          </Modal>
        </RoleGate>
      </PageBody>
    </>
  );
}
