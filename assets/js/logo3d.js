/* 3D Babil globe - a three.js model of the Babil International logo mark.
   A brown sphere carries the logo's lattice of raised dots, shading from
   yellow at the top-left to orange, and shrinking toward the edge of the cap.
   It eases toward the logo's front view, turns with page scroll, follows the
   cursor slightly, and can be dragged and flung. Without WebGL (or with
   reduced motion) the flat logo image stays in place. */
(function () {
  'use strict';

  var root = document.querySelector('[data-logo3d]');
  if (!root) return;
  var stage = root.querySelector('[data-logo3d-stage]');

  function canWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  function start() {
    if (typeof THREE === 'undefined' || !canWebGL()) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Scene ---------------------------------------------------------------
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 4.6);

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6a4632, 1.5));
    var fill = new THREE.DirectionalLight(0xffe2c0, 0.8);
    fill.position.set(3, -2, 4);
    scene.add(fill);
    var key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(-3, 4, 5);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xf6a623, 1.4);
    rim.position.set(4, -1, -3);
    scene.add(rim);

    var globe = new THREE.Group();
    scene.add(globe);

    // the brown ball
    var R = 1;
    var ball = new THREE.Mesh(
      new THREE.SphereGeometry(R, 96, 64),
      new THREE.MeshStandardMaterial({ color: 0x4a3226, roughness: 0.48, metalness: 0.12 })
    );
    globe.add(ball);

    // --- Dot lattice -----------------------------------------------------------
    // Dots sit on latitude rows like the printed logo. The "cap" faces the
    // viewer's upper-left; a dot's size and colour come from how close it is
    // to the centre of that cap.
    var cap = new THREE.Vector3(-0.78, 0.28, 0.56).normalize();
    var yellow = new THREE.Color(0xf7c51e);
    var amber = new THREE.Color(0xf6a623);
    var orange = new THREE.Color(0xf0731a);
    var dots = [];
    var ROW_STEP = 13; // degrees between rows
    for (var lat = -84; lat <= 84; lat += ROW_STEP) {
      var phi = THREE.MathUtils.degToRad(lat);
      var ringCount = Math.max(1, Math.round((360 / ROW_STEP) * Math.cos(phi)));
      var offset = (Math.abs(lat / ROW_STEP) % 2) * 0.5; // stagger alternate rows
      for (var k = 0; k < ringCount; k++) {
        var theta = ((k + offset) / ringCount) * Math.PI * 2;
        var n = new THREE.Vector3(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta));
        var d = n.dot(cap);
        if (d < 0.18) continue;
        var t = THREE.MathUtils.smoothstep(d, 0.18, 0.95);
        var size = 0.022 + 0.058 * t;
        var col = t > 0.55 ? amber.clone().lerp(yellow, (t - 0.55) / 0.45) : orange.clone().lerp(amber, t / 0.55);
        dots.push({ n: n, size: size, color: col });
      }
    }

    var dotGeo = new THREE.CylinderGeometry(1, 1, 0.5, 28, 1);
    dotGeo.rotateX(Math.PI / 2); // disc faces +Z
    var dotMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.0, emissive: 0xf08010, emissiveIntensity: 0.18 });
    var inst = new THREE.InstancedMesh(dotGeo, dotMat, dots.length);
    var m = new THREE.Matrix4();
    var q = new THREE.Quaternion();
    var zAxis = new THREE.Vector3(0, 0, 1);
    dots.forEach(function (dot, i) {
      q.setFromUnitVectors(zAxis, dot.n);
      var pos = dot.n.clone().multiplyScalar(R + 0.012);
      var s = new THREE.Vector3(dot.size, dot.size, 0.06);
      m.compose(pos, q, s);
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, dot.color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    globe.add(inst);

    // front view: the cap faces the camera, slightly to the upper-left like the logo
    var REST = { x: -0.12, y: 0.35 };
    globe.rotation.set(REST.x, REST.y, 0);

    stage.innerHTML = '';
    stage.appendChild(renderer.domElement);
    root.classList.add('is-3d');

    // --- Sizing ------------------------------------------------------------------
    function resize() {
      var w = stage.clientWidth || 1;
      var h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { resize(); renderer.render(scene, camera); }).observe(stage);

    // --- Interaction -------------------------------------------------------------
    var spin = { x: 0, y: 0 };      // extra rotation from dragging (decays back)
    var vel = { x: 0, y: 0 };       // fling velocity
    var tilt = { x: 0, y: 0 };      // cursor follow
    var scrollTurn = 0;             // turn from page scroll
    var dragging = false, lastX = 0, lastY = 0;
    var canvas = renderer.domElement;
    canvas.style.touchAction = 'pan-y';

    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      vel.x = vel.y = 0;
      canvas.setPointerCapture(e.pointerId);
      root.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      tilt.y = ((e.clientX - r.left) / r.width - 0.5) * 0.35;
      tilt.x = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
      if (!dragging) return;
      var dx = (e.clientX - lastX) * 0.01, dy = (e.clientY - lastY) * 0.01;
      spin.y += dx; spin.x += dy;
      vel.y = dx; vel.x = dy;
      lastX = e.clientX; lastY = e.clientY;
    });
    function endDrag() { dragging = false; root.classList.remove('is-dragging'); }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', function () { tilt.x = tilt.y = 0; });

    function onScroll() {
      var r = root.getBoundingClientRect();
      var p = (window.innerHeight - r.top) / (window.innerHeight + r.height); // 0 -> 1 across the viewport
      scrollTurn = (Math.min(1, Math.max(0, p)) - 0.5) * Math.PI * 1.2;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // --- Loop (only while on screen) ------------------------------------------------
    var visible = false, raf = 0, last = performance.now(), idle = 0;
    var stats = root.logo3d = { frames: 0, visible: false };
    function frame(now) {
      raf = 0;
      stats.frames++;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) {
        spin.y += vel.y; spin.x += vel.x;
        vel.y *= 0.92; vel.x *= 0.92;
        spin.y *= 0.965; spin.x *= 0.94; // ease back to the logo view
      }
      idle += dt;
      var breathe = reduced ? 0 : Math.sin(idle * 0.6) * 0.12;
      var targetY = REST.y + (reduced ? 0 : scrollTurn) + spin.y + tilt.y + breathe;
      var targetX = REST.x + spin.x + tilt.x;
      globe.rotation.y += (targetY - globe.rotation.y) * 0.12;
      globe.rotation.x += (targetX - globe.rotation.x) * 0.12;
      globe.position.y = reduced ? 0 : Math.sin(idle * 1.1) * 0.04;
      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(frame);
    }
    function setVisible(v) {
      visible = stats.visible = v;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    // Backup check from scroll/resize, in case the observer is slow to report.
    function checkInView() {
      var r = root.getBoundingClientRect();
      setVisible(r.bottom > -100 && r.top < window.innerHeight + 100);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (entries) { setVisible(entries[0].isIntersecting); }, { rootMargin: '100px' }).observe(root);
    }
    window.addEventListener('scroll', checkInView, { passive: true });
    window.addEventListener('resize', checkInView);
    canvas.addEventListener('pointerenter', function () { setVisible(true); });
    checkInView();
    renderer.render(scene, camera);
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
