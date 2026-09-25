'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync, useDebounced, useSession } from '@/lib/hooks';
import { DONATION_MANAGERS, geo } from '@/lib/vocab';
import { ACCEPTED } from '@/components/donations';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { DonationCard } from '@/components/donations';
import { ReviewActions } from '@/components/review-actions';
import { AsyncBlock, Button, ButtonLink, Card, CardTitle, Icon } from '@/components/ui';

/* Module 8 · Feature 2 — review donations (pharmacies and health centres).
   Lists every donation with its medicine, quantity and expiry; pending
   ones can be approved or rejected in place. The admin manages the same
   queue, withdrawn donations included. */

const TABS = [
  { key: 'pending', label: 'بانتظار المراجعة', icon: 'hourglass_top' },
  { key: 'approved', label: 'المقبولة', icon: 'verified' },
  { key: 'rejected', label: 'المرفوضة', icon: 'block' },
  { key: '', label: 'الكل', icon: 'list' }
];

const WITHDRAWN_TAB = { key: 'withdrawn', label: 'المسحوبة', icon: 'undo' };

export default function ReviewDonationsPage() {
  const session = useSession();
  const admin = !!session && session.role === 'Admin';
  const tabs = admin ? [...TABS.slice(0, 3), WITHDRAWN_TAB, TABS[3]] : TABS;
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [sort, setSort] = useState('expiry');
  const debounced = useDebounced(query);

  const state = useAsync(() => api.donations.all(), []);
  const counts = (state.data && state.data.counts) || { pending: 0, approved: 0, rejected: 0 };

  const donations = useMemo(() => {
    let list = (state.data && state.data.donations) || [];
    if (tab) list = list.filter((d) => (tab === 'approved' ? ACCEPTED.includes(d.status) : d.status === tab));
    if (governorate) list = list.filter((d) => d.governorate === governorate);
    if (debounced.trim()) {
      const q = debounced.trim().toLowerCase();
      list = list.filter((d) => (d.medicineName + ' ' + d.donorName).toLowerCase().includes(q));
    }
    const sorted = list.slice();
    /* Soonest expiry first: those need a decision before they spoil. */
    if (sort === 'expiry') sorted.sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)));
    else if (sort === 'quantity') sorted.sort((a, b) => b.quantity - a.quantity);
    return sorted;
  }, [state.data, tab, governorate, debounced, sort]);

  const total = counts.pending + counts.approved + counts.rejected + (counts.withdrawn || 0);

  return (
    <>
      <PageHeader
        title={admin ? 'إدارة التبرعات' : 'مراجعة التبرعات'}
        subtitle={admin ? 'كل التبرعات في المنصة: راجعها وتابع حالتها وبيانات المتبرعين' : 'راجع الأدوية المتبرع بها واقبلها أو ارفضها'}
      />
      <PageBody>
        <RoleGate allow={DONATION_MANAGERS} message="مراجعة التبرعات متاحة للصيدليات والمراكز الصحية والإدارة">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
            {[
              { label: 'بانتظار المراجعة', value: counts.pending, icon: 'hourglass_top', cls: 'bg-state-warning-subtle text-state-warning' },
              { label: 'مقبولة', value: counts.approved, icon: 'verified', cls: 'bg-state-success-subtle text-state-success' },
              { label: 'مرفوضة', value: counts.rejected, icon: 'block', cls: 'bg-error-container text-state-danger' },
              { label: 'إجمالي التبرعات', value: total, icon: 'inventory_2', cls: 'bg-primary/10 text-text-primary' }
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-card rounded-xl p-space-sm shadow-sm flex items-center gap-space-sm">
                <span className={'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ' + stat.cls}><Icon name={stat.icon} /></span>
                <div className="flex flex-col">
                  <span className="font-headline-lg text-headline-lg text-text-heading leading-none">{state.data ? stat.value : '—'}</span>
                  <span className="font-label-sm text-label-sm text-text-muted">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardTitle icon="fact_check" count={donations.length} actions={<Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>}>
              قائمة التبرعات
            </CardTitle>

            <div className="flex flex-wrap gap-space-2xs" role="tablist">
              {tabs.map((t) => (
                <button key={t.key || 'all'} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                  className={'inline-flex items-center gap-1 px-space-sm py-1.5 rounded-full font-label-md text-label-md transition-colors ' +
                    (tab === t.key ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-text-body hover:bg-surface-container')}>
                  <Icon name={t.icon} className="text-[16px]" />{t.label}{t.key ? ' (' + counts[t.key] + ')' : ''}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs">
              <div className="relative">
                <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
                <input className="w-full bg-surface-subtle py-2.5 pr-10 pl-space-sm rounded-lg focus:outline-none" placeholder="ابحث باسم الدواء أو المتبرع"
                  value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
              </div>
              <select className="w-full bg-surface-subtle py-2.5 px-space-sm rounded-lg cursor-pointer focus:outline-none" value={governorate} onChange={(e) => setGovernorate(e.target.value)} aria-label="المحافظة">
                <option value="">كل المحافظات</option>
                {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
              </select>
              <select className="w-full bg-surface-subtle py-2.5 px-space-sm rounded-lg cursor-pointer focus:outline-none" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="الترتيب">
                <option value="expiry">الأقرب انتهاءً أولاً</option>
                <option value="newest">الأحدث أولاً</option>
                <option value="quantity">الأكبر كمية</option>
              </select>
            </div>

            <AsyncBlock
              state={state}
              empty={{
                when: !donations.length,
                icon: 'inbox',
                title: tab === 'pending' ? 'لا توجد تبرعات بانتظار المراجعة' : 'لا توجد تبرعات مطابقة',
                hint: 'ستظهر هنا التبرعات الجديدة فور إرسالها من المتبرعين.'
              }}
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-sm">
                {donations.map((d) => (
                  <DonationCard key={d.id} donation={d} href={'/donations/' + encodeURIComponent(d.id)}>
                    <div className="flex flex-wrap items-center justify-between gap-space-xs">
                      <ButtonLink href={'/donations/' + encodeURIComponent(d.id)} tone="soft" icon="visibility" className="!py-1.5">عرض التفاصيل</ButtonLink>
                      {d.status === 'pending' && !d.isMine ? <ReviewActions donation={d} compact onDone={() => state.reload()} /> : null}
                    </div>
                  </DonationCard>
                ))}
              </div>
            </AsyncBlock>
          </Card>
        </RoleGate>
      </PageBody>
    </>
  );
}
