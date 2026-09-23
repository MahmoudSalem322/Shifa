'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api, toList } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { facilityTypeLabel, geo, normalizeFacility } from '@/lib/vocab';
import { PageHeader } from '@/components/app-shell';
import { AsyncBlock, Icon } from '@/components/ui';

/* Port of facility-search.html (GET /api/facilities/search). */

const selectClass = 'w-full px-space-xs py-space-xs bg-surface-container-low rounded-lg font-body-md text-body-md text-text-body focus:outline-none cursor-pointer';

function FacilityCard({ facility }) {
  const href = '/facilities/' + encodeURIComponent(facility.id);
  return (
    <article className="bg-surface-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="relative h-40 w-full bg-surface-container overflow-hidden">
          {facility.image
            ? <img className="w-full h-full object-cover" alt="" src={facility.image} />
            : <div className="w-full h-full bg-gradient-to-br from-primary-container to-secondary-container" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {facility.type ? (
            <span className="absolute top-3 right-3 px-space-xs py-1 rounded-full bg-surface-card/95 text-text-heading font-label-sm text-label-sm shadow-sm">{facilityTypeLabel(facility.type)}</span>
          ) : null}
          {facility.emergency ? (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-space-xs py-1 rounded-full bg-state-success text-on-primary font-label-sm text-label-sm shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />طوارئ 24/7
            </span>
          ) : null}
          <div className="absolute bottom-3 right-3 left-3 flex justify-between items-end text-white gap-2">
            <h3 className="font-headline-md text-headline-md leading-tight text-white">{facility.name}</h3>
            {facility.rating ? (
              <span className="flex items-center gap-1 bg-surface-card/90 text-text-body px-2 py-0.5 rounded-md font-label-sm text-label-sm shrink-0">
                <Icon name="star" filled className="text-state-warning text-[16px]" />{facility.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-space-md flex flex-col gap-space-sm">
          {facility.address ? <div className="flex items-center gap-space-2xs text-text-muted font-body-sm text-body-sm"><Icon name="location_on" className="text-text-primary text-[18px]" />{facility.address}</div> : null}
          {facility.workingHours ? <div className="flex items-center gap-space-2xs text-text-muted font-body-sm text-body-sm"><Icon name="schedule" className="text-text-primary text-[18px]" />{facility.workingHours}</div> : null}
          {facility.services.length ? (
            <div>
              <span className="font-label-sm text-label-sm text-text-muted mb-space-2xs block">الخدمات والأقسام المتاحة:</span>
              <div className="flex flex-wrap gap-space-3xs">
                {facility.services.slice(0, 4).map((s) => <span key={s.name} className="px-space-2xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">{s.name}</span>)}
                {facility.services.length > 4 ? <span className="px-space-2xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">+{facility.services.length - 4}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="p-space-md pt-0 flex items-center gap-space-2xs">
        <Link href={href} className="flex-1 py-space-xs px-space-sm rounded-lg bg-primary-container hover:bg-text-heading text-on-primary font-label-md text-label-md flex items-center justify-center gap-1 shadow-sm transition-colors">
          عرض التفاصيل <Icon name="arrow_back" className="text-[18px]" />
        </Link>
        {facility.phone ? (
          <a aria-label="الاتصال بالاستقبال" href={'tel:' + facility.phone} className="w-10 h-10 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-primary flex items-center justify-center">
            <Icon name="call" className="text-[20px]" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default function FacilitySearchPage() {
  const [filters, setFilters] = useState({ search: '', type: '', service: '', location: '', emergency: false });
  const [sort, setSort] = useState('recommended');
  const debounced = useDebounced(filters.search, 300);

  const state = useAsync(async () => toList(await api.facilities.search({ name: debounced })).map(normalizeFacility).filter(Boolean), [debounced]);

  const facilities = useMemo(() => {
    const list = (state.data || []).filter((f) => {
      if (filters.search) {
        const haystack = (f.name + ' ' + f.address + ' ' + f.type + ' ' + f.services.map((s) => s.name).join(' ')).toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) return false;
      }
      if (filters.type && String(f.type).toLowerCase() !== filters.type.toLowerCase()) return false;
      if (filters.service && !f.services.some((s) => s.name.includes(filters.service))) return false;
      if (filters.location) {
        const actual = geo.normalize(f.area) || geo.normalize(f.address);
        if (actual && actual !== filters.location) return false;
      }
      if (filters.emergency && !f.emergency) return false;
      return true;
    });
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [state.data, filters, sort]);

  const serviceNames = useMemo(() => Array.from(new Set((state.data || []).flatMap((f) => f.services.map((s) => s.name)))).slice(0, 30), [state.data]);
  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  return (
    <>
      <PageHeader title="بحث المنشآت الصحية" subtitle="ابحث عن أقرب مستشفى أو عيادة حسب الخدمة والموقع" />
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-24 right-10 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl pt-space-lg pb-space-3xl flex flex-col gap-space-lg">
          <div className="flex flex-col items-center gap-space-2xs text-center">
            <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-3xs rounded-full bg-state-success-subtle text-state-success shadow-sm font-label-md text-label-md">
              <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />شبكة المنشآت الطبية المعتمدة في محافظات غزة
            </span>
            <h1 className="font-headline-xl text-headline-xl text-text-heading">ابحث عن المستشفيات والعيادات والمراكز الصحية بسهولة</h1>
          </div>

          <div className="bg-surface-card rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
              <div className="md:col-span-12 lg:col-span-5 relative">
                <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[22px]" />
                <input className="w-full pr-10 pl-space-sm py-space-xs bg-surface-container-low rounded-lg font-body-md text-body-md focus:outline-none focus:bg-surface-card"
                  placeholder="ابحث باسم المستشفى أو العيادة أو القسم..." value={filters.search} onChange={set('search')} aria-label="بحث" />
              </div>
              <div className="md:col-span-4 lg:col-span-2">
                <select aria-label="نوع المنشأة" className={selectClass} value={filters.type} onChange={set('type')}>
                  <option value="">نوع المنشأة (الكل)</option>
                  <option value="Hospital">مستشفى</option>
                  <option value="Clinic">عيادة</option>
                </select>
              </div>
              <div className="md:col-span-4 lg:col-span-3">
                <select aria-label="الخدمة" className={selectClass} value={filters.service} onChange={set('service')}>
                  <option value="">الخدمة المتوفرة (الكل)</option>
                  {serviceNames.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="md:col-span-4 lg:col-span-2">
                <select aria-label="المحافظة" className={selectClass} value={filters.location} onChange={set('location')}>
                  <option value="">المحافظة (الكل)</option>
                  {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <label className="flex items-center gap-2 cursor-pointer font-label-md text-label-md text-text-body">
                <input type="checkbox" checked={filters.emergency} onChange={set('emergency')} /> طوارئ مفتوحة فقط
              </label>
              <div className="flex items-center gap-space-sm">
                <select aria-label="الترتيب" className="bg-transparent font-label-md text-label-md text-text-heading focus:outline-none cursor-pointer" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recommended">المقترح</option>
                  <option value="rating">الأعلى تقييماً</option>
                </select>
                <button type="button" className="text-text-muted hover:text-state-danger font-label-sm text-label-sm flex items-center gap-1"
                  onClick={() => setFilters({ search: '', type: '', service: '', location: '', emergency: false })}>
                  <Icon name="restart_alt" className="text-[16px]" /> إعادة ضبط
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-2xs">
            <h2 className="font-headline-lg text-headline-lg text-text-heading">المنشآت الطبية المتاحة</h2>
            <span className="px-space-xs py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md">
              {state.loading && !state.data ? 'جارٍ التحميل…' : facilities.length + ' منشأة'}
            </span>
          </div>

          <AsyncBlock state={state} skeleton={6} empty={{ when: !facilities.length, title: 'لم نعثر على منشأة تطابق البحث', hint: 'جرّب إلغاء بعض الفلاتر مثل المحافظة أو نوع الخدمة.' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {facilities.map((f) => <FacilityCard key={f.id} facility={f} />)}
            </div>
          </AsyncBlock>

          <div className="bg-gradient-to-l from-error/90 to-state-danger text-on-error rounded-xl p-space-md shadow-md flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Icon name="emergency" className="text-white text-[32px]" /></span>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-white font-bold">هل تبحث عن إسعاف فوري؟</h4>
                <p className="font-body-md text-body-md text-white/90">خط الطوارئ المركزي للهلال الأحمر الفلسطيني يعمل على مدار 24 ساعة.</p>
              </div>
            </div>
            <a href="tel:101" className="w-full md:w-auto px-space-lg py-space-xs rounded-lg bg-white text-state-danger font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-sm">
              <Icon name="call" /> اتصل بالإسعاف 101
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
