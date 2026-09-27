// Herramienta de desarrollo (no va en el APK): prueba de estrés con toques al azar.
// En la consola del navegador: (0, eval)(await (await fetch("/caos-dev.js")).text()); await __caos(300)
// Prueba de estrés: toques al azar de verdad (eventos de ratón sobre el lienzo),
// dedo apretado, Atrás, cambios de sala… vigilando excepciones y bloqueos.
(() => {
  const g = window.__game;
  const T = window.__test;
  const errors = (window.__caosErrors ||= []);
  if (!window.__caosHooked) {
    window.__caosHooked = true;
    window.addEventListener("error", (e) => errors.push("error: " + (e.message || e.error)));
    window.addEventListener("unhandledrejection", (e) => errors.push("promesa: " + (e.reason && (e.reason.stack || e.reason))));
    const orig = console.error;
    console.error = (...a) => { errors.push("console: " + a.map(String).join(" ").slice(0, 300)); orig(...a); };
  }
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const canvas = g.canvas;
  const rect = () => canvas.getBoundingClientRect();
  const fire = (type, x, y) => {
    const r = rect();
    const ev = new MouseEvent(type, { clientX: r.left + x * r.width, clientY: r.top + y * r.height, bubbles: true, button: 0, buttons: type === "mouseup" ? 0 : 1 });
    canvas.dispatchEvent(ev);
  };
  const tap = (x, y) => { fire("mousedown", x, y); T.step(0.05); fire("mouseup", x, y); };
  const log = [];
  let stuckFor = 0;
  window.__caos = async (n) => {
    for (let i = 0; i < n; i += 1) {
      const a = rnd();
      const x = 0.03 + rnd() * 0.94;
      const y = 0.05 + rnd() * 0.9;
      try {
        if (a < 0.62) tap(x, y);
        else if (a < 0.72) { // dedo apretado un rato, moviéndolo
          fire("mousedown", x, y);
          for (let k = 0; k < 8; k += 1) { T.step(0.1); fire("mousemove", Math.min(0.97, x + k * 0.01), y); }
          fire("mouseup", x, y);
        } else if (a < 0.78) window.__onAndroidBack?.();
        else if (a < 0.86) { // ir a una salida o a un objeto de verdad (tocándolo en pantalla)
          const w = g.scene.getScene("world");
          const z = w?.zoneDef;
          if (z) {
            const list = rnd() < 0.5 ? z.exits : z.props;
            const it = list[Math.floor(rnd() * list.length)];
            if (it) {
              const pts = it.hotspot;
              const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
              const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
              // lógica → fracción del lienzo (el lienzo enseña de VIEW_TOP a VIEW_TOP+VIEW_H)
              const cam = w.cameras.main;
              const top = cam.worldView.y;
              tap(cx, (cy * 1080 - top) / cam.worldView.height);
              for (let k = 0; k < 40; k += 1) T.step(0.1);
            }
          }
        }
        else if (a < 0.89) { // doble toque (correr)
          tap(x, y); T.step(0.08); tap(x, y);
        }
        const steps = 1 + Math.floor(rnd() * 6);
        for (let k = 0; k < steps; k += 1) T.step(0.1);
      } catch (e) {
        errors.push("acción " + i + ": " + (e.stack || e));
      }
      // ¿Bloqueado? Modal activo sin ninguna ventana visible.
      const modal = g.registry.get("modal");
      const ui = g.scene.getScene("ui");
      const open = !!ui?.panel || g.scene.isActive("puzzle") || g.scene.isActive("bag") || g.scene.isActive("end");
      if (modal && !open) stuckFor += 1; else stuckFor = 0;
      if (stuckFor === 30) errors.push("BLOQUEO: modal sin ventana (" + JSON.stringify(g.registry.get("modalOwners")) + ") en " + (g.scene.getScene("world")?.zoneDef?.id));
      if (i % 25 === 0) await new Promise((r) => setTimeout(r, 0));
      if (i % 200 === 0) log.push([i, g.scene.getScenes(true).map((s) => s.scene.key).join(","), g.scene.getScene("world")?.zoneDef?.id]);
    }
    return { errors: errors.slice(-20), nErrors: errors.length, log: log.slice(-5), visited: T.session.state.visited.length };
  };
})();
