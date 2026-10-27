// "Film" — a scroll-scrubbed, procedurally built 3D sanitary pad (illustration).
// Progressive enhancement: only runs when <html> has .film-on (JS + WebGL + motion allowed).
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/three-addons/RoomEnvironment.js';

const html = document.documentElement;
let stopFn = null;
const film = document.querySelector('.film');
const stage = film && film.querySelector('.film__stage');

if (film && stage && html.classList.contains('film-on')) {
  try { init(); } catch (err) { console.warn('[film] falling back to static illustration', err); fallback(); }
}

function fallback() {
  if (stopFn) stopFn();
  html.classList.remove('film-on');
  html.classList.add('film-static');
  document.querySelectorAll('.film .chapter').forEach((c) => { c.style.opacity = ''; c.style.transform = ''; });
  const poster = document.querySelector('.film__poster');
  if (poster) poster.classList.remove('is-hidden');
  const night = document.querySelector('.film__night');
  if (night) night.style.opacity = 0;
  const h = document.querySelector('.hdr'); if (h) h.classList.remove('is-night');
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  window.__film = { state: 'static' };
}

function init() {
  const canvas = stage.querySelector('.film__canvas');
  const poster = stage.querySelector('.film__poster');
  const night = stage.querySelector('.film__night');
  const dim = stage.querySelector('.film__dim');
  const hero = film.querySelector('.film__hero');
  const hdr = document.querySelector('.hdr');
  const chapters = Array.from(film.querySelectorAll('.film__chapters .chapter'));
  const params = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lowPower = coarse || innerWidth < 900;
  const SEG = lowPower ? 72 : 150;
  const BEV = lowPower ? 2 : 5;

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping !== undefined ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  camera.position.set(0, 0, 14);

  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-5, 7, 9); scene.add(key);
  const rim = new THREE.DirectionalLight(0xeadcff, 0.7); rim.position.set(6, -4, 3); scene.add(rim);
  const fill = new THREE.HemisphereLight(0xffffff, 0xe9e4f2, 0.35); scene.add(fill);

  // ---------- helpers ----------
  function outline(a, b, n, waist, seg) {
    const pts = [];
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const back = 1 + 0.12 * (-x / a);
      const w = b * back * (1 - waist * Math.exp(-(x * x) / (a * a * 0.16)));
      const y = w * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      pts.push(new THREE.Vector2(x, y));
    }
    return pts;
  }
  function slab(pts, depth, bt, bs, bseg) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: bseg, curveSegments: 1, steps: 1 });
    g.computeBoundingBox();
    g.translate(0, 0, -g.boundingBox.min.z);
    g.computeBoundingBox();
    return g;
  }
  function planarUV(g) {
    const bb = g.boundingBox, p = g.attributes.position, uv = new Float32Array(p.count * 2);
    const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
    for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - bb.min.x) / w; uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / h; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return { minX: bb.min.x, minY: bb.min.y, w, h };
  }
  function canvasTex(w, h, draw, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  }

  // ---------- geometry ----------
  const A = 3, B = 0.95, N = 2.3, W = 0.21;
  const bodyPts = outline(A, B, N, W, SEG);
  const corePts = outline(A - 0.36, B - 0.3, N, W * 0.9, SEG);
  const topPts = outline(A - 0.17, B - 0.15, N, W, SEG);

  const gBack = slab(bodyPts, 0.03, 0.022, 0.03, 2);
  const gCore = slab(corePts, 0.1, 0.09, 0.11, BEV);
  const gTop = slab(topPts, 0.03, 0.06, 0.08, BEV);
  planarUV(gBack); planarUV(gCore);
  const topMap = planarUV(gTop);

  const tBack = gBack.boundingBox.max.z;
  const tCore = gCore.boundingBox.max.z;
  const coreZ = tBack * 0.55;
  const topZ = coreZ + tCore * 0.62;
  const topThick = gTop.boundingBox.max.z;

  // wing shape (hinge along local x-axis at y = 0)
  const ws = new THREE.Shape();
  ws.moveTo(-1.25, 0);
  ws.bezierCurveTo(-0.95, 0.06, -0.85, 0.5, -0.62, 0.72);
  ws.quadraticCurveTo(-0.5, 0.84, -0.3, 0.85);
  ws.lineTo(0.3, 0.85);
  ws.quadraticCurveTo(0.5, 0.84, 0.62, 0.72);
  ws.bezierCurveTo(0.85, 0.5, 0.95, 0.06, 1.25, 0);
  ws.lineTo(-1.25, 0);
  const gWing = new THREE.ExtrudeGeometry(ws, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.02, bevelSegments: 2, curveSegments: lowPower ? 10 : 20 });
  gWing.computeBoundingBox();

  // ---------- textures ----------
  const noise = canvasTex(256, 256, (x, w, h) => {
    const id = x.createImageData(w, h);
    for (let i = 0; i < id.data.length; i += 4) { const v = 118 + Math.random() * 20; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0);
  }, false);
  noise.wrapS = noise.wrapT = THREE.RepeatWrapping; noise.repeat.set(5, 2);

  const TW = lowPower ? 1024 : 2048, TH = TW / 2;
  const toCanvas = (p, w, h) => [((p.x - topMap.minX) / topMap.w) * w, (1 - (p.y - topMap.minY) / topMap.h) * h];
  const ringPts = outline(A - 0.62, B - 0.45, N, W * 1.05, 120);
  const zonePts = outline(A - 1.35, B - 0.6, 2.0, W * 0.6, 90);
  function pathOf(x, pts, w, h) { x.beginPath(); pts.forEach((p, i) => { const [cx, cy] = toCanvas(p, w, h); i ? x.lineTo(cx, cy) : x.moveTo(cx, cy); }); x.closePath(); }
  function dotField(x, w, h, step, r, colA, colB, clipPts) {
    x.save(); pathOf(x, clipPts, w, h); x.clip();
    for (let yy = 0, row = 0; yy < h + step; yy += step * 0.866, row++) {
      for (let xx = (row % 2) * step / 2; xx < w + step; xx += step) {
        x.fillStyle = (row + Math.round(xx / step)) % 3 ? colA : colB;
        x.beginPath(); x.arc(xx, yy, r, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
  }
  const topTex = canvasTex(TW, TH, (x, w, h) => {
    x.fillStyle = '#fdfcff'; x.fillRect(0, 0, w, h);
    const s = w / 1024;
    dotField(x, w, h, 15 * s, 2.1 * s, 'rgba(140,175,225,.40)', 'rgba(170,140,225,.38)', topPts);
    dotField(x, w, h, 10 * s, 2.4 * s, 'rgba(176,120,226,.55)', 'rgba(229,0,126,.28)', zonePts);
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(229,0,126,.55)'); g.addColorStop(1, 'rgba(107,43,217,.6)');
    x.strokeStyle = g; x.lineWidth = 7 * s; pathOf(x, ringPts, w, h); x.stroke();
  }, true);
  const topBump = canvasTex(TW, TH, (x, w, h) => {
    x.fillStyle = 'rgb(160,160,160)'; x.fillRect(0, 0, w, h);
    const s = w / 1024;
    dotField(x, w, h, 15 * s, 2.6 * s, 'rgb(110,110,110)', 'rgb(110,110,110)', topPts);
    dotField(x, w, h, 10 * s, 2.8 * s, 'rgb(100,100,100)', 'rgb(100,100,100)', zonePts);
    x.strokeStyle = 'rgb(70,70,70)'; x.lineWidth = 9 * s; pathOf(x, ringPts, w, h); x.stroke();
    const id = x.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 18; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    x.putImageData(id, 0, 0);
  }, false);
  const coreTex = canvasTex(512, 8, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#e5007e'); g.addColorStop(0.5, '#b01fb9'); g.addColorStop(1, '#6b2bd9');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, true);
  const corePale = canvasTex(512, 8, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#f6d9ea'); g.addColorStop(1, '#e3d8fb');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, true);

  // ---------- materials ----------
  const Fabric = lowPower ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const fabricOpts = (extra) => Object.assign({ color: 0xffffff, roughness: 0.92, metalness: 0 }, lowPower ? {} : { sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xf1ebff) }, extra);
  const mBack = new Fabric(fabricOpts({ bumpMap: noise, bumpScale: 0.8, color: 0xf7f7fa }));
  const mWing = new Fabric(fabricOpts({ bumpMap: noise, bumpScale: 0.8, color: 0xf9f9fb, side: THREE.DoubleSide }));
  const mTop = new Fabric(fabricOpts({ map: topTex, bumpMap: topBump, bumpScale: 2.2, roughness: 0.82 }));
  const mCore = new THREE.MeshPhysicalMaterial({ map: corePale, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.18, emissive: new THREE.Color(0xffffff), emissiveMap: coreTex, emissiveIntensity: 0 });

  // ---------- assembly ----------
  const root = new THREE.Group(); scene.add(root);
  const pad = new THREE.Group(); root.add(pad);
  const back = new THREE.Mesh(gBack, mBack); pad.add(back);
  const core = new THREE.Mesh(gCore, mCore); core.position.z = coreZ; pad.add(core);
  const topG = new THREE.Group(); topG.position.z = topZ; pad.add(topG);
  const top = new THREE.Mesh(gTop, mTop); topG.add(top);

  const hingeY = B * (1 - W) * 0.84;
  function makeWing(side) {
    const outer = new THREE.Group(); outer.rotation.z = side > 0 ? 0 : Math.PI; outer.position.z = -0.004;
    const pivot = new THREE.Group(); pivot.position.y = hingeY; outer.add(pivot);
    const m = new THREE.Mesh(gWing, mWing); pivot.add(m);
    pad.add(outer);
    return pivot;
  }
  const wings = [makeWing(1), makeWing(-1)];

  // "Quick Absorb" drop + ripples (abstract, illustrative)
  const fx = new THREE.Group(); fx.position.set(-0.35, 0, topThick + 0.012); topG.add(fx);
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0x8b3be0, roughness: 0.12, clearcoat: 1, transmission: 0, transparent: true, opacity: 1 });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16), dropMat); fx.add(drop);
  const ripples = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 96), new THREE.MeshBasicMaterial({ color: 0x7a2fe0, transparent: true, opacity: 0, depthWrite: false }));
    fx.add(m); return m;
  });

  // soft backdrop shadow
  const shTex = canvasTex(256, 128, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(40,30,60,.55)'); g.addColorStop(0.5, 'rgba(40,30,60,.18)'); g.addColorStop(1, 'rgba(40,30,60,0)');
    x.fillStyle = g; x.save(); x.scale(1, h / w); x.fillRect(0, 0, w, w); x.restore();
  }, true);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.55 }));
  shadow.position.z = -2.4; scene.add(shadow);

  // ---------- keyframes ----------
  // x/y position, rotations, scale, wing (0 folded → 1 open), lift (layers apart), glow (core), ripple
  const KF_D = [
    { x: 0, y: -2.5, rx: -1.08, ry: 0, rz: 0.16, s: 0.8, wing: 0, lift: 0, glow: 0, ripple: 0 },
    { x: 2.3, y: -0.1, rx: -1.4, ry: 0.06, rz: 0, s: 0.98, wing: 0, lift: 0, glow: 0, ripple: 0 },
    { x: -2.45, y: 0, rx: -0.5, ry: 0, rz: -0.14, s: 0.98, wing: 1, lift: 0, glow: 0, ripple: 0 },
    { x: 2.25, y: 0.1, rx: -1.0, ry: -0.1, rz: 0.48, s: 1.04, wing: 1, lift: 1, glow: 1, ripple: 0 },
    { x: -2.55, y: 0, rx: -0.22, ry: 0, rz: -0.05, s: 0.98, wing: 1, lift: 0, glow: 0, ripple: 1 },
    { x: 0, y: 0.95, rx: -0.9, ry: 0, rz: 0.24, s: 0.98, wing: 1, lift: 0, glow: 0, ripple: 0 },
  ];
  const KF_M = KF_D.map((k, i) => Object.assign({}, k, { x: 0, y: i === 0 ? 0.55 : 0, s: k.s * 1.08 }));
  const keys = Object.keys(KF_D[0]);
  const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const ease = (u) => { const t = Math.min(1, Math.max(0, (u - 0.1) / 0.8)); return t * t * t * (t * (t * 6 - 15) + 10); };
  const cur = {};
  function sample(f, KF) {
    const k = Math.max(0, Math.min(KF.length - 2, Math.floor(f)));
    const e = ease(f - k);
    const a = KF[k], b = KF[k + 1];
    for (const n of keys) cur[n] = a[n] + (b[n] - a[n]) * e;
    if (f <= 0) for (const n of keys) cur[n] = KF[0][n];
    return cur;
  }

  // ---------- layout / scroll mapping ----------
  let vw = 0, vh = 0, mobile = false, anchors = [0, 1, 2, 3, 4, 5];
  const absTop = (el) => el.getBoundingClientRect().top + window.scrollY;
  function measure() {
    vw = innerWidth; vh = innerHeight; mobile = vw < 900;
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const need = mobile ? 7.3 : 13.2;
    camera.position.z = Math.max(mobile ? 12 : 13.8, need / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect));
    camera.updateProjectionMatrix();
    const heroBottom = absTop(hero) + hero.offsetHeight;
    if (!mobile) {
      anchors = [absTop(film)].concat(chapters.map(absTop));
    } else {
      const sTop = heroBottom; // where the sticky stage begins
      const band = stage.offsetHeight;
      anchors = [sTop - vh * 0.35].concat(chapters.map((c) => absTop(c) - band + c.offsetHeight * 0.3));
    }
    for (let i = 1; i < anchors.length; i++) if (anchors[i] <= anchors[i - 1]) anchors[i] = anchors[i - 1] + 1;
  }
  function scrollToF(y) {
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    }
    return anchors.length - 1;
  }

  // ---------- overlay: dimension line ----------
  const dimLines = dim.querySelectorAll('line');
  const dimText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  dimText.textContent = 'Length';
  dimText.setAttribute('text-anchor', 'middle');
  dimText.setAttribute('style', 'font: 500 11px "Geist Mono", monospace; letter-spacing: .06em; text-transform: uppercase; fill: #6e6e73');
  dim.appendChild(dimText);
  const v3 = new THREE.Vector3();
  function project(x, y, z) {
    v3.set(x, y, z); pad.localToWorld(v3); v3.project(camera);
    return [(v3.x * 0.5 + 0.5) * stage.clientWidth, (-v3.y * 0.5 + 0.5) * stage.clientHeight];
  }
  function setLine(l, x1, y1, x2, y2) { l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); }

  // ---------- visibility ----------
  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(film);

  // ---------- loop ----------
  let fSm = null, raf = 0, last = performance.now(), t0 = last, frames = 0, perfStart = 0, rendered = false, introStart = 0;
  const checkFps = (coarse || innerWidth < 900) && !params.has('keep3d');
  measure();
  addEventListener('resize', () => { measure(); }, { passive: true });
  if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('load', measure);

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!visible || document.hidden) { if (hdr) hdr.classList.remove('is-night'); return; }
    const y = window.scrollY;
    const fT = scrollToF(y);
    if (fSm === null) fSm = fT;
    fSm += (fT - fSm) * Math.min(1, dt * 7);
    const f = Math.abs(fT - fSm) < 0.0005 ? fT : fSm;
    const t = (now - t0) / 1000;
    if (!introStart) introStart = now;
    const intro = smooth(0, 1, (now - introStart) / 1700);

    const s = sample(f, mobile ? KF_M : KF_D);
    const idle = 1 - Math.min(1, Math.abs(f - Math.round(f)) * 3) * 0.5;
    root.position.set(s.x, s.y + Math.sin(t * 0.9) * 0.05 * idle - (1 - intro) * 3.2, 0);
    root.rotation.set(s.rx + (1 - intro) * 0.5, s.ry + Math.sin(t * 0.6) * 0.03 * idle, s.rz + Math.sin(t * 0.45) * 0.025 * idle - (1 - intro) * 0.4);
    const sc = s.s * (mobile ? 1 : 1);
    root.scale.setScalar(sc);

    const fold = -2.95 * (1 - s.wing);
    wings[0].rotation.x = fold; wings[1].rotation.x = fold;
    topG.position.z = topZ + s.lift * 1.05;
    topG.rotation.x = s.lift * 0.06;
    core.position.z = coreZ + s.lift * 0.42;
    const glowing = s.glow > 0.12;
    if ((mCore.map === coreTex) !== glowing) mCore.map = glowing ? coreTex : corePale;
    mCore.emissiveIntensity = s.glow * (0.32 + Math.sin(t * 2.2) * 0.06);

    // drop + ripples
    const rOn = s.ripple;
    fx.visible = rOn > 0.02;
    if (fx.visible) {
      const P = 2.6, ph = (t % P) / P;
      const fall = Math.min(1, ph / 0.32);
      drop.position.z = 1.8 * (1 - fall * fall);
      drop.scale.setScalar(fall < 1 ? 1 : 0.001);
      dropMat.opacity = rOn;
      ripples.forEach((r, i) => {
        const q = (ph - 0.32 - i * 0.12) / 0.6;
        const on = q > 0 && q < 1;
        r.scale.setScalar(on ? 0.6 + q * 4.2 : 0.001);
        r.material.opacity = on ? (1 - q) * 0.7 * rOn : 0;
      });
    }

    // shadow
    shadow.position.set(s.x * 0.92, s.y - 1.25 - (1 - intro) * 2, -2.4);
    const spread = 0.55 + Math.abs(Math.cos(s.rz)) * 0.45;
    shadow.scale.set(7.6 * s.s * spread, 1.5 * s.s, 1);

    // overlays
    const nightO = 1 - smooth(0.32, 0.8, Math.abs(f - 3));
    night.style.opacity = nightO.toFixed(3);
    if (hdr) hdr.classList.toggle('is-night', nightO > 0.55);
    shadow.material.opacity = 0.55 * (1 - nightO);

    const dimO = (1 - smooth(0.12, 0.42, Math.abs(f - 1))) * intro;
    dim.style.opacity = dimO.toFixed(3);
    if (dimO > 0.01) {
      const zz = -0.8;
      const [x1, y1] = project(-A - 0.03, 0, zz), [x2, y2] = project(A + 0.03, 0, zz);
      const yy = Math.max(y1, y2);
      setLine(dimLines[0], x1, yy, x2, yy);
      setLine(dimLines[1], x1, yy - 7, x1, yy + 7);
      setLine(dimLines[2], x2, yy - 7, x2, yy + 7);
      dimText.setAttribute('x', (x1 + x2) / 2); dimText.setAttribute('y', yy + 22);
    }

    // chapter text choreography
    if (!mobile) {
      const hd = y / vh;
      hero.style.opacity = (1 - smooth(0.2, 0.62, hd)).toFixed(3);
      hero.style.transform = `translate3d(0, ${(-hd * 90).toFixed(1)}px, 0) scale(${(1 - Math.min(hd, 1) * 0.05).toFixed(4)})`;
      for (const c of chapters) {
        const r = c.getBoundingClientRect();
        const d = (r.top + r.height / 2 - vh / 2) / vh;
        const isLast = c === chapters[chapters.length - 1];
        const o = isLast && d < 0 ? 1 : 1 - smooth(0.36, 0.6, Math.abs(d));
        c.style.opacity = o.toFixed(3);
        c.style.transform = `translate3d(0, ${(d * -60).toFixed(1)}px, 0)`;
      }
    } else {
      hero.style.opacity = ''; hero.style.transform = '';
      const sb = stage.getBoundingClientRect().bottom;
      for (const c of chapters) {
        const r = c.getBoundingClientRect();
        const p = (sb + vh * 0.32 - r.top) / r.height;
        const o = smooth(0.02, 0.28, p) * (1 - smooth(0.78, 0.96, p));
        c.style.opacity = o.toFixed(3);
        c.style.transform = '';
      }
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    if (!rendered) { rendered = true; poster.classList.add('is-hidden'); window.__film = { state: 'running' }; }

    // performance watchdog (mobile / coarse pointers only)
    if (checkFps) {
      frames++;
      if (frames === 40) perfStart = now;
      if (frames === 160) {
        const fps = 120 / ((now - perfStart) / 1000);
        window.__film.fps = fps;
        if (fps < 28) { fallback(); }
      }
    }
  }
  raf = requestAnimationFrame(frame);
  stopFn = () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
    [gBack, gCore, gTop, gWing].forEach((g) => g.dispose());
    [topTex, topBump, coreTex, corePale, noise, shTex].forEach((t) => t.dispose());
    canvas.style.display = 'none';
  };
  window.__film = { state: 'starting' };
  window.__filmFallback = fallback;
}
