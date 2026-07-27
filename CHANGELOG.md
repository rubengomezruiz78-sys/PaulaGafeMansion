# Historial de versiones — Paula, Gafe y el misterio de la mansión encantada

## v1.3.3 (versionCode 8) — 2026-07-23 · DOS ESCALAS COMPLETAS
Reescalado integral para que TODO el juego quepa en móviles apaisados bajos
(852×393 px CSS), en las dos escalas (Tablet y Móvil):
- **Modal de puzzle**: se compacta para que "Confirmar respuesta" y el campo de
  respuesta queden siempre visibles, sin scroll interno (antes el botón caía
  fuera a 393 px de alto).
- **Arquitectura corregida**: el modo Móvil agranda solo el HUD fijo (verbos,
  mochila, cabecera) que siempre cabe; los modales (puzzle, prólogo, epílogo,
  diálogo, cuaderno, ECO) se compactan por altura de forma común a ambos modos,
  evitando que las ampliaciones del modo Móvil dejaran botones fuera de pantalla.
- Verificado pantalla por pantalla a 852×393 en Móvil y Tablet: selector,
  título/Entrar, prólogo, juego, diálogo, cuaderno, ECO y puzzle — todo visible.

## v1.3.2 (versionCode 7) — 2026-07-23 · CORRECCIÓN IMPORTANTE
- **Arreglado: el botón "Entrar en la mansión" quedaba fuera de pantalla** en
  móviles apaisados de poca altura (p. ej. Redmi Note 15 ≈ 852×393 px CSS). El
  bloque de título usaba tamaños de escritorio y no cabía en 393 px de alto, así
  que el botón se recortaba abajo (`overflow:hidden`) y no se podía empezar.
- Se compacta la pantalla de título y el selector Tablet/Móvil en apaisado corto
  (`@media max-height:680px landscape`) y se hace desplazable como red de
  seguridad. Verificado a 852×393: selector, "Entrar" y conmutador visibles.

## v1.3.1 (versionCode 6) — 2026-07-23
- **Conmutador Tablet/Móvil siempre visible** en la cabecera del juego: se puede
  cambiar de modo en cualquier momento durante la partida (antes solo existía un
  enlace poco visible en el título, difícil de encontrar en móvil).
- Botón del título más claro: "Modo actual: … · tocar para cambiar a …".
- Ambos conmutadores alternan y guardan el modo directamente (sin volver a
  preguntar).

## v1.3 (versionCode 5) — 2026-07-23
- **Selector Tablet / Móvil al primer arranque**: pregunta "¿Dónde vas a jugar?"
  y ajusta los controles. La elección se guarda (`mansion-paula-device`) y se
  puede cambiar desde la pantalla de título ("Modo: … · cambiar").
- **Modo Móvil**: botones de verbos, mochila, diálogos y puzzles más grandes
  (targets táctiles ~54-78 px) y textos mayores, pensados para dedos de niña en
  pantalla pequeña. Ambos modos se juegan en horizontal.
- Sin desbordes ni scroll verificado en móvil apaisado (780×360) y tablet.
  Implementado con atributo `data-device` en `:root` y overrides CSS de mayor
  especificidad (no afecta al modo tablet).

## v1.2.1 (versionCode 4) — 2026-07-23
Correcciones tras escrutinio exhaustivo del código:
- **"Hablar" más indulgente**: en galería, observatorio, desván y túneles el
  objetivo de conversación ya se cumple hablando con cualquiera de la sala
  **o** con Gafe (antes exigía específicamente el botón 🐾 Gafe). El flag pasa a
  ser genérico `<escena>_talked`, que fijan tanto `speak()` como `askGafe()`.
- **Menos permisos**: eliminado `android.permission.INTERNET` del manifest
  (el juego es 100% offline; solo queda `RECORD_AUDIO` para la voz).
- **Guardado limpio**: la clave de guardado sube a `mansion-paula-v4` para no
  arrastrar partidas con el esquema de flags antiguo.
- **Dependencias**: `npm audit` a **0 vulnerabilidades** (Vite 8.1.5, solo
  desarrollo; no viaja en el APK). `tsc --noEmit` limpio.

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
