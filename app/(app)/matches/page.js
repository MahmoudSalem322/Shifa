'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import { DONATION_MANAGERS } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { MatchRow, NoMatches } from '@/components/matches';
import { AsyncBlock, Button, ButtonLink, Card, CardTitle, Icon } from '@/components/ui';

/* Module 9 — every match the account is part of. Patients see their
   requests, donors their donations, pharmacies and centres all matches
   waiting for hand-over. The admin sees every match on the platform and
   can confirm or cancel any of them. */

const TABS = [
  { key: 'reserved', label: 'بانتظار التسليم', icon: 'inventory_2' },
  { key: 'delivered', label: 'تم التسليم', icon: 'task_alt' },
  { key: 'cancelled', label: 'ملغاة', icon: 'cancel' },
  { key: '', label: 'الكل', icon: 'list' }
];

export default function MatchesPage() {
  const session = useSession();
  const reviewer = !!session && DONATION_MANAGERS.includes(session.role);
  const admin = !!session && session.role === 'Admin';
  const [tab, setTab] = useState('reserved');
  const state = useAsync(async () => (await api.matches.list()).matches, []);

  const all = state.data || [];
  const count = (key) => (key ? all.filter((m) => m.status === key).length : all.length);
  const list = useMemo(() => (tab ? all.filter((m) => m.status === tab) : all), [all, tab]);
  const asRequester = list.filter((m) => m.isRequester);
  const asDonor = list.filter((m) => m.isDonor && !m.isRequester);
  const others = list.filter((m) => !m.isRequester && !m.isDonor);

  return (
    <>
      <PageHeader
        title="مطابقة التبرعات"
        subtitle={admin ? 'كل المطابقات في المنصة: تابع التسليم أو ألغِ ما يلزم' : 'التبرعات المرتبطة بطلبات الأدوية وحالة تسليمها'}
      />
      <PageBody>
        <div className="grid grid-cols-3 gap-space-sm">
          {TABS.slice(0, 3).map((t) => (
            <div key={t.key} className="bg-surface-card rounded-xl p-space-sm shadow-sm flex flex-col sm:flex-row items-center gap-space-xs text-center sm:text-right">
              <Icon name={t.icon} className="text-[28px] text-text-primary" />
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg text-text-heading leading-none">{state.data ? count(t.key) : '—'}</span>
                <span className="font-label-sm text-label-sm text-text-muted">{t.label}</span>
              </div>
            </div>
          ))}
        </div>

        <Card>
          <CardTitle icon="join" count={list.length} actions={
            <>
              {!reviewer ? <ButtonLink href="/drug-requests" tone="soft" icon="prescriptions">طلباتي</ButtonLink> : null}
              {admin ? <ButtonLink href="/donations/review" tone="soft" icon="volunteer_activism">التبرعات المتاحة</ButtonLink> : null}
              <Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>
            </>
          }>
            {admin ? 'كل المطابقات' : 'المطابقات'}
          </CardTitle>

          <div className="flex flex-wrap gap-space-2xs" role="tablist">
            {TABS.map((t) => (
              <button key={t.key || 'all'} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={'inline-flex items-center gap-1 px-space-sm py-1.5 rounded-full font-label-md text-label-md transition-colors ' +
                  (tab === t.key ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-text-body hover:bg-surface-container-high')}>
                <Icon name={t.icon} className="text-[18px]" /> {t.label} <span className="opacity-80">({count(t.key)})</span>
              </button>
            ))}
          </div>

          <AsyncBlock state={state} empty={{ when: !!all.length && !list.length, icon: 'join', title: 'لا توجد مطابقات في هذا التبويب' }}>
            {!all.length ? <NoMatches reviewer={reviewer} admin={admin} /> : (
              <div className="flex flex-col gap-space-md">
                {[
                  { title: 'لطلباتي', items: asRequester, icon: 'prescriptions' },
                  { title: 'من تبرعاتي', items: asDonor, icon: 'volunteer_activism' },
                  { title: admin ? 'كل المطابقات' : reviewer ? 'مطابقات للتسليم' : 'أخرى', items: others, icon: 'local_shipping' }
                ].filter((group) => group.items.length).map((group) => (
                  <section key={group.title} className="flex flex-col gap-space-2xs">
                    <h3 className="font-label-lg text-label-lg text-text-muted flex items-center gap-1">
                      <Icon name={group.icon} className="text-[18px]" /> {group.title}
                    </h3>
                    {group.items.map((match) => <MatchRow key={match.id} match={match} />)}
                  </section>
                ))}
              </div>
            )}
          </AsyncBlock>
        </Card>
      </PageBody>
    </>
  );
}
