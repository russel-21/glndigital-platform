"""Thin wrapper around the official Real-ESRGAN Python package
(xinntao/Real-ESRGAN on GitHub, pip package `realesrgan` + `basicsr`) —
used by handler.py for image_enhance and, frame-by-frame, for
video_upscale. Model weights are baked into the Docker image at build
time (see Dockerfile) rather than downloaded per-job, so a cold worker
never blocks on a weights download.
"""

from pathlib import Path

import cv2
import torch
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer

_WEIGHTS_DIR = Path(__file__).parent / "weights"

# Cache one upsampler per model name across invocations within the same
# worker process (a RunPod worker handles many jobs across its lifetime,
# not just one) — avoids reloading weights onto the GPU on every request.
_upsamplers: dict[str, RealESRGANer] = {}


def _get_upsampler(model_name: str) -> RealESRGANer:
    if model_name in _upsamplers:
        return _upsamplers[model_name]

    weights_path = _WEIGHTS_DIR / f"{model_name}.pth"
    if not weights_path.exists():
        raise FileNotFoundError(
            f"Poids Real-ESRGAN introuvables : {weights_path}. "
            "Vérifie que le Dockerfile les a bien téléchargés au build."
        )

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
    upsampler = RealESRGANer(
        scale=4,
        model_path=str(weights_path),
        model=model,
        tile=256,  # tiled inference — keeps VRAM bounded on large images/frames
        tile_pad=10,
        pre_pad=0,
        half=torch.cuda.is_available(),
    )
    _upsamplers[model_name] = upsampler
    return upsampler


def upscale_image(input_path: Path, output_path: Path, model_name: str = "RealESRGAN_x4plus") -> None:
    img = cv2.imread(str(input_path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Image illisible : {input_path}")

    upsampler = _get_upsampler(model_name)
    output, _ = upsampler.enhance(img, outscale=4)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), output)
