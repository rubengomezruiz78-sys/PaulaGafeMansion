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
  4. Si el cuadro está pintado desde más abajo/arriba, resolver horizonte y k
     con DOS referencias (una cerca, una lejos). Cámaras resultantes: 0,85 m
     (dormitorio infantil), 0,91 m (música), 1,14 m (cocina), 1,6–1,7 m (resto),
     2,9 m (torre, vista alta). Lote: `python tools/calib_batch.py`.
  5. Capas de suelo/salidas/objetos sobre el cuadro: `npx vite-node
     scripts/dump-zones.ts > z.json && python tools/zone_overlay.py z.json o.png zona…`
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
- [x] F6 IA de NPC: rutinas, percepción, deambular, charla NPC↔NPC (tests)
      `core/worldSim.ts` (rutinas por toda la casa, cruzando puertas reales; se
      congela mientras hablan con Paula), `core/chat.ts` (charlas: las de historia
      dejan pista `oido:<id>` si Paula las oye enteras a ≤7 m), `game/world.ts`
      (singletons). En la escena: cola de comentarios (uno a la vez), charlas uno
      junto al otro a la misma profundidad y lejos de Paula, Paula se pone al lado.
- [x] F7 Zonas: las 12 calibradas, grafo de 13 conexiones con bucles, cierres de historia, test de integridad (el mapa del mundo pasa a F12)
- [x] F8 Reparto completo: 8 principales + 13 criados fantasma procedurales
      (Paula, Gafe, Basilio, Elvira, Tomás, Inés —la 13.ª—, Bruma, Baltasar y 12
      criados dibujados por código en `world/ghostArt.ts`, cada uno con oficio,
      gesto, estatura real y árbol de diálogo propio)
- [x] F9 Objetos, inventario, interacción contextual: `core/interact.ts` +
      `content/props.ts` (cada objeto de las 12 salas reacciona según la historia;
      si pide un objeto y Paula lo lleva, se usa solo), mochila y cuaderno
      (`scenes/BagScene.ts`), «usar aquí» con aviso de objeto en la mano.
      (Combinar objetos se descartó: la historia no lo necesita.)
- [x] F10 Misiones + puzzles (teclado numérico) + pistas (Gafe/ECO offline):
      11 puzzles de cálculo de 4.º de primaria (`content/puzzles.ts`,
      `scenes/PuzzleScene.ts`), progreso guardado por paso, pista de Gafe a los
      dos fallos; tocar a Gafe da la siguiente pista (`content/hints.ts`);
      objetivos principales como lista en el cuaderno (`MAIN_GOALS`).
- [x] F11 Validador + solucionador + test de partida completa:
      `content/validate.ts`, `content/solver.ts` (tests: termina, también sin
      charlas y sin Clotilde) y `__test.autoplay()` en el navegador (juega por
      la interfaz real: 102 pasos, todos los objetos y los 11 puzzles).
      Recorrido: `npx vite-node scripts/solve-log.ts`.
- [ ] F12 Ambiente: sonido, lluvia, luz, partículas, título, final
- [ ] F13 QA completo en tablet/móvil + APK + instalar

## Guion jugable (F9–F11)
Meta: que la campana de la torre suene trece veces **sin golpearla** para que
Inés recupere la memoria. Hace falta: romper el pacto y reunir 5 recuerdos.
- Sello: retrato de Aurelia (mirarlo dos veces, o la pista de Basilio/Clotilde).
- Reloj (biblioteca, pide el sello) → engranaje de marfil.
- Pacto (altar del archivo, pide sello + engranaje) → `pacto-roto` (túneles).
- Caldera (cocina, opcional) → `porton-abierto`: otro camino a los túneles.
- Recuerdos: caja de música (dormitorio) → canica; retratos (galería) → foto;
  gramófono (música) → cilindro; antídoto (invernadero, pedírselo a Bruma) →
  flor + lente; esfera del reloj (torre) → cinta.
- Torre: compuertas (túneles) o cerrojo de estrellas (telescopio + lente). Al
  cruzar desde la torre, las dos vías quedan abiertas para siempre.
- Campana (torre) con pacto roto y 5 recuerdos → final.
- Opcionales: baúles (plano), escondite de Pepito (encontrarlo en 3 salas; su
  secreto ayuda en la campana), guante de Gumersindo, galleta para Pepito.

