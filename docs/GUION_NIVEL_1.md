# Guion Oficial — Nivel 1: "El parcial que no esperabas" (`CampusOS`)

> Documento base del Acto 1 (Estudiante). Todas las IAs deben respetar este flujo, identidad (`CampusOS`, sin mencionar Banco Nexus hasta el correo final) y progresión pedagógica.

## 1. Contexto e Identidad
- **Escenario 3D:** Aula universitaria (media mañana, ~10:20 a.m.). El protagonista ya está sentado frente a su laptop, con cuaderno abierto, café y celular.
- **Sistema Operativo:** `CampusOS` (computadora personal de estudiante). **NO** muestra "Banco Nexus" en ningún lado durante el Nivel 1.
- **Contraseña:** `SELECTme` (pista en la taza de café → apunta al cuaderno/apuntes).
- **Apps de `CampusOS`:**
  1. **Práctica SQL** (estilo LearnSQL: enunciado/teoría + Tutor RL a la izquierda, editor SQL arriba a la derecha, pestañas `Resultados` / `Base de datos` abajo).
  2. **Visor E-R** (interactivo con las 5 tablas: `estudiantes`, `docentes`, `materias`, `inscripciones`, `aulas`, resaltando PK y FK).
  3. **Apuntes de clase** (4 PDFs/fichas cortas: qué es BD, Entidad/Tabla/Atributo, Llaves PK/FK, Anatomía de `SELECT`).
  4. **Mensajes (Celular)** (grupo `BD — Supervivientes del parcial`, Diego, Valeria, Docente).
  5. **Progreso académico** (5 bloques, insignias y XP no punitivo).

## 2. Escenas Narrativas
- **Escena 1 (Aula + Celular):** Vibración del celular (`[AUDIO: ring_celular.mp3]`). Mensaje de Diego/Valeria con 3 opciones de respuesta (A, B, C; la opción C recibe *"¡Mentiroso, si te acabo de ver sentado ahí!"*). Luego aviso del Docente para abrir la práctica en `CampusOS`.
- **Escena 3 (Café y Contraseña):** Al inspeccionar la taza aparece la pista hacia los apuntes (`Clave: SELECTme`).
- **Escena 4 (Tutor RL):** Asistente amable e informal con **escalera adaptativa de 3 niveles** (nunca ridiculiza ni quita puntos):
  1. *1er error:* Pista puntual según categoría de error (`falta_from`, `like_con_igual`, `and_en_vez_de_or`, `falta_distinct`, etc.).
  2. *2do error:* Ejemplo guiado más sencillo.
  3. *3er+ error:* Plantilla con espacios o descomposición paso a paso.
- **Escena 7 (Seguimiento por celular):** Al terminar los 5 bloques, Diego pregunta cómo te fue (2 opciones con respuesta lógica) y permite volver a repasar cualquier bloque.
- **Escena 9 (Puente al Nivel 2):** Llega correo de *Selección y Talento*: recomendación para programa de pasantías en **Banco Nexus** (desbloquea Escenario 2).

## 3. Bloques Pedagógicos (Nivel 1)
1. **Bloque 1 — Fundamentos y `SELECT`:** `*`, columnas específicas (`nombre, carrera`), pregunta conceptual + ejercicio (`SELECT nombre, semestre FROM estudiantes`). Insignia: *Primera consulta*.
2. **Bloque 2 — `WHERE` y operadores:** `=`, `>`, `<`, `AND`, `OR`. Ejercicio final: Sistemas mayores de 20 años. Insignia: *Detective de datos*.
3. **Bloque 3 — Búsqueda avanzada:** `BETWEEN`, `LIKE`, `IN`. Ejercicio final: Sistemas o Industrial, 18–25 años, nombre que empieza con `'M'`. Insignia: *Búsqueda avanzada*.
4. **Bloque 4 — `ORDER BY` y `DISTINCT`:** `ASC`, `DESC`, eliminación de duplicados. Ejercicio final: carreras únicas ordenadas alfabéticamente. Insignia: *Organizador de datos*.
5. **Bloque 5 — El parcial universitario:** Reto integrador (`SELECT DISTINCT nombre, carrera, edad FROM estudiantes WHERE carrera IN ('Sistemas', 'Industrial') AND edad BETWEEN 18 AND 25 AND nombre LIKE 'M%' ORDER BY edad DESC`). Validador por **resultado**, no por texto literal. Insignia: *Sobreviviente del parcial*.
