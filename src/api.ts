import axios from 'axios';

const BASE_URL = 'http://10.91.124.234:5000/api';

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
export const getModerationQueue = () => api.get('/admin/moderation');
export const modererAssociation = (id: number, statut: 'validee' | 'rejetee', motif_rejet?: string) =>
  api.patch(`/admin/associations/${id}`, { statut, motif_rejet });
export const modererEvenementAdmin = (id: number, valide: boolean) =>
  api.patch(`/admin/evenements/${id}`, { valide });
export const modererSignalement = (id: number, statut: 'publie' | 'rejete') =>
  api.patch(`/signalements/${id}/statut`, { statut });
export const modererPointCollecte = (id: number, statut: 'actif' | 'inactif') =>
  api.patch(`/points-collecte/${id}/statut`, { statut });

// Association auth
export const loginAssociation = (email: string, mot_de_passe: string) =>
  api.post('/auth/association/login', { email, mot_de_passe });

// Événements
export const getEvenements = (page = 1, association_id?: number) =>
  api.get('/evenements', { params: { page, limit: 100, ...(association_id ? { association_id } : {}) } });

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

// Utilisateurs
export const getUtilisateurs = (wilaya?: string, page = 1) =>
  api.get('/utilisateurs/classement', { params: { wilaya: wilaya || undefined, page, limit: 50 } });

export default api;
