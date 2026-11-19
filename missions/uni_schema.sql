-- Base de datos universitaria para CampusOS (Nivel 1: Estudiante)
-- Compatible con SQLite / sql.js

DROP TABLE IF EXISTS inscripciones;
DROP TABLE IF EXISTS materias;
DROP TABLE IF EXISTS aulas;
DROP TABLE IF EXISTS docentes;
DROP TABLE IF EXISTS estudiantes;

CREATE TABLE estudiantes (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  carrera TEXT NOT NULL,
  semestre INTEGER NOT NULL,
  edad INTEGER NOT NULL
);

CREATE TABLE docentes (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  especialidad TEXT NOT NULL,
  correo TEXT NOT NULL
);

CREATE TABLE materias (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  creditos INTEGER NOT NULL,
  docente_id INTEGER NOT NULL,
  FOREIGN KEY (docente_id) REFERENCES docentes(id)
);

CREATE TABLE inscripciones (
  id INTEGER PRIMARY KEY,
  estudiante_id INTEGER NOT NULL,
  materia_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  nota REAL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  FOREIGN KEY (materia_id) REFERENCES materias(id)
);

CREATE TABLE aulas (
  id INTEGER PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  edificio TEXT NOT NULL,
  capacidad INTEGER NOT NULL
);

INSERT INTO docentes (id, nombre, apellido, especialidad, correo) VALUES
  (1, 'Ricardo', 'Rojas', 'Bases de Datos', 'r.rojas@universidad.edu'),
  (2, 'Elena', 'Mendoza', 'Ingeniería de Software', 'e.mendoza@universidad.edu'),
  (3, 'Carlos', 'Vega', 'Sistemas Distribuidos', 'c.vega@universidad.edu'),
  (4, 'Sofía', 'Castro', 'Analítica de Datos', 's.castro@universidad.edu'),
  (5, 'Javier', 'Paredes', 'Redes y Seguridad', 'j.paredes@universidad.edu');

INSERT INTO aulas (id, codigo, edificio, capacidad) VALUES
  (1, 'A-204', 'Bloque Ingeniería', 40),
  (2, 'LAB-01', 'Centro de Cómputo', 30),
  (3, 'LAB-02', 'Centro de Cómputo', 28),
  (4, 'B-105', 'Bloque Ciencias', 45),
  (5, 'C-302', 'Posgrado', 25);

INSERT INTO materias (id, nombre, codigo, creditos, docente_id) VALUES
  (1, 'Bases de Datos I', 'DAT-201', 5, 1),
  (2, 'Programación Web', 'SIS-204', 4, 2),
  (3, 'Estructuras de Datos', 'SIS-108', 5, 3),
  (4, 'Estadística Aplicada', 'MAT-210', 4, 4),
  (5, 'Redes de Computadoras', 'SIS-301', 4, 5),
  (6, 'Taller de Bases de Datos', 'DAT-255', 5, 1);

INSERT INTO estudiantes (id, nombre, apellido, carrera, semestre, edad) VALUES
  (1,  'Mateo',    'Quispe',    'Sistemas',   4, 20),
  (2,  'María',    'Flores',    'Sistemas',   5, 22),
  (3,  'Marco',    'Salazar',   'Industrial', 3, 19),
  (4,  'Mariana',  'Torrez',    'Sistemas',   6, 24),
  (5,  'Miguel',   'Choque',    'Industrial', 5, 23),
  (6,  'Mónica',   'Ríos',      'Sistemas',   4, 21),
  (7,  'Ana',      'Gutiérrez', 'Sistemas',   3, 19),
  (8,  'Andrés',   'Mamani',    'Industrial', 4, 21),
  (9,  'Alejandro','Vargas',    'Civil',      5, 22),
  (10, 'Lucía',    'Pérez',     'Sistemas',   7, 25),
  (11, 'Diego',    'Morales',   'Sistemas',   4, 20),
  (12, 'Valeria',  'Cruz',      'Sistemas',   4, 19),
  (13, 'Camila',   'Rojas',     'Industrial', 2, 18),
  (14, 'Sebastián','Loayza',    'Civil',      6, 23),
  (15, 'Daniela',  'Poma',      'Sistemas',   5, 22),
  (16, 'Martín',   'Aguilar',   'Civil',      4, 20),
  (17, 'Natalia',  'Herrera',   'Industrial', 6, 25),
  (18, 'Gabriel',  'Navarro',   'Sistemas',   2, 18),
  (19, 'Paula',    'Sánchez',   'Civil',      3, 19),
  (20, 'Manuel',   'Ortega',    'Industrial', 4, 21),
  (21, 'Fernanda', 'Lima',      'Sistemas',   8, 26),
  (22, 'Rodrigo',  'Benítez',   'Civil',      2, 18),
  (23, 'Melissa',  'Zeballos',  'Sistemas',   5, 22),
  (24, 'Adriana',  'Cordero',   'Industrial', 3, 20);

INSERT INTO inscripciones (id, estudiante_id, materia_id, fecha, nota) VALUES
  (1,  1,  1, '2026-08-10', 85),
  (2,  1,  2, '2026-08-10', 90),
  (3,  2,  1, '2026-08-11', 92),
  (4,  2,  6, '2026-08-11', 88),
  (5,  3,  4, '2026-08-11', 76),
  (6,  4,  1, '2026-08-12', 95),
  (7,  4,  6, '2026-08-12', 91),
  (8,  5,  4, '2026-08-12', 79),
  (9,  6,  1, '2026-08-12', 84),
  (10, 7,  1, '2026-08-13', 88),
  (11, 8,  4, '2026-08-13', 81),
  (12, 9,  4, '2026-08-13', 73),
  (13, 10, 6, '2026-08-14', 94),
  (14, 11, 1, '2026-08-14', 78),
  (15, 12, 1, '2026-08-14', 89),
  (16, 13, 4, '2026-08-15', 82),
  (17, 14, 3, '2026-08-15', 75),
  (18, 15, 1, '2026-08-15', 87),
  (19, 16, 4, '2026-08-16', 70),
  (20, 17, 4, '2026-08-16', 86),
  (21, 18, 3, '2026-08-16', 80),
  (22, 19, 4, '2026-08-17', 77),
  (23, 20, 1, '2026-08-17', 83),
  (24, 21, 6, '2026-08-17', 96),
  (25, 22, 3, '2026-08-18', 74),
  (26, 23, 1, '2026-08-18', 91),
  (27, 24, 4, '2026-08-18', 85);
