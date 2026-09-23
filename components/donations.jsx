'use client';

import Link from 'next/link';
import { DONATION_STATUS, formatDate, formatDateTime, geo } from '@/lib/vocab';
import { Badge, Icon } from './ui';

/* Approved, including donations since linked to drug requests (Module 9). */
export const ACCEPTED = ['approved', 'matched', 'delivered'];

export function donationStatus(status) {
  return DONATION_STATUS[status] || DONATION_STATUS.pending;
}

/* Expiry shown with a warning tone when it is getting close. */
export function ExpiryBadge({ expiryDate, days }) {
  const tone = days == null ? 'bg-surface-container-high text-text-muted'
    : days < 60 ? 'bg-state-danger-subtle text-state-danger'
      : days < 180 ? 'bg-state-warning-subtle text-state-warning'
        : 'bg-state-success-subtle text-state-success';
  return (
    <Badge className={tone} icon="event_busy">
      تنتهي {formatDate(expiryDate, { month: 'long', year: 'numeric' })}{days != null ? ' · بعد ' + days + ' يوماً' : ''}
    </Badge>
  );
}

export function DonationCard({ donation, href, children }) {
  const status = donationStatus(donation.status);
  return (
    <article className="flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-card shadow-sm border border-border-soft/60">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-start gap-space-sm min-w-0">
          <span className="w-12 h-12 rounded-xl bg-state-success-subtle text-state-success flex items-center justify-center shrink-0">
            <Icon name="medication" className="text-[26px]" />
          </span>
          <div className="flex flex-col min-w-0">
            <Link href={href} className="font-headline-sm text-headline-sm text-text-heading hover:text-primary truncate" dir="auto">{donation.medicineName}</Link>
            <span className="font-body-sm text-body-sm text-text-muted">
              {donation.quantity} {donation.unit} · {geo.label(donation.governorate)} · {formatDateTime(donation.createdAt)}
            </span>
          </div>
        </div>
        <Badge className={status.cls} icon={status.icon}>{status.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-space-2xs">
        <ExpiryBadge expiryDate={donation.expiryDate} days={donation.daysToExpiry} />
        {ACCEPTED.includes(donation.status) && donation.availableQuantity !== undefined && donation.availableQuantity < donation.quantity ? (
          <Badge className="bg-state-info-subtle text-state-info" icon="join">
            متاح {donation.availableQuantity} من {donation.quantity} · الباقي مرتبط بطلبات أدوية
          </Badge>
        ) : null}
        {donation.donorName ? <Badge className="bg-surface-container-low text-text-body" icon="person">{donation.donorName}</Badge> : null}
      </div>
      {donation.status !== 'pending' && donation.reviewNote ? (
        <p className={'font-body-sm text-body-sm p-space-xs rounded-lg ' + (donation.status === 'rejected' ? 'bg-state-danger-subtle text-state-danger' : 'bg-state-success-subtle text-state-success')}>
          {donation.status === 'rejected' ? 'سبب الرفض: ' : 'ملاحظة المراجع: '}{donation.reviewNote}
        </p>
      ) : null}
      {children}
    </article>
  );
}
