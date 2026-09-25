'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { clinicToday } from '@/lib/clock';
import { APPOINTMENT_STATUS, formatDate, timeLabel } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { selectClass, useAdminAction } from '@/components/admin-kit';
import { AsyncBlock, Badge, Button, Card, CardTitle, Icon } from '@/components/ui';

/* Admin: every booking on the platform (GET /api/appointments?as=admin),
   with any status change and deletion. The patient and doctor are told. */

const SETTABLE = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];

const TABS = [
  { key: 'today', label: 'اليوم', icon: 'today' },
  { key: 'upcoming', label: 'القادمة', icon: 'event_upcoming' },
  { key: 'previous', label: 'السابقة', icon: 'history' },
  { key: '', label: 'الكل', icon: 'list' }
];

function inTab(appointment, key, today) {
  if (key === 'today') return appointment.date === today;
  if (key === 'upcoming') return appointment.upcoming;
  if (key === 'previous') return !appointment.upcoming && appointment.date !== today;
  return true;
}

export default function AdminAppointmentsPage() {
  const [tab, setTab] = useState('upcoming');
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const state = useAsync(async () => (await api.appointments.all()).appointments, []);
  const { busy, run } = useAdminAction(state.reload);

  const today = clinicToday();
  const all = useMemo(() => state.data || [], [state.data]);

  const list = useMemo(() => {
    let items = all.filter((a) => inTab(a, tab, today));
    const q = debounced.trim().toLowerCase();
    if (q) items = items.filter((a) => [a.patientName, a.doctorName, a.specialization, a.phone].join(' ').toLowerCase().includes(q));
    /* Upcoming reads soonest first; history reads newest first. */
    return tab === 'upcoming' || tab === 'today' ? items.slice().reverse() : items;
  }, [all, tab, debounced, today]);

  return (
    <>
      <PageHeader title="كل المواعيد" subtitle="حجوزات المرضى عند جميع الأطباء: تعديل الحالة والحذف" />
      <PageBody>
        <RoleGate allow={['Admin']} message="هذه الصفحة متاحة للإدارة فقط">
          <Card>
            <CardTitle icon="event_note" count={list.length} actions={<Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>}>
              المواعيد
            </CardTitle>

            <div className="flex flex-wrap gap-space-2xs" role="tablist">
              {TABS.map((t) => (
                <button key={t.key || 'all'} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                  className={'inline-flex items-center gap-1 px-space-sm py-1.5 rounded-full font-label-md text-label-md transition-colors ' +
                    (tab === t.key ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-text-body hover:bg-surface-container')}>
                  <Icon name={t.icon} className="text-[16px]" />{t.label} ({all.filter((a) => inTab(a, t.key, today)).length})
                </button>
              ))}
            </div>

            <div className="relative md:max-w-sm">
              <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
              <input className="w-full bg-surface-subtle py-2.5 pr-10 pl-space-sm rounded-lg focus:outline-none" placeholder="ابحث باسم المريض أو الطبيب"
                value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
            </div>

            <AsyncBlock state={state} empty={{ when: !list.length, icon: 'event_available', title: 'لا توجد مواعيد في هذا التبويب' }}>
              <div className="flex flex-col gap-space-xs">
                {list.map((a) => {
                  const status = APPOINTMENT_STATUS[a.status] || APPOINTMENT_STATUS.pending;
                  return (
                    <div key={a.id} className="flex flex-col md:flex-row md:items-center justify-between gap-space-xs p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex items-start gap-space-sm min-w-0">
                        <span className="w-11 h-11 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center shrink-0"><Icon name="event" /></span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-headline-sm text-headline-sm text-text-heading truncate">{a.patientName || 'مريض'}</span>
                          <span className="font-body-sm text-body-sm text-text-muted truncate">
                            {a.doctorName}{a.specialization ? ' · ' + a.specialization : ''}
                          </span>
                          {a.phone ? <span className="font-body-sm text-body-sm text-text-muted" dir="ltr">{a.phone}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-2xs shrink-0">
                        <span className="font-label-md text-label-md text-text-body">{formatDate(a.date, { day: 'numeric', month: 'short', year: 'numeric' })} · {timeLabel(a.time)}</span>
                        <Badge className={status.cls}>{status.label}</Badge>
                        <select className={selectClass + ' !py-1.5'} value="" aria-label="تغيير الحالة" disabled={busy === 'st' + a.id}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (!next) return;
                            const reason = next === 'cancelled' ? window.prompt('سبب الإلغاء (يصل إلى المريض):', '') : '';
                            if (reason === null) return;
                            run('st' + a.id, () => api.admin.appointments.setStatus(a.id, next, reason || ''), { confirm: next === 'cancelled' ? null : 'تغيير حالة الموعد إلى "' + APPOINTMENT_STATUS[next].label + '"؟' });
                          }}>
                          <option value="">تغيير الحالة…</option>
                          {SETTABLE.filter((s) => s !== (a.recordedStatus || a.status)).map((s) => <option key={s} value={s}>{APPOINTMENT_STATUS[s].label}</option>)}
                        </select>
                        <Button tone="danger" icon="delete" className="!py-1.5" busy={busy === 'del' + a.id} busyLabel="…"
                          onClick={() => run('del' + a.id, () => api.admin.appointments.remove(a.id), { confirm: 'حذف موعد ' + (a.patientName || '') + ' نهائياً؟' })}>حذف</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AsyncBlock>
          </Card>
        </RoleGate>
      </PageBody>
    </>
  );
}
