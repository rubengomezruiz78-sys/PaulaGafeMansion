/**
 * Quién tiene abierta una ventana (diálogo, puzzle, mochila). Mientras haya
 * alguna, el mundo no acepta toques ni empieza charlas y el HUD se oculta.
 * Llevar la cuenta por dueño evita que al cerrarse una ventana se «liberen»
 * las demás que siguen abiertas.
 */
import type Phaser from "phaser";

export const MODAL_EVENT = "ui:modal";

export function setModal(scene: Phaser.Scene, owner: string, on: boolean): void {
  const owners = new Set<string>((scene.registry.get("modalOwners") as string[] | undefined) ?? []);
  if (on) owners.add(owner);
  else owners.delete(owner);
  scene.registry.set("modalOwners", [...owners]);
  const any = owners.size > 0;
  if (scene.registry.get("modal") !== any) {
    scene.registry.set("modal", any);
    scene.game.events.emit(MODAL_EVENT, any);
  }
}
