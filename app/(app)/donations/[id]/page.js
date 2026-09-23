'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import { formatDate, formatDateTime, geo, REVIEWER_ROLES, roles } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { donationStatus, ExpiryBadge } from '@/components/donations';
import { RequestMatches } from '@/components/matches';
import { ReviewActions } from '@/components/review-actions';
import { AsyncBlock, Badge, Card, CardTitle, Icon, InfoRow } from '@/components/ui';

const STATUS_WORDS = { pending: 'أُرسل التبرع', approved: 'تم القبول', rejected: 'تم الرفض', matched: 'حُجزت الكمية كاملة لطلبات أدوية', delivered: 'تم تسليم التبرع' };

/* Module 8 · "Display Donation Details" — shared by donor and reviewer. */
export default function DonationDetailsPage() {
  const { id } = useParams();
  const session = useSession();
  const state = useAsync(async () => (await api.donations.get(id)).donation, [id]);
  const matchesState = useAsync(async () => (await api.matches.list({ donationId: id })).matches, [id]);
  const donation = state.data;
  const matches = matchesState.data || [];
  const reviewer = session && REVIEWER_ROLES.includes(session.role);

  return (
    <>
      <PageHeader title="تفاصيل التبرع" subtitle={donation ? donation.medicineName : ''} />
      <PageBody narrow>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href={reviewer ? '/donations/review' : '/donations'} className="hover:text-text-primary">{reviewer ? 'مراجعة التبرعات' : 'تبرعاتي'}</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body">تفاصيل التبرع</span>
        </nav>

        <AsyncBlock state={state}>
          {donation ? (
            <>
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                  <div className="flex items-start gap-space-sm">
                    <span className="w-14 h-14 rounded-xl bg-state-success-subtle text-state-success flex items-center justify-center shrink-0">
                      <Icon name="medication" className="text-[30px]" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h1 className="font-headline-xl text-headline-xl text-text-heading" dir="auto">{donation.medicineName}</h1>
                      <ExpiryBadge expiryDate={donation.expiryDate} days={donation.daysToExpiry} />
                    </div>
                  </div>
                  <Badge className={donationStatus(donation.status).cls + ' text-label-md py-1 px-3'} icon={donationStatus(donation.status).icon}>
                    {donationStatus(donation.status).label}
                  </Badge>
                </div>

                <CardTitle icon="medication_liquid">معلومات الدواء</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                  <InfoRow icon="numbers" label="الكمية">
                    {donation.quantity + ' ' + donation.unit}
                    {donation.availableQuantity !== undefined && donation.availableQuantity < donation.quantity ? ' · المتاح ' + donation.availableQuantity : ''}
                  </InfoRow>
                  <InfoRow icon="event_busy" label="تاريخ انتهاء الصلاحية">{formatDate(donation.expiryDate)}</InfoRow>
                  <InfoRow icon="verified_user" label="حالة العبوة">{donation.condition === 'sealed' ? 'مغلقة وسليمة (بإقرار المتبرع)' : donation.condition}</InfoRow>
                </div>

                <CardTitle icon="location_on">الاستلام والتواصل</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <InfoRow icon="map" label="المحافظة">{geo.label(donation.governorate)}</InfoRow>
                  <InfoRow icon="home_pin" label="العنوان">{donation.address}</InfoRow>
                  <InfoRow icon="person" label="المتبرع">{donation.donorName}</InfoRow>
                  <InfoRow icon="call" label="الهاتف">
                    {donation.donorPhone ? <a href={'tel:' + donation.donorPhone} className="text-text-primary hover:underline" dir="ltr">{donation.donorPhone}</a> : null}
                  </InfoRow>
                </div>
                {donation.notes ? (
                  <div className="p-space-sm rounded-xl bg-surface-subtle">
                    <span className="font-label-sm text-label-sm text-text-muted block mb-1">ملاحظات المتبرع</span>
                    <p className="font-body-md text-body-md text-text-body whitespace-pre-line">{donation.notes}</p>
                  </div>
                ) : null}

                {reviewer && donation.status === 'pending' && !donation.isMine ? (
                  <ReviewActions donation={donation} onDone={() => state.reload()} />
                ) : null}
              </Card>

              {matches.length ? (
                <Card>
                  <CardTitle icon="join" count={matches.length}>طلبات الأدوية المرتبطة</CardTitle>
                  <RequestMatches matches={matches} />
                </Card>
              ) : null}

              <Card>
                <CardTitle icon="timeline">سجل الحالة</CardTitle>
                <ol className="flex flex-col gap-space-sm border-r-2 border-border-soft pr-space-md">
                  {(donation.history || []).map((entry, index) => (
                    <li key={index} className="relative">
                      <span className={'absolute -right-[calc(1.5rem+7px)] top-1 w-3 h-3 rounded-full ' + (entry.status === 'rejected' ? 'bg-state-danger' : entry.status === 'pending' ? 'bg-state-warning' : entry.status === 'matched' ? 'bg-state-info' : 'bg-state-success')} />
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg text-text-heading">{STATUS_WORDS[entry.status] || entry.status}</span>
                        <span className="font-body-sm text-body-sm text-text-muted">{formatDateTime(entry.at)}{entry.by ? ' · ' + entry.by : ''}</span>
                        {entry.note ? <span className="font-body-sm text-body-sm text-text-body mt-1">{entry.note}</span> : null}
                      </div>
                    </li>
                  ))}
                </ol>
                {donation.reviewerRole ? (
                  <p className="font-body-sm text-body-sm text-text-muted">راجعته جهة من نوع: {roles.toArabic(donation.reviewerRole)}</p>
                ) : null}
              </Card>
            </>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}
