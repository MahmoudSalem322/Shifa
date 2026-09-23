/* =====================================================================
   منصة شِفَاء — client-side interactions (vanilla JS, no frameworks)
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Reservation micro-interaction ---------- */
  document.querySelectorAll('.btn-reserve').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.busy) return;
      btn.dataset.busy = '1';
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:16px">sync</span><span>جاري التأكيد...</span>';
      setTimeout(function () {
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">check</span><span>تم بنجاح</span>';
        btn.classList.add('done');
      }, 600);
    });
  });

  /* ---------- Favorite toggle (hero) ---------- */
  document.querySelectorAll('.tool-btn').forEach(function (btn) {
    var icon = btn.querySelector('.material-symbols-outlined');
    if (icon && icon.textContent.trim() === 'favorite_border') {
      btn.addEventListener('click', function () {
        var active = icon.textContent.trim() === 'favorite';
        icon.textContent = active ? 'favorite_border' : 'favorite';
        icon.style.color = active ? '' : 'var(--state-danger)';
        icon.style.fontVariationSettings = active ? '"FILL" 0' : '"FILL" 1';
      });
    }
  });

  /* ---------- Language toggle (label swap stub) ---------- */
  var langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      langBtn.textContent = langBtn.textContent.trim() === 'EN' ? 'ع' : 'EN';
    });
  }
})();
