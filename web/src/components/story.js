// web/src/components/story.js
// Carga `content/story.json` si existe (Vite glob); si no, usa FALLBACK_STORY.
// Estructura esperada: { version, acto_por_defecto, actos: [...], pr_acto3, esquema }

const storyModules = import.meta.glob('../../../content/story.json', { eager: true });
const externalStory = Object.values(storyModules)[0]?.default || null;

export const FALLBACK_STORY = {
  version: 1,
  acto_por_defecto: 2,
  actos: [
    {
      numero: 1,
      id: 'acto1_estudiante',
      nombre: 'Estudiante',
      canal: 'general',
      descripcion: 'Aprende SQL desde cero en la Academia Nexus.',
      mensajes: [
        { autor: 'Prof. Ramírez', rol: 'profesor', texto: 'Bienvenidos al curso de SQL aplicado a banca. Empezamos con SELECT y WHERE.', hace: 'hace 2 h' },
        { autor: 'Ana (compañera)', rol: 'alumno', texto: 'Profe, ¿ORDER BY va antes o después de WHERE?', hace: 'hace 1 h' },
        { autor: 'Prof. Ramírez', rol: 'profesor', texto: 'Después. Orden lógico: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.', hace: 'hace 55 min' },
        { autor: 'Luis (compañero)', rol: 'alumno', texto: 'Ya entregué el ejercicio 3, usé LIMIT 10 para el top de saldos.', hace: 'hace 20 min' },
      ],
    },
    {
      numero: 2,
      id: 'acto2_pasante',
      nombre: 'Pasante (Junior)',
      canal: 'clase',
      descripcion: 'Primeras misiones reales en el banco.',
      mensajes: [
        { autor: 'Dirección de Riesgos', rol: 'jefe', texto: 'Pasante, necesitamos el reporte de saldos negativos en La Paz antes del mediodía.', hace: 'hace 15 min' },
        { autor: 'Soporte TI', rol: 'colega', texto: 'Recuerda: los datos vienen con NULLs y duplicados, revisa antes de entregar.', hace: 'hace 10 min' },
        { autor: 'Auditoría', rol: 'jefe', texto: 'Si el JOIN con sucursales no va, el filtro por ciudad falla. ¡Cuidado!', hace: 'hace 5 min' },
      ],
    },
    {
      numero: 3,
      id: 'acto3_senior',
      nombre: 'Guardia Nocturna',
      canal: 'incidentes',
      descripcion: 'Incidentes en producción y auditoría de PRs.',
      mensajes: [
        { autor: 'On-call DBA', rol: 'colega', texto: 'Alerta: query lenta en clientes, bloqueo en la tabla de saldos.', hace: 'hace 3 min' },
        { autor: 'SRE Bot', rol: 'bot', texto: 'Pico de tráfico detectado en endpoint /reportes/saldos (latencia 2.3s).', hace: 'hace 2 min' },
        { autor: 'Dirección TI', rol: 'jefe', texto: 'Hay un PR pendiente del Pasante IA. Revísalo antes de que se despliegue.', hace: 'hace 1 min' },
        { autor: 'Pasante IA', rol: 'bot', texto: 'PR #42 listo para revisión: limpieza de clientes inactivos.', hace: 'ahora' },
      ],
    },
  ],
  pr_acto3: {
    numero: 42,
    titulo: 'Limpieza nocturna: eliminar clientes inactivos',
    autor: 'pasante-ia',
    rama: 'feature/cleanup-clientes',
    descripcion: 'Script para borrar clientes sin movimientos en los últimos 12 meses.',
    archivo: 'migrations/2024_cleanup_clientes.sql',
    diff: [
      { tipo: 'ctx', texto: '-- Limpieza de clientes inactivos (12 meses)' },
      { tipo: 'del', texto: '-- DELETE FROM clientes WHERE activo = 0;' },
      { tipo: 'add', texto: 'DELETE FROM clientes;' },
      { tipo: 'add', texto: '-- TODO: filtrar por fecha, se puede mejorar luego' },
    ],
    peligro: true,
    explicacion: 'El DELETE no tiene WHERE. Borraría TODA la tabla clientes en producción.',
  },
  esquema: {
    tablas: [
      { nombre: 'sucursales', columnas: ['id INTEGER PK', 'ciudad TEXT'] },
      { nombre: 'clientes', columnas: ['id INTEGER PK', 'nombre TEXT', 'saldo REAL', 'sucursal_id INTEGER FK'] },
      { nombre: 'cuentas', columnas: ['id INTEGER PK', 'cliente_id INTEGER FK', 'tipo TEXT', 'saldo REAL'] },
      { nombre: 'transacciones', columnas: ['id INTEGER PK', 'cuenta_id INTEGER FK', 'monto REAL', 'fecha TEXT'] },
      { nombre: 'creditos', columnas: ['id INTEGER PK', 'cliente_id INTEGER FK', 'monto REAL', 'tasa REAL'] },
    ],
  },
};

function normalizeStory(ext) {
  if (!ext) return FALLBACK_STORY;
  const rawActos = ext.actos;
  let actos = FALLBACK_STORY.actos;

  if (Array.isArray(rawActos)) {
    actos = rawActos;
  } else if (rawActos && typeof rawActos === 'object') {
    actos = FALLBACK_STORY.actos.map((base) => {
      const src = rawActos[String(base.numero)] || rawActos[base.numero];
      if (!src) return base;
      const rawMsgs = Array.isArray(src.mensajes) ? src.mensajes : Array.isArray(src.chat) ? src.chat : [];
      const mensajes = rawMsgs.length
        ? rawMsgs.map((m) => ({
            autor: m.autor || m.de || 'Sistema',
            rol: m.rol || ((m.de || '').includes('Jef') || (m.de || '').includes('Prof') ? 'jefe' : (m.de || '').includes('Bot') || (m.de || '').includes('Pasante IA') ? 'bot' : 'colega'),
            texto: m.texto || '',
            hace: m.hace || '',
          }))
        : base.mensajes;
      return {
        ...base,
        ...src,
        mensajes,
        descripcion: src.alerta_inicial || src.descripcion || base.descripcion,
      };
    });
  }

  return {
    ...FALLBACK_STORY,
    ...ext,
    actos,
    pr_acto3: ext.pr_acto3 || FALLBACK_STORY.pr_acto3,
    esquema: ext.esquema || FALLBACK_STORY.esquema,
  };
}

export const STORY = normalizeStory(externalStory);

export function getActo(numero) {
  return STORY.actos.find((a) => a.numero === numero) || STORY.actos[0];
}

export function getActoActual() {
  try {
    const saved = parseInt(localStorage.getItem('nexus_acto') || '0', 10);
    if (saved >= 1 && saved <= 3) return saved;
  } catch (_) { /* ignore */ }
  return STORY.acto_por_defecto || 2;
}

export function setActoActual(numero) {
  try { localStorage.setItem('nexus_acto', String(numero)); } catch (_) { /* ignore */ }
  window.dispatchEvent(new CustomEvent('nexus:acto-cambio', { detail: { numero } }));
}