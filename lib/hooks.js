'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { auth } from './api';
import { roles } from './vocab';

/* The stored session, re-read whenever it changes. Returns `undefined`
   during SSR and the first client render so pages can wait instead of
   flashing a logged-out state. */
let cachedRaw;
let cachedSession = null;

function snapshot() {
  const token = auth.getToken();
  const user = auth.getUser();
  const raw = token + '|' + JSON.stringify(user);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = token ? { token, user: user || {}, role: roles.normalize(user && user.role) } : null;
  }
  return cachedSession;
}

export function useSession() {
  return useSyncExternalStore(auth.subscribe, snapshot, () => undefined);
}

/* Runs an async loader and tracks loading / error / data. `deps` re-run
   it; `reload()` runs it again on demand. Only the latest run may write
   its result, so a slow older response never overwrites a newer one. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const latestRun = useRef(0);

  const run = useCallback(() => {
    const id = ++latestRun.current;
    const current = () => latestRun.current === id;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => { if (current()) setState({ loading: false, error: null, data }); })
      .catch((error) => { if (current()) setState({ loading: false, error, data: null }); });
    /* Unmount or a deps change: forget this run. */
    return () => { if (current()) latestRun.current += 1; };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);

  return { ...state, reload: run, setData: (data) => setState((prev) => ({ ...prev, data })) };
}

/* Elements with role="button" that are not real buttons (links styled as
   text on the landing and login pages) also answer Enter and Space. */
export function useButtonRoleKeys() {
  useEffect(() => {
    const onKey = (event) => {
      if (event.defaultPrevented || (event.key !== 'Enter' && event.key !== ' ')) return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'button') return;
      if (target.tagName === 'BUTTON' || target.tagName === 'A') return;
      event.preventDefault();
      target.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
