# Phase 4b — RunPod worker

Ce dossier contient le **worker GPU** de la Phase 4b (production visuelle/vidéo) —
voir `CLAUDE.md` à la racine pour le contexte complet du projet.

**Ce n'est pas une Edge Function Supabase.** C'est une image Docker autonome, déployée
sur RunPod, appelée par `supabase/functions/_shared/runpodClient.ts` /
`supabase/functions/phase4b-process/index.ts`.

## Ce qu'il contient

- `handler.py` — point d'entrée RunPod Serverless, reçoit un job et route vers le bon
  traitement (`image_enhance`, `video_upscale`, `video_highlights`, `visual_from_media`)
- `realesrgan_infer.py` — wrapper autour de Real-ESRGAN (amélioration qualité image, et
  frame par frame pour la vidéo — voir la note de substitution dans `handler.py`
  concernant Video2X)
- `Dockerfile` — image du worker (ffmpeg + Real-ESRGAN)
- `requirements.txt` — dépendances Python

## ⚠️ Pas encore testé de bout en bout

Ce code a été écrit sans accès à un compte RunPod ni à un GPU pour le tester
réellement (voir le Dockerfile pour un risque de compatibilité connu, non vérifié,
entre `basicsr` et `torchvision`). **La première étape avant tout usage réel doit être
un build + test manuel**, pas une mise en production directe.

## Déploiement — étapes

### 1. Construire et publier l'image Docker

Il te faut un compte sur un registre d'images (Docker Hub gratuit suffit) :

```sh
cd runpod-worker
docker build -t <ton-utilisateur-dockerhub>/gln-phase4b-worker:latest .
docker push <ton-utilisateur-dockerhub>/gln-phase4b-worker:latest
```

### 2. Créer le compte RunPod + la clé API

1. Crée un compte sur [runpod.io](https://runpod.io) (pas d'essai gratuit réel — un
   dépôt d'au moins 10$ est nécessaire, voir CLAUDE.md pour le détail)
2. Dans le dashboard RunPod → **Settings → API Keys** → génère une clé

### 3. Créer le Serverless Endpoint

1. RunPod dashboard → **Serverless → New Endpoint**
2. Source de l'image : colle `<ton-utilisateur-dockerhub>/gln-phase4b-worker:latest`
3. GPU : **RTX 4090** (confirmé avec Russel — bon rapport performance/prix)
4. Workers actifs minimum : **0** (scale-to-zero — pas de facturation à l'arrêt)
5. Une fois créé, RunPod affiche un **Endpoint ID** — copie-le

### 4. Configurer les secrets côté Supabase

Dashboard Supabase → **Edge Functions → Secrets** :

- `RUNPOD_API_KEY` = la clé générée à l'étape 2
- `RUNPOD_ENDPOINT_ID` = l'ID copié à l'étape 3

### 5. Test recommandé avant usage réel

1. Sur RunPod, utilise leur testeur intégré pour envoyer un job manuel avec une petite
   image de test, vérifier que `handler.py` répond correctement (surtout
   `image_enhance`, le plus simple des quatre traitements)
2. Une fois confirmé, tester `image_enhance` depuis l'admin GLN (`/admin` → Audit IA
   (Phase 1) → panneau Phase 4b) avec une vraie image
3. Tester `video_upscale` seulement après — plus lent, plus de surface d'échec possible
