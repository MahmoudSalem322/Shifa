'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { INTENTS, specialtyOf } from '@/lib/navigator';
import { facilityTypeLabel, geo, statusLabel, stockTone } from '@/lib/vocab';
import { PageBody, PageHeader } from '@/components/app-shell';
import { DoctorCard } from '@/components/doctor-card';
import { Badge, Button, EmergencyBanner, Icon, Spinner } from '@/components/ui';

/* Module 6 · AI Health Navigator — "Create AI Health Navigator UI",
   "Create Chat/Search Input", "Add Send Button", "Display Recommended
   Results", "Handle AI Errors". */

const EXAMPLES = [
  'ابني عنده حرارة وسعال، بدي دكتور أطفال في خان يونس',
  'وين في غسيل كلى في الوسطى؟',
  'بدي صيدلية فيها إنسولين في غزة',
  'مستشفى فيه قسم ولادة قريب من رفح'
];

export default function HealthNavigatorPage() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const send = async (value) => {
    const query = String(value ?? text).trim();
    if (query.length < 2 || busy) return;
    const history = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, text: m.role === 'user' ? m.text : m.data.reply }));
    setMessages((list) => [...list, { id: Date.now() + 'u', role: 'user', text: query }]);
    setText('');
    setBusy(true);
    try {
      const data = await api.navigator.ask(query, governorate, history);
      setMessages((list) => [...list, { id: Date.now() + 'a', role: 'assistant', data }]);
    } catch (error) {
      setMessages((list) => [...list, { id: Date.now() + 'e', role: 'assistant', error: error.message, retry: query }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <>
      <PageHeader title="المساعد الصحي الذكي" subtitle="صف ما تحتاجه بكلماتك، ونرشدك إلى الطبيب أو المنشأة أو الصيدلية المناسبة" />
      <PageBody narrow>
        <div className="bg-gradient-to-l from-primary-container to-text-heading text-on-primary rounded-2xl p-space-md lg:p-space-lg shadow-md flex items-start gap-space-md">
          <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Icon name="assistant" className="text-[32px]" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-lg text-headline-lg">إلى أين أتوجه؟</h1>
            <p className="font-body-md text-body-md text-white/85">
              اكتب الأعراض أو الخدمة التي تبحث عنها ومكانك، مثل &quot;بدي دكتور عيون في النصيرات&quot;. المساعد يرشدك إلى الجهة المناسبة ولا يقدّم تشخيصاً طبياً.
            </p>
          </div>
        </div>

        <section className="flex flex-col gap-space-md" aria-live="polite">
          {!messages.length ? (
            <div className="bg-surface-card rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm">
              <span className="font-label-lg text-label-lg text-text-heading">جرّب أحد هذه الأسئلة:</span>
              <div className="flex flex-wrap gap-space-2xs">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => send(example)}
                    className="px-space-sm py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high text-text-body font-body-sm text-body-sm text-right transition-colors">
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            message.role === 'user'
              ? <UserBubble key={message.id} text={message.text} />
              : <AssistantBubble key={message.id} message={message} onRetry={() => send(message.retry)} busy={busy} />
          ))}

          {busy ? (
            <div className="self-start flex items-center gap-2 bg-surface-card rounded-2xl rounded-tr-sm px-space-md py-space-sm shadow-sm text-text-muted font-body-md text-body-md">
              <Spinner /> أبحث لك…
            </div>
          ) : null}
          <div ref={endRef} />
        </section>

        <form
          className="sticky bottom-0 bg-surface-card rounded-2xl shadow-lg p-space-sm flex flex-col gap-space-xs"
          onSubmit={(event) => { event.preventDefault(); send(); }}
        >
          <div className="flex items-end gap-space-xs">
            <label htmlFor="navigator-input" className="sr-only">رسالتك</label>
            <textarea
              id="navigator-input"
              ref={inputRef}
              rows={2}
              maxLength={500}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="اكتب ما تحتاجه… مثال: بدي مستشفى فيه أشعة في دير البلح"
              className="flex-1 resize-none bg-surface-subtle text-text-body font-body-md text-body-md px-space-sm py-2.5 rounded-xl focus:outline-none focus:bg-surface-container-lowest"
            />
            <Button type="submit" icon="send" busy={busy} busyLabel="" className="h-12 w-12 !px-0 shrink-0" aria-label="إرسال" disabled={text.trim().length < 2}>
              <span className="sr-only">إرسال</span>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <label className="flex items-center gap-space-2xs font-label-sm text-label-sm text-text-muted">
              <Icon name="location_on" className="text-[18px]" />
              محافظتي:
              <select className="bg-surface-subtle rounded-lg px-2 py-1 text-text-body focus:outline-none" value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
                <option value="">غير محددة</option>
                {geo.all().map((g) => <option key={g.slug} value={g.slug}>{g.label}</option>)}
              </select>
            </label>
            <span className="font-label-sm text-label-sm text-text-muted">{text.length}/500 · Enter للإرسال</span>
          </div>
        </form>
      </PageBody>
    </>
  );
}

function UserBubble({ text }) {
  return (
    <div className="self-end max-w-[85%] bg-primary-container text-on-primary rounded-2xl rounded-tl-sm px-space-md py-space-sm shadow-sm font-body-md text-body-md whitespace-pre-line" dir="auto">
      {text}
    </div>
  );
}

function AssistantBubble({ message, onRetry, busy }) {
  if (message.error) {
    return (
      <div className="self-start max-w-[95%] bg-state-danger-subtle text-state-danger rounded-2xl rounded-tr-sm px-space-md py-space-sm flex flex-col gap-space-xs" role="alert">
        <span className="flex items-center gap-2 font-label-lg text-label-lg"><Icon name="error" /> {message.error}</span>
        <Button tone="soft" icon="refresh" className="self-start" onClick={onRetry} disabled={busy}>إعادة المحاولة</Button>
      </div>
    );
  }

  const { data } = message;
  const { params = {}, results = {} } = data;
  const intent = INTENTS[params.intent] || INTENTS.general;
  const specialty = specialtyOf(params.specialty);
  const chips = [
    { icon: intent.icon, text: intent.label },
    specialty ? { icon: 'stethoscope', text: specialty.label } : null,
    params.service ? { icon: 'medical_services', text: params.service } : null,
    params.facilityType ? { icon: 'domain', text: facilityTypeLabel(params.facilityType) } : null,
    params.medicineName ? { icon: 'medication', text: params.medicineName } : null,
    params.governorate ? { icon: 'location_on', text: geo.label(params.governorate) } : null
  ].filter(Boolean);

  return (
    <div className="self-stretch flex flex-col gap-space-sm">
      <div className="self-start max-w-[95%] bg-surface-card rounded-2xl rounded-tr-sm px-space-md py-space-sm shadow-sm flex flex-col gap-space-xs">
        <p className="font-body-md text-body-md text-text-body whitespace-pre-line">{data.reply}</p>
        {data.clarifyingQuestion && data.reply !== data.clarifyingQuestion ? (
          <p className="font-body-md text-body-md text-text-primary">{data.clarifyingQuestion}</p>
        ) : null}
        {params.intent && params.intent !== 'general' ? (
          <div className="flex flex-wrap gap-space-2xs" aria-label="معايير البحث المستخرجة">
            {chips.map((chip) => (
              <Badge key={chip.text} className="bg-surface-container-low text-text-body" icon={chip.icon}>{chip.text}</Badge>
            ))}
          </div>
        ) : null}
        {data.aiNotice ? (
          <p className="font-label-sm text-label-sm text-text-muted flex items-center gap-1"><Icon name="info" className="text-[16px]" /> {data.aiNotice}</p>
        ) : null}
      </div>

      {data.emergency ? <EmergencyBanner /> : null}

      {(data.notes || []).map((note) => (
        <p key={note} className="p-space-xs rounded-lg bg-state-warning-subtle text-state-warning font-body-sm text-body-sm flex gap-2">
          <Icon name="warning" className="text-[18px]" /> {note}
        </p>
      ))}

      {results.doctors && results.doctors.length ? (
        <ResultGroup title="أطباء مقترحون" icon="stethoscope" href="/doctors" more="كل الأطباء">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            {results.doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />)}
          </div>
        </ResultGroup>
      ) : null}

      {results.facilities && results.facilities.length ? (
        <ResultGroup title={data.emergency ? 'أقسام طوارئ' : 'مستشفيات ومراكز صحية'} icon="local_hospital" href="/facilities" more="كل المنشآت">
          {results.facilities.map((facility) => (
            <ResultRow key={facility.id} href={'/facilities/' + facility.id} icon="local_hospital" title={facility.name}
              lines={[
                [facilityTypeLabel(facility.type), facility.address || geo.label(facility.area)].filter(Boolean).join(' · '),
                facility.services.length ? 'الخدمات: ' + facility.services.slice(0, 4).map((s) => s.name).join('، ') : ''
              ]}
              badges={[
                facility.emergency ? { text: 'طوارئ', cls: 'bg-error-container text-state-danger', icon: 'emergency' } : null,
                facility.status ? { text: statusLabel(facility.status), cls: /closed|unavailable/i.test(facility.status) ? 'bg-surface-container-high text-text-muted' : 'bg-state-success-subtle text-state-success' } : null
              ]}
              phone={facility.phone} />
          ))}
        </ResultGroup>
      ) : null}

      {results.medicines && results.medicines.length ? (
        <ResultGroup title="أماكن توفر الدواء" icon="medication" href="/medicines" more="البحث عن دواء">
          {results.medicines.map((medicine) => (
            <div key={medicine.id} className="flex flex-col gap-space-2xs p-space-sm rounded-xl bg-surface-card shadow-sm">
              <Link href={'/medicines/' + medicine.id} className="font-headline-sm text-headline-sm text-text-heading hover:text-primary" dir="auto">{medicine.name}</Link>
              {medicine.stocks.length ? medicine.stocks.slice(0, 4).map((stock, index) => {
                const tone = stockTone(stock);
                return (
                  <div key={index} className="flex items-center justify-between gap-2 p-space-xs rounded-lg bg-surface-subtle">
                    <span className="font-body-sm text-body-sm text-text-body">
                      {stock.pharmacyId != null
                        ? <Link href={'/pharmacies/' + stock.pharmacyId} className="hover:text-primary">{stock.pharmacyName || 'صيدلية'}</Link>
                        : stock.pharmacyName || 'صيدلية'}
                      {stock.address || stock.area ? <span className="text-text-muted"> · {stock.address || geo.label(stock.area)}</span> : null}
                    </span>
                    <Badge className={tone.cls}>{tone.label}</Badge>
                  </div>
                );
              }) : <span className="font-body-sm text-body-sm text-text-muted">لا تتوفر بيانات مخزون لهذا الدواء حالياً.</span>}
              <Link href={'/drug-requests/new?medicine=' + encodeURIComponent(medicine.id)} className="self-start font-label-md text-label-md text-text-primary hover:underline">
                لم تجده؟ أرسل طلب دواء
              </Link>
            </div>
          ))}
        </ResultGroup>
      ) : null}

      {results.pharmacies && results.pharmacies.length ? (
        <ResultGroup title="صيدليات" icon="local_pharmacy" href="/pharmacies" more="دليل الصيدليات">
          {results.pharmacies.map((pharmacy) => (
            <ResultRow key={pharmacy.id} href={'/pharmacies/' + pharmacy.id} icon="local_pharmacy" title={pharmacy.name}
              lines={[pharmacy.address || geo.label(pharmacy.area), pharmacy.workingHours ? 'ساعات العمل: ' + pharmacy.workingHours : '']}
              badges={[
                pharmacy.status ? { text: statusLabel(pharmacy.status), cls: /closed/i.test(pharmacy.status) ? 'bg-surface-container-high text-text-muted' : 'bg-state-success-subtle text-state-success' } : null,
                pharmacy.hasColdChain ? { text: 'تبريد', cls: 'bg-state-info-subtle text-state-info', icon: 'ac_unit' } : null
              ]}
              phone={pharmacy.phone} />
          ))}
        </ResultGroup>
      ) : null}

      {params.intent && params.intent !== 'general' && !data.total ? (
        <div className="p-space-sm rounded-xl bg-surface-card shadow-sm flex flex-col gap-1">
          <span className="font-label-lg text-label-lg text-text-heading flex items-center gap-2"><Icon name="search_off" /> لم نجد نتائج مسجلة تطابق طلبك</span>
          <span className="font-body-sm text-body-sm text-text-muted">جرّب محافظة أخرى أو صياغة مختلفة، أو تصفح الدليل مباشرة.</span>
        </div>
      ) : null}
    </div>
  );
}

function ResultGroup({ title, icon, href, more, children }) {
  return (
    <section className="flex flex-col gap-space-xs">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-headline-sm text-headline-sm text-text-heading flex items-center gap-2"><Icon name={icon} className="text-primary" /> {title}</h2>
        <Link href={href} className="font-label-md text-label-md text-text-primary hover:underline">{more}</Link>
      </div>
      {children}
    </section>
  );
}

function ResultRow({ href, icon, title, lines, badges, phone }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs p-space-sm rounded-xl bg-surface-card shadow-sm">
      <div className="flex items-start gap-space-sm min-w-0">
        <span className="w-11 h-11 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center shrink-0"><Icon name={icon} /></span>
        <div className="flex flex-col min-w-0 gap-0.5">
          <Link href={href} className="font-label-lg text-label-lg text-text-heading hover:text-primary truncate">{title}</Link>
          {lines.filter(Boolean).map((line) => <span key={line} className="font-body-sm text-body-sm text-text-muted">{line}</span>)}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {badges.filter(Boolean).map((badge) => <Badge key={badge.text} className={badge.cls} icon={badge.icon}>{badge.text}</Badge>)}
          </div>
        </div>
      </div>
      {phone ? (
        <a href={'tel:' + phone} className="inline-flex items-center gap-1 self-start sm:self-center px-space-sm py-2 rounded-lg bg-surface-container-low text-text-primary font-label-md text-label-md hover:bg-surface-container-high" dir="ltr">
          <Icon name="call" className="text-[18px]" /> {phone}
        </a>
      ) : null}
    </div>
  );
}
