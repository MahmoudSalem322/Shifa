'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, toItem } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { formatExpiry, geo, normalizeMedicine, stockTone } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { AsyncBlock, Badge, ButtonLink, Card, CardTitle, EmptyState, Icon, InfoRow } from '@/components/ui';

/* Port of medicine-details.html (GET /api/medicines/{id}) — where a
   medicine is stocked, filterable by governorate and stock level. */
export default function MedicineDetailsPage() {
  const { id } = useParams();
  const [gov, setGov] = useState('');
  const [level, setLevel] = useState('');
  const state = useAsync(async () => normalizeMedicine(toItem(await api.medicines.get(id))), [id]);
  const m = state.data;

  const stocks = useMemo(() => (m ? m.stocks.filter((s) => {
    if (gov) {
      const actual = geo.normalize(s.area) || geo.normalize(s.address);
      if (actual && actual !== gov) return false;
    }
    if (level && stockTone(s).level !== level) return false;
    return true;
  }) : []), [m, gov, level]);

  return (
    <>
      <PageHeader title="حالة توفر الدواء" subtitle={m ? m.name : ''} />
      <PageBody>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href="/medicines" className="hover:text-text-primary">البحث عن دواء</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body">{m ? m.name : '…'}</span>
        </nav>

        <AsyncBlock state={state}>
          {m ? (
            <>
              <Card>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
                  <div className="flex items-start gap-space-md">
                    <span className="w-16 h-16 rounded-2xl bg-state-success-subtle text-state-success flex items-center justify-center shrink-0"><Icon name="medication" className="text-[36px]" /></span>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {m.category ? <Badge className="bg-surface-container-high text-text-primary">{m.category}</Badge> : null}
                        {m.atcCode ? <Badge className="bg-surface-container-high text-text-muted"><span dir="ltr">ATC {m.atcCode}</span></Badge> : null}
                        {m.isCritical ? <Badge className="bg-error-container text-state-danger">دواء حرج</Badge> : null}
                      </div>
                      <h1 className="font-headline-xl text-headline-xl text-text-heading">{m.name}</h1>
                      {m.scientificName ? <p className="font-body-md text-body-md text-text-muted">الاسم العلمي: <span className="text-text-body font-semibold">{m.scientificName}</span></p> : null}
                    </div>
                  </div>
                  <ButtonLink href={'/drug-requests/new?medicine=' + encodeURIComponent(m.name)} icon="bookmark_added">طلب هذا الدواء</ButtonLink>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
                  <InfoRow icon="package_2" label="العبوة">{m.packageInfo}</InfoRow>
                  <InfoRow icon="factory" label="الشركة المصنعة">{m.manufacturer}</InfoRow>
                  <InfoRow icon="thermostat" label="شروط التخزين">{m.storageConditions || (m.requiresColdChain ? 'يتطلب تبريداً' : '')}</InfoRow>
                  <InfoRow icon="pill" label="الجرعة">{m.dosage}</InfoRow>
                </div>
                {m.description ? <p className="font-body-md text-body-md text-text-body leading-relaxed">{m.description}</p> : null}
              </Card>

              <Card>
                <CardTitle icon="storefront" count={stocks.length}>الصيدليات التي يتوفر فيها</CardTitle>
                <div className="flex flex-wrap gap-space-2xs">
                  {[{ slug: '', label: 'كل المحافظات' }, ...geo.all()].map((g) => (
                    <button key={g.slug || 'all'} type="button" aria-pressed={gov === g.slug} onClick={() => setGov(g.slug)}
                      className={'px-space-sm py-1 rounded-full font-label-md text-label-md ' + (gov === g.slug ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-text-body')}>{g.label}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-space-2xs">
                  {[['', 'كل الحالات'], ['available', 'متوفر'], ['critical', 'كمية محدودة'], ['out', 'نفدت الكمية']].map(([key, label]) => (
                    <button key={key || 'all'} type="button" aria-pressed={level === key} onClick={() => setLevel(key)}
                      className={'px-space-sm py-1 rounded-full font-label-sm text-label-sm ' + (level === key ? 'bg-text-heading text-on-primary' : 'bg-surface-subtle text-text-muted')}>{label}</button>
                  ))}
                </div>
                {stocks.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-sm">
                    {stocks.map((s, i) => {
                      const tone = stockTone(s);
                      return (
                        <article key={i} className="bg-surface-subtle rounded-xl p-space-md flex flex-col gap-space-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1">
                              {s.pharmacyId != null
                                ? <Link href={'/pharmacies/' + encodeURIComponent(s.pharmacyId)} className="font-headline-md text-headline-md text-text-heading hover:text-primary">{s.pharmacyName || 'صيدلية'}</Link>
                                : <span className="font-headline-md text-headline-md text-text-heading">{s.pharmacyName || 'صيدلية'}</span>}
                              <Badge className={tone.cls + ' self-start'}>{tone.label}</Badge>
                            </div>
                            {s.price ? <span className="font-headline-sm text-headline-sm text-text-primary" dir="ltr">{s.price.toFixed(2)} ₪</span> : null}
                          </div>
                          {s.quantity ? <span className="font-label-md text-label-md text-text-body">الكمية المؤكدة: {s.quantity} {s.unit || 'وحدة'}</span> : null}
                          {s.address ? <span className="flex items-center gap-1 text-text-muted font-body-sm text-body-sm"><Icon name="location_on" className="text-[18px]" />{s.address}</span> : null}
                          {s.phone ? <a href={'tel:' + s.phone} className="flex items-center gap-1 text-text-primary font-body-sm text-body-sm" dir="ltr"><Icon name="call" className="text-[18px]" />{s.phone}</a> : null}
                          {s.expiryDate ? <span className="font-label-sm text-label-sm text-text-muted">تنتهي الصلاحية: {formatExpiry(s.expiryDate)}</span> : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon="store" title="لا توجد صيدليات مطابقة" hint="جرّب محافظة أخرى، أو أرسل طلب دواء لتتابعه الصيدليات."
                    action={<Link href={'/drug-requests/new?medicine=' + encodeURIComponent(m.name)} className="shifa-state__action">طلب الدواء</Link>} />
                )}
              </Card>
            </>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}
