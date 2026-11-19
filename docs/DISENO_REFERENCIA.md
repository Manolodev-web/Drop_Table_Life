# Diseño Visual y Pedagógico de Referencia

Este documento alinea a todas las IAs de **Interfaz**, **Escena 3D**, **Audio/FX** y **Contenido** para mantener coherencia estética y educativa.

---

## 1. Referencia Visual y de Experiencia (`halloween.dev`)

El 3D **no es el juego completo**, sino la **atmósfera y puerta de entrada** al sistema operativo simulado.

* **Presupuesto técnico estricto (Vercel Free):**
  * Peso total de assets 3D + texturas + audio: **≤ 5–10 MB**.
  * Modelos `.glb` low-poly (≤ 10 000 triángulos por objeto), texturas ≤ 1024 px.
  * **Plan B obligatorio:** si no hay WebGL o en pantallas muy pequeñas, mostrar una vista 2D estática con efecto parallax y botón directo *"Encender monitor"*.
* **Flujo de entrada:**
  1. **Escena 3D del escritorio:** escritorio nocturno/oficina bancaria minimalista (monitor, teclado, taza de café, post-its con pistas/contraseñas, celular). Iluminación fija simple (sin sombras pesadas en tiempo real).
  2. **Transición (*camera lerp*):** al hacer clic en el monitor, la cámara hace zoom suave hacia la pantalla y dispara el evento `nexus:monitor-click`.
  3. **Sistema Operativo 2D (dentro del monitor):**
     * Pantalla de bloqueo rápida → Escritorio con barra de tareas/dock y **ventanas flotantes** movibles/minimizables:
       * **Academia SQL:** lecciones interactivas y progreso (Módulo 1).
       * **Correo / Chat del Banco:** tickets y alertas con límite de tiempo / SLA (Módulos 2 y 3).
       * **Terminal SQL:** editor con resaltado básico, botón `Ejecutar`, tabla de resultados y visor de esquema (`sql.js`).
       * **Panel RL / Auditoría:** curvas de aprendizaje, tabla Q / valores $V(s)$ en vivo y revisión de PRs/consultas del agente.
* **Atmósfera y FX:**
  * Sonidos cortos (`.mp3`/`.ogg`): tecleo, notificación de correo/chat, error SQL, éxito/logro, ambiente sutil con botón de silencio visible.
  * Feedback visual claro: animación de "sello aprobado", *shake* suave en error de sintaxis, badge de logro desbloqueado.

---

## 2. Referencia Pedagógica y Progresión (`aprendesql.dev`)

Cero fricción: el jugador escribe SQL real desde el primer minuto en `sql.js` sobre una base de datos bancaria coherente (`sucursales`, `clientes`, `cuentas`, `transacciones`, `creditos`).

### Estructura en 3 Módulos (Curriculum Learning)

| Módulo | Rol del jugador | Bloques SQL (estilo `aprendesql.dev`) | Rol de la IA / RL |
|---|---|---|---|
| **1. Estudiante** *(MVP principal)* | Universitario aprendiendo desde cero | 1. `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`<br>2. `INNER/LEFT JOIN`, `NULL`<br>3. `COUNT`, `SUM`, `GROUP BY`, `HAVING`<br>4. Subconsultas, `FOREIGN KEY`, `INDEX` | **Tutor Adaptativo (Bandit en JS):** detecta en qué `clausula_tag` falla el estudiante y prioriza el siguiente ejercicio/lección. |
| **2. Pasante (Junior)** | Practicante en el banco | Reportes con datos sucios (`NULL`, duplicados), optimización básica, simulación de respaldos (`pg_dump`) y permisos | **Agente Competidor / Compañero (RL):** resuelve la misma bandeja de tickets eligiendo piezas SQL; el jugador ve cómo converge la política. |
| **3. Senior / DBA** | Guardia crítica en producción | Incidentes bajo presión: picos de tráfico simulados, latencia, bloqueos/deadlocks lógicos y auditoría de PRs peligrosos (ej. `UPDATE`/`DELETE` sin `WHERE`) | **Director de Caos / Pasante IA:** inyecta eventos según el rendimiento o propone PRs con consultas que el jugador debe aprobar o rechazar antes de que venza el SLA. |

### Reglas para redactar contenido y misiones
1. **En español claro y tono bancario realista** (correos breves de Dirección de Riesgos, Auditoría, Soporte).
2. **Retroalimentación accionable:** si la consulta falla, indicar si hubo error de sintaxis SQLite o si faltaron/sobraron columnas o filas frente al resultado esperado.
3. **Progreso local:** guardar misiones completadas, lecciones, logros y estadísticas del Tutor en `localStorage` (sin login obligatorio).
