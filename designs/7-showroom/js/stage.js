/* H R Hygiene — Showroom: WebGL stage (hero brand display + stylised factory fly-through)
   One renderer, one canvas: the canvas moves between the hero host and the infrastructure host. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/three-addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/three-addons/RoomEnvironment.js';

const HR = window.HR || (window.HR = {});
const root = document.documentElement;
const report = (ok) => {
  if (ok) { HR.stageReady ? HR.stageReady() : (HR._pendingReady = true); }
  else { HR.stageFailed ? HR.stageFailed() : (HR._pendingFail = true); }
};

if (root.classList.contains('gl')) {
  try { init(); } catch (e) { report(false); }
}

function init() {
  const heroHost = document.getElementById('heroStage');
  const infraHost = document.getElementById('infraStage');
  if (!heroHost) return;

  const mqMobile = window.matchMedia('(max-width: 899px)');
  const flyMode = () => root.classList.contains('fly');
  let lowPower = false;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); report(false); }, false);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const dprCap = () => (lowPower ? 1 : (mqMobile.matches ? 1.5 : 2));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  function radialTex(stops, size = 256) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const fontsReady = () => Promise.race([
    (document.fonts ? Promise.all([document.fonts.load('600 46px Syne'), document.fonts.load('600 22px "Instrument Sans"')]) : Promise.resolve()),
    new Promise((r) => setTimeout(r, 1800))
  ]).catch(() => {});

  const shadowTex = radialTex([[0, 'rgba(0,0,0,0.85)'], [0.45, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);
  const poolTex = radialTex([[0, 'rgba(255,226,180,0.9)'], [0.35, 'rgba(255,210,150,0.35)'], [1, 'rgba(255,200,140,0)']]);
  const floorAlpha = radialTex([[0, '#ffffff'], [0.5, '#ffffff'], [1, '#000000']], 512);
  const dotTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']], 64);
  const beamAlpha = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#000'); gr.addColorStop(0.12, '#bbb'); gr.addColorStop(0.55, '#666'); gr.addColorStop(1, '#2a2a2a');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); return new THREE.CanvasTexture(c);
  })();

  /* =====================================================
     HERO — four brand blocks on plinths
     ===================================================== */
  const BRANDS = [
    { name: 'Femiss', seg: 'Female care', base: '#2bb2e6', light: '#7ad8fb', deep: '#1279ab', accent: '#ffffff', ring: '#38bff0', logo: 'img/brand-femiss.png' },
    { name: 'Womanica', seg: 'Premium care', base: '#6b2582', light: '#a2449f', deep: '#3d0f4c', accent: '#e0559f', ring: '#d0459b', logo: 'img/brand-womanica.png' },
    { name: 'ElderFit', seg: 'Adult care', base: '#21417f', light: '#3f69b5', deep: '#0f2246', accent: '#9fb8ec', ring: '#6f93ea', logo: 'img/brand-elderfit.png' },
    { name: 'Bloom Baby', seg: 'Baby care', base: '#46a86d', light: '#7fd29d', deep: '#24774a', accent: '#f6ad84', ring: '#62c78b', logo: 'img/brand-bloombaby.png' }
  ];

  const hero = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(30, 1, 0.1, 80), units: [] };
  const hs = hero.scene;
  hs.environment = envTex;
  hs.environmentIntensity = 0.55;

  hs.add(new THREE.HemisphereLight(0xfff1dc, 0x0d0d10, 0.35));
  const key = new THREE.SpotLight(0xffe4c2, 0, 0, 0.62, 0.95, 0);
  key.position.set(1.5, 9, 6); key.target.position.set(0, 0.8, 0); hs.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xaec6ff, 1.1); rim.position.set(-5, 4, -6); hs.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(6, 2, 7); hs.add(fill);
  const hot = new THREE.SpotLight(0xfff0dc, 0, 0, 0.3, 0.7, 0);
  hot.position.set(0, 7, 2.5); hs.add(hot, hot.target);

  // floor with radial fade + soft reflection (mirrored clones under a translucent floor)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 96), new THREE.MeshStandardMaterial({
    color: 0x141416, roughness: 0.42, metalness: 0.0, transparent: true, opacity: 0.84, alphaMap: floorAlpha, depthWrite: false
  }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1; hs.add(floor);
  const mirrorRoot = new THREE.Group(); mirrorRoot.scale.y = -1; hs.add(mirrorRoot);

  const blockGeo = new RoundedBoxGeometry(1, 1.38, 0.6, 5, 0.065);
  const plinthGeo = new THREE.CylinderGeometry(0.6, 0.64, 1, 72, 1);
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2f, roughness: 0.38, metalness: 0.35 });
  const ringGeo = new THREE.TorusGeometry(0.6, 0.008, 8, 128);
  const beamGeo = new THREE.ConeGeometry(0.95, 6.4, 48, 1, true);
  const shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2);
  const PLINTH_H = [0.62, 0.86, 0.74, 0.52];

  function faceCanvas(b, logo) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 704;
    const g = c.getContext('2d');
    let gr = g.createLinearGradient(0, 0, 0, 704);
    gr.addColorStop(0, b.light); gr.addColorStop(0.5, b.base); gr.addColorStop(1, b.deep);
    g.fillStyle = gr; g.fillRect(0, 0, 512, 704);
    gr = g.createLinearGradient(0, 0, 512, 704);
    gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 704);
    // fine concentric guide lines (display card feel)
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2;
    for (let r = 120; r < 700; r += 46) { g.beginPath(); g.arc(256, 760, r, Math.PI, 2 * Math.PI); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'center';
    g.font = '600 21px "Instrument Sans", system-ui, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '6px';
    g.fillText(b.seg.toUpperCase(), 256, 98);
    // white plate carrying the logo
    g.save(); g.shadowColor = 'rgba(0,0,0,0.28)'; g.shadowBlur = 34; g.shadowOffsetY = 12;
    roundRect(g, 58, 150, 396, 330, 28); g.fillStyle = '#ffffff'; g.fill(); g.restore();
    if (logo) {
      const pw = 396 - 80, ph = 330 - 80, s = Math.min(pw / logo.width, ph / logo.height);
      const lw = logo.width * s, lh = logo.height * s;
      g.drawImage(logo, 256 - lw / 2, 150 + 165 - lh / 2, lw, lh);
    }
    if ('letterSpacing' in g) g.letterSpacing = '-1px';
    g.fillStyle = '#ffffff'; g.font = '600 50px Syne, "Instrument Sans", sans-serif';
    g.fillText(b.name, 256, 572);
    g.fillStyle = b.accent; g.fillRect(226, 600, 60, 4);
    if ('letterSpacing' in g) g.letterSpacing = '4px';
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '500 15px "Instrument Sans", system-ui, sans-serif';
    g.fillText('H R HYGIENE PRODUCTS LTD.', 256, 648);
    return c;
  }

  BRANDS.forEach((b, i) => {
    const group = new THREE.Group();
    const ph = PLINTH_H[i];
    const plinth = new THREE.Mesh(plinthGeo, plinthMat); plinth.scale.y = ph; plinth.position.y = ph / 2;
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: b.ring, toneMapped: false, transparent: true, opacity: 0.55 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = ph + 0.003;
    const topShadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.75 }));
    topShadow.scale.set(1.25, 1, 0.85); topShadow.position.y = ph + 0.004;
    const side = new THREE.MeshPhysicalMaterial({ color: b.base, roughness: 0.34, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.16 });
    const back = side;
    const faceTex = new THREE.CanvasTexture(faceCanvas(b, null)); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = maxAniso;
    const front = new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: 0.42, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    const block = new THREE.Mesh(blockGeo, [side, side, side, side, front, back]);
    block.userData.index = i; plinth.userData.index = i;
    const baseY = ph + 0.69;
    block.position.y = baseY;
    group.add(plinth, ring, topShadow, block);
    hs.add(group);
    // soft contact shadow + warm light pool on the floor
    const blob = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    blob.scale.set(2.1, 1, 2.1); blob.position.y = 0.006; blob.renderOrder = 2; hs.add(blob);
    const pool = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.25 }));
    pool.scale.set(3.6, 1, 3.6); pool.position.y = 0.01; pool.renderOrder = 3; hs.add(pool);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffdcae, alphaMap: beamAlpha, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.renderOrder = 4; hs.add(beam);
    const mirror = group.clone(true); mirrorRoot.add(mirror);
    // mirrored copies don't need the additive / shadow bits
    mirror.children[2].visible = false;
    hero.units.push({ i, group, mirror, block, ring, blob, pool, beam, baseY, ph, faceTex, b,
      cur: { x: 0, z: 0, ry: 0, s: 1, lift: 0, y: 0 }, intro: 0 });
  });

  // build the logo faces once images + fonts are available
  Promise.all([fontsReady(), ...BRANDS.map((b) => loadImg(b.logo))]).then((res) => {
    const imgs = res.slice(1);
    hero.units.forEach((u, k) => {
      const c = faceCanvas(u.b, imgs[k]);
      u.faceTex.image = c; u.faceTex.needsUpdate = true;
    });
    kick();
  });

  // dust motes drifting through the light
  const DUST = mqMobile.matches ? 120 : 240;
  const dustGeo = new THREE.BufferGeometry();
  const dpos = new Float32Array(DUST * 3), dspd = new Float32Array(DUST);
  for (let k = 0; k < DUST; k++) {
    dpos[k * 3] = (Math.random() - 0.5) * 9; dpos[k * 3 + 1] = Math.random() * 5; dpos[k * 3 + 2] = (Math.random() - 0.5) * 5;
    dspd[k] = 0.04 + Math.random() * 0.09;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.035, map: dotTex, color: 0xffe2b8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  hs.add(dust);

  /* ---------- hero state + interaction ---------- */
  let active = 0, holdUntil = 0, lastSwitch = performance.now();
  let userAz = 0, userEl = 0, velAz = 0, velEl = 0, swipeDx = 0, hovered = -1;
  let az = 0, el = 0.14, introT0 = 0;
  const hotV = new THREE.Vector3();
  const target = new THREE.Vector3(0, 1.05, 0.35);
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const pickables = hero.units.map((u) => u.block).concat(hero.units.map((u) => u.group.children[0]));
  let layout = 'arc', fit = { dist: 10, shift: 0 };

  function hold(ms = 8000) { holdUntil = performance.now() + ms; }
  function select(i, fromStage) {
    if (i === active && !fromStage) return;
    active = i; lastSwitch = performance.now();
    if (fromStage && HR.setBrand) HR.setBrand(i, 'stage');
    kick();
  }
  HR.stage = { select: (i) => { select(i, false); hold(); }, hold: () => hold() };

  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, hero.camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.index : -1;
  }
  let drag = null, hoverRaf = 0, lastMove = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'hero') return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0, type: e.pointerType };
    if (e.pointerType === 'mouse') { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} canvas.style.cursor = 'grabbing'; }
    hold(); kick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (mode !== 'hero') return;
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
      drag.lx = e.clientX; drag.ly = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (layout === 'arc') { velAz = -dx * 0.0042; velEl = dy * 0.0028; userAz += velAz; userEl += velEl; }
      else { swipeDx = e.clientX - drag.x; }
      hold(); kick();
    } else if (e.pointerType === 'mouse') {
      lastMove = e;
      if (!hoverRaf) hoverRaf = requestAnimationFrame(() => {
        hoverRaf = 0; if (!lastMove) return;
        const i = pick(lastMove.clientX, lastMove.clientY);
        if (i !== hovered) { hovered = i; canvas.style.cursor = i >= 0 ? 'pointer' : 'grab'; if (i >= 0) { select(i, true); hold(); } }
      });
    }
  });
  const endDrag = (e, cancelled) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (!cancelled && drag.moved < 8) {
      const i = pick(e.clientX, e.clientY);
      if (i >= 0) select(i, true);
    } else if (!cancelled && layout === 'cover') {
      if (swipeDx < -36) select((active + 1) % 4, true);
      else if (swipeDx > 36) select((active + 3) % 4, true);
    }
    drag = null; swipeDx = 0; canvas.style.cursor = 'grab'; hold(); kick();
  };
  canvas.addEventListener('pointerup', (e) => endDrag(e, false));
  canvas.addEventListener('pointercancel', (e) => endDrag(e, true));
  canvas.addEventListener('pointerleave', () => { hovered = -1; lastMove = null; });
  canvas.style.cursor = 'grab';

  function layoutHero(w, h) {
    const cam = hero.camera;
    cam.aspect = w / h;
    layout = (w < 700 || w / h < 1.05) ? 'cover' : 'arc';
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    if (layout === 'arc') {
      const frac = w >= 900 ? 0.6 : 1;
      const needW = 7.0, needH = 3.6;
      fit.dist = Math.max(needW / (2 * tanV * cam.aspect * frac), needH / (2 * tanV));
      fit.shift = w >= 900 ? (0.5 - frac / 2) * w : 0;
      target.set(0, 0.92, 0.35);
    } else {
      const needW = 3.1, needH = 2.75;
      fit.dist = Math.max(needW / (2 * tanV * cam.aspect), needH / (2 * tanV));
      fit.shift = 0;
      target.set(0, 1.05, 0.2);
    }
    if (fit.shift) cam.setViewOffset(w, h, -fit.shift, 0, w, h); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }

  function slot(i) {
    if (layout === 'arc') {
      const R = 3.7, a = (i - 1.5) * 0.43;
      const isA = i === active;
      return { x: Math.sin(a) * R, z: (1 - Math.cos(a)) * R * 0.85 + (isA ? 0.42 : 0), ry: -a * 0.85, s: 1, lift: isA ? 0.14 : 0 };
    }
    let o = i - active; if (o > 2) o -= 4; if (o < -1) o += 4; // wrap: active centred, neighbours either side
    const ao = Math.abs(o), sg = Math.sign(o);
    return { x: o * 1.32 + sg * (ao > 1 ? 0.25 : 0), z: (o === 0 ? 0.35 : -0.75 * ao), ry: -sg * 0.42, s: o === 0 ? 1 : 0.86, lift: o === 0 ? 0.12 : 0 };
  }

  function updateHero(t, dt) {
    if (!introT0 && HR.isReady && HR.isReady()) introT0 = t;
    const it = introT0 ? (t - introT0) : 0;
    const now = performance.now();

    // auto-advance when idle
    if (now > holdUntil && now - lastSwitch > 4800 && introT0 && it > 2.2) select((active + 1) % 4, true);

    // camera: idle sway + user orbit (inertia, limited angles)
    if (!drag) {
      userAz += velAz; userEl += velEl; velAz *= 0.92; velEl *= 0.92;
      if (now > holdUntil - 3000) { userAz = damp(userAz, 0, 1.2, dt); userEl = damp(userEl, 0, 1.2, dt); }
    }
    userAz = clamp(userAz, -0.75, 0.75); userEl = clamp(userEl, -0.1, 0.3);
    const swipeAz = layout === 'cover' ? clamp(-swipeDx * 0.0025, -0.35, 0.35) : 0;
    const idle = layout === 'arc' ? Math.sin(t * 0.16) * 0.14 : Math.sin(t * 0.2) * 0.06;
    az = damp(az, idle + userAz + swipeAz, 6, dt);
    el = damp(el, (layout === 'arc' ? 0.13 : 0.16) + userEl, 6, dt);
    const introPull = introT0 ? (1 - easeOut(clamp(it / 2.4, 0, 1))) : 1;
    const dist = fit.dist * (1 + introPull * 0.18);
    const cam = hero.camera;
    cam.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(target);

    // lights on
    const lightsOn = introT0 ? easeOut(clamp(it / 1.4, 0, 1)) : 0;
    key.intensity = 2.6 * lightsOn;

    hero.units.forEach((u) => {
      const s = slot(u.i), c = u.cur;
      if (!u._init) { Object.assign(c, s); u._init = true; }
      c.x = damp(c.x, s.x, 5, dt); c.z = damp(c.z, s.z, 5, dt); c.ry = damp(c.ry, s.ry, 5, dt);
      c.s = damp(c.s, s.s, 5, dt); c.lift = damp(c.lift, s.lift, 4, dt);
      const isA = u.i === active;
      // intro drop
      const ti = introT0 ? clamp((it - 0.25 - u.i * 0.14) / 1.1, 0, 1) : 0;
      const drop = (1 - easeOutBack(ti)) * 2.6;
      u.group.position.set(c.x, 0, c.z);
      u.group.rotation.y = c.ry;
      u.group.scale.setScalar(c.s);
      const wob = isA ? Math.sin(t * 0.7) * 0.22 : Math.sin(t * 0.45 + u.i * 1.7) * 0.07;
      u.block.position.y = u.baseY + c.lift + drop + Math.sin(t * 1.1 + u.i) * 0.012;
      u.block.rotation.y = wob;
      u.block.visible = ti > 0;
      // mirror copy
      u.mirror.position.copy(u.group.position); u.mirror.rotation.copy(u.group.rotation); u.mirror.scale.copy(u.group.scale);
      const mb = u.mirror.children[3]; mb.position.y = u.block.position.y; mb.rotation.y = u.block.rotation.y; mb.visible = u.block.visible;
      // floor + light
      const wp = u.group.position;
      u.blob.position.set(wp.x, 0.006, wp.z); u.blob.scale.set(2.1 * c.s, 1, 2.1 * c.s);
      u.pool.position.set(wp.x, 0.01, wp.z);
      u.pool.material.opacity = damp(u.pool.material.opacity, (isA ? 0.55 : 0.2) * lightsOn, 4, dt);
      u.beam.position.set(wp.x, u.ph * c.s + 3.2, wp.z);
      u.beam.material.opacity = damp(u.beam.material.opacity, (isA ? 0.13 : 0.035) * lightsOn, 4, dt);
      u.ring.material.opacity = damp(u.ring.material.opacity, isA ? 1 : 0.45, 4, dt);
      if (isA) {
        hotV.set(wp.x, u.baseY, wp.z); hot.target.position.lerp(hotV, 1 - Math.exp(-5 * dt));
        hot.position.set(hot.target.position.x * 0.8, 7, hot.target.position.z + 2.6);
      }
    });
    hot.intensity = damp(hot.intensity, 7 * lightsOn, 3, dt);

    // dust
    const p = dustGeo.attributes.position.array;
    for (let k = 0; k < DUST; k++) {
      p[k * 3 + 1] += dspd[k] * dt; p[k * 3] += Math.sin(t * 0.3 + k) * 0.0015;
      if (p[k * 3 + 1] > 5) p[k * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.material.opacity = 0.5 * lightsOn;
  }

  /* =====================================================
     FACTORY — stylised low-poly line (desktop fly-through)
     ===================================================== */
  let factory = null;
  function labelSprite(num, text) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 112;
    const g = c.getContext('2d');
    roundRect(g, 4, 4, 632, 104, 52); g.fillStyle = 'rgba(14,14,17,0.88)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(243,201,139,0.75)'; g.stroke();
    g.fillStyle = '#f3c98b'; g.font = '600 30px Syne, sans-serif'; g.textBaseline = 'middle'; g.fillText(num, 40, 58);
    g.fillStyle = '#f4f1ea'; g.font = '500 34px "Instrument Sans", sans-serif'; g.fillText(text, 104, 58);
    const w = Math.min(632, 104 + g.measureText(text).width + 44);
    // crop: redraw trimmed
    const c2 = document.createElement('canvas'); c2.width = w + 8; c2.height = 112; const g2 = c2.getContext('2d');
    roundRect(g2, 4, 4, w, 104, 52); g2.fillStyle = 'rgba(14,14,17,0.9)'; g2.fill(); g2.lineWidth = 2; g2.strokeStyle = 'rgba(243,201,139,0.75)'; g2.stroke();
    g2.fillStyle = '#f3c98b'; g2.font = '600 30px Syne, sans-serif'; g2.textBaseline = 'middle'; g2.fillText(num, 40, 58);
    g2.fillStyle = '#f4f1ea'; g2.font = '500 34px "Instrument Sans", sans-serif'; g2.fillText(text, 104, 58);
    const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    const hgt = 0.42; sp.scale.set(hgt * c2.width / 112, hgt, 1); sp.renderOrder = 10;
    return sp;
  }

  function buildFactory() {
    const s = new THREE.Scene();
    s.environment = envTex; s.environmentIntensity = 0.4;
    s.fog = new THREE.Fog(0x0b0b0d, 20, 52);
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
    s.add(new THREE.HemisphereLight(0xfff0dc, 0x0b0b0e, 0.5));
    const sun = new THREE.DirectionalLight(0xffe6c8, 1.6); sun.position.set(-6, 14, 10); s.add(sun);
    const cool = new THREE.DirectionalLight(0x9fbaff, 0.7); cool.position.set(10, 6, -10); s.add(cool);

    const metal = new THREE.MeshStandardMaterial({ color: 0x2b2b31, roughness: 0.45, metalness: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.6, metalness: 0.3 });
    const warm = new THREE.MeshStandardMaterial({ color: 0xc9a36a, roughness: 0.35, metalness: 0.75 });
    const glowWarm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x38bff0, toneMapped: false });

    // floor: faint grid + floor-painted area figure (from the infrastructure text)
    const fc = document.createElement('canvas'); fc.width = fc.height = 128; const fg = fc.getContext('2d');
    fg.fillStyle = '#121215'; fg.fillRect(0, 0, 128, 128); fg.strokeStyle = 'rgba(244,241,234,0.07)'; fg.lineWidth = 2; fg.strokeRect(0, 0, 128, 128);
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(40, 24); ft.colorSpace = THREE.SRGBColorSpace; ft.anisotropy = maxAniso;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(80, 48), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.75, metalness: 0.05 }));
    fl.rotation.x = -Math.PI / 2; s.add(fl);
    const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 160; const tg = tc.getContext('2d');
    tg.fillStyle = 'rgba(243,201,139,0.55)'; tg.font = '700 116px Syne, sans-serif'; tg.textBaseline = 'middle'; tg.fillText('32,780.88 SQ. FT.', 10, 84);
    const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = maxAniso;
    const txt = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.875), new THREE.MeshBasicMaterial({ map: tt, transparent: true, depthWrite: false, opacity: 0.55 }));
    txt.rotation.x = -Math.PI / 2; txt.position.set(-9, 0.01, 4.2); s.add(txt);

    // conveyor
    const L = 26;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(L, 0.16, 1.3), metal); frame.position.y = 0.82; s.add(frame);
    const bc = document.createElement('canvas'); bc.width = 64; bc.height = 16; const bg = bc.getContext('2d');
    bg.fillStyle = '#2c2c32'; bg.fillRect(0, 0, 64, 16); bg.fillStyle = '#3b3b43'; bg.fillRect(0, 0, 6, 16);
    const bt = new THREE.CanvasTexture(bc); bt.wrapS = THREE.RepeatWrapping; bt.repeat.set(L * 2, 1); bt.colorSpace = THREE.SRGBColorSpace;
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.1), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.8 }));
    belt.rotation.x = -Math.PI / 2; belt.position.y = 0.905; s.add(belt);
    [-0.66, 0.66].forEach((z) => { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.07, 0.05), warm); r.position.set(0, 0.97, z); s.add(r); });
    const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.78, 0.09), dark, 28);
    const m4 = new THREE.Matrix4(); let li = 0;
    for (let x = -12; x <= 12.1; x += 2) { [-0.55, 0.55].forEach((z) => { if (li < 28) { m4.makeTranslation(x, 0.39, z); legs.setMatrixAt(li++, m4); } }); }
    legs.count = li; s.add(legs);

    // 01 raw material handling — material rolls on stands
    const rollMat = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.9 });
    const rollGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.1, 48); rollGeo.rotateX(Math.PI / 2);
    [[-15.2, -0.0], [-15.2, 2.4]].forEach(([x, z], k) => {
      const r = new THREE.Mesh(rollGeo, rollMat); r.position.set(x, 1.35, z); r.userData.spin = k === 0; s.add(r);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.16, 24).rotateX(Math.PI / 2), warm); core.position.copy(r.position); s.add(core);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.35, 1.4), metal); st.position.set(x, 0.67, z); s.add(st);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9, side: THREE.DoubleSide }));
    sheet.position.set(-13.9, 1.4, 0); sheet.rotation.z = -0.42;
    s.add(sheet);

    // 02 automated system — tunnel housing with status light + monitoring screen
    function tunnel(x, w, h, colorMat) {
      const g = new THREE.Group();
      const l = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), colorMat); l.position.set(0, h / 2, -0.95);
      const r = l.clone(); r.position.z = 0.95;
      const top = new THREE.Mesh(new RoundedBoxGeometry(w + 0.1, 0.6, 2.4, 3, 0.08), colorMat); top.position.y = h + 0.25;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.05, 0.02), glowCyan); strip.position.set(0, h - 0.15, 1.16);
      g.add(l, r, top, strip); g.position.x = x; s.add(g); return g;
    }
    const housing = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: 0.38, metalness: 0.45 });
    tunnel(-5, 3.2, 2.0, housing);
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 160; const sg = sc.getContext('2d');
    sg.fillStyle = '#0d1418'; sg.fillRect(0, 0, 256, 160);
    sg.strokeStyle = '#38bff0'; sg.lineWidth = 3; sg.beginPath();
    for (let x = 0; x <= 236; x += 4) { const y = 90 - Math.sin(x / 22) * 22 - x * 0.12; x ? sg.lineTo(10 + x, y) : sg.moveTo(10, y); }
    sg.stroke(); sg.fillStyle = 'rgba(56,191,240,0.35)';
    for (let k = 0; k < 6; k++) sg.fillRect(16 + k * 38, 130 - k * 6, 24, 20 + k * 6);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.69), new THREE.MeshBasicMaterial({ map: st, toneMapped: false }));
    screen.position.set(-2.6, 1.85, 1.62); screen.rotation.y = -0.35; s.add(screen);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), dark); post.position.set(-2.6, 0.75, 1.55); s.add(post);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.78, 0.05), dark); bezel.position.set(-2.6, 1.85, 1.6); bezel.rotation.y = -0.35; s.add(bezel);

    // 03 finished product packaging — housing + robotic arm
    tunnel(3, 3.4, 2.3, housing);
    const arm = new THREE.Group(); arm.position.set(6.4, 0, -1.6); s.add(arm);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.4, 32), metal); base.position.y = 0.2; arm.add(base);
    const j1 = new THREE.Group(); j1.position.y = 0.4; arm.add(j1);
    const a1 = new THREE.Mesh(new RoundedBoxGeometry(0.2, 1.3, 0.2, 2, 0.05), warm); a1.position.y = 0.65; j1.add(a1);
    const j2 = new THREE.Group(); j2.position.y = 1.3; j1.add(j2);
    const a2 = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.16, 0.16, 2, 0.05), warm); a2.position.x = 0.6; j2.add(a2);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.3), dark); grip.position.set(1.2, -0.16, 0); j2.add(grip);

    // finished cartons stacked on a pallet (brand colours)
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 2.0), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.85 }));
    pallet.position.set(11.6, 0.09, -0.1); s.add(pallet);
    const cartonGeo = new RoundedBoxGeometry(0.7, 0.5, 0.58, 2, 0.04);
    const cartonMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 });
    const cartons = new THREE.InstancedMesh(cartonGeo, cartonMat, 27);
    const brandCols = BRANDS.map((b) => new THREE.Color(b.base));
    let ci = 0;
    for (let yy = 0; yy < 3; yy++) for (let zz = 0; zz < 3; zz++) for (let xx = 0; xx < 3; xx++) {
      m4.makeTranslation(11.6 + (xx - 1) * 0.74, 0.18 + 0.26 + yy * 0.52, -0.1 + (zz - 1) * 0.62);
      cartons.setMatrixAt(ci, m4); cartons.setColorAt(ci, brandCols[(xx + yy * 2 + zz) % 4]); ci++;
    }
    s.add(cartons);

    // goods travelling on the belt: plain before packaging, brand-coloured after
    const N = 24;
    const items = new THREE.InstancedMesh(new RoundedBoxGeometry(0.5, 0.26, 0.36, 2, 0.05), new THREE.MeshStandardMaterial({ roughness: 0.45 }), N);
    const raw = new THREE.Color(0xf1ede4);
    for (let k = 0; k < N; k++) items.setColorAt(k, raw);
    s.add(items);

    // overhead light bars
    for (let x = -12; x <= 12; x += 4.8) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.22), glowWarm); bar.position.set(x, 6.4, 0); s.add(bar);
      const pl = new THREE.PointLight(0xffdcae, 6, 9, 1.6); pl.position.set(x, 5.6, 0.3); s.add(pl);
    }

    // labelled stations
    const labels = [
      ['01', 'Raw material handling', new THREE.Vector3(-15.2, 3.2, 1.2)],
      ['02', 'Fully automated systems', new THREE.Vector3(-5, 3.65, 0)],
      ['03', 'Real-time monitoring', new THREE.Vector3(-2.6, 2.75, 1.65)],
      ['04', 'Finished product packaging', new THREE.Vector3(3, 3.95, 0)]
    ];
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf3c98b, transparent: true, opacity: 0.6 });
    const sprites = labels.map(([n, t, p]) => {
      const sp = labelSprite(n, t); sp.position.copy(p).add(new THREE.Vector3(0, 0.55, 0)); s.add(sp);
      const lg = new THREE.BufferGeometry().setFromPoints([p.clone().add(new THREE.Vector3(0, 0.33, 0)), p.clone().add(new THREE.Vector3(0, -0.35, 0))]);
      s.add(new THREE.Line(lg, lineMat));
      return sp;
    });

    // camera path
    const P = [[-24, 11, 18], [-19.5, 6, 12.5], [-10, 4.6, 10.5], [-1, 4.3, 10], [8, 4.2, 9.2], [15, 9, 16]].map((a) => new THREE.Vector3(...a));
    const T = [[-9, 0.6, 0], [-15.4, 1.2, 0.6], [-4.6, 1.4, 0], [3.2, 1.3, 0], [11.4, 1.0, 0], [3, 0.6, 0]].map((a) => new THREE.Vector3(...a));
    const pathP = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    const pathT = new THREE.CatmullRomCurve3(T, false, 'centripetal');

    return { scene: s, camera: cam, items, N, raw, brandCols, belt: bt, arm: { j1, j2 }, rolls: s.children.filter((o) => o.userData && o.userData.spin), cartons, pathP, pathT, sprites, p: 0, shift: 0 };
  }

  const dummy = new THREE.Object3D();
  const tmpV = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  function layoutFactory(w, h) {
    const f = factory; f.camera.aspect = w / h;
    f.shift = w >= 900 ? 0.2 * w : 0;
    if (f.shift) f.camera.setViewOffset(w, h, -f.shift, 0, w, h); else f.camera.clearViewOffset();
    f.camera.updateProjectionMatrix();
  }
  function updateFactory(t, dt) {
    const f = factory;
    const goal = HR.infra ? HR.infra.progress : 0;
    f.p = HR.snapFly ? goal : damp(f.p, goal, 5, dt);
    const u = clamp(f.p, 0, 1);
    f.pathP.getPoint(u, f.camera.position);
    f.pathT.getPoint(u, tmpV);
    f.camera.position.y += Math.sin(t * 0.6) * 0.03;
    f.camera.lookAt(tmpV);
    // belt + goods
    const speed = 1.1;
    f.belt.offset.x = -(t * speed * 2) % 1;
    for (let k = 0; k < f.N; k++) {
      const x = (((k / f.N) * 26 + t * speed) % 26) - 13;
      dummy.position.set(x, 0.905 + 0.13, 0); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      f.items.setMatrixAt(k, dummy.matrix);
      f.items.setColorAt(k, x > 3.2 ? f.brandCols[k % 4] : f.raw);
    }
    f.items.instanceMatrix.needsUpdate = true; f.items.instanceColor.needsUpdate = true;
    f.arm.j1.rotation.y = Math.sin(t * 1.2) * 0.9;
    f.arm.j2.rotation.z = -0.25 + Math.sin(t * 2.4) * 0.25;
    f.rolls.forEach((r) => { r.rotation.z -= dt * 0.6; });
    f.sprites.forEach((sp) => {
      const near = clamp((f.camera.position.distanceTo(sp.position) - 5) / 4, 0, 1);
      tmpS.copy(sp.position).project(f.camera);
      const side = f.shift ? clamp((tmpS.x + 0.05) / 0.25, 0, 1) : 1; // keep labels clear of the text panel
      sp.material.opacity = near * side;
    });
    // stack grows through the "growth" chapter (63% -> 100%, mirroring 10.81 -> 17.07)
    const g = clamp((u - 0.68) / 0.28, 0, 1);
    f.cartons.count = Math.round(27 * lerp(0.63, 1, g));
  }

  /* =====================================================
     Loop, hosts, visibility
     ===================================================== */
  let mode = null, running = false, raf = 0, lastT = 0, heroVis = false, infraVis = false;
  let frameAcc = 0, frameN = 0;
  const clock = { t: 0 };

  function size() {
    const host = canvas.parentElement; if (!host) return;
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
    renderer.setSize(w, h, false);
    if (mode === 'hero') layoutHero(w, h);
    else if (mode === 'factory' && factory) layoutFactory(w, h);
  }
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (m === 'hero' && canvas.parentElement !== heroHost) heroHost.appendChild(canvas);
    if (m === 'factory') {
      if (!factory) factory = buildFactory();
      if (canvas.parentElement !== infraHost) infraHost.appendChild(canvas);
    }
    if (m) size();
  }
  function decide() {
    const want = (infraVis && flyMode() && infraHost) ? 'factory' : (heroVis ? 'hero' : null);
    if (want) { setMode(want); start(); } else stop();
  }
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    clock.t += dt;
    if (mode === 'hero') { updateHero(clock.t, dt); renderer.render(hs, hero.camera); }
    else if (mode === 'factory' && factory) { updateFactory(clock.t, dt); renderer.render(factory.scene, factory.camera); }
    // adaptive quality: drop pixel ratio if we are consistently slow
    frameAcc += dt; frameN++;
    if (frameN === 90) {
      if (!lowPower && frameAcc / frameN > 0.034 && renderer.getPixelRatio() > 1) { lowPower = true; size(); }
      frameAcc = 0; frameN = 0;
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || document.hidden) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function kick() { if (!running && mode) { decide(); } }

  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.target === heroHost) heroVis = e.isIntersecting; else if (e.target === infraHost) infraVis = e.isIntersecting; });
    decide();
  }, { rootMargin: '80px 0px' });
  io.observe(heroHost);
  if (infraHost) io.observe(infraHost);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => { if (mode) size(); });
    ro.observe(heroHost); if (infraHost) ro.observe(infraHost);
  } else window.addEventListener('resize', () => mode && size());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else decide(); });

  // first frame
  heroHost.appendChild(canvas);
  mode = 'hero'; size();
  updateHero(0, 0.016); renderer.render(hs, hero.camera);
  report(true);
  if (HR.onReady === undefined) HR.onReady = () => kick();
  // build the factory during idle time so the fly-through starts instantly
  if (flyMode()) (window.requestIdleCallback || ((fn) => setTimeout(fn, 1500)))(() => { if (!factory) factory = buildFactory(); });

  // tidy up GPU resources when the page goes away
  window.addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    stop();
    [hs, factory && factory.scene].forEach((sc) => sc && sc.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      mats.forEach((m) => { ['map', 'alphaMap'].forEach((k) => m[k] && m[k].dispose()); m.dispose(); });
    }));
    envTex.dispose(); renderer.dispose();
  });
}
