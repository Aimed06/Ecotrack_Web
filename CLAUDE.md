# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes

```bash
npm install        # installer les dépendances
npm run dev        # démarrer le serveur de développement (http://localhost:5173)
npm run build      # build de production (tsc + vite build)
npm run preview    # prévisualiser le build de production
```

Pas de lint ni de tests configurés. TypeScript strict est activé — les erreurs remontent via les diagnostics IDE ou `tsc --noEmit`.

## Stack

- **Vite 6** · React 18 · TypeScript strict · React Router v6
- Axios pour les appels API
- Zéro bibliothèque UI — styles 100 % inline (`React.CSSProperties`)
- Pas de state manager externe (useState local dans chaque page)

## Architecture

### Entrée

`src/main.tsx` → `src/App.tsx` (routing + guard d'auth).

### Routing (`App.tsx`)

```
/                → Home.tsx            (choix Admin ou Association)
/admin/login     → AdminLogin.tsx
/admin           → AdminDashboard.tsx  (RequireAuth role="admin")
/assoc/login     → AssocLogin.tsx
/assoc           → AssocDashboard.tsx  (RequireAuth role="association")
*                → redirect /
```

`RequireAuth` lit `localStorage.getItem('token')` et `localStorage.getItem('role')` — si absent ou mauvais rôle, redirige vers la page de login correspondante.

### Authentification

Tout est stocké dans `localStorage` :
- `token` — JWT Bearer injecté automatiquement par l'intercepteur Axios dans `src/api.ts`
- `role` — `'admin'` ou `'association'`
- `assoc` — JSON de l'objet association (contient `id`, `nom`) — utilisé par `AssocDashboard` pour filtrer les événements par `association_id`

### API (`src/api.ts`)

Instance Axios unique. `BASE_URL = http://10.91.124.234:5000/api` — changer l'IP si le backend tourne ailleurs.

L'intercepteur injecte `Authorization: Bearer <token>` automatiquement.

Format de réponse backend : `{ success, data, message? }`.
- Pour `GET /evenements` : `res.data.data` est un **tableau direct** (pas `{ evenements: [] }`).
- Pour les autres endpoints : `res.data.data` est l'objet ou tableau retourné par le service.

### Dashboard Admin (`pages/admin/AdminDashboard.tsx`)

Charge en parallèle `GET /admin/stats` et `GET /admin/moderation` au montage.

Onglets : Statistiques · Associations · Événements · Signalements · Points de collecte · Utilisateurs.

Panneau de détail latéral (drawer droit, 480 px) : s'ouvre via le bouton 👁 sur chaque ligne. Composants de détail séparés : `SignalementDetail`, `EvenementDetail`, `AssocDetail`, `PointDetail`.

Actions de modération disponibles depuis la liste ET depuis le panneau de détail :
- Association : `PATCH /admin/associations/:id` → `{ statut: 'validee'|'rejetee', motif_rejet? }` — le rejet ouvre une modale pour saisir le motif
- Événement : `PATCH /admin/evenements/:id` → `{ valide: boolean }`
- Signalement : `PATCH /signalements/:id/statut` → `{ statut: 'publie'|'rejete' }`
- Point de collecte : `PATCH /points-collecte/:id/statut` → `{ statut: 'actif'|'inactif' }`

Coordonnées GPS : les colonnes `latitude`/`longitude` arrivent en **string** depuis MySQL — toujours passer par `parseFloat()` avant `.toFixed()`.

### Dashboard Association (`pages/association/AssocDashboard.tsx`)

Deux vues : `evenements` (liste) et `creer` (formulaire).

Filtre par association : `GET /evenements?association_id=<id>&limit=100` — renvoie tous les statuts (en_attente, publie, annule, termine) car le backend ne force plus `statut: 'publie'` quand `association_id` est fourni.

### Styles

Palette dans `src/constants/colors.ts` (identique au frontend mobile).
- Couleur principale : `Colors.primary` (#1D9E75, vert)
- Couleur admin : `Colors.purple` (#534AB7)
- **Jamais de couleur en dur** — toujours `Colors.*`
- Tous les styles sont des objets `Record<string, React.CSSProperties>` déclarés en bas de chaque fichier (convention `const s = { ... }`)

## Points à terminer

- La file de modération charge tout d'un coup (pas de pagination) — acceptable tant que le volume reste faible
