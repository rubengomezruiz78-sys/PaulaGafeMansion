/** Misiones: títulos por etapa para el cuaderno y los avisos. */
export interface QuestDef {
  title: string;
  stages: Record<number, string>;
}

export const QUESTS: Record<string, QuestDef> = {
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
    stages: { 1: "Encontrar los recuerdos de Inés escondidos por la casa." },
  },
  antidoto: {
    title: "El antídoto de luna",
    stages: { 1: "Ayudar a la señora Bruma con las proporciones del antídoto." },
  },
  escondite: {
    title: "El escondite de Pepito",
    stages: { 1: "Encontrar a Pepito escondido en tres sitios distintos." },
  },
};

export function questStageText(quest: string, stage: number): string | null {
  return QUESTS[quest]?.stages[stage] ?? null;
}
