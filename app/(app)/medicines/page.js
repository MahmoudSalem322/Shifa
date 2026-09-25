'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api, toList } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { geo, normalizeMedicine } from '@/lib/vocab';
import { PageHeader } from '@/components/app-shell';
import { AsyncBlock, Badge, Icon } from '@/components/ui';

/* Port of pharmacy-search.html — find a medicine across pharmacies.
   GET /api/medicines/search is the only endpoint with documented
   parameters: name, area, category. */

const CATEGORIES = ['', 'مضاد حيوي', 'مسكن', 'أمراض مزمنة', 'قلب وضغط', 'سكري', 'تنفسي', 'أطفال', 'جهاز هضمي', 'حساسية', 'فيتامينات', 'جلدية'];

function MedicineCard({ medicine }) {
  const href = '/medicines/' + encodeURIComponent(medicine.id);
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col gap-space-md">
      <div className="flex items-start gap-space-md">
        {medicine.imageUrl ? (
          <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden="true"><img src={medicine.imageUrl} alt="" loading="lazy" className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" /></Link>
        ) : (
          <span className="w-14 h-14 rounded-xl bg-state-success-subtle text-state-success flex items-center justify-center shrink-0"><Icon name="medication" className="text-headline-xl" /></span>
        )}
        <div className="flex flex-col gap-space-3xs min-w-0">
          <div className="flex flex-wrap items-center gap-space-2xs">
            <Link href={href} className="font-headline-lg text-headline-lg text-text-heading hover:text-primary">{medicine.name}</Link>
            {medicine.stocks.length ? <Badge className="bg-state-success-subtle text-state-success">متوفر في {medicine.stocks.length} صيدلية</Badge> : null}
            {medicine.isCritical ? <Badge className="bg-error-container text-state-danger">دواء حرج</Badge> : null}
          </div>
          {medicine.scientificName || medicine.packageInfo ? (
            <p className="font-body-md text-body-md text-text-muted">
              {medicine.scientificName ? <>الاسم العلمي: <span className="text-text-body font-semibold">{medicine.scientificName}</span></> : null}
              {medicine.packageInfo ? ' • ' + medicine.packageInfo : ''}
            </p>
          ) : null}
          <div className="flex items-center gap-space-sm text-text-muted font-label-sm text-label-sm flex-wrap">
            {medicine.category ? <span className="flex items-center gap-1"><Icon name="category" className="text-body-sm" />{medicine.category}</span> : null}
            {medicine.atcCode ? <span dir="ltr">ATC: {medicine.atcCode}</span> : null}
            {medicine.requiresColdChain ? <span className="flex items-center gap-1 text-state-info"><Icon name="ac_unit" className="text-body-sm" />يتطلب تبريداً</span> : null}
          </div>
        </div>
      </div>
      <div className="bg-surface-subtle p-space-sm rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-space-md">
          {medicine.stocks.length ? medicine.stocks.slice(0, 3).map((s, i) => (
            <span key={i} className="flex items-center gap-space-2xs">
              <Icon name="storefront" className="text-text-primary" />
              <span className="font-label-md text-label-md text-on-surface">{s.pharmacyName}</span>
            </span>
          )) : <span className="font-body-sm text-body-sm text-text-muted">لا توجد نقاط توفر مسجّلة بعد</span>}
        </div>
        <div className="flex items-center gap-space-2xs shrink-0">
          <Link href={href} className="px-space-sm py-space-2xs rounded-lg bg-surface-container-high text-text-primary font-label-md text-label-md">نقاط التوفر</Link>
          <Link href={'/drug-requests/new?medicine=' + encodeURIComponent(medicine.name)} className="px-space-md py-space-2xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary-hover flex items-center gap-1">
            <Icon name="bookmark_added" className="text-body-md" /> طلب الدواء
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MedicineSearchPage() {
  const [filters, setFilters] = useState({ name: '', area: '', category: '' });
  const [sort, setSort] = useState('relevance');
  const debounced = useDebounced(filters, 300);

  const state = useAsync(async () => toList(await api.medicines.search({
    name: debounced.name,
    area: geo.label(debounced.area) || debounced.area,
    category: debounced.category
  })).map(normalizeMedicine).filter(Boolean), [debounced.name, debounced.area, debounced.category]);

  const medicines = useMemo(() => {
    const list = (state.data || []).slice();
    if (sort === 'stock') list.sort((a, b) => b.stocks.length - a.stocks.length);
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return list;
  }, [state.data, sort]);

  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value });

  return (
    <>
      <PageHeader title="البحث عن دواء" subtitle="اعرف أين يتوفر الدواء والكمية المتاحة" />
      <div className="max-w-[1280px] mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl py-space-lg pb-space-3xl flex flex-col gap-space-lg">
        <div className="bg-surface-card rounded-2xl shadow-xl p-space-md lg:p-space-lg flex flex-col gap-space-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-xs">
            <div className="md:col-span-6 relative">
              <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary" />
              <input className="w-full bg-surface-subtle pr-12 pl-space-sm py-3 rounded-lg focus:outline-none" placeholder="اسم الدواء التجاري أو العلمي…" value={filters.name} onChange={set('name')} aria-label="اسم الدواء" />
            </div>
            <select className="md:col-span-3 w-full bg-surface-subtle px-space-sm py-3 rounded-lg cursor-pointer focus:outline-none" value={filters.area} onChange={set('area')} aria-label="المحافظة">
              <option value="">كل المحافظات</option>
              {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
            </select>
            <select className="md:col-span-3 w-full bg-surface-subtle px-space-sm py-3 rounded-lg cursor-pointer focus:outline-none" value={filters.category} onChange={set('category')} aria-label="التصنيف">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'كل التصنيفات'}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-2xs">
            <h2 className="font-headline-lg text-headline-lg text-text-heading">نتائج الأدوية المطابقة</h2>
            <span className="px-space-xs py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-label-md">
              {state.loading && !state.data ? 'جارٍ التحميل…' : medicines.length + ' دواء'}
            </span>
          </div>
          <div className="flex gap-1 bg-surface-card rounded-lg p-1 shadow-sm" role="tablist" aria-label="الترتيب">
            {[['relevance', 'الأكثر صلة'], ['stock', 'الأكثر توفراً'], ['name', 'أبجدياً']].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={sort === key} onClick={() => setSort(key)}
                className={'px-space-sm py-1.5 rounded-md font-label-md text-label-md ' + (sort === key ? 'bg-primary-container text-on-primary' : 'text-text-body')}>{label}</button>
            ))}
          </div>
        </div>

        <AsyncBlock state={state} skeleton={4} empty={{
          when: !medicines.length,
          icon: 'medication',
          title: 'لا توجد أدوية مطابقة',
          hint: 'إن لم تجد الدواء، أرسل طلب دواء وستتابع الصيدليات طلبك.',
          action: <Link href={'/drug-requests/new' + (filters.name ? '?medicine=' + encodeURIComponent(filters.name) : '')} className="shifa-state__action">طلب الدواء</Link>
        }}>
          <div className="flex flex-col gap-space-md">
            {medicines.map((m) => <MedicineCard key={m.id} medicine={m} />)}
          </div>
        </AsyncBlock>
      </div>
    </>
  );
}
