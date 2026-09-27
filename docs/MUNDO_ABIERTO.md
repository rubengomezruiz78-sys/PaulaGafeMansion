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
- [x] F12 Ambiente: sonido, lluvia, luz, partículas, título, final:
      `audio/sound.ts` (Web Audio procedural: lluvia, viento, goteo, truenos,
      pisadas al ritmo de la zancada, caja de música do-mi-sol, efectos),
      `content/ambience.ts` por sala, relámpagos, viñeta y motas; portada con la
      ilustración original intacta (`TitleScene`, Continuar/Nueva partida,
      sonido sí/no), introducción que explica cómo se juega, final con
      amanecer y créditos (`EndScene`) y mapa por plantas en la mochila (con el
      plano de Inés muestra quién está en cada sala).
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


## Ampliación 2.1.0 — «La fiesta de Inés» (2026-09-26)
Petición: seis niveles nuevos con el mismo estilo, personajes que no parezcan
fotos pegadas (integración y proporciones), mundo abierto lleno de vida y
pruebas para una niña de 9 años.
- **Arte local** con ComfyUI + FLUX.2 klein 4B (`C:\Users\ruben\ComfyUI`,
  8 GB de VRAM, ~15 s por imagen). Herramientas: `tools/comfy_gen.py` (API),
  `tools/gen_rooms.py` (salas: dos salas viejas como referencia de estilo),
  `tools/finish_rooms.py` (recorte y **misma luz**: histograma de luminancia de
  las 12 originales), `tools/gen_characters.py` + `tools/cut_characters.py`
  (reparto pintado sobre gris, recortado con BiRefNet), `tools/build_sprites.py`
  (margen transparente para el «cuerpo vivo», pasos a la misma altura).
- **Seis salas** (`content/zones/alaFiesta.ts`): salón de baile (desde la
  música), comedor de gala (baile ↔ cocina), jardín del laberinto (baile ↔
  invernadero), taller del juguetero (desde la galería), estudio del pintor
  (desde el taller) y teatrito de Inés (puertecita tras la cortina del
  dormitorio). Calibradas con dos referencias cada una; 18 salas en el mapa.
- **Historia**: misión `fiesta` (6 cosas: vals, tarta, farolillos, bailarina,
  invitaciones, marioneta). La campana ya pide pacto roto + 5 recuerdos + la
  fiesta. Final nuevo: la fiesta en el salón de baile (`world/fiesta.webp`).
- **Personajes nuevos**: Maestro Anacleto, Tía Clemencia, Casimiro, Don Fermín,
  Bartolo y Ramona la lechuza, con rutinas, diálogos, 7 charlas y pistas.
- **Pruebas nuevas** (`core/puzzle.ts` + `ui/puzzleBoards.ts`): piano
  (melodía), ordenar tarjetas, parejas, laberinto y mezclar colores; cada una
  entrega una respuesta codificada (`expectedAnswer`) para tests y autoplay;
  se pueden responder con la voz (notas, direcciones, dos colores).
- **Integración**: todo el reparto repintado con el estilo de las salas (antes
  fotos y fantasmas dibujados por código); Paula anda con 7 pasos pintados;
  shader con «cuerpo vivo» (respiración, balanceo con los pies quietos, vuelo
  de la falda, sábanas que ondean, cabeceo al hablar).
- **Vida**: lluvia de verdad en el jardín, parejas de fantasmas bailando el
  vals en perspectiva real, luces/cortinas/agua/engranajes anotados en las 6.
- Pruebas: 230 tests, `__test.autoplay()` completa en 154 pasos, vídeo con
  `__test.recordFiesta()`.

## Ampliación 2.2.0 — «La segunda planta» (2026-09-26)
Petición: niveles en la segunda planta para que la escalera tenga sentido, más
integración de los personajes, sensación de vida, mejor movilidad de Paula,
Gafe más definido y proporciones reales.
- **Casa de abajo arriba**: planta baja → 1.ª planta (galería) → 2.ª planta
  (rellano del reloj) → desván → observatorio y torre. La escalera del fondo de
  la galería ya no va al desván: sube al rellano.
- **Cinco salas** (`content/zones/segundaPlanta.ts`): rellano del reloj, aula
  de la institutriz, cuarto de costura, alcoba de Aurelia y pajarera de
  cristal del tejado (por la escalerilla del rellano o la cristalera de la
  alcoba). 23 salas; mapa de 5 plantas (`content/mapLayout.ts`).
- **Historia**: el diario de Inés (4 páginas: alfombra del rellano, reloj de
  pie, pizarra, vestido) que devuelve la memoria a la bisabuela Aurelia; los
  pájaros de papel, la nana del joyero y el medallón. El final lo recuerda.
- **Personajes**: Doña Aurelia (la bisabuela) y la señorita Rosalía
  (institutriz); Florentina se muda al cuarto de costura. 3 charlas nuevas.
- **Prueba nueva**: reloj de agujas (`kind: "clock"`), también por voz («las
  cuatro y media», «las tres menos cuarto»). Más: sumas con llevadas, ordenar
  números, hexágono, mitades, parejas de botones, series, laberinto.
- **Integración**: sonda de luz (`world/probe.ts`): el color del cuadro
  alrededor de cada personaje le tiñe (fuego naranja, luna azul, rincón
  oscuro); bordes fundidos con el aire; contraluz proporcional al tamaño.
- **Gafe**: brillo propio, contraste y filo de luna mínimo (`rimMin`): se ve
  en cualquier sala sin dejar de ser negro. Curiosea objetos cuando Paula se
  queda quieta y vuelve en cuanto ella anda.
- **Movilidad**: curvas redondeadas en las esquinas (`Gait.cornerM`), andar
  siguiendo el dedo apretado (y correr si está lejos), Paula mira alrededor
  cuando está quieta; huellas en suelo mojado y polvo al pisar; las llamas y
  el polvo reaccionan al paso.
- Pruebas: 323 tests, `__test.autoplay()` completa (192 pasos), vídeo con
  `__test.recordSegunda()`.

## 2.2.1 y 2.2.2 — «Lista para llevar» (2026-09-27)
Petición: afinar el código, integrar mejor a los personajes y corregir fallos
para que Paula se lleve el juego hoy en la tablet.
- **Fallos**: las luces de las velas caían 60 px más abajo en pantallas 16:10
  (la altura del sombreado era 1080 en vez de `VIEW_TOP + VIEW_H`); el borde
  fundido se iba a negro sin sonda de luz. Prueba de estrés con toques al azar
  (`game-web/caos-dev.js`) en las 23 salas sin errores ni bloqueos; partidas
  guardadas de la 2.0 cargan bien.
- **Rendimiento** (gráfica PowerVR de la tablet): viñeta y grano dentro de los
  sombreados (dos pasadas a pantalla completa menos), haces de luz recortados
  a su caja, sombreados solo en ASCII (`world/glsl.ts`: algunas gráficas
  rechazaban una tilde en un comentario). Calidad adaptable
  (`game/quality.ts`): por debajo de 36 fps, modo ligero; por debajo de 28,
  un 20 % menos de píxeles cada vez (hasta la mitad). Se recuerda en
  `localStorage` (`paula-gafe-calidad`).
- **Oclusión con los muebles**: mapas de profundidad de cada sala
  (`tools/depth_maps.py`: Depth Anything V2 en local, calibrado con el suelo
  caminable, `public/world/depth/<sala>.png`, 0,4/Z en 8 bits). El sombreado
  de los personajes oculta lo que queda detrás de un mueble (piano, sarcófago,
  fuente, mesas…) y `world/depthField.ts` quita sombra y reflejo si los pies
  quedan tapados. Paula y Gafe dejan ver una silueta tenue a través del mueble
  (`look.xray`) para que la niña siempre los encuentre. Una sala se puede
  excluir en `content/occlusion.ts`.
- **Suelo recortado** donde el mapa demostró que se pisaban muebles: el banco
  y la consola del jarrón en la galería, los escalones del altar y el armario
  de velas en el archivo; puntos de paseo fuera de la fuente del invernadero.
  Para revisar una sala: barrer todo el suelo y pintar dónde quedaría Paula
  tapada (rojo = más de un 25 %).
- Arnés: `untilReady` ya no depende de `setTimeout` (con la pestaña oculta el
  navegador lo frenaba y las salas «no cargaban» en las pruebas).
