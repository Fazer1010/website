/* 3D Babil International logo - the complete mark as one solid object:
   the dotted globe on the left, extruded "BABIL" lettering beside it and
   "INTERNATIONAL" underneath in orange, laid out like the printed logo.
   The whole logo turns with page scroll, leans toward the cursor, can be
   dragged and flung, and eases back to its front view. Without WebGL or
   module support the flat logo image in the stage stays in place. */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const root = document.querySelector('[data-logo3d]');
const stage = root && root.querySelector('[data-logo3d-stage]');
if (!root || !stage) throw new Error('logo3d: stage missing');

function canWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/optimer_bold.typeface.json';
const BROWN = 0x4b3528;
const ORANGE = 0xf07a1a;

function buildGlobe(R) {
  const globe = new THREE.Group();
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 64),
    new THREE.MeshStandardMaterial({ color: 0x4a3226, roughness: 0.48, metalness: 0.12 })
  ));
  // Dots on latitude rows; the lit "cap" faces the viewer's upper-left.
  const cap = new THREE.Vector3(-0.78, 0.28, 0.56).normalize();
  const yellow = new THREE.Color(0xf7c51e), amber = new THREE.Color(0xf6a623), orange = new THREE.Color(0xf0731a);
  const dots = [];
  const STEP = 13;
  for (let lat = -84; lat <= 84; lat += STEP) {
    const phi = THREE.MathUtils.degToRad(lat);
    const count = Math.max(1, Math.round((360 / STEP) * Math.cos(phi)));
    const offset = (Math.abs(lat / STEP) % 2) * 0.5;
    for (let k = 0; k < count; k++) {
      const theta = ((k + offset) / count) * Math.PI * 2;
      const n = new THREE.Vector3(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta));
      const d = n.dot(cap);
      if (d < 0.18) continue;
      const t = THREE.MathUtils.smoothstep(d, 0.18, 0.95);
      const size = R * (0.022 + 0.058 * t);
      const color = t > 0.55 ? amber.clone().lerp(yellow, (t - 0.55) / 0.45) : orange.clone().lerp(amber, t / 0.55);
      dots.push({ n, size, color });
    }
  }
  const geo = new THREE.CylinderGeometry(1, 1, 0.5, 28, 1);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, emissive: 0xf08010, emissiveIntensity: 0.18 });
  const inst = new THREE.InstancedMesh(geo, mat, dots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), z = new THREE.Vector3(0, 0, 1);
  dots.forEach((dot, i) => {
    q.setFromUnitVectors(z, dot.n);
    m.compose(dot.n.clone().multiplyScalar(R + R * 0.012), q, new THREE.Vector3(dot.size, dot.size, R * 0.06));
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, dot.color);
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  globe.add(inst);
  // turn the cap toward the viewer like the printed mark
  globe.rotation.set(-0.12, 0.35, 0);
  return globe;
}

// One mesh per letter so the tracking can match the logo.
function buildWord(font, text, size, depth, material, tracking) {
  const group = new THREE.Group();
  let x = 0;
  for (const ch of text) {
    const geo = new TextGeometry(ch, {
      font, size, height: depth, depth, curveSegments: 10,
      bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: size * 0.025, bevelSegments: 3,
    });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.x = x - bb.min.x;
    group.add(mesh);
    x += (bb.max.x - bb.min.x) + size * tracking;
  }
  group.userData.width = x - size * tracking;
  group.userData.glyphWidth = group.userData.width - size * tracking * (text.length - 1);
  return group;
}

function start(font) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6a4632, 1.5));
  const fill = new THREE.DirectionalLight(0xffe2c0, 0.8); fill.position.set(3, -2, 4); scene.add(fill);
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf6a623, 1.4); rim.position.set(4, -1, -3); scene.add(rim);

  // --- Assemble the mark: proportions taken from the logo artwork (276 x 90) ---
  const logo = new THREE.Group();
  const H = 1;                       // cap height of BABIL
  const brown = new THREE.MeshStandardMaterial({ color: BROWN, roughness: 0.5, metalness: 0.08 });
  const orange = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45, metalness: 0.05, emissive: ORANGE, emissiveIntensity: 0.08 });

  const babil = buildWord(font, 'BABIL', H, H * 0.28, brown, 0.16);
  // INTERNATIONAL is letter-spaced to span exactly the width of BABIL, as in the artwork
  const SMALL = H * 0.32;
  let intl = buildWord(font, 'INTERNATIONAL', SMALL, H * 0.2, orange, 0);
  const tracking = (babil.userData.width - intl.userData.glyphWidth) / 12 / SMALL;
  intl = buildWord(font, 'INTERNATIONAL', SMALL, H * 0.2, orange, Math.max(0.02, tracking));

  const lineGap = H * 0.14;
  const babilY = lineGap + SMALL;            // baseline of BABIL
  const textTop = babilY + H;
  const textMid = textTop / 2;               // INTERNATIONAL baseline sits at 0

  const R = textTop * 0.56;                  // the globe is a little taller than the text block
  const globe = buildGlobe(R);
  const textX = R * 2 + H * 0.3;

  globe.position.set(R, textMid, 0);
  babil.position.set(textX, babilY, 0);
  intl.position.set(textX, 0, 0);
  logo.add(globe, babil, intl);

  // centre the whole mark on the origin
  const box = new THREE.Box3().setFromObject(logo);
  const centre = box.getCenter(new THREE.Vector3());
  logo.position.sub(centre);
  const size = box.getSize(new THREE.Vector3());

  const pivot = new THREE.Group();
  pivot.add(logo);
  scene.add(pivot);

  stage.innerHTML = '';
  stage.appendChild(renderer.domElement);
  root.classList.add('is-3d');

  // --- Sizing: fit the mark's width (or height) into the stage ---
  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    const byWidth = (size.x * 0.52) / (Math.tan(half) * camera.aspect);
    const byHeight = (size.y * 0.62) / Math.tan(half);
    camera.position.set(0, 0, Math.max(byWidth, byHeight) + size.z);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  resize();
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(stage);

  // --- Interaction ---
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REST = { x: 0.08, y: -0.18 };
  pivot.rotation.set(REST.x, REST.y, 0);
  const spin = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, tilt = { x: 0, y: 0 };
  let scrollTurn = 0, dragging = false, lastX = 0, lastY = 0;
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'pan-y';

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; vel.x = vel.y = 0;
    canvas.setPointerCapture(e.pointerId);
    root.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tilt.y = ((e.clientX - r.left) / r.width - 0.5) * 0.3;
    tilt.x = ((e.clientY - r.top) / r.height - 0.5) * 0.2;
    if (!dragging) return;
    const dx = (e.clientX - lastX) * 0.008, dy = (e.clientY - lastY) * 0.008;
    spin.y += dx; spin.x += dy; vel.y = dx; vel.x = dy;
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = () => { dragging = false; root.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { tilt.x = tilt.y = 0; });

  function onScroll() {
    const r = root.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
    scrollTurn = (p - 0.5) * 0.9;   // about +-26 degrees across the viewport
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Loop, only while on screen ---
  let visible = false, raf = 0, last = performance.now(), idle = 0;
  const stats = root.logo3d = { frames: 0, visible: false };
  function frame(now) {
    raf = 0; stats.frames++;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!dragging) {
      spin.y += vel.y; spin.x += vel.x;
      vel.y *= 0.92; vel.x *= 0.92;
      spin.y *= 0.965; spin.x *= 0.94;
    }
    idle += dt;
    const breathe = reduced ? 0 : Math.sin(idle * 0.6) * 0.06;
    const ty = REST.y + (reduced ? 0 : scrollTurn) + spin.y + tilt.y + breathe;
    const tx = REST.x + spin.x + tilt.x;
    pivot.rotation.y += (ty - pivot.rotation.y) * 0.12;
    pivot.rotation.x += (tx - pivot.rotation.x) * 0.12;
    pivot.position.y = reduced ? 0 : Math.sin(idle * 1.1) * 0.03;
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  }
  function setVisible(v) {
    visible = stats.visible = v;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function checkInView() {
    const r = root.getBoundingClientRect();
    setVisible(r.bottom > -100 && r.top < window.innerHeight + 100);
  }
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((en) => setVisible(en[0].isIntersecting), { rootMargin: '100px' }).observe(root);
  }
  window.addEventListener('scroll', checkInView, { passive: true });
  window.addEventListener('resize', checkInView);
  canvas.addEventListener('pointerenter', () => setVisible(true));
  checkInView();
  renderer.render(scene, camera);
}

if (canWebGL()) {
  new FontLoader().load(FONT_URL, start, undefined, (err) => console.warn('logo3d: font failed to load', err));
}
