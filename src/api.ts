import axios from 'axios';

const BASE_URL = 'http://10.253.167.234:5000/api';

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
export const modererAssociation = (id: number, statut: 'validee' | 'rejetee', motif_rejet?: string) =>
  api.patch(`/admin/associations/${id}`, { statut, motif_rejet });
export const modererEvenementAdmin = (id: number, valide: boolean) =>
  api.patch(`/admin/evenements/${id}`, { valide });
export const modererSignalement = (id: number, statut: 'publie' | 'rejete' | 'resolu', motif_rejet?: string) =>
  api.patch(`/signalements/${id}/statut`, { statut, ...(motif_rejet ? { motif_rejet } : {}) });
export const rejeterPhotosResolution = (id: number) =>
  api.delete(`/signalements/${id}/photos-resolution`);
export const modererPointCollecte = (id: number, statut: 'actif' | 'inactif') =>
  api.patch(`/points-collecte/${id}/statut`, { statut });

// Association auth
export const loginAssociation = (email: string, mot_de_passe: string) =>
  api.post('/auth/association/login', { email, mot_de_passe });

// Événements
export const getEvenements = (page = 1, association_id?: number) =>
  api.get('/evenements', { params: { page, limit: 100, ...(association_id ? { association_id } : {}) } });

export const getEvenementQRCode = (id: number) =>
  api.get(`/evenements/${id}/qrcode`);

export const creerEvenement = (data: {
  titre: string;
  description?: string;
  date_debut: string;
  date_fin: string;
  wilaya?: string;
  adresse?: string;
  nb_places_max?: number;
  points_participation?: number;
  latitude?: number;
  longitude?: number;
}) => api.post('/evenements', data);

// Signalements
export const getSignalements = (page = 1, limit = 100, statut?: string) =>
  api.get('/signalements', { params: { page, limit, ...(statut ? { statut } : {}) } });

// Points de collecte
export const getPointsCollecte = (page = 1, limit = 100) =>
  api.get('/points-collecte', { params: { page, limit } });

// Utilisateurs
export const getUtilisateurs = (wilaya?: string, page = 1) =>
  api.get('/utilisateurs/classement', { params: { wilaya: wilaya || undefined, page, limit: 50 } });

export default api;
