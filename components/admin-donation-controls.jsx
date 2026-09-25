'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, fieldErrors } from '@/lib/api';
import { DONATION_STATUS, geo } from '@/lib/vocab';
import { useToast } from './toast';
import { Button, CardTitle, Field, inputClass, Modal } from './ui';

/* Admin tools on a donation made through this site: edit any field, set
   the status by hand, or delete it. */

const UNITS = ['علبة', 'شريط', 'قرص', 'كبسولة', 'زجاجة', 'أمبولة', 'قلم', 'بخاخ', 'أنبوب'];
const STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];
const CONDITIONS = { sealed: 'مغلق وسليم', opened: 'مفتوح', new: 'جديد', used: 'مستعمل' };

function EditDonation({ donation, open, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    donationType: donation.donationType || 'medicine',
    medicineName: donation.medicineName || '',
    quantity: String(donation.quantity ?? ''),
    unit: donation.unit || '',
    expiryDate: donation.expiryDate || '',
    condition: donation.condition || '',
    governorate: donation.governorate || '',
    address: donation.address || '',
    donorName: donation.donorName || '',
    donorPhone: donation.donorPhone || '',
    notes: donation.notes || ''
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const equipment = form.donationType === 'equipment';

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.admin.donations.update(donation.id, { ...form, quantity: Number(form.quantity) });
      onSaved('تم حفظ تعديلات التبرع.');
    } catch (err) {
      setError(Object.values(fieldErrors(err)).join(' ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="تعديل التبرع" eyebrow={donation.medicineName} wide>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-space-md" onSubmit={submit} noValidate>
        <Field label="نوع التبرع" htmlFor="ad-type">
          <select id="ad-type" className={inputClass + ' cursor-pointer'} value={form.donationType} onChange={set('donationType')}>
            <option value="medicine">دواء</option>
            <option value="equipment">جهاز طبي</option>
          </select>
        </Field>
        <Field label={equipment ? 'اسم الجهاز' : 'اسم الدواء'} htmlFor="ad-name" required><input id="ad-name" className={inputClass} value={form.medicineName} onChange={set('medicineName')} /></Field>
        <Field label="الكمية" htmlFor="ad-qty" required><input id="ad-qty" type="number" min="1" className={inputClass} value={form.quantity} onChange={set('quantity')} /></Field>
        {!equipment ? (
          <Field label="الوحدة" htmlFor="ad-unit">
            <select id="ad-unit" className={inputClass + ' cursor-pointer'} value={form.unit} onChange={set('unit')}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        ) : null}
        {!equipment ? <Field label="تاريخ انتهاء الصلاحية" htmlFor="ad-exp" required><input id="ad-exp" type="date" className={inputClass} value={form.expiryDate} onChange={set('expiryDate')} /></Field> : null}
        <Field label="الحالة الفيزيائية" htmlFor="ad-cond">
          <select id="ad-cond" className={inputClass + ' cursor-pointer'} value={form.condition} onChange={set('condition')}>
            {Object.entries(CONDITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="المحافظة" htmlFor="ad-gov" required>
          <select id="ad-gov" className={inputClass + ' cursor-pointer'} value={form.governorate} onChange={set('governorate')}>
            <option value="">اختر</option>
            {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="العنوان" htmlFor="ad-addr" required><input id="ad-addr" className={inputClass} value={form.address} onChange={set('address')} /></Field>
        <Field label="اسم المتبرع" htmlFor="ad-donor" required><input id="ad-donor" className={inputClass} value={form.donorName} onChange={set('donorName')} /></Field>
        <Field label="هاتف المتبرع" htmlFor="ad-phone" required><input id="ad-phone" dir="ltr" maxLength={10} className={inputClass + ' text-left'} value={form.donorPhone} onChange={set('donorPhone')} /></Field>
        <Field label="ملاحظات" htmlFor="ad-notes" className="md:col-span-2"><textarea id="ad-notes" rows={3} className={inputClass} value={form.notes} onChange={set('notes')} /></Field>
        {error ? <p className="md:col-span-2 font-label-md text-label-md text-state-danger" role="alert">{error}</p> : null}
        <div className="md:col-span-2"><Button type="submit" icon="save" busy={busy} busyLabel="جارٍ الحفظ…">حفظ التعديلات</Button></div>
      </form>
    </Modal>
  );
}

export function AdminDonationControls({ donation, onChanged }) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  const act = async (key, action, after) => {
    setBusy(key);
    try {
      const response = await action();
      toast(response.message);
      after();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy('');
    }
  };

  const applyStatus = () => act('status', () => api.admin.donations.setStatus(donation.id, status, note.trim()), () => { setStatus(''); setNote(''); onChanged(); });
  const remove = () => {
    if (!window.confirm('حذف التبرع بـ ' + donation.medicineName + ' نهائياً؟')) return;
    act('delete', () => api.admin.donations.remove(donation.id), () => router.replace('/donations/review'));
  };

  return (
    <div className="flex flex-col gap-space-sm p-space-sm rounded-xl border border-border-soft">
      <CardTitle icon="admin_panel_settings">أدوات الإدارة</CardTitle>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-space-xs items-end">
        <Field label="تغيير الحالة" htmlFor="adm-status">
          <select id="adm-status" className={inputClass + ' cursor-pointer'} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">اختر</option>
            {STATUSES.filter((s) => s !== donation.status).map((s) => <option key={s} value={s}>{DONATION_STATUS[s].label}</option>)}
          </select>
        </Field>
        <Field label="ملاحظة للمتبرع (اختياري)" htmlFor="adm-note">
          <input id="adm-note" className={inputClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button icon="published_with_changes" disabled={!status} busy={busy === 'status'} busyLabel="…" onClick={applyStatus}>تطبيق</Button>
      </div>
      <div className="flex flex-wrap gap-space-xs">
        <Button tone="soft" icon="edit" onClick={() => setEditing(true)}>تعديل البيانات</Button>
        <Button tone="danger" icon="delete" busy={busy === 'delete'} busyLabel="جارٍ الحذف…" onClick={remove}>حذف التبرع</Button>
      </div>
      {editing ? (
        <EditDonation donation={donation} open onClose={() => setEditing(false)}
          onSaved={(message) => { setEditing(false); toast(message); onChanged(); }} />
      ) : null}
    </div>
  );
}
