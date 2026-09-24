/** Integración con la plataforma: fuentes, botón Atrás de Android y ciclo de vida. */

type BackHandler = () => boolean;

declare global {
  interface Window {
    __onAndroidBack?: () => "handled" | "exit";
  }
}

/** Pila de manejadores de Atrás: el último en registrarse (la capa de arriba) va primero. */
const backStack: BackHandler[] = [];

export function pushBackHandler(handler: BackHandler): () => void {
  backStack.push(handler);
  return () => {
    const i = backStack.lastIndexOf(handler);
    if (i >= 0) backStack.splice(i, 1);
  };
}

/** Atrás: la capa superior que lo gestione lo consume; si ninguna, se sale de la app. */
export function handleBack(): "handled" | "exit" {
  for (let i = backStack.length - 1; i >= 0; i -= 1) {
    if (backStack[i]()) return "handled";
  }
  return "exit";
}

export function installBackBridge(): void {
  window.__onAndroidBack = handleBack;
  // En navegador (pruebas) Escape hace de Atrás.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") handleBack();
  });
}

/** Espera a que las fuentes estén listas (con límite) para que Phaser no pinte con otra. */
export async function loadFonts(): Promise<void> {
  const faces = ['900 40px "Cinzel"', '400 32px "Inter"', '700 32px "Inter"', '400 32px "Mono"'];
  const all = Promise.all(faces.map((f) => document.fonts.load(f))).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
  await Promise.race([all, timeout]);
}
