/** Misiones: títulos por etapa para el cuaderno y los avisos. */
import type { Cond } from "../core/rules";

export interface QuestDef {
  title: string;
  stages: Record<number, string>;
}

export const QUESTS: Record<string, QuestDef> = {
  trece: {
    title: "La decimotercera campanada",
    stages: { 1: "Averiguar qué le pasó a Inés y por qué la casa cuenta hasta trece." },
  },
  reloj: {
    title: "El reloj de las horas devoradas",
    stages: { 1: "Resolver las cuentas del reloj de la biblioteca." },
  },
  porton: {
    title: "El portón de la caldera",
    stages: { 1: "Devolver la presión justa a la caldera de la cocina." },
  },
  recuerdos: {
    title: "Los recuerdos de Inés",
    stages: { 1: "Encontrar los cinco recuerdos de Inés escondidos por la casa ({recuerdos}/5)." },
  },
  antidoto: {
    title: "El antídoto de luna",
    stages: { 1: "Ayudar a la señora Bruma con las proporciones del antídoto." },
  },
  escondite: {
    title: "El escondite de Pepito",
    stages: { 1: "Encontrar a Pepito en tres salas distintas ({pepito-pillado}/3) y contárselo." },
  },
};

/**
 * Objetivos de la historia principal. En un mundo abierto no hay un orden
 * fijo: el cuaderno los muestra como lista y cada uno se tacha al cumplirse.
 */
export const MAIN_GOALS: { text: string; done: Cond; show?: Cond }[] = [
  { text: "Descubrir quién es la niña de la que todos hablan", done: { met: "ines" } },
  { text: "Romper el pacto de la capilla del archivo", done: { flag: "pacto-roto" }, show: { any: [{ met: "ines" }, { visited: "archivo" }] } },
  { text: "Reunir los cinco recuerdos de Inés ({recuerdos}/5)", done: { counter: ["recuerdos", ">=", 5] }, show: { quest: ["recuerdos", ">=", 1] } },
  { text: "Llegar a la torre del reloj", done: { visited: "torre" }, show: { met: "ines" } },
  { text: "Hacer sonar la decimotercera campanada", done: { flag: "final" }, show: { visited: "torre" } },
];

export function questStageText(quest: string, stage: number): string | null {
  return QUESTS[quest]?.stages[stage] ?? null;
}
