"""Banco Nexus - Entorno tabular de RL para una mision de SQL.

MDP
---
Estado   : mascara de 8 bits con las piezas de consulta ya elegidas (256 estados).
Acciones : 8 piezas de consulta + EJECUTAR (9 acciones).
Recompensa: -0.01 por paso; al ejecutar se suma el resultado de la consulta
            (-0.5 invalida, +1 exacta, parcial segun solapamiento de filas).
Fin      : al ejecutar, o tras MAX_PASOS (truncado).

Como el estado es exactamente el conjunto de piezas elegidas y la consulta
solo depende de ese conjunto, el estado cumple la propiedad de Markov.
"""
import random
import sqlite3

PIEZAS = [
    "FROM clientes",            # 0
    "JOIN sucursales",          # 1
    "SELECT nombre",            # 2
    "SELECT saldo",             # 3
    "WHERE saldo < 0",          # 4
    "WHERE ciudad = 'La Paz'",  # 5
    "ORDER BY saldo ASC",       # 6
    "ORDER BY saldo DESC",      # 7
    "EJECUTAR",                 # 8
]
FROM, JOIN, COL_NOMBRE, COL_SALDO, W_SALDO, W_CIUDAD, ORD_ASC, ORD_DESC, EJECUTAR = range(9)
N_ESTADOS = 256
N_ACCIONES = 9
COSTO_PASO = -0.01
MAX_PASOS = 20

MISION = {
    "id": "m1_saldos_negativos",
    "titulo": "Saldos en rojo en La Paz",
    "remitente": "Direccion de Riesgos",
    "correo": (
        "Buen dia. Auditoria nos pidio la lista de clientes de la sucursal "
        "La Paz con saldo negativo. Necesito nombre y saldo, del mas "
        "endeudado al menos endeudado. Lo necesito antes del mediodia."
    ),
    "consulta_esperada": (
        "SELECT c.nombre, c.saldo FROM clientes c "
        "JOIN sucursales s ON c.sucursal_id = s.id "
        "WHERE c.saldo < 0 AND s.ciudad = 'La Paz' ORDER BY c.saldo ASC"
    ),
}


def crear_bd(seed: int = 42) -> sqlite3.Connection:
    rnd = random.Random(seed)
    con = sqlite3.connect(":memory:")
    con.executescript(
        """
        CREATE TABLE sucursales (id INTEGER PRIMARY KEY, ciudad TEXT);
        CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT,
                               saldo REAL, sucursal_id INTEGER);
        """
    )
    ciudades = ["La Paz", "Santa Cruz", "Cochabamba"]
    con.executemany("INSERT INTO sucursales VALUES (?, ?)", list(enumerate(ciudades, 1)))
    filas = [
        (i, f"Cliente {i}", round(rnd.uniform(-800, 4000), 2), rnd.randint(1, 3))
        for i in range(1, 201)
    ]
    con.executemany("INSERT INTO clientes VALUES (?, ?, ?, ?)", filas)
    return con


def construir_sql(mask: int):
    """Traduce una mascara de piezas a SQL. None si aun no es ejecutable."""
    usa = lambda i: bool(mask >> i & 1)
    if not usa(FROM) or not (usa(COL_NOMBRE) or usa(COL_SALDO)):
        return None
    cols = (["c.nombre"] if usa(COL_NOMBRE) else []) + (["c.saldo"] if usa(COL_SALDO) else [])
    sql = f"SELECT {', '.join(cols)} FROM clientes c"
    if usa(JOIN):
        sql += " JOIN sucursales s ON c.sucursal_id = s.id"
    cond = (["c.saldo < 0"] if usa(W_SALDO) else []) + (
        ["s.ciudad = 'La Paz'"] if usa(W_CIUDAD) else []
    )
    if cond:
        sql += " WHERE " + " AND ".join(cond)
    if usa(ORD_ASC):
        sql += " ORDER BY c.saldo ASC"
    elif usa(ORD_DESC):
        sql += " ORDER BY c.saldo DESC"
    return sql


def calcular_tablas(mision=MISION):
    """Precalcula, para cada estado, el SQL y la recompensa terminal."""
    con = crear_bd()
    esperado = con.execute(mision["consulta_esperada"]).fetchall()
    sqls, rexec, exacto = [], [], []
    for mask in range(N_ESTADOS):
        sql = construir_sql(mask)
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
    return {"sql": sqls, "rexec": rexec, "exacto": exacto, "filas_esperadas": len(esperado)}


class BancoTabular:
    """Entorno con la misma interfaz que usara el JS (rl.js)."""

    def __init__(self, tablas):
        self.rexec, self.exacto = tablas["rexec"], tablas["exacto"]

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
