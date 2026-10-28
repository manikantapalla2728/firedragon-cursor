(() => {
'use strict';

/* ---------- setup ---------- */
const canvas = document.getElementById('stage');
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo'), RECORD = params.has('record'), DEMO_LEN = 15;

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: RECORD
});
renderer.setClearColor(0x000000, 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 10, 5000);
let W = 1, H = 1, camDist = 1000;
var particleMat;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camDist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.set(W / 2, -H / 2, camDist);
  camera.updateProjectionMatrix();
  if (particleMat) { particleMat.uniforms.uPR.value = renderer.getPixelRatio(); particleMat.uniforms.uDist.value = camDist; }
}

/* ---------- lights ---------- */
scene.add(new THREE.AmbientLight(0x3a1208, 1.0));
const key = new THREE.DirectionalLight(0xffc890, 1.6); key.position.set(-300, 400, 600); scene.add(key);
const rim = new THREE.DirectionalLight(0xff3a10, 1.5); rim.position.set(300, -300, -400); scene.add(rim);
const fireLight = new THREE.PointLight(0xff7a20, 3, 320); scene.add(fireLight);

/* ---------- helpers / materials ---------- */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
const glowTex = glowTexture();
function glowSprite(color, opacity) {
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false
  }));
}
const scaleMat = new THREE.MeshStandardMaterial({ color: 0x7a1500, metalness: 0.4, roughness: 0.45, emissive: 0xff3300, emissiveIntensity: 0.35 });
const headMat = new THREE.MeshStandardMaterial({ color: 0x9a1c00, metalness: 0.4, roughness: 0.4, emissive: 0xff3a00, emissiveIntensity: 0.4 });
const hornMat = new THREE.MeshStandardMaterial({ color: 0x2a0d06, metalness: 0.3, roughness: 0.5, emissive: 0xff5a10, emissiveIntensity: 0.3 });
const boneMat = new THREE.MeshStandardMaterial({ color: 0x3a1208, metalness: 0.3, roughness: 0.5, emissive: 0xff4a10, emissiveIntensity: 0.55 });
const toothMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffa050, emissiveIntensity: 0.5, roughness: 0.3 });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff08a });
const mouthGlowMat = new THREE.MeshBasicMaterial({ color: 0xff8a20 });

const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
const coneGeo = new THREE.ConeGeometry(1, 1, 8);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 6);

const Y = new THREE.Vector3(0, 1, 0), dirV = new THREE.Vector3();
function bone(m, a, b) {
  dirV.subVectors(b, a); const l = dirV.length() || 1e-4;
  m.position.copy(a).addScaledVector(dirV, 0.5);
  m.quaternion.setFromUnitVectors(Y, dirV.multiplyScalar(1 / l));
  m.scale.y = l;
}
function makeBone(parent, th, mat) { const m = new THREE.Mesh(cylGeo, mat || boneMat); m.scale.set(th, 1, th); parent.add(m); return m; }

/* ---------- body ---------- */
const N = 44, SPACING = 6.2, SH = 9, HIP = 23;
const segs = [];
const xs = new Float32Array(N), ys = new Float32Array(N);
const wx = new Float32Array(N), wy = new Float32Array(N), wz = new Float32Array(N);
const UP = new THREE.Vector3(0, 0.55, 0.85);
const sm = t => t * t * (3 - 2 * t);
function radiusAt(i) {
  const t = i / (N - 1);
  if (t < 0.18) return 4.2 + (9 - 4.2) * sm(t / 0.18);
  if (t < 0.5) return 9 - 1.5 * ((t - 0.18) / 0.32);
  return 7.5 * Math.pow(1 - (t - 0.5) / 0.5, 0.9) + 0.8;
}
for (let i = 1; i < N; i++) {
  const r = radiusAt(i), g = new THREE.Group(); g.up.copy(UP);
  const s = new THREE.Mesh(sphereGeo, scaleMat); s.scale.set(r, r * 0.9, r * 1.4); g.add(s);
  const rm = new THREE.MeshStandardMaterial({ color: 0xff9a30, metalness: 0.3, roughness: 0.35, emissive: 0xff6a10, emissiveIntensity: 0.8 });
  const spike = new THREE.Mesh(coneGeo, rm);
  spike.scale.set(r * 0.35, r * (i % 2 ? 0.9 : 0.6), r * 0.35); spike.position.y = r * 0.85; g.add(spike);
  g.scale.setScalar(0.0001); scene.add(g);
  segs[i] = { g, rm, r };
}
// tail blade
{
  const g = segs[N - 1].g;
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(coneGeo, segs[N - 1].rm);
    b.scale.set(1.6, 12, 0.7); b.rotation.x = -Math.PI / 2; b.rotation.z = sx * 0.9; b.position.z = -4; g.add(b);
  }
  const b = new THREE.Mesh(coneGeo, segs[N - 1].rm); b.scale.set(2, 14, 0.8); b.rotation.x = -Math.PI / 2; b.position.z = -5; g.add(b);
}

/* ---------- wings ---------- */
const wingMat = new THREE.MeshStandardMaterial({
  vertexColors: true, side: THREE.DoubleSide, flatShading: true, emissive: 0x661100, emissiveIntensity: 0.7,
  roughness: 0.6, transparent: true, opacity: 0.93
});
const wingCol = [[0.35, 0.04, 0], [0.6, 0.1, 0], [1, 0.45, 0.05], [1, 0.5, 0.08], [1, 0.4, 0.04], [0.3, 0.03, 0]];
const wings = [];
for (const side of [-1, 1]) {
  const parent = segs[SH].g;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(wingCol.flat()), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
  const mesh = new THREE.Mesh(geo, wingMat); mesh.frustumCulled = false; parent.add(mesh);
  wings.push({
    side, geo, pts: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3()),
    arm: makeBone(parent, 1.1), fore: makeBone(parent, 0.9), fing: [0, 1, 2].map(() => makeBone(parent, 0.6))
  });
}
const FL = [34, 38, 30];
function updateWing(w, flap, lag) {
  const r = segs[SH].r, s = w.side, p = w.pts, S = p[0], E = new THREE.Vector3(), Wr = p[1];
  S.set(0, r * 0.9, 0);
  const a1 = flap;
  E.set(S.x + s * 20 * Math.cos(a1), S.y + 20 * Math.sin(a1), -4);
  const a2 = flap * 0.55 + 0.25 - lag;
  Wr.set(E.x + s * 22 * Math.cos(a2), E.y + 22 * Math.sin(a2), -10);
  for (let k = 0; k < 3; k++) {
    const ak = flap * 0.2 - 0.15 - k * 0.35 + 0.3 - lag * 1.6;
    p[2 + k].set(Wr.x + s * FL[k] * Math.cos(ak), Wr.y + FL[k] * Math.sin(ak), -(8 + k * 16));
  }
  p[5].set(0, 0.2, -26);
  const a = w.geo.attributes.position.array;
  for (let i = 0; i < 6; i++) { a[i * 3] = p[i].x; a[i * 3 + 1] = p[i].y; a[i * 3 + 2] = p[i].z; }
  w.geo.attributes.position.needsUpdate = true;
  bone(w.arm, S, E); bone(w.fore, E, Wr);
  for (let k = 0; k < 3; k++) bone(w.fing[k], Wr, p[2 + k]);
}

/* ---------- legs (two-bone IK) ---------- */
const legs = [];
[[SH + 1, 0], [HIP, Math.PI]].forEach(([idx, off], gi) => {
  for (const side of [-1, 1]) {
    const parent = segs[idx].g;
    const claw = new THREE.Mesh(coneGeo, toothMat); claw.scale.set(1.3, 5, 1.3); parent.add(claw);
    legs.push({
      idx, side, ph: off + (side > 0 ? Math.PI : 0), L1: gi ? 13 : 11, L2: gi ? 14 : 12,
      thigh: makeBone(parent, 2.2, scaleMat), shin: makeBone(parent, 1.6, scaleMat), claw
    });
  }
});
const hipV = new THREE.Vector3(), footV = new THREE.Vector3(), kneeV = new THREE.Vector3(), poleV = new THREE.Vector3(), dv = new THREE.Vector3();
function updateLeg(l, phase, amp) {
  const r = segs[l.idx].r, s = l.side, ph = phase + l.ph;
  hipV.set(s * r * 0.8, -r * 0.3, 0);
  const sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
  footV.set(s * (r * 0.8 + 15 + 3 * lift), -3 + lift * 7 * amp, sw * 11 * amp);
  dv.subVectors(footV, hipV);
  let d = dv.length(); const maxD = l.L1 + l.L2 - 0.5; if (d > maxD) { d = maxD; footV.copy(hipV).addScaledVector(dv.normalize(), d); dv.subVectors(footV, hipV); }
  dv.normalize();
  const a = (l.L1 * l.L1 - l.L2 * l.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l.L1 * l.L1 - a * a));
  poleV.set(s * 0.3, 1, -0.2); poleV.addScaledVector(dv, -poleV.dot(dv)).normalize();
  kneeV.copy(hipV).addScaledVector(dv, a).addScaledVector(poleV, h);
  bone(l.thigh, hipV, kneeV); bone(l.shin, kneeV, footV);
  l.claw.position.copy(footV);
  dirV.set(s * 0.5, -0.6, 0.4).normalize(); l.claw.quaternion.setFromUnitVectors(Y, dirV);
}

/* ---------- head ---------- */
const head = new THREE.Group(); head.up.copy(UP);
const hInner = new THREE.Group(); hInner.position.z = 4; head.add(hInner);
const skull = new THREE.Mesh(sphereGeo, headMat); skull.scale.set(7, 5.5, 10); hInner.add(skull);
const snout = new THREE.Mesh(sphereGeo, headMat); snout.scale.set(4.6, 3.4, 8.5); snout.position.set(0, -0.8, 10); hInner.add(snout);
const jawPivot = new THREE.Group(); jawPivot.position.set(0, -2.8, 3); hInner.add(jawPivot);
const jaw = new THREE.Mesh(sphereGeo, headMat); jaw.scale.set(4, 1.8, 9); jaw.position.set(0, -0.2, 6); jawPivot.add(jaw);
const mouthGlow = new THREE.Mesh(sphereGeo, mouthGlowMat); mouthGlow.scale.set(2.6, 0.6, 6); mouthGlow.position.set(0, 0.4, 7); jawPivot.add(mouthGlow);
for (const sx of [-1, 1]) {
  const eye = new THREE.Mesh(sphereGeo, eyeMat); eye.scale.set(1.5, 1.1, 1.8); eye.position.set(sx * 4.8, 2.4, 6); hInner.add(eye);
  const eg = glowSprite(0xffd060, 0.9); eg.scale.setScalar(15); eg.position.copy(eye.position); hInner.add(eg);
  const brow = new THREE.Mesh(coneGeo, hornMat); brow.scale.set(1.4, 6, 1.4); brow.position.set(sx * 4.6, 3.8, 7.5);
  brow.rotation.x = Math.PI / 2 + 0.2; brow.rotation.z = -sx * 0.5; hInner.add(brow);
  const horn = new THREE.Mesh(coneGeo, hornMat); horn.scale.set(2.2, 14, 2.2); horn.position.set(sx * 3.6, 4.4, -4);
  horn.rotation.x = -(Math.PI / 2 - 0.35); horn.rotation.z = -sx * 0.3; hInner.add(horn);
  const horn2 = new THREE.Mesh(coneGeo, hornMat); horn2.scale.set(1.3, 7, 1.3); horn2.position.set(sx * 6, 1.5, -2);
  horn2.rotation.x = -(Math.PI / 2 - 0.9); horn2.rotation.z = -sx * 1.0; hInner.add(horn2);
  const nostril = glowSprite(0xff9040, 0.8); nostril.scale.setScalar(5); nostril.position.set(sx * 1.6, 1.4, 17.5); hInner.add(nostril);
  for (let k = 0; k < 4; k++) {
    const t = new THREE.Mesh(coneGeo, toothMat); t.scale.set(0.7, 2.6, 0.7); t.position.set(sx * (2.6 - k * 0.1), -3.3, 8 + k * 2.6); t.rotation.x = Math.PI; hInner.add(t);
    const t2 = new THREE.Mesh(coneGeo, toothMat); t2.scale.set(0.6, 2.2, 0.6); t2.position.set(sx * 2.8, 1.2, 6 + k * 2.6); jawPivot.add(t2);
  }
}
const headGlow = glowSprite(0xff6a20, 0.45); headGlow.scale.setScalar(80); hInner.add(headGlow);
head.scale.setScalar(0.0001); scene.add(head);

/* ---------- fire particles ---------- */
const MAXP = 1000;
const pPos = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3);
const pLife = new Float32Array(MAXP), pMax = new Float32Array(MAXP).fill(1), pSize = new Float32Array(MAXP);
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aLife', new THREE.BufferAttribute(pLife, 1));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
particleMat = new THREE.ShaderMaterial({
  uniforms: { uPR: { value: 1 }, uDist: { value: 1000 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute float aSize; attribute float aLife; varying float vLife;
    uniform float uPR; uniform float uDist;
    void main(){
      vLife = aLife;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPR * (uDist / -mv.z) * (0.5 + (1.0 - aLife) * 0.9);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vLife;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d); a *= a;
      vec3 c = mix(vec3(0.45, 0.03, 0.0), vec3(1.0, 0.33, 0.02), smoothstep(0.0, 0.45, vLife));
      c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.45, 0.95, vLife));
      gl_FragColor = vec4(c, a * vLife * 0.85);
    }`
});
const points = new THREE.Points(pGeo, particleMat); points.frustumCulled = false; scene.add(points);
let pCursor = 0;
function spawn(x, y, z, vx, vy, vz, life, size) {
  const i = pCursor, j = i * 3; pCursor = (pCursor + 1) % MAXP;
  pPos[j] = x; pPos[j + 1] = y; pPos[j + 2] = z; pVel[j] = vx; pVel[j + 1] = vy; pVel[j + 2] = vz;
  pMax[i] = life; pLife[i] = 1; pSize[i] = size;
}

/* ---------- input ---------- */
const ptr = { x: 0, y: 0 };
let lastMove = 0, time = 0, breath = 0;
window.addEventListener('pointermove', e => { if (!DEMO) { ptr.x = e.clientX; ptr.y = e.clientY; lastMove = time; } }, { passive: true });
window.addEventListener('pointerdown', e => { if (!DEMO) { ptr.x = e.clientX; ptr.y = e.clientY; lastMove = time; breath = 1.3; } }, { passive: true });
window.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') toggleFS(); });
window.addEventListener('dblclick', toggleFS);
function toggleFS() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  else document.exitFullscreen && document.exitFullscreen();
}

/* ---------- demo path (15 s) ---------- */
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
function pathA(t) { const u = t - 3, k = sm(cl(u / 1.2, 0, 1)); return [0.5 + 0.30 * Math.sin(u * 1.3) * k, 0.5 + 0.20 * Math.sin(u * 2.6) * k]; }
const WP = [[0.15, 0.25], [0.85, 0.30], [0.2, 0.78], [0.82, 0.72]];
function pathB(t, start) {
  const pts = [start, ...WP], u = cl((t - 7) / 4, 0, 1) * (pts.length - 1), i = Math.min(Math.floor(u), pts.length - 2), f = sm(u - i);
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
}
function demoPointer(t) {
  const bEnd = WP[WP.length - 1]; let p;
  if (t < 3) p = [0.5, 0.5]; else if (t < 7) p = pathA(t); else if (t < 11) p = pathB(t, pathA(7));
  else { const u = cl((t - 11) / 2.4, 0, 1), e = sm(u), th = u * Math.PI * 3, r = 0.30 * Math.sin(Math.PI * u);
    p = [bEnd[0] + (0.5 - bEnd[0]) * e + Math.cos(th) * r * 0.9, bEnd[1] + (0.5 - bEnd[1]) * e + Math.sin(th) * r * 0.9]; }
  return [p[0] * W, p[1] * H];
}

/* ---------- state ---------- */
const hp = { x: 0, y: 0, vx: 0, vy: 0 };
let idleBlend = 0, wavePhase = 0, speedS = 0, flapPhase = 0, legPhase = 0, flapLag = 0, prevFlap = 0;
const headDir = new THREE.Vector3(1, 0, 0), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), mouthV = new THREE.Vector3();
const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function init() {
  resize(); ptr.x = W / 2; ptr.y = H / 2; hp.x = ptr.x; hp.y = ptr.y;
  for (let i = 0; i < N; i++) { xs[i] = hp.x - i * SPACING; ys[i] = hp.y; }
}

/* ---------- frame ---------- */
let last = performance.now(), emitAcc = 0, rafId = 0, recorder = null, recChunks = [], recDone = false, introBurst = false;
function startRecording() {
  if (!RECORD || !window.MediaRecorder || !canvas.captureStream) return;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(canvas.captureStream(60), { mimeType: mime, videoBitsPerSecond: 12e6 });
  recorder.ondataavailable = e => e.data.size && recChunks.push(e.data);
  recorder.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(recChunks, { type: 'video/webm' })); a.download = 'fire_dragon_preview.webm'; a.click(); };
  recorder.start();
}

function frame(now) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
  if (dt <= 0) return;
  time += dt;

  if (DEMO) {
    const [dx, dy] = demoPointer(Math.min(time, DEMO_LEN));
    if (Math.hypot(dx - ptr.x, dy - ptr.y) > 0.6) lastMove = time;
    ptr.x = dx; ptr.y = dy;
    if ((time > 9 && time < 10.4) || (time > 12.6 && time < 13.6)) breath = Math.max(breath, 0.5);
    if (RECORD && !recorder && !recDone) startRecording();
    if (RECORD && recorder && time >= DEMO_LEN && !recDone) { recDone = true; recorder.stop(); }
  }
  breath = Math.max(0, breath - dt);

  idleBlend += (((time - lastMove) > 0.7 ? 1 : 0) - idleBlend) * (1 - Math.exp(-2.5 * dt));

  /* head spring */
  const a = time * 0.7;
  const tx = ptr.x + 16 + Math.cos(a) * 40 * idleBlend, ty = ptr.y + 14 + Math.sin(a * 2) * 24 * idleBlend;
  hp.vx += ((tx - hp.x) * 110 - hp.vx * 17) * dt; hp.vy += ((ty - hp.y) * 110 - hp.vy * 17) * dt;
  hp.x += hp.vx * dt; hp.y += hp.vy * dt;
  const speed = Math.hypot(hp.vx, hp.vy);
  speedS += (cl(speed / 900, 0, 1) - speedS) * (1 - Math.exp(-6 * dt));

  /* chain */
  xs[0] = hp.x; ys[0] = hp.y;
  for (let i = 1; i < N; i++) {
    const dx = xs[i - 1] - xs[i], dy = ys[i - 1] - ys[i], d = Math.hypot(dx, dy) || 1, k = SPACING / d;
    xs[i] = xs[i - 1] - dx * k; ys[i] = ys[i - 1] - dy * k;
  }
  wavePhase += dt * (2.5 + speedS * 5);
  const amp = (1.5 + 4 * idleBlend) * (1 - 0.5 * speedS);
  for (let i = 0; i < N; i++) {
    const p = Math.max(i - 1, 0), n = Math.min(i + 1, N - 1);
    let tx2 = xs[p] - xs[n], ty2 = ys[p] - ys[n]; const l = Math.hypot(tx2, ty2) || 1; tx2 /= l; ty2 /= l;
    const env = 0.15 + 0.85 * Math.pow(i / (N - 1), 1.3), ph = wavePhase - i * 0.3, off = Math.sin(ph) * amp * env * 2.2;
    wx[i] = xs[i] - ty2 * off; wy[i] = -(ys[i] + tx2 * off); wz[i] = Math.cos(ph) * radiusAt(i) * 0.4 * env;
  }

  const intro = cl(time / 2.2, 0, 1);
  const grow = t01 => easeOutBack(cl(intro * 1.6 - t01 * 0.6, 0, 1));
  const heat = Math.sin(time * 3);
  for (let i = 1; i < N; i++) {
    const s = segs[i], p = Math.max(i - 1, 0), n = Math.min(i + 1, N - 1);
    s.g.position.set(wx[i], wy[i], wz[i]);
    tmp.set(wx[i] + (wx[p] - wx[n]), wy[i] + (wy[p] - wy[n]), wz[i]); s.g.lookAt(tmp);
    s.g.scale.setScalar(Math.max(0.0001, grow(i / (N - 1))));
    const e = 0.5 + 0.5 * Math.sin(i * 0.3 - time * 4.5);
    s.rm.emissiveIntensity = 0.5 + 1.4 * e * e + speedS * 0.7 + (breath > 0 ? 0.6 : 0);
  }

  /* wings: slow flap idle, powerful at speed */
  const fFreq = 1.8 + speedS * 3.2 + (breath > 0 ? 0.8 : 0), fAmp = 0.5 + speedS * 0.45 + idleBlend * 0.05;
  flapPhase += dt * fFreq * Math.PI * 2;
  const flap = 0.35 + Math.sin(flapPhase) * fAmp;
  flapLag += ((flap - prevFlap) * 3 - flapLag) * (1 - Math.exp(-14 * dt)); prevFlap = flap;
  const lag = cl(-flapLag * 0.05, -0.5, 0.5) * 6;
  for (const w of wings) updateWing(w, flap, cl(lag, -0.6, 0.6));

  /* legs */
  legPhase += dt * (1.2 + speed * 0.012);
  const stride = 0.25 + speedS * 0.9;
  for (const l of legs) updateLeg(l, legPhase, stride);

  /* head */
  tmp.set(wx[0] - wx[2], wy[0] - wy[2], 0).normalize();
  if (speed > 120) tmp.lerp(tmp2.set(hp.vx, -hp.vy, 0).normalize(), 0.5).normalize();
  headDir.lerp(tmp, 1 - Math.exp(-12 * dt)).normalize();
  head.position.set(wx[0], wy[0], wz[0]);
  tmp.copy(head.position).add(headDir); head.lookAt(tmp);
  head.scale.setScalar(Math.max(0.0001, grow(0)));
  const open = 0.1 + speedS * 0.3 + 0.05 * Math.sin(time * 2) + (breath > 0 ? 0.55 : 0);
  jawPivot.rotation.x = open;
  mouthGlowMat.color.setRGB(1, 0.35 + 0.3 * Math.max(0, heat) + breath * 0.3, 0.05);
  headGlow.material.opacity = 0.35 + 0.1 * heat + breath * 0.4;

  fireLight.position.set(wx[0], wy[0], 70);
  fireLight.intensity = 2.5 + Math.random() * 1.2 + breath * 3;

  /* particles */
  head.updateMatrixWorld(true);
  mouthV.set(0, -1.5, 24); head.localToWorld(mouthV);
  if (!introBurst && time > 0.05) { introBurst = true; for (let i = 0; i < 120; i++) { const an = Math.random() * 6.283, s = 40 + Math.random() * 220; spawn(wx[0], wy[0], 0, Math.cos(an) * s, Math.sin(an) * s, 0, 0.7 + Math.random() * 0.8, 8 + Math.random() * 10); } }

  // mouth: thin flame trickle always, big breath on demand
  emitAcc += dt * (35 + speedS * 160 + (breath > 0 ? 700 : 0));
  while (emitAcc > 1) {
    emitAcc -= 1;
    const big = breath > 0, sp = big ? 260 + Math.random() * 230 : 70 + Math.random() * 90 + speedS * 80;
    const sx = (Math.random() - 0.5) * (big ? 70 : 40), sy = (Math.random() - 0.5) * (big ? 70 : 40);
    spawn(mouthV.x, mouthV.y, mouthV.z, headDir.x * sp - headDir.y * sx, headDir.y * sp + headDir.x * sx + 20, (Math.random() - 0.5) * 30,
      big ? 0.5 + Math.random() * 0.6 : 0.4 + Math.random() * 0.5, big ? 12 + Math.random() * 14 : 6 + Math.random() * 7);
  }
  // ember/flame licks along spine and tail
  const lick = 40 + speedS * 160;
  for (let c = lick * dt + Math.random(); c >= 1; c--) {
    const i = 1 + Math.floor(Math.random() * (N - 1)), r = radiusAt(i);
    spawn(wx[i] + (Math.random() - 0.5) * r, wy[i] + r * 0.5, wz[i] + r, (Math.random() - 0.5) * 30 - hp.vx * 0.03, 30 + Math.random() * 50 + hp.vy * -0.03, 10, 0.5 + Math.random() * 0.7, 4 + Math.random() * 6);
  }
  for (let i = 0; i < MAXP; i++) {
    if (pLife[i] <= 0) { pSize[i] = 0; continue; }
    pLife[i] -= dt / pMax[i]; if (pLife[i] < 0) pLife[i] = 0;
    const k = i * 3, drag = Math.exp(-1.3 * dt);
    pVel[k] = pVel[k] * drag + Math.sin(pPos[k + 1] * 0.05 + time * 6 + i) * 90 * dt;
    pVel[k + 1] = pVel[k + 1] * drag + (55 + Math.cos(pPos[k] * 0.05 + time * 5 + i) * 50) * dt;
    pVel[k + 2] *= drag;
    pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt;
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.aLife.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true;

  renderer.render(scene, camera);
}

/* ---------- lifecycle ---------- */
function dispose() {
  cancelAnimationFrame(rafId);
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
  [sphereGeo, coneGeo, cylGeo, pGeo].forEach(g => g.dispose()); glowTex.dispose(); renderer.dispose();
}
window.addEventListener('pagehide', dispose);
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { last = performance.now(); });
init(); rafId = requestAnimationFrame(frame);
})();
