// engine.js · Renderer, cámara con mouse-look suave, raycaster y camera lerp al monitor.
import * as THREE from 'three';
import { buildDesk, buildEnvironment, disposeObject, disposeSharedTextures } from './world.js';

const BASE_POS = new THREE.Vector3(0, 1.32, 1.85);
const BASE_LOOK = new THREE.Vector3(0, 1.1, -0.15);
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Etiquetas de prompt por objeto interactivo
const PROMPT_LABELS = {
  monitor: 'Usar ordenador',
  phone: 'Revisar móvil',
  notebook: 'Abrir cuaderno',
  mug: 'Girar taza',
  postit: 'Leer post-it',
};

export function createEngine(container, cb) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 60);
  camera.position.copy(BASE_POS);
  const curLook = BASE_LOOK.clone();
  camera.lookAt(curLook);

  const desk = buildDesk();
  scene.add(desk.group);
  let env = null;

  // modo: 'idle' (menú) | 'look' | 'zoom-in' | 'inside' | 'zoom-out'
  let mode = 'idle';
  let modalOpen = false;
  let running = true, raf = 0, t = 0, last = performance.now();
  let tween = null;
  let dolly = BASE_POS.z;
  const pointer = new THREE.Vector2(0, 0);
  let pointerInside = false;
  const raycaster = new THREE.Raycaster();
  let hovered = null;
  let lastPromptTag = null; // null | 'monitor' | 'phone' | 'notebook' | 'mug' | 'postit'

  function setScenario(id) {
    if (env) { scene.remove(env.group); disposeObject(env.group); }
    env = buildEnvironment(id);
    scene.add(env.group);
    scene.background = env.background;
    scene.fog = env.fog;
    renderer.toneMappingExposure = env.exposure;
    desk.setScenario?.(id);
  }
  setScenario(1);

  function startTween(toPos, toLook, toFov, dur, onDone) {
    tween = {
      t: 0, dur, onDone,
      fromPos: camera.position.clone(), toPos: toPos.clone(),
      fromLook: curLook.clone(), toLook: toLook.clone(),
      fromFov: camera.fov, toFov,
    };
  }

  function enterMonitor() {
    if (mode !== 'look' || modalOpen) return;
    mode = 'zoom-in';
    cb.onTransition?.(true);
    cb.onPrompt?.(null);
    const end = desk.screenCenter.clone().add(new THREE.Vector3(0, 0, 0.28));
    startTween(end, desk.screenCenter, 36, 1.6, () => {
      mode = 'inside';
      cb.onTransition?.(false);
      cb.onEnterMonitor?.();
    });
  }

  function returnToDesk() {
    mode = 'zoom-out';
    cb.onTransition?.(true);
    startTween(BASE_POS, BASE_LOOK, 50, 1.2, () => {
      mode = 'look';
      dolly = BASE_POS.z;
      curLook.copy(BASE_LOOK);
      cb.onTransition?.(false);
    });
  }

  // --- entrada (NDC estándar de Three.js: x ∈ [-1,1] izq→der, y ∈ [-1,1] abajo→arriba) ---
  function updatePointerFromEvent(e) {
    const r = renderer.domElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    pointerInside = true;
  }

  function pickInteractive() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(desk.interactives, true);
    for (let i = 0; i < hits.length; i++) {
      let o = hits[i].object;
      while (o && !o.userData.tag) o = o.parent;
      if (o) return o;
    }
    return null;
  }

  function onPointerMove(e) {
    updatePointerFromEvent(e);
  }
  function onPointerLeave() { pointerInside = false; }
  function onClick(e) {
    if (mode !== 'look' || modalOpen) return;
    updatePointerFromEvent(e);
    const target = pickInteractive() || hovered;
    if (!target) return;
    const tag = target.userData.tag;
    if (tag === 'monitor') { enterMonitor(); return; }
    if (tag === 'phone') { cb.onOpenPhone?.(); return; }
    if (tag === 'notebook') { cb.onOpenNotebook?.(); return; }
    if (tag === 'mug') {
      const open = desk.toggleMug();
      cb.onHint?.(
        open
          ? (target.userData.hint || '☕ Nota bajo la taza: en CampusOS la clave está en tus apuntes (SELECTme). En Banco Nexus usa «nexus».')
          : '☕ La taza vuelve a su posición.'
      );
      return;
    }
    if (target.userData.hint) cb.onHint?.(target.userData.hint);
  }
  function onWheel(e) {
    if (mode !== 'look' || modalOpen) return;
    e.preventDefault();
    dolly = THREE.MathUtils.clamp(dolly + Math.sign(e.deltaY) * 0.12, 1.35, 2.25);
  }
  function onKey(e) {
    if (modalOpen) return;
    // E solo entra al monitor (que es la acción "primaria" del escritorio)
    if ((e.key === 'e' || e.key === 'E') && lastPromptTag === 'monitor' && mode === 'look') enterMonitor();
    if (e.key === 'Escape' && mode === 'look') cb.onEscape?.();
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);

  const ro = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  // --- bucle ---
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; t += dt;

    desk.update(t, dt);
    env?.update(t, dt);

    if (tween) {
      tween.t += dt;
      const k = easeInOutCubic(Math.min(tween.t / tween.dur, 1));
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      curLook.lerpVectors(tween.fromLook, tween.toLook, k);
      camera.fov = THREE.MathUtils.lerp(tween.fromFov, tween.toFov, k);
      camera.updateProjectionMatrix();
      camera.lookAt(curLook);
      if (k >= 1) { const done = tween.onDone; tween = null; done(); }
    } else if (mode === 'look' && !modalOpen) {
      const nx = pointerInside ? pointer.x : 0;
      const ny = pointerInside ? pointer.y : 0;
      const damp = 1 - Math.exp(-dt * 3.5);
      const targetPos = new THREE.Vector3(
        BASE_POS.x + nx * 0.38,
        Math.max(1.05, BASE_POS.y + ny * 0.16) + Math.sin(t * 1.2) * 0.004,
        dolly
      );
      const targetLook = new THREE.Vector3(
        BASE_LOOK.x + nx * 0.55,
        BASE_LOOK.y + ny * 0.3,
        BASE_LOOK.z
      );
      camera.position.lerp(targetPos, damp);
      curLook.lerp(targetLook, damp);
      camera.lookAt(curLook);
    } else if (mode === 'idle') {
      const damp = 1 - Math.exp(-dt * 2);
      camera.position.lerp(new THREE.Vector3(
        BASE_POS.x + Math.sin(t * 0.25) * 0.12,
        BASE_POS.y + Math.sin(t * 0.18) * 0.05,
        BASE_POS.z
      ), damp);
      curLook.lerp(new THREE.Vector3(BASE_LOOK.x + Math.sin(t * 0.2) * 0.1, BASE_LOOK.y, BASE_LOOK.z), damp);
      camera.lookAt(curLook);
    }

    // Raycast
    hovered = null;
    if (mode === 'look' && !modalOpen && pointerInside) {
      hovered = pickInteractive();
    }

    // Prompt contextual: si hay objeto bajo el cursor → su etiqueta; si está muy cerca → monitor
    const near = mode === 'look' && !modalOpen && dolly < 1.5;
    let promptTag = null;
    if (mode === 'look' && !modalOpen) {
      const hovTag = hovered?.userData.tag;
      if (hovTag && PROMPT_LABELS[hovTag]) {
        promptTag = hovTag;
      } else if (near) {
        promptTag = 'monitor';
      }
    }
    if (promptTag !== lastPromptTag) {
      lastPromptTag = promptTag;
      cb.onPrompt?.(promptTag);
    }

    // Feedback visual
    desk.setScreenHover(hovered?.userData.tag === 'monitor');
    desk.setItemHover?.(hovered?.userData.tag || null);
    container.style.cursor = hovered && !modalOpen ? 'pointer' : 'default';

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setScenario,
    setModalOpen(v) {
      modalOpen = !!v;
      if (modalOpen) {
        hovered = null;
        if (lastPromptTag) {
          lastPromptTag = null;
          cb.onPrompt?.(null);
        }
        container.style.cursor = 'default';
      }
    },
    setLookEnabled(v) {
      if (tween || mode === 'inside') return;
      mode = v ? 'look' : 'idle';
      if (!v && lastPromptTag) {
        lastPromptTag = null;
        cb.onPrompt?.(null);
      }
    },
    setActive(v) {
      if (v && !running) {
        running = true; last = performance.now();
        if (mode === 'inside') returnToDesk();
        raf = requestAnimationFrame(frame);
      } else if (!v && running) {
        running = false; cancelAnimationFrame(raf);
      }
    },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      disposeObject(scene);
      disposeSharedTextures();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}