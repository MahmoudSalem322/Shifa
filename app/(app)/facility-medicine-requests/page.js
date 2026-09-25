'use client';

import { useState, useEffect } from 'react';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { Card, CardTitle, Badge, Button, Modal, Field, inputClass } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';

export default function FacilityMedicineRequestsPage() {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [requests, setRequests] = useState([
    { id: 1, medicine: 'أموكسيسيلين', quantity: 50, status: 'pending', date: '2023-11-20' },
    { id: 2, medicine: 'بانادول أدفانس', quantity: 200, status: 'approved', date: '2023-11-18' },
    { id: 3, medicine: 'فينتولين بخاخ', quantity: 30, status: 'rejected', date: '2023-11-15' },
  ]);

  const handleAdd = (req) => {
    setRequests([{ id: Date.now(), ...req, status: 'pending', date: new Date().toISOString().split('T')[0] }, ...requests]);
    toast('تمت إضافة الطلب بنجاح.');
    setAdding(false);
    api.inbox.notifyAdmin(`تم طلب ${req.quantity} علبة من ${req.medicine}`).catch(() => {});
  };

  return (
    <>
      <PageHeader title="طلبات الأدوية" subtitle="متابعة وتحديث طلبات الأدوية الخاصة بالمركز" />
      <PageBody>
        <RoleGate allow={['Hospital']} message="هذه الصفحة مخصصة للمراكز الصحية والمستشفيات فقط.">
          <Card>
            <CardTitle icon="medication">قائمة الطلبات</CardTitle>
            <div className="flex flex-col gap-space-xs">
              {requests.map((req) => (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-text-heading">{req.medicine}</span>
                    <span className="font-body-sm text-body-sm text-text-muted">الكمية: {req.quantity} علبة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-body-sm text-body-sm text-text-muted" dir="ltr">{req.date}</span>
                    {req.status === 'pending' && <Badge className="bg-surface-container-high text-text-body">قيد الانتظار</Badge>}
                    {req.status === 'approved' && <Badge className="bg-primary-fixed/50 text-text-heading">مقبول</Badge>}
                    {req.status === 'rejected' && <Badge className="bg-error-container text-state-danger">مرفوض</Badge>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end border-t border-border-subtle pt-space-md">
              <Button icon="add" onClick={() => setAdding(true)}>طلب دواء جديد</Button>
            </div>
          </Card>
          <AddMedicineModal open={adding} onClose={() => setAdding(false)} onAdded={handleAdd} />
        </RoleGate>
      </PageBody>
    </>
  );
}

function AddMedicineModal({ open, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (!open) return;
    setName('');
    setQuantity('1');
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdded({ medicine: name.trim(), quantity: Number(quantity) });
  };

  return (
    <Modal open={open} onClose={onClose} title="طلب دواء جديد">
      <form className="flex flex-col gap-space-md" onSubmit={submit}>
        <Field label="اسم الدواء" htmlFor="req-med" required>
          <input id="req-med" className={inputClass} placeholder="مثال: أموكسيسيلين..." value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="الكمية المطلوبة (علبة)" htmlFor="req-qty" required>
          <input id="req-qty" type="number" min="1" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </Field>
        <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-border-soft">
          <Button tone="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" icon="add">إرسال الطلب</Button>
        </div>
      </form>
    </Modal>
  );
}
