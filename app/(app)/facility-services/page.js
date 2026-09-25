'use client';
import { useState, useEffect } from 'react';
import { api, toItem } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import { serviceStatus, statusLabel, SERVICE_STATUSES, TONE_BADGE, TONE_SOLID } from '@/lib/vocab';
import { useToast } from '@/components/toast';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { AsyncBlock, Badge, Button, Card, CardTitle, inputClass, Modal, Field } from '@/components/ui';

function StatusSwitch({ value, options, onChange, label = 'حالة العمل' }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="inline-flex flex-wrap rounded-lg bg-surface-container-low p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={busy}
          onClick={async () => { if (value === option.value) return; setBusy(true); try { await onChange(option.value); } finally { setBusy(false); } }}
          className={'px-space-sm py-1.5 rounded-md font-label-md text-label-md transition-colors disabled:opacity-60 ' +
            (value === option.value ? TONE_SOLID[option.tone] : 'text-text-body hover:bg-surface-container-high')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ServiceRow({ service }) {
  const toast = useToast();
  const [status, setStatus] = useState(serviceStatus(service.status));

  const update = async (next) => {
    try {
      await api.facilities.updateService(service.id, next);
      setStatus(next);
      toast('تم تحديث حالة الخدمة.');
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
      <span className="font-headline-sm text-headline-sm text-text-heading">{service.name}</span>
      {service.id == null ? (
        <Badge className={TONE_BADGE.neutral}>{statusLabel(status)}</Badge>
      ) : (
        <StatusSwitch value={status} options={SERVICE_STATUSES} onChange={update} label={'حالة ' + service.name} />
      )}
    </div>
  );
}

export default function FacilityServicesPage() {
  const session = useSession();
  const [addingService, setAddingService] = useState(false);

  const state = useAsync(async () => {
    if (!session || session.role !== 'Hospital') return { facility: { services: [] } };
    const raw = toItem(await api.facilities.me()) || {};
    return { facility: raw };
  }, [session]);

  return (
    <>
      <PageHeader title="الخدمات والأقسام" subtitle="إدارة الخدمات والأقسام الطبية المتاحة في المركز" />
      <PageBody>
        <RoleGate allow={['Hospital']} message="هذه الصفحة مخصصة للمراكز الصحية والمستشفيات فقط.">
          <Card id="facility-services">
            <CardTitle icon="health_and_safety" count={state.data ? state.data.facility.services?.length : undefined}>الخدمات والأقسام</CardTitle>
            <AsyncBlock state={state} empty={{ when: state.data && !state.data.facility.services?.length, icon: 'health_and_safety', title: 'لا توجد خدمات مسجّلة بعد' }}>
              <div className="flex flex-col gap-space-xs">
                {state.data && state.data.facility.services ? state.data.facility.services.map((service, index) => <ServiceRow key={(service.id ?? 's') + '-' + index} service={service} />) : null}
              </div>
            </AsyncBlock>
            <div className="mt-2 flex justify-end border-t border-border-subtle pt-space-md">
              <Button icon="add" onClick={() => setAddingService(true)}>إضافة قسم جديد</Button>
            </div>
          </Card>
          <AddServiceModal open={addingService} onClose={() => setAddingService(false)} onAdded={() => { setAddingService(false); state.reload(); }} />
        </RoleGate>
      </PageBody>
    </>
  );
}

function AddServiceModal({ open, onClose, onAdded }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2) return toast('أدخل اسم القسم (حرفين على الأقل).');
    setBusy(true);
    try {
      await api.facilities.addService(name.trim());
      toast('تم إضافة القسم بنجاح.');
      onAdded();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة قسم جديد">
      <form className="flex flex-col gap-space-md" onSubmit={submit} noValidate>
        <Field label="اسم القسم" htmlFor="srv-name" required>
          <input id="srv-name" className={inputClass} placeholder="مثال: قسم الطوارئ، العناية المركزة..." value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="وصف إضافي (اختياري)" htmlFor="srv-desc">
          <input id="srv-desc" className={inputClass} placeholder="معلومات إضافية عن القسم..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-border-soft">
          <Button tone="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" icon="add" busy={busy} busyLabel="جارٍ الإضافة…">إضافة القسم</Button>
        </div>
      </form>
    </Modal>
  );
}
