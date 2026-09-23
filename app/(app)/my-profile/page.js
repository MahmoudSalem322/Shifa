'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, auth, toItem, toList } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { buildSlots, parseWorkDays, parseWorkHours, minutesToHHMM } from '@/lib/schedule';
import { normalizeDoctor, normalizeFacility, timeLabel, validate, WEEKDAYS_AR } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { useToast } from '@/components/toast';
import { AsyncBlock, Button, Card, CardTitle, Field, Icon, inputClass } from '@/components/ui';

/* Port of my-profile.html — the doctor's full editor.
   UpdateDoctorProfileRequestDto models the week as two strings, so the
   per-day table is flattened: enabled days → workDays, one shared window
   → workHours. Those two strings are exactly what the booking page turns
   into slots, so a live preview of the resulting slots is shown here. */

const MAX_BIO = 1000;
const DEFAULT_WINDOW = { from: '09:00', to: '14:00' };

export default function DoctorProfileEditorPage() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [days, setDays] = useState(() => WEEKDAYS_AR.map(() => false));
  const [hours, setHours] = useState(DEFAULT_WINDOW);
  const [busy, setBusy] = useState(false);

  const state = useAsync(async () => {
    const raw = toItem(await api.doctors.me()) || {};
    const doctor = normalizeDoctor(raw);
    let facilities = [];
    try {
      facilities = toList(await api.facilities.list()).map(normalizeFacility).filter(Boolean);
    } catch { /* doctors may get 403 here */ }
    if (!facilities.length && doctor.facilityId != null) facilities = [{ id: doctor.facilityId, name: doctor.facilityName || 'المنشأة #' + doctor.facilityId }];
    return { raw, doctor, facilities };
  }, []);

  useEffect(() => {
    if (!state.data) return;
    const d = state.data.doctor;
    setForm({
      fullName: d.name === 'طبيب' ? '' : d.name, specialization: d.specialization, licenseNumber: d.licenseNumber,
      yearsOfExperience: d.experience ? String(d.experience) : '', bio: d.bio, phone: d.phone,
      facilityId: d.facilityId != null ? String(d.facilityId) : '', consultationDurationMinutes: String(d.durationMinutes || 20)
    });
    const parsedDays = parseWorkDays(d.workDays);
    if (parsedDays) setDays(WEEKDAYS_AR.map((_, i) => parsedDays.has(i)));
    const windows = parseWorkHours(d.workHours);
    if (windows.length) setHours({ from: minutesToHHMM(windows[0].start), to: minutesToHHMM(windows[0].end) });
  }, [state.data]);

  const workDays = WEEKDAYS_AR.filter((_, i) => days[i]).join('، ');
  const workHours = hours.from + ' - ' + hours.to;

  const preview = useMemo(() => {
    if (!form) return null;
    const probe = new Date(2030, 0, 6); // a Sunday far in the future — nothing booked, nothing past
    return buildSlots({ date: probe, workDays: 'daily', workHours, durationMinutes: form.consultationDurationMinutes, booked: new Set(), now: new Date(2000, 0, 1) });
  }, [form, workHours]);

  const set = (key) => (event) => {
    const value = key === 'phone' ? event.target.value.replace(/[^0-9]/g, '') : event.target.value;
    setForm({ ...form, [key]: key === 'bio' ? value.slice(0, MAX_BIO) : value });
  };

  const save = async () => {
    const missing = [];
    if (form.fullName.trim().length < 3) missing.push('الاسم الكامل');
    if (!form.phone) missing.push('رقم الهاتف');
    if (!form.specialization.trim()) missing.push('التخصص');
    if (!form.licenseNumber.trim()) missing.push('رقم الترخيص');
    if (!form.facilityId) missing.push('المنشأة');
    if (!workDays) missing.push('أيام العمل');
    if (missing.length) return toast('يرجى استكمال: ' + missing.join('، '));
    if (!validate.phone(form.phone)) return toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.');
    if (hours.from >= hours.to) return toast('وقت نهاية الدوام يجب أن يكون بعد وقت البداية.');

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
        workDays,
        workHours,
        consultationDurationMinutes: Number(form.consultationDurationMinutes) || 20
      });
      auth.mergeSession({ fullName: form.fullName.trim(), phone: form.phone });
      toast('تم حفظ التعديلات بنجاح.');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const facilities = (state.data && state.data.facilities) || [];

  return (
    <>
      <PageHeader title="لوحة تحكم الطبيب" subtitle="إدارة وتعديل الملف المهني وجدول المواعيد"
        actions={form ? <Button icon="save" busy={busy} busyLabel="جارٍ الحفظ…" onClick={save} className="hidden sm:inline-flex">حفظ</Button> : null} />
      <PageBody narrow>
        <RoleGate allow={['Doctor']} message="هذه الصفحة خاصة بحسابات الأطباء">
          <AsyncBlock state={state}>
            {form ? (
              <>
                <Card id="basic-info">
                  <CardTitle icon="badge">البيانات الأساسية</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <Field label="الاسم الكامل" htmlFor="doctor-fullname" required><input id="doctor-fullname" className={inputClass} value={form.fullName} onChange={set('fullName')} /></Field>
                    <Field label="التخصص السريري" htmlFor="doctor-speciality" required><input id="doctor-speciality" className={inputClass} value={form.specialization} onChange={set('specialization')} /></Field>
                    <Field label="رقم الترخيص" htmlFor="license-number" required><input id="license-number" className={inputClass} dir="ltr" value={form.licenseNumber} onChange={set('licenseNumber')} /></Field>
                    <Field label="سنوات الخبرة" htmlFor="exp-years"><input id="exp-years" type="number" min="0" className={inputClass} value={form.yearsOfExperience} onChange={set('yearsOfExperience')} /></Field>
                  </div>
                </Card>

                <Card id="clinical-bio">
                  <CardTitle icon="history_edu">النبذة المهنية</CardTitle>
                  <Field htmlFor="bio-textarea" hint={form.bio.length + ' / ' + MAX_BIO}>
                    <textarea id="bio-textarea" rows={6} className={inputClass + ' resize-y'} value={form.bio} onChange={set('bio')}
                      placeholder="اكتب نبذة عن خبرتك ومؤهلاتك والخدمات التي تقدمها…" />
                  </Field>
                </Card>

                <Card id="workplace">
                  <CardTitle icon="local_hospital">مقر العمل والتواصل</CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <Field label="المنشأة" htmlFor="hospital-name" required>
                      <select id="hospital-name" className={inputClass + ' cursor-pointer'} value={form.facilityId} onChange={set('facilityId')}>
                        <option value="">{facilities.length ? 'اختر المنشأة' : 'تعذّر تحميل المنشآت'}</option>
                        {facilities.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
                      </select>
                    </Field>
                    <Field label="رقم هاتف العيادة" htmlFor="phone-number" required>
                      <input id="phone-number" className={inputClass + ' text-left'} dir="ltr" maxLength={10} inputMode="numeric" placeholder="05XXXXXXXX" value={form.phone} onChange={set('phone')} />
                    </Field>
                  </div>
                </Card>

                <Card id="working-hours">
                  <CardTitle icon="calendar_month">أيام وساعات العمل</CardTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-space-2xs">
                    {WEEKDAYS_AR.map((day, i) => (
                      <label key={day} className={'flex flex-col items-center gap-1 p-space-xs rounded-xl cursor-pointer transition-colors ' + (days[i] ? 'bg-primary-container text-on-primary' : 'bg-surface-subtle text-text-muted')}>
                        <input type="checkbox" className="sr-only" checked={days[i]} onChange={(e) => setDays(days.map((v, j) => (j === i ? e.target.checked : v)))} />
                        <Icon name={days[i] ? 'check_circle' : 'radio_button_unchecked'} className="text-[20px]" />
                        <span className="font-label-md text-label-md">{day}</span>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                    <Field label="بداية الدوام" htmlFor="work-from"><input id="work-from" type="time" className={inputClass} value={hours.from} onChange={(e) => setHours({ ...hours, from: e.target.value })} /></Field>
                    <Field label="نهاية الدوام" htmlFor="work-to"><input id="work-to" type="time" className={inputClass} value={hours.to} onChange={(e) => setHours({ ...hours, to: e.target.value })} /></Field>
                    <Field label="مدة الكشف" htmlFor="session-duration">
                      <select id="session-duration" className={inputClass + ' cursor-pointer'} value={form.consultationDurationMinutes} onChange={set('consultationDurationMinutes')}>
                        {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={String(m)}>{m} دقيقة</option>)}
                      </select>
                    </Field>
                  </div>
                  {preview ? (
                    <div className="p-space-sm rounded-xl bg-state-info-subtle text-state-info flex flex-col gap-1 font-body-sm text-body-sm">
                      <span className="font-label-md text-label-md flex items-center gap-1"><Icon name="visibility" className="text-[18px]" />هكذا سيراها المرضى عند الحجز</span>
                      <span>{workDays || 'لم تختر أيام العمل'} · {timeLabel(hours.from)} - {timeLabel(hours.to)}</span>
                      <span>{preview.slots.length} موعداً في كل يوم عمل{preview.slots.length ? ' (أول موعد ' + timeLabel(preview.slots[0].time) + '، آخر موعد ' + timeLabel(preview.slots[preview.slots.length - 1].time) + ')' : ''}</span>
                    </div>
                  ) : null}
                </Card>

                <div className="sticky bottom-space-sm z-10 flex justify-end">
                  <Button icon="save" busy={busy} busyLabel="جارٍ الحفظ…" onClick={save} className="shadow-xl">حفظ كل التعديلات</Button>
                </div>
              </>
            ) : null}
          </AsyncBlock>
        </RoleGate>
      </PageBody>
    </>
  );
}
