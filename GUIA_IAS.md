# Guía de orquestación de IAs gratuitas · Banco Nexus

> **Aviso importante.** Los límites de los planes gratuitos cambian cada pocas semanas y la mayoría de los datos de esta guía vienen de reseñas de terceros (noviembre de 2026), no de las páginas oficiales. Antes de apoyarte en un límite, compruébalo en la propia herramienta. Las recomendaciones de "qué IA para qué" son una **hipótesis de partida**, no un hecho: la sección 6 te enseña a verificarlas en 15 minutos.

---

## 1. Principio básico: el repositorio es la memoria

Las IAs gratuitas **no recuerdan** tu proyecto entre conversaciones y algunas tienen contexto corto. Por eso:

1. Todo lo importante vive en GitHub: `README.md`, `docs/CONTRATOS.md`, `docs/AGENTES.md` y esta guía.
2. Cada sesión con una IA empieza pegando un **paquete de contexto** (sección 7a), no explicando todo de nuevo.
3. Las decisiones se anotan en `docs/DECISIONES.md` (una línea por decisión: fecha, qué y por qué). Así cualquier IA nueva se pone al día en un minuto.
4. Se trabaja en tareas pequeñas, un archivo a la vez. Una tarea grande agota la cuota y el contexto.
5. **Tú eres el integrador.** Ninguna IA ve el proyecto completo: tú ejecutas, pruebas y decides.

## 2. Qué IA para qué (hipótesis inicial)

| Necesidad | Primera opción | Alternativa | Notas |
|---|---|---|---|
| **Analizar el video de halloween.dev** | Gemini (app o AI Studio) | Qwen Chat; o fotogramas a cualquier IA con visión | Gemini analiza video; el plan gratis limita la duración por clip. Verifica el límite actual |
| Imágenes de referencia (objetos 3D, estilo) | Gemini | ChatGPT | Los modelos de imagen más potentes suelen ser de pago; el gratis sirve para referencias |
| Código del RL y matemática | DeepSeek | Qwen | Muy usado para código y razonamiento; en su chat gratis no hay un tope de mensajes publicado más allá de un límite anti-bots |
| Código de la interfaz y Three.js | Qwen / DeepSeek | ChatGPT | Pide siempre el archivo completo |
| Textos largos: misiones, lecciones, informe | Kimi | ChatGPT | Contexto largo; el plan gratis tiene un cupo diario de mensajes |
| **Revisión cruzada del código** | otra IA distinta a la que lo escribió | — | Ver regla de las dos IAs (sección 5) |
| Decisiones de diseño y arquitectura | Claude (este chat) | ChatGPT | Cuota limitada: úsala para decidir, no para escribir todo el código |

**Sobre los benchmarks.** Existen (LiveCodeBench, SWE-bench, MMMU, Video-MME...) y miden cosas reales, pero no dicen cuál te irá mejor **en tu proyecto**, con tu código y en español. Las tablas de las reseñas mezclan versiones, fechas y a veces intereses comerciales. Decide con tu propia prueba (sección 6).

## 3. Cómo analizar el video de halloween.dev

### 3a. Aclaración
Claude no procesa video: solo imágenes y archivos. Una captura suelta no muestra **movimiento, tiempos ni transiciones**, que es justo lo que necesitas para el 3D. Para eso sirven un modelo que acepte video o una secuencia de fotogramas.

### 3b. Grabar
- Windows: `Win + G` (Barra de juegos) u OBS Studio. 1 a 3 minutos, **una acción por clip**.
- Clips sugeridos (máximo 1-2 min cada uno):
  1. Carga + escena del escritorio (movimiento de cámara, luces, objetos).
  2. Clic en el monitor: zoom, pantalla de bloqueo, escritorio del sistema.
  3. Abrir 3 apps (chat, terminal, correo): animaciones de ventanas.
  4. Sonido: graba también el audio del sistema.

### 3c. Opción A: Gemini (app o AI Studio)
- Sube el clip y pega el **prompt de análisis** (sección 7b).
- Si el clip es demasiado largo o falla la subida, córtalo en partes más cortas.

### 3d. Opción B: Qwen Chat
Si Gemini se queda sin cuota, prueba el chat de Qwen, que según reseñas admite entendimiento de video. Verifícalo con un clip corto antes de confiar en él.

### 3e. Opción C: fotogramas (funciona con cualquier IA con visión)
```bash
# 1 fotograma por segundo (necesitas ffmpeg instalado)
mkdir frames && ffmpeg -i clip1.mp4 -vf fps=1 frames/f_%03d.png
```
Sube 10 a 20 fotogramas por mensaje, **numerados**, y pide que describa los cambios entre uno y el siguiente. Con esto sí puedes pasármelos a mí.

### 3f. Verifica siempre
Las IAs de video **inventan detalles**. Comprueba al menos 3 datos al azar contra el video (un color, una duración, un objeto). Pide que escriba "no visible" cuando no se vea algo. Guarda el resultado en `docs/ANALISIS_HALLOWEEN.md`.

## 4. Pipeline 3D con herramientas gratuitas

**Presupuesto técnico** (halloween.dev pesa unos 5 MB en total, así que es un buen objetivo): escena completa ≤ 5 MB, cada objeto ≤ 10 000 triángulos, texturas ≤ 1024 px, formato **.glb**.

| Ruta | Qué hacer | Pros | Contras |
|---|---|---|---|
| **A. Assets libres (recomendada)** | Kenney, Quaternius, Poly Pizza, Poly Haven (CC0 o similares), Sketchfab filtrando por CC0 | Cero riesgo de licencia, ya optimizados | Aspecto menos único |
| **B. IA imagen→3D** | Gemini genera una imagen de referencia, y la conviertes con Meshy o Tripo | Objetos a medida en minutos | Créditos limitados, licencias con condiciones, topología que debes limpiar |
| **C. Blender (tú)** | Modelas y limpias en Blender | Control total | Tiempo |

**Condiciones del plan gratuito de la ruta B** (según reseñas; confírmalo en cada sitio):
- **Meshy:** el modelo más reciente muestra la vista previa pero bloquea la descarga en gratis; modelos anteriores sí se descargan con un tope mensual y uso no comercial.
- **Tripo:** da créditos mensuales, pero el uso gratuito exige atribución (CC BY 4.0).
- **Hunyuan3D / TRELLIS:** de código abierto, pero los modelos locales piden GPU, y tú no tienes. Revisa si hay demos en línea.

**Flujo recomendado:** Gemini (imagen de referencia con prompt 7d) → Tripo/Meshy (GLB) → Blender (reducir polígonos con Decimate, recentrar el origen, escalar, borrar suelos que la IA añadió) → exportar GLB → probar en Three.js → anotar licencia en `web/scene/ASSETS.md`.

## 5. Protocolo de trabajo diario

1. **Issue en GitHub** con la tarea, el agente responsable y el criterio de "hecho".
2. **Paquete de contexto** (7a) pegado en la IA elegida + la tarea.
3. La IA devuelve **el archivo completo**, no fragmentos.
4. **Tú pruebas en local.** Si falla, pegas el error exacto y pides la corrección.
5. **Commit en una rama** del agente y abres PR.
6. **Regla de las dos IAs:** una IA distinta revisa el código (prompt 7c). La que lo escribió no se autorrevisa.
7. Anotas en `DECISIONES.md` lo que se decidió.

**Cuando una IA agota su cuota:** cambia a otra con el mismo paquete de contexto. Por eso conviene que todo esté en archivos y no en la memoria de una conversación.

**Privacidad:** no pegues claves, contraseñas ni datos personales. Los planes gratuitos suelen permitir que tus conversaciones se usen para mejorar el modelo; revisa los ajustes de cada servicio.

## 6. Tu propio benchmark en 15 minutos

Antes de asignar IAs a agentes, haz la misma tarea en 3 o 4 de ellas:

> "Con este `rl.js` y este `index.html`, añade un botón que exporte la tabla Q a un archivo JSON. No cambies `data.js` ni la interfaz de `rl.js`."

| Criterio | IA 1 | IA 2 | IA 3 | IA 4 |
|---|---|---|---|---|
| ¿Funciona a la primera? (0-2) | | | | |
| ¿Respeta el contrato? (0-2) | | | | |
| ¿Entregó el archivo completo? (0-1) | | | | |
| ¿Explicó bien lo que hizo? (0-1) | | | | |
| **Total** | | | | |

Repite con una tarea de video/imagen para elegir tu IA de análisis visual.

## 7. Plantillas de prompts

### 7a. Paquete de contexto (pégalo al inicio de cada sesión)
```
Contexto: proyecto "Banco Nexus", juego educativo de SQL con un agente de
aprendizaje por refuerzo tabular (Q-learning y SARSA).
Rol que debes asumir: agente <NOMBRE>. Solo puedes tocar la carpeta <CARPETA>.
Reglas: no cambies los formatos de docs/CONTRATOS.md. Si algo es ambiguo,
pregunta antes de inventar. Devuelve archivos COMPLETOS, no fragmentos.
Stack: Python 3 (rl/), JavaScript sin dependencias (web/), Three.js (escena).

[pegar README.md]
[pegar docs/CONTRATOS.md]
[pegar tu sección de docs/AGENTES.md]
[pegar los archivos concretos que vas a modificar]

Tarea: <describir una sola tarea pequeña>
Criterio de hecho: <cómo comprobaré que funciona>
```

### 7b. Análisis de video (para Gemini u otra IA con video)
```
Analiza este video de un juego web 3D (escritorio de oficina + sistema
operativo simulado). Quiero reproducir su estructura técnica y visual en
un proyecto propio. Responde en Markdown, con marcas de tiempo (mm:ss).
Si algo no se ve con claridad escribe "no visible"; NO inventes.

1. Secuencia de escenas y duración de cada una.
2. Cámara: posición inicial, movimientos, duración y tipo de aceleración
   (lineal, suave...) en cada transición.
3. Iluminación: tipos de luz que parecen usarse, colores aproximados
   (hex), dirección, sombras, reflejos, efectos (bloom, grano, lluvia).
4. Objetos 3D visibles: lista con tamaño relativo y posición sobre el
   escritorio, y cuáles tienen interacción.
5. Interfaz del sistema simulado: ventanas, barras, tipografías, colores
   (hex), animaciones al abrir/cerrar.
6. Sonido: qué suena y cuándo (ambiente, clics, notificaciones).
7. Interacciones: qué se puede pulsar, qué ocurre y cuánto tarda.
8. Detalles de narrativa o ambientación que refuerzan el clima.
Al final, una lista de "preguntas que no se pueden responder solo con
el video".
```

### 7c. Revisión cruzada de código
```
Eres revisor. Te paso el código que escribió otra IA y el contrato que
debe respetar. Revisa: (1) errores o casos límite, (2) si rompe el
contrato, (3) si se puede simplificar, (4) qué pruebas faltan. Sé
concreto: cita la línea y propone la corrección. No reescribas todo.
```

### 7d. Imagen de referencia para un objeto 3D
```
Un <objeto> de escritorio de oficina bancaria, estilo low-poly, colores
planos, vista 3/4 sobre fondo blanco liso, sin sombras, una sola pieza
centrada, sin texto ni logotipos.
```

### 7e. Instrucciones de limpieza para Blender
```
Importa el GLB. Aplica el modificador Decimate hasta ≤10 000 triángulos.
Recentra el origen (Set Origin → Geometry to Origin). Escala a metros
reales. Borra suelos o geometría sobrante. Reduce texturas a 1024 px.
Exporta como GLB con compresión.
```

## 8. Asignación sugerida (a validar con la sección 6)

| Agente (docs/AGENTES.md) | IA principal | Revisor |
|---|---|---|
| 1. RL-Núcleo | DeepSeek | Claude o ChatGPT |
| 2. Misiones y datos | Kimi | ChatGPT |
| 3. Interfaz | Qwen o DeepSeek | otra distinta |
| 4. Escena 3D | Gemini (video/imágenes) + Qwen/DeepSeek (código Three.js) | ChatGPT |
| 5. Audio y FX | ChatGPT o Gemini (lista de sonidos y animaciones) | — |
| 6. Contenido, QA e informe | Kimi | Claude |

**Regla de oro para el RL:** es lo que te evalúan. Puedes pedir el código a una IA, pero tienes que poder **explicar cada línea del entorno, la recompensa y la actualización de Q-learning y SARSA**. Ejecuta, rompe y modifica el código hasta entenderlo.

## 9. Checklist de licencias
- [ ] Cada modelo 3D, textura, fuente y sonido está anotado con su licencia y su origen.
- [ ] Nada copiado de halloween.dev (modelos, sonidos, código). Solo se aprende de su arquitectura.
- [ ] Los assets con atribución obligatoria aparecen en una página de créditos del juego.
- [ ] Los créditos de IAs generativas respetan sus condiciones de uso (algunas gratuitas son solo no comerciales).
