/* Cloud field — soft volumetric cloud puffs drawn on canvas 2D.
   Each cloud is a cluster of pre-rendered radial "puff" sprites (white body + periwinkle underbelly).
   Every puff has its own spring offset, so the cursor gently parts the clouds around it. */
(function () {
  'use strict';

  function sprite(size, stops) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }

  var SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = {
      white: sprite(256, [[0, 'rgba(255,255,255,1)'], [0.55, 'rgba(255,255,255,0.97)'], [0.74, 'rgba(253,254,255,0.62)'], [0.88, 'rgba(250,252,255,0.18)'], [1, 'rgba(255,255,255,0)']]),
      shade: sprite(256, [[0, 'rgba(146,156,222,0.62)'], [0.5, 'rgba(160,170,230,0.4)'], [0.78, 'rgba(178,188,238,0.12)'], [1, 'rgba(190,200,242,0)']]),
      blush: sprite(256, [[0, 'rgba(255,196,210,0.42)'], [0.55, 'rgba(255,206,218,0.2)'], [1, 'rgba(255,214,224,0)']])
    };
    return SPR;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeCloud(w, h) {
    var puffs = [], n = 8 + Math.floor(Math.random() * 4), k, t, dome, r;
    for (k = 0; k < n; k++) {
      t = (k + 0.5) / n;
      dome = Math.sin(Math.PI * t);
      r = w * (0.09 + 0.12 * dome) * rand(0.85, 1.15);
      puffs.push({ x: (t - 0.5) * w * 0.92 + rand(-8, 8), y: -dome * h * 0.5 + r * 0.3, r: r });
    }
    for (k = 0; k < 3 + Math.floor(Math.random() * 3); k++) {
      r = w * rand(0.11, 0.18);
      puffs.push({ x: rand(-0.26, 0.26) * w, y: -h * rand(0.55, 0.95) + r * 0.3, r: r });
    }
    puffs.forEach(function (p) { p.ox = 0; p.oy = 0; p.vx = 0; p.vy = 0; });
    return puffs;
  }

  function CloudField(canvas, opts) {
    opts = opts || {};
    var mode = opts.mode || 'sky';
    var ctx = canvas.getContext('2d');
    var S = sprites();
    var W = 0, H = 0, dpr = 1, clouds = [], bank = [], bankShift = 0;
    var mx = -9999, my = -9999, pmx = -1, pmy = 0, tx = 0, ty = 0, hasPointer = false;
    var running = false, raf = 0, last = 0, born = performance.now(), scrollY = 0;
    var fade = opts.fade === false ? 1 : 0;
    var bottomColor = opts.bottom || '#f7f8fd';

    function build() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (pmx < 0) { pmx = tx = W / 2; pmy = ty = H / 2; }
      var small = W < 700, scale = Math.min(1.25, Math.max(0.55, W / 1440));
      if (mode === 'sky') {
        clouds = [];
        var count = small ? 6 : 10;
        for (var i = 0; i < count; i++) {
          var depth = 0.3 + 0.7 * (i / (count - 1)) * rand(0.8, 1);
          var cw = (small ? 230 : 440) * (0.55 + depth * 0.75);
          var band = i % 2 ? rand(0.04, 0.3) : rand(0.25, 0.62);
          clouds.push({
            x: rand(-cw * 0.3, W + cw * 0.3), y: H * band + cw * 0.18, w: cw,
            depth: depth, speed: (5 + 12 * depth) * (small ? 0.7 : 1),
            alpha: 0.45 + 0.55 * depth, blush: Math.random() < 0.25,
            puffs: makeCloud(cw, cw * 0.42)
          });
        }
        clouds.sort(function (a, b) { return a.depth - b.depth; });
      } else {
        bank = [];
        var n = Math.ceil(W / (small ? 46 : 64)) + 6, span = W * 1.3;
        for (var j = 0; j < n; j++) {
          var r = rand(70, 150) * scale * (small ? 1.25 : 1);
          bank.push({ bx: (j / n) * span - W * 0.15, y: H - r * rand(0.25, 0.75), r: r, ox: 0, oy: 0, vx: 0, vy: 0, row: 0 });
        }
        for (j = 0; j < Math.ceil(n * 0.6); j++) {
          var r2 = rand(90, 190) * scale * (small ? 1.2 : 1);
          bank.push({ bx: rand(0, span) - W * 0.15, y: H + r2 * rand(0.05, 0.35), r: r2, ox: 0, oy: 0, vx: 0, vy: 0, row: 1 });
        }
      }
    }

    function physics(p, px, py, dt) {
      var R = Math.max(120, Math.min(220, W * 0.13));
      if (hasPointer) {
        var dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          var d = Math.sqrt(d2) || 1, f = Math.pow(1 - d / R, 2) * 3.4;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f * 0.8;
        }
      }
      p.vx += -p.ox * 0.022; p.vy += -p.oy * 0.022;
      p.vx *= 0.9; p.vy *= 0.9;
      p.ox += p.vx * dt * 60; p.oy += p.vy * dt * 60;
    }

    function drawSky(dt, now) {
      var t = now / 1000;
      for (var i = 0; i < clouds.length; i++) {
        var c = clouds[i];
        c.x += c.speed * dt;
        if (c.x - c.w * 0.7 > W) c.x = -c.w * 0.7;
        var parX = (pmx - W / 2) * -0.018 * c.depth, parY = (pmy - H / 2) * -0.012 * c.depth - scrollY * 0.18 * c.depth;
        var bob = Math.sin(t * 0.35 + i) * 4 * c.depth;
        var cx = c.x + parX, cy = c.y + parY + bob;
        ctx.globalAlpha = c.alpha * fade;
        var k, p, px, py;
        for (k = 0; k < c.puffs.length; k++) {
          p = c.puffs[k];
          px = cx + p.x + p.ox; py = cy + p.y + p.oy;
          physics(p, px, py, dt);
          ctx.drawImage(c.blush && k % 3 === 0 ? S.blush : S.shade, px - p.r * 1.02, py - p.r + p.r * 0.4, p.r * 2.04, p.r * 2.04);
        }
        for (k = 0; k < c.puffs.length; k++) {
          p = c.puffs[k];
          px = cx + p.x + p.ox; py = cy + p.y + p.oy;
          ctx.drawImage(S.white, px - p.r, py - p.r, p.r * 2, p.r * 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawBank(dt, now) {
      var t = now / 1000, span = W * 1.3;
      bankShift = (bankShift + dt * 9) % span;
      var parX = (pmx - W / 2) * -0.03;
      ctx.globalAlpha = fade;
      var i, p, x, y;
      for (var pass = 0; pass < 2; pass++) {
        for (i = 0; i < bank.length; i++) {
          p = bank[i];
          x = ((p.bx + bankShift + W * 0.15) % span) - W * 0.15 + parX * (p.row ? 1.4 : 1);
          y = p.y + Math.sin(t * 0.5 + i * 0.7) * 3 - scrollY * 0.06 * (p.row ? 1.6 : 1);
          if (pass === 0) {
            physics(p, x + p.ox, y + p.oy, dt);
            ctx.drawImage(S.shade, x + p.ox - p.r * 1.02, y + p.oy - p.r + p.r * 0.36, p.r * 2.04, p.r * 2.04);
          } else {
            ctx.drawImage(S.white, x + p.ox - p.r, y + p.oy - p.r, p.r * 2, p.r * 2);
          }
        }
      }
      ctx.globalAlpha = 1;
      var g = ctx.createLinearGradient(0, H * 0.72, 0, H);
      g.addColorStop(0, 'rgba(247,248,253,0)');
      g.addColorStop(1, bottomColor);
      ctx.fillStyle = g;
      ctx.fillRect(0, H * 0.72, W, H * 0.28 + 1);
    }

    function frame(now) {
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (fade < 1) fade = Math.min(1, (now - born) / 1600);
      pmx += (tx - pmx) * 0.05; pmy += (ty - pmy) * 0.05;
      ctx.clearRect(0, 0, W, H);
      if (mode === 'sky') drawSky(dt, now); else drawBank(dt, now);
      if (running) raf = requestAnimationFrame(frame);
    }

    build();
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { build(); if (!running) frame(performance.now()); }) : null;
    if (ro) ro.observe(canvas);

    return {
      start: function () { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      still: function () { fade = 1; frame(performance.now()); },
      pointer: function (x, y) { mx = x; my = y; hasPointer = true; },
      parallax: function (x, y) { tx = x; ty = y; },
      leave: function () { hasPointer = false; },
      scroll: function (y) { scrollY = y; },
      size: function () { return { w: W, h: H }; }
    };
  }

  window.CloudField = CloudField;
})();
