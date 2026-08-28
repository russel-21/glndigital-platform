# RunPod Serverless worker image — Phase 4b (Production visuelle/vidéo).
# See handler.py for the job contract and CLAUDE.md for the phase's scope.
#
# Built once and pushed to a container registry (Docker Hub or RunPod's own
# registry); RunPod pulls it when the Serverless endpoint is created. See
# README.md in this directory for the exact build/push/deploy steps.

FROM runpod/base:0.6.2-cuda12.1.0

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Real-ESRGAN model weights — official release asset from xinntao/Real-ESRGAN
# on GitHub, baked in at build time so a cold worker never downloads them
# per-job. If this URL ever changes/breaks, get the current one from
# https://github.com/xinntao/Real-ESRGAN — do not substitute an unverified
# mirror.
RUN mkdir -p /app/weights && \
    curl -L -o /app/weights/RealESRGAN_x4plus.pth \
    https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth

COPY handler.py realesrgan_infer.py ./

# KNOWN RISK, not yet verified by an actual build/run — flagging rather
# than silently assuming it works: basicsr (a Real-ESRGAN dependency) has
# a history of importing torchvision internals (e.g.
# torchvision.transforms.functional_tensor) that newer torchvision
# releases removed. The pinned versions in requirements.txt were chosen to
# be compatible as of this writing, but this combination has NOT been
# build-tested end-to-end in this session (no local GPU / RunPod account
# to test against yet). Build this image and run one real job before
# trusting it in production — see README.md's test plan.

CMD ["python3", "-u", "handler.py"]
