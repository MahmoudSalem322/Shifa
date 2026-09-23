/* ====================================================================
   Unified dashboard (dashboard.html)
   --------------------------------------------------------------------
   One page for every role. The account panel is shared; the rest is
   shown by role via [data-dash-role]:

     Patient / Donor : appointments + drug requests
     Doctor          : professional profile      (GET|PUT /api/doctors/me)
     Pharmacy        : profile, status, stock    (GET|PUT /api/pharmacies/me)
     Hospital        : profile, status, services (GET|PUT /api/facilities/me)

   Replaces the account summary that used to live in login.html#dashboard
   and consolidates the doctor-only editor in my-profile.html, which stays
   available as the full editor.
   ==================================================================== */

(function () {
  'use strict';

  if (!document.getElementById('dash-root')) return;

  var esc = Shifa.ui.escape;

  /* Current role-scoped profile, kept so a save can send back the fields
     the forms do not expose (coordinates, ids) instead of dropping them. */
  var profile = null;
  var role = '';

  /* ---------------------------------------------------------------- */

  function value(id) {
    var element = document.getElementById(id);
    return element ? String(element.value).trim() : '';
  }

  function setValue(id, v) {
    var element = document.getElementById(id);
    if (!element) return;
    element.value = (v === undefined || v === null) ? '' : v;
  }

  function checked(id) {
    var element = document.getElementById(id);
    return !!(element && element.checked);
  }

  function setChecked(id, v) {
    var element = document.getElementById(id);
    if (element) element.checked = !!v;
  }

  function emptyNote(container, text) {
    if (container) {
      container.innerHTML = '<p class="font-body-md text-body-md text-text-muted py-space-md text-center">' +
        esc(text) + '</p>';
    }
  }

  /* ---- shell ------------------------------------------------------- */

  function showRolePanels() {
    document.querySelectorAll('[data-dash-role]').forEach(function (section) {
      var roles = section.getAttribute('data-dash-role').split(/\s+/);
      var visible = roles.indexOf(role) !== -1;
      section.classList.toggle('hidden', !visible);
      if (visible) section.classList.add('flex');
    });
  }

  function renderAccount() {
    var user = Shifa.auth.getUser() || {};
    setValue('account-name', user.fullName);
    setValue('account-phone', user.phone);
    setValue('account-email', user.email);
    setValue('account-role', Shifa.roles.toArabic(user.role));

    var greeting = document.getElementById('dash-greeting');
    if (greeting) greeting.textContent = 'أهلاً ' + (user.fullName || 'بك');

    var chip = document.getElementById('dash-role-chip');
    if (chip) chip.textContent = Shifa.roles.toArabic(user.role) || '—';
  }

  /* The account form edits the two fields every role-scoped DTO shares.
     Patient and Donor have no /me endpoint at all, so for them the change
     is kept in the local session only and the user is told so. */
  function saveAccount(button) {
    var name = value('account-name');
    var phone = value('account-phone');

    if (!name) { Shifa.ui.toast('يرجى إدخال الاسم.'); return; }
    if (!Shifa.validate.phone(phone)) {
      Shifa.ui.toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.');
      return;
    }

    var endpoint = { Doctor: 'doctors', Pharmacy: 'pharmacies', Hospital: 'facilities' }[role];

    if (!endpoint) {
      Shifa.auth.mergeSession({ fullName: name, phone: phone });
      renderAccount();
      Shifa.ui.toast('تم الحفظ على هذا الجهاز — الخادم لا يوفّر تعديل بيانات هذا النوع من الحسابات.');
      return;
    }

    var done = Shifa.ui.busy(button, 'جارٍ الحفظ…');
    var payload = Object.assign({}, profile || {});
    if (role === 'Doctor') payload.fullName = name; else payload.name = name;
    payload.phone = phone;

    Shifa.api[endpoint].updateMe(payload)
      .then(function () {
        done();
        Shifa.auth.mergeSession({ fullName: name, phone: phone });
        renderAccount();
        Shifa.ui.toast('تم حفظ بيانات الحساب.');
      })
      .catch(function (error) { done(); Shifa.ui.toast(error.message); });
  }

  /* ---- Patient / Donor: appointments -------------------------------- */

  /* The API books appointments but exposes no endpoint to list them, so
     these come from the local store behind the notifications feature.
     TODO(api): swap for GET /api/appointments/my when it exists. */
  function renderAppointments() {
    var list = document.getElementById('appointments-list');
    var count = document.getElementById('appointments-count');
    if (!list) return;

    var appointments = [];
    try {
      appointments = JSON.parse(localStorage.getItem('shifa_appointments_v1') || '[]');
    } catch (e) { appointments = []; }

    if (count) count.textContent = String(appointments.length);

    if (!appointments.length) {
      emptyNote(list, 'لا توجد مواعيد محجوزة بعد.');
      return;
    }

    list.innerHTML = appointments.slice().reverse().map(function (item) {
      var doctor = Shifa.pick(item, 'doctor') || 'طبيب';
      var specialty = Shifa.pick(item, 'specialty') || '';
      var day = Shifa.pick(item, 'dayLabel', 'preferredDay') || '';
      var time = Shifa.pick(item, 'time') || '';
      var status = Shifa.pick(item, 'status') || '';

      return '<div class="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">' +
        '<div class="flex items-center gap-space-sm">' +
          '<span class="w-11 h-11 rounded-xl bg-primary/10 text-text-primary flex items-center justify-center shrink-0">' +
            '<span class="material-symbols-outlined">event</span></span>' +
          '<div class="flex flex-col">' +
            '<span class="font-headline-sm text-headline-sm text-text-heading">' + esc(doctor) + '</span>' +
            (specialty ? '<span class="font-body-sm text-body-sm text-text-muted">' + esc(specialty) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="flex flex-col items-end gap-1">' +
          (day ? '<span class="font-label-md text-label-md text-text-body">' + esc(day) + (time ? ' · ' + esc(time) : '') + '</span>' : '') +
          (status ? '<span class="font-label-sm text-label-sm bg-state-success-subtle text-state-success px-2 py-0.5 rounded-full">' + esc(status) + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---- Patient / Donor: drug requests -------------------------------- */

  function renderDrugRequests() {
    var list = document.getElementById('drug-requests-list');
    var count = document.getElementById('drug-requests-count');
    if (!list) return;

    Shifa.ui.skeleton(list, 2);

    Shifa.api.drugRequests.mine()
      .then(function (response) {
        var requests = Shifa.toList(response);
        if (count) count.textContent = String(requests.length);

        if (!requests.length) {
          emptyNote(list, 'لا توجد طلبات أدوية بعد.');
          return;
        }

        list.innerHTML = requests.map(function (raw) {
          var id = Shifa.pick(raw, 'id', 'requestId');
          var medicine = Shifa.pick(raw, 'medicineName', 'medicine', 'name') || 'دواء';
          var quantity = Shifa.pick(raw, 'quantity') || '';
          var notes = Shifa.pick(raw, 'notes') || '';
          var status = Shifa.pick(raw, 'status') || '';
          var hasFile = !!Shifa.pick(raw, 'prescriptionPath', 'prescriptionUrl', 'hasPrescription');

          return '<article class="flex flex-col gap-space-xs p-space-md rounded-xl bg-surface-subtle" data-request-id="' + esc(id) + '">' +
            '<div class="flex items-start justify-between gap-space-sm">' +
              '<div class="flex flex-col">' +
                '<span class="font-headline-sm text-headline-sm text-text-heading">' + esc(medicine) + '</span>' +
                (quantity ? '<span class="font-body-sm text-body-sm text-text-muted">الكمية: ' + esc(quantity) + '</span>' : '') +
              '</div>' +
              (status ? '<span class="font-label-sm text-label-sm bg-state-info-subtle text-state-info px-2 py-0.5 rounded-full shrink-0">' + esc(status) + '</span>' : '') +
            '</div>' +
            (notes ? '<p class="font-body-sm text-body-sm text-text-muted">' + esc(notes) + '</p>' : '') +
            '<div class="flex items-center gap-space-2xs pt-space-2xs">' +
              (hasFile && id != null
                ? '<a class="px-space-sm py-1.5 rounded-lg bg-surface-container-high text-text-primary font-label-md text-label-md" target="_blank" rel="noopener" href="' +
                    esc(Shifa.api.drugRequests.prescriptionUrl(id)) + '">عرض الوصفة</a>'
                : '') +
              '<button class="px-space-sm py-1.5 rounded-lg bg-state-danger-subtle text-state-danger font-label-md text-label-md" data-delete-request="' + esc(id) + '" type="button">إلغاء الطلب</button>' +
            '</div>' +
          '</article>';
        }).join('');
      })
      .catch(function (error) {
        if (count) count.textContent = '0';
        Shifa.ui.failure(list, error, renderDrugRequests);
      });
  }

  function deleteDrugRequest(id, button) {
    if (!window.confirm('هل تريد إلغاء هذا الطلب؟')) return;
    var done = Shifa.ui.busy(button, 'جارٍ الإلغاء…');
    Shifa.api.drugRequests.remove(id)
      .then(function () { done(); Shifa.ui.toast('تم إلغاء الطلب.'); renderDrugRequests(); })
      .catch(function (error) { done(); Shifa.ui.toast(error.message); });
  }

  /* ---- Doctor -------------------------------------------------------- */

  function loadDoctor() {
    return Shifa.api.doctors.me().then(function (response) {
      profile = Shifa.toItem(response) || {};
      var doctor = normalizeDoctor(profile);

      setValue('doc-specialization', doctor.specialization);
      setValue('doc-license', doctor.licenseNumber);
      setValue('doc-experience', doctor.experience || '');
      setValue('doc-workdays', doctor.workDays);
      setValue('doc-workhours', doctor.workHours);
      setValue('doc-bio', doctor.bio);
      if (doctor.durationMinutes) setValue('doc-duration', String(doctor.durationMinutes));

      /* The profile carries the real phone and name; the stored session
         may not (the login response omits them). */
      if (doctor.phone) setValue('account-phone', doctor.phone);
      if (doctor.name) setValue('account-name', doctor.name);

      return loadFacilityOptions(doctor);
    });
  }

  /* Listing facilities is not permitted for every role — a Doctor account
     gets 403 on GET /api/facilities. When that happens the picker falls
     back to the facility already on the profile so saving does not wipe it.
     TODO(api): allow doctors to read the facility list. */
  function loadFacilityOptions(doctor) {
    var select = document.getElementById('doc-facility');
    if (!select) return Promise.resolve();

    function fallback(note) {
      if (doctor.facilityId != null) {
        select.innerHTML = '<option value="' + esc(doctor.facilityId) + '">' +
          esc(doctor.facilityName || ('المنشأة #' + doctor.facilityId)) + '</option>';
        select.value = String(doctor.facilityId);
      } else {
        select.innerHTML = '<option value="">' + esc(note) + '</option>';
      }
    }

    return Shifa.api.facilities.list()
      .then(function (facilitiesResponse) {
        var facilities = Shifa.toList(facilitiesResponse).map(normalizeFacility).filter(Boolean);
        if (!facilities.length) { fallback('لا توجد منشآت متاحة'); return; }

        select.innerHTML = '<option value="">اختر المنشأة</option>' +
          facilities.map(function (facility) {
            return '<option value="' + esc(facility.id) + '">' + esc(facility.name) + '</option>';
          }).join('');
        if (doctor.facilityId != null) select.value = String(doctor.facilityId);
      })
      .catch(function () {
        fallback('تعذّر تحميل قائمة المنشآت');
      });
  }

  function saveDoctor(button) {
    var payload = Object.assign({}, profile || {}, {
      fullName: value('account-name'),
      phone: value('account-phone'),
      specialization: value('doc-specialization'),
      licenseNumber: value('doc-license'),
      yearsOfExperience: Number(value('doc-experience')) || 0,
      bio: value('doc-bio'),
      facilityId: Number(value('doc-facility')) || 0,
      workDays: value('doc-workdays'),
      workHours: value('doc-workhours'),
      consultationDurationMinutes: Number(value('doc-duration')) || 0
    });

    var missing = [];
    if (!payload.fullName) missing.push('الاسم');
    if (!payload.phone) missing.push('رقم الهاتف');
    if (!payload.specialization) missing.push('التخصص');
    if (!payload.licenseNumber) missing.push('رقم الترخيص');
    if (!payload.facilityId) missing.push('المنشأة');
    if (!payload.workDays) missing.push('أيام العمل');
    if (!payload.workHours) missing.push('ساعات العمل');
    if (!payload.consultationDurationMinutes) missing.push('مدة الكشف');
    if (missing.length) { Shifa.ui.toast('يرجى استكمال: ' + missing.join('، ')); return; }

    var done = Shifa.ui.busy(button, 'جارٍ الحفظ…');
    Shifa.api.doctors.updateMe(payload)
      .then(function () {
        done();
        Shifa.auth.mergeSession({ fullName: payload.fullName, phone: payload.phone });
        Shifa.ui.toast('تم حفظ الملف المهني.');
      })
      .catch(function (error) { done(); Shifa.ui.toast(error.message); });
  }

  /* ---- Pharmacy ------------------------------------------------------ */

  function loadPharmacy() {
    return Shifa.api.pharmacies.me().then(function (response) {
      profile = Shifa.toItem(response) || {};
      var pharmacy = normalizePharmacy(profile);

      setValue('ph-name', pharmacy.name);
      setValue('ph-phone', pharmacy.phone);
      setValue('ph-address', pharmacy.address);
      setValue('ph-hours', pharmacy.workingHours);
      setChecked('ph-approved', pharmacy.governmentApproved);
      setChecked('ph-insurance', pharmacy.acceptsInsurance);
      setChecked('ph-coldchain', pharmacy.hasColdChain);
      if (pharmacy.status) setValue('pharmacy-status', pharmacy.status);

      if (pharmacy.phone) setValue('account-phone', pharmacy.phone);
      if (pharmacy.name) setValue('account-name', pharmacy.name);

      renderStock(normalizeStocks(profile));
    });
  }

  function savePharmacy(button) {
    var payload = Object.assign({}, profile || {}, {
      name: value('ph-name'),
      address: value('ph-address'),
      phone: value('ph-phone'),
      workingHours: value('ph-hours'),
      isGovernmentApproved: checked('ph-approved'),
      acceptsInsurance: checked('ph-insurance'),
      hasColdChain: checked('ph-coldchain')
    });

    if (!payload.name || !payload.address || !payload.phone) {
      Shifa.ui.toast('الاسم والعنوان ورقم الهاتف مطلوبة.');
      return;
    }

    var done = Shifa.ui.busy(button, 'جارٍ الحفظ…');
    Shifa.api.pharmacies.updateMe(payload)
      .then(function () {
        done();
        Shifa.auth.mergeSession({ fullName: payload.name, phone: payload.phone });
        Shifa.ui.toast('تم حفظ بيانات الصيدلية.');
      })
      .catch(function (error) { done(); Shifa.ui.toast(error.message); });
  }

  function renderStock(stocks) {
    var list = document.getElementById('stock-list');
    if (!list) return;

    if (!stocks.length) {
      emptyNote(list, 'لا توجد أدوية في المخزون بعد.');
      return;
    }

    list.innerHTML = stocks.map(function (stock) {
      var name = stock.medicineName || ('دواء #' + (stock.medicineId || ''));
      return '<div class="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle" data-medicine-id="' + esc(stock.medicineId) + '">' +
        '<div class="flex flex-col">' +
          '<span class="font-headline-sm text-headline-sm text-text-heading">' + esc(name) + '</span>' +
          (stock.batchNumber
            ? '<span class="font-label-sm text-label-sm text-text-muted" dir="ltr">Batch: ' + esc(stock.batchNumber) + '</span>'
            : '') +
        '</div>' +
        '<div class="flex items-center gap-space-2xs">' +
          '<input class="w-24 bg-surface-container-lowest py-1.5 px-2 rounded-lg text-center font-label-md focus:outline-none" data-stock-qty min="0" type="number" value="' + esc(stock.quantity) + '"/>' +
          '<input class="w-28 bg-surface-container-lowest py-1.5 px-2 rounded-lg text-center font-label-md focus:outline-none" data-stock-price placeholder="السعر" step="0.01" type="number" value="' + esc(stock.price || '') + '"/>' +
          '<button class="px-space-sm py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md" data-update-stock="' + esc(stock.medicineId) + '" type="button">تحديث</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function updateStock(medicineId, row, button) {
    var qty = row.querySelector('[data-stock-qty]');
    var price = row.querySelector('[data-stock-price]');
    var done = Shifa.ui.busy(button, '…');

    Shifa.api.pharmacies.updateStock(medicineId, {
      quantity: Number(qty ? qty.value : 0) || 0,
      price: Number(price ? price.value : 0) || 0
    })
      .then(function () { done(); Shifa.ui.toast('تم تحديث المخزون.'); })
      .catch(function (error) { done(); Shifa.ui.toast(error.message); });
  }

  /* Adds a medicine to this pharmacy's stock. The medicine itself must
     already exist in the catalogue, so it is chosen from /api/medicines/list. */
  function addStock() {
    Shifa.api.medicines.list()
      .then(function (response) {
        var medicines = Shifa.toList(response).map(normalizeMedicine).filter(Boolean);
        if (!medicines.length) {
          Shifa.ui.toast('لا توجد أدوية في الكتالوج لإضافتها.');
          return;
        }

        var options = medicines.map(function (medicine, index) {
          return (index + 1) + ') ' + medicine.name;
        }).join('\n');

        var pickedIndex = window.prompt('اختر رقم الدواء:\n' + options);
        if (pickedIndex === null) return;
        var medicine = medicines[Number(pickedIndex) - 1];
        if (!medicine) { Shifa.ui.toast('اختيار غير صالح.'); return; }

        var quantity = window.prompt('الكمية المتوفرة من ' + medicine.name + ':', '0');
        if (quantity === null) return;

        Shifa.api.pharmacies.addStock({
          medicineId: Number(medicine.id),
          quantity: Number(quantity) || 0
        })
          .then(function () { Shifa.ui.toast('تمت إضافة الدواء للمخزون.'); loadPharmacy(); })
          .catch(function (error) { Shifa.ui.toast(error.message); });
      })
      .catch(function (error) { Shifa.ui.toast(error.message); });
  }

  /* ---- Hospital / facility ------------------------------------------- */

  function loadFacility() {
    return Shifa.api.facilities.me().then(function (response) {
      profile = Shifa.toItem(response) || {};
      var facility = normalizeFacility(profile);

      setValue('fac-name', facility.name);
      setValue('fac-type', facility.type);
      setValue('fac-address', facility.address);
      setValue('fac-phone', facility.phone);
      setValue('fac-hours', facility.workingHours);
      setChecked('fac-emergency', facility.emergency);
      if (facility.status) setValue('facility-status', facility.status);

      if (facility.phone) setValue('account-phone', facility.phone);
      if (facility.name) setValue('account-name', facility.name);

      renderServices(facility.services);
    });
  }

  function saveFacility(button) {
    var payload = Object.assign({}, profile || {}, {
      name: value('fac-name'),
      type: value('fac-type'),
      address: value('fac-address'),
      phone: value('fac-phone'),
      workingHours: value('fac-hours'),
      emergencyStatus: checked('fac-emergency')
    });

    if (!payload.name || !payload.type || !payload.address || !payload.phone || !payload.workingHours) {
      Shifa.ui.toast('الاسم والنوع والعنوان والهاتف وساعات العمل مطلوبة.');
      return;
    }

    var done = Shifa.ui.busy(button, 'جارٍ الحفظ…');
    Shifa.api.facilities.updateMe(payload)
      .then(function () {
        done();
        Shifa.auth.mergeSession({ fullName: payload.name, phone: payload.phone });
        Shifa.ui.toast('تم حفظ بيانات المنشأة.');
      })
      .catch(function (error) { done(); Shifa.ui.toast(error.message); });
  }

  function renderServices(services) {
    var list = document.getElementById('services-list');
    if (!list) return;

    if (!services.length) {
      emptyNote(list, 'لا توجد خدمات مسجّلة بعد.');
      return;
    }

    list.innerHTML = services.map(function (service) {
      return '<div class="flex flex-wrap items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">' +
        '<span class="font-headline-sm text-headline-sm text-text-heading">' + esc(service.name) + '</span>' +
        '<div class="flex items-center gap-space-2xs">' +
          '<select class="bg-surface-container-lowest py-1.5 px-3 rounded-lg font-label-md focus:outline-none cursor-pointer" data-service-status>' +
            '<option value="Available">متاحة</option>' +
            '<option value="Limited">محدودة</option>' +
            '<option value="Unavailable">متوقفة</option>' +
          '</select>' +
          '<button class="px-space-sm py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md" data-update-service="' + esc(service.id) + '" type="button">تحديث</button>' +
        '</div>' +
      '</div>';
    }).join('');

    /* Reflect each service's stored status in its select. */
    list.querySelectorAll('[data-service-status]').forEach(function (select, index) {
      if (services[index] && services[index].status) select.value = services[index].status;
    });
  }

  function addService() {
    var name = window.prompt('اسم الخدمة أو القسم الجديد:');
    if (!name) return;
    Shifa.api.facilities.addService(name.trim())
      .then(function () { Shifa.ui.toast('تمت إضافة الخدمة.'); loadFacility(); })
      .catch(function (error) { Shifa.ui.toast(error.message); });
  }

  function updateService(serviceId, row, button) {
    var select = row.querySelector('[data-service-status]');
    var done = Shifa.ui.busy(button, '…');
    Shifa.api.facilities.updateService(serviceId, select ? select.value : 'Available')
      .then(function () { done(); Shifa.ui.toast('تم تحديث حالة الخدمة.'); })
      .catch(function (error) { done(); Shifa.ui.toast(error.message); });
  }

  /* ---- status switches ------------------------------------------------ */

  function wireStatusSelect(id, setter) {
    var select = document.getElementById(id);
    if (!select) return;
    select.addEventListener('change', function () {
      setter(select.value)
        .then(function () { Shifa.ui.toast('تم تحديث الحالة.'); })
        .catch(function (error) { Shifa.ui.toast(error.message); });
    });
  }

  /* ---- boot ----------------------------------------------------------- */

  function load() {
    if (!Shifa.auth.isAuthed()) {
      Shifa.auth.redirectToLogin('dashboard.html');
      return;
    }

    role = Shifa.roles.normalize((Shifa.auth.getUser() || {}).role);
    renderAccount();
    showRolePanels();

    if (role === 'Doctor') {
      loadDoctor().catch(reportLoadError);
    } else if (role === 'Pharmacy') {
      loadPharmacy().catch(reportLoadError);
    } else if (role === 'Hospital') {
      loadFacility().catch(reportLoadError);
    } else {
      renderAppointments();
      renderDrugRequests();
    }
  }

  function reportLoadError(error) {
    Shifa.ui.toast(error.message);
    if (error.status === 401) Shifa.auth.redirectToLogin('dashboard.html');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('account-save-btn')
      .addEventListener('click', function () { saveAccount(this); });

    document.getElementById('dash-refresh-btn')
      .addEventListener('click', load);

    document.getElementById('dash-logout-btn')
      .addEventListener('click', function () { logout(); });

    var addStockBtn = document.getElementById('add-stock-btn');
    if (addStockBtn) addStockBtn.addEventListener('click', addStock);

    var addServiceBtn = document.getElementById('add-service-btn');
    if (addServiceBtn) addServiceBtn.addEventListener('click', addService);

    wireStatusSelect('pharmacy-status', function (status) {
      return Shifa.api.pharmacies.setStatus(status);
    });
    wireStatusSelect('facility-status', function (status) {
      return Shifa.api.facilities.setStatus(status);
    });

    /* Delegated: rows are re-rendered, so handlers cannot be bound once. */
    document.getElementById('dash-root').addEventListener('click', function (event) {
      var save = event.target.closest('[data-dash-save]');
      if (save) {
        var which = save.getAttribute('data-dash-save');
        if (which === 'doctor') saveDoctor(save);
        else if (which === 'pharmacy') savePharmacy(save);
        else if (which === 'facility') saveFacility(save);
        return;
      }

      var del = event.target.closest('[data-delete-request]');
      if (del) { deleteDrugRequest(del.getAttribute('data-delete-request'), del); return; }

      var stock = event.target.closest('[data-update-stock]');
      if (stock) {
        updateStock(stock.getAttribute('data-update-stock'),
          stock.closest('[data-medicine-id]'), stock);
        return;
      }

      var service = event.target.closest('[data-update-service]');
      if (service) {
        updateService(service.getAttribute('data-update-service'),
          service.closest('div'), service);
      }
    });

    load();
  });
})();
