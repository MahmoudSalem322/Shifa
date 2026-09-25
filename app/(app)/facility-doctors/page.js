'use client';

import { useEffect, useState } from 'react';
import { api, toList } from '@/lib/api';
import { useAsync, useSession } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import { AsyncBlock, Button, Card, CardTitle, EmptyState, Modal, inputClass, Field } from '@/components/ui';

export default function FacilityDoctorsPage() {
  const toast = useToast();
  const session = useSession();
  const [addingDoctor, setAddingDoctor] = useState(false);

  const state = useAsync(async () => {
    // Only fetch if hospital
    if (!session || session.role !== 'Hospital') return { doctors: [] };
    const raw = await api.facilities.me();
    const doctorsList = toList(await api.doctors.list());
    const doctors = doctorsList.filter(d => String(d.facilityId) === String(raw.id));
    return { doctors };
  }, [session]);

  const removeDoctor = async (id) => {
    if (!window.confirm('هل أنت متأكد من إزالة هذا الطبيب؟')) return;
    try {
      await api.facilities.removeDoctor(id);
      toast('تمت إزالة الطبيب بنجاح.');
      state.reload();
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <>
      <PageHeader title="أطباء المنشأة" subtitle="إدارة الأطباء المتوفرين في المركز الصحي" />
      <PageBody>
        <RoleGate allow={['Hospital']} message="هذه الصفحة مخصصة للمراكز الصحية والمستشفيات فقط.">
          <Card id="facility-doctors">
            <CardTitle icon="groups" count={state.data ? state.data.doctors.length : undefined}>الأطباء المتوفرون</CardTitle>
            <AsyncBlock state={state} empty={{ when: state.data && !state.data.doctors.length, icon: 'groups', title: 'لا يوجد أطباء مسجلون بعد' }}>
              <div className="flex flex-col gap-space-xs">
                {state.data ? state.data.doctors.map((doctor) => (
                  <div key={doctor.id} className="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-text-heading">{doctor.name}</span>
                      <span className="font-body-sm text-body-sm text-text-muted">{doctor.specialization}</span>
                    </div>
                    <Button tone="danger" icon="delete" className="!py-1.5" onClick={() => removeDoctor(doctor.id)}>إزالة</Button>
                  </div>
                )) : null}
              </div>
            </AsyncBlock>
            <div className="mt-2 flex justify-end border-t border-border-subtle pt-space-md">
              <Button icon="person_add" onClick={() => setAddingDoctor(true)}>إضافة طبيب</Button>
            </div>
          </Card>
          <AddDoctorModal open={addingDoctor} onClose={() => setAddingDoctor(false)} onAdded={() => { setAddingDoctor(false); state.reload(); }} />
        </RoleGate>
      </PageBody>
    </>
  );
}

function AddDoctorModal({ open, onClose, onAdded }) {
  const toast = useToast();
  const doctorsState = useAsync(async () => (open ? toList(await api.doctors.list()).filter(d => !d.facilityId) : null), [open]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedId('');
  }, [open]);

  const list = (doctorsState.data || []).filter((d) => !query || d.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedId) return toast('اختر طبيباً من القائمة.');
    setBusy(true);
    try {
      await api.facilities.addDoctor(selectedId);
      toast('تم إضافة الطبيب بنجاح.');
      onAdded();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة طبيب جديد" wide>
      <form className="flex flex-col gap-space-md" onSubmit={submit} noValidate>
        <Field label="ابحث عن طبيب غير مرتبط بمنشأة" htmlFor="doc-search">
          <input id="doc-search" className={inputClass} placeholder="اكتب اسم الطبيب..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </Field>
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1 rounded-xl bg-surface-subtle p-1 border border-border-subtle">
          {doctorsState.loading ? <p className="p-space-sm text-text-muted font-body-sm">جارٍ تحميل قائمة الأطباء...</p> : null}
          {doctorsState.error ? <p className="p-space-sm text-state-danger font-body-sm">{doctorsState.error.message}</p> : null}
          {!doctorsState.loading && !doctorsState.error && !list.length ? <EmptyState icon="person_off" title="لا يوجد أطباء متاحين للإضافة" /> : null}
          {list.map((d) => (
            <label key={d.id} className={'flex flex-wrap items-center gap-2 p-space-xs rounded-lg cursor-pointer ' + (String(d.id) === selectedId ? 'bg-primary-fixed/50' : 'hover:bg-surface-container-low')}>
              <input type="radio" name="doctor" checked={String(d.id) === selectedId} onChange={() => setSelectedId(String(d.id))} />
              <div className="flex flex-col min-w-0">
                <span className="font-label-lg text-label-lg text-text-heading">{d.name}</span>
                {d.specialization ? <span className="font-body-sm text-body-sm text-text-muted truncate">{d.specialization}</span> : null}
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-border-soft">
          <Button tone="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" icon="add" busy={busy} busyLabel="جارٍ الإضافة…">إضافة الطبيب</Button>
        </div>
      </form>
    </Modal>
  );
}
