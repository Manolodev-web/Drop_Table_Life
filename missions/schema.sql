-- ============================================================================
-- Banco Nexus - Esquema y datos semilla (SQLite)
-- Compatible con sql.js (navegador) y sqlite3 (Python).
-- Datos deterministas: mismos INSERT siempre producen la misma base.
-- ============================================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sucursales (
    id        INTEGER PRIMARY KEY,
    ciudad    TEXT NOT NULL UNIQUE,
    gerente   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
    id            INTEGER PRIMARY KEY,
    nombre        TEXT NOT NULL,
    saldo         REAL NOT NULL DEFAULT 0,
    sucursal_id   INTEGER NOT NULL REFERENCES sucursales(id)
);

CREATE TABLE IF NOT EXISTS cuentas (
    id          INTEGER PRIMARY KEY,
    cliente_id  INTEGER NOT NULL REFERENCES clientes(id),
    tipo        TEXT NOT NULL CHECK (tipo IN ('ahorro', 'corriente')),
    saldo       REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transacciones (
    id         INTEGER PRIMARY KEY,
    cuenta_id  INTEGER NOT NULL REFERENCES cuentas(id),
    tipo       TEXT NOT NULL CHECK (tipo IN ('deposito', 'retiro', 'transferencia')),
    monto      REAL NOT NULL CHECK (monto > 0),
    fecha      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creditos (
    id              INTEGER PRIMARY KEY,
    cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
    monto_aprobado  REAL NOT NULL CHECK (monto_aprobado > 0),
    tasa            REAL NOT NULL,
    estado          TEXT NOT NULL CHECK (estado IN ('activo', 'pagado', 'vencido'))
);

-- ----------------------------------------------------------------------------
-- Sucursales
-- ----------------------------------------------------------------------------
INSERT INTO sucursales (id, ciudad, gerente) VALUES
    (1, 'La Paz',       'Marcela Quiroga'),
    (2, 'Santa Cruz',   'Rodrigo Peña'),
    (3, 'Cochabamba',   'Paola Arce'),
    (4, 'El Alto',      'Ernesto Vilca'),
    (5, 'Tarija',       'Lucía Méndez');

-- ----------------------------------------------------------------------------
-- Clientes (30). Sucursal 1 = La Paz.
-- Hay saldos negativos en La Paz (ids 3, 7, 8) y varios saldos > 3000.
-- ----------------------------------------------------------------------------
INSERT INTO clientes (id, nombre, saldo, sucursal_id) VALUES
    (1,  'Ana Rojas',         5200.00,  1),
    (2,  'Luis Mercado',      3100.50,  1),
    (3,  'Carmen Paredes',    -450.75,  1),
    (4,  'Jorge Salinas',     1250.00,  1),
    (5,  'Miriam Flores',      890.25,  1),
    (6,  'Pedro Guamán',      -1280.40, 1),
    (7,  'Rosa Delgado',       640.00,  1),
    (8,  'Hugo Vargas',        -95.00,  1),
    (9,  'Sofía Banegas',     8700.00,  2),
    (10, 'Diego Arteaga',     2100.75,  2),
    (11, 'Elena Suárez',      4500.00,  2),
    (12, 'Marco Tórrez',       320.10,  2),
    (13, 'Julia Céspedes',    -780.60,  2),
    (14, 'Andrés Soliz',      1600.00,  2),
    (15, 'Valeria Paz',        275.40,  2),
    (16, 'Óscar León',        6100.00,  3),
    (17, 'Teresa Camacho',     940.00,  3),
    (18, 'Fabián Quiroz',     -310.20,  3),
    (19, 'Laura Encinas',     2980.00,  3),
    (20, 'Ricardo Molina',    -1560.00, 3),
    (21, 'Gabriela Ríos',     1830.55,  3),
    (22, 'Samuel Aramayo',    9800.00,  4),
    (23, 'Nadia Cárdenas',    -220.90,  4),
    (24, 'Iván Condori',       510.30,  4),
    (25, 'Claudia Apaza',     7200.00,  4),
    (26, 'Bruno Zeballos',    -640.15,  4),
    (27, 'Paula Vidal',       3300.00,  5),
    (28, 'Martín Luján',      -410.80,  5),
    (29, 'Diana Vargas',      1475.00,  5),
    (30, 'Raúl Pinto',         260.00,  5);

-- ----------------------------------------------------------------------------
-- Cuentas (43): ahorro y corriente, varias por cliente.
-- ----------------------------------------------------------------------------
INSERT INTO cuentas (id, cliente_id, tipo, saldo) VALUES
    (1,  1,  'ahorro',    5000.00),   (2,  1,  'corriente', 200.00),
    (3,  2,  'ahorro',    3000.00),   (4,  3,  'corriente', -300.00),
    (5,  4,  'ahorro',    1000.00),   (6,  5,  'corriente', 700.00),
    (7,  6,  'ahorro',   -1000.00),  (8,  7,  'corriente', 500.00),
    (9,  8,  'ahorro',      50.00),   (10, 9,  'ahorro',    8000.00),
    (11, 9,  'corriente',  700.00),   (12, 10, 'ahorro',    1900.00),
    (13, 11, 'corriente', 4000.00),   (14, 12, 'ahorro',     250.00),
    (15, 13, 'corriente', -600.00),  (16, 14, 'ahorro',    1500.00),
    (17, 15, 'corriente',  200.00),   (18, 16, 'ahorro',    6000.00),
    (19, 16, 'corriente',  100.00),   (20, 17, 'ahorro',     800.00),
    (21, 18, 'corriente', -250.00),  (22, 19, 'ahorro',    2800.00),
    (23, 20, 'ahorro',   -1300.00),  (24, 21, 'corriente', 1700.00),
    (25, 22, 'ahorro',    9500.00),  (26, 22, 'corriente',  300.00),
    (27, 23, 'ahorro',    -100.00),  (28, 24, 'corriente',  400.00),
    (29, 25, 'ahorro',    7000.00),  (30, 26, 'corriente', -500.00),
    (31, 27, 'ahorro',    3200.00),  (32, 28, 'ahorro',    -350.00),
    (33, 29, 'corriente', 1400.00),  (34, 30, 'ahorro',     200.00),
    (35, 4,  'corriente',  300.00),   (36, 10, 'corriente',  200.00),
    (37, 14, 'corriente',  100.00),   (38, 19, 'corriente',  150.00),
    (39, 21, 'ahorro',    1000.00),  (40, 25, 'corriente',  200.00),
    (41, 1,  'corriente',  100.00),  (42, 11, 'ahorro',     500.00),
    (43, 16, 'ahorro',     900.00);

-- ----------------------------------------------------------------------------
-- Transacciones (60): depositos, retiros y transferencias entre 2025-10-01 y 2025-11-10.
-- ----------------------------------------------------------------------------
INSERT INTO transacciones (id, cuenta_id, tipo, monto, fecha) VALUES
    (1,  1,  'deposito',      500.00, '2025-10-01'),
    (2,  1,  'retiro',        120.00, '2025-10-03'),
    (3,  1,  'deposito',     2000.00, '2025-10-05'),
    (4,  2,  'deposito',      150.00, '2025-10-02'),
    (5,  2,  'transferencia', 300.00, '2025-10-07'),
    (6,  3,  'deposito',      800.00, '2025-10-04'),
    (7,  4,  'retiro',         60.00, '2025-10-06'),
    (8,  5,  'deposito',      400.00, '2025-10-08'),
    (9,  6,  'transferencia', 250.00, '2025-10-09'),
    (10, 7,  'deposito',      100.00, '2025-10-10'),
    (11, 8,  'retiro',         80.00, '2025-10-11'),
    (12, 9,  'deposito',      500.00, '2025-10-12'),
    (13, 10, 'deposito',     1500.00, '2025-10-02'),
    (14, 10, 'retiro',        300.00, '2025-10-13'),
    (15, 11, 'deposito',      350.00, '2025-10-03'),
    (16, 12, 'deposito',      600.00, '2025-10-05'),
    (17, 13, 'deposito',     1200.00, '2025-10-06'),
    (18, 13, 'retiro',        200.00, '2025-10-15'),
    (19, 14, 'deposito',      100.00, '2025-10-07'),
    (20, 15, 'retiro',         90.00, '2025-10-08'),
    (21, 16, 'deposito',      700.00, '2025-10-09'),
    (22, 17, 'deposito',      180.00, '2025-10-10'),
    (23, 18, 'deposito',     2500.00, '2025-10-11'),
    (24, 18, 'transferencia', 900.00, '2025-10-12'),
    (25, 19, 'deposito',       80.00, '2025-10-13'),
    (26, 20, 'deposito',      500.00, '2025-10-14'),
    (27, 21, 'retiro',        120.00, '2025-10-15'),
    (28, 22, 'deposito',     1000.00, '2025-10-16'),
    (29, 23, 'deposito',       50.00, '2025-10-17'),
    (30, 24, 'deposito',      400.00, '2025-10-18'),
    (31, 25, 'deposito',     3000.00, '2025-10-01'),
    (32, 25, 'retiro',        500.00, '2025-10-19'),
    (33, 26, 'deposito',      200.00, '2025-10-02'),
    (34, 27, 'deposito',      150.00, '2025-10-03'),
    (35, 28, 'deposito',      220.00, '2025-10-04'),
    (36, 29, 'deposito',      900.00, '2025-10-05'),
    (37, 29, 'retiro',        300.00, '2025-10-20'),
    (38, 30, 'deposito',      100.00, '2025-10-06'),
    (39, 31, 'deposito',      700.00, '2025-10-07'),
    (40, 32, 'deposito',       80.00, '2025-10-08'),
    (41, 33, 'deposito',      450.00, '2025-10-09'),
    (42, 34, 'deposito',      110.00, '2025-10-10'),
    (43, 35, 'retiro',         70.00, '2025-10-11'),
    (44, 36, 'deposito',      260.00, '2025-10-12'),
    (45, 37, 'deposito',       95.00, '2025-10-13'),
    (46, 38, 'deposito',      140.00, '2025-10-14'),
    (47, 39, 'deposito',      800.00, '2025-10-15'),
    (48, 40, 'deposito',      180.00, '2025-10-16'),
    (49, 41, 'retiro',         40.00, '2025-10-17'),
    (50, 42, 'deposito',      350.00, '2025-10-18'),
    (51, 43, 'deposito',      600.00, '2025-10-19'),
    (52, 1,  'transferencia', 750.00, '2025-11-01'),
    (53, 10, 'deposito',     2200.00, '2025-11-02'),
    (54, 18, 'deposito',     1800.00, '2025-11-03'),
    (55, 25, 'deposito',     4000.00, '2025-11-04'),
    (56, 29, 'deposito',      600.00, '2025-11-05'),
    (57, 5,  'deposito',      300.00, '2025-11-06'),
    (58, 16, 'deposito',      900.00, '2025-11-07'),
    (59, 33, 'deposito',      250.00, '2025-11-08'),
    (60, 22, 'deposito',     5000.00, '2025-11-09');

-- ----------------------------------------------------------------------------
-- Creditos (12): algunos vencidos, incluidos montos > 5000.
-- ----------------------------------------------------------------------------
INSERT INTO creditos (id, cliente_id, monto_aprobado, tasa, estado) VALUES
    (1,  1,  8000.00,  0.12, 'activo'),
    (2,  2,  3000.00,  0.11, 'pagado'),
    (3,  3,  1500.00,  0.14, 'vencido'),
    (4,  4,  5000.00,  0.10, 'activo'),
    (5,  6,  6500.00,  0.15, 'vencido'),
    (6,  9, 12000.00,  0.09, 'activo'),
    (7,  10, 2500.00,  0.13, 'pagado'),
    (8,  13, 6800.00,  0.16, 'vencido'),
    (9,  16, 9000.00,  0.08, 'activo'),
    (10, 20, 5500.00,  0.17, 'vencido'),
    (11, 22, 20000.00, 0.07, 'activo'),
    (12, 25, 15000.00, 0.08, 'pagado');