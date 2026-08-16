# Décisions — Veille concurrentielle publicitaire

Ce fichier documente une décision de scope prise avec Russel le 2026-08-16, **hors des 7
phases** décrites dans `CLAUDE.md` ("Feature en cours de cadrage : automatisation reseaux
sociaux par agents IA"). Ce n'est pas une nouvelle phase, ni une modification des 7 phases
existantes — c'est une brique séparée et optionnelle. Si tu lis ce fichier dans plusieurs mois
sans avoir le contexte de la conversation d'origine, tout ce qu'il faut savoir est ci-dessous.

## Contexte

Russel voulait évaluer si `glndigital-platform` pouvait répliquer en interne ce que fait l'outil
tiers **AdWhispr Ads** : recherche de pubs actives concurrentes (Facebook/TikTok), découverte
automatique de concurrents par secteur, comparaison de marques (nombre de pubs, budget estimé,
performance), génération de brief compétitif exportable, et recherche de mots-clés Google
(y compris ceux ciblés par un concurrent précis).

## Diagnostic de faisabilité (résumé — 2026-08-16)

Vérifié via recherche web (sources en bas de page), pas seulement depuis la mémoire du modèle.

| Fonction | Verdict | Pourquoi |
|---|---|---|
| Pubs actives d'une marque connue — Meta | API officielle existe (Ad Library API), mais **hors UE/UK elle ne renvoie que les pubs politiques/d'intérêt social**, jamais les pubs commerciales classiques | Inutile pour des clients camerounais/africains faisant de la pub commerciale non-politique |
| Pubs actives d'une marque connue — TikTok | API officielle existe (Commercial Content Library API), mais **accès explicitement réservé aux chercheurs/conformité réglementaire, fermé aux agences et marketeurs** | Interdit par les conditions d'accès elles-mêmes, indépendamment de l'effort de dev |
| Découverte automatique de concurrents par secteur | Aucune des deux APIs ne permet une recherche "par secteur" (il faut déjà connaître le nom de l'annonceur) | Nécessiterait une infrastructure d'indexation propriétaire à grande échelle |
| Budget publicitaire estimé / performance de campagnes concurrentes | Jamais fourni par Meta pour les pubs commerciales classiques (seulement des fourchettes, et uniquement pour les pubs politiques) | Tout chiffre affiché serait une estimation inventée — contraire à la règle anti-hallucination du projet |
| Génération de brief compétitif exportable | Faisable — pure génération IA à partir de données déjà réelles | Même schéma que la Phase 3 (recherche web horodatée + sourcing) |
| Recherche générale de mots-clés Google | Faisable via l'API Google Ads officielle (Keyword Planner) | Précision réduite (fourchettes) sans historique de dépense active (~50-100$) |
| Mots-clés de ciblage réel d'un concurrent précis | Jamais exposé par Google (donnée privée de campagne) | Keyword Planner ne montre que des mots-clés "associés" au site du concurrent, pas son ciblage réel |

## Décision validée

### Construit en interne
1. **Génération de brief compétitif exportable** — réutilise l'architecture de la Phase 3
   (recherche web horodatée + sourcing, sortie structurée). Prend en entrée des données déjà
   collectées et validées humainement en amont (ex. recherche manuelle via AdWhispr, notes
   saisies par l'admin) — ne collecte rien lui-même via une API Meta/TikTok.
2. **Recherche générale de mots-clés** via l'API Google Ads officielle (Keyword Planner). Même
   discipline anti-hallucination que le reste du projet : toute donnée vient de l'API, jamais
   estimée si l'API ne la fournit pas (ex. ne jamais afficher une fourchette comme un chiffre
   exact).

### Abandonné définitivement — ne jamais retenter de construire ça en interne
- **Découverte automatique de concurrents par secteur** (infrastructure d'indexation
  propriétaire non réplicable).
- **Budget publicitaire estimé ou données de performance de campagnes concurrentes** (Meta ne
  fournit pas ces données pour les pubs commerciales hors UE/UK — toute valeur affichée serait
  une invention).
- **Mots-clés de ciblage publicitaire réels d'un concurrent précis** (donnée privée jamais
  exposée par Google, quelle que soit l'API utilisée).
- **Toute intégration d'AdWhispr (ou d'un outil équivalent) directement dans le produit**
  `glndigital-platform` : AdWhispr ne propose pas d'API destinée à l'intégration dans un produit
  tiers, uniquement un accès MCP pour clients de chat IA (Claude, ChatGPT, Cursor, etc.). Ce
  n'est pas un problème de coût ou de complexité — c'est une limite d'architecture du
  fournisseur. Ne pas chercher de contournement (pas de scraping, pas d'automatisation
  navigateur — même logique que l'interdiction de scraping social media du reste du projet).

### Positionnement à respecter si la question revient plus tard
La veille concurrentielle publicitaire (recherche de concurrents, analyse de leurs publicités)
reste un service réalisé **manuellement par l'équipe GLN Digital** via des outils externes
(comme AdWhispr), jamais présenté comme une fonctionnalité automatisée du produit accessible en
self-service par les clients. Dans toute documentation commerciale ou support client :
**"notre équipe réalise cette analyse pour vous"**, jamais **"notre plateforme le fait
automatiquement"**.

## État d'avancement

- 2026-08-16 : diagnostic de faisabilité + décision de scope validés avec Russel. Structure de
  dossiers proposée pour les deux briques retenues (brief compétitif, recherche de mots-clés) —
  en attente de validation avant tout code fonctionnel. Voir la proposition dans la session
  Claude Code correspondante.
- 2026-08-17 : les deux briques construites et déployées.
  - **Brief concurrentiel** — `supabase/migrations/20260817100000_create_competitive_briefs_table.sql`
    (table `competitive_briefs`, RLS admin-only, pas de policy update — même esprit append-only que
    `audit_snapshots`) + `supabase/functions/_shared/competitiveBriefClient.ts` (Claude +
    `web_search_20260209`, sortie structurée `{brief_content, sources}`, prompt système qui interdit
    explicitement de prétendre un accès direct à une bibliothèque de pubs Meta/TikTok et de présenter
    un budget/performance comme un fait vérifié) + `supabase/functions/competitive-brief/index.ts`
    (edge function admin-only). Fichier séparé de `claudeClient.ts` par design (ce dernier reste
    documenté comme servant uniquement les 7 phases).
  - **Recherche de mots-clés** — `supabase/functions/_shared/googleAdsClient.ts` implémente
    `generateKeywordIdeas` **pour de vrai** (pas en mode mock) : le contrat REST a été vérifié le
    2026-08-17 via trois sources officielles Google indépendantes et concordantes (page d'exemples
    REST, exemple officiel `google-ads-python` sur GitHub, contenu devsite indexé) — suffisamment
    corroboré pour implémenter, contrairement à Zernio (jamais vérifié contre une doc officielle,
    donc toujours en stub explicite). Langue et zones géographiques sont des champs texte libres
    saisis par l'admin (ex. `"languageConstants/1002"`, `"geoTargetConstants/2120"`) — jamais devinés
    ni pré-remplis, pour ne pas inventer un ID de langue/pays. `supabase/functions/keyword-research/index.ts`
    est une simple façade admin-only par-dessus ce client — **volontairement sans persistance** (pas
    de nouvelle table) : c'est un outil de consultation ponctuelle, pas un document à conserver comme
    le brief ; aucune architecture BDD n'a été validée avec Russel pour un historique de recherches,
    donc aucune n'a été créée.
  - `src/lib/competitiveBriefStore.ts` + `src/lib/keywordResearchStore.ts` + nouvel onglet
    **"Brief concurrentiel"** dans `src/pages/Admin.tsx` (juste après "Veille IA", distinct de cet
    onglet existant qui couvre un sujet différent — les concurrents SaaS/agence de GLN elle-même,
    pas les concurrents publicitaires des clients).
  - Migration poussée (`supabase db push`) et les deux edge functions déployées
    (`supabase functions deploy competitive-brief` / `keyword-research`), types régénérés
    (`supabase gen types typescript --linked`).
  - Vérifié : `npx tsc --noEmit`, `npx eslint` (mêmes lignes `any` préexistantes + 2 nouvelles qui
    suivent exactement la convention déjà utilisée ailleurs dans `Admin.tsx`, `0` régression), `npm
    run test` : 0 erreur.
  - **Pas encore fait** : secrets `GOOGLE_ADS_CLIENT_ID`/`GOOGLE_ADS_CLIENT_SECRET`/
    `GOOGLE_ADS_REFRESH_TOKEN`/`GOOGLE_ADS_DEVELOPER_TOKEN`/`GOOGLE_ADS_CUSTOMER_ID` (et
    `GOOGLE_ADS_LOGIN_CUSTOMER_ID` si compte manager) pas encore configurés côté Supabase — à faire
    par Russel une fois un compte Google Ads (avec accès développeur Keyword Planner) en main ; tests
    de bout en bout réels des deux briques (dépendent aussi des crédits Anthropic pour le brief).

## Sources du diagnostic (vérifiées le 2026-08-16, pas seulement depuis la mémoire du modèle)

- [Meta Ad Library API — accès, limites (2026)](https://swipekit.app/articles/meta-ad-library-api)
- [Meta Ad Library API — limitations (2026)](https://adlibrary.com/posts/meta-ad-library-api-limitations)
- [TikTok Commercial Content API — TikTok for Developers](https://developers.tiktok.com/products/commercial-content-api)
- [TikTok Ad Library API — guide (2026)](https://adlibrary.com/guides/tiktok-ad-library-api)
- [Google Ads API — Keyword Planning overview](https://developers.google.com/google-ads/api/docs/keyword-planning/overview)
- [Ciblage de mots-clés concurrents dans Google Ads](https://www.interteammarketing.com/blog/targeting-competitor-keywords-in-google-ads)
