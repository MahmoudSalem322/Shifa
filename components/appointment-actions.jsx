'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { notifications } from '@/lib/notifications';
import { formatDate, timeLabel } from '@/lib/vocab';
import { useToast } from './toast';
import { Button } from './ui';

/* Module 4 · Feature 3 — "Add Cancel Appointment Button". */
export function CancelAppointmentButton({ appointment, onCancelled, className = '' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (!window.confirm('إلغاء موعدك مع ' + appointment.doctorName + ' يوم ' + formatDate(appointment.date) + '؟')) return;
    setBusy(true);
    try {
      const response = await api.appointments.cancel(appointment.id);
      notifications.add({
        type: 'cancellation',
        title: 'تم إلغاء الموعد',
        message: 'تم إلغاء الموعد مع ' + appointment.doctorName + ' يوم ' + formatDate(appointment.date) + ' الساعة ' + timeLabel(appointment.time) + '.',
        ref: appointment.id
      });
      toast('تم إلغاء الموعد.');
      onCancelled(response.appointment);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button tone="danger" icon="event_busy" busy={busy} busyLabel="جارٍ الإلغاء…" onClick={cancel} className={className}>
      إلغاء الموعد
    </Button>
  );
}
