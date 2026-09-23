'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, toItem } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { geo, normalizePharmacy, normalizeStocks, statusLabel, stockTone } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { AsyncBlock, Badge, Card, CardTitle, EmptyState, Icon, InfoRow } from '@/components/ui';

/* Port of pharmacy-details.html (GET /api/pharmacies/{id}). */
export default function PharmacyDetailsPage() {
  const { id } = useParams();
  const state = useAsync(async () => {
    const raw = toItem(await api.pharmacies.get(id));
    return { pharmacy: normalizePharmacy(raw), stocks: normalizeStocks(raw) };
  }, [id]);
  const p = state.data && state.data.pharmacy;
  const stocks = (state.data && state.data.stocks) || [];

  return (
    <>
      <PageHeader title="تفاصيل الصيدلية" subtitle={p ? p.name : ''} />
      <PageBody>
        <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
          <Link href="/pharmacies" className="hover:text-text-primary">دليل الصيدليات</Link>
          <Icon name="chevron_left" className="text-[18px]" />
          <span className="text-text-body">{p ? p.name : '…'}</span>
        </nav>

        <AsyncBlock state={state}>
          {p ? (
            <>
              <div className="bg-gradient-to-l from-primary-container to-text-heading text-on-primary rounded-2xl p-space-md lg:p-space-lg shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-md">
                  <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Icon name="local_pharmacy" className="text-[36px]" /></span>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-headline-xl text-headline-xl">{p.name}</h1>
                      {p.governmentApproved ? <Badge className="bg-white/20 text-white" icon="verified">معتمدة</Badge> : null}
                      {p.status ? <Badge className={p.status === 'Closed' ? 'bg-state-danger text-white' : 'bg-state-success text-white'}>{statusLabel(p.status)}</Badge> : null}
                    </div>
                    {p.address ? <span className="font-body-md text-body-md text-white/85 flex items-center gap-1"><Icon name="location_on" className="text-[18px]" />{p.address}</span> : null}
                  </div>
                </div>
                {p.phone ? (
                  <a href={'tel:' + p.phone} className="inline-flex items-center justify-center gap-2 px-space-md py-3 rounded-xl bg-white text-text-heading font-label-lg text-label-lg shadow-sm shrink-0">
                    <Icon name="call" /> <span dir="ltr">{p.phone}</span>
                  </a>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
                <InfoRow icon="schedule" label="ساعات العمل">{p.workingHours}</InfoRow>
                <InfoRow icon="map" label="المحافظة">{geo.label(p.area) || geo.label(p.address)}</InfoRow>
                <InfoRow icon="health_and_safety" label="التأمين">{p.acceptsInsurance ? 'تقبل التأمين الصحي' : 'لا تقبل التأمين'}</InfoRow>
                <InfoRow icon="ac_unit" label="سلسلة التبريد">{p.hasColdChain ? 'متوفرة للأدوية المبردة' : 'غير متوفرة'}</InfoRow>
              </div>

              <Card>
                <CardTitle icon="inventory_2" count={stocks.length}>الأدوية المتوفرة</CardTitle>
                {stocks.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                    {stocks.map((stock, index) => {
                      const tone = stockTone(stock);
                      const name = stock.medicineName || 'دواء';
                      return (
                        <div key={index} className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                          <div className="flex flex-col min-w-0">
                            {stock.medicineId != null
                              ? <Link href={'/medicines/' + encodeURIComponent(stock.medicineId)} className="font-headline-sm text-headline-sm text-text-heading hover:text-primary truncate">{name}</Link>
                              : <span className="font-headline-sm text-headline-sm text-text-heading truncate">{name}</span>}
                            <Badge className={tone.cls + ' self-start mt-1'}>{tone.label}{stock.quantity ? ' (' + stock.quantity + ' ' + (stock.unit || 'وحدة') + ')' : ''}</Badge>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {stock.price ? <span className="font-headline-sm text-headline-sm text-text-primary" dir="ltr">{stock.price.toFixed(2)} ₪</span> : null}
                            <Link href={'/drug-requests/new?medicine=' + encodeURIComponent(name)} className="font-label-md text-label-md text-text-primary hover:underline">طلب الدواء</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <EmptyState icon="inventory_2" title="لا توجد أدوية مسجّلة لهذه الصيدلية حالياً" />}
              </Card>

              {p.address ? (
                <Card>
                  <CardTitle icon="location_city">الموقع</CardTitle>
                  <p className="font-body-md text-body-md text-text-body">{p.address}</p>
                  <a className="inline-flex items-center gap-1.5 self-start px-space-sm py-2 rounded-lg bg-surface-container-low text-text-primary hover:bg-primary hover:text-on-primary font-label-md text-label-md transition-colors"
                    href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.latitude && p.longitude ? p.latitude + ',' + p.longitude : p.name + ' ' + p.address)}
                    target="_blank" rel="noopener noreferrer">
                    <Icon name="directions" /> فتح في خرائط Google
                  </a>
                </Card>
              ) : null}
            </>
          ) : null}
        </AsyncBlock>
      </PageBody>
    </>
  );
}
