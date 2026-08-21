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
- **Phase 2 (Diagnostic) — fondation posée et déployée, 2026-08-15.** Décision prise avec Russel : IA =
  **Claude (Anthropic)**, modèle `claude-sonnet-5` (vision native, sortie JSON contrainte par schéma,
  ~3$/15$ par million de tokens — nettement moins cher qu'Opus pour un usage répété ; changer `MODEL`
  dans `claudeClient.ts` pour passer à `claude-opus-5` si besoin de qualité maximale).
  - `supabase/migrations/20260810210000_create_phase2_diagnostic_tables.sql` — tables
    `diagnostic_screenshots` (captures uploadées par l'admin, obligatoires par compte pour lancer un
    diagnostic) et `diagnostics` (une ligne par run, avec **vraie porte de validation humaine**
    `review_status` : `pending_review` → `approved`/`rejected`, jamais mise à `approved` automatiquement)
    + bucket Storage privé `diagnostic-screenshots` (admin-only, pas public comme `portfolio`). RLS
    admin-only partout via `public.is_admin()`. **Appliquée sur la vraie base** (pas de mode mock côté
    schéma comme pour Phase 1 — voir plus bas pourquoi).
  - `supabase/functions/_shared/claudeClient.ts` — appelle l'API Anthropic (SDK officiel via
    `npm:@anthropic-ai/sdk`, pas de fetch brut) avec `output_config.format: json_schema` pour forcer une
    sortie structurée (hypothèses + `confidence` + `based_on` obligatoire pour chaque hypothèse + données
    manquantes). **Pas de mode mock** contrairement à Zernio : contrairement à l'API Zernio (jamais
    vérifiée contre une doc officielle), le contrat de l'API Claude est parfaitement connu et implémenté
    pour de vrai — sans `ANTHROPIC_API_KEY`, la fonction renvoie une erreur explicite "non configurée"
    plutôt que d'inventer un faux diagnostic (rien de pertinent à mocker pour une tâche de raisonnement).
  - `supabase/functions/phase2-diagnostic/index.ts` — edge function admin-only, refuse de tourner si
    zéro capture d'écran fournie (conforme CLAUDE.md : diagnostic sans support visuel = incomplet),
    résout l'`audit_snapshots` le plus récent si aucun n'est précisé, télécharge les captures depuis
    Storage et les encode en base64 pour l'appel Claude.
  - `src/lib/phase2DiagnosticStore.ts` + nouveau bloc **« Phase 2 — Diagnostic »** dans l'onglet
    Audit IA (Phase 1) de `src/pages/Admin.tsx`, sous l'historique des snapshots de chaque compte :
    upload de captures, sélection multiple, bouton « Générer un diagnostic » (désactivé sans capture
    sélectionnée), affichage des hypothèses avec badge de confiance, et boutons **Approuver/Rejeter**
    — vraie porte bloquante (écrit `review_status`/`reviewed_by`/`reviewed_at`), pas juste un log.
  - **Simplification de portée assumée** : pas d'annotation par point (x/y + sévérité) comme l'outil
    d'audit manuel existant (`auditStore.ts` → `ScreenshotAnnotation`) — juste upload + libellé. CLAUDE.md
    n'exige que la présence de captures, pas l'annotation par pin ; à ajouter plus tard si Russel le
    demande.
  - **Limite RLS assumée** : la policy `UPDATE` sur `diagnostics` est admin-only mais pas restreinte aux
    seules colonnes de validation (Postgres RLS ne fait pas de contrôle par colonne) — même compromis que
    `admin_settings`/`testimonials` ailleurs dans ce projet. L'UI n'écrit jamais que les champs de
    validation, mais rien n'empêche un appel API direct de modifier aussi le contenu généré par l'IA.
  - `supabase db push` appliqué directement depuis cette session (CLI encore authentifié sur cette
    machine), types régénérés, `npx tsc --noEmit` / `npx eslint` / `npm run test` : 0 erreur.
  - **Bug de déploiement découvert en testant avec Russel, 2026-08-15** : `supabase db push` pousse les
    migrations SQL mais **ne déploie pas les edge functions** — `phase1-audit` et `phase2-diagnostic`
    n'avaient jamais été réellement déployées malgré tout le travail ci-dessus, d'où l'erreur "Failed to
    send a request to the Edge Function" au premier vrai test. Corrigé avec
    `supabase functions deploy phase1-audit` et `supabase functions deploy phase2-diagnostic` — les deux
    sont maintenant `ACTIVE` sur le projet distant. À refaire à chaque modification du code d'une edge
    function (`db push` seul ne suffit jamais pour ça).
  - **Compte admin de test provisionné, 2026-08-15** : le compte Supabase Auth initial de Russel
    (`russel@glndigital.com`) n'existait pas. Créé un nouveau compte (`nonamecrewf7@gmail.com`,
    id `2e9c3e54-f6d1-4ecb-8c8f-444a271a2ab9`) + ligne `profiles` correspondante (`roles: {admin,
    super_admin}`). Le mot de passe a dû être défini directement en SQL
    (`update auth.users set encrypted_password = crypt(...)`) car le site n'avait aucune page de gestion
    de mot de passe — ni définition après invitation par email, ni changement une fois connecté. Corrigé
    par l'ajout d'un nouvel onglet **"Mon compte"** dans `Admin.tsx` utilisant le vrai
    `supabase.auth.updateUser({ password })`.
  - **Pas encore fait** : tests end-to-end réels avec `ANTHROPIC_API_KEY` configurée en secret Supabase
    (à faire par Russel), annotation par pin si souhaitée.
- **Phase 3 (Stratégie de contenu) — fondation posée et déployée, 2026-08-15.** Décision prise avec
  Russel : calendrier éditorial sur **4 semaines, ~2-3 publications/semaine**.
  - `supabase/migrations/20260815223000_create_phase3_strategy_tables.sql` — table `content_strategies`
    (`diagnostic_id` non-nullable : une stratégie doit toujours pointer vers le diagnostic Phase 2 dont
    elle découle), avec la même porte de validation humaine `review_status` que Phase 2. RLS admin-only.
    **Appliquée sur la vraie base + edge function déployée dans la foulée** (pas d'oubli cette fois).
  - `supabase/functions/_shared/claudeClient.ts` — ajout de `generateContentStrategy()` (Phase 2 et
    Phase 3 partagent ce fichier mais restent des fonctions séparées, chacune avec son propre system
    prompt/schéma — pas de fusion des responsabilités). Utilise l'outil `web_search_20260209` de Claude
    pour que toute "tendance actuelle" citée vienne d'une vraie recherche web horodatée (jamais de la
    mémoire d'entraînement, conforme à la règle Phase 3) — chaque tendance utilisée doit apparaître dans
    `trends_used` avec URL source + date. **Aucune référence concurrent** : Phase 1 tel que construit ne
    collecte aucune donnée sur les concurrents (uniquement les métriques du compte audité lui-même), donc
    le prompt interdit explicitement d'en inventer plutôt que de prétendre en avoir.
  - `supabase/functions/phase3-strategy/index.ts` — edge function admin-only qui **refuse de tourner
    s'il n'existe aucun diagnostic avec `review_status = 'approved'`** pour ce compte — c'est la porte
    bloquante Phase 2 → Phase 3 exigée par CLAUDE.md, implémentée pour de vrai (pas juste documentée).
  - `src/lib/phase3StrategyStore.ts` + nouveau bloc **"Phase 3 — Stratégie de contenu"** dans
    `Admin.tsx`, sous le bloc Phase 2 : bouton désactivé tant qu'aucun diagnostic n'est approuvé,
    affichage des piliers/calendrier/sources de tendances, boutons Approuver/Rejeter (vraie porte,
    même mécanisme que Phase 2).
  - Vérifié : `npx tsc --noEmit`, `npx eslint`, `npm run test` : 0 erreur.
  - **Test réel tenté le 15/08 avec Russel** : clé `ANTHROPIC_API_KEY` ajoutée avec succès (confirmé —
    l'edge function atteint bien l'API Claude), mais le compte Anthropic Console n'a pas encore de
    crédits (`"Your credit balance is too low..."`). Décision de Russel : on continue à construire sans
    attendre — même logique que Phase 1 sans compte Zernio, le circuit est vérifiable par ses erreurs
    explicites en attendant.
- **Phase 4a (Production texte) — fondation posée et déployée, 2026-08-16.** Décisions prises avec
  Russel : (1) le "brand brief" exigé par la règle anti-hallucination Phase 4a n'existe nulle part dans
  le système — ajout d'un champ texte libre par compte, rempli par l'admin, aucune autre source
  réutilisée ; (2) granularité = un brouillon par entrée du calendrier Phase 3, validé individuellement
  (pas un lot groupé pour tout le mois).
  - `supabase/migrations/20260816120000_create_phase4a_text_tables.sql` — colonne `brand_brief` ajoutée
    à `social_connections` (nullable, texte libre) + table `content_drafts` (une ligne par
    caption/hook/script généré, toujours liée à un index précis du `editorial_calendar` d'une stratégie
    Phase 3 approuvée — champs du calendrier dénormalisés sur la ligne pour affichage direct). Même
    porte de validation humaine `review_status` que Phase 2/3. RLS admin-only. Appliquée + edge function
    déployée dans la foulée.
  - `supabase/functions/_shared/claudeClient.ts` — ajout de `generateContentDraft()` (Phase 2/3/4a
    partagent ce fichier, fonctions et prompts toujours séparés). Pas d'outil de recherche web ici
    (contrairement à Phase 3) — juste légende + accroche + script optionnel (uniquement si format vidéo).
  - `supabase/functions/phase4a-text/index.ts` — edge function admin-only qui **refuse de tourner si
    `brand_brief` est vide** sur le compte (sinon l'IA n'aurait aucune source fiable sur l'entreprise) et
    **si la stratégie référencée n'est pas `approved`** — deux portes bloquantes réelles, pas juste
    documentées.
  - `src/lib/phase4aTextStore.ts` (+ `updateBrandBrief()` ajoutée à `phase1AuditStore.ts`, puisque
    `brand_brief` vit sur `social_connections`) + nouveau bloc **"Brand brief"** (éditeur texte libre,
    juste avant l'historique Phase 1) et **"Phase 4a — Production texte"** (sous le bloc Phase 3, une
    entrée de calendrier à la fois avec bouton "Générer légende", affichage accroche/légende/script,
    boutons Approuver/Rejeter) dans `Admin.tsx`.
  - Vérifié : `npx tsc --noEmit`, `npx eslint`, `npm run test` : 0 erreur.
  - **Pas encore fait** : tests end-to-end réels (dépend des crédits Anthropic), **Phase 4b (production
    visuelle/vidéo)** — volontairement traitée à part : elle nécessite un vrai outil de
    traitement/génération image/vidéo non encore choisi (Claude seul ne le fait pas), donc une nouvelle
    décision d'architecture avec Russel avant de commencer, contrairement à 4a qui réutilisait le même
    schéma Claude déjà en place.
- **Phase 5 (Publication) — fondation posée et déployée, 2026-08-16.** Déclenchée par une question de
  Russel ("la plateforme doit aussi fonctionner comme un social media manager, publier aux heures
  propices...") — confirmé que c'était déjà exactement la Phase 5 du plan initial, rien d'oublié.
  Décision : fondations en mode mock (même logique que Zernio en Phase 1), pas d'attente d'un vrai accès
  Zernio pour poser la structure.
  - **Point important non résolu** : "publier aux heures propices en fonction de l'analyse" a besoin
    d'une vraie donnée d'activité d'audience — ni Phase 1 (ne collecte pas ce type de donnée
    actuellement) ni aucune autre source ne la fournit encore. Deux pistes possibles, aucune branchée :
    (1) si l'API Zernio expose des insights d'audience une fois un vrai compte en main, (2) la boucle
    Phase 7 → Phase 2 déjà prévue dans le plan (apprentissage empirique à partir des publications
    passées). Tant que ni l'une ni l'autre n'existe, la Phase 5 utilise une heure de programmation
    choisie manuellement par l'admin — jamais une heure "optimale" inventée par l'IA (conforme à la
    règle anti-hallucination générale du projet).
  - `supabase/functions/_shared/zernioClient.ts` — ajout de `publishPost()`, même pattern strict que
    `fetchAccountMetrics()` : sans `ZERNIO_API_KEY`, retourne un résultat factice clairement marqué
    (`isMock: true`, `platform_post_id` du type `mock_post_...`) ; avec la clé définie, lève une erreur
    explicite ("callRealZernioPublishApi non implémenté") plutôt que de deviner le contrat de l'API
    Zernio de publication (jamais vérifié contre une doc officielle).
  - `supabase/migrations/20260816133000_create_phase5_publication_tables.sql` — table
    `scheduled_publications` (le champ `content_snapshot` fige le contenu approuvé au moment de la
    planification ; la publication utilise toujours cette copie figée, jamais une relecture en direct de
    `content_drafts` — c'est ce qui applique structurellement la règle CLAUDE.md "aucune modification
    silencieuse entre validation et publication", pas juste une convention) + table `publication_log`
    (append-only, une entrée horodatée par transition d'état — règle CLAUDE.md "log horodaté de
    traçabilité"). RLS admin-only. Appliquée + edge function déployée dans la foulée.
  - `supabase/functions/phase5-publish/index.ts` — edge function admin-only à deux modes : (1)
    `content_draft_id` + `scheduled_at` → crée la planification à partir d'un brouillon Phase 4a
    **approuvé** (sinon refus), publie immédiatement si la date est passée/immédiate ; (2)
    `scheduled_publication_id` seul → exécute une planification existante maintenant. Pas de nouvelle
    porte de validation humaine ici (conforme au tableau CLAUDE.md Phase 5 : "Non") — l'approbation
    Phase 4a en amont suffit, cette fonction se contente de la vérifier.
  - **Limite assumée et documentée dans le code** : le mode (2) ("Publier maintenant") est un
    déclenchement manuel qui tient lieu de vrai planificateur — **aucun cron n'existe encore** pour
    exécuter automatiquement une publication programmée à une date future. Une planification future
    reste simplement en statut `scheduled` jusqu'à ce qu'un admin la déclenche manuellement, ou qu'une
    prochaine session ajoute une vraie exécution planifiée (pg_cron ou déclencheur externe — décision
    d'infrastructure à prendre avec Russel, pas supposée ici).
  - `src/lib/phase5PublishStore.ts` + nouveau bloc **"Phase 5 — Publication"** dans `Admin.tsx`, sous
    chaque brouillon Phase 4a approuvé : sélecteur date/heure + bouton "Planifier", liste des
    publications planifiées/publiées avec badge MOCK et bouton "Publier maintenant" pour celles en
    attente.
  - Vérifié : `npx tsc --noEmit`, `npx eslint`, `npm run test` : 0 erreur.
  - **Extension le même jour, en réponse à une précision de Russel** : "l'heure de publication peut être
    basée sur l'analyse de chaque réseau, l'audience, et les objectifs définis" + "programmation future
    modifiable/annulable" + "approbation par l'admin ou le compte ayant le droit". Trois ajouts :
    1. **Reprogrammer / Annuler** une `scheduled_publications` encore `scheduled` — nouveaux modes
       `action: "reschedule"` / `action: "cancel"` dans `phase5-publish/index.ts` (le contenu figé,
       `content_snapshot`, n'est jamais modifié par ces actions — seule l'heure change).
    2. **Suggestion d'horaire par l'IA** (`supabase/functions/phase5-suggest-time/index.ts` +
       `suggestPublishTime()` dans `claudeClient.ts`) — **purement consultative, n'écrit rien en base** :
       combine les données factuelles Phase 1 du compte + l'objectif/pilier Phase 3 de la publication +
       une vraie recherche web (`web_search_20260209`, même exigence de source horodatée qu'en Phase 3)
       sur les meilleures pratiques d'horaire par plateforme. Jamais d'heure "optimale" inventée : si les
       données/sources sont insuffisantes, la réponse marque `inconclusive=true` plutôt que de deviner.
       L'admin voit la suggestion à côté du sélecteur date/heure mais reste seul à décider — rien n'est
       pré-rempli automatiquement.
    - **"Approbation par le compte ayant le droit"** : pas construit — actuellement tout est admin-only
      (`is_admin()`), aucun rôle client/partenaire ne peut approuver quoi que ce soit dans ce panneau.
      Étendre les droits d'approbation à d'autres rôles (ex: partner) serait un chantier de permissions
      multi-tenant à part entière, pas supposé ici — à confirmer avec Russel si vraiment souhaité.
  - **Pas encore fait** : vrai planificateur automatique (pg_cron ou équivalent), approbation par rôle
    non-admin (si souhaitée), tests end-to-end réels (dépend toujours des crédits Anthropic + Zernio).
- **Phase 6 (Engagement) — fondation posée et déployée, 2026-08-16.** Construite en mode mock (comme
  Zernio partout ailleurs), sans attendre un vrai accès Zernio.
  - `supabase/functions/_shared/zernioClient.ts` — ajout de `fetchComments()`, même pattern mock que
    `fetchAccountMetrics()`/`publishPost()` : deux commentaires factices distincts en mode mock (un qui
    nécessite clairement une réponse, un qui n'en nécessite pas), pour vérifier facilement que le
    classificateur fonctionne.
  - `supabase/functions/_shared/claudeClient.ts` — `classifyEngagementItem()` : **aucun champ
    "réponse suggérée" n'existe nulle part dans son schéma** — seulement `needs_response` (booléen) +
    `rationale`. C'est structurel, pas juste documenté : impossible pour cette fonction de générer une
    réponse même si on le voulait, elle n'a jamais été conçue pour retourner ce genre de donnée.
    Conforme à la règle CLAUDE.md : "Aucune réponse n'est générée ni publiée automatiquement par
    l'agent, y compris pour les questions simples."
  - `supabase/functions/phase6-engagement/index.ts` — edge function admin-only qui récupère les
    commentaires/DMs (dédupliqués par `platform_comment_id`), les classe, et insère un
    `engagement_items` par nouvel élément. Pas de porte de validation humaine sur la détection elle-même
    (non exigée pour Phase 6) — la vraie porte, c'est qu'un humain doit rédiger et envoyer toute réponse
    lui-même, entièrement hors de cet outil.
  - `src/lib/phase6EngagementStore.ts` + nouveau bloc **"Phase 6 — Engagement"** dans `Admin.tsx` :
    bouton "Vérifier les commentaires", liste des éléments nécessitant une réponse mise en avant,
    bouton "Marquer comme traité" avec un champ de notes **qui ne sert qu'à l'admin, jamais envoyé
    nulle part**. Volontairement, aucun bouton "envoyer" n'existe dans cette UI.
- **Phase 7 (Analyse) — fondation posée et déployée, 2026-08-16.**
  - **Interprétation assumée, à corriger par Russel si besoin** : la règle CLAUDE.md demande une
    "comparaison performance prévue vs réelle", mais rien dans le système ne produit de chiffre prédit
    (les Phases 3/4a ne prévoient pas d'engagement). Plutôt que d'en inventer un, cette phase compare
    **deux vrais relevés Phase 1** du même compte (le plus ancien vs le plus récent par défaut) — les
    deux sont factuels, aucun n'est fabriqué.
  - `supabase/migrations/20260816153000_create_phase7_analysis_tables.sql` — table
    `performance_analyses`, pas de porte de validation humaine (conforme au tableau CLAUDE.md : "Non"
    pour Phase 7), append-only comme `audit_snapshots`.
  - `supabase/functions/phase7-analysis/index.ts` — **les écarts (deltas) sont calculés en code
    TypeScript, jamais par le modèle** (bonne pratique + respect de la règle "pas de ratio si une
    valeur manque" : un champ n'est comparé que si les deux côtés sont de vrais nombres, jamais si l'un
    des deux est `donnée_indisponible`). Claude ne fait que rédiger le résumé à partir des chiffres déjà
    calculés.
  - `supabase/functions/_shared/claudeClient.ts` — `analyzePerformance()` : le schéma structuré force
    deux champs obligatoires — `summary` (doit citer les chiffres précis, conforme CLAUDE.md) et
    `correlation_note` (distinction corrélation/causalité obligatoire, conforme CLAUDE.md) — impossible
    structurellement de produire une conclusion sans ces deux éléments.
  - `src/lib/phase7AnalysisStore.ts` + nouveau bloc **"Phase 7 — Analyse"** dans `Admin.tsx` : bouton
    "Analyser (1er vs dernier audit)", affichage du résumé + note de corrélation + tableau des écarts
    chiffrés par métrique.
  - Vérifié (Phase 6 + 7) : `npx tsc --noEmit`, `npx eslint`, `npm run test` : 0 erreur.
  - **Pas encore fait** : tests end-to-end réels (dépend toujours des crédits Anthropic + Zernio),
    validation de l'interprétation Phase 7 par Russel.
- **Phase 4b** : non commencée — en attente d'une décision d'outil de traitement image/vidéo avec
  Russel (Claude seul ne le fait pas).
- **Refonte de la navigation admin en sidebar — 2026-08-21.** Sans lien direct avec les 7 phases :
  Russel a partagé une capture d'écran d'un tableau de bord admin (incident.io — sidebar sombre à
  gauche avec icônes + libellés, zone de contenu blanche) comme référence, puis a explicitement choisi
  (via question à choix) de remplacer les onglets horizontaux existants de `src/pages/Admin.tsx` par
  cette disposition en sidebar plutôt que de garder les `Tabs`.
  - `src/components/ui/sidebar.tsx` (primitive shadcn déjà présente mais jusqu'ici inutilisée nulle
    part dans le code) a été légèrement modifié : le bloc desktop `fixed inset-y-0 ... md:flex` partait
    du tout haut de l'écran, ce qui l'aurait fait passer sous la `Navbar` globale fixe (`md:h-20`,
    montée par `App.tsx` autour de toutes les routes) et l'aurait rendu partiellement caché par son
    fond translucide. Corrigé en décalant ce bloc sous la navbar (`md:top-20` +
    `md:h-[calc(100svh-5rem)]`) — n'affecte que la variante desktop fixe ; le tiroir mobile (`Sheet`)
    n'est pas concerné. Aucun autre composant de ce fichier n'a été modifié.
  - `src/pages/Admin.tsx` : les 11 sections existantes (Mon compte, Témoignages, Médias/Portfolio,
    Gestion des Cours, Rôles & Utilisateurs, Audits & Prospects, Audit IA (Phase 1), Veille IA, Brief
    concurrentiel, Configuration Site, Contenu du site) sont conservées telles quelles, chacune avec le
    même composant/props qu'avant — seul le mécanisme de navigation change : un `useState<AdminSectionId>`
    remplace `<Tabs defaultValue>`, un tableau `ADMIN_SECTIONS` (id + libellé + icône lucide) pilote à la
    fois le rendu du menu (`SidebarMenu`/`SidebarMenuButton`, état actif surligné) et le rendu
    conditionnel du contenu (`{activeSection === "x" && <XAdmin/>}`, remplaçant `<TabsContent>` —
    comportement de montage/démontage identique à Radix `Tabs` par défaut, donc pas de régression sur
    les états locaux des sous-composants). Sidebar en mode `collapsible="icon"` (repliable en rail
    d'icônes via le bouton `SidebarTrigger`, toujours visible en haut du contenu) ; import `Tabs` retiré
    (devenu inutilisé).
  - Aucune nouvelle valeur de couleur nécessaire : les tokens `--sidebar-*` (fond sombre, accent orange
    de la marque) étaient déjà définis dans `src/index.css` et mappés dans `tailwind.config.ts` — probable
    reliquat du scaffold shadcn/Lovable initial, jamais utilisé jusqu'ici.
  - Vérifié : `npx tsc --noEmit -p tsconfig.app.json` et `npm run test` : 0 erreur. `npx eslint` ne
    signale que des erreurs `any`/`prefer-const` déjà présentes avant cette session, sur des lignes en
    dehors de tout ce qui a été touché ici (aucune régression introduite).
  - **Pas encore fait** : pas de vérification visuelle par Russel dans le navigateur à ce stade de la
    session (structure/build/tests vérifiés uniquement) ; pas de retouche du contenu interne de chaque
    section, seule la coquille de navigation a changé.
- **Bug corrigé — langue du site basculait en anglais tout seul, 2026-08-21.** Russel a signalé que le
  site passait en anglais alors qu'il navigue en français. Cause réelle trouvée dans
  `src/hooks/useLanguage.tsx` : en l'absence de préférence enregistrée (`gln_pref_lang` en
  localStorage), un effet au montage détectait `navigator.language` (langue du navigateur/Windows) et
  basculait silencieusement tout le site public en anglais si celle-ci n'était pas française —
  contrairement au comportement documenté ("French default, English toggle"). Résultat côté
  utilisateur : incohérence visible, puisque `src/pages/Admin.tsx` (texte français codé en dur, pas de
  `t()`) restait toujours en français pendant que le reste du site basculait tout seul. Corrigé en
  supprimant ce fallback : la langue ne bouge plus que via un choix explicite de l'utilisateur (le
  toggle FR/EN, qui écrit dans `gln_pref_lang`) — sinon le français reste la valeur par défaut, sans
  exception. Vérifié : `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint`, `npm run test` : 0 erreur.
- **Contenu anglais dans l'onglet "Veille IA" traduit, 2026-08-21.** Suite à une capture de Russel :
  l'onglet Veille IA (`CompetitiveIntelAdmin` dans `Admin.tsx`) affichait les fiches concurrentes
  (`src/lib/competitiveIntel.ts`, `defaultCompetitiveIntel` — fiches "Soro" et "Nuelink") entièrement en
  anglais, alors que tout le reste de l'admin (chrome de l'UI) est en français — incohérence distincte
  du bug de langue ci-dessus, cette fois c'est de la donnée, pas un bug de détection de langue.
  - Tout le texte narratif des deux fiches (`positioning`, `funnelSummary`, `pricingSignals`,
    `languageSupport`, `metricClaims`, `features[].name/description/glnOpportunity`, `gapsForGLN`,
    `glnCounterPositioning`, `category`) traduit en français, en préservant tous les chiffres/montants
    exactement (aucune donnée inventée — traduction fidèle uniquement). `id`, `productName`,
    `companyName`, `website`, `sourceUrls`, `scrapedAt`, et les noms de produits/plateformes dans
    `integrations` restent inchangés (identifiants/URLs/noms propres).
  - Deux enums techniques (`dataConfidence: "low"|"medium"|"high"` et `CompetitiveFeature["category"]:
    "seo"|"content"|...`) étaient affichés tels quels dans l'UI (ex : "Confiance: high"). Types
    inchangés (identifiants internes, pas utilisés ailleurs pour de la logique conditionnelle) ; ajout de
    deux tables de libellés FR exportées (`DATA_CONFIDENCE_LABELS`, `FEATURE_CATEGORY_LABELS`, même
    convention que `PLATFORM_LABELS` dans `phase1AuditStore.ts`), utilisées uniquement à l'affichage
    dans `Admin.tsx`.
  - Bug distinct corrigé au passage : le titre de bloc "Angles pour dépasser Soro" était codé en dur et
    s'affichait donc aussi sur la fiche Nuelink ; rendu dynamique (`Angles pour dépasser
    {profile.productName}`).
  - **Point d'attention pour Russel** : ces données par défaut sont mises en cache dans le
    `localStorage` du navigateur (`gln_competitive_intel_db`) dès le premier chargement de cet onglet —
    si tu l'as déjà ouvert avant cette session, ton navigateur a encore l'ancienne version anglaise en
    cache et la reverra tant que tu n'auras pas cliqué sur **"Recharger la veille"** (bouton déjà présent
    en haut de l'onglet, qui réécrit le cache avec les nouvelles données par défaut).
  - Vérifié : `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint`, `npm run test` : 0 erreur.
- **`index.html` — coquille par défaut Lovable jamais nettoyée, corrigée le 2026-08-22.** Trouvé via
  `/graphify` (une connexion "surprenante" `Lovable ↔ TODO: document title placeholder` remontée par le
  graphe de connaissance). `<html lang="en">` contredisait le défaut français du site (voir le bug de
  langue plus haut) ; `<title>`, `og:title`, `twitter:title`, `meta[name=author]` affichaient encore
  littéralement "Lovable App" — visible dans l'onglet du navigateur et dans l'aperçu de partage
  WhatsApp/Facebook/X du site. Corrigé en `lang="fr"` + "GLN Digital" partout ; `twitter:site` passé de
  `@Lovable` à `@glndigital` (vérifié comme le vrai handle X du site via `src/components/
  SocialLinks.tsx`, pas une invention). Les images `og:image`/`twitter:image` restent hébergées sur le
  bucket de stockage Lovable (`storage.googleapis.com/gpt-engineer-file-uploads/...`) — dépendance
  externe non résolue, à héberger sur le domaine GLN si Russel veut supprimer cette dépendance un jour.
  Vérifié : `npm run test` : 0 erreur (fichier HTML statique, pas de build TS concerné).

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

Une brique séparée de veille concurrentielle publicitaire (hors des 7 phases ci-dessus) est documentée
dans `DECISIONS-VEILLE-CONCURRENTIELLE.md`.
