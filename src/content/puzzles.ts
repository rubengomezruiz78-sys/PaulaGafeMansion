/**
 * Los puzzles de la casa. Cuentas de 4.º de primaria (tablas, repartos,
 * dobles y mitades) y alguna pregunta de la historia. Cada paso trae su pista
 * y las «clues» aparecen si Paula oyó o leyó algo que ayuda.
 */
import type { PuzzleDef } from "../core/puzzle";

const list: PuzzleDef[] = [
  {
    id: "reloj",
    title: "El reloj de las horas devoradas",
    story: "El reloj aritmético no da la hora: cuenta las noches que la casa fingió no oír a Inés. Tres discos, tres cuentas.",
    steps: [
      { kind: "number", prompt: "Siete noches sonaron nueve campanadas cada noche. ¿Cuántas campanadas en total?", answer: 63,
        hint: "Son 7 grupos de 9: 7 × 9. Si no te sale, suma 9 siete veces." },
      { kind: "number", prompt: "144 minutos se reparten entre las 12 marcas del reloj. ¿Cuántos minutos para cada marca?", answer: 12,
        hint: "Reparto en partes iguales: 144 ÷ 12. ¿Qué número por 12 da 144?" },
      { kind: "number", prompt: "Multiplica 18 por 4 y divide el resultado entre 6.", answer: 12,
        hint: "Por pasos: 18 × 4 = 72. Ahora 72 ÷ 6." },
    ],
    clues: [
      { if: { has: "pagina-elvira" }, text: "En la página de Elvira hay algo subrayado dos veces: 7 × 9." },
      { if: { flag: "pista-reloj" }, text: "Elvira y Nicanor lo dijeron: un error no rompe nada, el disco solo se para." },
    ],
    reward: [{ give: "engranaje-marfil" }, { complete: "reloj" }, { affinity: ["elvira", 5] }],
  },
  {
    id: "caldera",
    title: "La presión justa",
    story: "La caldera respira mal y el portón de abajo sigue atrancado. Los manómetros esperan una cifra exacta.",
    steps: [
      { kind: "number", prompt: "La tubería recibe 96 pulsos y los reparte entre 8 tubos. ¿Cuántos pulsos van por cada tubo?", answer: 12,
        hint: "96 ÷ 8. Piensa en la tabla del 8: ¿8 por cuánto da 96?" },
      { kind: "number", prompt: "Cada tubo gira siete veces más fuerte. ¿Qué presión marca el manómetro?", answer: 84,
        hint: "Los 12 pulsos de cada tubo, siete veces: 12 × 7." },
    ],
    clues: [
      { if: { chose: ["tomas", "caldera"] }, text: "Tomás: «Los pulsos se reparten entre los tubos, y cada salida gira siete veces»." },
      { if: { flag: "sabe-porton-presion" }, text: "Remedios y Tomás lo dijeron: con la presión justa, el portón cede." },
    ],
    reward: [{ set: "porton-abierto" }, { complete: "porton" }, { affinity: ["tomas", 6] }],
  },
  {
    id: "pacto",
    title: "El pacto de las trece campanadas",
    story: "El sello y el engranaje encajan en el altar. Para romper el pacto hay que decir en voz alta la cuenta completa.",
    steps: [
      { kind: "number", prompt: "Doce criados dejaron 5 velas cada uno en el altar. ¿Cuántas velas había?", answer: 60,
        hint: "12 grupos de 5: 12 × 5. Truco: 10 × 5 más 2 × 5." },
      { kind: "number", prompt: "La casa guardó 45 recuerdos en 3 cajones iguales. ¿Cuántos recuerdos hay en cada cajón?", answer: 15,
        hint: "45 ÷ 3. ¿Qué número sumado tres veces da 45?" },
      { kind: "choice", prompt: "¿Cuántas personas entraron en la capilla aquella noche?", options: ["Doce", "Trece", "Catorce"], answer: 1,
        hint: "Tomás lo contó: entraron los doce criados… y alguien más, escondido." },
    ],
    clues: [
      { if: { chose: ["tomas", "capilla"] }, text: "Tomás: «Trece criados entraron a rezar por Inés. Salieron doce»." },
      { if: { examined: "registro" }, text: "En el registro cosido había trece nombres; el último, tachado." },
    ],
    reward: [{ take: "engranaje-marfil" }, { take: "sello-aurelia" }, { set: "pacto-roto" }],
  },
  {
    id: "compuertas",
    title: "El camino del agua",
    story: "Tres compuertas dejan pasar el agua del aljibe. Si se abren en su orden, el túnel de la torre queda seco. Sin prisa: el agua avisa.",
    steps: [
      { kind: "number", prompt: "Tres canales llevan 48 litros cada uno. ¿Cuántos litros en total?", answer: 144,
        hint: "48 × 3. Por partes: 40 × 3 = 120 y 8 × 3 = 24." },
      { kind: "number", prompt: "Esos 144 litros se reparten entre 8 desagües. ¿Cuántos litros por desagüe?", answer: 18,
        hint: "144 ÷ 8. La mitad de 144 es 72, la mitad de 72 es 36… y otra mitad más." },
      { kind: "choice", prompt: "La I se abre antes que la III. La II, después de la III. ¿Qué orden es el bueno?",
        options: ["I · II · III", "I · III · II", "III · I · II"], answer: 1,
        hint: "Pon primero la I. Luego la III. La II va la última." },
    ],
    clues: [{ if: { flag: "pista-compuertas" }, text: "Tadeo y Anselmo lo dijeron: «la primera antes que la tercera; la segunda, después»." }],
    reward: [{ set: "compuertas-abiertas" }],
  },
  {
    id: "estrellas",
    title: "El cerrojo de estrellas",
    story: "Con la lente de luna, el telescopio muestra el cerrojo de la pasarela: una rueda de constelaciones.",
    steps: [
      { kind: "number", prompt: "El cielo tiene 360 grados y 12 constelaciones iguales. ¿Cuántos grados ocupa cada una?", answer: 30,
        hint: "360 ÷ 12. Piensa: 12 × 3 = 36, así que 12 × 30 = 360." },
      { kind: "number", prompt: "Nueve planetas dan 7 vueltas cada uno. ¿Cuántas vueltas en total?", answer: 63,
        hint: "9 × 7, que es lo mismo que 7 × 9." },
    ],
    clues: [{ if: { examined: "cuaderno-estrellas" }, text: "En el cuaderno de Inés: «el cielo se reparte en doce casas iguales»." }],
    reward: [{ set: "pasarela-abierta" }],
  },
  {
    id: "caja",
    title: "La caja de música de Inés",
    story: "El cilindro repite un patrón. Si se completa, la caja se abre.",
    steps: [
      { kind: "number", prompt: "La cajita toca cada vez el doble: 3, 6, 12, 24… ¿Qué número sigue?", answer: 48,
        hint: "Cada número es el doble del anterior. ¿Cuánto es 24 + 24?" },
      { kind: "number", prompt: "La melodía tiene 96 notas en 8 compases iguales. ¿Cuántas notas hay en cada compás?", answer: 12,
        hint: "96 ÷ 8. ¿8 por cuánto da 96?" },
    ],
    reward: [{ give: "canica-azul" }, { count: "recuerdos" }],
  },
  {
    id: "retratos",
    title: "La familia que cambió de sitio",
    story: "Los retratos se descolocaron solos. Si vuelven a su sitio, el marco de Inés se abre.",
    steps: [
      { kind: "choice", prompt: "Aurelia está a la izquierda de Tomás. Elvira, a la derecha de Tomás. ¿Quién va en el centro?",
        options: ["Aurelia", "Tomás", "Elvira"], answer: 1, hint: "No hace falta contar: imagina tres cuadros en fila." },
      { kind: "number", prompt: "6 retratos esconden 4 símbolos cada uno. ¿Cuántos símbolos hay en total?", answer: 24,
        hint: "6 × 4. O suma 4 seis veces." },
    ],
    reward: [{ give: "foto-ines" }, { count: "recuerdos" }],
  },
  {
    id: "melodia",
    title: "La melodía de los nombres",
    story: "El gramófono guarda un cilindro de cera, pero solo lo suelta si suena la melodía de la casa.",
    steps: [
      { kind: "choice", prompt: "DO, MI, SOL, DO, MI, SOL… ¿Qué nota sigue?", options: ["DO", "RE", "MI", "FA", "SOL", "LA"], answer: 0,
        hint: "El patrón se repite igual. ¿Qué nota va justo después de SOL la primera vez?" },
      { kind: "number", prompt: "El gramófono da 18 vueltas por minuto durante 4 minutos. ¿Cuántas vueltas da?", answer: 72,
        hint: "18 × 4. Por partes: 10 × 4 = 40 y 8 × 4 = 32." },
      { kind: "number", prompt: "Reparte esas 72 vueltas entre 6 pistas. ¿Cuántas por pista?", answer: 12,
        hint: "72 ÷ 6. ¿6 por cuánto da 72?" },
    ],
    clues: [
      { if: { flag: "sabe-melodia" }, text: "Baltasar: «¡Después del sol, vuelta a empezar! Do»." },
      { if: { flag: "pista-melodia" }, text: "Baltasar y Críspulo lo dijeron: tres notas y vuelta a empezar." },
    ],
    reward: [{ give: "cilindro-cera" }, { count: "recuerdos" }],
  },
  {
    id: "antidoto",
    title: "El antídoto de luna",
    story: "La señora Bruma necesita las proporciones exactas para que las flores dejen de repetir voces ajenas.",
    steps: [
      { kind: "number", prompt: "Hay 8 macetas con 3 flores de luna cada una. ¿Cuántas flores hay?", answer: 24,
        hint: "8 macetas de 3 flores: 8 × 3." },
      { kind: "number", prompt: "Reparte 72 gotas de rocío entre 9 raíces. ¿Cuántas gotas le tocan a cada raíz?", answer: 8,
        hint: "72 ÷ 9. ¿9 por cuánto da 72?" },
      { kind: "number", prompt: "Cada uno de 7 frascos lleva 6 hojas, y la mitad se tira. ¿Cuántas hojas quedan?", answer: 21,
        hint: "Primero 6 × 7 = 42. Luego la mitad de 42." },
    ],
    clues: [{ if: { chose: ["bruma", "flores"] }, text: "Bruma: «Ocho macetas, tres flores en cada una»." }],
    reward: [{ give: "flor-luna" }, { give: "lente-luna" }, { count: "recuerdos" }, { complete: "antidoto" }, { affinity: ["bruma", 6] }],
  },
  {
    id: "baules",
    title: "Los baúles sin dueño",
    story: "Gafe puede colarse entre los baúles, pero Paula tiene que decirle cuál es.",
    steps: [
      { kind: "number", prompt: "Hay 5 filas de 9 baúles. ¿Cuántos baúles hay?", answer: 45, hint: "5 × 9." },
      { kind: "number", prompt: "Gafe ya ha olfateado la tercera parte. ¿Cuántos baúles ha olfateado?", answer: 15,
        hint: "La tercera parte de 45 es 45 ÷ 3." },
      { kind: "number", prompt: "El baúl bueno lleva el doble de 14, dividido entre 4. ¿Qué número tiene?", answer: 7,
        hint: "El doble de 14 es 28. Ahora 28 ÷ 4." },
    ],
    clues: [{ if: { flag: "pista-baul" }, text: "Pepito lo contó: el baúl bueno tiene un siete pintado y huele a tinta." }],
    reward: [{ give: "plano-ines" }],
  },
  {
    id: "campana",
    title: "La decimotercera campanada",
    story: "No hay que golpear la campana: hay que contarle la cuenta entera, y ella sonará sola por Inés.",
    steps: [
      { kind: "number", prompt: "Cada uno de los 5 recuerdos guarda 13 ecos. ¿Cuántos ecos llevas?", answer: 65,
        hint: "13 × 5. Por partes: 10 × 5 = 50 y 3 × 5 = 15." },
      { kind: "number", prompt: "Aurelia dejó 7 llaves a cada una de 12 personas. Inés devolvió la mitad. ¿Cuántas llaves quedaron?", answer: 42,
        hint: "Primero 7 × 12 = 84. Quedó la mitad." },
      { kind: "choice", prompt: "¿Quién ha acompañado a Paula incluso cuando la casa mentía?", options: ["Don Basilio", "Gafe", "Elvira", "Tomás"], answer: 1,
        hint: "Tiene cuatro patas y los ojos de color ámbar." },
    ],
    clues: [
      { if: { flag: "pista-campana" }, text: "Pepito te lo susurró: «la campana no se golpea; se le cuenta la verdad»." },
      { if: { chose: ["florentina", "cinta"] }, text: "Florentina: «la respuesta no necesita golpes»." },
    ],
    reward: [{ set: "final" }, { complete: "trece" }, { complete: "recuerdos" }],
  },
];

export const PUZZLES: Record<string, PuzzleDef> = Object.fromEntries(list.map((p) => [p.id, p]));
