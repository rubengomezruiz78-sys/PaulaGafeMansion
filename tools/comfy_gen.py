"""
Arte del juego con ComfyUI local (FLUX.2 klein 4B) por su API HTTP.

Todo se genera en el PC (RTX 5060 Ti, 8 GB): nada sale de casa.
Arrancar antes ComfyUI:
  C:/Users/ruben/ComfyUI/ComfyUI_windows_portable/python_embeded/python.exe -s ComfyUI/main.py --listen 127.0.0.1 --port 8188

Uso como módulo:
  from comfy_gen import t2i, edit, cutout
  t2i("prompt", "salida.png", 1920, 1088, seed=1)
  edit("prompt", ["ref1.png", "ref2.png"], "salida.png", 1024, 1536, seed=1)
  cutout("personaje.png", "personaje_rgba.png")   # quita el fondo (BiRefNet)
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
import uuid

HOST = "http://127.0.0.1:8188"
UNET = "flux-2-klein-4b-fp8.safetensors"
TEXT = "qwen_3_4b.safetensors"
VAE = "flux2-vae.safetensors"


def _req(path: str, data: bytes | None = None, headers: dict | None = None) -> bytes:
    r = urllib.request.Request(HOST + path, data=data, headers=headers or {})
    with urllib.request.urlopen(r, timeout=600) as f:
        return f.read()


def upload(path: str) -> str:
    """Sube una imagen a la carpeta input de ComfyUI y devuelve su nombre."""
    name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(path)}"
    boundary = uuid.uuid4().hex
    with open(path, "rb") as f:
        payload = f.read()
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + payload + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    out = json.loads(_req("/upload/image", body, {"Content-Type": f"multipart/form-data; boundary={boundary}"}))
    return out["name"]


def run(graph: dict, out_path: str) -> str:
    """Encola el grafo, espera y guarda la primera imagen de salida."""
    cid = uuid.uuid4().hex
    res = json.loads(_req("/prompt", json.dumps({"prompt": graph, "client_id": cid}).encode(), {"Content-Type": "application/json"}))
    pid = res["prompt_id"]
    t0 = time.time()
    while True:
        hist = json.loads(_req(f"/history/{pid}"))
        if pid in hist:
            h = hist[pid]
            st = h.get("status", {})
            if st.get("status_str") == "error":
                raise RuntimeError(json.dumps(st)[:2000])
            for node in h.get("outputs", {}).values():
                for img in node.get("images", []):
                    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
                    data = _req(f"/view?{q}")
                    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
                    with open(out_path, "wb") as f:
                        f.write(data)
                    return out_path
            if st.get("completed"):
                raise RuntimeError("sin imagen de salida")
        if time.time() - t0 > 1800:
            raise TimeoutError(pid)
        time.sleep(0.5)


def _base(prompt: str, w: int, h: int, seed: int, steps: int) -> dict:
    return {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": TEXT, "type": "flux2", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["clip", 0]}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["pos", 0]}},
        "sampler": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
        "sched": {"class_type": "Flux2Scheduler", "inputs": {"steps": steps, "width": w, "height": h}},
        "noise": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "latent": {"class_type": "EmptyFlux2LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
    }


def _finish(g: dict, pos: str, neg: str) -> dict:
    g["guider"] = {"class_type": "CFGGuider", "inputs": {"model": ["unet", 0], "positive": [pos, 0], "negative": [neg, 0], "cfg": 1}}
    g["sample"] = {"class_type": "SamplerCustomAdvanced", "inputs": {
        "noise": ["noise", 0], "guider": ["guider", 0], "sampler": ["sampler", 0], "sigmas": ["sched", 0], "latent_image": ["latent", 0]}}
    g["decode"] = {"class_type": "VAEDecode", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}}
    g["save"] = {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": "paula"}}
    return g


def t2i(prompt: str, out_path: str, w: int = 1024, h: int = 1024, seed: int = 1, steps: int = 4) -> str:
    """Texto a imagen."""
    g = _base(prompt, w, h, seed, steps)
    return run(_finish(g, "pos", "neg"), out_path)


def edit(prompt: str, refs: list[str], out_path: str, w: int = 1024, h: int = 1024, seed: int = 1,
         steps: int = 4, ref_mp: float = 1.0) -> str:
    """Imagen nueva a partir de una o varias de referencia (estilo, personaje, sala…)."""
    g = _base(prompt, w, h, seed, steps)
    pos, neg = "pos", "neg"
    for i, ref in enumerate(refs):
        name = upload(ref)
        g[f"load{i}"] = {"class_type": "LoadImage", "inputs": {"image": name}}
        g[f"scale{i}"] = {"class_type": "ImageScaleToTotalPixels", "inputs": {
            "image": [f"load{i}", 0], "upscale_method": "lanczos", "megapixels": ref_mp, "resolution_steps": 16}}
        g[f"enc{i}"] = {"class_type": "VAEEncode", "inputs": {"pixels": [f"scale{i}", 0], "vae": ["vae", 0]}}
        g[f"rp{i}"] = {"class_type": "ReferenceLatent", "inputs": {"conditioning": [pos, 0], "latent": [f"enc{i}", 0]}}
        g[f"rn{i}"] = {"class_type": "ReferenceLatent", "inputs": {"conditioning": [neg, 0], "latent": [f"enc{i}", 0]}}
        pos, neg = f"rp{i}", f"rn{i}"
    return run(_finish(g, pos, neg), out_path)


def cutout(image_path: str, out_path: str) -> str:
    """Quita el fondo con BiRefNet y guarda un PNG con transparencia."""
    from PIL import Image

    name = upload(image_path)
    g = {
        "load": {"class_type": "LoadImage", "inputs": {"image": name}},
        "bgm": {"class_type": "LoadBackgroundRemovalModel", "inputs": {"bg_removal_name": "birefnet.safetensors"}},
        "rm": {"class_type": "RemoveBackground", "inputs": {"bg_removal_model": ["bgm", 0], "image": ["load", 0]}},
        "mimg": {"class_type": "MaskToImage", "inputs": {"mask": ["rm", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["mimg", 0], "filename_prefix": "mask"}},
    }
    tmp = out_path + ".mask.png"
    run(g, tmp)
    rgb = Image.open(image_path).convert("RGB")
    mask = Image.open(tmp).convert("L").resize(rgb.size)
    rgba = rgb.copy()
    rgba.putalpha(mask)
    rgba.save(out_path)
    os.remove(tmp)
    return out_path
