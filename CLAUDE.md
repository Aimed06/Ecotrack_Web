# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes

```bash
npm install        # installer les dépendances
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # build de production (tsc + vite build)
npm run preview    # prévisualiser le build de production
```

Pas de lint ni de tests configurés. TypeScript strict activé — erreurs via diagnostics IDE ou `tsc --noEmit`.

## Stack

- **Vite 6** · React 18 · TypeScript strict · React Router v6
- Axios pour les appels API
- **Leaflet** + react-leaflet + **react-leaflet-cluster** (carte admin + clustering)
- react-icons
- Zéro bibliothèque UI — styles 100 % inline (`React.CSSProperties`)
- Pas de state manager externe (useState local par page)

## Architecture

### Entrée et routing (`src/App.tsx`)

```
/             → Home.tsx           (choix Admin ou Association)
/admin/login  → AdminLogin.tsx
/admin        → AdminDashboard.tsx (RequireAuth role="admin")
/assoc/login  → AssocLogin.tsx
/assoc        → AssocDashboard.tsx (RequireAuth role="association")
*             → NotFound.tsx
```

`RequireAuth` lit `localStorage` (`token`, `role`). En cas d'échec il **rend la page `AccessDenied`** (avec `reason="unauthenticated"|"forbidden"` et le `role` attendu) — il ne redirige plus vers `/`. Pages d'erreur dans `src/pages/errors/`.

### Authentification (localStorage)

- `token` — JWT Bearer injecté par l'intercepteur Axios (`src/api.ts`)
- `role` — `'admin'` ou `'association'`
- `assoc` — JSON de l'association (`id`, `nom`, …) — utilisé par `AssocDashboard` pour filtrer par `association_id`

### API (`src/api.ts`)

Instance Axios unique. `BASE_URL = http://<IP>:5000/api` — **changer l'IP** si le backend tourne ailleurs (alignée avec le frontend mobile). L'intercepteur injecte `Authorization: Bearer <token>`.

Format backend : `{ success, data, message? }` (erreur : `{ success: false, error }`). Pour les listes (`/evenements`, `/signalements`, …) `res.data.data` est un **tableau direct**.

Helpers regroupés par domaine : admin auth/stats/modération, associations (CRUD + modération), événements, signalements (dont `rejeterPhotosResolution`), points de collecte (liste publique + CRUD admin filtré), utilisateurs (classement + `getUtilisateursAdmin` + `banUtilisateur`), **employés / camions / collectes** (CRUD admin), config des points, `notifierTop20`, `getSignalementsCritiques`.

### Dashboard Admin (`pages/admin/AdminDashboard.tsx`)

Charge en parallèle `GET /admin/stats` et `GET /admin/moderation` au montage.

Onglets : Statistiques · Associations · Événements · Signalements · Points de collecte · Utilisateurs · **Employés · Camions · Collectes · Config**. Carte dans `pages/admin/AdminMap.tsx` (Leaflet + clusters).

Panneau de détail latéral (drawer droit) via le bouton 👁. Composants de détail séparés (`SignalementDetail`, `EvenementDetail`, `AssocDetail`, `PointDetail`).

Actions de modération (depuis la liste ET le détail) :
- Association : `PATCH /admin/associations/:id` → `{ statut: 'validee'|'rejetee', motif_rejet? }` (rejet → modale de motif). Création `POST /admin/associations`, suppression `DELETE`.
- Événement : `PATCH /admin/evenements/:id` → `{ statut: 'annule'|'publie' }` (masquer / republier), `DELETE` pour supprimer.
- Signalement : `PATCH /signalements/:id/statut` → `{ statut: 'publie'|'rejete'|'resolu', motif_rejet? }`. `DELETE /signalements/:id/photos-resolution` pour rejeter les photos de preuve.
- Point de collecte : `PATCH /admin/points-collecte/:id` (édition complète) ou `/points-collecte/:id/statut`, `DELETE` pour supprimer.
- Utilisateur : `PATCH /admin/utilisateurs/:id/ban` → `{ actif }`.
- Collecte : `POST/PATCH/DELETE /admin/collectes` (planifier, changer statut, supprimer) ; idem employés et camions.
- Config : `GET/PATCH /admin/config` (barèmes de points).

Coordonnées GPS : `latitude`/`longitude` arrivent en **string** depuis MySQL → toujours `parseFloat()` avant `.toFixed()` ou usage Leaflet.

### Dashboard Association (`pages/association/AssocDashboard.tsx`)

Vues `evenements` (liste) et `creer` (formulaire). Filtre : `GET /evenements?association_id=<id>&limit=100` — renvoie tous les statuts (le backend ne force pas `publie` quand `association_id` est fourni). Gestion du profil et du mot de passe via `/associations/profil` et `/associations/mot-de-passe`.

### Styles & constantes

- Palette `src/constants/colors.ts` (identique au mobile) : `Colors.primary` (#1D9E75), `Colors.purple` admin (#534AB7). **Jamais de couleur en dur**.
- Constantes métier partagées : `src/constants/wilayas.ts`, `src/constants/typesDechet.ts`.
- Tous les styles sont des `Record<string, React.CSSProperties>` déclarés en bas de chaque fichier (convention `const s = { ... }`).

## État

Dashboards admin et association complets.
