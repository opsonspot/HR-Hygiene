/* H R Hygiene Products Ltd. — "Partner" design: core behaviour (no dependencies) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  // Smooth scroll helper (uses Lenis when motion.js created one)
  function scrollToEl(el, offset) {
    if (!el) return;
    var off = offset == null ? -(parseInt(getComputedStyle(html).getPropertyValue('--hdr'), 10) || 76) - 12 : offset;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: off, duration: 1.1 });
    else {
      var y = el.getBoundingClientRect().top + window.pageYOffset + off;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  window.__scrollToEl = scrollToEl;

  /* ---------- header ---------- */
  var hdr = $('.hdr');
  var solidAlways = hdr && hdr.classList.contains('is-solid-always');
  function onScroll() {
    if (!hdr) return;
    hdr.classList.toggle('is-solid', solidAlways || window.pageYOffset > 30);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), nav = $('#nav');
  function isOverlay() { return burger && getComputedStyle(burger).display !== 'none'; }
  function setMenu(open, silent) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    if (open) { var f = $('a', nav); if (f) f.focus({ preventScroll: true }); }
    else if (!silent) burger.focus();
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && nav.classList.contains('is-open')) setMenu(false, true); });
    document.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key === 'Tab') { // keep focus inside the open menu
        var items = [burger].concat($$('a', nav));
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (!isOverlay() && nav.classList.contains('is-open')) setMenu(false, true); });
  }

  /* ---------- in-page anchors via smooth scroll ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var t = document.getElementById(id.slice(1));
    if (!t) return;
    e.preventDefault();
    scrollToEl(t);
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- active nav link ---------- */
  var links = $$('.nav a[href^="#"]:not(.btn), .inv__nav a[href^="#"]');
  if (links.length && hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) spy.observe(t); });
  }

  /* ---------- product range filter ---------- */
  var cat = $('[data-cat]');
  if (cat) {
    var cards = $$('.pc', cat), fbtns = $$('[data-filter]'), count = $('.filters__count'), notes = $$('[data-seg-note]');
    var brandNames = { femiss: 'Femiss', womanica: 'Womanica', elderfit: 'ElderFit', bloom: 'Bloom Baby' };
    var applyFilter = function (kind, value) {
      var state = window.Flip && !reduce ? window.Flip.getState(cards) : null;
      var shown = 0;
      cards.forEach(function (c) {
        var ok = value === 'all' || (kind === 'seg' ? c.dataset.seg === value : c.dataset.brand === value);
        c.hidden = !ok; if (ok) shown++;
      });
      fbtns.forEach(function (b) {
        var on = kind === 'seg' && b.dataset.filter === value;
        b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      notes.forEach(function (n) {
        var seg = n.dataset.segNote;
        var rel = value === 'all' || (kind === 'seg' ? seg === value : cards.some(function (c) { return !c.hidden && c.dataset.seg === seg; }));
        n.classList.toggle('is-dim', !rel); n.classList.toggle('is-hi', rel && value !== 'all');
      });
      if (count) count.textContent = (kind === 'brand' ? brandNames[value] + ' range: ' : '') + shown + (shown === 1 ? ' product' : ' products');
      if (state) window.Flip.from(state, { duration: .6, ease: 'power3.inOut', absolute: true, scale: true, onEnter: function (els) { return window.gsap.fromTo(els, { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .5 }); }, onLeave: function (els) { return window.gsap.to(els, { opacity: 0, scale: .9, duration: .3 }); } });
      if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 700);
    };
    fbtns.forEach(function (b) { b.addEventListener('click', function () { applyFilter('seg', b.dataset.filter); }); });
    $$('[data-filter-link]').forEach(function (a) {
      a.addEventListener('click', function () {
        var v = a.dataset.filterLink;
        if (v === 'adult' || v === 'baby') applyFilter('seg', v); else applyFilter('brand', v);
      });
    });
    if (count) count.textContent = cards.length + ' products';
  }

  /* ---------- dialogs ---------- */
  var lastFocus = null;
  function openDlg(d) {
    lastFocus = document.activeElement;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    html.classList.add('dlg-open');
    if (window.__lenis) window.__lenis.stop();
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', function () {
      html.classList.remove('dlg-open');
      if (window.__lenis) window.__lenis.start();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
  });

  // management profiles: details work without JS, dialog with JS
  var bio = $('#bio');
  if (bio) {
    $$('.person .bio summary').forEach(function (sum) {
      sum.setAttribute('aria-haspopup', 'dialog');
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        var card = sum.closest('.person');
        $('#bio-name', bio).textContent = $('h4', card).textContent;
        $('.person__role', bio).textContent = $('.person__role', card).textContent;
        $('.dlg__text', bio).textContent = $('.bio__text', card).textContent;
        var ph = $('.dlg__ph', bio); ph.innerHTML = '';
        var clone = $('.person__ph', card).cloneNode(true);
        var im = $('img', clone); if (im) { im.removeAttribute('loading'); im.alt = ''; }
        clone.setAttribute('aria-hidden', 'true');
        ph.appendChild(clone);
        openDlg(bio);
      });
    });
  }

  // press clipping lightbox
  var lb = $('#lightbox');
  if (lb) {
    var clips = $$('[data-lightbox]'), cur = 0, lbImg = document.createElement('img'), lbCount = $('.lb__count', lb);
    var show = function (i) {
      cur = (i + clips.length) % clips.length;
      var im = $('img', clips[cur]);
      lbImg.src = clips[cur].getAttribute('href'); lbImg.alt = im.alt;
      if (!lbImg.parentNode) lb.insertBefore(lbImg, $('.lb__next', lb));
      lbImg.width = im.getAttribute('width'); lbImg.height = im.getAttribute('height');
      lbCount.textContent = (cur + 1) + ' / ' + clips.length;
    };
    clips.forEach(function (c, i) { c.addEventListener('click', function (e) { e.preventDefault(); show(i); openDlg(lb); }); });
    $('.lb__prev', lb).addEventListener('click', function () { show(cur - 1); });
    $('.lb__next', lb).addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  }

  /* ---------- multi-step enquiry form ---------- */
  var form = $('#enquiry');
  if (form) {
    var steps = $$('.fstep', form), at = 1;
    var prog = $$('.prog li', form), bar = $('.prog__bar span', form), srp = $('.prog__sr', form);
    var back = $('[data-back]', form), next = $('[data-next]', form), note = $('.form__note', form);
    var sel = $('#f-type', form), types = $('.types', form), review = $('.review', form);
    var labels = ['Choose partner type', 'Share your details', 'Your message'];
    var desc = { 'General enquiry': 'Products, the company or anything else', 'Distributor': 'Stock and supply our brands in your area', 'Super Stockist': 'Serve distributors at a regional level', 'Wholesale': 'Buy in bulk for resale' };

    form.classList.add('is-steps');
    form.noValidate = true;
    back.hidden = false; next.hidden = false;

    // partner type cards mirror the native select
    var selWrap = sel.closest('.field');
    selWrap.setAttribute('aria-hidden', 'true'); sel.tabIndex = -1;
    types.hidden = false;
    var radios = Array.prototype.map.call(sel.options, function (o) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'type'; b.setAttribute('role', 'radio');
      b.dataset.value = o.value;
      b.innerHTML = '<b></b><span></span>';
      b.firstChild.textContent = o.value; b.lastChild.textContent = desc[o.value] || '';
      types.appendChild(b);
      return b;
    });
    function syncType() {
      radios.forEach(function (r) {
        var on = r.dataset.value === sel.value;
        r.setAttribute('aria-checked', on ? 'true' : 'false'); r.tabIndex = on ? 0 : -1;
      });
    }
    function setType(v, focus) {
      sel.value = v; syncType();
      if (focus) radios.filter(function (r) { return r.dataset.value === v; })[0].focus();
    }
    radios.forEach(function (r, i) {
      r.addEventListener('click', function () { setType(r.dataset.value); });
      r.addEventListener('keydown', function (e) {
        var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        setType(radios[(i + d + radios.length) % radios.length].dataset.value, true);
      });
    });
    sel.addEventListener('change', syncType);
    syncType();

    function labelFor(el) { var l = $('label[for="' + el.id + '"]', form); return l ? l.textContent.replace('*', '').trim() : el.name; }
    function setErr(el, msg) {
      var f = el.closest('.field'), e = $('.err', f);
      f.classList.toggle('is-bad', !!msg);
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      if (e) { e.textContent = msg || ''; if (e.id) el.setAttribute('aria-describedby', e.id); }
    }
    function check(el) {
      var v = el.value.trim(), msg = '';
      if (el.required && !v) msg = 'Please enter ' + labelFor(el).replace(/^Your /, 'your ').replace(/^WhatsApp/, 'your WhatsApp').replace(/\.$/, '') + '.';
      else if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Please enter a valid email address.';
      else if (el.type === 'tel' && v && v.replace(/\D/g, '').length < 10) msg = 'Please enter a valid mobile number (at least 10 digits).';
      setErr(el, msg);
      return !msg;
    }
    function validateStep(n) {
      var bad = null;
      $$('input, textarea', steps[n - 1]).forEach(function (el) { if (!check(el) && !bad) bad = el; });
      return bad;
    }
    $$('input, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-bad')) check(el); });
      el.addEventListener('blur', function () { if (el.value) check(el); });
    });

    function fillReview() {
      review.innerHTML = '';
      var rows = [['Partner type', sel.value], ['Name', $('#f-name').value], ['Business', $('#f-biz').value], ['Email', $('#f-email').value], ['WhatsApp', $('#f-phone').value], ['Location', [$('#f-city').value, $('#f-state').value].filter(Boolean).join(', ')]];
      rows.forEach(function (r) {
        if (!r[1]) return;
        var dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = r[0]; dd.textContent = r[1];
        review.appendChild(dt); review.appendChild(dd);
      });
      review.hidden = !review.children.length;
    }

    function go(n, focus) {
      at = Math.max(1, Math.min(3, n));
      steps.forEach(function (s, i) { s.classList.toggle('is-active', i === at - 1); });
      prog.forEach(function (p, i) { p.classList.toggle('is-on', i === at - 1); p.classList.toggle('is-done', i < at - 1); });
      if (bar) bar.style.transform = 'scaleX(' + (at / 3) + ')';
      back.hidden = at === 1;
      form.classList.toggle('on-last', at === 3);
      if (srp) srp.textContent = 'Step ' + at + ' of 3: ' + labels[at - 1];
      if (at === 3) fillReview();
      if (focus) {
        var first = at === 1 ? radios.filter(function (r) { return r.tabIndex === 0; })[0] : $('input, textarea', steps[at - 1]);
        if (first) first.focus({ preventScroll: true });
        var top = form.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * .5) scrollToEl(form);
      }
    }
    next.addEventListener('click', function () {
      var bad = validateStep(at);
      if (bad) { bad.focus(); return; }
      go(at + 1, true);
    });
    back.addEventListener('click', function () { go(at - 1, true); });
    // Enter in a text input moves to next step instead of submitting early
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && at < 3) { e.preventDefault(); next.click(); }
    });
    go(1);

    // "Choose partner type" picks in the stepper section
    $$('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        setType(a.dataset.pick);
        go(2);
        scrollToEl(form);
        setTimeout(function () { var f = $('#f-name'); if (f) f.focus({ preventScroll: true }); }, 900);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      for (var n = 1; n <= 3; n++) {
        var bad = validateStep(n);
        if (bad) { go(n); bad.focus(); return; }
      }
      var f = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var v = f.get(el.name);
        if (v) lines.push(labelFor(el) + ': ' + v);
      });
      var subject = 'Website enquiry (' + f.get('type') + ') - ' + f.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.dataset.mailto = href;
      prog.forEach(function (p) { p.classList.remove('is-on'); p.classList.add('is-done'); });
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '. ';
      var a = document.createElement('a'); a.href = href; a.textContent = 'Open the email again';
      note.appendChild(a);
      window.location.href = href;
    });
  }

  /* ---------- floating CTA (desktop) + bottom bar ---------- */
  var fab = $('.fab'), hero = $('.hero'), contact = $('#contact'), partner = $('#partner');
  if (fab && hero && hasIO) {
    var heroIn = true, endIn = false;
    var upd = function () { fab.classList.toggle('is-show', !heroIn && !endIn); };
    new IntersectionObserver(function (en) { heroIn = en[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -40% 0px' }).observe(hero);
    var ends = [contact, partner, $('.ftr')].filter(Boolean), vis = new Set();
    var eo = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) vis.add(x.target); else vis.delete(x.target); });
      endIn = vis.size > 0; upd();
    });
    ends.forEach(function (el) { eo.observe(el); });
  }

  $$('.year').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- investors: live document filter ---------- */
  var q = $('#doc-q');
  if (q) {
    var groups = $$('.inv__group'), res = $('.search__res'), empty = $('.inv__empty');
    q.addEventListener('input', function () {
      var term = q.value.trim().toLowerCase(), total = 0;
      groups.forEach(function (g) {
        var gHits = 0;
        $$('ul.docs, .offer', g).forEach(function (list) {
          var hits = 0;
          $$('a', list).forEach(function (a) {
            var ok = !term || a.textContent.toLowerCase().indexOf(term) > -1 || g.querySelector('h2').textContent.toLowerCase().indexOf(term) > -1;
            var item = a.closest('li') || a;
            item.hidden = !ok; if (ok) hits++;
          });
          var h = list.previousElementSibling;
          if (h && h.tagName === 'H3') h.hidden = !hits;
          gHits += hits;
        });
        g.hidden = !gHits; total += gHits;
      });
      if (res) res.textContent = term ? total + (total === 1 ? ' document matches' : ' documents match') : '';
      if (empty) empty.hidden = total > 0;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }
})();
