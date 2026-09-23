'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, toItem } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { parseWorkDays } from '@/lib/schedule';
import { DOCTOR_FALLBACK_AVATAR, geo, normalizeDoctor, WEEKDAYS_AR } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { AsyncBlock, ButtonLink, Icon } from '@/components/ui';

/* Port of doctor-profile.html, filled from GET /api/doctors/{id}. The
   hardcoded reviews and map photo are gone — the API has neither. */

function StatCard({ icon, label, value, sub, children }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm border border-border-soft/60 flex flex-col gap-space-2xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-text-primary"><Icon name={icon} className="text-2xl" /></span>
        <span className="font-label-sm text-label-sm text-text-muted">{label}</span>
      </div>
      <div className="mt-space-3xs">
        {children || <span className="font-headline-sm text-headline-sm font-bold text-text-heading block leading-tight">{value || '—'}</span>}
        {sub ? <span className="font-body-sm text-body-sm text-text-muted leading-tight block mt-1">{sub}</span> : null}
      </div>
    </div>
  );
}

export default function DoctorProfilePage() {
  const { id } = useParams();
  const state = useAsync(async () => normalizeDoctor(toItem(await api.doctors.get(id))), [id]);
  const doctor = state.data;

  const days = doctor ? parseWorkDays(doctor.workDays) : null;
  const mapQuery = doctor ? (doctor.latitude && doctor.longitude
    ? doctor.latitude + ',' + doctor.longitude
    : [doctor.facilityName, doctor.facilityAddress, geo.label(doctor.area), 'غزة'].filter(Boolean).join(' ')) : '';

  return (
    <>
      <PageHeader title="الملف الشخصي للطبيب" subtitle="المعلومات المهنية ومواعيد العمل" />
      <PageBody>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href="/doctors" className="hover:text-text-primary">البحث عن طبيب</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body">{doctor ? doctor.name : '…'}</span>
        </nav>

        <AsyncBlock state={state}>
          {doctor ? (
            <>
              <div className="w-full bg-surface-container-lowest rounded-xl shadow-md p-space-md lg:p-space-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
                    <div className="relative flex-shrink-0">
                      <img src={doctor.image || DOCTOR_FALLBACK_AVATAR} alt={doctor.name} className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl object-cover shadow-sm ring-4 ring-state-info-subtle" />
                      <span className="absolute -bottom-2 -left-2 bg-state-success text-on-primary w-7 h-7 rounded-full flex items-center justify-center shadow-sm" title="طبيب متاح للحجز">
                        <Icon name="check" filled className="text-sm" />
                      </span>
                    </div>
                    <div className="flex flex-col gap-space-3xs">
                      <div className="flex items-center gap-space-2xs flex-wrap">
                        <h1 className="font-headline-xl text-headline-xl text-text-heading">{doctor.name}</h1>
                        {doctor.licenseNumber ? (
                          <span className="inline-flex items-center gap-1 px-space-2xs py-1 rounded-full bg-state-success-subtle text-state-success font-label-sm text-label-sm">
                            <Icon name="verified" filled className="text-sm" /> مرخّص · {doctor.licenseNumber}
                          </span>
                        ) : null}
                      </div>
                      <p className="font-headline-sm text-headline-sm text-text-body font-semibold">{doctor.specialization}</p>
                      <div className="flex items-center gap-space-sm flex-wrap mt-space-3xs font-body-sm text-body-sm text-text-muted">
                        {doctor.rating ? (
                          <div className="flex items-center gap-1 text-state-warning font-label-md">
                            <Icon name="star" filled className="text-base" />
                            <span className="text-text-body font-bold">{doctor.rating.toFixed(1)}</span>
                            {doctor.reviewsCount ? <span className="text-text-muted font-normal">({doctor.reviewsCount} تقييماً)</span> : null}
                          </div>
                        ) : null}
                        {doctor.facilityName || doctor.area ? (
                          <div className="flex items-center gap-1">
                            <Icon name="pin_drop" className="text-base text-text-primary" />
                            <span>{[geo.label(doctor.area), doctor.facilityName].filter(Boolean).join(' - ')}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch lg:items-end gap-space-2xs flex-shrink-0">
                    <ButtonLink href={'/doctors/' + encodeURIComponent(doctor.id) + '/book'} icon="calendar_add_on" className="!px-space-xl !py-space-sm font-headline-sm text-headline-sm">
                      حجز موعد الآن
                    </ButtonLink>
                    {days ? (
                      <div className="flex items-center justify-center lg:justify-end gap-1 text-state-success font-label-sm text-label-sm">
                        <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                        <span>يستقبل المرضى {days.size} أيام أسبوعياً</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-sm">
                <StatCard icon="history_edu" label="الخبرة السريرية" value={doctor.experience ? '+' + doctor.experience + ' عاماً' : ''} sub="من الخبرة والعمل السريري" />
                <StatCard icon="local_hospital" label="مقر العمل" value={doctor.facilityName} sub={doctor.facilityAddress} />
                <StatCard icon="schedule" label="ساعات العمل" value={doctor.workHours} sub={doctor.workDays} />
                <StatCard icon="call" label="الاتصال المباشر" sub="للاستفسارات والحالات المنسقة">
                  {doctor.phone ? (
                    <a href={'tel:' + doctor.phone} dir="ltr" className="font-headline-sm text-headline-sm font-bold text-text-primary hover:underline block text-right">{doctor.phone}</a>
                  ) : <span className="font-headline-sm text-headline-sm font-bold text-text-heading block">—</span>}
                </StatCard>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-sm border border-border-soft/60">
                <div className="flex items-center gap-space-2xs mb-space-sm text-text-heading">
                  <Icon name="calendar_month" className="text-2xl text-text-primary" />
                  <h2 className="font-headline-lg text-headline-lg font-bold">أيام الدوام</h2>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-space-2xs">
                  {WEEKDAYS_AR.map((day, index) => {
                    const works = days ? days.has(index) : false;
                    return (
                      <div key={day} className={'flex flex-col items-center gap-1 p-space-2xs rounded-lg text-center ' + (works ? 'bg-state-success-subtle text-state-success' : 'bg-surface-subtle text-text-muted')}>
                        <span className="font-label-sm text-label-sm sm:font-label-md sm:text-label-md">{day.replace('ال', '')}</span>
                        <Icon name={works ? 'check_circle' : 'remove'} className="text-[18px]" />
                      </div>
                    );
                  })}
                </div>
                {!days ? <p className="font-body-sm text-body-sm text-text-muted mt-space-xs">لم يحدد الطبيب أيام دوامه بعد — {doctor.workDays || 'غير متوفر'}.</p> : null}
              </div>

              <section className="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-sm border border-border-soft/60">
                <div className="flex items-center gap-space-2xs mb-space-sm text-text-heading">
                  <Icon name="person_outline" className="text-2xl text-text-primary" />
                  <h2 className="font-headline-lg text-headline-lg font-bold">نبذة عن الطبيب</h2>
                </div>
                <p className="font-body-md text-body-md text-text-body leading-relaxed whitespace-pre-line">
                  {doctor.bio || 'لم يُضف الطبيب نبذة تعريفية بعد.'}
                </p>
              </section>

              <section className="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-sm border border-border-soft/60 flex flex-col gap-space-md">
                <div className="flex items-center gap-space-2xs text-text-heading">
                  <Icon name="location_city" className="text-2xl text-text-primary" />
                  <h2 className="font-headline-lg text-headline-lg font-bold">الموقع الجغرافي</h2>
                </div>
                <div className="flex items-start gap-space-xs p-space-xs rounded-lg bg-surface-container-low/50">
                  <Icon name="pin_drop" className="text-text-primary mt-0.5 text-xl" />
                  <p className="font-body-md text-body-md text-text-body">
                    {[doctor.facilityName, doctor.facilityAddress, geo.label(doctor.area)].filter(Boolean).join('، ') || 'لم يُحدد العنوان بعد.'}
                  </p>
                </div>
                {mapQuery ? (
                  <a className="inline-flex items-center gap-1.5 self-start px-space-sm py-2 rounded-lg bg-surface-container-low text-text-primary hover:bg-primary hover:text-on-primary font-label-md text-label-md font-semibold transition-colors"
                    href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery)} target="_blank" rel="noopener noreferrer">
                    <Icon name="directions" className="text-lg" /> فتح في خرائط Google
                  </a>
                ) : null}
              </section>
            </>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}
