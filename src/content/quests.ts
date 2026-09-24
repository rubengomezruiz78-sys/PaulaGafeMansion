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
};

export function questStageText(quest: string, stage: number): string | null {
  return QUESTS[quest]?.stages[stage] ?? null;
}
