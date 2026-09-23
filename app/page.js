'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useToast } from '@/components/toast';
import { useSession } from '@/lib/hooks';

const SECTIONS = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'about', label: 'من نحن' },
  { id: 'services', label: 'الخدمات' },
  { id: 'map', label: 'الخريطة' },
  { id: 'contact', label: 'تواصل معنا' }
];

const SERVICES = [
  { icon: '🧭', title: 'المساعد الصحي الذكي', text: 'اكتب ما تحتاجه بكلماتك، ويرشدك المساعد إلى الطبيب أو المنشأة أو الصيدلية المناسبة في محافظتك.', link: 'اسأل المساعد ←', href: '/health-navigator' },
  { icon: '👨‍⚕️', title: 'البحث عن طبيب', text: 'ابحث عن الطبيب المناسب حسب التخصص والموقع والخدمة التي تحتاجها.', link: 'اكتشف الأطباء ←', href: '/doctors' },
  { icon: '🏥', title: 'المستشفيات والمراكز', text: 'تعرف على المراكز الصحية والمستشفيات والخدمات المتوفرة بالقرب منك.', link: 'استكشف المراكز ←', href: '/facilities' },
  { icon: '💊', title: 'البحث عن دواء', text: 'ابحث عن الأدوية وتعرف على الصيدليات التي توفرها والكمية المتاحة.', link: 'ابحث عن دواء ←', href: '/medicines' },
  { icon: '📅', title: 'حجز المواعيد', text: 'اختر الطبيب واليوم والوقت المتاح واحجز موعدك مباشرة.', link: 'احجز موعدًا ←', href: '/doctors' },
  { icon: '📝', title: 'طلب دواء', text: 'اطلب الدواء الذي تحتاجه وأرفق وصفتك الطبية وتابع حالة الطلب.', link: 'اطلب دواءً ←', href: '/drug-requests/new' },
  { icon: '🔎', title: 'قارئ الوصفات الذكي', text: 'صوّر وصفتك الطبية ودع الذكاء الاصطناعي يستخرج الأدوية والجرعات لتراجعها.', link: 'اقرأ وصفتك ←', href: '/prescription-reader' },
  { icon: '🤝', title: 'التبرع بالدواء', text: 'لديك دواء فائض؟ ساهم في توفيره لمن يحتاجه من خلال عملية تبرع منظمة وآمنة.', link: 'ساهم بالدواء ←', href: '/donations/new' },
  { icon: '🔗', title: 'مطابقة التبرعات', text: 'نربط الأدوية المتبرع بها بطلبات المرضى حسب الاسم والكمية والصلاحية والموقع.', link: 'تابع المطابقات ←', href: '/matches' }
];

export default function LandingPage() {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('home');
  const [mapQuery, setMapQuery] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      let current = 'home';
      for (const { id } of SECTIONS) {
        const section = document.getElementById(id);
        if (section && window.scrollY >= section.offsetTop - 150) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Every service sits behind login; remember where the visitor was going. */
  const go = (href) => {
    if (!auth.isAuthed()) {
      auth.rememberReturnTo(href);
      router.push('/login');
      return;
    }
    router.push(href);
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="shifa-landing">
      <header className={'navbar' + (scrolled ? ' scrolled' : '')} id="navbar">
        <div className="container nav-container">
          <a href="#home" className="logo">
            <div className="logo-icon"><img src="/image/logo.png" alt="شفاء" className="logo-img" /></div>
            <span>شفاء</span>
          </a>
          <nav className={'nav-links' + (menuOpen ? ' show' : '')} id="navLinks">
            {SECTIONS.map(({ id, label }) => (
              <a key={id} href={'#' + id} className={active === id ? 'active' : ''} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </nav>
          <div className="nav-actions">
            <button className="login-btn" onClick={() => router.push(session ? '/dashboard' : '/login')}>
              {session ? 'لوحة التحكم' : 'تسجيل الدخول'}
            </button>
            <button className="register-btn" onClick={() => router.push('/login?view=register')}>إنشاء حساب</button>
          </div>
          <button className="menu-btn" id="menuBtn" aria-label="القائمة" onClick={() => setMenuOpen((open) => !open)}>☰</button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="container hero-grid">
            <div className="hero-content">
              <div className="hero-badge">رعاية صحية أقرب وأسهل</div>
              <h1>لأن صحتك <span>تستحق الأفضل.</span></h1>
              <p className="hero-description">
                شفاء منصة صحية تجمع لك الخدمات الطبية التي تحتاجها في مكان واحد، لتصل إلى الطبيب والمركز الصحي والصيدلية والخدمة المناسبة بسهولة ووضوح.
              </p>
              <div className="hero-buttons">
                <button className="primary-btn" onClick={() => go('/dashboard')}>ابدأ رحلتك الصحية ←</button>
                <button className="secondary-btn" onClick={() => scrollTo('services')}>اكتشف خدماتنا</button>
              </div>
            </div>

            <div className="hero-image-wrapper">
              <div className="hero-image">
                <div className="hero-mini-card one">
                  <div className="hero-mini-icon">🏥</div>
                  <div><strong>خدمات صحية قريبة</strong><span>مستشفيات وعيادات وصيدليات</span></div>
                </div>
                <div className="hero-mini-card two">
                  <div className="hero-mini-icon">💊</div>
                  <div><strong>الدواء متوفر</strong><span>ابحث عن أقرب صيدلية</span></div>
                </div>
                <div className="shifa-phone">
                  <div className="phone-notch" />
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo"><div className="phone-logo-icon"><img src="/image/logo.png" alt="" className="logo-img" /></div>شفاء</div>
                      <div className="phone-notification">♧</div>
                    </div>
                    <div className="phone-welcome">
                      <small>أهلاً بك في شفاء</small>
                      <strong>كيف يمكننا مساعدتك اليوم؟</strong>
                    </div>
                    <div className="phone-search">🔍 <span>ابحث عن طبيب، دواء أو مركز صحي...</span></div>
                    <div className="phone-title">خدمات شفاء</div>
                    <div className="phone-services">
                      <div className="phone-service"><div className="phone-service-icon">👨‍⚕️</div><strong>الأطباء</strong><span>ابحث حسب التخصص</span></div>
                      <div className="phone-service"><div className="phone-service-icon">🏥</div><strong>المراكز الصحية</strong><span>الأقرب إليك</span></div>
                      <div className="phone-service"><div className="phone-service-icon">💊</div><strong>الأدوية</strong><span>توفر الدواء</span></div>
                      <div className="phone-service"><div className="phone-service-icon">🤝</div><strong>تبرع بالدواء</strong><span>ساهم لمن يحتاج</span></div>
                    </div>
                    <div className="phone-title">طبيب مقترح</div>
                    <div className="phone-doctor">
                      <div className="doctor-avatar" />
                      <div className="doctor-info"><strong>طبيب متخصص</strong><span>طب عام • متاح الآن</span></div>
                      <div className="doctor-status">متاح</div>
                    </div>
                    <div className="phone-bottom-nav">
                      <div className="phone-nav-item active"><div>⌂</div>الرئيسية</div>
                      <div className="phone-nav-item"><div>🔍</div>بحث</div>
                      <div className="phone-nav-item"><div>♡</div>المفضلة</div>
                      <div className="phone-nav-item"><div>👤</div>حسابي</div>
                    </div>
                  </div>
                </div>
                <div className="hero-floating-card">
                  <strong>رعاية في مكان واحد</strong>
                  <small>أطباء • مراكز • صيدليات • مواعيد</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about" id="about">
          <div className="container">
            <div className="section-heading">
              <h2 style={{ fontSize: 48, color: 'var(--green-dark)', fontWeight: 800, marginBottom: 14 }}>لماذا شفاء؟</h2>
              <p>لأن الحصول على الخدمة الصحية المناسبة لا يجب أن يكون معقدًا.</p>
            </div>
            <div className="about-grid">
              <div className="about-image" />
              <div className="about-content">
                <h2>كل ما تحتاجه للرعاية الصحية في تجربة واحدة.</h2>
                <p className="about-intro">تساعدك شفاء على اكتشاف الخدمات الصحية المناسبة، الوصول إلى الأطباء والمراكز، البحث عن الأدوية، وتنظيم رحلتك الصحية بطريقة بسيطة وواضحة.</p>
                <div className="features">
                  <div className="feature"><div className="feature-icon">✓</div><div><h4>معلومات صحية منظمة</h4><p>الوصول إلى المستشفيات والعيادات والخدمات الصحية وساعات العمل بطريقة واضحة وسهلة.</p></div></div>
                  <div className="feature"><div className="feature-icon">♡</div><div><h4>الوصول إلى الطبيب المناسب</h4><p>ابحث عن الطبيب حسب التخصص والموقع، واعرف تفاصيل الطبيب والخدمات التي يقدمها.</p></div></div>
                  <div className="feature"><div className="feature-icon">⌕</div><div><h4>البحث عن الأدوية</h4><p>تعرف على الصيدليات التي يتوفر فيها الدواء والكمية المتاحة والمسافة للوصول إليها.</p></div></div>
                  <div className="feature"><div className="feature-icon">⏱</div><div><h4>توفير الوقت والجهد</h4><p>كل ما تحتاجه من خدمات صحية في تجربة واحدة منظمة تساعدك على الوصول للخدمة المناسبة.</p></div></div>
                </div>
                <div className="donation-box" role="button" tabIndex={0} onClick={() => go('/donations/new')} onKeyDown={(e) => { if (e.key === 'Enter') go('/donations/new'); }}>
                  <div className="donation-info">
                    <div className="donation-icon">🤝</div>
                    <div><h4>لديك دواء فائض؟</h4><p>يمكن للمنصة تنظيم عملية التبرع بالأدوية الفائضة وربطها بالأشخاص والجهات التي تحتاج إليها.</p></div>
                  </div>
                  <div className="donation-status">تبرع الآن ←</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="services" id="services">
          <div className="container">
            <div className="section-heading">
              <span>خدمات شفاء</span>
              <h2>كل ما تحتاجه في مكان واحد</h2>
              <p>خدمات صحية مصممة لتجعل الوصول إلى الرعاية أسرع وأسهل وأكثر تنظيمًا.</p>
            </div>
            <div className="services-grid">
              {SERVICES.map((service) => (
                <div
                  key={service.title}
                  className="service-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => go(service.href)}
                  onKeyDown={(e) => { if (e.key === 'Enter') go(service.href); }}
                >
                  <div className="service-icon">{service.icon}</div>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <div className="service-link">{service.link}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="map-section" id="map">
          <div className="container">
            <div className="section-heading">
              <span>الخريطة الصحية</span>
              <h2>اكتشف الخدمات الصحية من حولك</h2>
              <p>موقع واحد يساعدك على معرفة أماكن الخدمات الصحية والوصول إليها بسهولة.</p>
            </div>
            <div className="map-container">
              <iframe
                title="خريطة الخدمات الصحية"
                src="https://www.openstreetmap.org/export/embed.html?bbox=34.20%2C31.20%2C34.60%2C31.60&layer=mapnik"
                loading="lazy"
              />
              <div className="map-overlay">
                <h3>ابحث عن خدمة صحية</h3>
                <p>اختر نوع الخدمة التي تبحث عنها</p>
                <input
                  type="text"
                  className="map-search"
                  value={mapQuery}
                  onChange={(e) => setMapQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') go(/صيدلي/.test(mapQuery) ? '/pharmacies' : '/facilities'); }}
                  placeholder="مثال: صيدلية، مستشفى، مركز صحي..."
                />
                <div className="map-tags">
                  <button className="map-tag" onClick={() => go('/facilities')}>🏥 مستشفيات</button>
                  <button className="map-tag" onClick={() => go('/facilities')}>🩺 عيادات</button>
                  <button className="map-tag" onClick={() => go('/pharmacies')}>💊 صيدليات</button>
                  <button className="map-tag" onClick={() => go('/facilities')}>🚑 طوارئ</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="container">
            <div className="contact-box">
              <div className="contact-content">
                <span>تواصل معنا</span>
                <h2>نحن هنا لمساعدتك</h2>
                <p>لديك سؤال أو اقتراح؟ يسعدنا أن نسمع منك ونعمل على تحسين تجربة شفاء باستمرار.</p>
              </div>
              <button className="contact-btn" onClick={() => toast('أهلًا بك في شفاء 🌿 — سيتم تجهيز نموذج التواصل قريبًا.')}>تواصل معنا</button>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-about">
              <div className="footer-logo"><div className="footer-logo-icon"><img src="/image/logo.png" alt="شفاء" className="logo-img" /></div><span>شفاء</span></div>
              <p>منصة صحية تهدف إلى تسهيل الوصول إلى الخدمات الصحية وربط المستخدمين بالأطباء والمراكز والصيدليات بطريقة بسيطة ومنظمة.</p>
            </div>
            <div className="footer-column">
              <h4>روابط سريعة</h4>
              <a href="#home">الرئيسية</a>
              <a href="#about">من نحن</a>
              <a href="#services">الخدمات</a>
              <a href="#map">الخريطة</a>
            </div>
            <div className="footer-column">
              <h4>خدماتنا</h4>
              <Link href="/doctors">البحث عن طبيب</Link>
              <Link href="/medicines">البحث عن دواء</Link>
              <Link href="/donations/new">التبرع بالأدوية</Link>
            </div>
          </div>
          <div className="copyright">© 2026 شفاء — جميع الحقوق محفوظة</div>
        </div>
      </footer>
    </div>
  );
}
