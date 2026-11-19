// world.js · Geometría procedural low-poly. Sin assets externos.
import * as THREE from 'three';

export const SCENARIOS = [
  null,
  { id: 1, nombre: 'Estudiante', lugar: 'Aula · Día', desc: 'Clase de bases de datos. Aprende SQL desde cero.' },
  { id: 2, nombre: 'Pasante', lugar: 'Oficina · Día', desc: 'Tu primer día en el banco. Tickets y reportes.' },
  { id: 3, nombre: 'Senior DBA', lugar: 'Guardia · Noche', desc: 'Producción arde. Solo tú, el café y los logs.' },
];

// ---------- helpers ----------
const M = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra });

const box = (w, h, d, material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Sombra falsa barata (sin shadow maps, según presupuesto de DISENO_REFERENCIA)
let _blobTex = null;
function blob(radius, opacity = 0.3) {
  if (!_blobTex) {
    _blobTex = canvasTex(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
      g.addColorStop(0, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    });
    _blobTex.userData.shared = true;
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, opacity, depthWrite: false, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.002;
  m.renderOrder = 1;
  return m;
}

export function disposeSharedTextures() {
  if (_blobTex) { _blobTex.dispose(); _blobTex = null; }
}

export function disposeObject(root) {
  root.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m) return;
      if (m.map && !m.map.userData?.shared) m.map.dispose();
      m.dispose();
    });
  });
}

// Compañero low-poly sentado (mirando hacia +z)
function seatedPerson(shirt, skin = 0xd9b38c) {
  const g = new THREE.Group();
  const seat = box(0.34, 0.05, 0.34, M(0x2b303b)); seat.position.y = 0.44;
  const back = box(0.34, 0.36, 0.05, M(0x2b303b)); back.position.set(0, 0.66, -0.17);
  const ped = box(0.06, 0.44, 0.06, M(0x1c202a)); ped.position.y = 0.22;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.26, 2, 6), M(shirt));
  torso.position.y = 0.72;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), M(skin));
  head.position.y = 1.0;
  const armL = box(0.05, 0.2, 0.05, M(shirt)); armL.position.set(-0.18, 0.72, 0.08); armL.rotation.x = -0.7;
  const armR = armL.clone(); armR.position.x = 0.18;
  g.add(seat, back, ped, torso, head, armL, armR, blob(0.35, 0.25));
  g.userData.head = head;
  return g;
}

// ---------- Escritorio común (interactivo) ----------
export function buildDesk() {
  const g = new THREE.Group();
  const DY = 0.78; // altura de la superficie

  const top = box(1.9, 0.05, 0.95, M(0x6e4f33, { roughness: 0.7 }));
  top.position.y = DY - 0.025;
  g.add(top, blob(1.15, 0.32));
  [[-0.88, -0.4], [0.88, -0.4], [-0.88, 0.4], [0.88, 0.4]].forEach(([x, z]) => {
    const leg = box(0.07, 0.75, 0.07, M(0x3a2c1e));
    leg.position.set(x, 0.375, z);
    g.add(leg);
  });

  // --- Monitor con pantalla de bloqueo (CanvasTexture animada) ---
  const lockCanvas = document.createElement('canvas');
  lockCanvas.width = 512; lockCanvas.height = 320;
  const lockCtx = lockCanvas.getContext('2d');
  const lockTex = new THREE.CanvasTexture(lockCanvas);
  lockTex.colorSpace = THREE.SRGBColorSpace;
  let currentScenario = 1;

  function drawLock(blink) {
    const ctx = lockCtx, w = 512, h = 320;
    const isCampus = currentScenario === 1;
    ctx.fillStyle = '#0f1115'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a1d24'; ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = isCampus ? '#3b82f6' : '#10b981'; ctx.beginPath(); ctx.arc(18, 13, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(isCampus ? 'CampusOS' : 'Banco Nexus OS', 30, 17);
    const now = new Date();
    const hh = isCampus ? '10' : String(now.getHours()).padStart(2, '0');
    const mm = isCampus ? '20' : String(now.getMinutes()).padStart(2, '0');
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px "Fira Code", monospace';
    ctx.fillText(`${hh}${blink ? ':' : ' '}${mm}`, w - 58, 17);
    // avatar
    ctx.fillStyle = isCampus ? '#3b82f6' : '#10b981'; ctx.beginPath(); ctx.arc(w / 2, 100, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 22px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(isCampus ? 'CO' : 'BN', w / 2, 108);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText(isCampus ? 'CampusOS · Estudiante' : 'Banco Nexus OS', w / 2, 160);
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(isCampus ? 'Práctica de Bases de Datos · SQL' : 'Sistema de Entrenamiento SQL & RL', w / 2, 180);
    // campo contraseña
    ctx.fillStyle = '#000'; ctx.globalAlpha = 0.35;
    ctx.fillRect(w / 2 - 100, 200, 200, 30); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2d313a'; ctx.strokeRect(w / 2 - 100, 200, 200, 30);
    ctx.fillStyle = '#94a3b8'; ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`Contraseña${blink ? ' ▏' : ''}`, w / 2, 220);
    // botón
    ctx.fillStyle = isCampus ? '#3b82f6' : '#10b981'; ctx.fillRect(w / 2 - 100, 242, 200, 30);
    ctx.fillStyle = '#fff'; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText('Entrar al Sistema', w / 2, 262);
    ctx.fillStyle = '#475569'; ctx.font = '11px "Fira Code", monospace';
    ctx.fillText('DROP TABLE Life;', w / 2, 300);
    ctx.textAlign = 'left';
    // scanlines sutiles
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    lockTex.needsUpdate = true;
  }
  drawLock(true);

  const monitor = new THREE.Group();
  monitor.position.set(0, 0, -0.18);
  const mBase = box(0.26, 0.02, 0.18, M(0x1c1f26)); mBase.position.y = DY + 0.01;
  const neck = box(0.05, 0.26, 0.04, M(0x1c1f26)); neck.position.y = DY + 0.14;
  const bezel = box(0.68, 0.44, 0.035, M(0x14161c, { roughness: 0.4, metalness: 0.3 }));
  bezel.position.y = 1.27;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.3875),
    new THREE.MeshBasicMaterial({ map: lockTex, toneMapped: false })
  );
  screen.position.set(0, 1.27, 0.0195);
  monitor.add(mBase, neck, bezel, screen);
  monitor.userData.tag = 'monitor';
  g.add(monitor);
  const screenCenter = new THREE.Vector3(0, 1.27, -0.16);

  // --- Teclado (teclas instanciadas) ---
  const kb = new THREE.Group(); kb.position.set(0, 0, 0.3);
  const kbBase = box(0.46, 0.018, 0.17, M(0x1c1f26)); kbBase.position.y = DY + 0.009;
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.026, 0.012, 0.026), M(0x2a2f3a), 56);
  const m4 = new THREE.Matrix4();
  let ki = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) {
    m4.setPosition(-0.195 + c * 0.03, DY + 0.024, -0.052 + r * 0.03);
    keys.setMatrixAt(ki++, m4);
  }
  const space = box(0.15, 0.012, 0.026, M(0x2a2f3a)); space.position.set(0, DY + 0.024, 0.068);
  kb.add(kbBase, keys, space);
  g.add(kb);

  // --- Mouse + pad ---
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.19), M(0x11131a));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0.34, DY + 0.001, 0.3);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), M(0x2a2f3a));
  mouse.scale.set(1, 0.55, 1.45); mouse.position.set(0.34, DY + 0.018, 0.3);
  g.add(pad, mouse);

  // --- Taza con pista de contraseña (separada del cuaderno; gira al hacer clic) ---
  const mugBaseY = DY;
  const mugMat = M(0xe8e2d4, { roughness: 0.5, emissive: 0xf59e0b, emissiveIntensity: 0 });
  const mug = new THREE.Group(); mug.position.set(-0.58, mugBaseY, -0.04);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), mugMat);
  body.position.y = 0.05;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.037, 12), M(0x2b1a10, { roughness: 0.3 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.098;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 10, Math.PI), mugMat);
  handle.position.set(0.048, 0.05, 0); handle.rotation.z = -Math.PI / 2;
  const labelTex = canvasTex(128, 64, (ctx) => {
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = '#4a2f1d'; ctx.textAlign = 'center';
    ctx.font = '12px "Fira Code", monospace'; ctx.fillText('☕ pwd:', 64, 22);
    ctx.font = 'bold 24px "Fira Code", monospace'; ctx.fillText('nexus', 64, 50);
  });
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.035),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, toneMapped: false })
  );
  label.position.set(0, 0.05, -0.0455); label.rotation.y = Math.PI; // oculta al inicio
  mug.add(body, coffee, handle, label, blob(0.09, 0.3));
  mug.userData.tag = 'mug';
  mug.userData.hint = '☕ Nota bajo la taza: en CampusOS la clave está en tus apuntes (SELECTme). En Banco Nexus usa «nexus».';
  g.add(mug);

  // --- Cuaderno abierto interactivo (lado izquierdo del escritorio) ---
  const nbBaseY = DY + 0.008;
  const notebook = new THREE.Group();
  notebook.position.set(-0.60, nbBaseY, 0.26);
  notebook.rotation.y = 0.14;
  const nbCoverMat = M(0x1e3a8a, { roughness: 0.7, emissive: 0x3b82f6, emissiveIntensity: 0 });
  const nbCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.012, 0.21),
    nbCoverMat
  );
  const nbTex = canvasTex(256, 192, (ctx) => {
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1;
    for (let y = 26; y < 180; y += 18) {
      ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(246, y); ctx.stroke();
    }
    ctx.strokeStyle = '#fca5a5';
    ctx.beginPath(); ctx.moveTo(128, 8); ctx.lineTo(128, 184); ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('Apuntes SQL', 18, 22);
    ctx.font = '11px monospace';
    ctx.fillText('SELECT * FROM ...', 18, 56);
    ctx.fillText('WHERE ... LIKE ...', 18, 74);
    ctx.fillText('Clave: SELECTme', 136, 56);
  });
  const nbPagesMat = M(0xffffff, { map: nbTex, roughness: 0.9, emissive: 0xfef3c7, emissiveIntensity: 0 });
  const nbPages = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.014, 0.19),
    nbPagesMat
  );
  nbPages.position.y = 0.004;
  const pen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8),
    M(0x0f172a, { roughness: 0.3, metalness: 0.6 })
  );
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.4;
  pen.position.set(0.04, 0.015, 0.02);
  notebook.add(nbCover, nbPages, pen);
  notebook.userData.tag = 'notebook';
  notebook.userData.hint = '📒 Cuaderno de apuntes (5 temas SQL + clave SELECTme)';
  g.add(notebook);

  // --- Celular ---
  const phoneBaseY = DY;
  const phone = new THREE.Group(); phone.position.set(0.58, phoneBaseY, 0.08); phone.rotation.y = -0.32;
  const pBodyMat = M(0x141720, { roughness: 0.3, metalness: 0.35, emissive: 0x3b82f6, emissiveIntensity: 0 });
  const pBody = box(0.082, 0.013, 0.165, pBodyMat); pBody.position.y = 0.0065;
  const phoneCanvas = document.createElement('canvas');
  phoneCanvas.width = 128; phoneCanvas.height = 256;
  const phoneCtx = phoneCanvas.getContext('2d');
  const phoneTex = new THREE.CanvasTexture(phoneCanvas);
  phoneTex.colorSpace = THREE.SRGBColorSpace;
  phoneTex.anisotropy = 4;

  function drawPhone() {
    const ctx = phoneCtx;
    const isCampus = currentScenario === 1;
    const grad = ctx.createLinearGradient(0, 0, 128, 256);
    grad.addColorStop(0, '#1e1036');
    grad.addColorStop(0.55, '#0b0e18');
    grad.addColorStop(1, '#261420');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#ffffff'; ctx.font = '300 32px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(isCampus ? '10:20' : '23:47', 64, 68);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(8, 108, 112, 68);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.strokeRect(8, 108, 112, 68);
    ctx.fillStyle = isCampus ? '#34d399' : '#f59e0b'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(isCampus ? 'BD · Supervivientes' : 'Riesgos · ahora', 14, 126);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '10px Inter, sans-serif';
    ctx.fillText(isCampus ? 'Diego: ¿Alguien' : 'Saldos en rojo:', 14, 144);
    ctx.fillText(isCampus ? 'entendió SQL?' : 'URGENTE ⚠', 14, 158);
    phoneTex.needsUpdate = true;
  }
  drawPhone();

  const pScreenMat = new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false });
  const pScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.152), pScreenMat);
  pScreen.rotation.x = -Math.PI / 2; pScreen.position.y = 0.0135;
  phone.add(pBody, pScreen);
  phone.userData.tag = 'phone';
  phone.userData.hint = '📱 Mensajes nuevos en el celular';
  g.add(phone);

  // --- Post-its ---
  function postit(bg, lines, hint) {
    const tex = canvasTex(128, 128, (ctx) => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.font = 'bold 15px "Fira Code", monospace';
      lines.forEach((l, i) => ctx.fillText(l, 10, 40 + i * 24));
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), M(0xffffff, { map: tex, roughness: 0.9 }));
    p.userData.tag = 'postit'; p.userData.hint = hint;
    return p;
  }
  const p1 = postit('#fde68a', ['pwd?', '☕ mira la', 'taza'], '📝 Post-it: «pwd? ☕ mira la taza». El café guarda secretos.');
  p1.position.set(0.24, 1.1, -0.158); p1.rotation.z = 0.06;
  const p2 = postit('#fbcfe8', ['SELECT', '≠ DELETE', '😱'], '📝 Post-it: «SELECT ≠ DELETE 😱». Regla de oro del DBA.');
  p2.rotation.x = -Math.PI / 2; p2.rotation.z = 0.3; p2.position.set(-0.30, DY + 0.002, 0.42);
  const p3 = postit('#bbf7d0', ['SLA 120s', '¡corre!'], '📝 Post-it: «SLA 120s ¡corre!». Los tickets no esperan.');
  p3.rotation.x = -Math.PI / 2; p3.rotation.z = -0.2; p3.position.set(-0.34, DY + 0.002, 0.20);
  g.add(p1, p2, p3);

  // ================= HITBOXES INVISIBLES =================
  // Agrandan el área raycastable de celular, cuaderno y taza sin alterar la geometría visible.
  const hitMat = () => new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, depthTest: true,
  });

  const phoneHitbox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.26), hitMat());
  phoneHitbox.position.set(0.58, DY + 0.05, 0.08);
  phoneHitbox.rotation.y = -0.32;
  phoneHitbox.userData.tag = 'phone';
  phoneHitbox.userData.hint = phone.userData.hint;
  g.add(phoneHitbox);

  const notebookHitbox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.30), hitMat());
  notebookHitbox.position.set(-0.60, DY + 0.04, 0.26);
  notebookHitbox.rotation.y = 0.14;
  notebookHitbox.userData.tag = 'notebook';
  notebookHitbox.userData.hint = notebook.userData.hint;
  g.add(notebookHitbox);

  const mugHitbox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), hitMat());
  mugHitbox.position.set(-0.58, DY + 0.07, -0.04);
  mugHitbox.userData.tag = 'mug';
  mugHitbox.userData.hint = mug.userData.hint;
  g.add(mugHitbox);

  // --- estado / API del escritorio ---
  let mugOpen = false, mugTarget = 0, clockAcc = 0, blink = true;
  let phoneHover = 0, notebookHover = 0, mugHover = 0;

  return {
    group: g,
    interactives: [monitor, mug, mugHitbox, phone, phoneHitbox, notebook, notebookHitbox, p1, p2, p3],
    screenCenter,
    get mugOpen() { return mugOpen; },
    setScenario(id) {
      currentScenario = id;
      drawLock(blink);
      drawPhone();
    },
    toggleMug() { mugOpen = !mugOpen; mugTarget = mugOpen ? Math.PI : 0; return mugOpen; },
    setScreenHover(h) { screen.material.color.setScalar(h ? 1.18 : 1); },
    setItemHover(tag) {
      // Feedback visual claro (elevación + escala + brillo emisivo) al pasar el cursor
      phoneHover += ((tag === 'phone' ? 1 : 0) - phoneHover) * 0.25;
      notebookHover += ((tag === 'notebook' ? 1 : 0) - notebookHover) * 0.25;
      mugHover += ((tag === 'mug' ? 1 : 0) - mugHover) * 0.25;

      phone.scale.setScalar(1 + phoneHover * 0.10);
      phone.position.y = phoneBaseY + phoneHover * 0.012;
      pBodyMat.emissiveIntensity = phoneHover * 0.55;
      pScreenMat.color.setScalar(1 + phoneHover * 0.28);

      notebook.scale.setScalar(1 + notebookHover * 0.07);
      notebook.position.y = nbBaseY + notebookHover * 0.010;
      nbCoverMat.emissiveIntensity = notebookHover * 0.45;
      nbPagesMat.emissiveIntensity = notebookHover * 0.18;

      mug.scale.setScalar(1 + mugHover * 0.10);
      mug.position.y = mugBaseY + mugHover * 0.010;
      mugMat.emissiveIntensity = mugHover * 0.32;
    },
    update(t, dt) {
      mug.rotation.y += (mugTarget - mug.rotation.y) * Math.min(1, dt * 6);
      clockAcc += dt;
      if (clockAcc >= 1) { clockAcc = 0; blink = !blink; drawLock(blink); }
    },
  };
}

// ---------- Cáscara de habitación ----------
function room(floorColor, wallColor, withCeiling = false) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), M(floorColor, { roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.4), M(wallColor));
  back.position.set(0, 1.7, -4.2);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.4), M(wallColor));
  left.rotation.y = Math.PI / 2; left.position.set(-4.6, 1.7, -0.5);
  const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = 4.6;
  g.add(floor, back, left, right);
  if (withCeiling) {
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), M(wallColor));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.1;
    g.add(ceil);
  }
  return g;
}

// ---------- Escenario 1: Aula cálida de día ----------
function buildAula() {
  const g = room(0x9c7a52, 0xd8cdb4);
  g.add(new THREE.HemisphereLight(0xfff2dd, 0x6b5a44, 0.9));
  const sun = new THREE.DirectionalLight(0xffdfae, 2.0);
  sun.position.set(-3, 3.4, 1.5);
  g.add(sun);

  // Pizarra con tiza
  const chalkTex = canvasTex(1024, 448, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#2f4f3e'); grad.addColorStop(1, '#26402f');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = '30px "Fira Code", monospace';
    ctx.fillText('Clase 7 · SQL', 48, 70);
    ctx.font = '26px "Fira Code", monospace';
    ctx.fillText('SELECT nombre, saldo', 48, 150);
    ctx.fillText('FROM clientes', 48, 195);
    ctx.fillText('WHERE saldo < 0;', 48, 240);
    ctx.fillStyle = 'rgba(253,230,138,0.9)';
    ctx.fillText('-- DROP TABLE Life;  /* jamás en prod */', 48, 330);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(48, 90); ctx.lineTo(330, 92); ctx.stroke();
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.5),
    new THREE.MeshBasicMaterial({ map: chalkTex, toneMapped: false }));
  board.position.set(0.4, 1.75, -4.15);
  const frame = box(3.56, 1.66, 0.05, M(0x7a5c3a)); frame.position.set(0.4, 1.75, -4.18);
  g.add(frame, board);

  // Ventana cálida izquierda
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.6),
    new THREE.MeshBasicMaterial({ color: 0xfff3d6, toneMapped: false, fog: false }));
  win.rotation.y = Math.PI / 2; win.position.set(-4.55, 1.9, -0.5);
  const winFrame = box(0.06, 1.72, 2.12, M(0x8a6b4a)); winFrame.position.set(-4.58, 1.9, -0.5);
  g.add(winFrame, win);

  // Pupitres + compañeros
  const persons = [];
  const shirts = [0x7f8ea3, 0xa37f7f, 0x86a37f, 0x9b8ea3, 0xa39b7f, 0x7fa39b];
  let pi = 0;
  for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c++) {
    const x = c * 1.5 + (r ? 0.3 : 0), z = -1.9 - r * 1.15;
    const desk = box(0.7, 0.04, 0.45, M(0x8a6b4a)); desk.position.set(x, 0.72, z);
    const ped = box(0.08, 0.72, 0.08, M(0x4a3a28)); ped.position.set(x, 0.36, z);
    const person = seatedPerson(shirts[pi++ % shirts.length]);
    person.position.set(x, 0, z - 0.42);
    persons.push(person);
    g.add(desk, ped, person);
  }

  return {
    group: g,
    background: new THREE.Color(0xcfc2a8),
    fog: new THREE.Fog(0xd8cdb4, 6, 16),
    exposure: 1.05,
    update(t) {
      persons.forEach((p, i) => {
        p.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.02;
        p.userData.head.position.y = 1.0 + Math.sin(t * 1.1 + i) * 0.006;
      });
    },
  };
}

// ---------- Escenario 2: Oficina bancaria de día ----------
function buildOficina() {
  const g = room(0x545e6e, 0xb9c2cf, true);
  g.add(new THREE.HemisphereLight(0xf4f7ff, 0x39404d, 1.05));
  const day = new THREE.DirectionalLight(0xffffff, 1.6);
  day.position.set(2.5, 3.5, 2);
  g.add(day);

  [[-1.5, -1], [1.5, -1], [-1.5, -3], [1.5, -3]].forEach(([x, z]) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc, toneMapped: false, fog: false }));
    panel.rotation.x = Math.PI / 2; panel.position.set(x, 3.08, z);
    g.add(panel);
  });

  const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 2),
    new THREE.MeshBasicMaterial({ color: 0xeaf2ff, toneMapped: false, fog: false }));
  win.rotation.y = -Math.PI / 2; win.position.set(4.55, 1.8, -1.5);
  g.add(win);

  const signTex = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(30, 40, 48, 48);
    ctx.fillStyle = '#1e293b'; ctx.font = '700 52px Inter, sans-serif';
    ctx.fillText('BANCO NEXUS', 100, 82);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
  sign.position.set(0, 2.4, -4.15);
  g.add(sign);

  const sheetTex = canvasTex(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 0, w, 22);
    ctx.strokeStyle = '#cbd5e1';
    for (let y = 22; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let x = 0; x < w; x += 42) { ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.font = '11px "Fira Code", monospace';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
      ctx.fillStyle = Math.random() < 0.2 ? '#dc2626' : '#334155';
      ctx.fillText(String(Math.floor(Math.random() * 9000)), c * 42 + 6, 40 + r * 20);
    }
  });
  const persons = [];
  const shirts = [0x5b7fa6, 0xa65b5b, 0x5ba67f, 0x8a6bb0];
  let si = 0;
  [[-1.9, -1.3, 0.25], [1.9, -1.3, -0.25], [-1.9, -2.7, 0.25], [1.9, -2.7, -0.25]].forEach(([x, z, ry]) => {
    const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = ry;
    const pBack = box(1.5, 1.35, 0.05, M(0x8b95a5, { roughness: 1 })); pBack.position.set(0, 0.675, -0.55);
    const pSide = box(0.05, 1.35, 1.1, M(0x8b95a5, { roughness: 1 })); pSide.position.set(-0.75, 0.675, 0);
    const dTop = box(1.2, 0.04, 0.6, M(0xd7dbe2)); dTop.position.y = 0.74;
    const bez = box(0.4, 0.26, 0.03, M(0x14161c)); bez.position.set(0, 1.0, -0.25);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22),
      new THREE.MeshBasicMaterial({ map: sheetTex, toneMapped: false }));
    scr.position.set(0, 1.0, -0.233);
    const person = seatedPerson(shirts[si++ % shirts.length]);
    person.position.set(0, 0, -0.12);
    persons.push(person);
    st.add(pBack, pSide, dTop, bez, scr, person, blob(0.8, 0.22));
    g.add(st);
  });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 8), M(0x9a5b3c));
  pot.position.set(2.6, 0.12, -3.6);
  const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), M(0x3f7a4a));
  leaf1.position.set(2.6, 0.5, -3.6);
  const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), M(0x4c8f57));
  leaf2.position.set(2.72, 0.68, -3.55);
  g.add(pot, leaf1, leaf2, blob(0.3, 0.25));

  return {
    group: g,
    background: new THREE.Color(0xaeb8c6),
    fog: new THREE.Fog(0xb9c2cf, 7, 18),
    exposure: 1.1,
    update(t) {
      persons.forEach((p, i) => {
        p.rotation.z = Math.sin(t * 0.9 + i * 2.1) * 0.018;
        p.userData.head.rotation.y = Math.sin(t * 0.5 + i) * 0.15;
      });
    },
  };
}

// ---------- Escenario 3: Guardia nocturna (clima halloween.dev) ----------
function buildNoche() {
  const g = room(0x11151f, 0x0d1119, true);
  g.add(new THREE.HemisphereLight(0x2a3550, 0x05070c, 0.22));
  const moon = new THREE.DirectionalLight(0x7fa8ff, 0.5);
  moon.position.set(0, 3, -3);
  g.add(moon);

  const cityTex = canvasTex(1024, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05070f'); sky.addColorStop(1, '#0b1226');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * w, Math.random() * h * 0.5, 1.5, 1.5);
    }
    ctx.fillStyle = '#e8ecf5'; ctx.beginPath(); ctx.arc(830, 85, 34, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(232,236,245,0.12)'; ctx.beginPath(); ctx.arc(830, 85, 52, 0, 7); ctx.fill();
    const winColors = ['#ffd27f', '#9fd8ff', '#fff2cc', '#ff9f6e'];
    let x = 0;
    while (x < w) {
      const bw = 40 + Math.random() * 60, bh = 120 + Math.random() * 230;
      ctx.fillStyle = '#0a0f1c'; ctx.fillRect(x, h - bh, bw, bh);
      for (let wy = h - bh + 10; wy < h - 12; wy += 14) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 12) {
          if (Math.random() < 0.28) {
            ctx.fillStyle = winColors[Math.floor(Math.random() * winColors.length)];
            ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            ctx.fillRect(wx, wy, 6, 8);
            ctx.globalAlpha = 1;
          }
        }
      }
      if (Math.random() < 0.4) {
        ctx.fillStyle = '#ff3344'; ctx.fillRect(x + bw / 2, h - bh - 4, 3, 3);
      }
      x += bw + 4;
    }
  });
  const city = new THREE.Mesh(new THREE.PlaneGeometry(10, 5),
    new THREE.MeshBasicMaterial({ map: cityTex, toneMapped: false, fog: false }));
  city.position.set(0, 1.9, -6.5);
  g.add(city);

  const wallMat = M(0x0d1119);
  const wL = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.4), wallMat); wL.position.set(-4.75, 1.7, -4.2);
  const wR = wL.clone(); wR.position.x = 4.75;
  const wB = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.65), wallMat); wB.position.set(0, 0.325, -4.2);
  const wT = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.55), wallMat); wT.position.set(0, 3.125, -4.2);
  const frameMat = M(0x1c2230, { metalness: 0.4, roughness: 0.4 });
  const fH1 = box(5.1, 0.07, 0.08, frameMat); fH1.position.set(0, 0.66, -4.19);
  const fH2 = fH1.clone(); fH2.position.y = 2.85;
  const fV1 = box(0.07, 2.26, 0.08, frameMat); fV1.position.set(-2.5, 1.75, -4.19);
  const fV2 = fV1.clone(); fV2.position.x = 2.5;
  const fV3 = fV1.clone(); fV3.position.x = 0;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2),
    new THREE.MeshBasicMaterial({ color: 0x9fc0ff, transparent: true, opacity: 0.07, depthWrite: false }));
  glass.position.set(0, 1.75, -4.18);
  g.add(wL, wR, wB, wT, fH1, fH2, fV1, fV2, fV3, glass);

  const lamp = new THREE.Group(); lamp.position.set(-0.78, 0.78, -0.28);
  const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 10), M(0x1c202a, { metalness: 0.5 }));
  lBase.position.y = 0.01;
  const arm1 = box(0.02, 0.3, 0.02, M(0x1c202a, { metalness: 0.5 }));
  arm1.position.set(0.05, 0.16, 0); arm1.rotation.z = -0.35;
  const arm2 = box(0.02, 0.26, 0.02, M(0x1c202a, { metalness: 0.5 }));
  arm2.position.set(0.16, 0.36, 0); arm2.rotation.z = 1.1;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 10, 1, true), M(0x22262f, { metalness: 0.5, side: THREE.DoubleSide }));
  head.position.set(0.28, 0.4, 0); head.rotation.z = 2.4;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9c4, toneMapped: false }));
  bulb.position.set(0.3, 0.37, 0);
  const spot = new THREE.SpotLight(0xffd9a3, 15, 5, 0.6, 0.7, 1.5);
  spot.position.set(0.3, 0.37, 0);
  spot.target.position.set(0.9, 0, 0.4);
  lamp.add(lBase, arm1, arm2, head, bulb, spot, spot.target);
  g.add(lamp);

  const cab = box(0.6, 0.9, 0.5, M(0x161b26)); cab.position.set(2.2, 0.45, -2.6);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x330a0e, emissive: 0xff2233, emissiveIntensity: 1.5 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 10), beaconMat);
  beacon.position.set(2.2, 0.95, -2.6);
  const alert = new THREE.PointLight(0xff3344, 2, 5, 1.6);
  alert.position.set(2.2, 1.15, -2.6);
  g.add(cab, beacon, alert, blob(0.45, 0.3));

  return {
    group: g,
    background: new THREE.Color(0x05070c),
    fog: new THREE.Fog(0x05070c, 4.5, 13),
    exposure: 1.0,
    update(t) {
      const pulse = (Math.sin(t * 2.2) + 1) / 2;
      alert.intensity = 1.2 + 3 * pulse;
      beaconMat.emissiveIntensity = 0.6 + 2.4 * pulse;
      spot.intensity = 15 * (0.96 + 0.04 * Math.sin(t * 13.7) * Math.sin(t * 7.3));
    },
  };
}

export function buildEnvironment(id) {
  if (id === 1) return buildAula();
  if (id === 2) return buildOficina();
  return buildNoche();
}