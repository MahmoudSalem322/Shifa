'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'shifa-theme';

const DarkModeContext = createContext({ isDark: false, toggle: () => {} });

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
}

function savedTheme() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  /* The inline script in app/layout.js already set the class before
     hydration; read it back, then keep following the system theme for as
     long as the user has not picked one. */
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (event) => {
      if (savedTheme()) return;
      applyTheme(event.matches);
      setIsDark(event.matches);
    };
    /* Another tab changed the theme. */
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      const dark = event.newValue ? event.newValue === 'dark' : media.matches;
      applyTheme(dark);
      setIsDark(dark);
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch {}
    setIsDark(next);
  }, []);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}

/* Compact toggle button: moon in light mode, sun in dark mode. */
export function DarkModeToggle({ className = '', ...rest }) {
  const { isDark, toggle } = useDarkMode();
  const label = isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      onClick={toggle}
      {...rest}
      className={'dark-mode-toggle ' + className}
    >
      <span aria-hidden="true" suppressHydrationWarning>{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
