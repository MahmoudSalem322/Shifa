'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, toItem, toList } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { facilityTypeLabel, geo, normalizeDoctor, normalizeFacility, statusLabel } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { DoctorCard } from '@/components/doctor-card';
import { AsyncBlock, Card, CardTitle, Icon, InfoRow } from '@/components/ui';

/* Port of facility-details.html, filled from GET /api/facilities/{id}.
   Doctors come from GET /api/doctors matched on facilityId. The capacity
   figures and department write-ups the static page invented are gone. */
export default function FacilityDetailsPage() {
  const { id } = useParams();
  const state = useAsync(async () => normalizeFacility(toItem(await api.facilities.get(id))), [id]);
  const doctors = useAsync(async () => toList(await api.doctors.list()).map(normalizeDoctor)
    .filter((d) => d && String(d.facilityId) === String(id)), [id]);
  const f = state.data;

  const mapQuery = f ? (f.latitude && f.longitude ? f.latitude + ',' + f.longitude : [f.name, f.address, 'غزة'].filter(Boolean).join(' ')) : '';

  return (
    <>
      <PageHeader title="تفاصيل المنشأة الصحية" subtitle={f ? f.name : ''} />
      <PageBody>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href="/facilities" className="hover:text-text-primary">المراكز والمستشفيات</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body">{f ? f.name : '…'}</span>
        </nav>

        <AsyncBlock state={state}>
          {f ? (
            <>
              {f.emergency ? (
                <div className="bg-state-danger text-on-error rounded-xl p-space-sm flex items-center justify-between gap-space-sm">
                  <span className="flex items-center gap-2 font-label-lg text-label-lg"><Icon name="emergency" /> قسم الطوارئ يستقبل الحالات على مدار الساعة</span>
                  {f.phone ? <a href={'tel:' + f.phone} className="px-space-sm py-1.5 rounded-lg bg-surface-card text-state-danger font-label-md text-label-md shrink-0">اتصال</a> : null}
                </div>
              ) : null}

              <div className="bg-surface-card rounded-2xl overflow-hidden shadow-sm">
                <div className="relative h-48 md:h-64 bg-surface-container">
                  {f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary-container to-secondary-container" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-space-md flex flex-col gap-1 text-white">
                    {f.type ? <span className="self-start px-space-xs py-1 rounded-full bg-surface-card/90 text-text-heading font-label-sm text-label-sm">{facilityTypeLabel(f.type)}</span> : null}
                    <h1 className="font-headline-xl text-headline-xl text-white">{f.name}</h1>
                    <div className="flex flex-wrap items-center gap-space-sm font-body-sm text-body-sm text-white/90">
                      {f.rating ? <span className="flex items-center gap-1"><Icon name="star" filled className="text-state-warning text-[18px]" />{f.rating.toFixed(1)}{f.reviewsCount ? ' (' + f.reviewsCount + ' تقييم)' : ''}</span> : null}
                      {f.address ? <span className="flex items-center gap-1"><Icon name="location_on" className="text-[18px]" />{f.address}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="p-space-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
                  <InfoRow icon="schedule" label="مواعيد العمل">{f.workingHours}</InfoRow>
                  <InfoRow icon="monitor_heart" label="حالة التشغيل">{statusLabel(f.status) || (f.emergency ? 'جاهزية الاستقبال نشطة' : '')}</InfoRow>
                  <InfoRow icon="call" label="الاستقبال">{f.phone ? <a href={'tel:' + f.phone} className="text-text-primary hover:underline" dir="ltr">{f.phone}</a> : null}</InfoRow>
                  <InfoRow icon="map" label="المحافظة">{geo.label(f.area) || geo.label(f.address)}</InfoRow>
                </div>
              </div>

              <Card>
                <CardTitle icon="health_and_safety" count={f.services.length}>الخدمات والأقسام</CardTitle>
                {f.services.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-space-sm">
                    {f.services.map((s) => (
                      <div key={s.name} className="p-space-sm rounded-xl bg-surface-subtle flex flex-col items-center text-center gap-space-2xs">
                        <Icon name="health_and_safety" className="text-[30px] text-primary" />
                        <span className="font-label-lg text-label-lg text-text-heading">{s.name}</span>
                        {s.status ? <span className={'font-label-sm text-label-sm ' + (s.status === 'Closed' ? 'text-state-danger' : 'text-state-success')}>{statusLabel(s.status)}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : <p className="font-body-md text-body-md text-text-muted">لم تسجّل المنشأة خدماتها بعد.</p>}
              </Card>

              <Card>
                <CardTitle icon="stethoscope" count={(doctors.data || []).length}>أطباء المنشأة</CardTitle>
                <AsyncBlock state={doctors} skeleton={2} empty={{ when: !(doctors.data || []).length, icon: 'person_off', title: 'لا يوجد أطباء مسجّلون في هذه المنشأة' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-sm">
                    {(doctors.data || []).slice(0, 9).map((d) => <DoctorCard key={d.id} doctor={d} />)}
                  </div>
                </AsyncBlock>
              </Card>

              <Card>
                <CardTitle icon="location_city">الموقع</CardTitle>
                <p className="font-body-md text-body-md text-text-body">{f.address || 'لم يُحدد العنوان.'}</p>
                {mapQuery ? (
                  <a className="inline-flex items-center gap-1.5 self-start px-space-sm py-2 rounded-lg bg-surface-container-low text-text-primary hover:bg-primary-container hover:text-on-primary font-label-md text-label-md transition-colors"
                    href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery)} target="_blank" rel="noopener noreferrer">
                    <Icon name="directions" /> فتح في خرائط Google
                  </a>
                ) : null}
              </Card>
            </>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}
