import { useState, useEffect, useRef } from 'preact/hooks';
import initSqlJs from 'sql.js';
import nivel1 from '../../../../content/nivel1.json';
import nivel1Variantes from '../../../../content/nivel1_variantes.json';
import { TutorRL, validarConsulta } from '../../tutor/tutorRL.js';

let sqlJsPromise = null;

async function cargarSqlJs() {
  if (sqlJsPromise) return sqlJsPromise;
  sqlJsPromise = (async () => {
    const initFn = typeof initSqlJs === 'function' ? initSqlJs : initSqlJs?.default;
    if (typeof initFn !== 'function') {
      throw new Error('No se pudo resolver initSqlJs desde el paquete sql.js.');
    }

    const base = (import.meta.env?.BASE_URL || './').replace(/\/?$/, '/');
    const candidatos = Array.from(
      new Set([`${base}sql-wasm.wasm`, './sql-wasm.wasm', '/sql-wasm.wasm'])
    );

    let wasmBinary = null;
    const errores = [];

    for (const url of candidatos) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          errores.push(`${url} (HTTP ${res.status})`);
          continue;
        }
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        // Validar firma binaria WASM: "\0asm"
        if (
          bytes.length >= 4 &&
          bytes[0] === 0x00 &&
          bytes[1] === 0x61 &&
          bytes[2] === 0x73 &&
          bytes[3] === 0x6d
        ) {
          wasmBinary = buf;
          break;
        }
        errores.push(`${url} (respuesta no WASM)`);
      } catch (e) {
        errores.push(`${url} (${e.message})`);
      }
    }

    if (wasmBinary) {
      return await initFn({ wasmBinary });
    }

    try {
      return await initFn({ locateFile: (f) => `${base}${f}` });
    } catch (e) {
      throw new Error(
        `No se pudo cargar sql-wasm.wasm (${errores.join(', ') || e.message}). Verifica que exista en web/public/sql-wasm.wasm.`
      );
    }
  })().catch((err) => {
    sqlJsPromise = null;
    throw err;
  });
  return sqlJsPromise;
}

const PARCIAL_SEGUNDOS = 300;
const CHAT_EXTRAS_KEY = 'campusos_chat_extras_v1';

const REACCIONES_BLOQUE = {
  1: {
    de: 'Diego',
    texto: '¡Buena! Ya dominaste el SELECT. ¿Me pasas un tip para la siguiente? 😅',
  },
  2: {
    de: 'Docente — Aula virtual',
    texto: 'Correcto. Filtrar con WHERE evita traer filas innecesarias de la tabla.',
  },
  3: {
    de: 'Diego',
    texto: '¡Ese combo de BETWEEN, LIKE e IN estuvo brutal! Ya casi llegamos al parcial 🔥',
  },
  4: {
    de: 'Docente — Aula virtual',
    texto: 'Excelente uso de DISTINCT y ORDER BY. Estás listo para el reto del parcial.',
  },
  5: {
    de: 'Diego',
    texto: '¡Sobreviviste al parcial! Revisa el chat y el correo de Banco Nexus 🎓',
  },
};

function formatTiempoMMSS(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function generarChipsSql(bloque, bdActual) {
  if (!bloque || (bloque.numero !== 1 && bloque.numero !== 2)) return [];
  const esperada = bloque.consulta_esperada || '';
  const tokensEsperados =
    esperada.match(/'[^']*'|>=|<=|!=|<>|[=><,;*]|\b[a-zA-Z_][a-zA-Z0-9_]*\b|\b\d+(?:\.\d+)?\b/g) || [];

  const tablas = bdActual?.esquema_er?.tablas || [];
  const fromMatch = esperada.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  const tablaObjetivo = fromMatch
    ? tablas.find((t) => t.nombre.toLowerCase() === fromMatch[1].toLowerCase())
    : null;

  const keywordsBase =
    bloque.numero === 1
      ? ['SELECT', '*', 'FROM']
      : ['SELECT', '*', 'FROM', 'WHERE', 'AND', 'OR'];

  const kwSet = new Set(['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'AS', 'NOT', 'IN', 'IS', 'NULL']);
  const seen = new Set();
  const chips = [];

  const pushChip = (token, tipo) => {
    const clean = String(token).trim();
    if (!clean) return;
    const key = clean.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    chips.push({ token: clean, tipo });
  };

  keywordsBase.forEach((kw) => pushChip(kw, 'kw'));

  if (tablaObjetivo) {
    pushChip(tablaObjetivo.nombre, 'table');
  }
  for (const t of tablas) {
    if (!tablaObjetivo || t.nombre !== tablaObjetivo.nombre) {
      pushChip(t.nombre, 'table');
    }
  }

  for (const tk of tokensEsperados) {
    if (kwSet.has(tk.toUpperCase())) pushChip(tk.toUpperCase(), 'kw');
  }

  // Columnas usadas en la consulta esperada + columnas de la tabla objetivo
  const colNamesTabla = new Set((tablaObjetivo?.columnas || []).map((c) => c.nombre.toLowerCase()));
  for (const tk of tokensEsperados) {
    if (colNamesTabla.has(tk.toLowerCase())) {
      pushChip(tk, 'col');
    }
  }
  for (const c of tablaObjetivo?.columnas || []) {
    pushChip(c.nombre, 'col');
  }

  // Operadores y literales de la variante activa
  for (const tk of tokensEsperados) {
    if (/^(>=|<=|!=|<>|=|>|<)$/.test(tk)) pushChip(tk, 'op');
  }
  if (bloque.numero === 2) {
    ['=', '>', '<', '>=', '<='].forEach((op) => pushChip(op, 'op'));
  }
  for (const tk of tokensEsperados) {
    if (/^'[^']*'$/.test(tk) || /^\d+(?:\.\d+)?$/.test(tk)) {
      pushChip(tk, 'lit');
    }
  }

  [',', ';'].forEach((p) => pushChip(p, 'punct'));
  return chips;
}

function calcularFiltroStats(db, sqlUsuario, bdActual, filasResultado) {
  if (!db || !sqlUsuario) return null;
  const sqlSinLiterales = sqlUsuario.replace(/\/\*[\s\S]*?\*\/|--[^\n]*|'(?:''|[^'])*'/g, ' ');
  const match = sqlSinLiterales.match(/\bFROM\s+["'`]?([a-zA-Z_][a-zA-Z0-9_]*)["'`]?/i);
  if (!match) return null;
  const tablas = bdActual?.esquema_er?.tablas || [];
  const tablaObj = tablas.find((t) => t.nombre.toLowerCase() === match[1].toLowerCase());
  if (!tablaObj) return null;
  try {
    const res = db.exec(`SELECT COUNT(*) FROM "${tablaObj.nombre}";`);
    const total = Number(res?.[0]?.values?.[0]?.[0] ?? 0);
    return {
      tabla: tablaObj.nombre,
      total,
      filtradas: Number(filasResultado || 0),
    };
  } catch {
    return null;
  }
}

function pushChatReaction(bloque, reaccion) {
  try {
    const raw = localStorage.getItem(CHAT_EXTRAS_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(prev) ? prev : [];
    const yaExiste = list.some((m) => m.bloqueId === bloque.id);
    const hora = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const msg = {
      id: `${bloque.id}_${Date.now()}`,
      bloqueId: bloque.id,
      bloque: bloque.numero,
      de: reaccion.de,
      texto: reaccion.texto,
      hora,
    };
    const next = yaExiste
      ? list.map((m) => (m.bloqueId === bloque.id ? msg : m))
      : [...list, msg];
    localStorage.setItem(CHAT_EXTRAS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('nexus:campus-chat-msg', { detail: msg }));
    window.dispatchEvent(new CustomEvent('nexus:chat-nuevo'));
  } catch { /* ignore */ }
}

function crearVariantesAleatorias(bloques) {
  const mapa = {};
  for (const b of bloques) {
    const total = b.variantes?.length || 1;
    mapa[b.id] = Math.floor(Math.random() * total);
  }
  return mapa;
}

export default function AcademyApp({ scenario = 1, activo = true, onGoToNivel2 }) {
  const basesDatos = nivel1Variantes.bases_datos;
  const tutorRef = useRef(new TutorRL());
  const dbRef = useRef(null);
  const editorRef = useRef(null);
  const selloRef = useRef(null);
  const logroRef = useRef(null);
  const tiempoAgotadoRef = useRef(false);

  const [bdIdx, setBdIdx] = useState(0);
  const [variantesPorBloque, setVariantesPorBloque] = useState(() =>
    crearVariantesAleatorias(basesDatos[0].bloques)
  );
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [bloqueIdx, setBloqueIdx] = useState(0);
  const [sql, setSql] = useState(() => {
    const primeraTabla = basesDatos[0].esquema_er.tablas[0]?.nombre || 'estudiantes';
    return `SELECT * FROM ${primeraTabla};`;
  });
  const [quizSel, setQuizSel] = useState(null);
  const [quizOk, setQuizOk] = useState(false);
  const [tabDerecha, setTabDerecha] = useState('resultados'); // 'resultados' | 'bd'
  const [tablaPreview, setTablaPreview] = useState(
    () => basesDatos[0].esquema_er.tablas[0]?.nombre || 'estudiantes'
  );
  const [previewData, setPreviewData] = useState({ columns: [], values: [] });
  const [resultado, setResultado] = useState(null);
  const [tutorMsg, setTutorMsg] = useState({
    estadoVisual: 'esperando',
    mensaje:
      'Hola. No voy a resolver la práctica por ti, pero si te equivocas te daré pistas o un ejemplo más sencillo.',
    ejemploGuiado: null,
    plantilla: null,
  });
  const [usoPista, setUsoPista] = useState(false);
  const [completados, setCompletados] = useState(() => tutorRef.current.estado.completados);
  const [xp, setXp] = useState(() => tutorRef.current.estado.xp);
  const [racha, setRacha] = useState(0);
  const [selloInfo, setSelloInfo] = useState(null);
  const [logroInfo, setLogroInfo] = useState(null);
  const [filtroStats, setFiltroStats] = useState(null);
  const [tiempoParcial, setTiempoParcial] = useState(PARCIAL_SEGUNDOS);
  const [fxSilenciado, setFxSilenciado] = useState(() => Boolean(window.fx?.estado?.().silenciado));

  const bdActual = basesDatos[bdIdx] || basesDatos[0];
  const bloques = bdActual.bloques;
  const bloqueBase = bloques[bloqueIdx] || bloques[0];
  const variantesDisponibles = bloqueBase.variantes || [];
  const varianteIdx =
    variantesDisponibles.length > 0
      ? (variantesPorBloque[bloqueBase.id] ?? 0) % variantesDisponibles.length
      : 0;
  const varianteActual = variantesDisponibles[varianteIdx] || {};

  // Combinar metadatos del bloque + variante activa manteniendo el id del bloque para TutorRL
  const bloque = {
    ...bloqueBase,
    ...varianteActual,
    id: bloqueBase.id,
    varianteId: varianteActual.id || `${bloqueBase.id}_v${varianteIdx + 1}`,
  };

  const todoCompletado = completados.length >= bloques.length;
  const esBloqueParcial = bloque.id === 'b5_parcial' || bloque.numero === 5;
  const parcialCompletado = completados.includes('b5_parcial');
  const chipsSql = generarChipsSql(bloque, bdActual);

  const cargarPreview = (db, nombreTabla) => {
    if (!db || !nombreTabla) return;
    try {
      const res = db.exec(`SELECT * FROM ${nombreTabla} LIMIT 8;`);
      setPreviewData(res[0] || { columns: [], values: [] });
    } catch {
      setPreviewData({ columns: [], values: [] });
    }
  };

  // Emitir cambio de BD para ErViewerApp y recargar sql.js con el esquema activo
  useEffect(() => {
    let mounted = true;
    const primeraTabla = bdActual.esquema_er.tablas[0]?.nombre || '';

    const payload = {
      bdId: bdActual.id,
      nombre: bdActual.nombre,
      descripcion: bdActual.descripcion,
      esquema_er: bdActual.esquema_er,
    };
    window.__campusOsActiveBd = payload;
    window.dispatchEvent(new CustomEvent('nexus:bd-cambio', { detail: payload }));

    setTablaPreview(primeraTabla);
    setDbReady(false);
    setDbError(null);

    cargarSqlJs()
      .then((SQL) => {
        if (!mounted) return;
        const db = new SQL.Database();
        db.run(bdActual.schema_sql);
        dbRef.current?.close?.();
        dbRef.current = db;
        setDbReady(true);
        setDbError(null);
        cargarPreview(db, primeraTabla);
      })
      .catch((err) => {
        console.error('[AcademyApp] Error sql.js:', err);
        if (!mounted) return;
        setDbError(err?.message || 'Error al inicializar sql.js (sql-wasm.wasm).');
        setDbReady(false);
      });

    return () => {
      mounted = false;
    };
  }, [bdActual, reloadTick]);

  // Cerrar DB al desmontar el componente
  useEffect(() => {
    return () => {
      dbRef.current?.close?.();
      dbRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (dbReady && dbRef.current) {
      cargarPreview(dbRef.current, tablaPreview);
    }
  }, [tablaPreview, dbReady]);

  // Sincronizar estado de silencio de fx.js
  useEffect(() => {
    const onSilencio = (e) => setFxSilenciado(Boolean(e.detail?.silenciado));
    window.addEventListener('nexus:fx-silencio', onSilencio);
    return () => window.removeEventListener('nexus:fx-silencio', onSilencio);
  }, []);

  // Disparar nexus:mision-resuelta después de que Preact monte [data-fx="sello"]
  useEffect(() => {
    if (!selloInfo) return;
    const rafId = requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent('nexus:mision-resuelta', {
          detail: {
            id: selloInfo.bloqueId,
            puntos: selloInfo.puntos,
            pasos: 1,
            elemento: selloRef.current,
          },
        })
      );
    });
    return () => cancelAnimationFrame(rafId);
  }, [selloInfo]);

  // Disparar nexus:logro después de que Preact monte [data-fx="logro"]
  useEffect(() => {
    if (!logroInfo) return;
    const rafId = requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent('nexus:logro', {
          detail: {
            id: logroInfo.id,
            nombre: logroInfo.nombre,
            elemento: logroRef.current,
          },
        })
      );
    });
    return () => cancelAnimationFrame(rafId);
  }, [logroInfo]);

  // R4: Reiniciar reloj al entrar al Bloque 5 o cambiar BD
  useEffect(() => {
    if (esBloqueParcial && !parcialCompletado) {
      setTiempoParcial(PARCIAL_SEGUNDOS);
      tiempoAgotadoRef.current = false;
    }
  }, [esBloqueParcial, parcialCompletado, bdIdx]);

  // R4: Temporizador descendente en Bloque 5
  useEffect(() => {
    if (!activo || scenario !== 1 || !esBloqueParcial || parcialCompletado || !dbReady) return;
    const id = setInterval(() => {
      setTiempoParcial((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [activo, scenario, esBloqueParcial, parcialCompletado, dbReady]);

  // R4: Reinicio limpio al llegar a 00:00
  useEffect(() => {
    if (tiempoParcial !== 0) {
      tiempoAgotadoRef.current = false;
      return;
    }
    if (!activo || scenario !== 1 || !esBloqueParcial || parcialCompletado) return;
    if (tiempoAgotadoRef.current) return;
    tiempoAgotadoRef.current = true;

    setSql('');
    setResultado(null);
    setFiltroStats(null);
    setUsoPista(false);
    setRacha(0);
    setSelloInfo(null);
    tutorRef.current.resetearBloque('b5_parcial');
    setTutorMsg({
      estadoVisual: 'esperando',
      mensaje:
        '⏱️ Tiempo agotado (00:00). Se reinició tu intento del Parcial. ¡Respira y vuelve a intentarlo!',
      ejemploGuiado: null,
      plantilla: null,
    });
    window.fx?.play?.('error');
    window.dispatchEvent(
      new CustomEvent('nexus:toast', {
        detail: {
          texto: '⏱️ Tiempo del parcial agotado (00:00). Intento reiniciado.',
          tipo: 'error',
        },
      })
    );
    setTiempoParcial(PARCIAL_SEGUNDOS);
  }, [activo, scenario, esBloqueParcial, parcialCompletado, tiempoParcial]);

  // R4: Ambiente suave de tensión académica en Bloque 5 (sin alterar window.fx.estado().ambiente)
  useEffect(() => {
    if (!activo || scenario !== 1 || !esBloqueParcial || parcialCompletado || !dbReady || fxSilenciado) return;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;

    let audioCtx = null;
    let tickId = null;
    try {
      audioCtx = new AC({ latencyHint: 'interactive' });
      const volBase = Math.max(0.15, Number(window.fx?.estado?.().volumen ?? 0.7));
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(audioCtx.destination);

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      lp.connect(masterGain);

      // Pad armónico suave en La menor (A2 + E3) a ganancia muy baja
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 110;
      const g1 = audioCtx.createGain();
      g1.gain.value = 0.018 * volBase;
      osc1.connect(g1);
      g1.connect(lp);

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 164.81;
      const g2 = audioCtx.createGain();
      g2.gain.value = 0.008 * volBase;
      osc2.connect(g2);
      g2.connect(lp);

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      osc1.start();
      osc2.start();
      masterGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.8);

      // Pulso suave tipo reloj académico cada 2s
      tickId = setInterval(() => {
        if (!audioCtx || audioCtx.state !== 'running') return;
        const t = audioCtx.currentTime;
        const tickOsc = audioCtx.createOscillator();
        const tickGain = audioCtx.createGain();
        tickOsc.type = 'sine';
        tickOsc.frequency.setValueAtTime(520, t);
        tickOsc.frequency.exponentialRampToValueAtTime(340, t + 0.035);
        tickGain.gain.setValueAtTime(0.0001, t);
        tickGain.gain.linearRampToValueAtTime(0.016 * volBase, t + 0.005);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        tickOsc.connect(tickGain);
        tickGain.connect(masterGain);
        tickOsc.start(t);
        tickOsc.stop(t + 0.08);
      }, 2000);

      return () => {
        if (tickId) clearInterval(tickId);
        try {
          masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.15);
        } catch { /* ignore */ }
        setTimeout(() => {
          try { osc1.stop(); } catch { /* ignore */ }
          try { osc2.stop(); } catch { /* ignore */ }
          try { audioCtx.close(); } catch { /* ignore */ }
        }, 250);
      };
    } catch {
      if (tickId) clearInterval(tickId);
      try { audioCtx?.close(); } catch { /* ignore */ }
    }
  }, [activo, scenario, esBloqueParcial, parcialCompletado, dbReady, fxSilenciado]);

  const seleccionarBd = (nuevoIdx) => {
    const idxValido = ((nuevoIdx % basesDatos.length) + basesDatos.length) % basesDatos.length;
    const nuevaBd = basesDatos[idxValido];
    const primeraTabla = nuevaBd.esquema_er.tablas[0]?.nombre || '';

    setBdIdx(idxValido);
    setVariantesPorBloque(crearVariantesAleatorias(nuevaBd.bloques));
    setQuizSel(null);
    setQuizOk(false);
    setUsoPista(false);
    setResultado(null);
    setFiltroStats(null);
    setSelloInfo(null);
    setLogroInfo(null);
    setSql(primeraTabla ? `SELECT * FROM ${primeraTabla} LIMIT 5;` : '');
    setTutorMsg({
      estadoVisual: 'esperando',
      mensaje: `Caso cambiado a "${nuevaBd.nombre}". El esquema SQL y el Visor E-R se actualizaron al instante.`,
      ejemploGuiado: null,
      plantilla: null,
    });
    window.fx?.play?.('tecla');
    window.dispatchEvent(
      new CustomEvent('nexus:toast', {
        detail: { texto: `🗄️ Base de datos activa: ${nuevaBd.nombre}`, tipo: 'info' },
      })
    );
  };

  const nuevoCaso = () => {
    seleccionarBd(bdIdx + 1);
  };

  const cambiarVariante = () => {
    if (variantesDisponibles.length <= 1) return;
    const siguiente = (varianteIdx + 1) % variantesDisponibles.length;
    setVariantesPorBloque((prev) => ({ ...prev, [bloqueBase.id]: siguiente }));
    setUsoPista(false);
    setResultado(null);
    setFiltroStats(null);
    setSelloInfo(null);
    setTutorMsg({
      estadoVisual: 'esperando',
      mensaje: `Variante ${siguiente + 1}/${variantesDisponibles.length} activada para el Bloque ${bloqueBase.numero}.`,
      ejemploGuiado: null,
      plantilla: null,
    });
    window.fx?.play?.('tecla');
  };

  const cambiarBloque = (idx) => {
    setBloqueIdx(idx);
    setQuizSel(null);
    setQuizOk(false);
    setUsoPista(false);
    setResultado(null);
    setFiltroStats(null);
    setSelloInfo(null);
    setLogroInfo(null);
    setSql('');
    if (bloques[idx]?.id === 'b5_parcial' || bloques[idx]?.numero === 5) {
      setTiempoParcial(PARCIAL_SEGUNDOS);
      tiempoAgotadoRef.current = false;
    }
    setTutorMsg({
      estadoVisual: 'esperando',
      mensaje: `Bloque ${bloques[idx].numero}: ${bloques[idx].titulo}. Revisa el enunciado y prueba tu consulta.`,
      ejemploGuiado: null,
      plantilla: null,
    });
  };

  const responderQuiz = (idx) => {
    if (!bloque.quiz) return;
    setQuizSel(idx);
    if (idx === bloque.quiz.correcta) {
      setQuizOk(true);
      window.fx?.play?.('exito');
    } else {
      window.fx?.play?.('error');
    }
  };

  const ejecutar = () => {
    if (!dbRef.current || !dbReady) {
      setResultado({
        ok: false,
        errorSql: dbError || 'El motor SQL todavía está cargando. Espera un instante o pulsa Reintentar.',
        columnas: [],
        filas: [],
      });
      setFiltroStats(null);
      if (window.fx?.animar) {
        window.fx.animar('shake', editorRef);
      } else {
        window.fx?.play?.('error');
      }
      return;
    }

    try {
      window.fx?.play?.('tecla');
      const val = validarConsulta(dbRef.current, sql, bloque);
      setResultado(val);
      setTabDerecha('resultados');

      if (!val.errorSql) {
        setFiltroStats(calcularFiltroStats(dbRef.current, sql, bdActual, val.filas?.length || 0));
      } else {
        setFiltroStats(null);
      }

      if (val.ok) {
        const yaEstaba = tutorRef.current.estado.completados.includes(bloque.id);
        const resTutor = tutorRef.current.registrarAcierto(bloque, usoPista);
        setCompletados([...tutorRef.current.estado.completados]);
        setXp(tutorRef.current.estado.xp);

        let nextRacha = racha;
        if (!yaEstaba) {
          nextRacha = racha + 1;
          setRacha(nextRacha);
        }

        const nowKey = Date.now();
        setSelloInfo({
          key: nowKey,
          bloqueId: bloque.id,
          puntos: resTutor.xpGanado || bloque.xp || 100,
        });
        if (!yaEstaba && bloque.insignia) {
          setLogroInfo({
            key: nowKey + 1,
            id: bloque.id,
            nombre: bloque.insignia,
          });
        }

        setTutorMsg({
          estadoVisual: 'exito',
          mensaje: resTutor.mensaje,
          ejemploGuiado: null,
          plantilla: null,
        });

        const reaccion = REACCIONES_BLOQUE[bloque.numero] || {
          de: 'Diego',
          texto: '¡Excelente consulta! Seguimos avanzando.',
        };
        const comboTexto = nextRacha >= 2 ? ` · 🔥 Combo x${nextRacha}` : '';
        window.dispatchEvent(
          new CustomEvent('nexus:toast', {
            detail: {
              texto: `✅ Bloque ${bloque.numero}${comboTexto} · ${reaccion.de}: "${reaccion.texto}"`,
              tipo: 'exito',
            },
          })
        );
        pushChatReaction(bloque, reaccion);
      } else {
        setRacha(0);
        setSelloInfo(null);
        if (window.fx?.animar) {
          window.fx.animar('shake', editorRef);
        } else {
          window.fx?.play?.('error');
        }
        const ayuda = tutorRef.current.registrarError(bloque, val);
        setTutorMsg(ayuda);
      }
    } catch (err) {
      console.error('[AcademyApp] Error al ejecutar consulta:', err);
      setRacha(0);
      setSelloInfo(null);
      setFiltroStats(null);
      if (window.fx?.animar) {
        window.fx.animar('shake', editorRef);
      } else {
        window.fx?.play?.('error');
      }
      setResultado({
        ok: false,
        errorSql: err?.message || 'Error inesperado al ejecutar la consulta SQL.',
        columnas: [],
        filas: [],
      });
    }
  };

  const onEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      ejecutar();
      return;
    }
    const ignorar = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'];
    if (!ignorar.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      window.fx?.play?.('tecla');
    }
  };

  const insertarChipSql = (token) => {
    window.fx?.play?.('tecla');
    setSql((prev) => {
      const sinEspaciosFinal = (prev || '').replace(/\s+$/, '');
      if (!sinEspaciosFinal) return token;
      if (token === ',' || token === ';') {
        return `${sinEspaciosFinal}${token} `;
      }
      if (sinEspaciosFinal.endsWith('(')) {
        return `${sinEspaciosFinal}${token}`;
      }
      return `${sinEspaciosFinal} ${token}`;
    });
    editorRef.current?.focus?.();
  };

  const pedirPista = () => {
    setUsoPista(true);
    setTutorMsg({
      estadoVisual: 'pista',
      mensaje: `Ejemplo relacionado: ${bloque.ejemplo_guiado || bloque.ejemplo}`,
      ejemploGuiado: bloque.ejemplo_guiado || bloque.ejemplo,
      plantilla: bloque.plantilla,
    });
  };

  const abrirApp = (appId) => {
    window.dispatchEvent(new CustomEvent('nexus:open-app', { detail: { appId } }));
  };

  if (scenario >= 2) {
    return (
      <div class="p-4 text-sm text-slate-300 space-y-2">
        <h3 class="font-semibold text-white">Academia SQL — Repaso Acto 1</h3>
        <p class="text-xs text-slate-400">
          Ya completaste el módulo universitario y estás en Banco Nexus (Escenario {scenario}). Puedes usar la Terminal SQL y el Correo para resolver las misiones corporativas.
        </p>
      </div>
    );
  }

  return (
    <div class="flex flex-col h-full gap-2 text-slate-200 text-xs">
      {/* Barra superior de bloques + selector de BD */}
      <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2 flex-wrap">
        <div class="flex items-center gap-1 overflow-x-auto">
          {bloques.map((b, i) => {
            const done = completados.includes(b.id);
            const active = i === bloqueIdx;
            return (
              <button
                key={b.id}
                onClick={() => cambiarBloque(i)}
                class={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : done
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {done ? '✓ ' : ''}{b.numero}. {b.titulo.split(' ')[0]}
              </button>
            );
          })}
        </div>

        <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
          <select
            value={bdIdx}
            onChange={(e) => seleccionarBd(Number(e.target.value))}
            title="Cambiar base de datos activa"
            class="bg-slate-800 text-slate-200 text-[11px] rounded px-2 py-1 border border-white/10"
          >
            {basesDatos.map((bd, i) => (
              <option key={bd.id} value={i}>
                BD: {bd.nombre}
              </option>
            ))}
          </select>
          <button
            onClick={nuevoCaso}
            class="px-2 py-1 rounded bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-400/30 text-[11px] font-medium"
            title="Cambia a otra base de datos y genera nuevas variantes de ejercicios"
          >
            🔄 Nuevo caso / Cambiar BD
          </button>
          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
            {completados.length}/{bloques.length} · {xp} XP
          </span>
          {racha >= 1 && (
            <span
              class={`px-2 py-0.5 rounded font-mono font-semibold border ${
                racha >= 2
                  ? 'bg-orange-500/25 text-orange-200 border-orange-400/50'
                  : 'bg-slate-800 text-slate-300 border-white/10'
              }`}
            >
              🔥 {racha >= 2 ? `Combo x${racha}` : `Racha x${racha}`}
            </span>
          )}
          {esBloqueParcial && !parcialCompletado && (
            <span
              class={`px-2 py-0.5 rounded font-mono font-bold border ${
                tiempoParcial <= 15
                  ? 'bg-red-500/25 text-red-300 border-red-400/60 animate-pulse'
                  : tiempoParcial <= 60
                  ? 'bg-amber-500/25 text-amber-200 border-amber-400/50'
                  : 'bg-rose-950/60 text-rose-200 border-rose-400/40'
              }`}
              title="Tiempo restante del Parcial (al llegar a 00:00 se reinicia el intento)"
            >
              ⏱️ {formatTiempoMMSS(tiempoParcial)}
            </span>
          )}
        </div>
      </div>

      {/* Aviso de error de carga sql.js */}
      {dbError && (
        <div class="p-2.5 rounded-lg bg-red-950/60 border border-red-400/50 text-red-200 flex items-center justify-between gap-2">
          <span class="text-xs">⚠️ {dbError}</span>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            class="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Layout 2 columnas estilo LearnSQL */}
      <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
        {/* Columna izquierda: Teoría + Quiz + Enunciado + Tutor RL */}
        <div class="md:col-span-5 flex flex-col gap-2.5 overflow-auto pr-1">
          <div class="p-2.5 rounded-lg bg-slate-800/60 border border-white/10 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-semibold text-white">
                Bloque {bloque.numero}: {bloque.titulo}
              </h3>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono shrink-0">
                {bdActual.nombre}
              </span>
            </div>
            <p class="text-slate-300 leading-relaxed">{bloque.teoria}</p>
            <pre class="p-2 rounded bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto">
              {bloque.ejemplo}
            </pre>
          </div>

          {bloque.quiz && (
            <div class="p-2.5 rounded-lg bg-slate-800/40 border border-white/10 space-y-1.5">
              <p class="font-semibold text-blue-200">{bloque.quiz.pregunta}</p>
              <div class="grid grid-cols-1 gap-1">
                {bloque.quiz.opciones.map((op, i) => (
                  <button
                    key={i}
                    onClick={() => responderQuiz(i)}
                    class={`text-left px-2.5 py-1.5 rounded border text-[11px] transition-colors ${
                      quizSel === i
                        ? i === bloque.quiz.correcta
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : 'bg-red-500/25 border-red-400 text-red-200'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/25'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
              {quizOk && <p class="text-emerald-300 text-[11px]">✓ Concepto claro. ¡Ahora ve al ejercicio!</p>}
            </div>
          )}

          <div class="p-2.5 rounded-lg bg-blue-950/30 border border-blue-400/30 space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">
                Ejercicio práctico · Variante {varianteIdx + 1}/{Math.max(1, variantesDisponibles.length)}
              </span>
              {variantesDisponibles.length > 1 && (
                <button
                  onClick={cambiarVariante}
                  class="px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/35 text-blue-200 text-[10px]"
                >
                  Otra variante
                </button>
              )}
            </div>
            <p class="text-slate-100 font-medium">{bloque.enunciado}</p>
          </div>

          {/* Tarjeta del Tutor RL */}
          <div
            class={`p-2.5 rounded-lg border space-y-1.5 ${
              tutorMsg.estadoVisual === 'exito'
                ? 'bg-emerald-950/40 border-emerald-400/40'
                : tutorMsg.estadoVisual === 'pista' ||
                  tutorMsg.estadoVisual === 'ejemplo' ||
                  tutorMsg.estadoVisual === 'plantilla'
                ? 'bg-amber-950/30 border-amber-400/40'
                : 'bg-slate-900/70 border-white/10'
            }`}
          >
            <div class="flex items-center justify-between">
              <span class="font-semibold text-amber-300">🤖 Tutor RL</span>
              <span class="text-[10px] text-slate-400">Adaptativo</span>
            </div>
            <p class="text-slate-200">{tutorMsg.mensaje}</p>
            {tutorMsg.ejemploGuiado && (
              <pre class="p-1.5 rounded bg-black/50 text-amber-200 font-mono text-[11px] overflow-x-auto">
                {tutorMsg.ejemploGuiado}
              </pre>
            )}
            {tutorMsg.plantilla && (
              <button
                onClick={() => setSql(tutorMsg.plantilla)}
                class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px]"
              >
                Usar plantilla en editor
              </button>
            )}
          </div>

          {todoCompletado && (
            <div class="p-3 rounded-lg bg-emerald-600/20 border border-emerald-400/50 space-y-2">
              <p class="font-semibold text-emerald-200">
                🎓 ¡Nivel 1 aprobado! ({nivel1.correo_final?.asunto || 'Parcial completado'})
              </p>
              <p class="text-[11px] text-slate-200 whitespace-pre-line">
                {nivel1.correo_final?.cuerpo || 'Completaste todos los bloques de SQL del Nivel 1.'}
              </p>
              {onGoToNivel2 && (
                <button
                  onClick={onGoToNivel2}
                  class="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs"
                >
                  Pasar al Nivel 2 (Banco Nexus) →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: Editor SQL arriba + Resultados/BD abajo */}
        <div class="md:col-span-7 flex flex-col gap-2 min-h-0">
          <div class="flex flex-col rounded-lg bg-slate-950/80 border border-white/10 p-2 gap-2">
            <div class="flex items-center justify-between flex-wrap gap-1">
              <span class="font-mono text-[11px] text-slate-400">
                Editor SQL ({bdActual.id}) ·{' '}
                {dbReady ? (
                  <span class="text-emerald-400">sql.js listo</span>
                ) : dbError ? (
                  <span class="text-red-400">error sql.js</span>
                ) : (
                  'cargando BD...'
                )}
              </span>
              <div class="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={ejecutar}
                  disabled={!dbReady}
                  title="Ejecutar consulta (Ctrl+Enter)"
                  class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-[11px]"
                >
                  ▶ Ejecutar
                </button>
                <button onClick={() => abrirApp('er')} class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]">
                  Ver E-R
                </button>
                <button onClick={() => abrirApp('notes')} class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]">
                  Apuntes
                </button>
                <button onClick={pedirPista} class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px]">
                  Pista
                </button>
              </div>
            </div>

            <textarea
              ref={editorRef}
              value={sql}
              onInput={(e) => setSql(e.target.value)}
              onKeyDown={onEditorKeyDown}
              placeholder="Escribe tu consulta SQL aquí... (Ctrl+Enter para ejecutar)"
              rows={5}
              class="w-full p-2.5 rounded bg-black/50 border border-white/10 font-mono text-xs text-emerald-300 focus:outline-none focus:border-blue-400 resize-none"
            />

            {/* R3: Fichas/chips SQL clicables en Bloques 1 y 2 */}
            {chipsSql.length > 0 && (
              <div class="p-2 rounded bg-slate-900/75 border border-white/10 space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Fichas SQL rápidas (clic para insertar · o escribe con teclado)
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  {chipsSql.map((chip) => {
                    const cls =
                      chip.tipo === 'kw'
                        ? 'bg-blue-500/20 hover:bg-blue-500/35 border-blue-400/40 text-blue-200'
                        : chip.tipo === 'table'
                        ? 'bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/40 text-amber-200'
                        : chip.tipo === 'col'
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-400/40 text-emerald-200'
                        : chip.tipo === 'op'
                        ? 'bg-purple-500/20 hover:bg-purple-500/35 border-purple-400/40 text-purple-200'
                        : 'bg-slate-800 hover:bg-slate-700 border-white/15 text-slate-200';
                    return (
                      <button
                        key={chip.token}
                        type="button"
                        onClick={() => insertarChipSql(chip.token)}
                        class={`px-2 py-1 rounded border font-mono text-[11px] transition-colors ${cls}`}
                      >
                        {chip.token}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div class="flex items-center gap-2 flex-wrap">
              <button
                onClick={ejecutar}
                disabled={!dbReady}
                title="Ejecutar consulta (Ctrl+Enter)"
                class="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
              >
                ▶ Ejecutar (Ctrl+Enter)
              </button>
              <button
                onClick={() => {
                  setSql('');
                  setFiltroStats(null);
                }}
                class="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Limpiar
              </button>
              {selloInfo && (
                <span
                  key={selloInfo.key}
                  data-fx="sello"
                  ref={selloRef}
                  class="px-2.5 py-0.5 rounded border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200 font-mono font-extrabold text-[11px] tracking-wider uppercase -rotate-2 shadow"
                >
                  APROBADO
                </span>
              )}
              {logroInfo && (
                <span
                  key={logroInfo.key}
                  data-fx="logro"
                  ref={logroRef}
                  class="px-2.5 py-0.5 rounded-full border border-amber-400/60 bg-amber-500/20 text-amber-200 font-semibold text-[11px]"
                >
                  🏆 {logroInfo.nombre}
                </span>
              )}
              {resultado && (
                <span class={`text-xs font-medium ${resultado.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {resultado.errorSql ? `Error: ${resultado.errorSql}` : resultado.detalle}
                </span>
              )}
            </div>
          </div>

          {/* Pestañas Resultados / Base de datos */}
          <div class="flex-1 flex flex-col min-h-0 rounded-lg bg-slate-950/60 border border-white/10 overflow-hidden">
            <div class="flex items-center justify-between px-2 pt-1.5 border-b border-white/10 bg-slate-900/50">
              <div class="flex gap-1">
                <button
                  onClick={() => setTabDerecha('resultados')}
                  class={`px-3 py-1 rounded-t text-xs font-medium ${
                    tabDerecha === 'resultados' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  Resultados
                </button>
                <button
                  onClick={() => setTabDerecha('bd')}
                  class={`px-3 py-1 rounded-t text-xs font-medium ${
                    tabDerecha === 'bd' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  Base de datos ({bdActual.nombre})
                </button>
              </div>
              {tabDerecha === 'resultados' && filtroStats && (
                <div class="flex items-center gap-2 mb-1 px-2 py-0.5 rounded bg-slate-800/80 border border-white/10 text-[11px] font-mono">
                  <span class="text-sky-300 font-semibold">
                    {filtroStats.tabla}: {filtroStats.total} filas → {filtroStats.filtradas} filas
                  </span>
                  <div class="w-16 h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((filtroStats.filtradas / Math.max(1, filtroStats.total)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {tabDerecha === 'bd' && (
                <select
                  value={tablaPreview}
                  onChange={(e) => setTablaPreview(e.target.value)}
                  class="bg-slate-800 text-slate-200 text-[11px] rounded px-2 py-0.5 mb-1 border border-white/10"
                >
                  {bdActual.esquema_er.tablas.map((t) => (
                    <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            <div class="flex-1 overflow-auto p-2">
              {tabDerecha === 'resultados' ? (
                resultado?.columnas?.length ? (
                  <table class="w-full text-left border-collapse font-mono text-[11px]">
                    <thead>
                      <tr class="border-b border-white/15 text-slate-400">
                        {resultado.columnas.map((c) => (
                          <th key={c} class="py-1 pr-3">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.filas.map((row, idx) => (
                        <tr key={idx} class="border-b border-white/5 hover:bg-white/5">
                          {row.map((val, j) => (
                            <td key={j} class="py-1 pr-3 text-slate-200">
                              {val === null ? '<NULL>' : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p class="text-slate-500 text-xs">Ejecuta una consulta para ver los resultados aquí.</p>
                )
              ) : (
                <table class="w-full text-left border-collapse font-mono text-[11px]">
                  <thead>
                    <tr class="border-b border-white/15 text-slate-400">
                      {previewData.columns.map((c) => (
                        <th key={c} class="py-1 pr-3">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.values.map((row, idx) => (
                      <tr key={idx} class="border-b border-white/5">
                        {row.map((val, j) => (
                          <td key={j} class="py-1 pr-3 text-slate-300">
                            {val === null ? '<NULL>' : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
