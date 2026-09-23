'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, pick, toItem } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { notifications } from '@/lib/notifications';
import { formatDate, formatDateTime, geo, MATCH_STATUS } from '@/lib/vocab';
import { useToast } from './toast';
import { AsyncBlock, Badge, Button, CardTitle, EmptyState, Field, Icon, inputClass, Modal } from './ui';

/* Module 9 — donation ↔ drug request matching, the pieces shared by the
   drug request page, the matches list and the match details page. */

export function matchStatus(status) {
  return MATCH_STATUS[status] || MATCH_STATUS.reserved;
}

const NAME_MATCH = {
  exact: { label: 'نفس الدواء', cls: 'bg-state-success-subtle text-state-success', icon: 'check_circle' },
  contains: { label: 'اسم مشابه — تأكد من التركيبة', cls: 'bg-state-warning-subtle text-state-warning', icon: 'warning' },
  generic: { label: 'نفس المادة الفعالة — اسم تجاري مختلف', cls: 'bg-state-warning-subtle text-state-warning', icon: 'swap_horiz' },
  similar: { label: 'اسم قريب (اختلاف في الكتابة)', cls: 'bg-state-warning-subtle text-state-warning', icon: 'spellcheck' }
};

function distanceLabel(candidate) {
  if (candidate.distance == null) return geo.label(candidate.donation.governorate) || 'موقع غير محدد';
  if (candidate.distance === 0) return 'في محافظتك · ' + geo.label(candidate.donation.governorate);
  return geo.label(candidate.donation.governorate) + ' · ' + (candidate.distance === 1 ? 'محافظة مجاورة' : 'على بعد ' + candidate.distance + ' محافظات');
}

/* Best guess at the patient's governorate from their profile. */
function useHomeGovernorate() {
  const [value, setValue] = useState('');
  useEffect(() => {
    let alive = true;
    api.patients.me()
      .then((response) => {
        const profile = toItem(response) || {};
        const slug = geo.normalize(pick(profile, 'governorate', 'city', 'area')) || geo.normalize(pick(profile, 'address', 'location'));
        if (alive && slug) setValue((current) => current || slug);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return [value, setValue];
}

/* "Display Matching Results" + "Select Matching Donation", shown on a
   drug request that is still open. */
export function MatchingDonations({ request, onLinked }) {
  const toast = useToast();
  const [governorate, setGovernorate] = useHomeGovernorate();
  const [selected, setSelected] = useState(null);

  const state = useAsync(() => api.matches.candidates(request.id, governorate), [request.id, governorate]);
  const data = state.data;
  const candidates = (data && data.candidates) || [];

  return (
    <>
      <CardTitle
        icon="join"
        count={data ? candidates.length : undefined}
        actions={<Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>}
      >
        تبرعات مطابقة لطلبك
      </CardTitle>
      <p className="font-body-md text-body-md text-text-muted">
        نبحث في التبرعات المقبولة من الصيدليات والمراكز الصحية عن نفس الدواء وبكمية متاحة وصلاحية كافية، والأقرب إليك أولاً.
      </p>

      <label className="flex flex-col sm:flex-row sm:items-center gap-space-2xs">
        <span className="font-label-md text-label-md text-text-heading whitespace-nowrap">محافظتك:</span>
        <select className={inputClass + ' sm:max-w-xs'} value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
          <option value="">غير محددة</option>
          {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
        </select>
      </label>

      {data && data.reserved > 0 ? (
        <div className="p-space-sm rounded-xl bg-state-info-subtle text-state-info flex items-center gap-2 font-label-md text-label-md">
          <Icon name="inventory_2" />
          {data.outstanding > 0
            ? 'تم ربط ' + data.reserved + ' من ' + data.required + ' — يمكنك إكمال الباقي (' + data.outstanding + ') من تبرع آخر.'
            : 'الكمية المطلوبة كاملة (' + data.required + ') مرتبطة بتبرعات.'}
        </div>
      ) : null}

      <AsyncBlock
        state={state}
        skeleton={2}
        empty={{
          when: data && data.outstanding > 0 && !candidates.length,
          icon: 'search_off',
          title: 'لا توجد تبرعات مطابقة حالياً',
          hint: 'سنبحث مجدداً كلما قُبل تبرع جديد. يمكنك العودة لاحقاً أو البحث عن الدواء في الصيدليات.'
        }}
      >
        <div className="flex flex-col gap-space-sm">
          {candidates.map((candidate) => {
            const name = NAME_MATCH[candidate.nameMatch] || NAME_MATCH.exact;
            return (
              <article key={candidate.donationId} className="flex flex-col gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm text-text-heading" dir="auto">{candidate.donation.medicineName}</span>
                    <span className="font-body-sm text-body-sm text-text-muted">
                      {candidate.donation.reviewedBy ? 'قبلته: ' + candidate.donation.reviewedBy : 'تبرع مقبول'}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-text-muted whitespace-nowrap" title="درجة التطابق">تطابق {candidate.score}%</span>
                </div>
                <div className="flex flex-wrap gap-space-2xs">
                  <Badge className={name.cls} icon={name.icon}>{name.label}</Badge>
                  <Badge className={candidate.fullCoverage ? 'bg-state-success-subtle text-state-success' : 'bg-state-warning-subtle text-state-warning'} icon="numbers">
                    {candidate.fullCoverage
                      ? 'يغطي الكمية كاملة (' + candidate.requiredQuantity + ')'
                      : 'يغطي ' + candidate.availableQuantity + ' من ' + candidate.requiredQuantity}
                    {' ' + (candidate.donation.unit || '')}
                  </Badge>
                  <Badge className={candidate.expiresSoon ? 'bg-state-warning-subtle text-state-warning' : 'bg-surface-container-high text-text-body'} icon="event_busy">
                    تنتهي {formatDate(candidate.donation.expiryDate)} · بعد {candidate.daysToExpiry} يوماً
                  </Badge>
                  <Badge className={candidate.sameGovernorate ? 'bg-state-success-subtle text-state-success' : 'bg-surface-container-high text-text-body'} icon="location_on">
                    {distanceLabel(candidate)}
                  </Badge>
                </div>
                <Button icon="add_link" className="self-start" onClick={() => setSelected(candidate)}>اختيار هذا التبرع</Button>
              </article>
            );
          })}
        </div>
      </AsyncBlock>

      {selected ? (
        <ConfirmMatchModal
          key={selected.donationId}
          request={request}
          candidate={selected}
          governorate={governorate}
          onClose={() => setSelected(null)}
          onDone={(match) => {
            /* The server inbox already tells the patient, donor and reviewer. */
            setSelected(null);
            toast('تم ربط التبرع بطلبك.');
            state.reload();
            if (onLinked) onLinked(match);
          }}
        />
      ) : null}
    </>
  );
}

function ConfirmMatchModal({ request, candidate, governorate, onClose, onDone }) {
  const [quantity, setQuantity] = useState(String(candidate.offerQuantity));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const value = Number(quantity);
    if (!Number.isInteger(value) || value < 1 || value > candidate.offerQuantity) {
      setError('اختر كمية بين 1 و' + candidate.offerQuantity + '.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await api.matches.create({ drugRequestId: request.id, donationId: candidate.donationId, quantity: value, governorate });
      onDone(response.match);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="تأكيد ربط التبرع بطلبك" eyebrow={'طلب #' + request.id}>
      <form className="flex flex-col gap-space-sm" onSubmit={submit} noValidate>
        <div className="p-space-sm rounded-xl bg-surface-subtle flex flex-col gap-1">
          <span className="font-headline-sm text-headline-sm text-text-heading" dir="auto">{candidate.donation.medicineName}</span>
          <span className="font-body-sm text-body-sm text-text-muted">
            {geo.label(candidate.donation.governorate)} · تنتهي {formatDate(candidate.donation.expiryDate)}
          </span>
        </div>
        {candidate.nameMatch !== 'exact' ? (
          <p className="p-space-xs rounded-lg bg-state-warning-subtle text-state-warning font-body-sm text-body-sm flex gap-2">
            <Icon name="warning" className="text-[20px]" />
            اسم الدواء في التبرع ليس مطابقاً تماماً لطلبك ({request.medicineName}). تأكد مع الصيدلي أنه نفس الدواء والتركيز قبل الاستلام.
          </p>
        ) : null}
        <Field label={'الكمية التي تحتاجها من هذا التبرع (' + (candidate.donation.unit || 'وحدة') + ')'} htmlFor="match-quantity" required error={error}
          hint={'المتاح لك: ' + candidate.offerQuantity}>
          <input id="match-quantity" type="number" min="1" max={candidate.offerQuantity} className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <p className="font-body-sm text-body-sm text-text-muted">
          ستُحجز هذه الكمية لك، ويصل إشعار إلى المتبرع وإلى الجهة التي قبلت التبرع لتنسيق التسليم.
        </p>
        <div className="flex gap-space-xs">
          <Button type="submit" busy={busy} busyLabel="جارٍ الربط…" icon="add_link" className="flex-1">تأكيد الربط</Button>
          <Button tone="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </form>
    </Modal>
  );
}

/* One row in a list of matches. */
export function MatchRow({ match }) {
  const status = matchStatus(match.status);
  return (
    <Link href={'/matches/' + match.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs p-space-sm rounded-xl bg-surface-subtle hover:bg-surface-container-low transition-colors">
      <div className="flex items-start gap-space-sm min-w-0">
        <span className="w-11 h-11 rounded-xl bg-state-info-subtle text-state-info flex items-center justify-center shrink-0">
          <Icon name="join" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-label-lg text-label-lg text-text-heading truncate" dir="auto">{match.donationMedicineName}</span>
          <span className="font-body-sm text-body-sm text-text-muted">
            {match.quantity} {match.unit} · طلب <span dir="ltr">#{match.drugRequestId}</span> · {formatDateTime(match.createdAt)}
          </span>
        </div>
      </div>
      <Badge className={status.cls + ' self-start sm:self-center'} icon={status.icon}>{status.label}</Badge>
    </Link>
  );
}

/* The matches already made for one drug request. */
export function RequestMatches({ matches }) {
  if (!matches || !matches.length) return null;
  return (
    <div className="flex flex-col gap-space-2xs">
      {matches.map((match) => <MatchRow key={match.id} match={match} />)}
    </div>
  );
}

/* Cancel / confirm-delivery buttons, per what the server allows. */
export function MatchActions({ match, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!match.canCancel && !match.canDeliver) return null;

  const run = async () => {
    setBusy(true);
    try {
      const response = mode === 'deliver' ? await api.matches.deliver(match.id, note) : await api.matches.cancel(match.id, note);
      notifications.add({
        type: mode === 'deliver' ? 'match_delivered' : 'match_cancelled',
        title: mode === 'deliver' ? 'تم تأكيد تسليم الدواء' : 'أُلغيت مطابقة الدواء',
        message: match.donationMedicineName + ' · ' + match.quantity + ' ' + (match.unit || ''),
        ref: 'match_' + match.id + '_' + mode
      });
      toast(response.message);
      setMode('');
      setNote('');
      onDone(response.match);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-space-xs">
        {match.canDeliver ? <Button tone="success" icon="task_alt" onClick={() => setMode('deliver')}>تأكيد التسليم للمريض</Button> : null}
        {match.canCancel ? <Button tone="danger" icon="link_off" onClick={() => setMode('cancel')}>إلغاء المطابقة</Button> : null}
      </div>
      <Modal open={!!mode} onClose={() => setMode('')} title={mode === 'deliver' ? 'تأكيد تسليم الدواء' : 'إلغاء المطابقة'}>
        <div className="flex flex-col gap-space-sm">
          <p className="font-body-md text-body-md text-text-body">
            {mode === 'deliver'
              ? 'أكّد أن المريض استلم ' + match.quantity + ' ' + (match.unit || '') + ' من ' + match.donationMedicineName + '. سيصل إشعار للمريض وللمتبرع.'
              : 'ستعود الكمية المحجوزة (' + match.quantity + ') إلى التبرع لتصبح متاحة لطلبات أخرى.'}
          </p>
          <Field label="ملاحظة (اختياري)" htmlFor="match-note">
            <textarea id="match-note" rows={2} maxLength={500} className={inputClass + ' resize-none'} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-space-xs">
            <Button tone={mode === 'deliver' ? 'success' : 'danger'} busy={busy} className="flex-1" onClick={run}>
              {mode === 'deliver' ? 'تأكيد التسليم' : 'إلغاء المطابقة'}
            </Button>
            <Button tone="ghost" onClick={() => setMode('')}>رجوع</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function NoMatches({ reviewer }) {
  return (
    <EmptyState
      icon="join"
      title="لا توجد مطابقات بعد"
      hint={reviewer
        ? 'عندما يربط مريض طلب دواء بتبرع قبلتموه، يظهر هنا لتنسيق التسليم.'
        : 'افتح أحد طلبات الأدوية لترى التبرعات المطابقة له، أو انتظر حتى يُربط تبرعك بطلب.'}
    />
  );
}
