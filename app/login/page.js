'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth, fieldErrors } from '@/lib/api';
import { useButtonRoleKeys } from '@/lib/hooks';
import { roles, validate } from '@/lib/vocab';
import { DarkModeToggle } from '@/components/dark-mode';

/* Login, register, forgot-password (email → OTP) and new-password views.
   The server owns account state, the OTP and the token; this page only
   collects input, mirrors the server's validation and renders the result.
   The old in-page "dashboard" and "edit" views are gone — /dashboard is
   the real, role-aware dashboard. */

const VIEWS = ['login', 'register', 'forgot', 'newPassword'];

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c7 0 10 7 10 7a18.3 18.3 0 0 1-3.1 4.4" />
      <path d="M6.6 6.6C3.8 8.3 2 11 2 11s3.5 7 10 7c1.5 0 2.8-.3 4-.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordInput({ id, value, onChange, placeholder, invalid }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-wrapper">
      <input
        type={shown ? 'text' : 'password'}
        id={id}
        className={'input password-input' + (invalid ? ' field-invalid' : '')}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={shown ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        onClick={() => setShown((s) => !s)}
      >
        <EyeIcon open={shown} />
      </button>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="logo"><img src="/image/logo.png" alt="شفاء" className="logo-img" /></div>
      <div className="brand-text">شفاء</div>
    </div>
  );
}

/* Submit button with a spinner, a steady width, and a note when the
   server is slow to wake up. */
function SubmitButton({ busy, busyLabel, slow, children, type = 'submit', onClick }) {
  return (
    <>
      <button type={type} className={'btn shifa-auth-submit' + (busy ? ' is-busy' : '')} disabled={busy} aria-busy={busy || undefined} onClick={onClick}>
        {busy ? <><span className="shifa-spinner" aria-hidden="true" />{busyLabel}</> : children}
      </button>
      {busy && slow ? (
        <p className="shifa-auth-slow" role="status">الخادم يستيقظ بعد فترة خمول، قد يستغرق ذلك حتى دقيقة. لا تغلق الصفحة.</p>
      ) : null}
    </>
  );
}

function Message({ message }) {
  if (!message) return <div className="message" />;
  return <div className={'message ' + message.type} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>;
}

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState('login');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  /* Render's free tier sleeps; after a few seconds, explain the wait. */
  const [slow, setSlow] = useState(false);
  const [entering, setEntering] = useState(false);
  useButtonRoleKeys();
  useEffect(() => {
    if (!busy) { setSlow(false); return undefined; }
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [busy]);
  const [invalid, setInvalid] = useState({});

  const [login, setLogin] = useState({ emailOrPhone: '', password: '', remember: false });
  const [register, setRegister] = useState({ fullName: '', email: '', phone: '', role: '', password: '', confirmPassword: '' });
  const [forgot, setForgot] = useState({ email: '', otp: '', otpStep: false });
  const [reset, setReset] = useState({ newPassword: '', confirmNewPassword: '' });
  const [pendingEmail, setPendingEmail] = useState('');

  const show = (next) => {
    setView(next);
    setMessage(null);
    setInvalid({});
    window.history.replaceState(null, '', next === 'login' ? '/login' : '/login?view=' + next);
  };

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('view');
    if (requested && VIEWS.includes(requested) && requested !== 'newPassword') setView(requested);
    else if (auth.isAuthed()) router.replace('/dashboard');
  }, [router]);

  const error = (text) => setMessage({ type: 'error', text });
  const success = (text) => setMessage({ type: 'success', text });

  /* Applies a 400 envelope: highlights the fields and shows every message. */
  const applyServerError = (err, fieldMap) => {
    const fields = fieldErrors(err);
    const marked = {};
    for (const key of Object.keys(fields)) if (fieldMap[key]) marked[fieldMap[key]] = true;
    setInvalid(marked);
    const lines = Object.values(fields);
    error(lines.length ? lines.join(' ') : err.message);
  };

  const enterApp = () => {
    const returnTo = auth.consumeReturnTo();
    router.replace(returnTo && returnTo !== '/login' ? returnTo : '/dashboard');
  };

  /* ---- login ------------------------------------------------------ */

  const submitLogin = async (event) => {
    event.preventDefault();
    setInvalid({});
    const emailOrPhone = login.emailOrPhone.trim();
    if (!emailOrPhone) return error('البريد الإلكتروني أو رقم الهاتف: قم بادخاله');
    if (!validate.emailOrPhone(emailOrPhone)) return error('أدخل بريد Gmail صحيح أو رقم هاتف مكوّن من 10 أرقام يبدأ بـ 05.');
    if (!login.password) return error('كلمة المرور: قم بادخاله');

    setBusy(true);
    setMessage(null);
    try {
      const response = await api.auth.login({ emailOrPhone, password: login.password, rememberMe: login.remember });
      auth.setSession(response);
      if (!auth.isAuthed()) {
        error('لم يتم تأكيد الحساب بعد. تحقّق من بريدك الإلكتروني.');
        return;
      }
      /* Keep the loading state up until the dashboard takes over. */
      setEntering(true);
      enterApp();
      return;
    } catch (err) {
      applyServerError(err, { EmailOrPhone: 'loginEmail', Password: 'loginPassword', Credentials: 'loginPassword' });
    } finally {
      setBusy(false);
    }
  };

  /* ---- register --------------------------------------------------- */

  const submitRegister = async (event) => {
    event.preventDefault();
    setInvalid({});
    const r = { ...register, fullName: register.fullName.trim(), email: register.email.trim(), phone: register.phone.trim() };
    if (!r.fullName) return error('الاسم: قم بادخاله');
    if (!r.email) return error('البريد الإلكتروني: قم بادخاله');
    if (!validate.gmail(r.email)) return error('يجب إدخال بريد Gmail صحيح (مثال: name@gmail.com).');
    if (!r.phone) return error('رقم الهاتف: قم بادخاله');
    if (!validate.phone(r.phone)) return error('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.');
    if (!r.role) return error('نوع الحساب: قم بادخاله');
    if (!r.password) return error('كلمة المرور: قم بادخاله');
    if (!validate.password(r.password)) return error('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
    if (!r.confirmPassword) return error('تأكيد كلمة المرور: قم بادخاله');
    if (r.password !== r.confirmPassword) return error('كلمتا المرور غير متطابقتين.');

    setBusy(true);
    success('جارٍ إنشاء الحساب…');
    try {
      const response = await api.auth.signup({ ...r, role: roles.normalize(r.role) });
      auth.setSession(response);
      /* Some deployments hand back a token at once; others want the OTP. */
      if (auth.isAuthed()) {
        auth.mergeSession({ fullName: r.fullName, email: r.email, phone: r.phone, role: roles.normalize(r.role) });
        success('تم إنشاء حسابك بنجاح 🌿');
        /* Keep the form locked until the redirect, so it cannot be sent twice. */
        setEntering(true);
        setTimeout(enterApp, 700);
        return;
      }
      setPendingEmail(r.email);
      setForgot({ email: r.email, otp: '', otpStep: true });
      setView('forgot');
      success('تم إنشاء حسابك. أدخل رمز التحقق المُرسل إلى ' + r.email);
    } catch (err) {
      applyServerError(err, {
        FullName: 'registerName', Email: 'registerEmail', Phone: 'registerPhone',
        Password: 'registerPassword', ConfirmPassword: 'registerConfirmPassword', Role: 'registerRole'
      });
    } finally {
      setBusy(false);
    }
  };

  /* ---- forgot password / OTP -------------------------------------- */

  const sendOtp = async () => {
    const email = forgot.email.trim();
    if (!email) return error('البريد الإلكتروني: قم بادخاله');
    if (!validate.gmail(email)) return error('يجب إدخال بريد Gmail صحيح (مثال: name@gmail.com).');
    setBusy(true);
    success('جارٍ إرسال رمز التحقق…');
    try {
      await api.auth.forgotPassword(email);
      setPendingEmail(email);
      setForgot((f) => ({ ...f, otpStep: true }));
      success('تم إرسال رمز التحقق إلى بريدك الإلكتروني.');
    } catch (err) {
      applyServerError(err, { Email: 'forgotEmail' });
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (busy) return;
    const email = pendingEmail || forgot.email.trim();
    if (!validate.gmail(email)) return error('يجب إدخال بريد Gmail صحيح (مثال: name@gmail.com).');
    setBusy(true);
    success('جارٍ إعادة إرسال الرمز…');
    try {
      await api.auth.resendOtp(email);
      setPendingEmail(email);
      success('تم إرسال رمز جديد إلى بريدك الإلكتروني.');
    } catch (err) {
      applyServerError(err, { Email: 'forgotEmail' });
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    const otp = forgot.otp.trim();
    if (!otp) return error('رمز التحقق: قم بادخاله');
    if (!validate.otp(otp)) return error('رمز التحقق يجب أن يتكون من 6 أرقام.');
    const email = pendingEmail || forgot.email.trim();
    setBusy(true);
    success('جارٍ التحقق من الرمز…');
    try {
      const response = await api.auth.verifyOtp(email, otp);
      setPendingEmail(email);
      /* Verifying a new signup can return the token; a reset does not. */
      auth.setSession(response);
      if (auth.isAuthed()) {
        enterApp();
        return;
      }
      show('newPassword');
    } catch (err) {
      applyServerError(err, { Otp: 'otpInput', Email: 'forgotEmail' });
    } finally {
      setBusy(false);
    }
  };

  /* ---- new password ----------------------------------------------- */

  const submitReset = async (event) => {
    event.preventDefault();
    setInvalid({});
    if (!reset.newPassword) return error('كلمة المرور الجديدة: قم بادخاله');
    if (!validate.password(reset.newPassword)) return error('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
    if (!reset.confirmNewPassword) return error('تأكيد كلمة المرور: قم بادخاله');
    if (reset.newPassword !== reset.confirmNewPassword) return error('كلمتا المرور غير متطابقتين.');
    if (!pendingEmail) return error('انتهت صلاحية العملية. ابدأ من جديد بطلب رمز تحقق.');

    setBusy(true);
    try {
      await api.auth.resetPassword({ email: pendingEmail, ...reset });
      success('تم حفظ كلمة المرور الجديدة بنجاح ✓');
      setPendingEmail('');
      setReset({ newPassword: '', confirmNewPassword: '' });
      setTimeout(() => show('login'), 1000);
    } catch (err) {
      applyServerError(err, { NewPassword: 'newPassword', ConfirmNewPassword: 'confirmNewPassword' });
    } finally {
      setBusy(false);
    }
  };

  const cls = (id) => 'input' + (invalid[id] ? ' field-invalid' : '');

  return (
    <div className="shifa-auth-page shifa-page-fade">
      <div className="page">
        <Link href="/" className="home-link">← العودة للرئيسية</Link>
        <DarkModeToggle className="auth-theme-toggle" />

        <div className="auth-wrapper">
          <div className="auth-card">
            {view === 'login' && (
              <section id="loginView">
                <Brand />
                <h1 className="title">تسجيل الدخول</h1>
                <p className="subtitle">سجّل الدخول للوصول إلى حسابك في شفاء</p>
                <Message message={message} />
                <form onSubmit={submitLogin} noValidate aria-busy={busy || undefined}>
                  <fieldset className="shifa-auth-fieldset" disabled={busy || entering}>
                  <div className="form-group">
                    <label htmlFor="loginEmail">البريد الإلكتروني أو رقم الهاتف</label>
                    <input
                      type="text" id="loginEmail" className={cls('loginEmail')} autoComplete="username"
                      placeholder="name@gmail.com أو 05xxxxxxxx"
                      value={login.emailOrPhone} onChange={(e) => setLogin({ ...login, emailOrPhone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="loginPassword">كلمة المرور</label>
                    <PasswordInput id="loginPassword" placeholder="أدخل كلمة المرور" invalid={invalid.loginPassword}
                      value={login.password} onChange={(password) => setLogin({ ...login, password })} />
                  </div>
                  <div className="form-options">
                    <label className="remember">
                      <input type="checkbox" checked={login.remember} onChange={(e) => setLogin({ ...login, remember: e.target.checked })} />
                      تذكرني
                    </label>
                    <span className="forgot-link" role="button" tabIndex={0} onClick={() => show('forgot')}>نسيت كلمة المرور؟</span>
                  </div>
                  <SubmitButton busy={busy || entering} busyLabel={entering ? 'جارٍ فتح حسابك…' : 'جارٍ تسجيل الدخول…'} slow={slow}>تسجيل الدخول</SubmitButton>
                  </fieldset>
                </form>
                <div className="switch-auth">
                  ليس لديك حساب؟ <span role="button" tabIndex={0} onClick={() => show('register')}>إنشاء حساب</span>
                </div>
              </section>
            )}

            {view === 'register' && (
              <section id="registerView">
                <Brand />
                <h1 className="title">إنشاء حساب</h1>
                <p className="subtitle">أنشئ حسابك وابدأ باستخدام خدمات شفاء</p>
                <form onSubmit={submitRegister} noValidate aria-busy={busy || undefined}>
                  <fieldset className="shifa-auth-fieldset" disabled={busy || entering}>
                  <div className="form-group">
                    <label htmlFor="registerName">الاسم الكامل</label>
                    <input type="text" id="registerName" className={cls('registerName')} placeholder="أدخل اسمك الكامل"
                      value={register.fullName} onChange={(e) => setRegister({ ...register, fullName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="registerEmail">البريد الإلكتروني</label>
                    <input type="email" id="registerEmail" className={cls('registerEmail')} placeholder="name@gmail.com"
                      value={register.email} onChange={(e) => setRegister({ ...register, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="registerPhone">رقم الهاتف</label>
                    <input type="text" id="registerPhone" className={cls('registerPhone')} placeholder="05xxxxxxxx"
                      maxLength={10} inputMode="numeric" style={{ direction: 'ltr', textAlign: 'right' }}
                      value={register.phone} onChange={(e) => setRegister({ ...register, phone: e.target.value.replace(/[^0-9]/g, '') })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="registerRole">نوع الحساب</label>
                    <select id="registerRole" className={cls('registerRole')}
                      value={register.role} onChange={(e) => setRegister({ ...register, role: e.target.value })}>
                      <option value="">اختر نوع الحساب</option>
                      {roles.all().map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="registerPassword">كلمة المرور</label>
                    <PasswordInput id="registerPassword" placeholder="8 أحرف أو أكثر" invalid={invalid.registerPassword}
                      value={register.password} onChange={(password) => setRegister({ ...register, password })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="registerConfirmPassword">تأكيد كلمة المرور</label>
                    <PasswordInput id="registerConfirmPassword" placeholder="أعد كتابة كلمة المرور" invalid={invalid.registerConfirmPassword}
                      value={register.confirmPassword} onChange={(confirmPassword) => setRegister({ ...register, confirmPassword })} />
                  </div>
                  <Message message={message} />
                  <SubmitButton busy={busy || entering} busyLabel={entering ? 'جارٍ فتح حسابك…' : 'جارٍ إنشاء الحساب…'} slow={slow}>إنشاء الحساب</SubmitButton>
                  </fieldset>
                </form>
                <div className="switch-auth">
                  لديك حساب بالفعل؟ <span role="button" tabIndex={0} onClick={() => show('login')}>تسجيل الدخول</span>
                </div>
              </section>
            )}

            {view === 'forgot' && (
              <section id="forgotView">
                <Brand />
                <h1 className="title">{forgot.otpStep ? 'أدخل رمز التحقق' : 'نسيت كلمة المرور؟'}</h1>
                <p className="subtitle">
                  {forgot.otpStep ? 'أرسلنا رمزاً مكوّناً من 6 أرقام إلى بريدك الإلكتروني' : 'أدخل بريدك الإلكتروني لإرسال رمز التحقق'}
                </p>
                <Message message={message} />
                {!forgot.otpStep ? (
                  <div id="emailStep">
                    <div className="form-group">
                      <label htmlFor="forgotEmail">البريد الإلكتروني</label>
                      <input type="email" id="forgotEmail" className={cls('forgotEmail')} placeholder="name@gmail.com"
                        value={forgot.email} onChange={(e) => setForgot({ ...forgot, email: e.target.value })} />
                    </div>
                    <SubmitButton type="button" busy={busy} busyLabel="جارٍ الإرسال…" slow={slow} onClick={sendOtp}>إرسال رمز التحقق</SubmitButton>
                  </div>
                ) : (
                  <div id="otpStep" className="otp-box active">
                    <div className="form-group">
                      <label htmlFor="otpInput">رمز التحقق</label>
                      <input type="text" id="otpInput" className={cls('otpInput') + ' otp-input'} maxLength={6} inputMode="numeric"
                        placeholder="000000" value={forgot.otp}
                        onChange={(e) => setForgot({ ...forgot, otp: e.target.value.replace(/[^0-9]/g, '') })} />
                    </div>
                    <SubmitButton type="button" busy={busy} busyLabel="جارٍ التحقق…" slow={slow} onClick={verifyOtp}>تحقق من الرمز</SubmitButton>
                    <div className="resend" role="button" tabIndex={0} onClick={resendOtp}>إعادة إرسال الرمز</div>
                  </div>
                )}
                <div className="switch-auth" role="button" tabIndex={0} style={{ cursor: 'pointer' }}
                  onClick={() => { setForgot({ email: '', otp: '', otpStep: false }); show('login'); }}>
                  ← العودة لتسجيل الدخول
                </div>
              </section>
            )}

            {view === 'newPassword' && (
              <section id="newPasswordView">
                <Brand />
                <h1 className="title">إنشاء كلمة مرور جديدة</h1>
                <p className="subtitle">أدخل كلمة مرور جديدة وآمنة لحسابك</p>
                <Message message={message} />
                <form onSubmit={submitReset} noValidate aria-busy={busy || undefined}>
                  <fieldset className="shifa-auth-fieldset" disabled={busy || entering}>
                  <div className="form-group">
                    <label htmlFor="newPassword">كلمة المرور الجديدة</label>
                    <PasswordInput id="newPassword" placeholder="أدخل كلمة المرور الجديدة" invalid={invalid.newPassword}
                      value={reset.newPassword} onChange={(newPassword) => setReset({ ...reset, newPassword })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmNewPassword">تأكيد كلمة المرور</label>
                    <PasswordInput id="confirmNewPassword" placeholder="أعد كتابة كلمة المرور الجديدة" invalid={invalid.confirmNewPassword}
                      value={reset.confirmNewPassword} onChange={(confirmNewPassword) => setReset({ ...reset, confirmNewPassword })} />
                  </div>
                  <SubmitButton busy={busy} busyLabel="جارٍ الحفظ…" slow={slow}>حفظ كلمة المرور الجديدة</SubmitButton>
                  </fieldset>
                </form>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
