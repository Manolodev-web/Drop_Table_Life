# Plan de agentes · Banco Nexus

Seis agentes, cada uno dueño de **una carpeta**. Tú (el orquestador) decides, revisas los PR y mantienes los contratos de `docs/CONTRATOS.md`. Los agentes no editan carpetas ajenas: si necesitan un cambio, lo piden en el PR o en un issue.

## Reglas de trabajo (para todos)

1. Una rama por agente y tarea: `agente/<nombre>/<tarea>`. Nada se sube directo a `main`.
2. Cada PR explica qué cambió, cómo probarlo y adjunta captura o salida de consola.
3. Antes de empezar, el agente lee `README.md`, `docs/CONTRATOS.md` y su propia sección de este archivo.
4. Si algo no está en los contratos, el agente **pregunta** en lugar de inventar un formato.
5. Se prioriza lo que funciona sobre lo bonito: primero el flujo completo, después el pulido.

## Los agentes

### 1. RL-Núcleo · carpeta `rl/`
**Misión:** que el aprendizaje por refuerzo sea correcto, medible y defendible. Es lo que se evalúa.
- Mantener `env.py` y `train.py` (Q-learning y SARSA tabulares, MDP, Bellman).
- Soportar **varias misiones** leyendo `missions/missions.json` (hoy hay una fija).
- Estudio de hiperparámetros (α, γ, ε) y comparación Q-learning vs SARSA con varias semillas.
- Gráficas con matplotlib para el informe en `rl/resultados/`.
- Pruebas con pytest (el entorno, la convergencia, que la política final sea correcta).
- Exportar `web/data.js` siguiendo el contrato.

**Hecho cuando:** `python rl/train.py` entrena todas las misiones, genera gráficas y datos, y `pytest` pasa.

### 2. Misiones y datos · carpeta `missions/`
**Misión:** el mundo del banco y el catálogo de misiones.
- Base de datos del banco más rica (clientes, cuentas, transacciones, sucursales, créditos) con datos generados de forma reproducible.
- `missions.json`: de 5 a 6 misiones en 3 actos (Estudiante, Practicante, Senior) con correo del jefe, consulta esperada, tema SQL, dificultad y piezas permitidas.
- Una misión demostrativa del acto 3 con trigger o procedimiento (solo para el jugador, el agente no la resuelve).
- Textos narrativos y de logros.

**Hecho cuando:** cada misión tiene consulta esperada que se ejecuta sin error y el esquema valida contra `CONTRATOS.md`.

### 3. Interfaz "sistema operativo" · carpeta `web/app/`
**Misión:** el juego en sí: ventanas del escritorio del banco.
- Vite + Preact. Ventanas: correo/chat del jefe, terminal SQL (con **sql.js**), panel del agente, puntaje, logros, guardado (localStorage).
- Reutiliza `web/rl.js` y `web/data.js` (hoy en `web/`, ver el prototipo `web/index.html`).
- Pantalla de bloqueo → escritorio → misiones → resultado.
- Responsive y con teclado accesible.

**Hecho cuando:** se puede jugar una misión completa de principio a fin con puntaje y logro.

### 4. Escena 3D · carpeta `web/scene/`
**Misión:** el escritorio en 3D que envuelve al juego (solo es la entrada, no el juego).
- Three.js con WebGL clásico, unos 10 objetos low-poly con licencia libre (monitor, teléfono, taza, planta, candado, cámara...).
- Cámara que se acerca al monitor al hacer clic y dispara el evento de entrada al sistema operativo.
- Plan B si no hay WebGL: imagen estática con parallax.
- Documentar la licencia de cada asset en `web/scene/ASSETS.md`.

**Hecho cuando:** la escena carga en menos de 5 s, corre fluida y el clic en el monitor abre la interfaz.

### 5. Audio, efectos y animaciones · carpeta `web/fx/`
**Misión:** la atmósfera, que es lo que más pesa en la sensación de juego.
- Ambiente sonoro (ciudad, teclas, notificaciones) con Howler.js; 10 a 15 clips libres.
- Grano de película, transiciones, animaciones de logro y de "misión cumplida".
- Control de volumen y modo silencio.

**Hecho cuando:** hay un módulo `fx.play(nombre)` y `fx.animar(nombre)` documentado y usado por la interfaz.

### 6. Contenido, pruebas y documentación · carpetas `content/`, `docs/`, `tests/`
**Misión:** lo pedagógico y la calidad.
- Acto 1: 4 o 5 lecciones cortas con preguntas de opción múltiple (SELECT, WHERE, ORDER BY, JOIN, GROUP BY).
- Informe: formulación del MDP, ecuaciones de Bellman aplicadas, resultados Q-learning vs SARSA.
- Pruebas de integración, GitHub Actions y README.

**Hecho cuando:** el informe tiene gráficas reales y un tercero puede ejecutar el proyecto siguiendo el README.

## Orden recomendado (2 semanas)

| Fase | Días | Agentes en paralelo | Resultado |
|---|---|---|---|
| 0 | hecho | prototipo base | RL funcionando y visible |
| 1 | 1-5 | RL-Núcleo, Misiones, Interfaz | Misiones reales jugables en 2D |
| 2 | 6-10 | Escena 3D, Audio/FX | Atmósfera y entrada 3D |
| 3 | 11-14 | Contenido/QA + integración | Informe, pruebas, pulido |

Si el tiempo falla, se sacrifica primero la escena 3D y luego el audio. Nunca el RL ni el informe.

## Prompt inicial (plantilla)

> Eres el agente **<NOMBRE>** del proyecto Banco Nexus. Trabajas solo en `<CARPETA>`. Lee primero `README.md`, `docs/CONTRATOS.md` y tu sección de `docs/AGENTES.md`. Tu misión: <MISIÓN>. Crea la rama `agente/<nombre>/<tarea>`, trabaja en pasos pequeños, prueba lo que haces y abre un PR con la descripción y cómo verificarlo. No modifiques carpetas de otros agentes ni cambies formatos de `CONTRATOS.md` sin preguntarme. Si algo es ambiguo, pregunta antes de inventar.
