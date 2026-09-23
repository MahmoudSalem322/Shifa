'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api, toList } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { drugRequestStatus, formatDate, normalizeDrugRequest } from '@/lib/vocab';
import { applyMatchStatus } from '@/lib/matching';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { AsyncBlock, Badge, Button, ButtonLink, Card, CardTitle, Icon } from '@/components/ui';

/* Module 5 · Feature 3 — track drug requests.
   GET /api/drugrequests/my, rendered with the request id, medicine,
   quantity, date and status, plus the empty state. */

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'open', label: 'قيد المعالجة' },
  { key: 'done', label: 'مكتملة' },
  { key: 'closed', label: 'مرفوضة / ملغاة' }
];

function bucket(status) {
  const key = String(status || '').toLowerCase();
  if (/fulfilled|completed|approved|delivered/.test(key)) return 'done';
  if (/rejected|cancel/.test(key)) return 'closed';
  return 'open';
}

export default function DrugRequestsPage() {
  const [filter, setFilter] = useState('all');
  const state = useAsync(async () => {
    const [response, matchList] = await Promise.all([
      api.drugRequests.mine(),
      api.matches.list({ scope: 'mine' }).catch(() => null)
    ]);
    const matches = (matchList && matchList.matches) || [];
    return toList(response).map(normalizeDrugRequest).filter(Boolean).map((r) => applyMatchStatus(r, matches));
  }, []);

  const requests = useMemo(() => {
    const list = (state.data || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return filter === 'all' ? list : list.filter((r) => bucket(r.status) === filter);
  }, [state.data, filter]);

  const counts = useMemo(() => {
    const all = state.data || [];
    return {
      all: all.length,
      open: all.filter((r) => bucket(r.status) === 'open').length,
      done: all.filter((r) => bucket(r.status) === 'done').length,
      closed: all.filter((r) => bucket(r.status) === 'closed').length
    };
  }, [state.data]);

  return (
    <>
      <PageHeader title="طلبات الأدوية" subtitle="تابع حالة طلبات الأدوية التي أرسلتها" />
      <PageBody>
        <RoleGate allow={['Patient', 'Donor']} message="طلبات الأدوية متاحة لحسابات المرضى">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
            {[
              { label: 'إجمالي الطلبات', value: counts.all, icon: 'receipt_long', cls: 'bg-primary/10 text-text-primary' },
              { label: 'قيد المعالجة', value: counts.open, icon: 'pending_actions', cls: 'bg-state-warning-subtle text-state-warning' },
              { label: 'مكتملة', value: counts.done, icon: 'task_alt', cls: 'bg-state-success-subtle text-state-success' },
              { label: 'مرفوضة / ملغاة', value: counts.closed, icon: 'block', cls: 'bg-error-container text-state-danger' }
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-card rounded-xl p-space-sm shadow-sm flex items-center gap-space-sm">
                <span className={'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ' + stat.cls}><Icon name={stat.icon} /></span>
                <div className="flex flex-col">
                  <span className="font-headline-lg text-headline-lg text-text-heading leading-none">{state.loading && !state.data ? '—' : stat.value}</span>
                  <span className="font-label-sm text-label-sm text-text-muted">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardTitle
              icon="prescriptions"
              count={requests.length}
              actions={<>
                <Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>
                <ButtonLink href="/drug-requests/new" icon="add">طلب دواء جديد</ButtonLink>
              </>}
            >
              طلباتي
            </CardTitle>

            <div className="flex flex-wrap gap-space-2xs" role="tablist" aria-label="تصفية حسب الحالة">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={
                    'px-space-sm py-1.5 rounded-full font-label-md text-label-md transition-colors ' +
                    (filter === f.key ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-text-body hover:bg-surface-container')
                  }
                >
                  {f.label} ({counts[f.key]})
                </button>
              ))}
            </div>

            <AsyncBlock
              state={state}
              empty={{
                when: !requests.length,
                icon: 'medication',
                title: filter === 'all' ? 'لا توجد طلبات أدوية بعد' : 'لا توجد طلبات بهذه الحالة',
                hint: filter === 'all' ? 'أرسل طلبك الأول وأرفق وصفتك الطبية، وستظهر حالته هنا.' : 'جرّب تصفية أخرى.',
                action: filter === 'all' ? <Link href="/drug-requests/new" className="shifa-state__action">طلب دواء جديد</Link> : null
              }}
            >
              {/* Table on wide screens, cards on narrow ones. */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="font-label-md text-label-md text-text-muted border-b border-border-soft">
                      <th className="py-space-xs px-space-xs font-semibold">رقم الطلب</th>
                      <th className="py-space-xs px-space-xs font-semibold">الدواء</th>
                      <th className="py-space-xs px-space-xs font-semibold">الكمية</th>
                      <th className="py-space-xs px-space-xs font-semibold">تاريخ الطلب</th>
                      <th className="py-space-xs px-space-xs font-semibold">الحالة</th>
                      <th className="py-space-xs px-space-xs" />
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => {
                      const status = drugRequestStatus(r.status);
                      return (
                        <tr key={r.id} className="border-b border-border-soft/70 hover:bg-surface-subtle transition-colors">
                          <td className="py-space-sm px-space-xs font-label-lg text-label-lg text-text-primary" dir="ltr">#{r.id}</td>
                          <td className="py-space-sm px-space-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-label-lg text-label-lg text-text-heading">{r.medicineName}</span>
                              {r.hasPrescription ? <Icon name="attach_file" className="text-[18px] text-text-muted" title="مرفق وصفة" /> : null}
                            </div>
                          </td>
                          <td className="py-space-sm px-space-xs font-body-md text-body-md">{r.quantity || '—'}</td>
                          <td className="py-space-sm px-space-xs font-body-sm text-body-sm text-text-muted">{formatDate(r.createdAt) || '—'}</td>
                          <td className="py-space-sm px-space-xs"><Badge className={status.cls} icon={status.icon}>{status.label}</Badge></td>
                          <td className="py-space-sm px-space-xs text-left">
                            <Link href={'/drug-requests/' + encodeURIComponent(r.id)} className="inline-flex items-center gap-1 text-text-primary font-label-md text-label-md hover:underline">
                              التفاصيل <Icon name="arrow_back" className="text-[16px]" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden flex flex-col gap-space-xs">
                {requests.map((r) => {
                  const status = drugRequestStatus(r.status);
                  return (
                    <Link key={r.id} href={'/drug-requests/' + encodeURIComponent(r.id)} className="flex flex-col gap-1 p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label-lg text-label-lg text-text-heading">{r.medicineName}</span>
                        <Badge className={status.cls}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-space-sm font-body-sm text-body-sm text-text-muted">
                        <span dir="ltr">#{r.id}</span>
                        <span>الكمية: {r.quantity || '—'}</span>
                        <span>{formatDate(r.createdAt)}</span>
                      </div>
                    </Link>
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
