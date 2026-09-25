'use client';

import { useEffect, useState } from 'react';
import { api, toList, toItem } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import { normalizeMedicine } from '@/lib/vocab';
import { useToast } from '@/components/toast';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { AsyncBlock, Badge, Button, Card, CardTitle, EmptyState, Field, inputClass, Modal } from '@/components/ui';

function StockRow({ stock }) {
  const toast = useToast();
  const [values, setValues] = useState({ quantity: String(stock.quantity), price: stock.price ? String(stock.price) : '', availability: stock.availability || '' });
  const [busy, setBusy] = useState(false);

  const update = async () => {
    const quantity = Number(values.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return toast('الكمية غير صحيحة.');
    setBusy(true);
    try {
      await api.pharmacies.updateStock(stock.medicineId, {
        quantity,
        price: Number(values.price) || 0,
        availability: values.availability || (quantity === 0 ? 'OutOfStock' : quantity <= 15 ? 'LowStock' : 'InStock')
      });
      toast('تم تحديث المخزون.');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
      <div className="flex flex-col">
        <span className="font-headline-sm text-headline-sm text-text-heading">{stock.medicineName || 'دواء #' + (stock.medicineId ?? '')}</span>
        {stock.batchNumber ? <span className="font-label-sm text-label-sm text-text-muted" dir="ltr">Batch: {stock.batchNumber}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-space-2xs">
        <input aria-label="الكمية" type="number" min="0" className="w-24 bg-surface-container-lowest py-1.5 px-2 rounded-lg text-center font-label-md focus:outline-none"
          value={values.quantity} onChange={(e) => setValues({ ...values, quantity: e.target.value })} />
        <input aria-label="السعر" type="number" min="0" step="0.01" placeholder="السعر ₪" className="w-28 bg-surface-container-lowest py-1.5 px-2 rounded-lg text-center font-label-md focus:outline-none"
          value={values.price} onChange={(e) => setValues({ ...values, price: e.target.value })} />
        <select aria-label="التوفر" className="bg-surface-container-lowest py-1.5 px-2 rounded-lg font-label-md focus:outline-none cursor-pointer"
          value={values.availability} onChange={(e) => setValues({ ...values, availability: e.target.value })}>
          <option value="">تلقائي</option>
          <option value="InStock">متوفر</option>
          <option value="LowStock">كمية محدودة</option>
          <option value="OutOfStock">نفد</option>
        </select>
        <Button className="!py-1.5" busy={busy} busyLabel="…" disabled={stock.medicineId == null || stock.medicineId === ''} onClick={update}>تحديث</Button>
      </div>
    </div>
  );
}

function AddStockModal({ open, onClose, onAdded }) {
  const toast = useToast();
  const catalogue = useAsync(async () => (open ? toList(await api.medicines.list()).map(normalizeMedicine).filter(Boolean) : null), [open]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ medicineId: '', quantity: '1', price: '', unit: 'علبة', expiryDate: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setForm({ medicineId: '', quantity: '1', price: '', unit: 'علبة', expiryDate: '' });
  }, [open]);

  const list = (catalogue.data || []).filter((m) => !query || (m.name + ' ' + m.scientificName).toLowerCase().includes(query.toLowerCase())).slice(0, 50);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.medicineId && !query.trim()) return toast('اختر الدواء من القائمة أو اكتب اسمه.');
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return toast('الكمية غير صحيحة.');
    setBusy(true);
    try {
      await api.pharmacies.addStock({
        medicineId: form.medicineId ? Number(form.medicineId) : undefined,
        customName: !form.medicineId ? query.trim() : undefined,
        quantity,
        unit: form.unit || undefined,
        price: Number(form.price) || 0,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        availability: quantity === 0 ? 'OutOfStock' : quantity <= 15 ? 'LowStock' : 'InStock'
      });
      toast('تمت إضافة الدواء للمخزون.');
      onAdded();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة دواء للمخزون">
      <form className="flex flex-col gap-space-md" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-text-heading">اسم الدواء <span className="text-state-danger">*</span></label>
          <input className={inputClass} placeholder="ابحث في الكتالوج أو أدخل اسم دواء جديد..." value={query} onChange={(e) => { setQuery(e.target.value); setForm({ ...form, medicineId: '' }); }} />
        </div>
        
        {query.trim() && (
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 rounded-xl bg-surface-subtle p-1 border border-border-subtle">
            {catalogue.loading ? <p className="p-space-sm text-text-muted font-body-sm">جارٍ تحميل الكتالوج…</p> : null}
            {catalogue.error ? <p className="p-space-sm text-state-danger font-body-sm">{catalogue.error.message}</p> : null}
            {!catalogue.loading && !catalogue.error && !list.length ? (
              <p className="p-space-sm text-text-muted font-body-sm">سيتم إضافة "{query}" كدواء جديد.</p>
            ) : null}
            {list.map((m) => (
              <label key={m.id} className={'flex items-center gap-2 p-space-xs rounded-lg cursor-pointer ' + (String(m.id) === form.medicineId ? 'bg-primary-fixed/50' : 'hover:bg-surface-container-low')}>
                <input type="radio" name="medicine" checked={String(m.id) === form.medicineId} onChange={() => { setForm({ ...form, medicineId: String(m.id) }); setQuery(m.name); }} />
                <span className="font-label-lg text-label-lg text-text-heading">{m.name}</span>
                {m.scientificName ? <span className="font-body-sm text-body-sm text-text-muted">{m.scientificName}</span> : null}
                {m.isCritical ? <Badge className="bg-error-container text-state-danger">حرج</Badge> : null}
              </label>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-space-xs">
          <Field label="الكمية" htmlFor="stk-qty" required><input id="stk-qty" type="number" min="0" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="السعر (₪)" htmlFor="stk-price"><input id="stk-price" type="number" min="0" step="0.01" className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="الوحدة" htmlFor="stk-unit"><input id="stk-unit" className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          <Field label="تاريخ الانتهاء" htmlFor="stk-expiry"><input id="stk-expiry" type="date" className={inputClass} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-border-soft">
          <Button tone="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" icon="add" busy={busy} busyLabel="جارٍ الإضافة…">إضافة الدواء</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PharmacyStockPage() {
  const session = useSession();
  const [adding, setAdding] = useState(false);

  const state = useAsync(async () => {
    if (!session || session.role !== 'Pharmacy') return { stocks: [] };
    const raw = toItem(await api.pharmacies.me()) || {};
    return { stocks: raw.medicines || [] };
  }, [session]);

  return (
    <>
      <PageHeader title="مخزون الأدوية" subtitle="إدارة وإضافة الأدوية المتوفرة في الصيدلية" />
      <PageBody>
        <RoleGate allow={['Pharmacy']} message="هذه الصفحة مخصصة للصيدليات فقط.">
          <Card id="pharmacy-stock">
            <CardTitle icon="inventory_2" count={state.data ? state.data.stocks.length : undefined}>
              مخزون الأدوية
            </CardTitle>
            <AsyncBlock state={state} empty={{ when: state.data && !state.data.stocks.length, icon: 'inventory_2', title: 'لا توجد أدوية في المخزون بعد' }}>
              <div className="flex flex-col gap-space-xs">
                {state.data ? state.data.stocks.map((stock, index) => <StockRow key={(stock.medicineId ?? 'x') + '-' + index} stock={stock} />) : null}
              </div>
            </AsyncBlock>
            <div className="mt-2 flex justify-end border-t border-border-subtle pt-space-md">
              <Button icon="add" onClick={() => setAdding(true)}>إضافة دواء</Button>
            </div>
          </Card>
          <AddStockModal open={adding} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); state.reload(); }} />
        </RoleGate>
      </PageBody>
    </>
  );
}
