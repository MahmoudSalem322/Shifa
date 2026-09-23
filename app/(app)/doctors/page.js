'use client';

import { useMemo, useState } from 'react';
import { api, toList } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { geo, normalizeDoctor } from '@/lib/vocab';
import { PageHeader } from '@/components/app-shell';
import { DoctorCard } from '@/components/doctor-card';
import { AsyncBlock, EmergencyBanner, Icon } from '@/components/ui';

/* Port of doctor-search.html. GET /api/doctors/search documents no query
   parameters, so the likely names are sent and the same filters also run
   here, whichever way the server behaves. */

const SPECIALTIES = [
  ['', 'جميع التخصصات الطبية'],
  ['قلب', 'أمراض القلب والشرايين'],
  ['أطفال', 'طب الأطفال وحديثي الولادة'],
  ['باطن', 'الأمراض الباطنية والجهاز الهضمي'],
  ['عظام', 'جراحة العظام والمفاصل'],
  ['نساء', 'النساء والولادة'],
  ['جراحة', 'الجراحة العامة'],
  ['عيون', 'طب وجراحة العيون'],
  ['جلد', 'الجلدية والتجميل']
];

const selectClass = 'w-full bg-surface-subtle text-text-body font-body-md text-body-md pr-12 pl-space-md py-3 rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-surface-container-lowest transition-all';

export default function DoctorSearchPage() {
  const [filters, setFilters] = useState({ search: '', specialty: '', city: '' });
  const [sort, setSort] = useState('recommended');
  const debounced = useDebounced(filters, 300);

  const state = useAsync(async () => {
    const response = await api.doctors.search({
      name: debounced.search,
      specialization: debounced.specialty,
      area: geo.normalize(debounced.city) || debounced.city
    });
    return toList(response).map(normalizeDoctor).filter(Boolean);
  }, [debounced.search, debounced.specialty, debounced.city]);

  const doctors = useMemo(() => {
    const list = (state.data || []).filter((doctor) => {
      if (filters.search) {
        const haystack = (doctor.name + ' ' + doctor.specialization + ' ' + doctor.facilityName + ' ' + doctor.area).toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) return false;
      }
      if (filters.specialty && !String(doctor.specialization).includes(filters.specialty)) return false;
      if (filters.city) {
        const actual = geo.normalize(doctor.area) || geo.normalize(doctor.facilityAddress);
        if (actual && actual !== filters.city) return false;
      }
      return true;
    });
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'experience') list.sort((a, b) => b.experience - a.experience);
    return list;
  }, [state.data, filters, sort]);

  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value });

  return (
    <>
      <PageHeader title="البحث عن طبيب" subtitle="ابحث عن الطبيب المناسب حسب التخصص والموقع والتوفر" />
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-24 right-10 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 -left-20 w-80 h-80 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[1280px] mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl pt-space-lg pb-space-2xl">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-space-xl">
            <div className="inline-flex items-center gap-space-2xs bg-state-success-subtle text-state-success px-space-xs py-1 rounded-full font-label-md text-label-md mb-space-xs shadow-sm">
              <Icon name="verified_user" className="text-[18px]" />
              <span>شبكة طبية موثوقة ومعتمدة في كافة محافظات غزة</span>
            </div>
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile md:font-display-hero md:text-display-hero text-text-heading mb-space-xs">ابحث عن نخبة الأطباء واحجز موعدك بسهولة</h1>
            <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
              اختر الطبيب، ثم اليوم والوقت المتاح من جدول عمله، واحجز موعدك مع تأكيد فوري.
            </p>
          </div>

          <form className="bg-surface-card rounded-2xl shadow-xl p-space-md lg:p-space-lg flex flex-col gap-space-md" onSubmit={(e) => { e.preventDefault(); state.reload(); }}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-xs">
              <div className="md:col-span-5 relative">
                <Icon name="person_search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary" />
                <input className="w-full bg-surface-subtle text-text-body font-body-md text-body-md pr-12 pl-space-sm py-3 rounded-lg focus:outline-none focus:bg-surface-container-lowest transition-all"
                  placeholder="ابحث باسم الطبيب، المستشفى، أو الكلمة المفتاحية..." value={filters.search} onChange={set('search')} aria-label="بحث" />
              </div>
              <div className="md:col-span-3 relative">
                <Icon name="stethoscope" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary pointer-events-none" />
                <select className={selectClass} value={filters.specialty} onChange={set('specialty')} aria-label="التخصص">
                  {SPECIALTIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 relative">
                <Icon name="location_on" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary pointer-events-none" />
                <select className={selectClass} value={filters.city} onChange={set('city')} aria-label="المحافظة">
                  <option value="">المحافظة</option>
                  {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
                </select>
              </div>
              <button type="submit" className="md:col-span-2 w-full flex items-center justify-center gap-space-2xs bg-primary-container text-on-primary hover:bg-text-heading font-headline-sm text-headline-sm py-3 px-space-md rounded-lg shadow-md transition-all">
                <Icon name="search" /><span>ابحث</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <section className="max-w-[1280px] mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl pb-space-3xl flex flex-col gap-space-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm bg-surface-card/60 backdrop-blur-md p-space-sm rounded-xl">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-text-heading">الأطباء المتاحون</span>
            <span className="bg-primary-fixed text-on-primary-fixed font-label-md text-label-md px-2.5 py-0.5 rounded-full">
              {state.loading && !state.data ? 'جارٍ التحميل…' : doctors.length + ' ' + (doctors.length === 1 ? 'طبيب' : 'أطباء')}
            </span>
          </div>
          <label className="flex items-center gap-space-xs">
            <span className="font-label-md text-label-md text-text-muted whitespace-nowrap">الترتيب حسب:</span>
            <select className="bg-surface-card text-text-body font-body-sm text-body-sm px-space-xs py-1.5 rounded-lg cursor-pointer focus:outline-none shadow-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recommended">المقترح</option>
              <option value="rating">الأعلى تقييماً</option>
              <option value="experience">الأكثر خبرة</option>
            </select>
          </label>
        </div>

        <AsyncBlock
          state={state}
          skeleton={6}
          empty={{ when: !doctors.length, title: 'لا توجد نتائج مطابقة', hint: 'جرّب تعديل أو إزالة بعض معايير البحث (التخصص أو المحافظة).' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-sm">
            {doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />)}
          </div>
        </AsyncBlock>

        <EmergencyBanner />
      </section>
    </>
  );
}
