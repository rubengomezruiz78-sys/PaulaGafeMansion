# Historial de versiones — Paula, Gafe y el misterio de la mansión encantada

## v1.2 (versionCode 3) — 2026-07-23
Hibridación: se aplicaron sobre la versión Claude las soluciones del diagnóstico
de ChatGPT/Codex, aprovechando la solución ya implementada.

### Motor de juego
- **Motor de estados real con gating de puzzles**: cada mecanismo exige antes
  conversación (`talkFlag`), pista física (`clueFlag`), el objeto correcto en la
  mochila y los puzzles previos resueltos (`prior`). Ya no se puede abrir un
  mecanismo saltándose la historia.
- **Inventario interactivo**: selección de objetos, verbo USAR funcional sobre
  los mecanismos, y realimentación clara en la mochila.
- **Combinaciones de objetos** (`inventoryCombinations`) y reacciones de las
  **pistas falsas** al usarlas en un mecanismo (con susto opcional de la casa).
- **Final completo**: torre, regreso con Inés acompañando a Paula, epílogo por
  tarjetas y opción **Nueva partida** con confirmación.

### Android
- **Botón Atrás** nativo (`__onAndroidBack`) con navegación coherente por capas
  (modales → diálogo → puzzle → cuaderno → objeto → sala anterior → salir).
- **Ambiente sonoro** mejorado (pad + viento + LFO) y limpieza de recursos en el
  ciclo de vida.
- **Voz** robusta: micrófono nativo Android o Web Speech como respaldo; el
  teclado siempre disponible.

### Recursos y build
- **Fuentes servidas localmente** desde `/public/fonts` (Cinzel, Inter, Ubuntu
  Mono) — sin dependencia de red.
- **Purga de recursos legacy** en el build (plugin de Vite) → APK de **24,9 MB**
  (antes 35,8 MB).
- Firma release **V2**, alineado a 4 bytes, `minSdk 26` (Android 8+),
  `targetSdk 35`.

### UI
- Verificado sin recortes ni scroll horizontal a **1024×640** y hasta **640×360**.

## v1.1 (versionCode 2) — base Claude
Versión previa: exploración, diálogos, puzzles aritméticos y salas, sin gating
de mecanismos ni inventario interactivo ni final/nueva partida.
