'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { ACCEPTED, DonationCard } from '@/components/donations';
import { AsyncBlock, Button, ButtonLink, Card, CardTitle, Icon } from '@/components/ui';

/* Module 8 · "Display Donation Status" — the donor's own donations. */
export default function MyDonationsPage() {
  const state = useAsync(async () => (await api.donations.mine()).donations, []);
  const donations = state.data || [];
  const count = (status) => donations.filter((d) => (status === 'approved' ? ACCEPTED.includes(d.status) : d.status === status)).length;

  return (
    <>
      <PageHeader title="تبرعاتي بالأدوية" subtitle="تابع حالة الأدوية التي تبرعت بها" />
      <PageBody>
        <RoleGate allow={['Patient', 'Donor']} message="التبرع بالأدوية متاح لحسابات المتبرعين والمرضى">
          <div className="bg-gradient-to-l from-primary-container to-text-heading text-on-primary rounded-2xl p-space-md lg:p-space-lg shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Icon name="volunteer_activism" className="text-[32px]" />
              </span>
              <div>
                <h1 className="font-headline-lg text-headline-lg">لديك دواء فائض؟</h1>
                <p className="font-body-md text-body-md text-white/85">تبرّع به ليصل إلى من يحتاجه. تراجع الصيدليات المعتمدة كل تبرع قبل قبوله.</p>
              </div>
            </div>
            <Link href="/donations/new" className="inline-flex items-center justify-center gap-2 px-space-md py-3 rounded-xl bg-white text-text-heading font-label-lg text-label-lg shadow-sm hover:bg-surface-subtle shrink-0">
              <Icon name="add" /> تبرع جديد
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-space-sm">
            {[
              { label: 'قيد المراجعة', value: count('pending'), cls: 'text-state-warning', icon: 'hourglass_top' },
              { label: 'مقبولة', value: count('approved'), cls: 'text-state-success', icon: 'verified' },
              { label: 'مرفوضة', value: count('rejected'), cls: 'text-state-danger', icon: 'block' }
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-card rounded-xl p-space-sm shadow-sm flex flex-col sm:flex-row items-center gap-space-xs text-center sm:text-right">
                <Icon name={stat.icon} className={'text-[28px] ' + stat.cls} />
                <div className="flex flex-col">
                  <span className="font-headline-lg text-headline-lg text-text-heading leading-none">{stat.value}</span>
                  <span className="font-label-sm text-label-sm text-text-muted">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardTitle icon="inventory_2" count={donations.length} actions={<Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>}>
              سجل التبرعات
            </CardTitle>
            <AsyncBlock
              state={state}
              empty={{
                when: !donations.length,
                icon: 'volunteer_activism',
                title: 'لم تتبرع بأي دواء بعد',
                hint: 'أضف تبرعك الأول وسيظهر هنا مع حالته.',
                action: <Link href="/donations/new" className="shifa-state__action">تبرع الآن</Link>
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-sm">
                {donations.map((d) => (
                  <DonationCard key={d.id} donation={d} href={'/donations/' + encodeURIComponent(d.id)}>
                    <ButtonLink href={'/donations/' + encodeURIComponent(d.id)} tone="soft" className="self-start !py-1.5">التفاصيل</ButtonLink>
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
