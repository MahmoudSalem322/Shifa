'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api, toList } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { geo, normalizePharmacy, statusLabel, statusTone, TONE_BADGE } from '@/lib/vocab';
import { PageHeader } from '@/components/app-shell';
import { AsyncBlock, Icon } from '@/components/ui';

/* Port of pharmacy-directory.html (GET /api/pharmacies/search). */

const PILLS = [
  { key: '', label: 'الكل' },
  { key: 'open', label: 'مفتوحة الآن' },
  { key: '24h', label: 'تعمل 24 ساعة' },
  { key: 'insurance', label: 'تقبل التأمين' },
  { key: 'cold', label: 'سلسلة تبريد' },
  { key: 'approved', label: 'معتمدة' }
];

function PharmacyCard({ pharmacy }) {
  const href = '/pharmacies/' + encodeURIComponent(pharmacy.id);
  return (
    <article className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-md">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-sm">
          <span className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-text-primary shrink-0"><Icon name="medication" className="text-3xl" /></span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-2xs">
              <Link href={href} className="font-headline-md text-headline-md text-text-heading font-semibold truncate hover:text-primary">{pharmacy.name}</Link>
              {pharmacy.governmentApproved ? <Icon name="verified" className="text-text-primary text-lg" title="صيدلية معتمدة" /> : null}
            </div>
            {pharmacy.governmentApproved ? <span className="font-label-sm text-label-sm text-text-muted">معتمدة من وزارة الصحة</span> : null}
          </div>
        </div>
        {pharmacy.address ? <div className="flex items-start gap-space-2xs text-text-muted font-body-sm text-body-sm"><Icon name="location_on" className="text-base text-text-primary mt-0.5" />{pharmacy.address}</div> : null}
        <div className="flex flex-wrap items-center gap-space-2xs">
          {pharmacy.status ? (
            <span className={'px-space-2xs py-0.5 rounded-md font-label-sm text-label-sm ' + TONE_BADGE[statusTone(pharmacy.status)]}>{statusLabel(pharmacy.status)}</span>
          ) : null}
          {pharmacy.workingHours ? <span className="px-space-2xs py-0.5 rounded-md bg-surface-container-high text-text-primary font-label-sm text-label-sm">{pharmacy.workingHours}</span> : null}
          {pharmacy.acceptsInsurance ? <span className="px-space-2xs py-0.5 rounded-md bg-state-info-subtle text-state-info font-label-sm text-label-sm">يقبل التأمين</span> : null}
          {pharmacy.hasColdChain ? <span className="px-space-2xs py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm">سلسلة تبريد</span> : null}
        </div>
        <div className="flex items-center justify-between text-text-muted font-body-sm text-body-sm">
          {pharmacy.rating ? (
            <span className="flex items-center gap-1"><Icon name="star" filled className="text-state-warning text-base" /><strong className="text-text-body">{pharmacy.rating.toFixed(1)}</strong></span>
          ) : <span />}
          {pharmacy.phone ? <span className="flex items-center gap-1 text-text-primary font-label-md" dir="ltr"><Icon name="call" className="text-sm" />{pharmacy.phone}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-space-xs">
        <Link href={href} className="flex-1 py-space-2xs bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-space-2xs shadow-sm">
          عرض الصيدلية <Icon name="arrow_back" className="text-base" />
        </Link>
        {pharmacy.phone ? (
          <a href={'tel:' + pharmacy.phone} className="px-space-md py-space-2xs bg-surface-subtle text-text-primary rounded-lg font-label-md text-label-md hover:bg-surface-container-high flex items-center gap-1 shadow-sm">
            <Icon name="phone_in_talk" className="text-base" /> اتصال
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default function PharmacyDirectoryPage() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [pill, setPill] = useState('');
  const debounced = useDebounced(search, 300);

  const state = useAsync(async () => toList(await api.pharmacies.search({ name: debounced, area: location })).map(normalizePharmacy).filter(Boolean), [debounced, location]);

  const pharmacies = useMemo(() => (state.data || []).filter((p) => {
    if (search && !(p.name + ' ' + p.address).toLowerCase().includes(search.toLowerCase())) return false;
    if (location) {
      const actual = geo.normalize(p.area) || geo.normalize(p.address);
      if (actual && actual !== location) return false;
    }
    if (pill === 'open' && p.status === 'Closed') return false;
    if (pill === '24h' && !String(p.workingHours).includes('24')) return false;
    if (pill === 'insurance' && !p.acceptsInsurance) return false;
    if (pill === 'cold' && !p.hasColdChain) return false;
    if (pill === 'approved' && !p.governmentApproved) return false;
    return true;
  }), [state.data, search, location, pill]);

  return (
    <>
      <PageHeader title="دليل الصيدليات المعتمدة" subtitle="ابحث عن صيدلية قريبة وتعرّف على خدماتها" />
      <div className="max-w-[1280px] mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl py-space-lg pb-space-3xl flex flex-col gap-space-lg">
        <div className="bg-surface-card rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
            <div className="md:col-span-2 relative">
              <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="w-full pr-10 pl-space-sm py-space-xs bg-surface-container-low rounded-lg font-body-md focus:outline-none" placeholder="ابحث باسم الصيدلية أو العنوان…"
                value={search} onChange={(e) => setSearch(e.target.value)} aria-label="بحث" />
            </div>
            <select aria-label="المحافظة" className="w-full px-space-xs py-space-xs bg-surface-container-low rounded-lg font-body-md cursor-pointer focus:outline-none" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">كل المحافظات</option>
              {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-space-2xs">
            {PILLS.map((p) => (
              <button key={p.key || 'all'} type="button" aria-pressed={pill === p.key} onClick={() => setPill(p.key)}
                className={'px-space-sm py-1 rounded-full font-label-md text-label-md transition-colors ' + (pill === p.key ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-text-body hover:bg-surface-container')}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-space-2xs">
          <h2 className="font-headline-lg text-headline-lg text-text-heading">الصيدليات</h2>
          <span className="px-space-xs py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-label-md">
            {state.loading && !state.data ? 'جارٍ التحميل…' : pharmacies.length + ' صيدلية'}
          </span>
        </div>

        <AsyncBlock state={state} skeleton={4} empty={{ when: !pharmacies.length, title: 'لا توجد صيدليات مطابقة', hint: 'جرّب محافظة أخرى أو أزل بعض عوامل التصفية.' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {pharmacies.map((p) => <PharmacyCard key={p.id} pharmacy={p} />)}
          </div>
        </AsyncBlock>

        <div className="bg-surface-card rounded-2xl p-space-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="w-12 h-12 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center"><Icon name="support_agent" /></span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-text-heading">لم تجد الدواء في صيدليات منطقتك؟</h3>
              <p className="font-body-md text-body-md text-text-muted">أرسل طلب دواء وأرفق وصفتك، وستتولى الصيدليات المتابعة.</p>
            </div>
          </div>
          <Link href="/drug-requests/new" className="px-space-md py-2.5 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shrink-0">طلب دواء</Link>
        </div>
      </div>
    </>
  );
}
