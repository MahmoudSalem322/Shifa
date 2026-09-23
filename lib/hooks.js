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
   it; `reload()` runs it again on demand. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => { if (!cancelled) setState({ loading: false, error: null, data }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, error, data: null }); });
    return () => { cancelled = true; };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);

  return { ...state, reload: run, setData: (data) => setState((prev) => ({ ...prev, data })) };
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
