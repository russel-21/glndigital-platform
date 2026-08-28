"""RunPod Serverless worker — Phase 4b (Production visuelle/vidéo).
See CLAUDE.md, "Feature en cours de cadrage : automatisation reseaux
sociaux par agents IA", and supabase/functions/_shared/runpodClient.ts for
the calling side of this contract.

SCOPE (strict): given a downloadable input file URL and one of four fixed
operations, run the matching real image/video tool and return the result
as base64 in the handler's return value. Never generates media from
nothing — always starts from the file at input_url.

Substitution documented for Russel: CLAUDE.md/the original brief named
"Video2X" for video upscaling. This worker instead runs Real-ESRGAN on
every extracted frame (via ffmpeg) and re-encodes the result, rather than
depending on Video2X directly — Video2X's exact CLI/Python contract was not
verified against an authoritative source, and guessing it would violate
this project's own anti-hallucination rule. Frame-by-frame Real-ESRGAN is
one of Video2X's own actual upscaling strategies under the hood, so this
is a documented, reasoned substitution, not a silent shortcut — swap this
for a real Video2X invocation later if its contract gets verified.

Input contract (event["input"]):
    {
      "operation": "image_enhance" | "video_upscale" | "video_highlights" | "visual_from_media",
      "input_url": "<https URL the worker can GET the source file from>",
      "instructions": "<free text, may be empty>"
    }

Output contract (handler return value -> RunPod's own "output" field):
    success: {"output_base64": "<base64 str>", "content_type": "<mime>"}
    failure: {"error": "<human-readable message>"}
Both shapes are read defensively by the caller
(supabase/functions/_shared/runpodClient.ts's checkJobStatus) — a missing
output_base64 on a COMPLETED job is treated as a failure regardless of
which of the two shapes above was actually returned, so this worker does
not need to match RunPod's own internal error-field convention exactly.
"""

import base64
import os
import subprocess
import tempfile
import traceback
from pathlib import Path

import requests
import runpod

# Real-ESRGAN model used for every frame/image enhancement — the general-
# purpose x4 model, a real published Real-ESRGAN weight (not invented).
# Swap via the REALESRGAN_MODEL env var if a different model is preferred.
REALESRGAN_MODEL = os.environ.get("REALESRGAN_MODEL", "RealESRGAN_x4plus")

MAX_INPUT_BYTES = 500 * 1024 * 1024  # 500 MB — sanity ceiling, not a real product limit


def handler(event):
    try:
        job_input = event.get("input") or {}
        operation = job_input.get("operation")
        input_url = job_input.get("input_url")
        instructions = job_input.get("instructions") or ""

        if operation not in ("image_enhance", "video_upscale", "video_highlights", "visual_from_media"):
            return {"error": f"operation invalide ou absente : {operation!r}"}
        if not input_url:
            return {"error": "input_url est requis."}

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            input_path = download_file(input_url, tmp_path)

            if operation == "image_enhance":
                output_path, content_type = run_image_enhance(input_path, tmp_path)
            elif operation == "video_upscale":
                output_path, content_type = run_video_upscale(input_path, tmp_path)
            elif operation == "video_highlights":
                output_path, content_type = run_video_highlights(input_path, tmp_path, instructions)
            else:  # visual_from_media
                output_path, content_type = run_visual_from_media(input_path, tmp_path, instructions)

            output_bytes = output_path.read_bytes()
            if len(output_bytes) == 0:
                return {"error": "Le traitement a produit un fichier vide."}

            return {
                "output_base64": base64.b64encode(output_bytes).decode("ascii"),
                "content_type": content_type,
            }
    except Exception as exc:  # noqa: BLE001 - deliberately broad: any failure must reach the caller as an error, never silently
        return {"error": f"{exc}\n{traceback.format_exc()}"}


def download_file(url: str, dest_dir: Path) -> Path:
    response = requests.get(url, stream=True, timeout=120)
    response.raise_for_status()
    total = 0
    dest = dest_dir / "input" / guess_input_filename(url, response.headers.get("content-type"))
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            total += len(chunk)
            if total > MAX_INPUT_BYTES:
                raise ValueError(f"Fichier d'entrée trop volumineux (> {MAX_INPUT_BYTES} octets).")
            f.write(chunk)
    if total == 0:
        raise ValueError("Le fichier d'entrée téléchargé est vide.")
    return dest


def guess_input_filename(url: str, content_type: str | None) -> str:
    name = url.split("?")[0].rsplit("/", 1)[-1]
    if "." in name:
        return name
    ext = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
    }.get(content_type or "", "")
    return f"input{ext}"


# ─── image_enhance ────────────────────────────────────────────────

def run_image_enhance(input_path: Path, tmp_path: Path) -> tuple[Path, str]:
    from realesrgan_infer import upscale_image  # local helper, see realesrgan_infer.py

    output_path = tmp_path / "output.png"
    upscale_image(input_path, output_path, model_name=REALESRGAN_MODEL)
    return output_path, "image/png"


# ─── video_upscale ────────────────────────────────────────────────
# Frame-by-frame Real-ESRGAN, per the substitution note at the top of this
# file — extracts frames + audio with ffmpeg, upscales every frame, then
# re-muxes into an mp4 with the original audio track.

def run_video_upscale(input_path: Path, tmp_path: Path) -> tuple[Path, str]:
    from realesrgan_infer import upscale_image

    frames_dir = tmp_path / "frames_in"
    upscaled_dir = tmp_path / "frames_out"
    frames_dir.mkdir()
    upscaled_dir.mkdir()

    fps = probe_fps(input_path)

    run_ffmpeg(["-i", str(input_path), "-qscale:v", "2", str(frames_dir / "frame_%06d.png")])

    frame_files = sorted(frames_dir.glob("frame_*.png"))
    if not frame_files:
        raise ValueError("Aucune image extraite de la vidéo source — format non supporté ou fichier corrompu.")

    for frame_file in frame_files:
        upscale_image(frame_file, upscaled_dir / frame_file.name, model_name=REALESRGAN_MODEL)

    audio_path = tmp_path / "audio.aac"
    has_audio = extract_audio(input_path, audio_path)

    output_path = tmp_path / "output.mp4"
    reencode_args = [
        "-framerate", str(fps),
        "-i", str(upscaled_dir / "frame_%06d.png"),
    ]
    if has_audio:
        reencode_args += ["-i", str(audio_path), "-c:a", "aac", "-shortest"]
    reencode_args += ["-c:v", "libx264", "-pix_fmt", "yuv420p", str(output_path)]
    run_ffmpeg(reencode_args)

    return output_path, "video/mp4"


# ─── video_highlights ─────────────────────────────────────────────
# NOTE: this worker does the mechanical cut/concat only. Deciding WHICH
# moments are the highlights is out of scope for this file — CLAUDE.md
# assigns "what's interesting" to Claude (vision on extracted frames), not
# to this GPU worker. The edge function is expected to pass concrete
# timestamps via `instructions` (e.g. a JSON list of {start, end} ranges)
# once that Claude-side decision step exists; until then this function
# refuses rather than inventing which moments to keep.

def run_video_highlights(input_path: Path, tmp_path: Path, instructions: str) -> tuple[Path, str]:
    import json

    try:
        ranges = json.loads(instructions) if instructions else None
    except json.JSONDecodeError:
        ranges = None

    if not ranges or not isinstance(ranges, list):
        raise ValueError(
            "video_highlights nécessite des plages de temps explicites dans `instructions` "
            '(JSON, ex: [{"start": 12.5, "end": 18.0}, ...]) — ce worker ne décide jamais seul '
            "quels moments garder."
        )

    segment_paths = []
    for i, r in enumerate(ranges):
        start, end = r.get("start"), r.get("end")
        if start is None or end is None or end <= start:
            raise ValueError(f"Plage invalide à l'index {i} : {r!r}")
        seg_path = tmp_path / f"seg_{i:03d}.mp4"
        run_ffmpeg([
            "-i", str(input_path),
            "-ss", str(start), "-to", str(end),
            "-c", "copy", str(seg_path),
        ])
        segment_paths.append(seg_path)

    concat_list = tmp_path / "concat.txt"
    concat_list.write_text("\n".join(f"file '{p}'" for p in segment_paths))

    output_path = tmp_path / "output.mp4"
    run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(output_path)])

    return output_path, "video/mp4"


# ─── visual_from_media ────────────────────────────────────────────
# Simplest of the four: normalizes a submitted image into a clean PNG
# (no compositing/templating logic here — that's a distinct, larger scope
# not covered by this initial pass; see CLAUDE.md follow-up notes).

def run_visual_from_media(input_path: Path, tmp_path: Path, instructions: str) -> tuple[Path, str]:
    output_path = tmp_path / "output.png"
    run_ffmpeg(["-i", str(input_path), str(output_path)])
    return output_path, "image/png"


# ─── ffmpeg helpers ───────────────────────────────────────────────

def run_ffmpeg(args: list[str]) -> None:
    result = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg a échoué : {result.stderr.decode(errors='replace')}")


def probe_fps(input_path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
         "-of", "default=noprint_wrappers=1:nokey=1", str(input_path)],
        capture_output=True,
    )
    raw = result.stdout.decode().strip()
    if "/" in raw:
        num, den = raw.split("/")
        return float(num) / float(den) if float(den) != 0 else 30.0
    return float(raw) if raw else 30.0


def extract_audio(input_path: Path, audio_path: Path) -> bool:
    result = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(input_path), "-vn", "-c:a", "aac", str(audio_path)],
        capture_output=True,
    )
    return result.returncode == 0 and audio_path.exists() and audio_path.stat().st_size > 0


runpod.serverless.start({"handler": handler})
