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
- **react-leaflet** + Leaflet pour la carte (`AdminMap`) — tuiles OpenStreetMap (pas de Google Maps côté web)
- `react-leaflet-cluster` pour le clustering des markers
- `react-icons/md` pour toutes les icônes (Material Design)
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

Instance Axios unique. `BASE_URL` pointe vers l'IP locale du backend en haut du fichier — changer si le backend tourne ailleurs.

L'intercepteur injecte `Authorization: Bearer <token>` automatiquement.

Format de réponse backend : `{ success, data, message? }`.
- Pour `GET /evenements` : `res.data.data` est un **tableau direct** (pas `{ evenements: [] }`).
- Pour les autres endpoints : `res.data.data` est l'objet ou tableau retourné par le service.

### Responsive (`src/hooks/useViewport.ts`)

Hook custom + breakpoints :
- `mobile` : `< 640 px`
- `tablet` : `640 – 1023 px`
- `desktop` : `≥ 1024 px`

```ts
const { isMobile, isTablet, isDesktop } = useViewport();
```

**Patterns appliqués** quand `isMobile` est vrai :
- **Sidebar** (260 px fixe) → **drawer slide-in** depuis la gauche avec backdrop + bouton hamburger dans un header sticky
- **Layout** parent passe de `flex row` à `flex column`
- **Panneau de détail latéral** (500 px) → plein écran
- **Form rows** (2 inputs côte à côte) → empilés verticalement
- **PageHeader** (titre + boutons) → empilé verticalement
- **Grilles** `repeat(auto-fill, minmax(320px, 1fr))` → 1 colonne forcée
- **Inputs de recherche** → `width: 100%`

Le hook se met à jour automatiquement sur `resize` (event listener avec cleanup). Convention : déclarer les styles dérivés (`mainS`, `pageHeaderS`, etc.) juste avant le `return` du composant.

CSS globales (`src/index.css`) liées au mobile :
- `overflow-x: hidden` sur html/body
- `font-size: 16px` sur inputs (anti-zoom iOS)
- `-webkit-tap-highlight-color: transparent`

### Dashboard Admin (`pages/admin/AdminDashboard.tsx`)

Charge en parallèle `GET /admin/stats` et `GET /admin/moderation` au montage.

**Onglets** (groupés en 3 catégories — `Modération`, `Logistique`, `Système`) :
- **Modération** : Statistiques, Carte (`AdminMap`), Associations, Événements, Signalements, Points de collecte, Utilisateurs
- **Logistique** : Employés, Camions, Planification (collectes)
- **Système** : Configuration des points

**Note** : la page **Planification** affiche actuellement un placeholder "À venir" — le formulaire de création et la liste sont retirés du rendu mais l'API et l'état restent en place pour ré-activation future.

Panneau de détail latéral (drawer droit, 500 px desktop / plein écran mobile) : s'ouvre via le bouton 👁 sur chaque ligne. Composants de détail séparés : `SignalementDetail`, `EvenementDetail`, `AssocDetail`, `PointDetail`.

Actions de modération disponibles depuis la liste ET depuis le panneau de détail :
- Association : `PATCH /admin/associations/:id` → `{ statut: 'validee'|'rejetee', motif_rejet? }` — le rejet ouvre une modale pour saisir le motif
- Événement : `PATCH /admin/evenements/:id` → `{ statut: 'publie'|'annule' }`
- Signalement : `PATCH /signalements/:id/statut` → `{ statut: 'publie'|'rejete'|'resolu', motif_rejet? }`
- Point de collecte : `PATCH /points-collecte/:id/statut` → `{ statut: 'actif'|'inactif' }`
- Utilisateur : `PATCH /admin/utilisateurs/:id/ban` → `{ actif: boolean }`

Coordonnées GPS : les colonnes `latitude`/`longitude` arrivent en **string** depuis MySQL — toujours passer par `parseFloat()` avant `.toFixed()`.

### Carte Admin (`pages/admin/AdminMap.tsx`)

3 couches superposables : **Signalements** (rouge), **Points de collecte** (vert), **Événements** (violet). Markers SVG custom via `L.divIcon` + clustering par couche. Filtres : wilaya, type de déchet (pour points), degré de pollution (pour signalements), photos de résolution (signalements à valider).

### Dashboard Association (`pages/association/AssocDashboard.tsx`)

Trois vues : `evenements` (liste avec QR code), `creer` (formulaire), `profil` (logo + description + photos + mot de passe).

Filtre par association : `GET /evenements?association_id=<id>&limit=100` — renvoie tous les statuts (en_attente, publie, annule, termine) car le backend ne force pas `statut: 'publie'` quand `association_id` est fourni.

QR code : récupéré via `GET /evenements/:id/qrcode` (data URI base64), affiché dans une modale avec bouton de téléchargement PNG.

### Styles

Palette dans `src/constants/colors.ts` (identique au frontend mobile).
- Couleur principale : `Colors.primary` (#00C48C, vert)
- Couleur admin : `Colors.purple` (#534AB7)
- **Jamais de couleur en dur** — toujours `Colors.*`
- Tous les styles sont des objets `Record<string, React.CSSProperties>` déclarés en bas de chaque fichier (convention `const s = { ... }`)
- Styles **mobile uniquement** : objet séparé `sMobile` (ex. `AdminDashboard.tsx`) pour le header sticky, hamburger, backdrop
- Styles **dérivés** : variables locales (`mainS`, `pageHeaderS`, `panelS`, etc.) calculées avant le `return` selon `isMobile`

## Points à terminer

Aucun — le dashboard est complet et responsive (mobile / tablet / desktop).
