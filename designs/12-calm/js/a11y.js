/* Calm · Accessibility panel
   Settings live on <html> as data-* attributes (applied before first paint by the inline head script)
   and persist in localStorage under "calm-a11y". */
(function () {
  'use strict';
  var KEY = 'calm-a11y';
  var root = document.documentElement;
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q); } : function () { return { matches: false, addEventListener: function () {} }; };
  var LEXEND = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400..600&display=swap';

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  var state = load();

  var TEXT = ['100%', '112%', '125%', '140%'];
  var CONTRAST = ['Default', 'High', 'Higher', 'Highest'];
  var THEMES = { light: 'Light', dark: 'Dark', sepia: 'Sepia' };

  function sysTheme() { return mm('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  function sysMotion() { return mm('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full'; }

  function ensureLexend() {
    if (document.getElementById('font-dyslexia')) return;
    var l = document.createElement('link');
    l.id = 'font-dyslexia'; l.rel = 'stylesheet'; l.href = LEXEND;
    document.head.appendChild(l);
  }

  function apply() {
    root.setAttribute('data-theme', state.theme || sysTheme());
    root.setAttribute('data-contrast', String(state.contrast || 0));
    root.setAttribute('data-text', String(state.text || 0));
    var motion = state.motion || sysMotion();
    var prevMotion = root.getAttribute('data-motion');
    root.setAttribute('data-motion', motion);
    if (state.focus) root.setAttribute('data-focus', 'strong'); else root.removeAttribute('data-focus');
    if (state.underline) root.setAttribute('data-underline', 'on'); else root.removeAttribute('data-underline');
    if (state.dyslexia) { ensureLexend(); root.setAttribute('data-dyslexia', 'on'); } else root.removeAttribute('data-dyslexia');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#f4f2ec');
    if (prevMotion !== motion) document.dispatchEvent(new CustomEvent('calm:motion', { detail: motion }));
    document.dispatchEvent(new CustomEvent('calm:a11y'));
    sync();
  }

  // live-follow OS preferences while the visitor hasn't chosen explicitly
  try {
    mm('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!state.theme) apply(); });
    mm('(prefers-reduced-motion: reduce)').addEventListener('change', function () { if (!state.motion) apply(); });
  } catch (e) {}

  /* ---------- Panel markup ---------- */
  var ICON = {
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    sepia: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 14a6 6 0 0 1 12 0"/><path d="M12 4v2.5M4.9 7.4l1.6 1.4M19.1 7.4l-1.6 1.4"/></svg>'
  };
  function sw(id, label, hint) {
    return '<button type="button" class="switch" role="switch" aria-checked="false" data-sw="' + id + '"' + (hint ? ' aria-describedby="sw-' + id + '-h"' : '') + '>' +
      '<span>' + label + (hint ? '<small id="sw-' + id + '-h">' + hint + '</small>' : '') + '</span><span class="switch__track" aria-hidden="true"></span></button>';
  }
  var html =
    '<div class="a11y__in">' +
      '<div class="a11y__head"><h2 class="a11y__t" id="a11y-title">Accessibility</h2>' +
      '<button class="x" type="button" data-a11y-close aria-label="Close accessibility settings"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +

      '<div class="a11y__grp" role="group" aria-labelledby="a11y-text-l"><p class="a11y__lbl" id="a11y-text-l">Text size <span data-out="text"></span></p><div class="seg-btns">' +
        TEXT.map(function (t, i) { return '<button type="button" class="sbtn" data-set="text" data-val="' + i + '" aria-pressed="false" aria-label="Text size ' + t + '"><span class="sbtn__a" style="font-size:' + (0.9 + i * 0.32) + 'rem" aria-hidden="true">A</span></button>'; }).join('') +
      '</div></div>' +

      '<div class="a11y__grp" role="group" aria-labelledby="a11y-con-l"><p class="a11y__lbl" id="a11y-con-l">Contrast</p><div class="seg-btns">' +
        CONTRAST.map(function (t, i) { return '<button type="button" class="sbtn" data-set="contrast" data-val="' + i + '" aria-pressed="false"><span class="sbtn__aa" aria-hidden="true" style="font-weight:' + (500 + i * 100) + '">Aa</span>' + t + '</button>'; }).join('') +
      '</div></div>' +

      '<div class="a11y__grp" role="group" aria-labelledby="a11y-mode-l"><p class="a11y__lbl" id="a11y-mode-l">Colour mode</p><div class="seg-btns seg-btns--3">' +
        Object.keys(THEMES).map(function (k) { return '<button type="button" class="sbtn" data-set="theme" data-val="' + k + '" aria-pressed="false">' + ICON[k === 'light' ? 'sun' : k === 'dark' ? 'moon' : 'sepia'] + THEMES[k] + '</button>'; }).join('') +
      '</div></div>' +

      '<div class="a11y__switches">' +
        sw('motion', 'Reduce motion', 'Stops animation and smooth scrolling.') +
        sw('focus', 'Focus outlines', 'Extra-strong outline on the focused item.') +
        sw('underline', 'Underline links', '') +
        sw('dyslexia', 'Dyslexia-friendly font', 'Lexend with wider letter and word spacing. Loads only when switched on.') +
      '</div>' +

      '<div class="a11y__kbd"><b>Keyboard navigation <span>Always on</span></b>' +
        'Press <kbd>Tab</kbd> to move forward, <kbd>Shift</kbd> + <kbd>Tab</kbd> to go back, <kbd>Enter</kbd> or <kbd>Space</kbd> to activate and <kbd>Esc</kbd> to close panels. The first <kbd>Tab</kbd> on each page offers &ldquo;Skip to content&rdquo;.</div>' +

      '<div class="a11y__foot"><button type="button" class="a11y__reset" data-a11y-reset>Reset settings</button><p class="a11y__saved" data-saved>Saved on this device</p></div>' +
      '<p class="sr-only" aria-live="polite" data-live></p>' +
    '</div>';

  var dlg = document.createElement('dialog');
  dlg.id = 'a11y';
  dlg.className = 'a11y';
  dlg.setAttribute('aria-labelledby', 'a11y-title');
  dlg.innerHTML = html;
  document.body.appendChild(dlg);

  var live = dlg.querySelector('[data-live]');
  function say(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

  function sync() {
    var cur = {
      text: String(state.text || 0),
      contrast: String(state.contrast || 0),
      theme: root.getAttribute('data-theme')
    };
    dlg.querySelectorAll('[data-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(cur[b.dataset.set] === b.dataset.val));
    });
    var on = {
      motion: root.getAttribute('data-motion') === 'reduce',
      focus: !!state.focus, underline: !!state.underline, dyslexia: !!state.dyslexia
    };
    dlg.querySelectorAll('[data-sw]').forEach(function (b) { b.setAttribute('aria-checked', String(on[b.dataset.sw])); });
    var out = dlg.querySelector('[data-out="text"]');
    if (out) out.textContent = TEXT[+cur.text];
  }

  function set(key, val, msg) {
    state[key] = val;
    var ok = save(state);
    var savedNote = dlg.querySelector('[data-saved]');
    if (savedNote) savedNote.textContent = ok ? 'Saved on this device' : 'Applied for this visit';
    apply();
    if (msg) say(msg);
  }

  dlg.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set]');
    if (b) {
      var k = b.dataset.set, v = b.dataset.val;
      if (k === 'text') set('text', +v, 'Text size ' + TEXT[+v]);
      if (k === 'contrast') set('contrast', +v, 'Contrast ' + CONTRAST[+v]);
      if (k === 'theme') set('theme', v, THEMES[v] + ' colour mode');
      return;
    }
    var s = e.target.closest('[data-sw]');
    if (s) {
      var id = s.dataset.sw, now = s.getAttribute('aria-checked') !== 'true';
      if (id === 'motion') set('motion', now ? 'reduce' : 'full', now ? 'Motion reduced' : 'Motion on');
      else set(id, now, s.querySelector('span').firstChild.textContent + (now ? ' on' : ' off'));
      return;
    }
    if (e.target.closest('[data-a11y-reset]')) {
      state = {};
      try { localStorage.removeItem(KEY); } catch (err) {}
      apply();
      say('All accessibility settings reset');
      return;
    }
    if (e.target.closest('[data-a11y-close]')) { close(); return; }
    // click on the backdrop (outside the panel box)
    if (e.target === dlg) {
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    }
  });

  /* ---------- Open / close with focus management ---------- */
  var opener = null;
  function open(btn) {
    opener = btn || document.activeElement;
    sync();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    document.querySelectorAll('[data-a11y-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var first = dlg.querySelector('[aria-pressed="true"]') || dlg.querySelector('button');
    if (first) first.focus();
    document.dispatchEvent(new CustomEvent('calm:dialog', { detail: true }));
  }
  function close() {
    if (dlg.close && dlg.open) dlg.close(); else dlg.removeAttribute('open');
  }
  dlg.addEventListener('close', function () {
    document.querySelectorAll('[data-a11y-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (opener && opener.focus) opener.focus();
    document.dispatchEvent(new CustomEvent('calm:dialog', { detail: false }));
  });
  // explicit focus trap (in addition to the native modal behaviour) + Esc
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(dlg.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  document.querySelectorAll('[data-a11y-open]').forEach(function (b) {
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', function () { open(b); });
  });

  // Public hook for tests / other scripts
  window.CalmA11y = { open: open, close: close, get: function () { return JSON.parse(JSON.stringify(state)); }, set: function (k, v) { set(k, v); } };
  apply();
})();
