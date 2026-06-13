import axios from 'axios';

const BASE_URL = 'http://192.168.1.36:5000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Admin auth
export const loginAdmin = (email: string, mot_de_passe: string) =>
  api.post('/auth/admin/login', { email, mot_de_passe });

// Admin
export const getAdminStats = (periode?: 'semaine' | 'mois') =>
  api.get('/admin/stats', { params: periode ? { periode } : {} });
export const getModerationQueue = (type?: string, page = 1, limit = 10) =>
  api.get('/admin/moderation', { params: type ? { type, page, limit } : {} });
export const getAssociations = (page = 1, limit = 10) =>
  api.get('/admin/associations', { params: { page, limit } });
export const creerAssociationAdmin = (data: { nom: string; email: string; mot_de_passe: string; description?: string; wilaya?: string; telephone?: string }) =>
  api.post('/admin/associations', data);
export const supprimerAssociation = (id: number) =>
  api.delete(`/admin/associations/${id}`);
export const modererAssociation = (id: number, statut: 'validee' | 'rejetee', motif_rejet?: string) =>
  api.patch(`/admin/associations/${id}`, { statut, motif_rejet });
export const getEvenementsAdmin = (page = 1) =>
  api.get('/admin/evenements', { params: { page, limit: 20 } });
export const masquerEvenementAdmin = (id: number) =>
  api.patch(`/admin/evenements/${id}`, { statut: 'annule' });
export const republierEvenementAdmin = (id: number) =>
  api.patch(`/admin/evenements/${id}`, { statut: 'publie' });
export const supprimerEvenementAdmin = (id: number) =>
  api.delete(`/admin/evenements/${id}`);
export const getConfigPoints = () =>
  api.get('/admin/config');
export const updateConfigPoints = (data: { points_signalement?: number; points_signalement_critique?: number; points_participation?: number; points_proposition_point?: number }) =>
  api.patch('/admin/config', data);
export const modererSignalement = (id: number, statut: 'publie' | 'rejete' | 'resolu', motif_rejet?: string) =>
  api.patch(`/signalements/${id}/statut`, { statut, ...(motif_rejet ? { motif_rejet } : {}) });
export const rejeterPhotosResolution = (id: number) =>
  api.delete(`/signalements/${id}/photos-resolution`);
export const modererPointCollecte = (id: number, statut: 'actif' | 'inactif') =>
  api.patch(`/points-collecte/${id}/statut`, { statut });

// Association auth
export const loginAssociation = (email: string, mot_de_passe: string) =>
  api.post('/auth/association/login', { email, mot_de_passe });
export const updateProfilAssociation = (fd: FormData) =>
  api.patch('/associations/profil', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

export const changerMotDePasseAssociation = (mot_de_passe_actuel: string, nouveau_mot_de_passe: string) =>
  api.patch('/associations/mot-de-passe', { mot_de_passe_actuel, nouveau_mot_de_passe });

export const getProfilAssociation = () =>
  api.get('/associations/profil');

// Événements
export const getEvenements = (page = 1, association_id?: number) =>
  api.get('/evenements', { params: { page, limit: 100, ...(association_id ? { association_id } : {}) } });

export const getEvenementQRCode = (id: number) =>
  api.get(`/evenements/${id}/qrcode`);

export const creerEvenement = (formData: FormData) =>
  api.post('/evenements', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Signalements
export const getSignalements = (page = 1, limit = 100, statut?: string, search?: string) =>
  api.get('/signalements', { params: { page, limit, ...(statut ? { statut } : {}), ...(search ? { search } : {}) } });

// Points de collecte
export const getPointsCollecte = (page = 1, limit = 100) =>
  api.get('/points-collecte', { params: { page, limit } });
export const getPointsAdmin = (page = 1, limit = 10, filters: { wilaya?: string; statut?: string; type_dechet?: string; search?: string } = {}) =>
  api.get('/admin/points-collecte', { params: { page, limit, ...filters } });
export const creerPointCollecte = (data: {
  nom: string; wilaya: string; type_dechet: string[];
  latitude: number; longitude: number;
  adresse?: string; horaires?: string;
}) => api.post('/points-collecte', data);
export const supprimerPointCollecteAdmin = (id: number) =>
  api.delete(`/admin/points-collecte/${id}`);
export const modifierPointCollecteAdmin = (id: number, data: { nom?: string; wilaya?: string; adresse?: string; horaires?: string; type_dechet?: string[]; statut?: string }) =>
  api.patch(`/admin/points-collecte/${id}`, data);

// Utilisateurs
export const getUtilisateurs = (wilaya?: string, page = 1) =>
  api.get('/utilisateurs/classement', { params: { wilaya: wilaya || undefined, page, limit: 50 } });
export const getUtilisateursAdmin = (page = 1, limit = 20, wilaya?: string, search?: string) =>
  api.get('/admin/utilisateurs', { params: { page, limit, wilaya: wilaya || undefined, search: search || undefined } });
export const banUtilisateur = (id: number, actif: boolean) =>
  api.patch(`/admin/utilisateurs/${id}/ban`, { actif });

// Employés
export const getEmployes = (page = 1, limit = 20, wilaya?: string, statut?: string) =>
  api.get('/admin/employes', { params: { page, limit, wilaya: wilaya || undefined, statut: statut || undefined } });
export const creerEmploye = (data: { nom: string; prenom: string; telephone: string; wilaya?: string }) =>
  api.post('/admin/employes', data);
export const modifierEmploye = (id: number, data: Partial<{ nom: string; prenom: string; telephone: string; wilaya: string; statut: string }>) =>
  api.patch(`/admin/employes/${id}`, data);
export const supprimerEmploye = (id: number) =>
  api.delete(`/admin/employes/${id}`);

// Camions
export const getCamions = (page = 1, limit = 20, wilaya?: string, statut?: string) =>
  api.get('/admin/camions', { params: { page, limit, wilaya: wilaya || undefined, statut: statut || undefined } });
export const creerCamion = (data: { immatriculation: string; capacite?: number; wilaya?: string }) =>
  api.post('/admin/camions', data);
export const modifierCamion = (id: number, data: Partial<{ immatriculation: string; capacite: number; wilaya: string; statut: string }>) =>
  api.patch(`/admin/camions/${id}`, data);
export const supprimerCamion = (id: number) =>
  api.delete(`/admin/camions/${id}`);

// Collectes
export const getCollectes = (page = 1, limit = 20, statut?: string) =>
  api.get('/admin/collectes', { params: { page, limit, statut: statut || undefined } });
export const creerCollecte = (data: { employe_id: number; camion_id: number; date_prevue: string; creneau?: string; notes?: string; signalement_id?: number }) =>
  api.post('/admin/collectes', data);
export const modifierStatutCollecte = (id: number, statut: string) =>
  api.patch(`/admin/collectes/${id}`, { statut });
export const supprimerCollecte = (id: number) =>
  api.delete(`/admin/collectes/${id}`);

export const notifierTop20 = () =>
  api.post('/admin/notifier-top20');

export const getTopCitoyens = (limit = 20) =>
  api.get('/admin/top-citoyens', { params: { limit } });

export const envoyerCartesCadeaux = (codes: { utilisateur_id: number; code: string; rang?: number }[]) =>
  api.post('/admin/envoyer-cartes-cadeaux', { codes });

export const getSignalementsCritiques = (since?: string) =>
  api.get('/admin/signalements/critiques', { params: since ? { since } : {} });

export default api;
