'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { formatDate, formatDateTime, geo } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { MatchActions, matchStatus } from '@/components/matches';
import { AsyncBlock, Badge, Card, CardTitle, Icon, InfoRow } from '@/components/ui';

/* Module 9 · "Display Match Details". */

const STEP_WORDS = { reserved: 'تم ربط التبرع بالطلب وحجز الكمية', delivered: 'تم تسليم الدواء', cancelled: 'أُلغيت المطابقة' };
const DOT = { reserved: 'bg-state-warning', delivered: 'bg-state-success', cancelled: 'bg-text-muted' };

export default function MatchDetailsPage() {
  const { id } = useParams();
  const state = useAsync(async () => (await api.matches.get(id)).match, [id]);
  const match = state.data;
  const status = match ? matchStatus(match.status) : null;

  return (
    <>
      <PageHeader title="تفاصيل المطابقة" subtitle={match ? match.donationMedicineName : ''} />
      <PageBody narrow>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href="/matches" className="hover:text-text-primary">مطابقة التبرعات</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body">تفاصيل المطابقة</span>
        </nav>

        <AsyncBlock state={state}>
          {match ? (
            <>
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                  <div className="flex items-start gap-space-sm">
                    <span className="w-14 h-14 rounded-xl bg-state-info-subtle text-state-info flex items-center justify-center shrink-0">
                      <Icon name="join" className="text-[30px]" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h1 className="font-headline-xl text-headline-xl text-text-heading" dir="auto">{match.donationMedicineName}</h1>
                      <span className="font-body-md text-body-md text-text-muted">{match.quantity} {match.unit} {match.status === 'delivered' ? 'سُلّمت لصاحب الطلب' : match.status === 'cancelled' ? 'أُعيدت إلى التبرع' : 'محجوزة لطلب دواء'}</span>
                    </div>
                  </div>
                  <Badge className={status.cls + ' text-label-md py-1 px-3'} icon={status.icon}>{status.label}</Badge>
                </div>

                {match.status === 'reserved' ? (
                  <p className="p-space-sm rounded-xl bg-state-info-subtle text-state-info font-body-md text-body-md flex gap-2">
                    <Icon name="info" />
                    {match.isRequester
                      ? 'الكمية محجوزة لك. ستتواصل معك ' + (match.reviewedBy || 'الجهة التي قبلت التبرع') + ' لترتيب الاستلام؛ أحضر الوصفة الطبية عند الاستلام.'
                      : match.isDonor
                        ? 'تبرعك مرتبط بطلب مريض. قد تتواصل معك الجهة المراجِعة لاستلام الدواء منك.'
                        : 'استلم الدواء من المتبرع وسلّمه للمريض بعد التحقق من الوصفة، ثم أكّد التسليم هنا.'}
                  </p>
                ) : null}

                <CardTitle icon="compare_arrows">الطلب والتبرع</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <InfoRow icon="prescriptions" label="طلب الدواء">
                    {match.isRequester
                      ? <Link href={'/drug-requests/' + match.drugRequestId} className="text-text-primary hover:underline">#{match.drugRequestId} · {match.requestMedicineName}</Link>
                      : <span>#{match.drugRequestId} · {match.requestMedicineName}</span>}
                  </InfoRow>
                  <InfoRow icon="volunteer_activism" label="التبرع">
                    {match.isDonor || match.isReviewer
                      ? <Link href={'/donations/' + match.donationId} className="text-text-primary hover:underline">{match.donationMedicineName}</Link>
                      : match.donationMedicineName}
                  </InfoRow>
                  <InfoRow icon="numbers" label="الكمية">{match.quantity + ' من ' + match.requiredQuantity + ' مطلوبة · ' + (match.unit || '')}</InfoRow>
                  <InfoRow icon="event_busy" label="انتهاء صلاحية التبرع">{formatDate(match.expiryDate)}</InfoRow>
                  <InfoRow icon="location_on" label="موقع التبرع">{geo.label(match.donationGovernorate)}</InfoRow>
                  <InfoRow icon="home_pin" label="محافظة المريض">{geo.label(match.governorate) || 'غير محددة'}</InfoRow>
                  <InfoRow icon="verified" label="الجهة المنسّقة">{match.reviewedBy || 'صيدلية / مركز صحي'}</InfoRow>
                  <InfoRow icon="event" label="تاريخ الربط">{formatDateTime(match.createdAt)}</InfoRow>
                  {match.requesterName ? <InfoRow icon="person" label="المريض">{match.requesterName}</InfoRow> : null}
                  {match.donorName ? <InfoRow icon="person" label="المتبرع">{match.donorName}</InfoRow> : null}
                  {match.donorPhone ? (
                    <InfoRow icon="call" label="هاتف المتبرع">
                      <a href={'tel:' + match.donorPhone} className="text-text-primary hover:underline" dir="ltr">{match.donorPhone}</a>
                    </InfoRow>
                  ) : null}
                  {match.donorAddress ? <InfoRow icon="pin_drop" label="عنوان الاستلام من المتبرع">{match.donorAddress}</InfoRow> : null}
                </div>

                {match.nameMatch && match.nameMatch !== 'exact' ? (
                  <p className="p-space-xs rounded-lg bg-state-warning-subtle text-state-warning font-body-sm text-body-sm flex gap-2">
                    <Icon name="warning" className="text-[20px]" />
                    الاسم في التبرع ({match.donationMedicineName}) ليس مطابقاً تماماً للطلب ({match.requestMedicineName}). يجب التحقق من التركيبة والتركيز قبل التسليم.
                  </p>
                ) : null}

                <MatchActions match={match} onDone={() => state.reload()} />
              </Card>

              <Card>
                <CardTitle icon="timeline">سجل المطابقة</CardTitle>
                <ol className="flex flex-col gap-space-sm border-r-2 border-border-soft pr-space-md">
                  {(match.history || []).map((entry, index) => (
                    <li key={index} className="relative">
                      <span className={'absolute -right-[calc(1.5rem+7px)] top-1 w-3 h-3 rounded-full ' + (DOT[entry.status] || 'bg-state-info')} />
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg text-text-heading">{STEP_WORDS[entry.status] || entry.status}</span>
                        <span className="font-body-sm text-body-sm text-text-muted">{formatDateTime(entry.at)}{entry.by ? ' · ' + entry.by : ''}</span>
                        {entry.note ? <span className="font-body-sm text-body-sm text-text-body mt-1">{entry.note}</span> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}
