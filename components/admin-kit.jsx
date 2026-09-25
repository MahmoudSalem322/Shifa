'use client';

import { useEffect, useState } from 'react';
import { pick, toItem, toList } from '@/lib/api';
import { formatDateTime } from '@/lib/vocab';
import { useToast } from './toast';
import { Badge, Button, Icon, Modal } from './ui';

/* Pieces shared by the admin pages. The .NET admin endpoints publish no
   response schema, so lists and records are read through pick() and any
   field the page does not know is still shown in the details view. */

export const selectClass = 'bg-surface-subtle py-2.5 px-space-sm rounded-lg cursor-pointer focus:outline-none';
export const searchClass = 'w-full bg-surface-subtle py-2.5 pr-10 pl-space-sm rounded-lg focus:outline-none';

export const PAGE_SIZE = 20;

/* { items, total } from a paged or plain list response. */
export function readPage(response) {
  const items = toList(response);
  const node = response && typeof response === 'object' && !Array.isArray(response) ? response : {};
  const inner = node.data && typeof node.data === 'object' && !Array.isArray(node.data) ? node.data : {};
  const total = pick(node, 'totalCount', 'total', 'count', 'totalItems') ?? pick(inner, 'totalCount', 'total', 'count', 'totalItems');
  return { items, total: typeof total === 'number' ? total : null };
}

export const recordId = (record) => pick(record, 'id', 'userId', 'Id');
export const readItem = (response) => toItem(response) || {};

/* Distinct status values present in a list, merged with known ones. */
export function statusOptions(items, known = []) {
  const seen = new Set(known);
  for (const item of items) {
    const value = pick(item, 'status', 'accountStatus', 'state');
    if (value !== undefined && value !== null && value !== '') seen.add(String(value));
  }
  return [...seen];
}

const LABELS = {
  id: 'المعرّف', userId: 'المعرّف', fullName: 'الاسم', name: 'الاسم', userName: 'اسم المستخدم', email: 'البريد الإلكتروني',
  phone: 'الهاتف', phoneNumber: 'الهاتف', role: 'نوع الحساب', status: 'الحالة', createdAt: 'تاريخ الإنشاء', updatedAt: 'آخر تحديث',
  isActive: 'مفعّل', isVerified: 'موثّق', emailConfirmed: 'البريد مؤكد', address: 'العنوان', type: 'النوع', kind: 'الفئة',
  specialization: 'التخصص', medicineName: 'الدواء', quantity: 'الكمية', notes: 'ملاحظات', governorate: 'المحافظة',
  scientificName: 'الاسم العلمي', category: 'التصنيف', description: 'الوصف', dosage: 'الجرعة', manufacturer: 'الشركة المصنعة',
  rejectionReason: 'سبب الرفض', donorName: 'المتبرع', donorPhone: 'هاتف المتبرع', expiryDate: 'تاريخ الانتهاء'
};

function show(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
  if (typeof value === 'object') return Array.isArray(value) ? (value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('، ') : '—') : JSON.stringify(value);
  return String(value);
}

/* Every field of a record, known labels first. */
export function RecordDetails({ record }) {
  if (!record) return null;
  const entries = Object.entries(record).filter(([key]) => !/password|token|hash|secret/i.test(key));
  entries.sort(([a], [b]) => (LABELS[a] ? 0 : 1) - (LABELS[b] ? 0 : 1));
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-md gap-y-space-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col min-w-0 p-space-xs rounded-lg bg-surface-subtle">
          <dt className="font-label-sm text-label-sm text-text-muted">{LABELS[key] || key}</dt>
          <dd className="font-body-md text-body-md text-text-heading break-words" dir="auto">{show(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/* Loads one record (`load`, keyed by `recordKey`) while open and shows it. */
export function DetailsModal({ open, onClose, title, recordKey, load, children }) {
  const [state, setState] = useState({ loading: false, record: null, error: '' });
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setState({ loading: true, record: null, error: '' });
    load().then(
      (response) => alive && setState({ loading: false, record: readItem(response), error: '' }),
      (error) => alive && setState({ loading: false, record: null, error: error.message })
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is a fresh closure each render; recordKey identifies it
  }, [open, recordKey]);
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      {state.loading ? <p className="font-body-md text-body-md text-text-muted">جارٍ التحميل…</p> : null}
      {state.error ? <p className="font-body-md text-body-md text-state-danger">{state.error}</p> : null}
      {state.record ? <RecordDetails record={state.record} /> : null}
      {children}
    </Modal>
  );
}

export function StatusBadge({ value }) {
  const key = String(value || '').toLowerCase();
  const cls = /active|approved|open|verified|completed|fulfilled|delivered/.test(key) ? 'bg-state-success-subtle text-state-success'
    : /pending|review|submitted|waiting/.test(key) ? 'bg-state-warning-subtle text-state-warning'
      : /reject|block|suspend|banned|inactive|disabled|closed|cancel|deleted/.test(key) ? 'bg-error-container text-state-danger'
        : 'bg-surface-container-high text-text-muted';
  return <Badge className={cls}>{value || '—'}</Badge>;
}

export function Pager({ page, setPage, count, total }) {
  const last = total != null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : null;
  const hasNext = last != null ? page < last : count >= PAGE_SIZE;
  if (page === 1 && !hasNext) return null;
  return (
    <div className="flex items-center justify-center gap-space-sm">
      <Button tone="soft" icon="chevron_right" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Button>
      <span className="font-label-md text-label-md text-text-body">صفحة {page}{last ? ' من ' + last : ''}</span>
      <Button tone="soft" icon="chevron_left" disabled={!hasNext} onClick={() => setPage(page + 1)}>التالي</Button>
    </div>
  );
}

/* Runs an admin action with a confirmation, a toast and a reload. */
export function useAdminAction(onDone) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const run = async (key, action, { confirm, success } = {}) => {
    if (confirm && !window.confirm(confirm)) return false;
    setBusy(key);
    try {
      const response = await action();
      toast((response && response.message) || success || 'تم.');
      if (onDone) onDone();
      return true;
    } catch (error) {
      toast(error.message);
      return false;
    } finally {
      setBusy('');
    }
  };
  return { busy, run };
}

/* Shown in place of a list when the .NET admin account is not linked. */
export function isLinkError(error) {
  return !!(error && error.payload && /dotnet_admin_/.test(String(error.payload.code || '')));
}

export function LinkNotice({ error }) {
  const missing = error && error.payload && error.payload.code === 'dotnet_admin_missing';
  return (
    <div className="p-space-md rounded-xl bg-state-warning-subtle text-state-warning flex items-start gap-space-sm">
      <Icon name="link_off" className="text-[26px] shrink-0" />
      <div className="flex flex-col gap-space-2xs">
        <span className="font-headline-sm text-headline-sm">{missing ? 'لم يُربط حساب أدمن خادم شفاء بعد' : 'تعذّر استخدام حساب أدمن خادم شفاء'}</span>
        <span className="font-body-md text-body-md">{error.message}</span>
        <span className="font-body-sm text-body-sm">
          هذه البيانات (الحسابات المسجلة، المنشآت، الأدوية، طلبات الأدوية) مخزّنة على خادم شفاء، وتتطلب حساباً دوره Admin هناك.
          أضف بريده وكلمة مروره إلى <code dir="ltr">.env.local</code> باسم <code dir="ltr">SHIFA_ADMIN_EMAIL</code> و <code dir="ltr">SHIFA_ADMIN_PASSWORD</code>.
        </span>
      </div>
    </div>
  );
}

/* AsyncBlock-like wrapper that explains a missing .NET link. */
export function AdminBlock({ state, empty, children }) {
  if (state.loading && !state.data) return <p className="font-body-md text-body-md text-text-muted p-space-sm">جارٍ التحميل…</p>;
  if (state.error) {
    if (isLinkError(state.error)) return <LinkNotice error={state.error} />;
    return (
      <div className="p-space-md rounded-xl bg-error-container text-state-danger flex items-center justify-between gap-space-sm flex-wrap">
        <span className="font-body-md text-body-md">{state.error.message}</span>
        <Button tone="soft" icon="refresh" onClick={state.reload}>إعادة المحاولة</Button>
      </div>
    );
  }
  if (empty && empty.when) {
    return (
      <div className="flex flex-col items-center gap-space-2xs p-space-lg text-text-muted">
        <Icon name={empty.icon || 'inbox'} className="text-[36px]" />
        <span className="font-headline-sm text-headline-sm">{empty.title}</span>
      </div>
    );
  }
  return children;
}
