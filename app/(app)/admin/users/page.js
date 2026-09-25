'use client';

import { useState } from 'react';
import { api, fieldErrors, pick } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { formatDateTime, roles, validate } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import {
  AdminBlock, DetailsModal, PAGE_SIZE, Pager, readPage, recordId, searchClass, selectClass, StatusBadge, statusOptions, useAdminAction
} from '@/components/admin-kit';
import { Button, Card, CardTitle, Field, Icon, inputClass, Modal } from '@/components/ui';

/* Admin · registered accounts on the .NET API: browse, filter, view,
   change status, delete, message, and create new accounts (on .NET that
   goes through the normal signup, so the new user confirms by OTP). */

const ROLE_FILTERS = ['Patient', 'Doctor', 'Hospital', 'Pharmacy', 'Donor', 'Admin'];
const KNOWN_STATUSES = ['Active', 'Inactive', 'Suspended', 'Blocked'];

const nameOf = (u) => pick(u, 'fullName', 'name', 'userName', 'username') || '—';

function AddUserModal({ open, onClose, onDone }) {
  const empty = { fullName: '', email: '', phone: '', role: 'Patient', password: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.fullName.trim().length < 3) next.fullName = 'أدخل الاسم (3 أحرف على الأقل).';
    if (!validate.gmail(form.email)) next.email = 'أدخل بريد Gmail صحيح.';
    if (!validate.phone(form.phone)) next.phone = 'رقم الهاتف 10 أرقام يبدأ بـ 05.';
    if (!validate.password(form.password)) next.password = 'كلمة المرور 8 أحرف على الأقل.';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'كلمتا المرور غير متطابقتين.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const response = await api.admin.users.create({ ...form, fullName: form.fullName.trim(), email: form.email.trim() });
      setDone((response && response.message) || 'تم إنشاء الحساب.');
      setForm(empty);
      onDone();
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors({ form: Object.values(fields).join(' ') || error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { setDone(''); setErrors({}); onClose(); }} title="إضافة حساب جديد" wide>
      {done ? <p className="p-space-sm rounded-xl bg-state-success-subtle text-state-success font-body-md text-body-md">{done}</p> : null}
      <form className="grid grid-cols-1 md:grid-cols-2 gap-space-md" onSubmit={submit} noValidate>
        <Field label="الاسم الكامل" htmlFor="nu-name" required error={errors.fullName}><input id="nu-name" className={inputClass} value={form.fullName} onChange={set('fullName')} /></Field>
        <Field label="نوع الحساب" htmlFor="nu-role" required>
          <select id="nu-role" className={inputClass + ' cursor-pointer'} value={form.role} onChange={set('role')}>
            {roles.all().map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="البريد الإلكتروني" htmlFor="nu-email" required error={errors.email}><input id="nu-email" dir="ltr" className={inputClass + ' text-left'} value={form.email} onChange={set('email')} /></Field>
        <Field label="الهاتف" htmlFor="nu-phone" required error={errors.phone}><input id="nu-phone" dir="ltr" maxLength={10} className={inputClass + ' text-left'} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="كلمة المرور" htmlFor="nu-pass" required error={errors.password}><input id="nu-pass" type="password" className={inputClass} value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <Field label="تأكيد كلمة المرور" htmlFor="nu-pass2" required error={errors.confirmPassword}><input id="nu-pass2" type="password" className={inputClass} value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" /></Field>
        {errors.form ? <p className="md:col-span-2 font-label-md text-label-md text-state-danger" role="alert">{errors.form}</p> : null}
        <div className="md:col-span-2"><Button type="submit" icon="person_add" busy={busy} busyLabel="جارٍ الإنشاء…">إنشاء الحساب</Button></div>
      </form>
    </Modal>
  );
}

function NotifyModal({ user, onClose }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const { busy, run } = useAdminAction(null);
  const send = async () => {
    const ok = await run('send', () => api.admin.notify([String(recordId(user))], title.trim(), message.trim()));
    if (ok) { setTitle(''); setMessage(''); onClose(); }
  };
  return (
    <Modal open={!!user} onClose={onClose} title="إرسال إشعار" eyebrow={user ? nameOf(user) : ''}>
      <div className="flex flex-col gap-space-sm">
        <Field label="العنوان" htmlFor="nt-title" required><input id="nt-title" className={inputClass} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="الرسالة" htmlFor="nt-msg"><textarea id="nt-msg" rows={4} maxLength={1000} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Button icon="send" busy={busy === 'send'} disabled={title.trim().length < 2} onClick={send}>إرسال</Button>
      </div>
    </Modal>
  );
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [messaging, setMessaging] = useState(null);
  const [adding, setAdding] = useState(false);
  const search = useDebounced(query);

  const state = useAsync(
    async () => readPage(await api.admin.users.list({ search: search.trim(), role, status, page, pageSize: PAGE_SIZE })),
    [search, role, status, page]
  );
  const { busy, run } = useAdminAction(state.reload);
  const users = (state.data && state.data.items) || [];
  const statuses = statusOptions(users, KNOWN_STATUSES);

  const filter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <>
      <PageHeader title="الحسابات المسجلة" subtitle="كل مستخدمي منصة شفاء: عرض وتعديل الحالة وحذف وإضافة" />
      <PageBody>
        <RoleGate allow={['Admin']} message="هذه الصفحة متاحة للإدارة فقط">
          <Card>
            <CardTitle icon="group" count={state.data ? (state.data.total ?? users.length) : undefined} actions={
              <>
                <Button icon="person_add" onClick={() => setAdding(true)}>إضافة حساب</Button>
                <Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>
              </>
            }>
              المستخدمون
            </CardTitle>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs">
              <div className="relative">
                <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
                <input className={searchClass} placeholder="ابحث بالاسم أو البريد أو الهاتف" value={query} onChange={filter(setQuery)} aria-label="بحث" />
              </div>
              <select className={selectClass} value={role} onChange={filter(setRole)} aria-label="نوع الحساب">
                <option value="">كل أنواع الحسابات</option>
                {ROLE_FILTERS.map((r) => <option key={r} value={r}>{roles.toArabic(r)}</option>)}
              </select>
              <select className={selectClass} value={status} onChange={filter(setStatus)} aria-label="الحالة">
                <option value="">كل الحالات</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <AdminBlock state={state} empty={{ when: !users.length, icon: 'person_off', title: 'لا يوجد مستخدمون مطابقون' }}>
              <div className="flex flex-col gap-space-xs">
                {users.map((u) => {
                  const id = recordId(u);
                  const current = pick(u, 'status', 'accountStatus') || '';
                  return (
                    <div key={id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex items-start gap-space-sm min-w-0">
                        <span className="w-11 h-11 rounded-full bg-primary/10 text-text-primary flex items-center justify-center shrink-0"><Icon name="person" /></span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-headline-sm text-headline-sm text-text-heading truncate">{nameOf(u)}</span>
                          <span className="font-body-sm text-body-sm text-text-muted truncate" dir="auto">
                            {[roles.toArabic(pick(u, 'role', 'userRole')), pick(u, 'email'), pick(u, 'phone', 'phoneNumber')].filter(Boolean).join(' · ')}
                          </span>
                          {pick(u, 'createdAt') ? <span className="font-body-sm text-body-sm text-text-muted">سُجّل {formatDateTime(pick(u, 'createdAt'))}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-2xs">
                        <StatusBadge value={current} />
                        <select className={selectClass + ' !py-1.5'} value="" aria-label="تغيير الحالة" disabled={busy === 'status' + id}
                          onChange={(e) => e.target.value && run('status' + id, () => api.admin.users.setStatus(id, e.target.value), { confirm: 'تغيير حالة ' + nameOf(u) + ' إلى ' + e.target.value + '؟', success: 'تم تحديث الحالة.' })}>
                          <option value="">تغيير الحالة…</option>
                          {statuses.filter((s) => s !== current).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Button tone="soft" icon="visibility" className="!py-1.5" onClick={() => setViewing(u)}>التفاصيل</Button>
                        <Button tone="soft" icon="notifications" className="!py-1.5" onClick={() => setMessaging(u)}>إشعار</Button>
                        <Button tone="danger" icon="delete" className="!py-1.5" busy={busy === 'del' + id} busyLabel="…"
                          onClick={() => run('del' + id, () => api.admin.users.remove(id), { confirm: 'حذف حساب ' + nameOf(u) + ' نهائياً؟ لا يمكن التراجع.', success: 'تم حذف الحساب.' })}>
                          حذف
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pager page={page} setPage={setPage} count={users.length} total={state.data && state.data.total} />
            </AdminBlock>
          </Card>

          <DetailsModal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? nameOf(viewing) : ''}
            recordKey={viewing ? recordId(viewing) : null} load={() => api.admin.users.get(recordId(viewing))} />
          <NotifyModal user={messaging} onClose={() => setMessaging(null)} />
          <AddUserModal open={adding} onClose={() => setAdding(false)} onDone={state.reload} />
        </RoleGate>
      </PageBody>
    </>
  );
}
