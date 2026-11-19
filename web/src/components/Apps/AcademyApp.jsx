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

function crearVariantesAleatorias(bloques) {
  const mapa = {};
  for (const b of bloques) {
    const total = b.variantes?.length || 1;
    mapa[b.id] = Math.floor(Math.random() * total);
  }
  return mapa;
}

export default function AcademyApp({ scenario = 1, onGoToNivel2 }) {
  const basesDatos = nivel1Variantes.bases_datos;
  const tutorRef = useRef(new TutorRL());
  const dbRef = useRef(null);

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
    setSql('');
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
      return;
    }

    try {
      window.fx?.play?.('tecla');
      const val = validarConsulta(dbRef.current, sql, bloque);
      setResultado(val);
      setTabDerecha('resultados');

      if (val.ok) {
        window.fx?.play?.('exito');
        const resTutor = tutorRef.current.registrarAcierto(bloque, usoPista);
        setCompletados([...tutorRef.current.estado.completados]);
        setXp(tutorRef.current.estado.xp);
        setTutorMsg({
          estadoVisual: 'exito',
          mensaje: resTutor.mensaje,
          ejemploGuiado: null,
          plantilla: null,
        });
        window.dispatchEvent(
          new CustomEvent('nexus:toast', {
            detail: { texto: `✅ Bloque ${bloque.numero} completado`, tipo: 'exito' },
          })
        );
      } else {
        window.fx?.play?.('error');
        const ayuda = tutorRef.current.registrarError(bloque, val);
        setTutorMsg(ayuda);
      }
    } catch (err) {
      console.error('[AcademyApp] Error al ejecutar consulta:', err);
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
    }
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
              value={sql}
              onInput={(e) => setSql(e.target.value)}
              onKeyDown={onEditorKeyDown}
              placeholder="Escribe tu consulta SQL aquí... (Ctrl+Enter para ejecutar)"
              rows={5}
              class="w-full p-2.5 rounded bg-black/50 border border-white/10 font-mono text-xs text-emerald-300 focus:outline-none focus:border-blue-400 resize-none"
            />

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
                onClick={() => setSql('')}
                class="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Limpiar
              </button>
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
