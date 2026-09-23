'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, fieldErrors } from '@/lib/api';
import { useSession } from '@/lib/hooks';
import { notifications } from '@/lib/notifications';
import { DONATION_STATUS, formatDate, geo, isoDate, validate } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { Badge, Button, ButtonLink, Card, CardTitle, Field, Icon, inputClass } from '@/components/ui';

/* Module 8 · Feature 1 — add a medicine donation.
   Medicine, quantity, expiry, location and donor details, validated here
   and again by POST /api/donations. Every donation starts pending. */

const UNITS = ['علبة', 'شريط', 'قرص', 'كبسولة', 'زجاجة', 'أمبولة', 'قلم', 'بخاخ', 'أنبوب'];
const MIN_SHELF_LIFE_DAYS = 30;

const FIELD_MAP = {
  MedicineName: 'medicineName', Quantity: 'quantity', Unit: 'unit', ExpiryDate: 'expiryDate',
  Governorate: 'governorate', Address: 'address', DonorName: 'donorName', DonorPhone: 'donorPhone',
  ConfirmSealed: 'confirmSealed', Notes: 'notes'
};

export default function NewDonationPage() {
  const session = useSession();
  const [form, setForm] = useState({
    medicineName: '', quantity: '1', unit: 'علبة', expiryDate: '', governorate: '', address: '',
    donorName: '', donorPhone: '', notes: '', confirmSealed: false
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [created, setCreated] = useState(null);

  /* Donor information defaults to the signed-in account. */
  useEffect(() => {
    if (!session) return;
    setForm((f) => ({
      ...f,
      donorName: f.donorName || session.user.fullName || '',
      donorPhone: f.donorPhone || session.user.phone || ''
    }));
  }, [session]);

  const minExpiry = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MIN_SHELF_LIFE_DAYS);
    return isoDate(d);
  })();

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm({ ...form, [key]: key === 'donorPhone' ? String(value).replace(/[^0-9]/g, '') : value });
    if (errors[key]) setErrors({ ...errors, [key]: '' });
  };

  const validateForm = () => {
    const next = {};
    const quantity = Number(form.quantity);
    if (form.medicineName.trim().length < 2) next.medicineName = 'أدخل اسم الدواء.';
    if (!Number.isInteger(quantity) || quantity < 1) next.quantity = 'الكمية يجب أن تكون رقماً صحيحاً أكبر من صفر.';
    else if (quantity > 10000) next.quantity = 'الكمية كبيرة جداً.';
    if (!form.expiryDate) next.expiryDate = 'أدخل تاريخ انتهاء الصلاحية.';
    else if (form.expiryDate < minExpiry) next.expiryDate = 'لا نقبل دواءً تنتهي صلاحيته خلال أقل من ' + MIN_SHELF_LIFE_DAYS + ' يوماً.';
    if (!form.governorate) next.governorate = 'اختر المحافظة.';
    if (form.address.trim().length < 3) next.address = 'أدخل عنوان الاستلام بالتفصيل.';
    if (form.donorName.trim().length < 3) next.donorName = 'أدخل اسم المتبرع.';
    if (!validate.phone(form.donorPhone)) next.donorPhone = 'رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.';
    if (!form.confirmSealed) next.confirmSealed = 'يجب التأكيد على سلامة الدواء.';
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validateForm()) return;
    setBusy(true);
    try {
      const response = await api.donations.create({ ...form, quantity: Number(form.quantity) });
      setCreated(response.donation);
      notifications.add({
        type: 'donation_submitted',
        title: 'تم استلام تبرعك',
        message: 'تبرعك بـ ' + response.donation.medicineName + ' قيد المراجعة الآن. شكراً لعطائك 🌿',
        ref: response.donation.id
      });
    } catch (error) {
      const mapped = {};
      for (const [key, text] of Object.entries(fieldErrors(error))) mapped[FIELD_MAP[key] || key] = text;
      setErrors(mapped);
      setServerError(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const status = DONATION_STATUS[created.status];
    return (
      <>
        <PageHeader title="التبرع بدواء" subtitle="تم استلام التبرع" />
        <PageBody narrow>
          <Card className="items-center text-center py-space-2xl">
            <span className="w-20 h-20 rounded-full bg-state-success-subtle text-state-success flex items-center justify-center">
              <Icon name="volunteer_activism" className="text-[44px]" />
            </span>
            <h1 className="font-headline-xl text-headline-xl text-text-heading">شكراً لعطائك!</h1>
            <p className="font-body-lg text-body-lg text-text-muted max-w-md">
              تم تسجيل تبرعك بـ <strong className="text-text-body">{created.quantity} {created.unit} من {created.medicineName}</strong>.
              ستراجعه صيدلية أو مركز صحي، وسنبلغك بالنتيجة.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-space-sm">
              <span className="font-label-md text-label-md text-text-muted">حالة التبرع:</span>
              <Badge className={status.cls + ' text-label-md py-1 px-3'} icon={status.icon}>{status.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-space-xs">
              <ButtonLink href={'/donations/' + encodeURIComponent(created.id)} icon="visibility">تفاصيل التبرع</ButtonLink>
              <ButtonLink href="/donations" tone="soft" icon="list_alt">كل تبرعاتي</ButtonLink>
            </div>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="التبرع بدواء" subtitle="ساهم بدوائك الفائض لمن يحتاجه" />
      <PageBody narrow>
        <RoleGate allow={['Patient', 'Donor']} message="التبرع بالأدوية متاح لحسابات المتبرعين والمرضى">
          <nav className="flex items-center gap-1 font-body-sm text-body-sm text-text-muted" aria-label="مسار التنقل">
            <Link href="/donations" className="hover:text-text-primary">تبرعاتي</Link>
            <Icon name="chevron_left" className="text-[18px]" />
            <span className="text-text-body">تبرع جديد</span>
          </nav>

          <form className="flex flex-col gap-space-lg" onSubmit={submit} noValidate>
            <Card>
              <CardTitle icon="medication">معلومات الدواء</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="اسم الدواء" htmlFor="don-name" required error={errors.medicineName} className="md:col-span-2">
                  <input id="don-name" className={inputClass} value={form.medicineName} onChange={set('medicineName')} maxLength={200}
                    placeholder="الاسم التجاري والتركيز كما على العلبة، مثال: Augmentin 1g" dir="auto" />
                </Field>
                <Field label="الكمية" htmlFor="don-qty" required error={errors.quantity}>
                  <div className="flex gap-space-2xs">
                    <input id="don-qty" type="number" min="1" className={inputClass} value={form.quantity} onChange={set('quantity')} />
                    <select aria-label="الوحدة" className={inputClass + ' max-w-[9rem] cursor-pointer'} value={form.unit} onChange={set('unit')}>
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="تاريخ انتهاء الصلاحية" htmlFor="don-expiry" required error={errors.expiryDate}
                  hint={'يُقبل الدواء الصالح حتى ' + formatDate(minExpiry) + ' على الأقل'}>
                  <input id="don-expiry" type="date" min={minExpiry} className={inputClass} value={form.expiryDate} onChange={set('expiryDate')} />
                </Field>
                <label className="md:col-span-2 flex items-start gap-2 cursor-pointer font-body-md text-body-md text-text-body">
                  <input type="checkbox" className="mt-1" checked={form.confirmSealed} onChange={set('confirmSealed')} />
                  <span>أؤكد أن الدواء مغلق في عبوته الأصلية، غير تالف، وحُفظ وفق شروط التخزين المطلوبة.</span>
                </label>
                {errors.confirmSealed ? <p className="md:col-span-2 font-label-sm text-label-sm text-state-danger -mt-space-sm" role="alert">{errors.confirmSealed}</p> : null}
              </div>
            </Card>

            <Card>
              <CardTitle icon="location_on">موقع الاستلام</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <Field label="المحافظة" htmlFor="don-gov" required error={errors.governorate}>
                  <select id="don-gov" className={inputClass + ' cursor-pointer'} value={form.governorate} onChange={set('governorate')}>
                    <option value="">اختر المحافظة</option>
                    {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
                  </select>
                </Field>
                <Field label="العنوان التفصيلي" htmlFor="don-address" required error={errors.address} className="md:col-span-2">
                  <input id="don-address" className={inputClass} value={form.address} onChange={set('address')} placeholder="الحي، الشارع، أقرب معلم" />
                </Field>
              </div>
            </Card>

            <Card>
              <CardTitle icon="person">بيانات المتبرع</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="الاسم" htmlFor="don-donor" required error={errors.donorName}>
                  <input id="don-donor" className={inputClass} value={form.donorName} onChange={set('donorName')} />
                </Field>
                <Field label="رقم الهاتف" htmlFor="don-phone" required error={errors.donorPhone}>
                  <input id="don-phone" className={inputClass + ' text-left'} dir="ltr" inputMode="numeric" maxLength={10} placeholder="05XXXXXXXX"
                    value={form.donorPhone} onChange={set('donorPhone')} />
                </Field>
                <Field label="ملاحظات للاستلام" htmlFor="don-notes" error={errors.notes} className="md:col-span-2">
                  <textarea id="don-notes" rows={2} className={inputClass + ' resize-none'} value={form.notes} onChange={set('notes')}
                    placeholder="أوقات مناسبة للاستلام أو أي تفاصيل أخرى" maxLength={1000} />
                </Field>
              </div>
            </Card>

            {serverError ? (
              <div className="p-space-sm rounded-xl bg-state-danger-subtle text-state-danger flex items-center gap-2 font-label-md text-label-md" role="alert">
                <Icon name="error" className="text-[20px]" /> {serverError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-space-xs">
              <Button type="submit" icon="volunteer_activism" busy={busy} busyLabel="جارٍ إرسال التبرع…">إرسال التبرع</Button>
              <ButtonLink href="/donations" tone="ghost">إلغاء</ButtonLink>
            </div>
          </form>
        </RoleGate>
      </PageBody>
    </>
  );
}
