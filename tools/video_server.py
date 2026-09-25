"""Receptor de fotogramas para grabar vídeos del juego (solo en desarrollo).

El arnés de pruebas (`__test.recordDemo()`) avanza el juego a 30 fps exactos
y manda cada fotograma aquí; al final manda el sonido generado. Luego:
  ffmpeg -framerate 30 -i <salida>/frames/%06d.jpg -i <salida>/audio.wav ... demo.mp4

Uso: python tools/video_server.py <carpeta_salida> [puerto=8765]
"""
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "video-out")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        url = urlparse(self.path)
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if url.path == "/frames":
            import base64, json
            data = json.loads(body)
            for i, b64 in enumerate(data["frames"]):
                with open(os.path.join(OUT, "frames", f"{data['start'] + i:06d}.jpg"), "wb") as f:
                    f.write(base64.b64decode(b64))
            self.send_response(200)
            self._cors()
            self.end_headers()
            return
        if url.path == "/frame":
            n = int(parse_qs(url.query)["n"][0])
            path = os.path.join(OUT, "frames", f"{n:06d}.jpg")
        elif url.path == "/audio":
            path = os.path.join(OUT, "audio.wav")
        elif url.path == "/log":
            path = os.path.join(OUT, "log.txt")
        else:
            self.send_response(404)
            self._cors()
            self.end_headers()
            return
        with open(path, "wb") as f:
            f.write(body)
        self.send_response(200)
        self._cors()
        self.end_headers()

    def log_message(self, *args) -> None:  # silencio: miles de fotogramas
        pass


print(f"Recibiendo en http://127.0.0.1:{PORT} -> {OUT}", flush=True)
ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
