'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from './toast';
import { Button, Field, inputClass, Modal } from './ui';

/* Approve / reject buttons for a pending donation (Module 8 · Feature 2).
   Rejection asks for a reason, which is shown to the donor. */
export function ReviewActions({ donation, onDone, compact = false }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const approve = async () => {
    if (!window.confirm('قبول التبرع بـ ' + donation.medicineName + '؟')) return;
    setBusy('approve');
    try {
      await api.donations.approve(donation.id);
      toast('تم قبول التبرع.');
      onDone('approved');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy('');
    }
  };

  const reject = async (event) => {
    event.preventDefault();
    if (reason.trim().length < 3) return setError('اذكر سبب الرفض ليصل إلى المتبرع.');
    setBusy('reject');
    setError('');
    try {
      await api.donations.reject(donation.id, reason.trim());
      toast('تم رفض التبرع.');
      setRejecting(false);
      setReason('');
      onDone('rejected');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <div className={'flex flex-wrap gap-space-xs ' + (compact ? '' : 'pt-space-xs border-t border-border-soft')}>
        <Button tone="success" icon="check_circle" busy={busy === 'approve'} busyLabel="جارٍ القبول…" onClick={approve} className={compact ? '!py-1.5' : ''}>
          قبول
        </Button>
        <Button tone="danger" icon="cancel" disabled={!!busy} onClick={() => setRejecting(true)} className={compact ? '!py-1.5' : ''}>
          رفض
        </Button>
      </div>
      <Modal open={rejecting} onClose={() => setRejecting(false)} title="رفض التبرع" eyebrow={donation.medicineName}>
        <form className="flex flex-col gap-space-sm" onSubmit={reject} noValidate>
          <Field label="سبب الرفض" htmlFor={'reason-' + donation.id} required error={error}>
            <textarea id={'reason-' + donation.id} rows={3} className={inputClass + ' resize-none'} value={reason} maxLength={500}
              onChange={(e) => setReason(e.target.value)} placeholder="مثال: تاريخ الصلاحية قريب، أو الدواء غير مطلوب حالياً" autoFocus />
          </Field>
          <div className="flex gap-space-xs">
            <Button type="submit" tone="danger" busy={busy === 'reject'} busyLabel="جارٍ الرفض…" className="flex-1">تأكيد الرفض</Button>
            <Button tone="ghost" onClick={() => setRejecting(false)}>إلغاء</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
