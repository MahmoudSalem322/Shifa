'use client';

import Link from 'next/link';
import { DOCTOR_FALLBACK_AVATAR, geo } from '@/lib/vocab';
import { Icon } from './ui';

export function DoctorCard({ doctor }) {
  const place = [doctor.facilityName, geo.label(doctor.area)].filter(Boolean).join(' - ');
  const schedule = [doctor.workDays, doctor.workHours].filter(Boolean).join(' · ');
  const profileHref = '/doctors/' + encodeURIComponent(doctor.id);

  return (
    <div className="bg-surface-card rounded-2xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div className="flex items-center gap-space-xs mb-space-sm">
          <div className="relative shrink-0">
            <img className="w-16 h-16 rounded-xl object-cover shadow-sm" alt="" src={doctor.image || DOCTOR_FALLBACK_AVATAR} />
            {doctor.licenseNumber ? (
              <span className="absolute -bottom-1 -left-1 bg-state-success text-on-primary w-5 h-5 rounded-full flex items-center justify-center shadow-sm" title="طبيب معتمد رسمياً">
                <Icon name="check" className="text-[13px]" />
              </span>
            ) : null}
          </div>
          <div className="flex flex-col min-w-0">
            <Link href={profileHref} className="font-headline-md text-headline-md text-text-heading group-hover:text-primary transition-colors truncate">{doctor.name}</Link>
            <span className="font-label-md text-label-md text-text-primary">{doctor.specialization}</span>
            {doctor.licenseNumber ? <span className="font-body-sm text-body-sm text-text-muted">ترخيص {doctor.licenseNumber}</span> : null}
          </div>
        </div>

        {doctor.rating || doctor.experience || place ? (
          <div className="grid grid-cols-2 gap-2 p-space-xs bg-surface-container-low rounded-xl mb-space-sm">
            {doctor.rating ? (
              <div className="flex items-center gap-1.5 text-text-body">
                <Icon name="star" filled className="text-state-warning text-[18px]" />
                <span className="font-label-md text-label-md">{doctor.rating.toFixed(1)}</span>
                {doctor.reviewsCount ? <span className="font-body-sm text-body-sm text-text-muted">({doctor.reviewsCount} تقييم)</span> : null}
              </div>
            ) : null}
            {doctor.experience ? (
              <div className="flex items-center gap-1.5 text-text-body">
                <Icon name="medical_services" className="text-text-primary text-[18px]" />
                <span className="font-body-sm text-body-sm">خبرة {doctor.experience} عاماً</span>
              </div>
            ) : null}
            {place ? (
              <div className="flex items-center gap-1.5 text-text-body col-span-2">
                <Icon name="location_on" className="text-text-muted text-[18px]" />
                <span className="font-body-sm text-body-sm text-text-muted">{place}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {schedule ? (
          <div className="flex items-center gap-2 p-2 bg-state-success-subtle text-state-success rounded-lg font-body-sm text-body-sm mb-space-md">
            <Icon name="schedule" className="text-[18px]" />
            <span>{schedule}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-space-2xs pt-space-xs">
        <Link href={profileHref + '/book'} className="w-full bg-primary-container text-on-primary hover:bg-text-heading py-2.5 px-space-xs rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-1 shadow-sm transition-all">
          <span>حجز موعد</span>
          <Icon name="arrow_back" className="text-[18px]" />
        </Link>
        <Link href={profileHref} className="w-full bg-surface-container-high/60 text-text-primary hover:bg-surface-container-high py-2.5 px-space-xs rounded-lg font-label-md text-label-md flex items-center justify-center gap-1 transition-colors">
          الملف الكامل
        </Link>
      </div>
    </div>
  );
}
