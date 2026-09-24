# Paula & Gafe — Mundo abierto (v2)

Reescritura completa del juego como **aventura de exploración libre** en Phaser 3.
El juego v1.x (React, `app/`) sirve **solo de inspiración**: historia, personajes,
arte y tono. Destino principal: **la tablet de Paula** (apaisado); el móvil
(Redmi Note 15, 852×393 CSS) se usa para probar y también debe funcionar.

## Requisitos del usuario (no negociables)
- Mundo abierto: zonas conectadas en grafo, exploración libre y no lineal.
- **Cero bugs**: lógica pura con tests, validador de contenido, solucionador de
  partida completa, pruebas en navegador (tablet y móvil) y en el dispositivo.
- **Personajes con IA offline, abundantes**: rutinas por hora, percepción,
  memoria/afinidad, charlas entre ellos que se pueden escuchar (y dan pistas),
  encargos propios. Nada sale del dispositivo, sin internet.
- **Movimiento natural**: aceleración/frenada, pasos sincronizados con la
  velocidad (sin patinar), balanceo al pisar, inclinación al girar, respiración
  en reposo; los fantasmas flotan con inercia.
- **Profundidad, medida y proporciones reales**: todo en metros. Cada escena se
  calibra (línea de horizonte + escala) con objetos de referencia del cuadro;
  los personajes escalan con la profundidad, se ordenan por Y y llevan sombra.
- Tablet primero. Sin preguntas ni permisos: decidir y ejecutar.

## Arquitectura
- **Phaser 3 + TypeScript + Vite**. Entrada `game-web/index.html` → `src/main.ts`.
- **Resolución lógica 1920×1080, `Scale.FIT`** (el arte es 16:9). Mundo **y**
  interfaz dentro de Phaser → escalan como una sola pieza en cualquier pantalla
  (adiós a los "carteles sobreescalados" del DOM). Sin inputs del sistema: los
  puzzles usan un **teclado numérico propio**.
- Envoltorio Android existente (`MainActivity`): se conserva. Contratos JS:
  `window.__onAndroidBack() -> "handled" | "exit"`, `window.AndroidVoice`
  (opcional), `__onAndroidVoiceResult/Error`.

```
src/
  main.ts, config.ts
  core/        lógica pura y testeada (sin Phaser)
    perspective.ts  escala por profundidad (metros <-> px)
    navmesh.ts      suelo caminable (polígonos) + A* sobre rejilla
    rng.ts          aleatorio con semilla (IA reproducible en tests)
    state.ts        estado de partida, guardado versionado
    conditions.ts   condiciones (flags, objetos, afinidad, hora, misión)
    dialogue.ts     motor de diálogo ramificado con memoria
    npcBrain.ts     IA de NPC: rutinas, percepción, charla, deambular
    clock.ts        reloj ambiental de la noche (sin límite de tiempo)
    quests.ts       misiones y progreso
    validate.ts     validador de contenido
    solver.ts       demuestra que la partida se puede terminar
  content/     datos: zonas, personajes, diálogos, objetos, misiones, puzzles
  scenes/      Boot, Preload, Title, World, UI
  world/       Player, Companion (Gafe), Npc, Ghost (procedural), Prop, Zone
  ui/          Dialogue, Inventory, Puzzle (teclado), Journal, Map, Toast
  audio/       sonido procedural WebAudio
tests/         vitest
tools/         build_sprites.py (limpieza de sprites + métricas)
```

## Escala y proporciones
- Estaturas (m): Paula 1.30 · Gafe 0.29 andando / 0.32 sentado · Basilio 1.82 ·
  Elvira 1.60 · Tomás 1.70 · Inés 1.42 · Bruma 1.58 · Baltasar 1.74 ·
  criados fantasma 0.9–1.2 (flotan 0.2–0.35 m).
- Cámara estenopeica exacta (`src/core/perspective.ts`): pantalla ↔ suelo real
  (X, Z en metros) en ambos sentidos; distancias, caminos y velocidades en
  metros de suelo. `ppm(y) = k·(y − horizonte)`, altura de cámara = 1/k.
- **Método de calibración por escena** (validado en vestíbulo y biblioteca):
  1. horizonte = altura a la que fugan suelo/estanterías;
  2. cámara a la altura de los ojos de un adulto (1,6–1,7 m) → k = 1/altura;
  3. `python tools/calib_preview.py <zona> out.png "h,k" -- x,y,sprite ...`
     pega los sprites reales junto a muebles de referencia (sillas ~1 m, mesas
     ~0,8 m, puertas >2 m) y los ojos de un adulto deben caer en el horizonte.
- Sprites: recortados por alfa, ancla en los pies (centro de masa de las filas
  inferiores), hojas de caminar re-extraídas por manchas conectadas y alineadas
  por pies + centro del torso (sin temblor). Metadatos en `sprites.json`.

## Plan (checklist del bucle)
- [x] F0 Documento + limpieza de sprites + métricas
- [x] F1 Andamiaje Phaser (FIT 1920×1080, fuentes, escenas, puente Android)
- [x] F2 Núcleo puro + tests: perspectiva, navmesh/A*, rng, walker, npcBrain (estado/reloj → F5/F6)
- [x] F3 Rebanada vertical: vestíbulo+biblioteca calibrados, Paula natural, Gafe, 2 NPC
- [ ] F4 Probar F3 en navegador (tablet/móvil) y en el Redmi
- [x] F5 Motor de diálogo + condiciones + memoria/afinidad (tests) + guardado + arnés E2E
- [ ] F6 IA de NPC: rutinas, percepción, deambular, charla NPC↔NPC (tests)
- [ ] F7 Zonas: calibrar las 12, salidas, grafo, mapa del mundo
- [ ] F8 Reparto completo: 8 principales + 13 criados fantasma procedurales
- [ ] F9 Objetos, inventario, combinar, interacción contextual
- [ ] F10 Misiones + puzzles (teclado numérico) + pistas (Gafe/ECO offline)
- [ ] F11 Validador + solucionador + test de partida completa
- [ ] F12 Ambiente: sonido, lluvia, luz, partículas, título, final
- [ ] F13 QA completo en tablet/móvil + APK + instalar
