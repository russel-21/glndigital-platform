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
  SocialLinks.tsx`, pas une invention).
  - **Découverte plus grave en creusant l'image `og:image`/`twitter:image`, corrigée le même jour** :
    l'image alors utilisée (hébergée sur le bucket Lovable `storage.googleapis.com/gpt-engineer-file-
    uploads/...`) n'était pas du tout une image GLN Digital — une bannière "VIVEZ L'EXPÉRIENCE DU LUXE"
    avec appartements/piscine/événementiel, visiblement un reliquat d'un tout autre projet (client
    immobilier/hôtelier ?) resté dans le scaffold Lovable. Concrètement : tout partage du site sur
    WhatsApp/Facebook/X affichait un aperçu totalement hors-sujet, sans rapport avec l'agence. Pas
    re-hébergée telle quelle (aurait figé le problème) — question posée à Russel, qui a choisi le logo
    GLN Digital comme image de partage. `src/assets/logo.png` copié vers `public/og-image.png` (les
    balises `og:image` ont besoin d'une URL statique servie telle quelle, pas d'un import JS/Vite comme
    `src/assets/`). Logo carré (1080×1080) utilisé tel quel plutôt que retaillé en bannière 1200×630 —
    accepté comme compromis rapide, pas une vraie bannière de partage conçue pour ce format.
  - Vérifié : `npm run test` et `npm run build` (build de prod complet) : 0 erreur, `dist/og-image.png`
    confirmé présent après build.
  - **Domaine `glndigital.com` — pas encore acheté, corrigé le 2026-08-22.** En creusant cette histoire
    d'image de partage, découvert que `src/components/ShareButtons.tsx` pointait en dur vers
    `https://glndigital.com` alors que ce domaine ne résout vers rien du tout (`nslookup` : domaine
    inexistant) — Russel a confirmé ne pas encore l'avoir acheté. Le site réellement en ligne aujourd'hui
    reste `glndigital-platform.vercel.app` (Vercel héberge le site ; Supabase n'a aucun rôle dans les
    noms de domaine — clarifié auprès de Russel, qui confondait les deux). `og:image`/`twitter:image`
    dans `index.html` et `shareUrl` dans `ShareButtons.tsx` pointent maintenant tous vers
    `https://glndigital-platform.vercel.app` en attendant l'achat du domaine. **À refaire une fois
    `glndigital.com` acheté et branché sur Vercel** : remettre ces deux références sur `glndigital.com`
    (Russel a été informé de la procédure : achat chez un registrar, puis Vercel → Settings → Domains).
- **Compte admin reconnecté + bug de navigation admin corrigé, 2026-08-22.** Russel avait oublié le mot
  de passe du compte `nonamecrewf7@gmail.com` — réinitialisé directement en SQL via
  `supabase db query --linked` (même méthode pgcrypto que la première fois ; confirmé au passage que ce
  compte reste le seul avec les rôles `admin`/`super_admin` en base). Nouveau mot de passe temporaire
  communiqué à Russel, à changer par lui via "Mon compte" dans l'admin.
  - **Bug réel découvert en le guidant vers "Mon compte"** : capture d'écran de Russel montrant qu'après
    connexion, le menu déroulant du compte (Navbar) ne propose **aucun lien vers `/admin`** — seulement
    "Mon Tableau de bord" (qui pointe toujours vers `/eleve-dashboard`, sauf si `current_role ===
    'partner'`) et les bascules Élève/Partenaire. Un compte `admin`/`super_admin` connecté atterrissait
    donc sur le dashboard élève ("Espace Connecté") sans aucun moyen, depuis la Navbar, de rejoindre le
    panneau admin — `current_role` n'était tout simplement pas géré dans ce ternaire.
  - Corrigé dans `src/components/Navbar.tsx` (menu desktop ET menu mobile, les deux dupliquaient le même
    bug) : ajout d'un lien distinct **"Panneau d'administration"** (icône `ShieldAlert`) vers `/admin`,
    affiché uniquement si `profile.roles` contient `admin` ou `super_admin` — sans toucher au lien
    existant "Mon Tableau de bord" (toujours utile pour basculer vers l'espace élève/partenaire).
  - Vérifié : `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint`, `npm run test` : 0 erreur (les
    erreurs `any` restantes dans `Navbar.tsx` sont préexistantes, mêmes lignes qu'avant).
- **Découverte majeure — `main` avait 19 commits de retard, jamais déployé en prod, corrigé le
  2026-08-22.** En cherchant pourquoi Russel ne voyait aucun des changements de ce soir sur
  `glndigital-platform.vercel.app`, découvert via `git log main..phase1-audit-admin-ui` que tout le
  travail de cette session (et probablement des précédentes) vivait uniquement sur la branche
  `phase1-audit-admin-ui`, jamais fusionné dans `main`. Russel a confirmé sur son dashboard Vercel que
  **`main` est la "Production Branch"** configurée — donc le site public tournait sur du code vieux de
  plusieurs jours, sans aucune des 7 phases, sans la sidebar, sans les correctifs récents. Fusion
  fast-forward (`git merge phase1-audit-admin-ui --ff-only`, aucun commit divergent sur `main`) puis
  `git push origin main` — nouveau déploiement Vercel confirmé réussi (`lang="fr"` et `<title>GLN
  Digital</title>` vérifiés en direct sur le site après déploiement). **À partir de maintenant, continuer
  à pousser sur `phase1-audit-admin-ui` ET fusionner régulièrement dans `main`** (ou directement
  travailler sur `main`) pour que la production reste à jour — ne pas répéter cet écart.
- **`ZERNIO_API_KEY` configurée, vrai connecteur Phase 1 implémenté, 2026-08-22.** Russel a créé un
  compte Zernio (palier gratuit "usage-based pricing", $12 de crédit offert), configuré la clé dans les
  secrets Supabase, et connecté sa page Facebook "GLN Digital" via OAuth (0 → 1 compte connecté).
  - **Doc officielle Zernio enfin en main** : `docs.zernio.com/api/openapi` (spec OpenAPI complète,
    2,2 Mo, lue en entier via `WebFetch` puis grep/Read direct sur le fichier brut plutôt que le résumé
    tronqué du modèle rapide de `WebFetch`) — confirme base URL `https://zernio.com/api`, auth
    `Authorization: Bearer <clé>`, et les endpoints d'analytics par plateforme
    (`/v1/analytics/{facebook|instagram|tiktok|youtube}/...`) + `/v1/accounts/follower-stats`.
  - `supabase/functions/_shared/zernioClient.ts` : `callRealZernioApi()` (utilisé par
    `fetchAccountMetrics()`, Phase 1) implémenté pour de vrai — combine `follower-stats` (abonnés,
    following, posts selon la plateforme) et l'endpoint d'analytics propre à chaque plateforme (mappé
    dans `platform_specific`, jamais transformé en ratio/moyenne — ni `engagement_rate` ni
    `avg_likes_per_post` ne sont calculés, l'API Zernio ne renvoie que des compteurs agrégés, pas de
    quoi calculer ça honnêtement). Champs que Zernio n'expose tout simplement pas pour ces 4 plateformes
    (`bio_text`, `verified`, `account_created_at`, `last_post_at`) restent `donnée_indisponible` — vérifié
    dans la spec, pas une lacune du code. Nouvelle classe `ZernioApiError` (distincte de
    `ZernioNotConfiguredError`) pour différencier "Zernio a répondu une erreur réelle" de "cette fonction
    n'est pas codée".
  - **`publishPost()` (Phase 5) et `fetchComments()` (Phase 6) restent NON implémentées** — leurs
    endpoints n'ont pas encore été vérifiés dans la spec, même règle anti-hallucination que pour Phase 1
    avant aujourd'hui. À faire au fur et à mesure, même méthode (lire la spec, jamais deviner).
  - Les 3 edge functions qui importent `zernioClient.ts` (`phase1-audit`, `phase5-publish`,
    `phase6-engagement`) redéployées (`supabase functions deploy`, `db push` seul ne suffit jamais pour
    du code d'edge function).
  - Vérifié : `npx eslint supabase/functions/_shared/zernioClient.ts` : 0 erreur.
  - **Test réel effectué le jour même** : `zernio_account_id` récupéré depuis l'URL du dashboard Zernio
    (paramètre `accountId`, à ne pas confondre avec `profileId` — erreur faite une première fois, cause
    exacte du premier échec "Account not found", corrigée directement en base). Audit Phase 1 relancé
    avec succès : source `zernio:meta_facebook` (plus de badge MOCK), `followers_count: 0` — vérifié
    honnête, pas un bug : le dashboard Zernio lui-même affiche encore `Total followers: 0` / `No posts
    yet` pour ce compte tout juste connecté (`Last sync: 24m ago`, sync quotidienne pas encore passée).
    `posts_count`/`engagement_rate`/`last_post_at` à `donnée_indisponible` confirmés conformes (Zernio
    n'expose vraiment pas ces champs pour Facebook, pas un mapping manquant).
- **Google Ads API — configuration partielle, bloquée sur le Refresh Token, 2026-08-28.** Décision prise
  avec Russel : Zernio suffit pour l'instant (Phases 1/5/6), Google Ads (recherche de mots-clés, hors des
  7 phases) mis de côté en attendant une session ultérieure.
  - **Acquis et sauvegardé, ne pas refaire** :
    - Projet Google Cloud `gln-digital-marketing-01` créé (le projet auto-généré initial,
      `river-woodland-433622-u6`, était inutilisable — sa Console web renvoyait systématiquement
      "Échec du chargement : projet non valide" sur toute page, y compris sur un projet flambant neuf ;
      cause isolée à une des deux connexions réseau de Russel, jamais identifiée précisément —
      contournée en travaillant via le partage de connexion 4G de son téléphone).
    - API Google Ads activée sur `gln-digital-marketing-01` (`gcloud services enable
      googleads.googleapis.com`, exécuté avec succès via Cloud Shell — contourne la Console web cassée).
    - Écran de consentement OAuth configuré (type "External", app "GLN Digital").
    - Client OAuth créé — **doit être de type "Application Web"**, pas "Application de bureau" (le
      premier essai, en "bureau", a échoué avec `Error 400: redirect_uri_mismatch` : OAuth Playground a
      besoin d'une URI de redirection personnalisée, impossible à définir sur un client "bureau").
      Redirection autorisée : `https://developers.google.com/oauthplayground`. `GOOGLE_ADS_CLIENT_ID` /
      `GOOGLE_ADS_CLIENT_SECRET` (les valeurs du client Web, pas celles du client bureau abandonné) déjà
      sauvegardés dans les secrets Supabase.
  - **Bloqué sur** : la récupération du `GOOGLE_ADS_REFRESH_TOKEN` via OAuth Playground. Le compte
    Google de Russel déclenche une vérification de sécurité renforcée ("reauth") à cette étape,
    systématiquement via une clé d'accès (passkey) qui échoue — testé sans succès depuis son téléphone
    (Galaxy S9, passkey auto-créée par Android introuvable au moment de l'authentification) et depuis
    son PC (Windows Hello via PIN, existant, mais la création de clé d'accès elle-même a fini sur une
    erreur serveur Google brute : `400` sur l'endpoint interne `bless-authentication-factor`, avec le
    message Google "Nous vous recommandons de ne pas réessayer" — probablement transitoire côté Google,
    pas quelque chose à corriger ici). Piste non essayée : cliquer "Autres méthodes de validation" sur
    l'écran de vérification lui-même pour choisir explicitement "mot de passe" plutôt que de suivre la
    proposition de clé d'accès — à tenter en premier à la prochaine reprise, avant de recréer quoi que
    ce soit.
  - **Pour reprendre plus tard** : relancer OAuth Playground avec le Client Web déjà sauvegardé (pas
    besoin de recréer le projet, l'API, l'écran de consentement, ni le client OAuth), scope
    `https://www.googleapis.com/auth/adwords`, et gérer l'étape de vérification différemment (mot de
    passe si proposé, ou réessayer après quelques heures si l'erreur serveur Google persiste).
- **Phase 4b (Production visuelle/vidéo) — fondation posée, 2026-08-28.** Après Canva (Autofill limité
  à Enterprise, pas d'API pour l'amélioration image/vidéo) et CapCut (pas d'API officielle, seulement
  des libs communautaires rétro-ingénierées — écartées explicitement, contraires à la règle "pas de
  contournement" de ce projet) écartés en creusant leurs vraies capacités API, décision prise avec
  Russel : **RunPod** (location de GPU à la demande, facturation à la seconde) comme backend de calcul,
  après diagnostic confirmant l'absence de GPU dédié sur sa machine (Intel Iris Xe intégré uniquement).
  RTX 4090 (0,69$/h) choisi. **Pas d'essai gratuit réel chez RunPod** — vérifié sur leur page tarifs
  officielle, aucun crédit offert sans dépôt réel d'au moins 10$ au préalable (contrairement à
  Zernio/Anthropic).
  - **Architecture** : RunPod Serverless (scale-to-zero natif — pas de mécanisme d'extinction à coder,
    c'est structurel à RunPod, seul un `policy.executionTimeout` est réglé par ce code pour tuer un
    worker bloqué). Flux asynchrone confirmé avec Russel : soumission → statut "en traitement" → la
    fiche du job poll `phase4b-process` (mode `check_status`) toutes les 4s côté admin (aucun webhook/
    cron — même choix que pour Phase 5, pas d'infrastructure de planification inventée sans validation).
  - **Décision technique documentée, pas devinée** : le worker RunPod ne fait *pas* d'upload direct vers
    Supabase Storage (le contrat HTTP brut des "signed upload URLs" Supabase n'est pas assez documenté
    publiquement pour l'implémenter sans deviner — aurait violé la règle anti-hallucination). À la
    place, le worker renvoie le fichier traité en base64 dans sa propre réponse RunPod, et c'est
    `phase4b-process` (avec son client Supabase déjà authentifié) qui fait l'upload final — évite aussi
    d'envoyer des identifiants Supabase à un service tiers. Limite connue : moins efficace pour de gros
    fichiers vidéo (base64 = +33% de volume) — à revoir plus tard si ça pose problème en pratique.
  - **Substitution documentée** : le cahier des charges nommait "Video2X" pour l'amélioration vidéo —
    son contrat CLI/Python exact n'a pas pu être vérifié contre une source faisant autorité. Remplacé
    par extraction d'images (ffmpeg) + Real-ESRGAN image par image + réencodage — une des stratégies
    réelles de Video2X en interne, donc une substitution raisonnée, pas un raccourci silencieux. `Real-
    ESRGAN` lui-même est le vrai paquet officiel (`xinntao/Real-ESRGAN`), poids `RealESRGAN_x4plus.pth`
    téléchargés depuis leur release GitHub officielle au build de l'image Docker.
  - **`video_highlights` refuse explicitement de deviner quels moments garder** — nécessite des plages
    de temps explicites (JSON) dans `instructions`, pas de logique de "meilleur moment" inventée dans ce
    worker (cette décision revient à l'agent Claude côté Phase 2/4a de la pipeline, pas à ce worker GPU,
    conforme au découpage strict des 7 phases).
  - Créés : migration `20260828120000_create_phase4b_visual_tables.sql` (table `phase4b_visual_jobs`,
    bucket Storage privé `phase4b-media`, RLS admin-only, vraie porte de validation humaine
    `review_status` — conforme CLAUDE.md "Validation humaine requise : Oui" pour Phase 4b) ; `supabase/
    functions/_shared/runpodClient.ts` (contrat RunPod vérifié le jour même contre leur doc officielle,
    mode mock identique au reste du projet quand `RUNPOD_API_KEY`/`RUNPOD_ENDPOINT_ID` absents) ;
    edge function `phase4b-process` (mode création+soumission et mode vérification de statut) ; `src/
    lib/phase4bVisualStore.ts` + panneau `Phase4bVisualPanel` dans `Admin.tsx` (polling client toutes
    les 4s pendant qu'un job est "processing"). Migration poussée, types régénérés, edge function
    déployée. `runpod-worker/` (nouveau dossier racine, hors `supabase/` — ce n'est pas une edge
    function mais une image Docker autonome à déployer sur RunPod) : `handler.py`, `realesrgan_infer.py`,
    `Dockerfile`, `requirements.txt`, `README.md` (procédure de déploiement complète pour Russel).
  - Vérifié : `npx tsc --noEmit -p tsconfig.app.json`, `npm run test` : 0 erreur. `npx eslint` : les
    erreurs `any` déjà présentes partout ailleurs dans `Admin.tsx` restent, plus deux nouvelles sur les
    mêmes lignes `onError: (err: any) =>` que suit tout le reste du fichier (pas une régression, une
    convention déjà tolérée dans ce fichier, honnêtement pas "zéro nouvelle ligne" cette fois).
  - **Pas encore fait / risques connus, documentés explicitement (pas cachés)** : l'image Docker du
    worker n'a **jamais été construite ni testée réellement** (pas de compte RunPod ni de GPU disponible
    dans cette session) — un risque de compatibilité connu entre `basicsr` et `torchvision` est
    documenté en commentaire dans le `Dockerfile`, à vérifier au premier vrai build. Russel doit encore :
    créer son compte RunPod, construire et publier l'image Docker (voir `runpod-worker/README.md`),
    créer le Serverless Endpoint, configurer `RUNPOD_API_KEY`/`RUNPOD_ENDPOINT_ID` dans Supabase. Tant
    que ça n'est pas fait, Phase 4b tourne entièrement en mode mock (aucun fichier de sortie produit,
    badge MOCK affiché).
  - **Accès MCP RunPod direct pour Claude Code + tentative de déploiement, 2026-08-29.** Russel a
    configuré un serveur MCP RunPod dans Claude Code (distinct du secret `RUNPOD_API_KEY` de
    `phase4b-process` — les deux utilisent la même clé RunPod mais dans deux contextes séparés : l'un
    laisse Claude Code gérer l'infra RunPod directement depuis les sessions, l'autre est lu par l'edge
    function au runtime). Accès confirmé fonctionnel (`list-endpoints`/`get-billing` répondent sans
    erreur d'auth).
    - **Piste explorée pour éviter d'attendre le build Docker custom** : le RunPod Hub héberge déjà un
      worker serverless prêt à l'emploi pour l'amélioration de qualité d'image —
      [`ashleykleynhans/runpod-worker-real-esrgan`](https://github.com/ashleykleynhans/runpod-worker-real-esrgan)
      (354 déploiements, image déjà construite/publiée). Contrat API vérifié contre son vrai
      `README.md` (pas de résumé approximatif) : requête `{"input": {"source_image": "<base64>",
      "model": "RealESRGAN_x4plus"|"RealESRGAN_x2plus"|"RealESRNet_x4plus"|"RealESRGAN_x4plus_anime_6B",
      "scale": <int>, "face_enhance": <bool>}}`, réponse `{"output": {"status": "ok", "image":
      "<base64>"}}`. Ne couvrirait que la fonction "amélioration d'image" des 4 prévues en Phase 4b (pas
      synthèse vidéo/montage/création de visuels) — proposé à Russel comme complément du worker custom,
      pas un remplacement, et **validé par lui** (question à choix, réponse "Oui, déploie-le").
    - **Déploiement tenté et bloqué** : `deploy-hub-repo` (repo `ashleykleynhans/runpod-worker-real-esrgan`,
      nommé `gln-phase4b-real-esrgan`, scale-to-zero) a échoué avec une erreur RunPod explicite : *"You
      must have at least $0.01 in your account balance to create an endpoint"*. Confirme que **le compte
      RunPod de Russel a un solde à 0$** — aucun endpoint (custom ou Hub) ne peut être créé avant un vrai
      dépôt, quelle que soit la piste choisie. C'est donc la seule étape réellement bloquante restante.
    - **Prix RTX 4090 serverless vérifié le jour même** : 1,10$/h (pas 0,69$/h comme noté au 28/08 — les
      tarifs RunPod ont dû bouger depuis ; secure cloud 0,74$/h, community cloud 0,34$/h).
    - **Pour reprendre** : dès que Russel a déposé des fonds sur RunPod, relancer le même appel
      `deploy-hub-repo` (déjà validé, il ne manquait que le solde) pour avoir un Endpoint Real-ESRGAN
      fonctionnel en un appel, puis lancer un job de test dessus avant de brancher `runpodClient.ts`
      dessus. Le worker custom (`runpod-worker/`) reste nécessaire pour les 3 autres fonctions Phase 4b
      et suit toujours son propre chemin (build Docker + publication par Russel, jamais tenté réellement).
- **Revue complétude + sécurité complète, puis exécution point par point, 2026-08-31.** Sur demande de
  Russel : audit de tout ce qui restait hors Zernio/RunPod, avec un vrai passage sur le code (RLS de
  toutes les migrations, les 11 edge functions, `vercel.json`, `robots.txt`, `.env`, `npm audit`,
  `AuthCallback.tsx`/`Auth.tsx`/`Navbar.tsx`), pas une simple relecture de ce fichier. Plan d'exécution
  validé via Plan Mode (4 questions à choix posées à Russel avant de figer le plan), puis exécuté
  intégralement dans la même session.
  - **🚨 Découverte critique, corrigée** : `public/robots.txt` (`User-agent: * / Disallow: /`) et
    `vercel.json` (en-tête `X-Robots-Tag: noindex` appliqué globalement à `/(.*)`, pas seulement aux
    routes sensibles comme documenté) bloquaient **tous** les moteurs de recherche sur **tout** le site
    public — vérifié en direct sur `glndigital-platform.vercel.app` avant et après correction
    (`curl` sur `/robots.txt` et les en-têtes de `/`). Probablement un réglage jamais revu depuis une
    phase "site pas encore prêt". Les blocs spécifiques aux bots d'IA (GPTBot, ClaudeBot, etc.) et le
    `X-Robots-Tag` sur `/admin`, `/audit/rapport/*` restent inchangés (+ ajout de `/eleve-dashboard`,
    `/partenaires-dashboard`, `/auth-callback`, qui en manquaient).
  - **Suppression complète du système d'authentification "mock" par `localStorage`** (décision de
    Russel via question à choix : suppression totale, pas juste le code mort) — reliquat du prototype
    Lovable d'avant l'intégration Supabase réelle, présent dans 9 fichiers (`Navbar.tsx`, `Auth.tsx`,
    `AuthCallback.tsx`, `Admin.tsx`, `DashboardEleve.tsx`, `DashboardPartenaire.tsx`, `Index.tsx`,
    `Contact.tsx`, `AuditPage.tsx`). Incluait un bypass admin par email magique/`if (false && ...)`
    déjà neutralisé mais toujours présent dans le code (`isSuperAdminEmail`, `__disabled_admin_mock__`),
    un faux profil admin (`admin-mock-id-...`, email `russel@glndigital.com` en dur) affiché dans la
    Navbar sans aucune vérification serveur, et un système de "custom users" `usr-*` entièrement
    local dans `Admin.tsx` → Rôles & Utilisateurs (celui-ci volontairement **laissé en place**, hors du
    périmètre explicitement approuvé — signalé à Russel comme découverte à trancher séparément).
    Vérifié structurellement avant suppression : le vrai portail `Admin.tsx` (`checkAdminAccess`) n'a
    jamais fait confiance à ce système mock — il interroge toujours réellement Supabase — donc aucune
    régression de sécurité n'était en jeu, seulement de la dette/confusion.
  - **Durcissement config** : `.env` retiré du suivi Git (`git rm --cached`, fichier local conservé —
    n'était de toute façon jamais lu par l'app, `client.ts` code ses valeurs en dur) ; CORS des 11 edge
    functions passé de `Access-Control-Allow-Origin: *` statique à une allowlist d'origine
    (`_shared/cors.ts` → `getCorsHeaders(req)`, même motif répliqué dans chaque `index.ts`) ; ajout d'un
    en-tête CSP dans `vercel.json` (`script-src`/`connect-src`/`frame-src` scopés à Supabase + Microlink/
    AllOrigins + Cloudflare Turnstile, vérifiés comme les seules ressources externes réelles du site) ;
    `npm audit fix` appliqué pour le sous-ensemble sûr (7 des 11 vulnérabilités, toutes dans des
    dépendances de build) — les 4 restantes (bump majeur Vite 5→8, et React Router v6→v7 — pas juste un
    patch comme le laissait supposer `npm audit`) demandent leur propre passage de tests dédié, pas
    forcées ici.
  - **Formulaire public "Audit gratuit" protégé par Cloudflare Turnstile** (décision de Russel :
    Turnstile plutôt qu'une simple limite de fréquence). Nouvelle edge function
    `submit-audit-request` : vérifie le token Turnstile côté serveur, puis insère via `service_role` —
    **seule exception assumée et documentée** à la règle "jamais de service_role" de ce projet, parce
    qu'un visiteur public anonyme n'a par définition aucun JWT pour que la RLS tranche à sa place.
    Nouvelle migration `20260831140000` : suppression de la policy `"Anyone can submit audit requests"`
    (l'insertion directe anonyme est fermée — sinon un bot aurait pu contourner Turnstile en appelant
    l'API Supabase directement). `VITE_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` non configurées —
    même convention que Zernio/Anthropic/RunPod : vérification simplement sautée (jamais simulée comme
    réussie) tant que Russel n'a pas créé de compte Cloudflare.
  - **Rate limiting ajouté sur les 9 edge functions payantes** (Phase 1-7, hors Zernio publish/comments
    déjà couverts) : nouvelle table partagée `edge_function_rate_limits` +
    `_shared/rateLimit.ts` (`checkRateLimit()`), cooldown de 2 minutes par ressource (clé namespacée par
    fonction, ex. `phase1-audit:<social_connection_id>`) — table unique partagée plutôt que réutiliser
    9 tables aux schémas différents comme envisagé initialement dans le plan (plus simple, moins
    d'erreurs). Pour `phase4b-process` (mode `check_status` exclu) et `phase5-publish` (limite posée
    dans `executePublish()`, pas au niveau des 4 modes de la fonction — seul le mode qui appelle
    vraiment Zernio compte).
  - **Explicitement reporté** (décisions de Russel via questions à choix, pas des oublis) : planificateur
    `pg_cron` pour la Phase 5, approbation par un rôle non-admin (`partner`) en Phase 5, refactor de
    `Admin.tsx` (5.6k lignes — jugé trop risqué pour être bundlé dans cette session, proposé comme
    session dédiée séparée).
  - Vérifié à chaque étape : `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint` (sur l'ensemble du
    projet, pas seulement les fichiers touchés), `npm run test`, `npm run build` — 0 nouvelle erreur (les
    `any`/`prefer-const` restants sont tous préexistants, vérifiés ligne par ligne). Les 2 migrations
    poussées (`supabase db push`), les 12 edge functions touchées/nouvelles redéployées, types
    régénérés, fusionné dans `main` et poussé sur GitHub — déploiement Vercel confirmé en observant le
    changement réel de `robots.txt`/en-têtes en direct après coup (pas supposé).
  - **Pas encore fait** : compte Cloudflare Turnstile (bloque Phase D en usage réel), upgrade Vite/React
    Router (nécessite sa propre session de tests), décision sur le système `usr-*` de faux utilisateurs
    dans `Admin.tsx`, vérification visuelle manuelle du rendu du site par Russel après l'ajout de la CSP
    (build/déploiement vérifiés, mais pas un clic-par-clic humain dans le navigateur).
- **Les 3 découvertes ci-dessus corrigées à la demande de Russel, 2026-08-31 (suite directe).**
  - Système `usr-*` de faux utilisateurs (Admin.tsx → Rôles & Utilisateurs) supprimé entièrement —
    n'a jamais créé de vrai compte Supabase capable de se connecter, uniquement une ligne
    décorative dans la liste admin ; la création de compte reste uniquement via `/auth`. Au passage,
    `handleDeleteUser`/`handleSaveEditUser` ne masquent plus un échec RLS réel derrière un faux succès
    local — la RLS admin-only fonctionne réellement maintenant (durcie depuis le 09/08), ce filet de
    secours n'avait plus de raison d'être.
  - Bug `Auth.tsx` corrigé : un `const userRole = "visiteur"` local masquait le state `userRole`
    (jamais relié à un vrai sélecteur dans le formulaire) — tout nouvel inscrit recevait
    `current_role: "visiteur"`, une valeur qu'aucune redirection ne reconnaît, et atterrissait
    silencieusement sur la page d'accueil au lieu de son tableau de bord élève. Corrigé en `"student"`
    (le vrai défaut partout ailleurs dans ce projet) ; le state mort `userRole`/`setUserRole` retiré.
  - `npm audit` : 0 vulnérabilité restante. `react-router-dom` 6.30→7.18.3, `vite` 5.4→8.2.2, `vitest`
    3.2→4.1.11, `@vitejs/plugin-react-swc`→4.3.3, `lovable-tagger`→1.3.3 (la version qui déclare
    vraiment supporter vite 8 — la `^1.1.13` installée ne le faisait pas, remontée par un warning
    ERESOLVE au moment du bump). `__dirname` remplacé par `import.meta.dirname` dans
    `vite.config.ts`/`vitest.config.ts` (warning de compatibilité future de Vite).
  - **Vérification allant au-delà du build** : lancement réel du serveur de dev + passage Playwright
    (Chromium headless) sur `/`, `/auth`, `/audit`, `/a-propos` + un clic réel sur un `<Link>` pour
    confirmer la navigation côté client (le point que React Router v7 aurait pu casser). A nécessité de
    neutraliser localement les signaux détectés par `src/lib/antiScraping.ts` (`navigator.webdriver`,
    `userAgentData.brands`, etc.) — uniquement dans ce script de QA jetable (jamais committé) ; le garde
    anti-bot du site n'a pas été touché et continue de fonctionner normalement en prod. Les 4 pages ont
    rendu leur vrai contenu, 0 erreur console, navigation confirmée fonctionnelle. Captures d'écran
    consultées visuellement, pas seulement le texte extrait.
  - Vérifié : `npx tsc --noEmit`, `npx eslint` (aucune nouvelle erreur), `npm run test`, `npm run build`,
    `npm audit` (0). Fusionné dans `main` et poussé sur GitHub.
- **Nouveau rôle "client" + devis de coût avant exécution, 2026-08-31 (suite directe).** Déclenché par
  une remarque de Russel : la plateforme n'avait que 3 profils (élève/partenaire/admin) — un client dont
  GLN gère les réseaux sociaux n'avait aucun moyen de se connecter, soumettre son compte, ou voir/valider
  quoi que ce soit. Toute la pipeline 7 phases vivait exclusivement dans `/admin`. Cadrage en Plan Mode
  (2 séries de questions à choix), plan approuvé, exécuté dans la foulée.
  - **Rôle client réel** : sélecteur ajouté au formulaire `/auth` existant (`src/pages/Auth.tsx`) et à
    l'écran de complétion de profil Google OAuth (`src/pages/AuthCallback.tsx` — au passage, même bug
    "visiteur" que Auth.tsx y avait été trouvé et corrigé, jamais capturé par la session précédente
    puisque limitée à Auth.tsx). `Navbar.tsx` route désormais `current_role === "client"` vers
    `/client-dashboard` (nouvelle table `ROLE_DASHBOARDS` centralisant les 4 endroits qui dupliquaient
    cette logique en ternaires).
  - **`social_connections.client_profile_id` existait déjà** (posé dès la migration Phase 1, jamais
    utilisé) — RLS ajoutée dessus + sur `audit_snapshots`, `diagnostics`, `content_strategies`,
    `content_drafts`, `phase4b_visual_jobs`, `scheduled_publications`, `publication_log`,
    `engagement_items`, `performance_analyses`, `diagnostic_screenshots` (table + bucket Storage) :
    lecture scopée au client propriétaire partout, écriture (approbation) uniquement sur
    `content_strategies`/`content_drafts` (Phase 3/4a) — décision explicite de Russel, 4b/5/6 restent
    lecture seule pour lui.
  - **Vraie connexion OAuth Zernio** (jamais construite jusqu'ici — `zernio_account_id` restait toujours
    `null`) : nouvelle edge function `zernio-connect` (JWT client, pas admin-only — premier cas dans ce
    projet). Doc Zernio relue en entier pour trouver le bon mécanisme : un "Profile" Zernio
    (`POST /v1/profiles`, cloisonnement par client, distinct de la table `profiles` de GLN) +
    `GET /v1/connect/{platform}` en mode standard (Zernio héberge lui-même la sélection de page/compte,
    redirige ensuite avec le résultat — pas d'échange de code côté serveur nécessaire pour ce mode).
    `createZernioProfile()`/`getZernioConnectUrl()` ajoutées à `zernioClient.ts`. `ALLOWED_ORIGINS`
    exporté de `cors.ts` pour construire un `redirect_url` de confiance (jamais fourni par le client, pour
    éviter un open-redirect).
  - **Phase 2/3/4a désormais déclenchables par le client lui-même** (pas seulement approuvables) sur son
    propre compte, en plus d'admin — nouveau helper partagé `_shared/authScope.ts`
    (`checkAdminOrOwningClient`) réutilisé dans les 3 edge functions concernées, dont le check
    `is_admin()`-only remonte à leur toute première version. RLS Storage ajoutée sur
    `diagnostic-screenshots` (chemin `${social_connection_id}/...`, scopé via
    `storage.foldername(name)[1]`) pour que le client puisse uploader ses propres captures — condition
    obligatoire de la Phase 2 (CLAUDE.md : pas de diagnostic sans capture).
  - **Phase 4b volontairement laissée déclenchable uniquement par l'admin pour cette passe** (le client
    la voit en lecture seule) — alors que le plan approuvé la mentionnait comme quotable/déclenchable par
    le client ("production visuelle"). Décision de réduction de portée assumée en cours d'exécution (pas
    silencieuse : signalée à Russel) pour ne pas ajouter un 4e edge function à ré-ouvrir + une RLS Storage
    supplémentaire sur `phase4b-media` dans une session déjà très chargée — à construire dans une passe
    dédiée si Russel le souhaite. Les lignes de tarification `phase4b_visual_*` existent déjà dans
    `phase_pricing_config`, prêtes pour ce jour-là.
  - **Devis de coût avant exécution** (nouvelle exigence de Russel apparue en cours de cadrage : "pour
    soulager mes charges") : uniquement Claude + RunPod, pas Zernio — **vérifié sur la vraie page tarifs
    Zernio** (zernio.com/pricing) que leur facturation est mensuelle par compte connecté (6$/mois en
    dessous de 10 comptes, dégressif), pas par appel, donc structurellement hors du mécanisme d'un devis
    "par action" (décision explicite de Russel de le laisser hors mécanisme plutôt que de le forcer dedans
    artificiellement). Tarifs Claude Sonnet 5 (2$/10$ par million de tokens) vérifiés via le skill
    `claude-api`, pas depuis la mémoire du modèle. Tarif RunPod (1,10$/h RTX 4090) déjà vérifié en direct
    la veille via le MCP RunPod.
    - Nouvelle table `phase_pricing_config` : hypothèses de consommation typique par type d'action —
      **explicitement labellisées comme des estimations de départ, pas des mesures**, puisqu'aucune phase
      n'a encore tourné en conditions réelles (toujours bloqué sur crédits Anthropic/dépôt RunPod). Une
      marge (30% par défaut) éditable par l'admin.
    - Nouvelle table `client_action_quotes` : un devis loggé par action proposée, `accepted_at` posé par
      le client lui-même avant que la vraie fonction de phase soit appelée, `actual_cost_usd`/
      `actual_usage` renseignés après coup par un mécanisme de rapprochement best-effort
      (`_shared/quoteReconciliation.ts`, `extractClaudeUsage()`/`reconcileActionQuote()`) — les 6
      fonctions Claude (`claudeClient.ts`) exposaient déjà `raw_response: response` (donc `.usage`) sans
      qu'aucun code n'y touche jusqu'ici ; RunPod expose `executionTime` (ms) dans sa réponse `/status`,
      jamais vérifié en conditions réelles vu qu'aucun job réel n'a encore tourné. Objectif : que les
      estimations de départ se rapprochent de la réalité avec le temps, même logique que la boucle
      Phase 7 → Phase 2 déjà prévue dans le cahier des charges d'origine.
  - Nouvelle page `src/pages/DashboardClient.tsx` : connexion de compte, brief de marque (le client peut
    désormais éditer le sien, `updateBrandBrief()` déjà écrite pour l'admin), les 7 phases en lecture,
    déclenchement + devis pour Phase 2/3/4a, approbation Phase 3/4a. Réutilise entièrement les stores déjà
    écrits pour `Admin.tsx` (`phase1AuditStore.ts` → `phase7AnalysisStore.ts`) — aucune nouvelle couche de
    données, seule la RLS déterminait qui pouvait lire/écrire quoi.
  - **Vérification allant au-delà du build** : `npx tsc --noEmit`, `npx eslint` (0 nouvelle erreur, même
    total qu'avant sur les erreurs `any` préexistantes), `npm run test`, `npm run build` — plus un vrai
    passage Playwright (même neutralisation ponctuelle du garde anti-bot que la fois précédente,
    jamais committée) confirmant que le sélecteur de rôle s'affiche et fonctionne sur `/auth`, et que
    `/client-dashboard` renvoie bien vers `/auth` sans session. **Pas testé** : le flux de connexion Zernio
    réel de bout en bout (nécessite un vrai compte client + un vrai clic de consentement OAuth,
    impossible à automatiser sans compromettre un vrai compte social), et le devis en conditions réelles
    (bloqué sur les crédits Anthropic comme le reste du projet).
  - 4 migrations poussées (`20260831160000` à `20260831180000`), types régénérés, 9 edge functions
    déployées (2 nouvelles : `zernio-connect`, `get-action-quote` ; 7 modifiées), fusionné dans `main` et
    poussé sur GitHub.
  - **Pas encore fait** : déclenchement Phase 4b par le client (voir plus haut), vérification du plafond
    de "Profiles" Zernio sur le palier actuel de Russel (invérifiable depuis cette session), premier test
    de connexion Zernio réel avec un vrai compte client.

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
