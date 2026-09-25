'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useToast } from '@/components/toast';
import { useSession } from '@/lib/hooks';
import { DarkModeToggle } from '@/components/dark-mode';
import './landing.css';

/* Landing page. Same sections as before (home, about, services, map,
   contact); the look lives in app/landing.css under .shifa-lp and uses
   the site's colour tokens from legacy.css, so dark mode follows along. */

const SECTIONS = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'about', label: 'من نحن' },
  { id: 'services', label: 'الخدمات' },
  { id: 'map', label: 'الخريطة' },
  { id: 'contact', label: 'تواصل معنا' }
];

const SERVICES = [
  { icon: 'assistant', title: 'المساعد الصحي الذكي', text: 'اكتب ما تحتاجه بكلماتك، ويرشدك المساعد إلى الطبيب أو المنشأة أو الصيدلية المناسبة في محافظتك.', link: 'اسأل المساعد', href: '/health-navigator', featured: true },
  { icon: 'stethoscope', title: 'البحث عن طبيب', text: 'ابحث عن الطبيب المناسب حسب التخصص والموقع والخدمة التي تحتاجها.', link: 'اكتشف الأطباء', href: '/doctors' },
  { icon: 'local_hospital', title: 'المستشفيات والمراكز', text: 'تعرف على المراكز الصحية والمستشفيات والخدمات المتوفرة بالقرب منك.', link: 'استكشف المراكز', href: '/facilities' },
  { icon: 'medication', title: 'البحث عن دواء', text: 'ابحث عن الأدوية وتعرف على الصيدليات التي توفرها والكمية المتاحة.', link: 'ابحث عن دواء', href: '/medicines' },
  { icon: 'calendar_month', title: 'حجز المواعيد', text: 'اختر الطبيب واليوم والوقت المتاح واحجز موعدك مباشرة.', link: 'احجز موعدًا', href: '/doctors' },
  { icon: 'prescriptions', title: 'طلب دواء', text: 'اطلب الدواء الذي تحتاجه وأرفق وصفتك الطبية وتابع حالة الطلب.', link: 'اطلب دواءً', href: '/drug-requests/new' },
  { icon: 'document_scanner', title: 'قارئ الوصفات الذكي', text: 'صوّر وصفتك الطبية ودع الذكاء الاصطناعي يستخرج الأدوية والجرعات لتراجعها.', link: 'اقرأ وصفتك', href: '/prescription-reader' },
  { icon: 'volunteer_activism', title: 'التبرع بالدواء', text: 'لديك دواء فائض؟ ساهم في توفيره لمن يحتاجه من خلال عملية تبرع منظمة وآمنة.', link: 'ساهم بالدواء', href: '/donations/new' },
  { icon: 'join', title: 'مطابقة التبرعات', text: 'نربط الأدوية المتبرع بها بطلبات المرضى حسب الاسم والكمية والصلاحية والموقع.', link: 'تابع المطابقات', href: '/matches' }
];

const FEATURES = [
  { icon: 'verified', title: 'معلومات صحية منظمة', text: 'المستشفيات والعيادات والخدمات وساعات العمل بطريقة واضحة وسهلة.' },
  { icon: 'medical_services', title: 'الطبيب المناسب', text: 'ابحث حسب التخصص والموقع، واعرف تفاصيل الطبيب والخدمات التي يقدمها.' },
  { icon: 'medication', title: 'البحث عن الأدوية', text: 'اعرف الصيدليات التي يتوفر فيها الدواء والكمية المتاحة.' },
  { icon: 'schedule', title: 'توفير الوقت والجهد', text: 'كل ما تحتاجه من خدمات صحية في تجربة واحدة منظمة.' }
];

/* Sample content for the dashboard preview in the hero. */
const DASH_NAV = [
  { icon: 'dashboard', label: 'لوحة التحكم' },
  { icon: 'calendar_month', label: 'مواعيدي' },
  { icon: 'prescriptions', label: 'طلبات الأدوية' },
  { icon: 'volunteer_activism', label: 'تبرعاتي' },
  { icon: 'assistant', label: 'المساعد الذكي' }
];

const DASH_STATS = [
  { icon: 'event_upcoming', value: 2, label: 'مواعيد قادمة', tone: 'green' },
  { icon: 'prescriptions', value: 3, label: 'طلبات أدوية', tone: 'blue' },
  { icon: 'volunteer_activism', value: 1, label: 'تبرعات', tone: 'green' }
];

const DASH_REQUESTS = [
  { name: 'أموكسيسيلين 500', status: 'تمت المطابقة', tone: 'green' },
  { name: 'إنسولين لانتوس', status: 'قيد المراجعة', tone: 'blue' }
];

const STATS = [
  { value: 9, suffix: '', label: 'خدمات صحية' },
  { value: 5, suffix: '', label: 'محافظات مغطاة' },
  { value: 24, suffix: '/7', label: 'متاحة دائماً' }
];

const MARQUEE = ['أطباء', 'مستشفيات', 'صيدليات', 'حجز مواعيد', 'طلب دواء', 'قارئ الوصفات', 'التبرع بالدواء', 'مطابقة التبرعات', 'المساعد الذكي'];

const MAP_TAGS = [
  { icon: 'local_hospital', label: 'مستشفيات', href: '/facilities' },
  { icon: 'stethoscope', label: 'عيادات', href: '/facilities' },
  { icon: 'local_pharmacy', label: 'صيدليات', href: '/pharmacies' },
  { icon: 'emergency', label: 'طوارئ', href: '/facilities' }
];

function Icon({ name, className = '' }) {
  return <span className={'material-symbols-outlined lp-icon ' + className} aria-hidden="true">{name}</span>;
}

/* Counts up once the number scrolls into view. */
function Counter({ value, suffix }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1200);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <strong ref={ref} dir="ltr">{shown}{suffix}</strong>;
}

export default function LandingPage() {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const rootRef = useRef(null);
  const navRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('home');
  const [pill, setPill] = useState(null);
  const [mapQuery, setMapQuery] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      let current = 'home';
      for (const { id } of SECTIONS) {
        const section = document.getElementById(id);
        if (section && window.scrollY >= section.offsetTop - 160) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Reveal on scroll. Hidden only once this runs, so the page reads fine
     before hydration and without JavaScript. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    root.classList.add('lp-animate');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    root.querySelectorAll('.lp-reveal').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  /* The active-section pill slides under the current link. */
  useEffect(() => {
    const place = () => {
      const nav = navRef.current;
      const link = nav && nav.querySelector('[data-active="true"]');
      if (!nav || !link || window.innerWidth <= 900) { setPill(null); return; }
      setPill({ left: link.offsetLeft, width: link.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active]);

  /* Every service sits behind login; remember where the visitor was going. */
  const go = (href) => {
    if (!auth.isAuthed()) {
      auth.rememberReturnTo(href);
      router.push('/login');
      return;
    }
    router.push(href);
  };
  const onKey = (href) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(href); } };
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="shifa-lp shifa-page-fade" ref={rootRef}>
      <header className={'lp-nav' + (scrolled ? ' is-scrolled' : '') + (menuOpen ? ' is-open' : '')}>
        <div className="lp-nav-inner">
          <a href="#home" className="lp-brand">
            <span className="lp-brand-mark"><img src="/image/logo.png" alt="" /></span>
            <span className="lp-brand-word">شفاء</span>
          </a>
          <nav className="lp-links" ref={navRef} aria-label="أقسام الصفحة">
            {pill ? <span className="lp-links-pill" style={{ transform: 'translateX(' + pill.left + 'px)', width: pill.width }} aria-hidden="true" /> : null}
            {SECTIONS.map(({ id, label }) => (
              <a key={id} href={'#' + id} data-active={active === id} aria-current={active === id ? 'true' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </nav>
          <div className="lp-nav-actions">
            <DarkModeToggle />
            <button type="button" className="lp-btn lp-btn-ghost" onClick={() => router.push(session ? '/dashboard' : '/login')}>
              {session ? 'لوحة التحكم' : 'تسجيل الدخول'}
            </button>
            <button type="button" className="lp-btn lp-btn-primary lp-hide-sm" onClick={() => router.push('/login?view=register')}>إنشاء حساب</button>
          </div>
          <button type="button" className="lp-menu-btn" aria-label="القائمة" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------- hero */}
        <section className="lp-hero" id="home">
          <div className="lp-hero-bg" aria-hidden="true">
            <span className="lp-blob lp-blob-a" />
            <span className="lp-blob lp-blob-b" />
            <span className="lp-blob lp-blob-c" />
            <span className="lp-grid-dots" />
          </div>

          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-badge lp-reveal"><span className="lp-badge-dot" />رعاية صحية أقرب وأسهل</div>
              <h1 className="lp-reveal" style={{ '--d': '80ms' }}>
                لأن صحتك <span className="lp-highlight">تستحق الأفضل.</span>
              </h1>
              <p className="lp-lead lp-reveal" style={{ '--d': '160ms' }}>
                شفاء منصة صحية تجمع لك الخدمات الطبية التي تحتاجها في مكان واحد، لتصل إلى الطبيب والمركز الصحي والصيدلية والخدمة المناسبة بسهولة ووضوح.
              </p>
              <div className="lp-hero-actions lp-reveal" style={{ '--d': '240ms' }}>
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => go('/dashboard')}>
                  ابدأ رحلتك الصحية <Icon name="arrow_back" className="lp-arrow" />
                </button>
                <button type="button" className="lp-btn lp-btn-outline lp-btn-lg" onClick={() => scrollTo('services')}>
                  <Icon name="grid_view" /> اكتشف خدماتنا
                </button>
              </div>
              <dl className="lp-stats lp-reveal" style={{ '--d': '320ms' }}>
                {STATS.map((stat) => (
                  <div key={stat.label} className="lp-stat">
                    <dt>{stat.label}</dt>
                    <dd><Counter value={stat.value} suffix={stat.suffix} /></dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="lp-hero-visual lp-reveal" style={{ '--d': '200ms' }}>
              <div className="lp-orbit" aria-hidden="true" />

              <div className="lp-dash" aria-hidden="true">
                <div className="lp-dash-bar">
                  <span className="lp-dash-dots"><i /><i /><i /></span>
                  <span className="lp-dash-url"><Icon name="lock" />shifa.ps/dashboard</span>
                </div>
                <div className="lp-dash-body">
                  <aside className="lp-dash-side">
                    <span className="lp-dash-logo"><img src="/image/logo.png" alt="" />شفاء</span>
                    {DASH_NAV.map((item, i) => (
                      <span key={item.label} className={'lp-dash-nav' + (i === 0 ? ' is-active' : '')}><Icon name={item.icon} />{item.label}</span>
                    ))}
                  </aside>
                  <div className="lp-dash-main">
                    <div className="lp-dash-head">
                      <div><small>أهلاً بك 👋</small><strong>لوحة التحكم</strong></div>
                      <span className="lp-dash-bell"><Icon name="notifications" /><i /></span>
                    </div>
                    <div className="lp-dash-stats">
                      {DASH_STATS.map((stat, i) => (
                        <div key={stat.label} className="lp-dash-stat" style={{ '--i': i }}>
                          <span className={'lp-dash-stat-icon lp-tone-' + stat.tone}><Icon name={stat.icon} /></span>
                          <strong>{stat.value}</strong>
                          <small>{stat.label}</small>
                        </div>
                      ))}
                    </div>
                    <div className="lp-dash-row">
                      <div className="lp-dash-card">
                        <span className="lp-dash-card-title"><Icon name="event" />موعدك القادم</span>
                        <div className="lp-dash-doctor">
                          <span className="lp-dash-avatar"><Icon name="person" /></span>
                          <div><strong>د. سارة خليل</strong><small>طب الأطفال</small></div>
                          <span className="lp-dash-time">10:30 ص</span>
                        </div>
                      </div>
                      <div className="lp-dash-card">
                        <span className="lp-dash-card-title"><Icon name="monitoring" />توفر الأدوية</span>
                        <div className="lp-dash-bars">
                          {[62, 85, 48, 92, 70, 78].map((h, i) => <i key={i} style={{ '--h': h + '%', '--i': i }} />)}
                        </div>
                      </div>
                    </div>
                    <div className="lp-dash-list">
                      {DASH_REQUESTS.map((row, i) => (
                        <div key={row.name} className="lp-dash-item" style={{ '--i': i }}>
                          <span className="lp-dash-pill-icon"><Icon name="medication" /></span>
                          <strong>{row.name}</strong>
                          <span className={'lp-dash-badge lp-tone-' + row.tone}>{row.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lp-float-card lp-float-a">
                <span className="lp-float-icon"><Icon name="local_hospital" /></span>
                <div><strong>خدمات صحية قريبة</strong><small>مستشفيات وعيادات وصيدليات</small></div>
              </div>
              <div className="lp-float-card lp-float-b">
                <span className="lp-float-icon lp-tone-blue"><Icon name="medication" /></span>
                <div><strong>الدواء متوفر</strong><small>ابحث عن أقرب صيدلية</small></div>
              </div>
              <div className="lp-float-pill">
                <Icon name="favorite" />
                <div><strong>رعاية في مكان واحد</strong><small>أطباء • مراكز • صيدليات • مواعيد</small></div>
              </div>
            </div>
          </div>

          <div className="lp-marquee" aria-hidden="true">
            <div className="lp-marquee-track">
              {[...MARQUEE, ...MARQUEE].map((word, i) => (
                <span key={i}><Icon name="add" />{word}</span>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- about */}
        <section className="lp-section" id="about">
          <div className="lp-container">
            <div className="lp-heading lp-reveal">
              <span className="lp-eyebrow">لماذا شفاء؟</span>
              <h2>كل ما تحتاجه للرعاية الصحية في تجربة واحدة</h2>
              <p>لأن الحصول على الخدمة الصحية المناسبة لا يجب أن يكون معقدًا.</p>
            </div>

            <div className="lp-bento">
              <div className="lp-bento-photo lp-reveal">
                <div className="lp-photo-chip"><span />معًا نحو رعاية أفضل</div>
              </div>

              <div className="lp-bento-intro lp-reveal" style={{ '--d': '100ms' }}>
                <Icon name="health_and_safety" className="lp-bento-mark" />
                <p>تساعدك شفاء على اكتشاف الخدمات الصحية المناسبة، الوصول إلى الأطباء والمراكز، البحث عن الأدوية، وتنظيم رحلتك الصحية بطريقة بسيطة وواضحة.</p>
              </div>

              {FEATURES.map((feature, i) => (
                <article key={feature.title} className="lp-feature lp-reveal" style={{ '--d': 150 + i * 70 + 'ms' }}>
                  <span className="lp-feature-icon"><Icon name={feature.icon} /></span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}

              <div className="lp-donate lp-reveal" role="button" tabIndex={0} onClick={() => go('/donations/new')} onKeyDown={onKey('/donations/new')} style={{ '--d': '300ms' }}>
                <span className="lp-donate-icon"><Icon name="volunteer_activism" /></span>
                <div>
                  <h3>لديك دواء فائض؟</h3>
                  <p>يمكن للمنصة تنظيم عملية التبرع بالأدوية الفائضة وربطها بالأشخاص والجهات التي تحتاج إليها.</p>
                </div>
                <span className="lp-donate-cta">تبرع الآن <Icon name="arrow_back" className="lp-arrow" /></span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ services */}
        <section className="lp-section lp-section-tint" id="services">
          <div className="lp-container">
            <div className="lp-heading lp-reveal">
              <span className="lp-eyebrow">خدمات شفاء</span>
              <h2>كل ما تحتاجه في مكان واحد</h2>
              <p>خدمات صحية مصممة لتجعل الوصول إلى الرعاية أسرع وأسهل وأكثر تنظيمًا.</p>
            </div>
            <div className="lp-services">
              {SERVICES.map((service, i) => (
                <div
                  key={service.title}
                  className={'lp-service lp-reveal' + (service.featured ? ' is-featured' : '')}
                  style={{ '--d': (i % 3) * 90 + 'ms' }}
                  role="button"
                  tabIndex={0}
                  onClick={() => go(service.href)}
                  onKeyDown={onKey(service.href)}
                >
                  <span className="lp-service-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lp-service-icon"><Icon name={service.icon} /></span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <span className="lp-service-link">{service.link} <Icon name="arrow_back" className="lp-arrow" /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- map */}
        <section className="lp-section" id="map">
          <div className="lp-container">
            <div className="lp-heading lp-reveal">
              <span className="lp-eyebrow">الخريطة الصحية</span>
              <h2>اكتشف الخدمات الصحية من حولك</h2>
              <p>موقع واحد يساعدك على معرفة أماكن الخدمات الصحية والوصول إليها بسهولة.</p>
            </div>
            <div className="lp-map lp-reveal">
              <iframe
                title="خريطة الخدمات الصحية"
                src="https://www.openstreetmap.org/export/embed.html?bbox=34.20%2C31.20%2C34.60%2C31.60&layer=mapnik"
                loading="lazy"
              />
              <div className="lp-map-panel">
                <span className="lp-map-pin"><Icon name="location_on" /></span>
                <h3>ابحث عن خدمة صحية</h3>
                <p>اختر نوع الخدمة التي تبحث عنها</p>
                <div className="lp-map-search">
                  <Icon name="search" />
                  <input
                    aria-label="ابحث عن مستشفى أو صيدلية"
                    type="text"
                    value={mapQuery}
                    onChange={(e) => setMapQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') go(/صيدلي/.test(mapQuery) ? '/pharmacies' : '/facilities'); }}
                    placeholder="مثال: صيدلية، مستشفى، مركز صحي..."
                  />
                </div>
                <div className="lp-map-tags">
                  {MAP_TAGS.map((tag) => (
                    <button type="button" key={tag.label} className="lp-chip" onClick={() => go(tag.href)}><Icon name={tag.icon} />{tag.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- contact */}
        <section className="lp-section lp-section-tight" id="contact">
          <div className="lp-container">
            <div className="lp-cta lp-reveal">
              <span className="lp-cta-ring lp-cta-ring-a" aria-hidden="true" />
              <span className="lp-cta-ring lp-cta-ring-b" aria-hidden="true" />
              <div className="lp-cta-copy">
                <span className="lp-eyebrow lp-eyebrow-light">تواصل معنا</span>
                <h2>نحن هنا لمساعدتك</h2>
                <p>لديك سؤال أو اقتراح؟ يسعدنا أن نسمع منك ونعمل على تحسين تجربة شفاء باستمرار.</p>
              </div>
              <div className="lp-cta-actions">
                <button type="button" className="lp-btn lp-btn-light lp-btn-lg" onClick={() => toast('أهلًا بك في شفاء 🌿 — سيتم تجهيز نموذج التواصل قريبًا.')}>
                  <Icon name="chat" /> تواصل معنا
                </button>
                <button type="button" className="lp-btn lp-btn-glass lp-btn-lg" onClick={() => router.push('/login?view=register')}>إنشاء حساب</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-about">
              <a href="#home" className="lp-brand">
                <span className="lp-brand-mark"><img src="/image/logo.png" alt="" /></span>
                <span className="lp-brand-word">شفاء</span>
              </a>
              <p>منصة صحية تهدف إلى تسهيل الوصول إلى الخدمات الصحية وربط المستخدمين بالأطباء والمراكز والصيدليات بطريقة بسيطة ومنظمة.</p>
            </div>
            <div className="lp-footer-col">
              <h4>روابط سريعة</h4>
              {SECTIONS.slice(0, 4).map(({ id, label }) => <a key={id} href={'#' + id}>{label}</a>)}
            </div>
            <div className="lp-footer-col">
              <h4>خدماتنا</h4>
              <Link href="/doctors">البحث عن طبيب</Link>
              <Link href="/medicines">البحث عن دواء</Link>
              <Link href="/donations/new">التبرع بالأدوية</Link>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2026 شفاء — جميع الحقوق محفوظة</span>
            <button type="button" className="lp-to-top" onClick={() => scrollTo('home')} aria-label="العودة للأعلى"><Icon name="arrow_upward" /></button>
          </div>
        </div>
      </footer>
    </div>
  );
}
