/* ============================================
   NAVIGATION — scroll + hamburger
   ============================================ */
(function () {
  const nav     = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const overlay = document.getElementById('navOverlay');
  let menuOpen  = false;

  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  if (menuBtn && overlay) {
    menuBtn.addEventListener('click', () => {
      menuOpen = !menuOpen;
      menuBtn.classList.toggle('open', menuOpen);
      overlay.classList.toggle('open', menuOpen);
      document.body.style.overflow = menuOpen ? 'hidden' : '';
    });
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menuOpen = false;
        menuBtn.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
})();

/* ============================================
   SCROLL REVEAL
   ============================================ */
(function () {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-fade').forEach(el => obs.observe(el));
})();

/* ============================================
   MOOD TEA DRAG SCROLL
   ============================================ */
(function () {
  const el = document.querySelector('.mood-tea__scroll');
  if (!el) return;
  let down = false, startX, scrollLeft;

  el.addEventListener('mousedown', e => {
    down = true; el.classList.add('grabbing');
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });
  ['mouseleave','mouseup'].forEach(ev =>
    el.addEventListener(ev, () => { down = false; el.classList.remove('grabbing'); })
  );
  el.addEventListener('mousemove', e => {
    if (!down) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.8;
  });
})();

/* ============================================
   CONTACT FORM
   ============================================ */
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.textContent = '送信しました。ありがとうございます。';
    btn.disabled = true;
    btn.style.opacity = '0.65';
  });
})();
