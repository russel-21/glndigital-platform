# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

GLN Digital is the marketing website + client/partner/admin platform for a digital marketing agency
(Douala, Cameroon). It is a Vite + React + TypeScript SPA styled with Tailwind/shadcn-ui, using Supabase
for auth, database (Postgres + RLS) and storage. The app is bilingual (French/English) and was originally
scaffolded and is still partly edited via Lovable (see `lovable-tagger` dev dependency and the `README.md`).

## Commands

```sh
npm i                # install dependencies (package-lock.json is the source of truth; ignore bun.lockb)
npm run dev           # start Vite dev server on port 8080
npm run build         # production build
npm run build:dev     # build in development mode (unminified, for debugging build issues)
npm run preview       # preview a production build locally
npm run lint          # eslint .
npm run test          # vitest run (single run, CI mode)
npm run test:watch    # vitest (watch mode)
```

Run a single test file: `npx vitest run src/test/example.test.ts`
Run tests matching a name: `npx vitest run -t "some test name"`

There is no CI workflow configured in `.github/` — lint/build/test are run manually or on Vercel deploy
(`vercel.json` runs `npm run build`).

## Architecture

### Routing & app shell
`src/App.tsx` wires a single `BrowserRouter` with a flat list of routes and mounts `Navbar`/`Footer`/
`WhatsAppButton` around all of them. There is no route-level code splitting, layout nesting, or auth
guard at the router level — each page component (e.g. `Admin.tsx`, `DashboardEleve.tsx`) is responsible
for checking auth/role itself on mount. `LanguageProvider` (French default, English toggle) and
react-query's `QueryClientProvider` wrap the whole tree.

### Auth & roles (Supabase)
- `src/integrations/supabase/client.ts` is a generated file (comment says "do not edit directly") that
  hardcodes the Supabase project URL and publishable (anon) key — it does not read `import.meta.env`,
  even though `.env` defines `VITE_SUPABASE_*` vars. `src/integrations/supabase/types.ts` holds the
  generated DB types.
- A single `public.profiles` table (see `supabase/migrations/20260528183200_create_profiles.sql`) drives
  authorization: `roles text[]` (e.g. `{student,partner}`) plus `current_role text` (the actively
  selected role, switchable in the UI). There is no separate roles/permissions table.
- Admin access is determined client-side by checking `roles`/`current_role` for `admin`/`super_admin`
  after fetching the signed-in user's profile row (see the `checkAdminAccess` effect near the top of
  `src/pages/Admin.tsx`) — real enforcement lives in Postgres RLS via the `public.is_admin()` SQL
  function (`supabase/migrations/20260612223000_harden_rls_policies.sql`), not in the client.
- Migrations are additive/sequential and matter for security: `...682d0edb...` created the original
  permissive ("Anyone can ...") policies for `testimonials`/`portfolio_media`/`admin_settings`;
  `...create_audit_requests.sql` created equally permissive policies for `audit_requests`; the later
  `...harden_rls_policies.sql` locks both down to `public.is_admin()`-gated admin mutations plus
  scoped user-owned reads. When touching RLS, read the migrations in timestamp order to see what was
  tightened and why, and add a new migration rather than editing old ones.

### Data layer: local-first stores backed by optional Supabase sync
Several `src/lib/*Store.ts` / `src/lib/siteContent.ts` / `src/lib/competitiveIntel.ts` modules implement
the same pattern: a typed domain model, `defaultX` seed data, `getX()`/`saveX()` that read/write
`localStorage` (JSON blobs under `gln_*_db` keys, synchronous, no backend required), and — for audit
requests specifically (`src/lib/auditStore.ts`) — parallel `fetchRemoteX`/`upsertRemoteX`/`saveRemoteX`/
`deleteRemoteX` functions that hit the Supabase `audit_requests` table (`payload jsonb` column holding
the whole `AuditRequest` object). Admin/dashboard pages call both layers and reconcile them; this is not
a single source of truth, so when adding a new field to a store's interface, keep local defaults and any
remote payload shape in sync. `notificationsStore.ts` and `siteContent.ts` are localStorage-only (no
Supabase table) and use `window.dispatchEvent(new Event("..."))` so other mounted components can react
to changes made elsewhere in the app (no global state manager is used).

### i18n
`src/hooks/useLanguage.tsx` implements a from-scratch i18n context: a `Record<Language, Record<string,
string>>` translation dictionary (`fr`/`en`) and a `t(key)` lookup that falls back to French then to the
raw key. Language preference persists to `localStorage` (`gln_pref_lang`) and defaults to browser
language. There is no external i18n library — add new UI strings by adding a matching `fr`/`en` key pair
directly in that file, and prefer `t("namespace.key")`-style keys consistent with the existing ones.

### UI components
`src/components/ui/*` is the shadcn-ui generated component set (Radix primitives + `class-variance-
authority` + Tailwind); treat these as library code and prefer composing them over editing them.
`components.json` defines the shadcn config (`baseColor: slate`, no RSC, path aliases below). Feature/
page-specific components live directly under `src/components/`. Path alias `@/*` → `src/*` is configured
in `vite.config.ts`, `vitest.config.ts`, and `tsconfig.json`.

### Large admin surface
`src/pages/Admin.tsx` (~5.6k lines) is a single monolithic component covering course management, audit
request CRM/reporting, site content blocks, competitive intel, and testimonial/portfolio media curation,
each behind its own `Tabs`/`TabsContent`. When editing it, locate the relevant section by its imported
store (`coursesStore`, `auditStore`, `siteContent`, `competitiveIntel`) rather than reading top-to-bottom.
It also contains ad-hoc scraping helpers (`scrapePage`) that call third-party metadata proxies
(Microlink, AllOrigins) directly from the browser for admin-entered competitor URLs.

### Anti-scraping guard
`src/lib/antiScraping.ts` is installed at the very top of `src/main.tsx` before React renders. It
heuristically blocks likely bots/headless browsers (UA sniffing, `navigator.webdriver`, burst-navigation
detection) by wiping `document.documentElement` and throwing, and it adds `noindex` + disables copy/
context-menu on sensitive paths (`/admin`, `/audit/rapport/*`, dashboards, `/auth-callback`). Keep this
in mind if a page or feature under those paths behaves oddly in headless test/browser-automation
contexts — the guard is intentionally aggressive there. `vercel.json` reinforces this at the HTTP layer
with `X-Robots-Tag`/`Cache-Control` headers for the same paths.

### Testing
Vitest + jsdom + Testing Library (`vitest.config.ts`, `src/test/setup.ts`). Test files live under
`src/**/*.{test,spec}.{ts,tsx}` (currently only `src/test/example.test.ts` — the suite is minimal, so
don't assume broad existing coverage when changing a module).

---

## Feature en cours de cadrage : automatisation réseaux sociaux par agents IA

Tout ce qui suit est le cahier des charges fourni par Russel (porteur du projet) pour une évolution de
la plateforme : ajouter l'automatisation de la gestion de comptes/pages Meta (Facebook, Instagram),
TikTok et YouTube via des agents IA, structurée en 7 phases méthodologiques. C'est une spécification à
réaliser, pas (encore, en totalité) une description de l'existant. Les fichiers `src/lib/auditStore.ts` +
`src/pages/AuditPage.tsx` + `src/pages/AuditReportDetail.tsx` sont un outil d'audit **manuel** distinct
(grilles de notation 1-5 remplies par un humain, captures d'écran annotées) qui a servi d'inspiration
mais reste séparé de ce qui suit.

### État d'avancement (mis à jour au fil des sessions Claude Code)

- **Phase 1 (Audit) — fondation posée, 2026-08-09.** Décisions prises avec Russel : on démarre par cette
  phase, en Supabase Edge Functions, sans compte Zernio pour l'instant (donc en mode mock explicite).
  - `supabase/migrations/20260809120000_create_phase1_audit_tables.sql` — tables `social_connections`
    (un compte client à auditer) et `audit_snapshots` (append-only, une ligne par extraction), RLS
    admin-only (`public.is_admin()`), pas de policy update sur `audit_snapshots` (append-only assumé).
    **Non encore appliquée à la base Supabase distante** — à faire via `supabase db push` (ou équivalent)
    avant de pouvoir tester l'edge function contre une vraie base.
  - `supabase/functions/_shared/zernioClient.ts` — adapte Zernio vers un contrat normalisé
    (`NormalizedAuditMetrics`), sentinelle `"donnée_indisponible"` pour tout champ manquant. **L'appel
    HTTP réel à Zernio n'est PAS implémenté** (endpoints/format de réponse non vérifiés contre leur doc
    officielle — deviner aurait violé la règle anti-hallucination du projet) : sans `ZERNIO_API_KEY`, la
    fonction retourne des données factices clairement marquées (`is_mock: true`, valeurs rondes du type
    1000 followers) ; avec la clé définie, elle lève une erreur explicite plutôt que de faire semblant.
    À compléter (`callRealZernioApi`) une fois le compte Zernio + sa doc API en main.
  - `supabase/functions/phase1-audit/index.ts` — edge function admin-only (vérifie `is_admin()` via le
    JWT de l'appelant, aucune clé service-role utilisée) qui prend un `social_connection_id`, appelle le
    client Zernio, et insère un `audit_snapshots`. Aucune interprétation/score, pas de porte de validation
    humaine (conforme au tableau Phase 1 : validation humaine non requise).
  - **Pas encore fait** : appliquer la migration sur Supabase, tests, et bien sûr l'implémentation réelle
    de `callRealZernioApi` (bloquée sur l'accès à la doc/API Zernio).
- **Phase 1 (Audit) — UI admin ajoutée, 2026-08-09.**
  - `src/lib/phase1AuditStore.ts` — couche de données typée (mêmes conventions que `auditStore.ts`,
    casts `(supabase as any)` car les tables ne sont pas encore dans `types.ts` généré) : CRUD sur
    `social_connections`, lecture de `audit_snapshots`, et `triggerPhase1Audit()` qui appelle l'edge
    function `phase1-audit` via `supabase.functions.invoke` (le JWT admin est attaché automatiquement
    par le client Supabase).
  - Nouvel onglet **« Audit IA (Phase 1) »** dans `src/pages/Admin.tsx` (`Phase1AuditAdmin` +
    `Phase1AuditSnapshots`, insérés juste après `CompetitiveIntelAdmin`) : formulaire pour ajouter un
    `social_connections` (plateforme + handle + id Zernio optionnel), bouton « Lancer un audit » par
    compte, et historique des `audit_snapshots` avec badge **MOCK** systématique quand `is_mock` est
    vrai — aucune interprétation des métriques, affichage brut uniquement (conforme Phase 1 : pas de
    score, pas de ratio calculé côté client).
  - Vérifié : `npx tsc --noEmit` et `npx eslint` ne remontent aucune nouvelle erreur (les erreurs/`any`
    restants dans `Admin.tsx` sont préexistants, mêmes lignes qu'avant cette session).
  - **Mismatch de ref de projet Supabase — résolu, 2026-08-09.** `supabase/config.toml` référençait
    `project_id = "efdlfvakctkwfiukkekk"` alors que `src/integrations/supabase/client.ts` (le projet
    réellement utilisé par l'app en prod) pointe vers `https://ccrlfetratxnvgehiwnc.supabase.co`.
    Russel a confirmé que **`ccrlfetratxnvgehiwnc`** ("porte cyan supabase" ou "base de données native
    Bol…" dans son dashboard — à confirmer lequel exactement au moment du `supabase link`) est le bon
    projet ; `supabase/config.toml` a été corrigé pour pointer dessus. Le projet est actuellement en
    pause côté Supabase (palier gratuit, mise en veille auto) — à réactiver ("Restore") avant de
    pouvoir le lier/pousser une migration.
  - Le CLI Supabase n'est pas authentifié dans cet environnement (`SUPABASE_ACCESS_TOKEN` absent,
    `supabase projects list` échoue avec `LegacyPlatformAuthRequiredError`) — Russel doit lancer
    `supabase login` (ou définir `SUPABASE_ACCESS_TOKEN` avec un token généré sur
    supabase.com/dashboard/account/tokens) puis `supabase link --project-ref ccrlfetratxnvgehiwnc`
    et `supabase db push` lui-même depuis son propre terminal — la migration ne peut pas être
    appliquée à distance depuis cette session sans cet accès.
  - **Migration Phase 1 appliquée sur la vraie base — 2026-08-10.** Blocage GitHub résolu au passage :
    ce PC est celui de Russel, mais Git avait un compte GitHub (YAMEGOUCYRILLE, celui de Cyrille) en
    cache sans accès en écriture sur `russel-21/glndigital-platform` — identifiants retirés du Windows
    Credential Manager (`git credential-manager github logout`), Russel s'est reconnecté avec son propre
    compte, `phase1-audit-admin-ui` est poussée sur GitHub.
  - **`supabase db push` a échoué au premier essai** : `ERROR: syntax error at or near "current_role"
    (SQLSTATE 42601)`. `current_role` est un mot réservé Postgres (comme `current_user`) — utilisé sans
    guillemets comme nom de colonne dans `20260528183200_create_profiles.sql`, invalide en SQL strict.
    Corrigé (`"current_role"` entre guillemets) dans ce fichier et dans
    `20260612223000_harden_rls_policies.sql` (deux occurrences dans `is_admin()` et la policy update de
    `profiles` — voir commentaires dans ce dernier fichier : condition toujours fausse/toujours vraie
    selon le cas, jamais une faille de sécurité, juste du code mort qui ne faisait pas ce que son
    commentaire disait).
  - **Découverte plus importante en creusant** : `supabase migration list` a montré que seule la toute
    première migration (`20260224100714`) avait jamais été réellement appliquée via le CLI — `profiles`
    et `audit_requests` existent bien sur la base réelle (créés autrement, probablement via Lovable/
    l'éditeur Supabase) mais **la fonction `public.is_admin()` n'existait pas du tout en prod avant
    cette session** (confirmé par une 2e erreur `db push` : `function public.is_admin() does not exist`).
    Autrement dit, les policies RLS durcies de `20260612223000_harden_rls_policies.sql` (admin-only sur
    `admin_settings`/`testimonials`/`portfolio_media`, etc.) n'étaient jamais réellement passées en prod
    malgré ce que ce fichier CLAUDE.md racontait précédemment — les anciennes policies permissives
    ("Anyone can ...") de `...682d0edb...` ont probablement été actives en prod jusqu'à maintenant.
    Utilisé `supabase migration repair` pour resynchroniser l'historique (les 3 migrations dont les
    tables existaient déjà marquées "applied" sans ré-exécution, sauf `20260612223000` remise à
    "reverted" puis réellement rejouée) ; `supabase db push` a ensuite appliqué pour de vrai le
    durcissement RLS + les tables Phase 1 (`social_connections`, `audit_snapshots`). À vérifier par
    Russel : aucune trace d'abus des policies permissives pendant qu'elles étaient actives (impossible
    à auditer depuis cette session).
  - **Types régénérés** (`supabase gen types typescript --linked`) : `src/integrations/supabase/
    types.ts` reflète maintenant le vrai schéma. Retiré tous les casts `(supabase as any)` dans
    `phase1AuditStore.ts`/`auditStore.ts` (remplacés par des casts `as unknown as X` ciblés uniquement
    là où une colonne `jsonb`/`Json` doit être affinée vers un type domaine précis — pattern normal, pas
    un contournement de typage). Ça a aussi fait apparaître un vrai bug pré-existant démasqué par les
    types corrects : `src/pages/AuthCallback.tsx` testait `profile.role` (colonne inexistante, toujours
    `undefined`) en plus de `profile.roles.includes(...)` — condition morte, corrigée (supprimée, la
    vérification `roles.includes()` couvrait déjà le cas).
  - `npx tsc --noEmit` et `npx eslint` sur les fichiers touchés : 0 erreur.
- **Phases 2 à 7** : non commencées.

### 1. Contexte du projet

**Porteur du projet** : Russel, fondateur de GLN Digital (agence marketing digital basée à Douala/Yaoundé, Cameroun).

**Objectif** : la plateforme existe déjà. Il s'agit d'y apporter des améliorations en ajoutant
l'automatisation de la gestion de comptes/pages Meta (Facebook, Instagram), TikTok et YouTube via des
agents IA, structurée en 7 phases méthodologiques (voir section 3).

**Site vitrine existant** : glndigital-platform.vercel.app — services actuels : Social Media Management,
Publicité Meta Ads, Création de site internet, Création de contenu vidéo/visuel.

### 2. Blocage technique déjà rencontré — NE PAS RÉPÉTER CES ERREURS

Le porteur du projet a tenté sans succès de connecter des comptes clients à son outil via :
- Soumission directe de liens de page/compte — refusé
- Accès préalable donné par le client — refusé
- Attribution d'un rôle (admin/éditeur) sur la page — refusé

**Cause racine identifiée** : l'application n'est pas passée par le processus d'App Review des
plateformes (Meta App Review + Business Verification, TikTok for Developers App Review, Google/YouTube
OAuth Verification). Sans validation, une app tierce reste en mode sandbox et ne peut accéder qu'aux
comptes explicitement ajoutés comme testeurs par le développeur — jamais aux comptes de vrais clients.

**Décision prise** : ne pas développer de connecteurs API custom en interne dans un premier temps.
Utiliser un agrégateur d'API déjà validé par les plateformes :
- **Zernio** (recommandé pour démarrer) — palier gratuit jusqu'à 2 comptes, pour tester sans investir
- Éviter Unipile pour ce cas d'usage : ne couvre que la messagerie, pas la publication de posts

**Flux attendu une fois l'agrégateur intégré** : le client se connecte via OAuth standard (bouton
"Connecter mon compte Instagram/TikTok/YouTube") sur la plateforme, autorise les permissions — pas de
contournement, pas de scraping, pas d'automatisation navigateur (violation des ToS = bannissement des
comptes clients).

### 3. Architecture — 7 phases / 7 skills

Chaque phase correspond à un agent IA avec un rôle strictement délimité. Ne jamais fusionner les
responsabilités entre phases sans validation explicite.

| # | Phase | Fonction | Automatisation IA | Validation humaine requise |
|---|-------|----------|-------------------|------------------------------|
| 1 | Audit | Collecte de données factuelles via API officielle (Meta Graph API, TikTok Business API, YouTube Data API) | Élevée | Non |
| 2 | Diagnostic | Identification des problèmes à partir des données de la Phase 1. **Doit être accompagné de captures d'écran (images) pour pertinence** | Partielle | **Oui, obligatoire avant Phase 3** |
| 3 | Stratégie de contenu | Piliers de contenu, calendrier éditorial | Partielle | **Oui, obligatoire avant Phase 4** |
| 4a | Production texte | Légendes, scripts, hooks | Élevée pour brouillons | Oui, relecture avant publication |
| 4b | Production visuelle/vidéo | Synthèse d'une vidéo soumise, amélioration de la qualité d'une image, montage des moments forts d'une vidéo soumise (en fonction de ce qui est sollicité en Phase 4a), création de visuels sur la base des images/vidéos soumises | Faible-moyenne (qualité IA encore limitée) | Oui, validation qualité |
| 5 | Publication | Programmation et diffusion multi-plateforme | Élevée (automatisation pure via agrégateur API) | Non |
| 6 | Engagement communautaire | Notification systématique dès qu'une réponse est demandée dans un commentaire — pas de réponse automatique | Faible (détection/alerte uniquement) | **Oui, toute réponse reste rédigée/validée par un humain** |
| 7 | Analyse/optimisation | Comparaison performance prévue vs réelle | Élevée | Non |

### 4. Règles anti-hallucination — À IMPLÉMENTER DANS CHAQUE SKILL/AGENT

Principe général : un LLM hallucine quand (1) il manque de données et comble les trous, (2) on lui
demande une certitude sur un sujet incertain, (3) il n'a pas de mécanisme pour dire "je ne sais pas".
Chaque agent doit intégrer :

1. **Scope strict** : périmètre exact défini, refus/escalade de tout ce qui en sort
2. **Obligation de sourcer** : toute affirmation factuelle reliée à une donnée fournie en entrée — jamais tirée de la mémoire générale du modèle
3. **Niveau de confiance explicite** : chaque sortie labellisée Élevé/Moyen/Faible
4. **Clause d'échappement** : si données insuffisantes, le dire explicitement plutôt que deviner
5. **Point de contrôle humain** : documenté à chaque étape où il est obligatoire

#### Règles spécifiques par phase

- **Phase 1 (Audit)** : aucune estimation si une donnée API est absente (champ `"donnée_indisponible"`).
  Pas de calcul de ratio si une des deux valeurs manque. Pas d'interprétation — uniquement du factuel
  avec source + date d'extraction.
- **Phase 2 (Diagnostic)** : chaque hypothèse reliée explicitement à une donnée de la Phase 1.
  Formulation probabiliste obligatoire ("les données suggèrent X, confiance moyenne"), jamais de
  certitude affirmée. Si données insuffisantes → répondre "diagnostic non concluant, données
  manquantes : [liste]". **Doit systématiquement être accompagné de captures d'écran (images) du
  compte/de la page concernée, pour garantir la pertinence du diagnostic — un diagnostic sans support
  visuel est considéré incomplet.**
- **Phase 3 (Stratégie)** : interdiction de citer des "tendances actuelles" sans recherche web réelle
  horodatée (jamais depuis la mémoire d'entraînement — les tendances réseaux sociaux évoluent en
  semaines). Toute référence concurrent doit venir de données réellement collectées en Phase 1.
- **Phase 4a (Texte)** : interdiction absolue d'inventer des chiffres/statistiques dans le contenu
  généré. Tout fait sur l'entreprise/produit doit venir d'un brand brief fourni, jamais halluciné.
- **Phase 4b (Visuel/vidéo)** : fonctions couvertes = (1) synthèse d'une vidéo soumise, (2) amélioration
  de la qualité d'une image soumise, (3) montage des moments forts d'une vidéo soumise, en fonction de ce
  qui est sollicité par la Phase 4a, (4) création de visuels sur la base des images/vidéos soumises par
  l'utilisateur — jamais de génération à partir de rien sans média source fourni. Jamais présenté comme
  "prêt à publier" sans validation qualité humaine. Vérification systématique de cohérence de marque
  (logo, couleurs, ton).
- **Phase 5 (Publication)** : confirmation systématique du contenu exact avant publication, aucune
  modification silencieuse entre validation et publication. Log horodaté de traçabilité.
- **Phase 6 (Engagement)** : rôle limité à la détection et à la notification — dès qu'une réponse est
  attendue/demandée dans un commentaire ou un DM, une notification est envoyée à un humain. Aucune
  réponse n'est générée ni publiée automatiquement par l'agent, y compris pour les questions simples. La
  rédaction de la réponse reste entièrement humaine.
- **Phase 7 (Analyse)** : toute conclusion doit citer les chiffres précis comparés (avant/après).
  Distinction obligatoire entre corrélation observée et causalité affirmée.

### 5. Stack technique de référence

- **Agrégateur API réseaux sociaux** : Zernio
- **Orchestration d'agents** : LangGraph ou CrewAI (à trancher selon préférence de développement), ou
  architecture custom avec function calling
- **Boucle d'orchestration** :
```
Agent 1 (Audit)
  → Agent 2 (Diagnostic) [VALIDATION HUMAINE]
    → Agent 3 (Stratégie) [VALIDATION HUMAINE]
      → Agent 4a/4b (Production) [RELECTURE HUMAINE]
        → Agent 5 (Publication) [automatique]
          → Agent 6 (Engagement) [supervision humaine]
            → Agent 7 (Analyse)
              → retour à Agent 2 (boucle continue)
```

### 6. Positionnement à respecter dans toute communication/documentation générée

Ne jamais présenter le système comme "gestion 100% automatisée par IA" dans la documentation client ou
le marketing du produit. Positionnement correct : **"agence humaine assistée par IA"** — les agents
accélèrent audit, diagnostic, brouillons et analyse ; la validation stratégique, la créativité
différenciante et l'engagement sensible restent supervisés par un humain.

### 7. Instructions pour Claude Code

- Il s'agit d'une amélioration d'une plateforme existante, pas d'une création depuis zéro : explorer et
  comprendre la base de code actuelle avant de proposer ou d'écrire une architecture nouvelle.
- Respecter strictement le découpage en 7 skills/agents séparés — ne pas fusionner les responsabilités
  entre phases.
- Implémenter les points de validation humaine comme des étapes bloquantes réelles dans le code (une
  vraie interruption de flux qui attend une confirmation, pas un simple log ou avertissement).
- Toute intégration API réseaux sociaux doit passer par Zernio, sans exception ni développement de
  connecteur direct Meta/TikTok/YouTube, sauf demande explicite contraire du porteur du projet.
- La Phase 2 (Diagnostic) doit obligatoirement intégrer la capture et le traitement d'images/captures
  d'écran comme partie du diagnostic — ne pas implémenter cette phase en texte seul.
- La Phase 4b (Production visuelle/vidéo) fonctionne uniquement à partir de médias soumis par
  l'utilisateur (image ou vidéo) : ne jamais générer de visuel ou de vidéo à partir de rien.
- La Phase 6 (Engagement communautaire) se limite à la détection et à la notification humaine — ne
  jamais implémenter de génération ou de publication automatique de réponse, même partielle.
- Documenter chaque agent avec son scope strict en commentaire en tête de fichier.
- Ne pas supposer une architecture de dossiers ou de base de données non confirmée — demander avant de
  créer une structure qui n'existe pas déjà dans le repo.
