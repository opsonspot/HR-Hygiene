/* H R Hygiene Products Ltd. — "Every Stage of Life" behaviour
   Progressive enhancement: everything works without GSAP/Lenis; motion only when available
   and when the visitor has not asked for reduced motion. */
(function () {
  'use strict';
  var d = document, html = d.documentElement;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var anim = !!(G && ST) && !reduce;
  var lenis = null;
  var NS = 'http://www.w3.org/2000/svg';

  if (anim) {
    G.registerPlugin(ST);
    if (window.SplitText) G.registerPlugin(window.SplitText);
    html.classList.add('anim');
  }

  /* ---------- year ---------- */
  $$('.year').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- smooth scroll (Lenis) ---------- */
  if (anim && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
      lenis.on('scroll', ST.update);
      G.ticker.add(function (t) { lenis.raf(t * 1000); });
      G.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }
  function headerOffset() { return ($('.header') ? 84 : 0); }
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: -headerOffset(), duration: 1.2 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- header + nav ---------- */
  var header = $('.header'), burger = $('.burger'), nav = $('#nav');
  var lastY = window.scrollY;
  function onScrollHeader() {
    var y = window.scrollY;
    if (!header) return;
    header.classList.toggle('is-solid', y > 30 || header.dataset.solid === '1');
    var open = nav && nav.classList.contains('is-open');
    if (!open && !reduce && y > 500 && y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 500) header.classList.remove('is-hidden');
    lastY = y;
  }
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  function setNav(open, focusBurger) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    html.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) { var f = $('a', nav); if (f) setTimeout(function () { f.focus(); }, 60); }
    else if (focusBurger) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) setNav(false, true);
  });
  if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
  // keep focus inside open mobile menu
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !nav || !nav.classList.contains('is-open')) return;
    var items = [burger].concat($$('a', nav));
    var i = items.indexOf(d.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });

  /* in-page anchors */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = d.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    if (history.pushState) history.pushState(null, '', id);
    if (id === '#enquiry') setTimeout(function () { var f = $('#f-type'); if (f) f.focus({ preventScroll: true }); }, 900);
  });

  /* active section spy */
  var links = $$('.nav__link[href^="#"], .inv-nav a[href^="#"]');
  var targets = links.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- dialogs ---------- */
  function openDialog(dlg) {
    if (!dlg || typeof dlg.showModal !== 'function') return false;
    dlg.showModal();
    if (lenis) lenis.stop();
    return true;
  }
  $$('dialog').forEach(function (dl) {
    dl.addEventListener('click', function (e) {
      if (e.target === dl || e.target.closest('[data-close]')) dl.close();
    });
    dl.addEventListener('close', function () { if (lenis) lenis.start(); });
    dl.setAttribute('data-lenis-prevent', '');
  });

  var bio = $('#bio');
  if (bio) {
    $$('.person [data-bio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.person');
        $('#bio-name').textContent = $('.person__name', card).textContent;
        $('.dlg__role', bio).textContent = $('.person__role', card).textContent;
        $('.dlg__text', bio).textContent = $('.person__bio', card).textContent;
        var av = $('.dlg__avatar', bio);
        av.innerHTML = '';
        av.style.setProperty('--c', card.style.getPropertyValue('--c'));
        var img = $('.person__photo img', card);
        if (img) { var c = img.cloneNode(); c.alt = ''; c.removeAttribute('loading'); av.appendChild(c); }
        else av.textContent = $('.mono', card).textContent;
        if (!openDialog(bio)) {
          // no <dialog> support: reveal bio inline
          $('.person__bio', card).style.display = 'block';
        }
      });
    });
  }
  var box = $('#lightbox');
  if (box) {
    $$('.clip').forEach(function (clip) {
      clip.addEventListener('click', function () {
        var img = $('img', clip), big = $('img', box);
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        big.width = img.naturalWidth || img.width;
        big.height = img.naturalHeight || img.height;
        if (!openDialog(box)) window.open(img.src, '_blank', 'noopener');
      });
    });
  }

  /* ---------- enquiry form (mailto) ---------- */
  var form = $('#enquiry');
  if (form) {
    form.noValidate = true;
    var note = $('.form__note', form);
    function fieldError(el) {
      var v = el.value.trim();
      if (el.required && !v) return 'Please fill in this field.';
      if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address.';
      if (el.type === 'tel' && v && !/^[+\d][\d\s-]{6,}$/.test(v)) return 'Please enter a valid mobile number.';
      return '';
    }
    function showError(el, msg) {
      var field = el.closest('.field'), err = $('.field__err', field);
      field.classList.toggle('is-invalid', !!msg);
      if (msg) {
        if (!err) { err = d.createElement('span'); err.className = 'field__err'; err.id = el.id + '-err'; field.appendChild(err); }
        err.textContent = msg;
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', err.id);
      } else {
        if (err) err.remove();
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      }
    }
    $$('input, textarea, select', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.closest('.field').classList.contains('is-invalid')) showError(el, fieldError(el)); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-invalid')) showError(el, fieldError(el)); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      $$('input, textarea, select', form).forEach(function (el) {
        var msg = fieldError(el);
        showError(el, msg);
        if (msg && !first) first = el;
      });
      if (first) {
        first.focus();
        note.textContent = 'Please complete the highlighted fields.';
        return;
      }
      var f = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        if (f.get(el.name)) lines.push(label + ': ' + f.get(el.name));
      });
      var subject = 'Website enquiry (' + f.get('type') + ') - ' + f.get('name');
      var url = 'mailto:' + form.dataset.to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      form.dataset.lastMailto = url;
      window.location.href = url;
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
    });
  }

  /* ---------- product shelf ---------- */
  var track = $('.shelf__track');
  if (track) {
    var bar = $('.shelf__progress span'), prev = $('[data-shelf="-1"]'), next = $('[data-shelf="1"]');
    var step = function () { var c = $('.pcard', track); return c ? c.getBoundingClientRect().width + 20 : 300; };
    var upd = function () {
      var max = track.scrollWidth - track.clientWidth;
      var p = max > 0 ? track.scrollLeft / max : 1;
      var vis = track.clientWidth / track.scrollWidth;
      if (bar) bar.style.transform = 'translateX(' + (p * (1 / vis - 1) * 100) + '%) scaleX(1)';
      if (bar) bar.style.width = (vis * 100) + '%';
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
    };
    track.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
    $$('[data-shelf]').forEach(function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: step() * parseInt(b.dataset.shelf, 10), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); }
    });
    // drag to scroll (mouse only; touch uses native scrolling)
    var down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) track.classList.add('is-drag');
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (track.classList.contains('is-drag')) {
        track.classList.remove('is-drag');
        // settle on nearest card
        var s = step(), target = Math.round(track.scrollLeft / s) * s;
        track.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    // images further along the shelf sit outside the viewport horizontally; load them once the shelf is near
    if ('IntersectionObserver' in window) {
      var shelfIO = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        $$('img[loading="lazy"]', track).forEach(function (im) { im.loading = 'eager'; });
        shelfIO.disconnect();
      }, { rootMargin: '400px 0px' });
      shelfIO.observe(track);
    }
  }

  /* ---------- investors: document filter ---------- */
  var filt = $('#docFilter');
  if (filt) {
    var status = $('.filter__status'), groups = $$('.inv__group');
    filt.addEventListener('input', function () {
      var q = filt.value.trim().toLowerCase(), shown = 0;
      groups.forEach(function (g) {
        var any = 0;
        $$('.docs, .offer', g).forEach(function (list) {
          var vis = 0;
          $$('a', list).forEach(function (a) {
            var hit = !q || a.textContent.toLowerCase().indexOf(q) > -1 || ($('h2', g).textContent.toLowerCase().indexOf(q) > -1);
            (a.closest('li') || a).classList.toggle('is-hidden-f', !hit);
            if (hit) vis++;
          });
          list.classList.toggle('is-hidden-f', !vis);
          var h = list.previousElementSibling;
          if (h && h.classList.contains('grp__sub')) h.classList.toggle('is-hidden-f', !vis);
          any += vis;
        });
        g.classList.toggle('is-hidden-f', !any);
        shown += any;
      });
      status.textContent = q ? (shown ? shown + (shown === 1 ? ' document matches' : ' documents match') : 'No documents match. Try another word.') : '';
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }

  /* ---------- data visuals (authored SVG) ---------- */
  function rnd(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function el(tag, attrs, parent) { var n = d.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  var area = $('.area-viz');
  if (area) {
    for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) {
      el('rect', { x: 6 + c * 18.5, y: 6 + r * 18.5, width: 15, height: 15, rx: 3.5, fill: '#1d1b3a', 'fill-opacity': (0.25 + ((r * 6 + c) % 5) * 0.15).toFixed(2), class: 'vz' }, area);
    }
  }
  var hub = $('.hub-viz');
  if (hub) {
    for (var i = 0; i < 182; i++) {
      var a = i / 182 * Math.PI * 2;
      el('circle', { cx: (60 + Math.cos(a) * 54).toFixed(2), cy: (60 + Math.sin(a) * 54).toFixed(2), r: 0.95, fill: '#fff', 'fill-opacity': .8 }, hub);
    }
    var g = el('g', { class: 'hub-spokes' }, hub);
    for (var j = 0; j < 11; j++) {
      var b = j / 11 * Math.PI * 2 - Math.PI / 2, x = 60 + Math.cos(b) * 34, y = 60 + Math.sin(b) * 34;
      el('line', { x1: 60, y1: 60, x2: x.toFixed(2), y2: y.toFixed(2), stroke: '#fff', 'stroke-opacity': .5, 'stroke-width': 1.2, class: 'vz-line' }, g);
      el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 4.2, fill: '#ffc93c', class: 'vz' }, hub);
    }
    el('circle', { cx: 60, cy: 60, r: 9, fill: '#fff', class: 'vz' }, hub);
  }
  var team = $('.team-viz');
  if (team) {
    for (var tr = 0; tr < 6; tr++) for (var tc = 0; tc < 16; tc++) {
      el('circle', { cx: 4 + tc * 7.4, cy: 6 + tr * 12, r: 2.7, fill: '#1d1b3a', class: 'vz' }, team);
    }
  }
  var reach = $('.reach-viz');
  if (reach) {
    var R = rnd(7), pts = [], tries = 0;
    while (pts.length < 36 && tries < 6000) {
      tries++;
      var px = 18 + R() * 264, py = 14 + R() * 142;
      // organic blob mask (not a map): sum of two ellipses
      var e1 = Math.pow((px - 120) / 110, 2) + Math.pow((py - 80) / 70, 2);
      var e2 = Math.pow((px - 210) / 80, 2) + Math.pow((py - 100) / 60, 2);
      if (Math.min(e1, e2) > 1) continue;
      if (pts.some(function (p) { return Math.hypot(p[0] - px, p[1] - py) < 24; })) continue;
      pts.push([px, py]);
    }
    var lg = el('g', { stroke: '#fff', 'stroke-opacity': .18, 'stroke-width': 1.2 }, reach);
    pts.forEach(function (p, k) {
      var best = null, bd = 1e9;
      pts.forEach(function (q, m) { if (m === k) return; var dd = Math.hypot(p[0] - q[0], p[1] - q[1]); if (dd < bd) { bd = dd; best = q; } });
      if (best) el('line', { x1: p[0].toFixed(1), y1: p[1].toFixed(1), x2: best[0].toFixed(1), y2: best[1].toFixed(1), class: 'vz-line' }, lg);
    });
    pts.forEach(function (p, k) {
      if (k < 28) el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 6.5, fill: '#3cc3f0', class: 'vz' }, reach);
      else el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 6, fill: 'none', stroke: '#f8a77e', 'stroke-width': 3, class: 'vz' }, reach);
    });
  }

  /* ---------- awards zig-zag path ---------- */
  var zig = $('.zig'), zigWrap = $('.zig-wrap');
  var zigSvg = null;
  function buildZig() {
    if (!zig) return;
    if (!zigSvg) {
      zigSvg = el('svg', { class: 'zig__path', 'aria-hidden': 'true', focusable: 'false' });
      zigWrap.insertBefore(zigSvg, zigWrap.firstChild);
    }
    zigSvg.innerHTML = '';
    if (window.innerWidth <= 900) return;
    var zr = zigWrap.getBoundingClientRect();
    var chips = $$('.zig__year', zig).map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2 - zr.left, r.top + r.height / 2 - zr.top]; });
    if (chips.length < 2) return;
    var dstr = 'M' + chips[0][0] + ' ' + (chips[0][1] - 60) + ' L' + chips[0][0] + ' ' + chips[0][1];
    for (var k = 1; k < chips.length; k++) {
      var p0 = chips[k - 1], p1 = chips[k], dy = p1[1] - p0[1], s = (k % 2 ? 1 : -1) * Math.min(90, zr.width * 0.07);
      dstr += ' C' + (p0[0] + s) + ' ' + (p0[1] + dy * 0.35) + ' ' + (p1[0] + s) + ' ' + (p1[1] - dy * 0.35) + ' ' + p1[0] + ' ' + p1[1];
    }
    el('path', { d: dstr }, zigSvg);
    var draw = el('path', { d: dstr, class: 'zig__draw' }, zigSvg);
    var L = draw.getTotalLength();
    draw.style.strokeDasharray = L;
    draw.style.strokeDashoffset = anim ? L : 0;
    if (anim) {
      if (buildZig.st) buildZig.st.kill();
      buildZig.st = G.to(draw, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: zig, start: 'top 70%', end: 'bottom 70%', scrub: 0.6 } });
    }
  }

  /* ---------- the thread of care ---------- */
  var thread = $('.thread'), tg = thread && $('.thread__paths', thread), head = thread && $('.thread__head', thread);
  var segs = [];
  var ROUTE = [
    ['.hero', 'L', 0], ['#about', 'L', 0.62], ['#stages', 'R', 0], ['#brands', 'L', 0.12],
    ['#numbers', 'R', 0.3], ['#products', 'L', 0], ['#why', 'R', 0], ['#infrastructure', 'L', 0.45],
    ['#management', 'R', 0.2], ['#awards', 'L', 0.5], ['#news', 'R', 0.5], ['#contact', 'L', 0]
  ];
  function wobble(x, y0, y1, amp, phase) {
    var s = '', h = y1 - y0;
    if (h <= 0) return '';
    var n = Math.max(1, Math.round(h / 280)), ph = phase || 1;
    for (var i = 0; i < n; i++) {
      var a = y0 + h * i / n, b = y0 + h * (i + 1) / n, k = ((i % 2) ? -1 : 1) * amp * ph;
      s += ' C' + (x + k).toFixed(1) + ' ' + (a + (b - a) / 3).toFixed(1) + ' ' + (x - k).toFixed(1) + ' ' + (a + 2 * (b - a) / 3).toFixed(1) + ' ' + x.toFixed(1) + ' ' + b.toFixed(1);
    }
    return s;
  }
  function loop(x, y, r, dir) {
    // a hand-drawn curl centred on the run line (stays inside the gutter); ends at y + 3.5r
    var cx = x, cy = y + 1.3 * r;
    var X = function (v) { return (cx + v * r * dir).toFixed(1); }, Y = function (v) { return (cy + v * r).toFixed(1); };
    return ' C' + X(0.2) + ' ' + Y(-0.8) + ' ' + X(1) + ' ' + Y(-0.6) + ' ' + X(1) + ' ' + Y(0) +
      ' C' + X(1) + ' ' + Y(0.7) + ' ' + X(0.5) + ' ' + Y(1) + ' ' + X(0) + ' ' + Y(1) +
      ' C' + X(-0.6) + ' ' + Y(1) + ' ' + X(-1) + ' ' + Y(0.6) + ' ' + X(-1) + ' ' + Y(0) +
      ' C' + X(-1) + ' ' + Y(-0.7) + ' ' + X(-0.4) + ' ' + Y(-1) + ' ' + X(0.1) + ' ' + Y(-0.85) +
      ' C' + X(0.5) + ' ' + Y(-0.7) + ' ' + X(0.3) + ' ' + Y(0.8) + ' ' + X(0) + ' ' + Y(2.2);
  }
  function boxOf(node) {
    var p = node.parentElement;
    var t = (p && p.classList.contains('pin-spacer')) ? p : node;
    var r = t.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  }
  function buildThread() {
    if (!thread || getComputedStyle(thread).display === 'none') { segs = []; return; }
    var main = $('#main'), W = main.clientWidth, mainTop = main.getBoundingClientRect().top + window.scrollY;
    var H = main.scrollHeight;
    thread.setAttribute('height', H); thread.style.height = H + 'px';
    thread.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var grad = $('#threadGrad'); if (grad) grad.setAttribute('y2', H);
    var ref = $('#about .wrap'), rr = ref.getBoundingClientRect(), padL = parseFloat(getComputedStyle(ref).paddingLeft);
    var contentLeft = rr.left + padL, gx = Math.max(12, contentLeft - Math.min(64, contentLeft / 2));
    var xs = { L: gx, R: W - gx };
    tg.innerHTML = '';
    segs = [];
    var cue = $('.scrollcue'), sr = cue.getBoundingClientRect();
    var cur = [sr.left + sr.width / 2, sr.bottom - mainTop + window.scrollY + 8];
    var r = Math.max(10, Math.min(30, gx * 0.72));
    ROUTE.forEach(function (rt, idx) {
      var node = $(rt[0]); if (!node) return;
      var b = boxOf(node), top = b.top - mainTop, bot = b.bottom - mainTop, x = xs[rt[1]];
      var dir = rt[1] === 'L' ? 1 : -1;
      var d0 = 'M' + cur[0].toFixed(1) + ' ' + cur[1].toFixed(1);
      var y0 = Math.max(cur[1] + 60, top + 70);
      if (idx === 0) {
        // from the scroll cue, dive under the marquee and swing out to the gutter
        y0 = Math.max(cur[1] + 320, top + 70);
        d0 += ' C' + cur[0].toFixed(1) + ' ' + (cur[1] + 200).toFixed(1) + ' ' + x.toFixed(1) + ' ' + (y0 - 200).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y0.toFixed(1);
      } else {
        var k = Math.max(50, (y0 - cur[1]) * 0.55);
        d0 += ' C' + cur[0].toFixed(1) + ' ' + (cur[1] + k).toFixed(1) + ' ' + x.toFixed(1) + ' ' + (y0 - k).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y0.toFixed(1);
      }
      var last = idx === ROUTE.length - 1;
      var y1;
      if (last) {
        var cta = $('.cta__heart'), hr = cta.getBoundingClientRect();
        var ex = hr.left + hr.width / 2, ey = hr.top + window.scrollY - mainTop - 10;
        var pre = Math.max(y0 + 10, ey - 160);
        d0 += wobble(x, y0, pre, 6, 1);
        d0 += ' C' + x + ' ' + (pre + 80) + ' ' + ex.toFixed(1) + ' ' + (ey - 80).toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1);
        y1 = ey; cur = [ex, ey];
      } else {
        y1 = bot - 70;
        if (rt[2] > 0) {
          var yl = top + (bot - top) * rt[2];
          d0 += wobble(x, y0, yl, 9, 1) + loop(x, yl, r, dir);
          d0 += wobble(x, yl + r * 3.5, y1, 9, -1);
        } else d0 += wobble(x, y0, y1, 9, 1);
        cur = [x, Math.max(y0, y1)];
      }
      var p = el('path', { d: d0 }, tg);
      segs.push({ p: p });
    });
    // sample each segment so that scroll position maps to drawn length
    segs.forEach(function (s) {
      var L = s.p.getTotalLength(), samples = [], mx = -1e9, n = Math.max(2, Math.ceil(L / 8));
      for (var i = 0; i <= n; i++) {
        var l = L * i / n, pt = s.p.getPointAtLength(l);
        mx = Math.max(mx, pt.y);
        samples.push([l, mx, pt.x, pt.y]);
      }
      s.L = L; s.samples = samples; s.yMin = samples[0][1]; s.yMax = mx; s.last = -1;
      s.p.style.strokeDasharray = L + ' ' + (L + 2);
      s.p.style.strokeDashoffset = (anim ? L : 0);
    });
    drawThread(true);
  }
  function drawThread(force) {
    if (!segs.length || !anim) { if (head) head.style.opacity = 0; return; }
    var main = $('#main'), mainTop = main.getBoundingClientRect().top + window.scrollY;
    var target = window.scrollY + window.innerHeight * 0.62 - mainTop;
    var hp = null;
    segs.forEach(function (s) {
      var len;
      if (target >= s.yMax) len = s.L;
      else if (target <= s.yMin) len = 0;
      else {
        var lo = 0, hi = s.samples.length - 1;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (s.samples[mid][1] < target) lo = mid + 1; else hi = mid; }
        len = s.samples[lo][0];
        hp = s.samples[lo];
      }
      if (force || Math.abs(len - s.last) > 0.5) { s.p.style.strokeDashoffset = (s.L - len).toFixed(1); s.last = len; }
    });
    if (head) {
      if (hp) { head.setAttribute('cx', hp[2].toFixed(1)); head.setAttribute('cy', hp[3].toFixed(1)); head.style.opacity = 1; }
      else head.style.opacity = 0;
    }
  }
  var rebuildT;
  function scheduleBuild() { clearTimeout(rebuildT); rebuildT = setTimeout(function () { buildThread(); buildZig(); }, 160); }
  window.addEventListener('scroll', function () { drawThread(); }, { passive: true });
  window.addEventListener('resize', scheduleBuild);
  if ('ResizeObserver' in window) {
    var lastH = 0;
    new ResizeObserver(function () { var h = $('#main').scrollHeight; if (Math.abs(h - lastH) > 2) { lastH = h; scheduleBuild(); } }).observe($('#main'));
  }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(scheduleBuild);
  window.addEventListener('load', scheduleBuild);

  /* =========================================================
     Motion (GSAP) — only when allowed
     ========================================================= */
  if (!anim) { scheduleBuild(); return; }
  ST.addEventListener('refresh', scheduleBuild);

  if (!$('.hero')) {
    /* investors page motion */
    G.timeline({ defaults: { ease: 'power4.out' }, delay: 0.1 })
      .from('.ihero .hl__in', { yPercent: 110, duration: 1.1 })
      .from('.crumbs, .ihero__sub, .ihero__meta', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.2)
      .from('.ish', { scale: 0, rotate: -60, duration: 1.1, stagger: 0.08, ease: 'back.out(1.6)' }, 0.1)
      .from('.ihero__thread path', { strokeDashoffset: 2400, duration: 2, ease: 'power2.inOut' }, 0.1)
      .from('.cat', { y: 60, autoAlpha: 0, rotate: 3, duration: 0.9, stagger: 0.06, ease: 'back.out(1.4)', clearProps: 'transform,opacity,visibility' }, 0.35);
    G.to('.ish--1', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.ihero', start: 'top top', end: 'bottom top', scrub: true } });
    var inv = $$('.inv-side, .grp__head, .grp__sub, .inv__group > p, .offer__card, .doc');
    G.set(inv, { autoAlpha: 0, y: 30 });
    ST.batch(inv, { start: 'top 95%', once: true, onEnter: function (b) { G.to(b, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.035, clearProps: 'transform,opacity,visibility' }); } });
    return;
  }

  /* hero entrance (timed with the CSS intro) */
  var heroTl = G.timeline({ delay: $('.intro') ? 1.2 : 0.1, defaults: { ease: 'power4.out' } });
  heroTl
    .from('.hl__in', { yPercent: 110, rotate: 4, duration: 1.1, stagger: 0.09 })
    .from('.kicker', { y: 20, autoAlpha: 0, duration: 0.7 }, 0.1)
    .from('.cycler, .hero__sub, .hero__cta', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.35)
    .from('.hero__disc', { scale: 0.2, autoAlpha: 0, duration: 1.2, ease: 'back.out(1.4)' }, 0.05)
    .from('.orbit', { scale: 0.7, autoAlpha: 0, rotate: -40, duration: 1.4 }, 0.15)
    .from('.pack', { y: 120, scale: 0.6, autoAlpha: 0, duration: 1.1, stagger: 0.09, ease: 'back.out(1.5)' }, 0.25)
    .from('.hero__tag', { scale: 0, rotate: -40, duration: 0.8, ease: 'back.out(2)' }, 0.8)
    .from('.scrollcue', { autoAlpha: 0, duration: 0.6 }, 1);

  /* hero parallax: mouse + scroll */
  if (finePointer) {
    var packs = $$('.pack').map(function (p) {
      return { depth: parseFloat(p.dataset.depth) || 1, x: G.quickTo(p, 'x', { duration: 0.9, ease: 'power3' }), y: G.quickTo(p, 'y', { duration: 0.9, ease: 'power3' }) };
    });
    var heroEl = $('.hero');
    heroEl.addEventListener('pointermove', function (e) {
      var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      packs.forEach(function (p) { p.x(nx * 34 * p.depth); p.y(ny * 26 * p.depth); });
    });
    heroEl.addEventListener('pointerleave', function () { packs.forEach(function (p) { p.x(0); p.y(0); }); });
  }
  G.to('.hero__art', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  G.to('.hero__copy', { yPercent: 10, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true } });
  G.to('.marquee__track', { x: -200, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* magnetic buttons */
  if (finePointer) {
    $$('.magnetic').forEach(function (b) {
      var qx = G.quickTo(b, 'x', { duration: 0.5, ease: 'power3' }), qy = G.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.22); qy((e.clientY - r.top - r.height / 2) * 0.32);
      });
      b.addEventListener('pointerleave', function () { qx(0); qy(0); });
    });
  }

  /* split headings */
  function splitTitles() {
    if (!window.SplitText) return;
    $$('.split').forEach(function (h) {
      window.SplitText.create(h, {
        type: 'lines', mask: 'lines', linesClass: 'tline', autoSplit: true,
        onSplit: function (self) {
          return G.from(self.lines, { yPercent: 105, duration: 1, ease: 'power4.out', stagger: 0.08, scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
        }
      });
    });
  }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(splitTitles); else splitTitles();

  /* generic reveals */
  var revealSel = '.eyebrow, .head .lead, .about__copy > p, .more, .ulink.about-link, .seg, .note, .why__item, .infra__copy > p, .certs li, .line, .mgroup__title, .person, .zig__card, .clip, .info li, .form, .map, .cta, .tile, .stages:not(.is-pinned) .stage__grid';
  var revealEls = $$(revealSel).filter(function (n) { return !n.closest('.hero') && !n.closest('.stages'); });
  G.set(revealEls, { autoAlpha: 0, y: 40 });
  ST.batch(revealEls, {
    start: 'top 90%', once: true,
    onEnter: function (batch) { G.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform,opacity,visibility' }); }
  });

  /* about + infra image parallax */
  $$('.parallax').forEach(function (img) {
    G.set(img, { scale: 1.18 });
    G.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  G.from('.badge4', { scale: 0, rotate: -90, duration: 1, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.about__media', start: 'top 70%', once: true } });
  G.from('.infra__small', { y: 80, rotate: 6, ease: 'none', scrollTrigger: { trigger: '.infra__media', start: 'top bottom', end: 'bottom center', scrub: true } });

  /* life stages: pinned morphing scene on desktop */
  var mm = G.matchMedia();
  mm.add('(min-width: 900px) and (min-height: 620px)', function () {
    var sec = $('.stages'); sec.classList.add('is-pinned');
    var st = $$('.stage', sec), bgs = $$('.sbg', sec), dots = $$('.stages__dots li', sec);
    G.set(bgs[0], { opacity: 1 });
    var tl = G.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: sec, pin: '.stages__pin', start: 'top top', end: function () { return '+=' + window.innerHeight * 2.4; },
        scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var i = self.progress < 0.3 ? 0 : self.progress < 0.72 ? 1 : 2;
          dots.forEach(function (dd, k) { dd.classList.toggle('is-on', k === i); });
        }
      }
    });
    G.from($('.stage__copy', st[0]).children, { y: 50, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: sec, start: 'top 65%', once: true } });
    G.from($('.stage__art', st[0]), { scale: 0.6, rotate: -20, autoAlpha: 0, duration: 1.1, ease: 'back.out(1.5)', scrollTrigger: { trigger: sec, start: 'top 65%', once: true } });
    function morph(i, j, at) {
      tl.to($('.stage__copy', st[i]), { y: -70, autoAlpha: 0, duration: 0.5 }, at)
        .to($('.stage__art', st[i]), { scale: 0.4, rotate: -35, autoAlpha: 0, duration: 0.55 }, at)
        .to(bgs[j], { opacity: 1, duration: 0.7 }, at + 0.05)
        .fromTo($('.stage__copy', st[j]).children, { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.55, ease: 'power3.out' }, at + 0.4)
        .fromTo($('.stage__art', st[j]), { scale: 0.4, rotate: 35, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.4)' }, at + 0.35);
    }
    tl.to({}, { duration: 0.35 });
    morph(0, 1, 0.35);
    tl.to({}, { duration: 0.6 });
    morph(1, 2, 1.95);
    tl.to({}, { duration: 0.35 });
    return function () { sec.classList.remove('is-pinned'); };
  });
  mm.add('(max-width: 899.98px), (max-height: 619.98px)', function () {
    $$('.stage__grid').forEach(function (g) {
      G.from(g, { y: 50, autoAlpha: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: g, start: 'top 88%', once: true } });
      G.from($('.art', g), { scale: 0.6, rotate: -15, duration: 1.1, ease: 'back.out(1.5)', scrollTrigger: { trigger: g, start: 'top 80%', once: true } });
    });
  });

  /* brand cards pile up */
  var cards = $$('.bcard');
  cards.forEach(function (c, i) {
    G.from($('.bcard__visual', c), { y: 60, rotate: 8, autoAlpha: 0, duration: 1, ease: 'back.out(1.4)', scrollTrigger: { trigger: c, start: 'top 75%', once: true } });
    if (i === cards.length - 1) return;
    G.to(c, { scale: 0.92, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 120px', scrub: true } });
  });

  /* numbers */
  $$('[data-count]').forEach(function (n) {
    var end = parseFloat(n.dataset.count), dec = (n.dataset.count.split('.')[1] || '').length, o = { v: 0 };
    var fmt = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    n.textContent = fmt(0);
    G.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: function () { n.textContent = fmt(o.v); }, scrollTrigger: { trigger: n, start: 'top 90%', once: true } });
  });
  $$('.gbar__fill').forEach(function (f, i) {
    G.fromTo(f, { scaleX: 0 }, { scaleX: parseFloat(f.style.getPropertyValue('--w')) || 1, duration: 1.6, delay: i * 0.25, ease: 'power3.out', scrollTrigger: { trigger: '.growth', start: 'top 88%', once: true } });
  });
  [['.area-viz', 'random'], ['.hub-viz', 'start'], ['.team-viz', 'start'], ['.reach-viz', 'random']].forEach(function (v) {
    var svg = $(v[0]); if (!svg) return;
    var dots = $$('.vz', svg);
    G.from(dots, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.5)', stagger: { each: dots.length > 50 ? 0.012 : 0.04, from: v[1] }, scrollTrigger: { trigger: svg, start: 'top 90%', once: true } });
    var lines = $$('.vz-line', svg);
    if (lines.length) G.from(lines, { autoAlpha: 0, duration: 0.6, stagger: 0.03, delay: 0.3, scrollTrigger: { trigger: svg, start: 'top 90%', once: true } });
  });
  G.from('.ring-viz__ticks', { rotate: -120, autoAlpha: 0, svgOrigin: '60 60', duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: '.ring-viz', start: 'top 90%', once: true } });

  /* products: subtle entrance of the shelf */
  G.from('.pcard', { x: 120, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: '.shelf', start: 'top 85%', once: true } });

  /* contact heart draws itself */
  var heart = $('.cta__heart path');
  if (heart) G.fromTo(heart, { strokeDashoffset: 340 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: '.cta', start: 'top 75%', once: true } });

  scheduleBuild();
})();
