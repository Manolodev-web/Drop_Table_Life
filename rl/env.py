"""Banco Nexus - Entorno tabular de RL para múltiples misiones SQL.

Este módulo carga misiones desde `missions/missions.json` (y su esquema SQL
desde `missions/schema.sql`), y expone:

- `cargar_misiones(...)`                        : lista de misiones + texto del esquema.
- `cargar_todo(...)`                            : además pre-parsea el esquema en `{tabla: [cols]}`.
- `parse_schema_sql(sql)`                       : parsea CREATE TABLE → dict de columnas.
- `construir_sql(mask, piezas, schema_dict)`    : máscara de 8 bits → SQL.
- `calcular_tablas(mision, schema_sql, schema_dict)` : precalcula los 256 estados.
- `BancoTabular`                                : entorno con interfaz simple (`reset`, `step`).
- `BancoTabularGym`                             : wrapper `gymnasium.Env` opcional.

Fallback seguro: si `missions/missions.json` no existe se usa la misión de
ejemplo `m1_saldos_negativos` con datos sintéticos generados con semilla fija.

Contrato del MDP (por misión con `"tipo": "rl"`):
  Estado    : máscara de 8 bits con las piezas ya elegidas (256 estados).
  Acciones  : 8 piezas + EJECUTAR (9 acciones).
  Recompensa: -0.01 por paso; al ejecutar se suma el resultado de la consulta
              (-0.5 inválida, +1 exacta, parcial según solapamiento de filas).
  Fin       : al ejecutar, o tras MAX_PASOS (truncado).
"""
from __future__ import annotations

import json
import random
import re
import sqlite3
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Constantes del MDP
# ---------------------------------------------------------------------------
N_ESTADOS = 256
N_ACCIONES = 9
N_PIEZAS = 8
EJECUTAR = 8
COSTO_PASO = -0.01
MAX_PASOS = 20

# Compatibilidad con la versión previa (por si otro módulo importa estos índices).
FROM, JOIN, COL_NOMBRE, COL_SALDO, W_SALDO, W_CIUDAD, ORD_ASC, ORD_DESC = range(8)

# ---------------------------------------------------------------------------
# Misión fallback (cuando aún no existe missions/missions.json)
# ---------------------------------------------------------------------------
MISION_FALLBACK = {
    "id": "m1_saldos_negativos",
    "tipo": "rl",
    "titulo": "Saldos en rojo en La Paz",
    "remitente": "Dirección de Riesgos",
    "correo": (
        "Buen día. Auditoría nos pidió la lista de clientes de la sucursal "
        "La Paz con saldo negativo. Necesito nombre y saldo, del más "
        "endeudado al menos endeudado. Lo necesito antes del mediodía."
    ),
    "consulta_esperada": (
        "SELECT c.nombre, c.saldo FROM clientes c "
        "JOIN sucursales s ON c.sucursal_id = s.id "
        "WHERE c.saldo < 0 AND s.ciudad = 'La Paz' ORDER BY c.saldo ASC"
    ),
    "piezas_permitidas": [
        "FROM clientes",
        "JOIN sucursales",
        "SELECT nombre",
        "SELECT saldo",
        "WHERE saldo < 0",
        "WHERE ciudad = 'La Paz'",
        "ORDER BY saldo ASC",
        "ORDER BY saldo DESC",
    ],
}

SCHEMA_FALLBACK_DDL = """
CREATE TABLE sucursales (id INTEGER PRIMARY KEY, ciudad TEXT);
CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT, saldo REAL, sucursal_id INTEGER);
"""

# Nombres compatibles con la versión previa.
MISION = MISION_FALLBACK
PIEZAS = MISION_FALLBACK["piezas_permitidas"] + ["EJECUTAR"]


# ---------------------------------------------------------------------------
# Carga de misiones y esquema
# ---------------------------------------------------------------------------
def _directorio_misiones_por_defecto() -> Path:
    return Path(__file__).resolve().parent.parent / "missions"


def cargar_misiones(misiones_dir: Optional[Path] = None):
    """Devuelve (lista_misiones, schema_sql|None). Fallback si no hay missions.json."""
    base = Path(misiones_dir) if misiones_dir else _directorio_misiones_por_defecto()
    archivo_misiones = base / "missions.json"
    archivo_esquema = base / "schema.sql"

    if not archivo_misiones.exists():
        return [MISION_FALLBACK], None

    try:
        data = json.loads(archivo_misiones.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return [MISION_FALLBACK], None

    misiones = data.get("misiones", []) if isinstance(data, dict) else []
    schema_sql = archivo_esquema.read_text(encoding="utf-8") if archivo_esquema.exists() else None
    return misiones, schema_sql


# ---------------------------------------------------------------------------
# Parseo de esquema SQL (sólo CREATE TABLE, suficiente para inferir columnas)
# ---------------------------------------------------------------------------
def parse_schema_sql(sql_text: str) -> dict:
    """Devuelve {tabla: [col1, col2, ...]} parseando CREATE TABLE."""
    schema: dict = {}
    if not sql_text:
        return schema
    patron = re.compile(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.*?)\)\s*;",
        re.IGNORECASE | re.DOTALL,
    )
    for m in patron.finditer(sql_text):
        tabla = m.group(1)
        cuerpo = m.group(2)
        cols, buf, prof = [], "", 0
        for ch in cuerpo:
            if ch == "(":
                prof += 1
            elif ch == ")":
                prof -= 1
            if ch == "," and prof == 0:
                cols.append(buf.strip())
                buf = ""
            else:
                buf += ch
        if buf.strip():
            cols.append(buf.strip())

        nombres_col = []
        for definicion in cols:
            if not definicion:
                continue
            tokens = definicion.split()
            if not tokens:
                continue
            primera = tokens[0].upper()
            if primera in ("PRIMARY", "FOREIGN", "UNIQUE", "CHECK", "CONSTRAINT"):
                continue
            nombres_col.append(tokens[0])
        schema[tabla] = nombres_col
    return schema


_SCHEMA_FALLBACK_DICT = parse_schema_sql(SCHEMA_FALLBACK_DDL)


def cargar_todo(misiones_dir: Optional[Path] = None):
    """Devuelve (misiones, schema_sql|None, schema_dict)."""
    misiones, schema_sql = cargar_misiones(misiones_dir)
    schema_dict = parse_schema_sql(schema_sql or SCHEMA_FALLBACK_DDL)
    return misiones, schema_sql, schema_dict


# ---------------------------------------------------------------------------
# Construcción de SQL a partir de la máscara y las piezas
# ---------------------------------------------------------------------------
def _parsear_pieza(pieza: str):
    """Devuelve (tipo_clausula, contenido). Ej: ('SELECT', 'nombre')."""
    pieza = pieza.strip()
    up = pieza.upper()
    for kw in ("GROUP BY", "ORDER BY", "SELECT", "FROM", "JOIN", "WHERE", "HAVING"):
        if up == kw or up.startswith(kw + " "):
            return kw, pieza[len(kw):].strip()
    raise ValueError(f"Pieza no reconocida: {pieza!r}")


def _calificar_columnas(expr: str, tabla_por_columna: dict, tablas_join: set) -> str:
    """Antepone 'tabla.' a columnas sin calificar que pertenezcan a tablas del JOIN."""
    partes = re.split(r"('[^']*'|\"[^\"]*\")", expr)
    for i, parte in enumerate(partes):
        if parte.startswith(("'", '"')):
            continue
        for col, tabla in tabla_por_columna.items():
            if tabla not in tablas_join:
                continue
            parte = re.sub(
                rf"(?<![\w.]){re.escape(col)}\b",
                f"{tabla}.{col}",
                parte,
            )
        partes[i] = parte
    return "".join(partes)


def _buscar_on(tabla_a: str, tabla_b: str, schema: dict) -> Optional[str]:
    """Busca una FK entre `tabla_a` y `tabla_b` (columnas *_id) para JOIN ON."""
    def _candidatos(ref: str):
        return {ref, ref + "s", ref + "es"}

    for col in schema.get(tabla_a, []):
        if col.endswith("_id"):
            ref = col[:-3]
            if tabla_b in _candidatos(ref):
                return f"{tabla_a}.{col} = {tabla_b}.id"

    for col in schema.get(tabla_b, []):
        if col.endswith("_id"):
            ref = col[:-3]
            if tabla_a in _candidatos(ref):
                return f"{tabla_b}.{col} = {tabla_a}.id"

    return None


def construir_sql(mask: int, piezas: Optional[list] = None,
                  schema_dict: Optional[dict] = None) -> Optional[str]:
    """Traduce una máscara de 8 bits a SQL. Devuelve None si no es ejecutable.

    - `piezas`: lista de 8 strings (`piezas_permitidas`). Por defecto usa PIEZAS.
    - `schema_dict`: {tabla: [columnas]}. Por defecto usa el esquema fallback.
    """
    if piezas is None:
        piezas = PIEZAS
    if schema_dict is None:
        schema_dict = _SCHEMA_FALLBACK_DICT

    usa = lambda i: bool(mask >> i & 1)

    tabla_from: Optional[str] = None
    tablas_join: list = []
    partes_select: list = []
    partes_where: list = []
    partes_group: list = []
    partes_having: list = []
    partes_order: list = []

    for i, pieza in enumerate(piezas[:N_PIEZAS]):
        if not usa(i):
            continue
        try:
            tipo, contenido = _parsear_pieza(pieza)
        except ValueError:
            return None
        if tipo == "FROM":
            tabla_from = contenido.split()[0] if contenido else None
        elif tipo == "JOIN":
            tabla = contenido.split()[0] if contenido else None
            if tabla:
                tablas_join.append(tabla)
        elif tipo == "SELECT":
            if contenido:
                partes_select.append(contenido)
        elif tipo == "WHERE":
            if contenido:
                partes_where.append(contenido)
        elif tipo == "GROUP BY":
            if contenido:
                partes_group.append(contenido)
        elif tipo == "HAVING":
            if contenido:
                partes_having.append(contenido)
        elif tipo == "ORDER BY":
            if contenido:
                partes_order.append(contenido)

    if not tabla_from or not partes_select:
        return None

    todas_tablas = [tabla_from] + tablas_join
    # Mapa columna → tabla. En ambigüedad gana la tabla del FROM.
    tabla_por_columna: dict = {}
    for col in schema_dict.get(tabla_from, []):
        tabla_por_columna[col] = tabla_from
    for jt in tablas_join:
        for col in schema_dict.get(jt, []):
            tabla_por_columna.setdefault(col, jt)

    conjunto_join = set(tablas_join) if len(todas_tablas) > 1 else set()

    def q(expr: str) -> str:
        if not conjunto_join:
            return expr
        return _calificar_columnas(expr, tabla_por_columna, conjunto_join)

    sql = "SELECT " + ", ".join(q(c) for c in partes_select) + f" FROM {tabla_from}"

    tablas_unidas = [tabla_from]
    for jt in tablas_join:
        clausula_on = None
        for prev_t in tablas_unidas:
            clausula_on = _buscar_on(prev_t, jt, schema_dict)
            if clausula_on is not None:
                break
        if clausula_on is None:
            return None
        sql += f" JOIN {jt} ON {clausula_on}"
        tablas_unidas.append(jt)

    if partes_where:
        sql += " WHERE " + " AND ".join(q(c) for c in partes_where)
    if partes_group:
        sql += " GROUP BY " + ", ".join(q(c) for c in partes_group)
    if partes_having:
        sql += " HAVING " + " AND ".join(q(c) for c in partes_having)
    if partes_order:
        # El primer ORDER BY gana (evita ORDER BY contradictorio en el estado).
        sql += " ORDER BY " + q(partes_order[0])

    return sql


# ---------------------------------------------------------------------------
# Creación de la BD (fallback sintético o a partir del schema.sql real)
# ---------------------------------------------------------------------------
def crear_bd_fallback(seed: int = 42) -> sqlite3.Connection:
    rnd = random.Random(seed)
    con = sqlite3.connect(":memory:")
    con.executescript(SCHEMA_FALLBACK_DDL)
    ciudades = ["La Paz", "Santa Cruz", "Cochabamba"]
    con.executemany("INSERT INTO sucursales VALUES (?, ?)", list(enumerate(ciudades, 1)))
    filas = [
        (i, f"Cliente {i}", round(rnd.uniform(-800, 4000), 2), rnd.randint(1, 3))
        for i in range(1, 201)
    ]
    con.executemany("INSERT INTO clientes VALUES (?, ?, ?, ?)", filas)
    return con


def crear_bd(schema_sql: Optional[str] = None, seed: int = 42) -> sqlite3.Connection:
    """Crea una BD en memoria. Si `schema_sql` viene vacío/None, usa el fallback."""
    if schema_sql and schema_sql.strip():
        con = sqlite3.connect(":memory:")
        con.executescript(schema_sql)
        return con
    return crear_bd_fallback(seed)


def calcular_tablas(mision: Optional[dict] = None,
                    schema_sql: Optional[str] = None,
                    schema_dict: Optional[dict] = None) -> dict:
    """Precalcula, para los 256 estados, el SQL y la recompensa terminal."""
    if mision is None:
        mision = MISION_FALLBACK
    if schema_dict is None:
        schema_dict = parse_schema_sql(schema_sql or SCHEMA_FALLBACK_DDL)

    con = crear_bd(schema_sql)
    esperado = con.execute(mision["consulta_esperada"]).fetchall()
    piezas = mision["piezas_permitidas"]

    sqls, rexec, exacto = [], [], []
    for mask in range(N_ESTADOS):
        sql = construir_sql(mask, piezas, schema_dict)
        filas = None
        if sql is not None:
            try:
                filas = con.execute(sql).fetchall()
            except sqlite3.Error:
                filas = None
        if filas is None:
            r, ok = -0.5, False
        elif filas == esperado:
            r, ok = 1.0, True
        else:
            a, b = set(filas), set(esperado)
            r, ok = 0.5 * len(a & b) / max(len(a | b), 1) - 0.2, False
        sqls.append(sql)
        rexec.append(round(r, 4))
        exacto.append(ok)

    return {"sql": sqls, "rexec": rexec, "exacto": exacto,
            "filas_esperadas": len(esperado)}


# ---------------------------------------------------------------------------
# Entornos
# ---------------------------------------------------------------------------
class BancoTabular:
    """Entorno tabular con la interfaz simple (`reset`, `step`)."""

    def __init__(self, tablas):
        self.rexec = tablas["rexec"]
        self.exacto = tablas["exacto"]

    def reset(self):
        self.s, self.t = 0, 0
        return self.s

    def step(self, a):
        """Devuelve (estado, recompensa, terminado, exito)."""
        self.t += 1
        if a == EJECUTAR:
            return self.s, COSTO_PASO + self.rexec[self.s], True, self.exacto[self.s]
        self.s |= 1 << a
        return self.s, COSTO_PASO, self.t >= MAX_PASOS, False


# --- Wrapper gymnasium (opcional) ------------------------------------------
try:  # pragma: no cover - import opcional
    import gymnasium as _gym
    from gymnasium import spaces as _spaces
    _GYM_DISPONIBLE = True
except Exception:  # ImportError y cualquier incompatibilidad inesperada
    _gym = None
    _spaces = None
    _GYM_DISPONIBLE = False


if _GYM_DISPONIBLE:

    class BancoTabularGym(_gym.Env):
        """Wrapper `gymnasium.Env` opcional (sólo si gymnasium está instalado).

        La interfaz `BancoTabular` original sigue siendo la principal para el
        entrenamiento de `train.py`; este wrapper sirve para integrarse con
        ecosistemas que esperan `gymnasium.Env` (SB3, RLlib, etc.).
        """

        metadata = {"render_modes": []}

        def __init__(self, tablas):
            super().__init__()
            self.rexec = tablas["rexec"]
            self.exacto = tablas["exacto"]
            self.action_space = _spaces.Discrete(N_ACCIONES)
            self.observation_space = _spaces.Discrete(N_ESTADOS)
            self.s = 0
            self.t = 0

        def reset(self, *, seed=None, options=None):
            super().reset(seed=seed)
            self.s, self.t = 0, 0
            return self.s, {}

        def step(self, action):
            self.t += 1
            if action == EJECUTAR:
                r = COSTO_PASO + self.rexec[self.s]
                return self.s, r, True, False, {"exito": self.exacto[self.s]}
            self.s |= 1 << int(action)
            truncado = self.t >= MAX_PASOS
            return self.s, COSTO_PASO, False, truncado, {"exito": False}

else:  # pragma: no cover

    BancoTabularGym = None  # type: ignore[assignment]