// web/src/tutor/tutorRL.js
// Motor del Tutor RL Adaptativo + Validador por Resultado SQL (CampusOS · Nivel 1)

const STORAGE_KEY = 'campusos_tutor_rl_v1';

const PISTAS_POR_CATEGORIA = {
  falta_from:
    'Indicaste qué columnas quieres ver, pero falta decir de qué tabla vienen. Recuerda usar FROM <tabla>.',
  columna_inexistente:
    'Una columna o tabla no existe con ese nombre. Revisa el Visor E-R o la pestaña Base de datos.',
  like_con_igual:
    'Usaste = con %. Para buscar patrones de texto (como empezar con M) necesitas el operador LIKE.',
  and_en_vez_de_or:
    'Revisa las condiciones: cuando un registro no puede cumplir dos valores a la vez (o basta una opción), usa OR o IN.',
  or_en_vez_de_and:
    'Fíjate en el enunciado: exige que todas las condiciones se cumplan al mismo tiempo. Eso requiere AND.',
  falta_distinct:
    'Tu consulta devuelve filas repetidas. Usa DISTINCT justo después de SELECT para eliminar duplicados.',
  orden_inverso:
    'Los datos están correctos, pero el orden no coincide. Revisa si necesitas ORDER BY ... ASC o DESC.',
  columnas_distintas:
    'La cantidad o el orden de columnas no coincide con lo que pide el enunciado.',
  resultado_distinto:
    'La consulta es válida en SQL, pero las filas devueltas no coinciden con lo solicitado. Revisa tus filtros WHERE.',
};

function normalizarFila(row) {
  return JSON.stringify(row);
}

function detectarCategoriaError(sqlUsuario, errorMsg, bloque) {
  const s = (sqlUsuario || '').trim().toUpperCase();
  if (!s.includes('FROM')) return 'falta_from';
  if (errorMsg) {
    if (/no such (column|table)/i.test(errorMsg)) return 'columna_inexistente';
    return 'error_sintaxis';
  }
  if (/=\s*['"][^'"]*%[^'"]*['"]/.test(sqlUsuario)) return 'like_con_igual';
  if (bloque?.consulta_esperada?.toUpperCase().includes('DISTINCT') && !s.includes('DISTINCT')) {
    return 'falta_distinct';
  }
  if (bloque?.consulta_esperada?.toUpperCase().includes(' AND ') && s.includes(' OR ') && !s.includes(' AND ')) {
    return 'or_en_vez_de_and';
  }
  return 'resultado_distinto';
}

/**
 * Valida la consulta del usuario comparando RESULTADOS reales en sql.js,
 * no texto literal (sección 24.B del Guion Nivel 1).
 */
export function validarConsulta(db, sqlUsuario, bloque) {
  const limpia = (sqlUsuario || '').trim();
  if (!limpia) {
    return {
      ok: false,
      errorSql: 'Escribe una consulta SQL antes de ejecutar.',
      categoriaError: 'vacia',
      columnas: [],
      filas: [],
    };
  }

  let resUser;
  try {
    resUser = db.exec(limpia);
  } catch (err) {
    const cat = detectarCategoriaError(limpia, err.message, bloque);
    return {
      ok: false,
      errorSql: err.message,
      categoriaError: cat,
      columnas: [],
      filas: [],
    };
  }

  const userTable = resUser[0] || { columns: [], values: [] };

  if (!bloque?.consulta_esperada) {
    return {
      ok: false,
      errorSql: 'Este ejercicio no tiene consulta esperada configurada.',
      categoriaError: 'error_config',
      columnas: userTable.columns,
      filas: userTable.values,
    };
  }

  let expRes;
  try {
    expRes = db.exec(bloque.consulta_esperada);
  } catch (err) {
    return {
      ok: false,
      errorSql: `Error interno al validar ejercicio: ${err.message}`,
      categoriaError: 'error_config',
      columnas: userTable.columns,
      filas: userTable.values,
    };
  }
  const expTable = expRes[0] || { columns: [], values: [] };

  // 1. Comparar columnas (case-insensitive)
  const colsU = userTable.columns.map((c) => c.toLowerCase());
  const colsE = expTable.columns.map((c) => c.toLowerCase());
  if (colsU.length !== colsE.length || colsU.some((c, i) => c !== colsE[i])) {
    return {
      ok: false,
      errorSql: null,
      categoriaError: 'columnas_distintas',
      columnas: userTable.columns,
      filas: userTable.values,
      detalle: `Se esperaban columnas [${expTable.columns.join(', ')}], obtuviste [${userTable.columns.join(', ') || 'ninguna'}].`,
    };
  }

  // 2. Comparar filas
  const rowsU = userTable.values.map(normalizarFila);
  const rowsE = expTable.values.map(normalizarFila);

  if (bloque.orden_importa) {
    const mismoOrden = rowsU.length === rowsE.length && rowsU.every((r, i) => r === rowsE[i]);
    if (!mismoOrden) {
      const mismasSinOrden =
        rowsU.length === rowsE.length &&
        [...rowsU].sort().every((r, i) => r === [...rowsE].sort()[i]);
      const cat = mismasSinOrden
        ? 'orden_inverso'
        : detectarCategoriaError(limpia, null, bloque);
      return {
        ok: false,
        errorSql: null,
        categoriaError: cat,
        columnas: userTable.columns,
        filas: userTable.values,
        detalle:
          cat === 'orden_inverso'
            ? 'Tienes las filas correctas, pero en otro orden (revisa ASC / DESC).'
            : `Se esperaban ${rowsE.length} filas y tu consulta devolvió ${rowsU.length}.`,
      };
    }
  } else {
    const setU = [...rowsU].sort();
    const setE = [...rowsE].sort();
    const iguales = setU.length === setE.length && setU.every((r, i) => r === setE[i]);
    if (!iguales) {
      const cat = detectarCategoriaError(limpia, null, bloque);
      return {
        ok: false,
        errorSql: null,
        categoriaError: cat,
        columnas: userTable.columns,
        filas: userTable.values,
        detalle: `Se esperaban ${rowsE.length} filas y tu consulta devolvió ${rowsU.length}.`,
      };
    }
  }

  return {
    ok: true,
    errorSql: null,
    categoriaError: null,
    columnas: userTable.columns,
    filas: userTable.values,
    detalle: '¡Consulta correcta!',
  };
}

export class TutorRL {
  constructor() {
    this.estado = this._cargar();
  }

  _cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return {
      xp: 0,
      insignias: [],
      completados: [],
      // Memoria pedagógica RL por tag: dominio [0..1] y errores acumulados
      tags: {
        select: { dominio: 0.5, errores: 0, aciertos: 0 },
        where: { dominio: 0.5, errores: 0, aciertos: 0 },
        like: { dominio: 0.5, errores: 0, aciertos: 0 },
        order_by: { dominio: 0.5, errores: 0, aciertos: 0 },
        distinct: { dominio: 0.5, errores: 0, aciertos: 0 },
      },
      intentosBloque: {},
    };
  }

  _guardar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.estado));
    } catch (_) { /* ignore */ }
  }

  registrarError(bloque, validacion) {
    const tag = bloque.clausula_tag || 'select';
    const prev = this.estado.tags[tag] || { dominio: 0.5, errores: 0, aciertos: 0 };
    // Actualización tipo Q-learning / promedio exponencial de dominio
    prev.errores += 1;
    prev.dominio = Math.max(0.05, +(prev.dominio * 0.8).toFixed(2));
    this.estado.tags[tag] = prev;

    const intentos = (this.estado.intentosBloque[bloque.id] || 0) + 1;
    this.estado.intentosBloque[bloque.id] = intentos;
    this._guardar();

    // Escalera adaptativa de 3 niveles (Sección 6.2 del Guion)
    const pistaBase =
      PISTAS_POR_CATEGORIA[validacion.categoriaError] ||
      validacion.detalle ||
      'Revisa la estructura SELECT ... FROM ... WHERE ...';

    if (intentos === 1) {
      return {
        nivel: 1,
        estadoVisual: 'pista',
        mensaje: pistaBase,
        ejemploGuiado: null,
        plantilla: null,
      };
    }
    if (intentos === 2) {
      return {
        nivel: 2,
        estadoVisual: 'ejemplo',
        mensaje: 'Vamos a bajar un escalón y ver un ejemplo más sencillo de la misma regla:',
        ejemploGuiado: bloque.ejemplo_guiado || bloque.ejemplo,
        plantilla: null,
      };
    }
    return {
      nivel: 3,
      estadoVisual: 'plantilla',
      mensaje: 'Aquí tienes una plantilla para guiarte paso a paso (sin penalización):',
      ejemploGuiado: bloque.ejemplo_guiado || bloque.ejemplo,
      plantilla: bloque.plantilla || null,
    };
  }

  registrarAcierto(bloque, usoPista = false) {
    const tag = bloque.clausula_tag || 'select';
    const prev = this.estado.tags[tag] || { dominio: 0.5, errores: 0, aciertos: 0 };
    prev.aciertos += 1;
    prev.dominio = Math.min(1.0, +(prev.dominio + 0.25 * (1 - prev.dominio)).toFixed(2));
    this.estado.tags[tag] = prev;

    const yaEstaba = this.estado.completados.includes(bloque.id);
    let xpGanado = 0;
    if (!yaEstaba) {
      this.estado.completados.push(bloque.id);
      xpGanado = (bloque.xp || 100) + (usoPista ? 0 : 25);
      this.estado.xp += xpGanado;
      if (bloque.insignia && !this.estado.insignias.includes(bloque.insignia)) {
        this.estado.insignias.push(bloque.insignia);
      }
    }
    this.estado.intentosBloque[bloque.id] = 0;
    this._guardar();

    return {
      xpGanado,
      nuevoDominio: prev.dominio,
      mensaje: yaEstaba
        ? '¡Bien! Repaso completado.'
        : `¡Excelente! Bloque superado (+${xpGanado} XP · Insignia: ${bloque.insignia}).`,
    };
  }

  /** Política Bandit simple: recomienda el bloque con menor dominio entre los pendientes o más débil. */
  recomendarBloque(bloques) {
    const pendientes = bloques.filter((b) => !this.estado.completados.includes(b.id));
    if (pendientes.length) return pendientes[0];
    // Si ya completó todos, recomienda repasar el de menor dominio
    let peor = bloques[0];
    let minDom = Infinity;
    for (const b of bloques) {
      const dom = this.estado.tags[b.clausula_tag]?.dominio ?? 0.5;
      if (dom < minDom) {
        minDom = dom;
        peor = b;
      }
    }
    return peor;
  }
}
