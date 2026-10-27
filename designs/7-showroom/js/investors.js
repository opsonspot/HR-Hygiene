/* Investors page: menu, section spy, document filter */
(function () {
  'use strict';
  var d = document, w = window;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  $$('.year').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  var burger = $('.burger'), nav = $('#nav');
  function setNav(open, noFocus) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    d.body.classList.toggle('menu-open', open);
    if (open) { var f = $('a', nav); if (f) f.focus(); } else if (!noFocus) burger.focus();
  }
  burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a') && nav.classList.contains('is-open')) setNav(false, true); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false); });

  // section spy
  var links = $$('.lib__nav a');
  if ('IntersectionObserver' in w) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-30% 0px -65% 0px' });
    $$('.grp').forEach(function (g) { spy.observe(g); });
  }

  // filter
  var q = $('#q'), n = $('.search__n b'), empty = $('.lib__empty');
  var docs = $$('.lib__main a[href$=".pdf"]');
  var total = docs.length; n.textContent = total;
  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase(), shown = 0;
    docs.forEach(function (a) {
      var hit = !v || a.textContent.toLowerCase().indexOf(v) > -1;
      var item = a.closest('li') || a; item.hidden = !hit; if (hit) shown++;
    });
    $$('.docs').forEach(function (ul) {
      var any = $$('li', ul).some(function (li) { return !li.hidden; }); ul.hidden = !any;
      var h = ul.previousElementSibling; if (h && h.tagName === 'H3') h.hidden = !any;
    });
    $$('.grp').forEach(function (g) { g.hidden = !$$('a[href$=".pdf"]', g).some(function (a) { return !(a.closest('li') || a).hidden; }); });
    n.textContent = shown; empty.hidden = shown > 0;
  });
})();
