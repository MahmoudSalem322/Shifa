/* ====================================================================
   Shifa API layer
   --------------------------------------------------------------------
   Loaded before script/script.js on every page. Classic script, no
   modules — exposes a single global `window.Shifa`, matching the way
   script.js already publishes globals for the inline onclick handlers.

   Backend: https://shifaa-api.onrender.com  (Swagger: /swagger/index.html)
   Auth:    Authorization: Bearer <JWT>, required on every endpoint.
   ==================================================================== */

(function (global) {
  'use strict';

  var BASE = 'https://shifaa-api.onrender.com';

  /* Render's free tier sleeps when idle; the first call after a nap can
     take the better part of a minute before the container answers. */
  var TIMEOUT_MS = 90000;

  var TOKEN_KEY = 'shifa_token';
  var SESSION_KEY = 'shifa_session';

  /* --------------------------------------------------------------
     Errors
     The API answers validation failures with HTTP 400 and the ASP.NET
     ModelState envelope:  {"errors":{"Email":["..."],"Phone":["..."]}}
     -------------------------------------------------------------- */

  function ApiError(status, payload, fallbackMessage) {
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload || null;
    this.errors = (payload && payload.errors) || null;
    this.message = fallbackMessage || firstErrorMessage(payload) || defaultMessage(status);
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  /* The API validates in English while the site is entirely Arabic. These
     are the exact strings the server returns, mapped to Arabic; anything
     unrecognised falls through unchanged rather than being swallowed. */
  var SERVER_MESSAGES_AR = {
    'Email/phone or password is incorrect.':
      'البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيحة.',
    'Enter a valid Gmail address (e.g. name@gmail.com) or a phone number in the format 05XXXXXXXX.':
      'أدخل بريد Gmail صحيح (مثال: name@gmail.com) أو رقم هاتف بصيغة 05XXXXXXXX.',
    'Enter a valid Gmail address (e.g. name@gmail.com).':
      'أدخل بريد Gmail صحيح (مثال: name@gmail.com).',
    'Email must be a complete, correctly formatted Gmail address (e.g. name@gmail.com).':
      'يجب إدخال بريد Gmail كامل وصحيح (مثال: name@gmail.com).',
    'Full name is required.': 'الاسم الكامل مطلوب.',
    'Phone number must be 10 digits starting with 05.':
      'رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.',
    'Password must be at least 8 characters.':
      'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
    'Passwords do not match.': 'كلمتا المرور غير متطابقتين.',
    'Account type must be one of: Patient, Doctor, Hospital, Pharmacy, Donor.':
      'نوع الحساب يجب أن يكون أحد الخيارات: مريض، طبيب، مركز صحي، صيدلية، متبرع.',
    'OTP must be exactly 6 digits.': 'رمز التحقق يجب أن يتكون من 6 أرقام بالضبط.'
  };

  function translate(text) {
    if (!text) return '';
    var key = String(text).trim();
    return SERVER_MESSAGES_AR[key] || key;
  }

  function firstErrorMessage(payload) {
    if (!payload) return '';
    if (typeof payload === 'string') return translate(payload);
    if (payload.errors) {
      for (var field in payload.errors) {
        if (!Object.prototype.hasOwnProperty.call(payload.errors, field)) continue;
        var list = payload.errors[field];
        if (Array.isArray(list) && list.length) return translate(list[0]);
        if (typeof list === 'string') return translate(list);
      }
    }
    return translate(payload.message || payload.title || payload.detail || '');
  }

  function defaultMessage(status) {
    if (status === 0) return 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك بالإنترنت وحاول مجدداً.';
    if (status === 401) return 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.';
    if (status === 403) return 'لا تملك صلاحية الوصول إلى هذا المحتوى.';
    if (status === 404) return 'لم يتم العثور على البيانات المطلوبة.';
    if (status >= 500) return 'حدث خطأ في الخادم. يرجى المحاولة بعد قليل.';
    return 'تعذّر إتمام العملية. يرجى المحاولة مجدداً.';
  }

  /* --------------------------------------------------------------
     Session storage
     Replaces the old ad-hoc shifaUser / shifaRemember / currentUser keys.
     -------------------------------------------------------------- */

  function safeRead(key) {
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeWrite(key, value) {
    try { global.localStorage.setItem(key, value); } catch (e) { /* quota or private mode */ }
  }
  function safeRemove(key) {
    try { global.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  var auth = {
    getToken: function () {
      return safeRead(TOKEN_KEY) || '';
    },

    getUser: function () {
      var raw = safeRead(SESSION_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },

    isAuthed: function () {
      return !!auth.getToken();
    },

    /* Accepts a raw login/signup response and stores whatever it can find.
       The API documents no response schema, so every field is resolved
       through a list of plausible names. */
    setSession: function (response) {
      if (!response) return null;

      var token = pick(response, 'token', 'accessToken', 'jwt', 'access_token');
      if (!token && response.data) {
        token = pick(response.data, 'token', 'accessToken', 'jwt', 'access_token');
      }
      if (token) safeWrite(TOKEN_KEY, String(token));

      var userNode = response.user || response.data || response;
      var session = {
        fullName: pick(userNode, 'fullName', 'name') || '',
        email: pick(userNode, 'email') || '',
        phone: pick(userNode, 'phone', 'phoneNumber') || '',
        role: pick(userNode, 'role', 'userRole') || '',
        id: pick(userNode, 'id', 'userId')
      };
      safeWrite(SESSION_KEY, JSON.stringify(session));
      return session;
    },

    /* Patches the stored session without touching the token — used after
       a profile save so the dashboard reflects the new values. */
    mergeSession: function (partial) {
      var current = auth.getUser() || {};
      for (var key in partial) {
        if (Object.prototype.hasOwnProperty.call(partial, key)) current[key] = partial[key];
      }
      safeWrite(SESSION_KEY, JSON.stringify(current));
      return current;
    },

    clear: function () {
      safeRemove(TOKEN_KEY);
      safeRemove(SESSION_KEY);
      /* Legacy keys from the localStorage-simulated era. */
      safeRemove('shifaUser');
      safeRemove('shifaRemember');
      safeRemove('currentUser');
    },

    /* Sends the visitor to login, remembering where they wanted to go. */
    redirectToLogin: function (returnTo) {
      var target = returnTo || (global.location.pathname.split('/').pop() + global.location.search);
      safeWrite('shifa_return_to', target);
      global.location.href = 'login.html';
    },

    consumeReturnTo: function () {
      var target = safeRead('shifa_return_to');
      safeRemove('shifa_return_to');
      return target || '';
    }
  };

  /* --------------------------------------------------------------
     Field resolver
     The spec declares every response as a bare `200 OK` with no body
     schema, so read paths go through this rather than hard-coding a
     field name that may not exist. Logs misses once so the gaps show up
     in the console instead of as silent blanks.
     -------------------------------------------------------------- */

  var reportedMisses = {};

  function pick(obj) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (var i = 1; i < arguments.length; i++) {
      var key = arguments[i];
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
      /* Tolerate casing drift between PascalCase DTOs and camelCase JSON. */
      var lower = key.charAt(0).toLowerCase() + key.slice(1);
      var upper = key.charAt(0).toUpperCase() + key.slice(1);
      if (obj[lower] !== undefined && obj[lower] !== null) return obj[lower];
      if (obj[upper] !== undefined && obj[upper] !== null) return obj[upper];
    }
    var signature = Array.prototype.slice.call(arguments, 1).join('|');
    if (!reportedMisses[signature]) {
      reportedMisses[signature] = true;
      if (global.console && console.debug) {
        console.debug('[Shifa] no field matched [' + signature + '] on', obj);
      }
    }
    return undefined;
  }

  /* Unwraps the common envelope shapes so callers always get an array. */
  function toList(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    var candidates = ['data', 'items', 'results', 'result', 'doctors', 'facilities',
                      'pharmacies', 'medicines', 'requests', 'value'];
    for (var i = 0; i < candidates.length; i++) {
      var node = response[candidates[i]];
      if (Array.isArray(node)) return node;
      /* Paged envelopes nest one level deeper: {data:{items:[...]}} */
      if (node && Array.isArray(node.items)) return node.items;
    }
    return [];
  }

  /* Unwraps a single-entity response. */
  function toItem(response) {
    if (!response || typeof response !== 'object') return null;
    if (Array.isArray(response)) return response[0] || null;
    var candidates = ['data', 'result', 'item', 'doctor', 'facility', 'pharmacy', 'medicine'];
    for (var i = 0; i < candidates.length; i++) {
      var node = response[candidates[i]];
      if (node && typeof node === 'object' && !Array.isArray(node)) return node;
    }
    return response;
  }

  /* --------------------------------------------------------------
     Request
     -------------------------------------------------------------- */

  function buildUrl(path, query) {
    var url = path.charAt(0) === '/' ? BASE + path : path;
    if (!query) return url;
    var parts = [];
    for (var key in query) {
      if (!Object.prototype.hasOwnProperty.call(query, key)) continue;
      var value = query[key];
      if (value === undefined || value === null || value === '') continue;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
    if (!parts.length) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + parts.join('&');
  }

  /* Fires when any request comes back 401, so pages can show an auth wall
     instead of an error. Overridable per page. */
  var unauthorizedHandler = null;

  function request(method, path, options) {
    options = options || {};

    var headers = {};
    var body;

    if (options.formData) {
      body = options.formData;            /* browser sets the multipart boundary */
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    var useAuth = options.auth !== false;
    var token = auth.getToken();
    if (useAuth && token) headers['Authorization'] = 'Bearer ' + token;

    var controller = global.AbortController ? new global.AbortController() : null;
    var timer = global.setTimeout(function () {
      if (controller) controller.abort();
    }, options.timeout || TIMEOUT_MS);

    var init = { method: method, headers: headers };
    if (body !== undefined) init.body = body;
    if (controller) init.signal = controller.signal;

    return global.fetch(buildUrl(path, options.query), init)
      .then(function (response) {
        global.clearTimeout(timer);
        return response.text().then(function (text) {
          var payload = null;
          if (text) {
            try { payload = JSON.parse(text); } catch (e) { payload = text; }
          }

          if (response.ok) return payload;

          if (response.status === 401) {
            /* The API answers 401 with an empty body and www-authenticate:
               Bearer. Drop the dead token so the UI stops pretending. */
            auth.clear();
            if (typeof unauthorizedHandler === 'function') unauthorizedHandler();
          }
          throw new ApiError(response.status, payload);
        });
      })
      .catch(function (error) {
        global.clearTimeout(timer);
        if (error instanceof ApiError) throw error;
        if (error && error.name === 'AbortError') {
          throw new ApiError(0, null, 'استغرق الخادم وقتاً طويلاً للاستجابة. حاول مجدداً.');
        }
        throw new ApiError(0, null, defaultMessage(0));
      });
  }

  /* --------------------------------------------------------------
     Form error rendering
     Maps the PascalCase field names in the error envelope onto the
     element ids already present in the pages.
     -------------------------------------------------------------- */

  function markField(inputId, text) {
    var input = document.getElementById(inputId);
    if (!input) return;
    input.classList.add('field-invalid');
    input.setAttribute('aria-invalid', 'true');
    var slot = document.getElementById(inputId + '-error');
    if (slot) slot.textContent = text;
  }

  function clearFieldErrors(fieldMap) {
    if (!fieldMap) return;
    for (var field in fieldMap) {
      if (!Object.prototype.hasOwnProperty.call(fieldMap, field)) continue;
      var input = document.getElementById(fieldMap[field]);
      if (!input) continue;
      input.classList.remove('field-invalid');
      input.removeAttribute('aria-invalid');
      var slot = document.getElementById(fieldMap[field] + '-error');
      if (slot) slot.textContent = '';
    }
  }

  var errors = {
    /* fieldMap: { Email: 'registerEmail', Phone: 'registerPhone', ... } */
    applyToForm: function (apiError, fieldMap, messageElementId) {
      clearFieldErrors(fieldMap);

      var lines = [];
      if (apiError && apiError.errors) {
        for (var field in apiError.errors) {
          if (!Object.prototype.hasOwnProperty.call(apiError.errors, field)) continue;
          var list = apiError.errors[field];
          var text = Array.isArray(list)
            ? list.map(translate).join(' ')
            : translate(String(list));
          lines.push(text);
          var inputId = fieldMap && fieldMap[field];
          if (inputId) markField(inputId, text);
        }
      }
      if (!lines.length) lines.push(apiError ? apiError.message : defaultMessage(0));

      if (messageElementId && typeof global.showMessage === 'function') {
        global.showMessage(messageElementId, lines.join(' '), 'error');
      }
      return lines;
    },

    clear: clearFieldErrors
  };

  /* --------------------------------------------------------------
     Governorate vocabulary
     Each page shipped its own slugs for the same five governorates
     (khan-younis / khanyounis / khan, deir-balah / middle / deir).
     Everything funnels through here before it reaches the API.
     -------------------------------------------------------------- */

  var GOV_CANONICAL = {
    gaza: 'غزة',
    north: 'شمال غزة',
    middle: 'الوسطى',
    khanyounis: 'خان يونس',
    rafah: 'رفح'
  };

  var GOV_ALIASES = {
    'gaza': 'gaza', 'gaza-city': 'gaza', 'غزة': 'gaza',
    'north': 'north', 'north-gaza': 'north', 'شمال غزة': 'north', 'الشمال': 'north',
    'middle': 'middle', 'deir': 'middle', 'deir-balah': 'middle', 'deir-al-balah': 'middle',
    'الوسطى': 'middle', 'دير البلح': 'middle',
    'khanyounis': 'khanyounis', 'khan': 'khanyounis', 'khan-younis': 'khanyounis',
    'khan-yunis': 'khanyounis', 'خان يونس': 'khanyounis',
    'rafah': 'rafah', 'رفح': 'rafah'
  };

  var geo = {
    normalize: function (value) {
      if (!value) return '';
      var key = String(value).trim().toLowerCase();
      return GOV_ALIASES[key] || GOV_ALIASES[String(value).trim()] || '';
    },
    label: function (value) {
      var slug = geo.normalize(value);
      return slug ? GOV_CANONICAL[slug] : (value || '');
    },
    all: function () {
      return Object.keys(GOV_CANONICAL).map(function (slug) {
        return { slug: slug, label: GOV_CANONICAL[slug] };
      });
    }
  };

  /* --------------------------------------------------------------
     Role vocabulary
     The register/edit selects carry Arabic labels; the API expects
     Patient | Doctor | Hospital | Pharmacy | Donor.
     -------------------------------------------------------------- */

  var ROLE_TO_AR = {
    Patient: 'مريض',
    Doctor: 'طبيب',
    Hospital: 'مركز صحي',
    Pharmacy: 'صيدلية',
    Donor: 'متبرع'
  };

  var roles = {
    toArabic: function (role) {
      return ROLE_TO_AR[roles.normalize(role)] || role || '';
    },
    normalize: function (role) {
      if (!role) return '';
      var key = String(role).trim();
      for (var canonical in ROLE_TO_AR) {
        if (!Object.prototype.hasOwnProperty.call(ROLE_TO_AR, canonical)) continue;
        if (canonical.toLowerCase() === key.toLowerCase()) return canonical;
        if (ROLE_TO_AR[canonical] === key) return canonical;
      }
      return key;
    }
  };

  /* --------------------------------------------------------------
     Shared validation, mirroring the server so users are not told
     their input is fine and then rejected by the API.
     -------------------------------------------------------------- */

  var validate = {
    /* "Email must be a complete, correctly formatted Gmail address" */
    gmail: function (value) {
      return /^[^\s@]+@gmail\.com$/i.test(String(value || '').trim());
    },
    /* "Phone number must be 10 digits starting with 05." */
    phone: function (value) {
      return /^05\d{8}$/.test(String(value || '').trim());
    },
    /* "Password must be at least 8 characters." */
    password: function (value) {
      return String(value || '').length >= 8;
    },
    /* "OTP must be exactly 6 digits." */
    otp: function (value) {
      return /^\d{6}$/.test(String(value || '').trim());
    },
    /* Login accepts either form. */
    emailOrPhone: function (value) {
      return validate.gmail(value) || validate.phone(value);
    }
  };

  /* --------------------------------------------------------------
     Shared list states — skeleton / empty / error / auth wall.
     Pages keep their own card markup; these only cover the in-between
     states that none of them have today.
     -------------------------------------------------------------- */

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var ui = {
    escape: escapeHtml,

    skeleton: function (container, count) {
      if (!container) return;
      var n = count || 3;
      var html = '';
      for (var i = 0; i < n; i++) {
        html += '<div class="shifa-skeleton-card" aria-hidden="true">' +
                  '<div class="shifa-skeleton-line shifa-skeleton-line--wide"></div>' +
                  '<div class="shifa-skeleton-line"></div>' +
                  '<div class="shifa-skeleton-line shifa-skeleton-line--short"></div>' +
                '</div>';
      }
      container.innerHTML = '<div class="shifa-skeleton" role="status" aria-live="polite">' +
        '<span class="shifa-visually-hidden">جارٍ تحميل البيانات…</span>' + html + '</div>';
    },

    empty: function (container, message) {
      if (!container) return;
      container.innerHTML = '<div class="shifa-state shifa-state--empty" role="status">' +
        '<span class="shifa-state__icon" aria-hidden="true">🔍</span>' +
        '<p class="shifa-state__title">' + escapeHtml(message || 'لا توجد نتائج مطابقة') + '</p>' +
        '<p class="shifa-state__hint">جرّب تعديل عوامل التصفية أو توسيع نطاق البحث.</p>' +
        '</div>';
    },

    error: function (container, apiError, onRetry) {
      if (!container) return;
      var message = apiError ? apiError.message : defaultMessage(0);
      container.innerHTML = '<div class="shifa-state shifa-state--error" role="alert">' +
        '<span class="shifa-state__icon" aria-hidden="true">⚠️</span>' +
        '<p class="shifa-state__title">' + escapeHtml(message) + '</p>' +
        '<button type="button" class="shifa-state__action" data-shifa-retry>إعادة المحاولة</button>' +
        '</div>';
      if (typeof onRetry === 'function') {
        var button = container.querySelector('[data-shifa-retry]');
        if (button) button.addEventListener('click', onRetry);
      }
    },

    /* Every endpoint on this API requires a token, including the browse
       and search paths, so an anonymous visitor lands here rather than on
       an error they cannot act on. */
    authWall: function (container, message) {
      if (!container) return;
      container.innerHTML = '<div class="shifa-state shifa-state--auth" role="status">' +
        '<span class="shifa-state__icon" aria-hidden="true">🔒</span>' +
        '<p class="shifa-state__title">' +
          escapeHtml(message || 'سجّل الدخول لعرض هذا المحتوى') + '</p>' +
        '<p class="shifa-state__hint">هذه البيانات متاحة للمستخدمين المسجّلين فقط.</p>' +
        '<button type="button" class="shifa-state__action" data-shifa-login>تسجيل الدخول</button>' +
        '</div>';
      var button = container.querySelector('[data-shifa-login]');
      if (button) {
        button.addEventListener('click', function () { auth.redirectToLogin(); });
      }
    },

    /* Renders whichever state an API failure calls for. */
    failure: function (container, apiError, onRetry) {
      if (apiError && apiError.status === 401) return ui.authWall(container);
      return ui.error(container, apiError, onRetry);
    },

    /* Puts a button into a pending state and hands back an undo. */
    busy: function (button, label) {
      if (!button) return function () {};
      var original = button.innerHTML;
      var wasDisabled = button.disabled;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML = '<span class="shifa-spinner" aria-hidden="true"></span>' +
        escapeHtml(label || 'جارٍ المعالجة…');
      return function () {
        button.disabled = wasDisabled;
        button.removeAttribute('aria-busy');
        button.innerHTML = original;
      };
    },

    toast: function (message) {
      var host = document.getElementById('shifa-toast-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'shifa-toast-host';
        host.className = 'shifa-toast-host';
        document.body.appendChild(host);
      }
      var node = document.createElement('div');
      node.className = 'shifa-toast';
      node.setAttribute('role', 'status');
      node.textContent = message;
      host.appendChild(node);
      global.setTimeout(function () {
        node.classList.add('shifa-toast--out');
        global.setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 400);
      }, 3600);
    }
  };

  /* --------------------------------------------------------------
     Endpoint wrappers — thin, so the call sites read like the Swagger
     page rather than like string concatenation.
     -------------------------------------------------------------- */

  var api = {
    auth: {
      signup: function (payload) { return request('POST', '/api/auth/signup', { body: payload, auth: false }); },
      login: function (payload) { return request('POST', '/api/auth/login', { body: payload, auth: false }); },
      forgotPassword: function (email) { return request('POST', '/api/auth/forgot-password', { body: { email: email }, auth: false }); },
      resendOtp: function (email) { return request('POST', '/api/auth/resend-otp', { body: { email: email }, auth: false }); },
      verifyOtp: function (email, otp) { return request('POST', '/api/auth/verify-otp', { body: { email: email, otp: otp }, auth: false }); },
      resetPassword: function (payload) { return request('POST', '/api/auth/reset-password', { body: payload, auth: false }); },
      logout: function () { return request('POST', '/api/auth/logout'); }
    },

    doctors: {
      list: function (query) { return request('GET', '/api/doctors', { query: query }); },
      search: function (query) { return request('GET', '/api/doctors/search', { query: query }); },
      get: function (id) { return request('GET', '/api/doctors/' + encodeURIComponent(id)); },
      me: function () { return request('GET', '/api/doctors/me'); },
      updateMe: function (payload) { return request('PUT', '/api/doctors/me', { body: payload }); }
    },

    facilities: {
      list: function (query) { return request('GET', '/api/facilities', { query: query }); },
      search: function (query) { return request('GET', '/api/facilities/search', { query: query }); },
      get: function (id) { return request('GET', '/api/facilities/' + encodeURIComponent(id)); },
      me: function () { return request('GET', '/api/facilities/me'); },
      updateMe: function (payload) { return request('PUT', '/api/facilities/me', { body: payload }); },
      setStatus: function (status) { return request('PATCH', '/api/facilities/me/status', { body: { status: status } }); },
      addService: function (name) { return request('POST', '/api/facilities/me/services', { body: { name: name } }); },
      updateService: function (serviceId, status) {
        return request('PATCH', '/api/facilities/me/services/' + encodeURIComponent(serviceId), { body: { status: status } });
      }
    },

    pharmacies: {
      search: function (query) { return request('GET', '/api/pharmacies/search', { query: query }); },
      get: function (id) { return request('GET', '/api/pharmacies/' + encodeURIComponent(id)); },
      me: function () { return request('GET', '/api/pharmacies/me'); },
      updateMe: function (payload) { return request('PUT', '/api/pharmacies/me', { body: payload }); },
      setStatus: function (status) { return request('PATCH', '/api/pharmacies/me/status', { body: { status: status } }); },
      addStock: function (payload) { return request('POST', '/api/pharmacies/me/medicines', { body: payload }); },
      updateStock: function (medicineId, payload) {
        return request('PATCH', '/api/pharmacies/me/medicines/' + encodeURIComponent(medicineId), { body: payload });
      }
    },

    medicines: {
      /* The only endpoint in the whole API with documented query params. */
      search: function (query) { return request('GET', '/api/medicines/search', { query: query }); },
      list: function () { return request('GET', '/api/medicines/list'); },
      get: function (id) { return request('GET', '/api/medicines/' + encodeURIComponent(id)); },
      create: function (payload) { return request('POST', '/api/medicines', { body: payload }); },
      update: function (id, payload) { return request('PUT', '/api/medicines/' + encodeURIComponent(id), { body: payload }); },
      remove: function (id) { return request('DELETE', '/api/medicines/' + encodeURIComponent(id)); }
    },

    drugRequests: {
      create: function (formData) { return request('POST', '/api/drugrequests', { formData: formData }); },
      mine: function () { return request('GET', '/api/drugrequests/my'); },
      get: function (id) { return request('GET', '/api/drugrequests/' + encodeURIComponent(id)); },
      update: function (id, formData) { return request('PUT', '/api/drugrequests/' + encodeURIComponent(id), { formData: formData }); },
      remove: function (id) { return request('DELETE', '/api/drugrequests/' + encodeURIComponent(id)); },
      prescriptionUrl: function (id) { return BASE + '/api/drugrequests/' + encodeURIComponent(id) + '/prescription'; }
    },

    appointments: {
      /* POST only — the API exposes no endpoint to list a patient's
         appointments, so ShifaNotifications remains the local store. */
      book: function (payload) { return request('POST', '/api/appointments/book', { body: payload }); }
    }
  };

  /* --------------------------------------------------------------
     Query-string helper. Detail pages had no id in their links at all;
     every card renderer now emits ?id= and the detail page reads it here.
     -------------------------------------------------------------- */

  function queryParam(name) {
    try {
      return new global.URLSearchParams(global.location.search).get(name) || '';
    } catch (e) {
      var match = new RegExp('[?&]' + name + '=([^&]*)').exec(global.location.search);
      return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
    }
  }

  /* -------------------------------------------------------------- */

  global.Shifa = {
    BASE: BASE,
    ApiError: ApiError,
    request: request,
    api: api,
    auth: auth,
    errors: errors,
    geo: geo,
    roles: roles,
    validate: validate,
    translate: translate,
    ui: ui,
    pick: pick,
    toList: toList,
    toItem: toItem,
    queryParam: queryParam,
    onUnauthorized: function (handler) { unauthorizedHandler = handler; }
  };
})(window);
