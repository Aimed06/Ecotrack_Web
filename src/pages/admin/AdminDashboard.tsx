import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Colors } from '../../constants/colors';

// Fix Leaflet default icon for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}
import {
  getAdminStats, getModerationQueue,
  modererAssociation,
  getEvenementsAdmin, masquerEvenementAdmin, republierEvenementAdmin, supprimerEvenementAdmin,
  modererSignalement, modererPointCollecte,
  getAssociations, creerAssociationAdmin, supprimerAssociation,
  getSignalements,
  getPointsAdmin, creerPointCollecte, supprimerPointCollecteAdmin, modifierPointCollecteAdmin,
  getUtilisateursAdmin, banUtilisateur,
  getEmployes, creerEmploye, modifierEmploye, supprimerEmploye,
  getCamions, creerCamion, modifierCamion, supprimerCamion,
  getCollectes, creerCollecte, modifierStatutCollecte, supprimerCollecte,
  getConfigPoints, updateConfigPoints, notifierTop20, getSignalementsCritiques,
} from '../../api';
import AdminMap from './AdminMap';
import WILAYAS from '../../constants/wilayas';
import TYPES_DECHET from '../../constants/typesDechet';
import {
  MdSpaceDashboard, MdMap, MdBusiness, MdEvent, MdReportProblem,
  MdLocationOn, MdPeople, MdEngineering, MdLocalShipping, MdAssignment,
  MdSettings, MdLogout, MdNotificationsActive, MdVisibility,
  MdCheck, MdClose, MdDelete, MdEdit, MdAdd, MdSearch,
  MdBlock, MdWarning, MdCrisisAlert, MdAdminPanelSettings, MdZoomIn,
  MdFilterList, MdRefresh, MdVerified, MdPersonOff, MdPersonAdd,
  MdRecycling, MdHandyman, MdHourglassEmpty, MdCameraAlt,
  MdLocalDrink, MdEco, MdWineBar, MdConstruction, MdDangerous,
  MdSave, MdEmojiEvents, MdOutlineAddLocationAlt,
} from 'react-icons/md';

type Tab = 'stats' | 'associations' | 'evenements' | 'signalements' | 'points' | 'utilisateurs' | 'carte' | 'employes' | 'camions' | 'collectes' | 'config';
interface Stats {
  nb_citoyens: number;
  nb_associations: number;
  nb_signalements: number;
  nb_signalements_en_attente: number;
  nb_signalements_publies: number;
  nb_signalements_resolus: number;
  nb_signalements_critiques: number;
  nb_evenements_publies: number;
  nb_participations: number;
  nb_points_collecte: number;
}
interface Queue { associations: any[]; evenements: any[]; signalements: any[]; points_collecte: any[]; }

const TABS: { id: Tab; label: string; group?: string }[] = [
  { id: 'stats',         label: 'Statistiques' },
  { id: 'carte',         label: 'Carte' },
  { id: 'associations',  label: 'Associations' },
  { id: 'evenements',    label: 'Événements' },
  { id: 'signalements',  label: 'Signalements' },
  { id: 'points',        label: 'Points de collecte' },
  { id: 'utilisateurs',  label: 'Utilisateurs' },
  { id: 'employes',      label: 'Employés',           group: 'Collecte' },
  { id: 'camions',       label: 'Camions',            group: 'Collecte' },
  { id: 'collectes',     label: 'Planification',      group: 'Collecte' },
  { id: 'config',        label: 'Configuration',      group: 'Paramètres' },
];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  stats:        <MdSpaceDashboard size={19} />,
  carte:        <MdMap size={19} />,
  associations: <MdBusiness size={19} />,
  evenements:   <MdEvent size={19} />,
  signalements: <MdReportProblem size={19} />,
  points:       <MdLocationOn size={19} />,
  utilisateurs: <MdPeople size={19} />,
  employes:     <MdEngineering size={19} />,
  camions:      <MdLocalShipping size={19} />,
  collectes:    <MdAssignment size={19} />,
  config:       <MdSettings size={19} />,
};

const DEGRE_COLORS = ['', '#22c55e', '#84cc16', Colors.orange, '#f97316', Colors.red];
const DEGRE_BG     = ['', '#f0fdf4', '#f7fee7', Colors.orangeLight, '#fff7ed', Colors.redLight];
const DEGRE_LABELS = ['', 'Très léger', 'Léger', 'Modéré', 'Grave', 'Critique'];
const MODERATION_TABS: Tab[] = ['signalements'];

const DECHET_ICONS: Record<string, React.ReactNode> = {
  'Plastique': <MdLocalDrink size={13} />,
  'Organique': <MdEco size={13} />,
  'Verre':     <MdWineBar size={13} />,
  'Métal':     <MdConstruction size={13} />,
  'Dangereux': <MdDangerous size={13} />,
  'Autre':     <MdRecycling size={13} />,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'stats');
  const [stats, setStats]     = useState<Stats | null>(null);
  const [queue, setQueue]     = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState<{ item: any; type: Tab } | null>(null);
  const [rejectMotif, setRejectMotif]         = useState('');
  const [rejectTarget, setRejectTarget]       = useState<number | null>(null);
  const [signalRejectTarget, setSignalRejectTarget] = useState<number | null>(null);
  const [rejectPointTarget, setRejectPointTarget] = useState<any | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  type Periode = 'tout' | 'semaine' | 'mois';
  const [periode, setPeriode] = useState<Periode>('tout');
  const [statsLoading, setStatsLoading] = useState(false);
  const periodeInitialized = useRef(false);

  const [newCritiques, setNewCritiques] = useState<any[]>([]);
  const lastCritiqueCheckRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const poll = async () => {
      try {
        const res = await getSignalementsCritiques(lastCritiqueCheckRef.current);
        const found: any[] = res.data.data ?? [];
        if (found.length > 0) {
          lastCritiqueCheckRef.current = new Date().toISOString();
          setNewCritiques(prev => [...found, ...prev]);
          if ('Notification' in window && Notification.permission === 'granted') {
            found.forEach(s => new Notification(`🚨 Signalement critique — ${s.wilaya ?? ''}`, {
              body: `${s.titre}  ·  Degré ${s.degre_pollution}/5`,
              icon: '/favicon.png',
            }));
          }
        }
      } catch {}
    };
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  const [wilayaFilter, setWilayaFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [degreFilter, setDegreFilter] = useState<number[]>([]);

  const POINTS_PAGE_SIZE = 10;
  const [pointsList, setPointsList]   = useState<any[]>([]);
  const [pointsTotal, setPointsTotal] = useState(0);
  const [pointsPage, setPointsPage]   = useState(1);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [showCreatePoint, setShowCreatePoint] = useState(false);
  const [deletePointTarget, setDeletePointTarget] = useState<number | null>(null);
  const [editPointTarget, setEditPointTarget] = useState<any | null>(null);
  const [editPointForm, setEditPointForm] = useState({ nom: '', wilaya: '', adresse: '', horaires: '', type_dechet: [] as string[] });
  const [editPointLoading, setEditPointLoading] = useState(false);
  const [editPointError, setEditPointError] = useState('');
  const [createPointForm, setCreatePointForm] = useState({
    nom: '', wilaya: '', adresse: '', horaires: '',
    latitude: '', longitude: '', type_dechet: [] as string[],
  });
  const [propositionsList, setPropositionsList] = useState<any[]>([]);
  const [propositionsTotal, setPropositionsTotal] = useState(0);
  const [propositionsLoading, setPropositionsLoading] = useState(false);
  const [pointsSubTab, setPointsSubTab] = useState<'propositions' | 'actifs'>('propositions');
  const [acceptTarget, setAcceptTarget] = useState<any | null>(null);
  const [acceptNom, setAcceptNom] = useState('');
  const [acceptHoraires, setAcceptHoraires] = useState('');
  const [acceptHorairesBuilder, setAcceptHorairesBuilder] = useState<{ jours: string[]; ouverture: string; fermeture: string }>({ jours: [], ouverture: '08:00', fermeture: '17:00' });
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [createPointLoading, setCreatePointLoading] = useState(false);
  const [createPointError, setCreatePointError] = useState('');
  const [createPointMapOpen, setCreatePointMapOpen] = useState(false);
  const [createPointMapMarker, setCreatePointMapMarker] = useState<[number, number] | null>(null);
  const [horairesBuilder, setHorairesBuilder] = useState<{ jours: string[]; ouverture: string; fermeture: string }>({ jours: [], ouverture: '08:00', fermeture: '17:00' });
  const [editHorairesBuilder, setEditHorairesBuilder] = useState<{ jours: string[]; ouverture: string; fermeture: string }>({ jours: [], ouverture: '08:00', fermeture: '17:00' });
  const [pointsWilaya, setPointsWilaya] = useState('');
  const [pointsStatut, setPointsStatut] = useState('');
  const [pointsTypeFilter, setPointsTypeFilter] = useState('');
  const [pointsSearch, setPointsSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [signalSearch, setSignalSearch] = useState('');

  // ── Événements admin state
  const EV_PAGE_SIZE = 20;
  const [evList, setEvList]     = useState<any[]>([]);
  const [evTotal, setEvTotal]   = useState(0);
  const [evPage, setEvPage]     = useState(1);
  const [evLoading, setEvLoading] = useState(false);
  const [deleteEvTarget, setDeleteEvTarget] = useState<number | null>(null);

  const loadEvenements = async (page = 1) => {
    setEvLoading(true);
    try {
      const res = await getEvenementsAdmin(page);
      setEvList(res.data.data ?? []);
      setEvTotal(res.data.meta?.total ?? 0);
    } catch {}
    finally { setEvLoading(false); }
  };

  // ── Config state
  const [configData, setConfigData] = useState({ points_signalement: 20, points_signalement_critique: 30, points_participation: 50, points_proposition_point: 30 });
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg]   = useState('');
  const [configErr, setConfigErr]   = useState('');
  const [top20Loading, setTop20Loading] = useState(false);
  const [top20Msg, setTop20Msg]     = useState('');
  const [top20Err, setTop20Err]     = useState('');

  const loadConfig = async () => {
    try {
      const res = await getConfigPoints();
      setConfigData(res.data.data);
    } catch {}
  };

  const saveConfig = async () => {
    setConfigSaving(true); setConfigMsg(''); setConfigErr('');
    try {
      const res = await updateConfigPoints(configData);
      setConfigData(res.data.data);
      setConfigMsg('Configuration sauvegardée.');
    } catch { setConfigErr('Erreur lors de la sauvegarde.'); }
    finally { setConfigSaving(false); }
  };

  const handleNotifierTop20 = async () => {
    setTop20Loading(true); setTop20Msg(''); setTop20Err('');
    try {
      const res = await notifierTop20();
      setTop20Msg(res.data.message || 'Notifications envoyées.');
    } catch { setTop20Err('Erreur lors de l\'envoi des notifications.'); }
    finally { setTop20Loading(false); }
  };

  const [signalMode, setSignalMode] = useState<'moderation' | 'a_resoudre'>('moderation');
  const [resoudreItems, setResoudreItems] = useState<any[]>([]);
  const [resoudreLoading, setResoudreLoading] = useState(false);
  const [photoResFilter, setPhotoResFilter] = useState(false);

  const toggleType  = (v: string) =>
    setTypeFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleDegre = (d: number) =>
    setDegreFilter(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const JOURS_ORDER = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const computeHoraires = (b: typeof horairesBuilder) => {
    if (!b.jours.length || !b.ouverture || !b.fermeture) return '';
    const sorted = [...b.jours].sort((a, z) => JOURS_ORDER.indexOf(a) - JOURS_ORDER.indexOf(z));
    // Group consecutive days
    const groups: string[][] = [];
    sorted.forEach(j => {
      const last = groups[groups.length - 1];
      if (last && JOURS_ORDER.indexOf(j) === JOURS_ORDER.indexOf(last[last.length - 1]) + 1) {
        last.push(j);
      } else { groups.push([j]); }
    });
    const daysStr = groups.map(g => g.length > 2 ? `${g[0]}-${g[g.length - 1]}` : g.join(', ')).join(', ');
    return `${daysStr} ${b.ouverture}-${b.fermeture}`;
  };

  const parseHoraires = (h: string): { jours: string[]; ouverture: string; fermeture: string } => {
    const DEFAULT = { jours: [] as string[], ouverture: '08:00', fermeture: '17:00' };
    if (!h) return DEFAULT;
    const timeMatch = h.match(/(\d{1,2}[h:]\d{0,2})-(\d{1,2}[h:]\d{0,2})$/);
    if (!timeMatch) return DEFAULT;
    const toTime = (t: string) => {
      if (t.includes('h')) { const [hh, mm = '00'] = t.split('h'); return `${hh.padStart(2,'0')}:${(mm || '00').padStart(2,'0')}`; }
      return t;
    };
    const ouverture = toTime(timeMatch[1]);
    const fermeture = toTime(timeMatch[2]);
    const daysStr = h.slice(0, h.lastIndexOf(timeMatch[0])).trim();
    const jours: string[] = [];
    daysStr.split(',').map(s => s.trim()).forEach(seg => {
      const parts = seg.split('-').map(s => s.trim());
      if (parts.length === 2 && JOURS_ORDER.includes(parts[0]) && JOURS_ORDER.includes(parts[1])) {
        const si = JOURS_ORDER.indexOf(parts[0]), ei = JOURS_ORDER.indexOf(parts[1]);
        for (let i = si; i <= ei; i++) jours.push(JOURS_ORDER[i]);
      } else if (JOURS_ORDER.includes(seg)) {
        jours.push(seg);
      }
    });
    return { jours, ouverture, fermeture };
  };

  const hasResolutionPhotos = (item: any) => {
    let photos = item.photos_resolution;
    if (!photos) return false;
    if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch { return false; } }
    if (!Array.isArray(photos) || photos.length === 0) return false;
    return photos.some((e: any) => (typeof e === 'string' && !!e) || !!e?.url);
  };

  const MOD_PAGE_SIZE = 10;
  const [modPage, setModPage]   = useState(1);
  const [modTotal, setModTotal] = useState(0);
  const [modItems, setModItems] = useState<any[]>([]);
  const [modLoading, setModLoading] = useState(false);

  const tabToBackendKey = (t: Tab) => t === 'points' ? 'points_collecte' : t;

  const loadModTab = useCallback(async (t: Tab, page: number) => {
    setModLoading(true);
    try {
      const res = await getModerationQueue(tabToBackendKey(t), page, MOD_PAGE_SIZE);
      setModItems(res.data.data.items ?? []);
      setModTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setModLoading(false); }
  }, []);

  const USERS_PAGE_SIZE = 20;
  const [users, setUsers]             = useState<any[]>([]);
  const [usersPage, setUsersPage]     = useState(1);
  const [usersTotal, setUsersTotal]   = useState(0);
  const [usersWilaya, setUsersWilaya] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [banTarget, setBanTarget]     = useState<{ id: number; nom: string; prenom: string; actif: boolean } | null>(null);

  const ASSOC_PAGE_SIZE = 10;
  const [assocList, setAssocList]   = useState<any[]>([]);
  const [assocTotal, setAssocTotal] = useState(0);
  const [assocPage, setAssocPage]   = useState(1);
  const [assocLoading, setAssocLoading] = useState(false);
  const [showCreateAssoc, setShowCreateAssoc] = useState(false);
  const [deleteAssocTarget, setDeleteAssocTarget] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ nom: '', email: '', mot_de_passe: '', wilaya: '', telephone: '', description: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const FLEET_PAGE_SIZE = 20;
  // ── Employés state
  const [empList, setEmpList]   = useState<any[]>([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empPage, setEmpPage]   = useState(1);
  const [empLoading, setEmpLoading] = useState(false);
  const [empWilaya, setEmpWilaya]   = useState('');
  const [empStatut, setEmpStatut]   = useState('');
  const [showCreateEmp, setShowCreateEmp]   = useState(false);
  const [deleteEmpTarget, setDeleteEmpTarget] = useState<number | null>(null);
  const [editEmpTarget, setEditEmpTarget]   = useState<any | null>(null);
  const [empForm, setEmpForm] = useState({ nom: '', prenom: '', telephone: '', wilaya: '' });
  const [empFormLoading, setEmpFormLoading] = useState(false);
  const [empFormError, setEmpFormError]     = useState('');

  // ── Camions state
  const [camList, setCamList]   = useState<any[]>([]);
  const [camTotal, setCamTotal] = useState(0);
  const [camPage, setCamPage]   = useState(1);
  const [camLoading, setCamLoading] = useState(false);
  const [camWilaya, setCamWilaya]   = useState('');
  const [camStatut, setCamStatut]   = useState('');
  const [showCreateCam, setShowCreateCam]   = useState(false);
  const [deleteCamTarget, setDeleteCamTarget] = useState<number | null>(null);
  const [editCamTarget, setEditCamTarget]   = useState<any | null>(null);
  const [camForm, setCamForm] = useState({ immatriculation: '', capacite: '', wilaya: '' });
  const [camFormLoading, setCamFormLoading] = useState(false);
  const [camFormError, setCamFormError]     = useState('');

  // ── Collectes state
  const [colList, setColList]   = useState<any[]>([]);
  const [colTotal, setColTotal] = useState(0);
  const [colPage, setColPage]   = useState(1);
  const [colLoading, setColLoading] = useState(false);
  const [colStatutFilter, setColStatutFilter] = useState('');
  const [showCreateCol, setShowCreateCol]   = useState(false);
  const [deleteColTarget, setDeleteColTarget] = useState<number | null>(null);
  const [colForm, setColForm] = useState({ employe_id: '', camion_id: '', date_prevue: '', creneau: '', notes: '', signalement_id: '' });
  const [colFormLoading, setColFormLoading] = useState(false);
  const [colFormError, setColFormError]     = useState('');
  // employee + camion lists for select (all, unfiltered)
  const [empAll, setEmpAll]   = useState<any[]>([]);
  const [camAll, setCamAll]   = useState<any[]>([]);

  const loadStats = useCallback(async (p: 'tout' | 'semaine' | 'mois') => {
    setStatsLoading(true);
    try {
      const res = await getAdminStats(p === 'tout' ? undefined : p);
      setStats(res.data.data);
    } catch {}
    finally { setStatsLoading(false); }
  }, []);

  const loadMain = async () => {
    setLoading(true);
    try {
      const [sRes, qRes] = await Promise.all([getAdminStats(), getModerationQueue()]);
      setStats(sRes.data.data);
      setQueue(qRes.data.data);
    } catch { navigate('/admin/login'); }
    finally { setLoading(false); }
  };

  const loadUsers = useCallback(async (wilaya: string, page: number, search = usersSearch) => {
    setUsersLoading(true);
    try {
      const res = await getUtilisateursAdmin(page, USERS_PAGE_SIZE, wilaya || undefined, search || undefined);
      setUsers(res.data.data.items ?? []);
      setUsersTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setUsersLoading(false); }
  }, [usersSearch]);

  const loadPoints = useCallback(async (page: number, wilaya = pointsWilaya, statut = pointsStatut, type_dechet = pointsTypeFilter, search = pointsSearch) => {
    setPointsLoading(true);
    try {
      const res = await getPointsAdmin(page, POINTS_PAGE_SIZE, {
        wilaya: wilaya || undefined,
        statut: statut || undefined,
        type_dechet: type_dechet || undefined,
        search: search || undefined,
      });
      setPointsList(res.data.data.items ?? []);
      setPointsTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setPointsLoading(false); }
  }, [pointsWilaya, pointsStatut, pointsTypeFilter]);

  const loadPropositions = useCallback(async () => {
    setPropositionsLoading(true);
    try {
      const res = await getPointsAdmin(1, 50, { statut: 'en_attente' });
      setPropositionsList(res.data.data.items ?? []);
      setPropositionsTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setPropositionsLoading(false); }
  }, []);

  const loadResoudre = useCallback(async (search = signalSearch) => {
    setResoudreLoading(true);
    try {
      const res = await getSignalements(1, 200, 'publie', search || undefined);
      setResoudreItems(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {}
    finally { setResoudreLoading(false); }
  }, [signalSearch]);

  const loadAssociations = useCallback(async (page: number) => {
    setAssocLoading(true);
    try {
      const res = await getAssociations(page, ASSOC_PAGE_SIZE);
      setAssocList(res.data.data.items ?? []);
      setAssocTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setAssocLoading(false); }
  }, []);

  const loadEmployes = useCallback(async (page: number, wilaya = empWilaya, statut = empStatut) => {
    setEmpLoading(true);
    try {
      const res = await getEmployes(page, FLEET_PAGE_SIZE, wilaya, statut);
      setEmpList(res.data.data.items ?? []);
      setEmpTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setEmpLoading(false); }
  }, [empWilaya, empStatut]);

  const loadCamions = useCallback(async (page: number, wilaya = camWilaya, statut = camStatut) => {
    setCamLoading(true);
    try {
      const res = await getCamions(page, FLEET_PAGE_SIZE, wilaya, statut);
      setCamList(res.data.data.items ?? []);
      setCamTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setCamLoading(false); }
  }, [camWilaya, camStatut]);

  const loadCollectes = useCallback(async (page: number, statut = colStatutFilter) => {
    setColLoading(true);
    try {
      const res = await getCollectes(page, FLEET_PAGE_SIZE, statut);
      setColList(res.data.data.items ?? []);
      setColTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setColLoading(false); }
  }, [colStatutFilter]);

  useEffect(() => { loadMain(); }, []);
  useEffect(() => {
    if (!periodeInitialized.current) { periodeInitialized.current = true; return; }
    loadStats(periode);
  }, [periode]);
  useEffect(() => {
    if (tab === 'utilisateurs') { setUsersPage(1); loadUsers(usersWilaya, 1, usersSearch); }
  }, [tab, usersWilaya, usersSearch]);
  useEffect(() => {
    if (tab === 'utilisateurs' && usersPage > 1) loadUsers(usersWilaya, usersPage, usersSearch);
  }, [usersPage]);

  useEffect(() => {
    if (tab === 'associations') loadAssociations(assocPage);
  }, [tab, assocPage]);

  useEffect(() => {
    if (tab === 'points') { setPointsPage(1); loadPoints(1, pointsWilaya, pointsStatut, pointsTypeFilter, pointsSearch); loadPropositions(); }
  }, [tab, pointsWilaya, pointsStatut, pointsTypeFilter, pointsSearch]);

  useEffect(() => {
    if (tab === 'points' && pointsPage > 1) loadPoints(pointsPage);
  }, [pointsPage]);

  useEffect(() => {
    if (tab === 'signalements' && signalMode === 'a_resoudre') loadResoudre(signalSearch);
  }, [tab, signalMode, signalSearch]);

  useEffect(() => {
    if (tab === 'employes') { setEmpPage(1); loadEmployes(1, empWilaya, empStatut); }
  }, [tab, empWilaya, empStatut]);
  useEffect(() => { if (tab === 'evenements') { setEvPage(1); loadEvenements(1); } }, [tab]);
  useEffect(() => { if (tab === 'employes' && empPage > 1) loadEmployes(empPage); }, [empPage]);

  useEffect(() => {
    if (tab === 'camions') { setCamPage(1); loadCamions(1, camWilaya, camStatut); }
  }, [tab, camWilaya, camStatut]);
  useEffect(() => { if (tab === 'camions' && camPage > 1) loadCamions(camPage); }, [camPage]);

  useEffect(() => {
    if (tab === 'collectes') { setColPage(1); loadCollectes(1, colStatutFilter); }
  }, [tab, colStatutFilter]);
  useEffect(() => { if (tab === 'collectes' && colPage > 1) loadCollectes(colPage); }, [colPage]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox(l => l && l.index < l.urls.length - 1 ? { ...l, index: l.index + 1 } : l);
      if (e.key === 'ArrowLeft')  setLightbox(l => l && l.index > 0 ? { ...l, index: l.index - 1 } : l);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  const logout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('role');
    navigate('/admin/login');
  };

  const closeDetail = () => setDetail(null);
  const action = async (fn: () => Promise<any>) => {
    await fn();
    closeDetail();
    loadMain();
    if (MODERATION_TABS.includes(tab)) loadModTab(tab, modPage);
  };

  const pendingCounts: Record<string, number> = {
    associations: queue?.associations.length ?? 0,
    evenements:   queue?.evenements.length ?? 0,
    signalements: queue?.signalements.length ?? 0,
  };
  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  const filteredModItems = () => {
    let items = modItems;
    if (wilayaFilter) items = items.filter(i => i.wilaya === wilayaFilter);
    if (typeFilter.length > 0)
      items = items.filter(i => Array.isArray(i.type_dechet) && typeFilter.some(t => i.type_dechet.includes(t)));
    if (degreFilter.length > 0)
      items = items.filter(i => degreFilter.includes(i.degre_pollution));
    return items;
  };

  return (
    <div style={s.layout}>
      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logo}>
            <span style={{ fontSize: 22 }}>🌿</span>
            <span>EcoTrack</span>
          </div>
          <div style={s.roleTag}>
            <MdAdminPanelSettings size={13} />
            Administrateur
          </div>
        </div>
        <nav style={s.nav}>
          {TABS.map((t, i) => {
            const n = pendingCounts[t.id] ?? 0;
            const prevGroup = TABS[i - 1]?.group;
            const showSeparator = t.group && t.group !== prevGroup;
            return (
              <div key={t.id}>
                {showSeparator && (
                  <div style={{ padding: '14px 16px 4px', fontSize: 10, fontWeight: 800, color: Colors.grey, textTransform: 'uppercase' as const, letterSpacing: '0.10em' }}>
                    {t.group}
                  </div>
                )}
                <button
                  style={{ ...s.navItem, ...(tab === t.id ? s.navActive : {}) }}
                  onClick={() => {
                    setTab(t.id);
                    setSearchParams({ tab: t.id });
                    setWilayaFilter('');
                    setTypeFilter([]);
                    setDegreFilter([]);
                    if (MODERATION_TABS.includes(t.id)) { setModPage(1); loadModTab(t.id, 1); }
                    if (t.id === 'evenements') { setEvPage(1); loadEvenements(1); }
                    if (t.id === 'config') loadConfig();
                  }}
                >
                  <span style={s.navIcon}>{TAB_ICONS[t.id]}</span>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {n > 0 && <span style={s.badge}>{n}</span>}
                </button>
              </div>
            );
          })}
        </nav>
        <div style={s.sideBottom}>
          {totalPending > 0 && (
            <div style={s.pendingAlert}>
              <MdNotificationsActive size={15} />
              <span>{totalPending} en attente</span>
            </div>
          )}
          <button style={s.logoutBtn} onClick={logout}>
            <MdLogout size={15} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>
        {newCritiques.length > 0 && (
          <div style={s.critiqueBanner}>
            <MdCrisisAlert size={22} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              {newCritiques.length} nouveau{newCritiques.length > 1 ? 'x' : ''} signalement{newCritiques.length > 1 ? 's' : ''} critique{newCritiques.length > 1 ? 's' : ''} en attente de modération
            </span>
            <button
              onClick={() => {
                setTab('signalements');
                setSearchParams({ tab: 'signalements' });
                setSignalMode('moderation');
                if (newCritiques.length > 0) setDetail({ item: newCritiques[0], type: 'signalements' });
                setNewCritiques([]);
              }}
              style={s.critiqueBtn}
            >Voir</button>
            <button onClick={() => setNewCritiques([])} style={s.critiqueDismiss}><MdClose size={16} /></button>
          </div>
        )}
        {loading ? <Spinner color={Colors.purple} /> : (
          <>
            {/* ── Carte ── */}
            {tab === 'carte' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Carte interactive</h2>
                    <p style={s.pageSubtitle}>Signalements, points de collecte et événements géolocalisés</p>
                  </div>
                </div>
                <AdminMap />
              </div>
            )}

            {/* ── Stats ── */}
            {tab === 'stats' && stats && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Tableau de bord</h2>
                    <p style={s.pageSubtitle}>Vue d'ensemble de la plateforme</p>
                  </div>
                  <div style={s.periodeRow}>
                    {(['tout', 'semaine', 'mois'] as const).map(p => (
                      <button key={p}
                        style={{ ...s.periodePill, ...(periode === p ? s.periodeActive : {}) }}
                        onClick={() => setPeriode(p)}>
                        {p === 'tout' ? 'Tout' : p === 'semaine' ? 'Semaine' : 'Mois'}
                      </button>
                    ))}
                  </div>
                </div>
                {statsLoading ? <Spinner color={Colors.purple} /> : (
                  <>
                    <div style={s.statsGrid}>
                      <StatCard icon={<MdPeople size={22} />} label={periode === 'tout' ? 'Citoyens inscrits' : 'Nouveaux citoyens'} value={stats.nb_citoyens} color={Colors.blue} bg={Colors.blueLight} />
                      <StatCard icon={<MdBusiness size={22} />} label={periode === 'tout' ? 'Associations validées' : 'Nouvelles associations'} value={stats.nb_associations} color={Colors.primary} bg={Colors.primaryLight} />
                      <StatCard icon={<MdEvent size={22} />} label={periode === 'tout' ? 'Événements publiés' : 'Nouveaux événements'} value={stats.nb_evenements_publies} color={Colors.purple} bg={Colors.purpleLight} />
                      <StatCard icon={<MdVerified size={22} />} label={periode === 'tout' ? 'Participations validées' : 'Nouvelles participations'} value={stats.nb_participations} color={Colors.primaryMedium} bg={Colors.greenLight} />
                      <StatCard icon={<MdLocationOn size={22} />} label={periode === 'tout' ? 'Points de collecte actifs' : 'Nouveaux points actifs'} value={stats.nb_points_collecte} color={Colors.primary} bg={Colors.primaryLight} />
                      <StatCard icon={<MdNotificationsActive size={22} />} label="En attente (modération)" value={totalPending} color={Colors.red} bg={Colors.redLight} />
                    </div>
                    <div style={{ marginTop: 24 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: Colors.primaryDark, marginBottom: 14 }}>
                        Signalements — {periode === 'tout' ? 'total' : periode === 'semaine' ? 'semaine en cours' : 'mois en cours'}
                      </p>
                      <div style={s.statsGrid}>
                        <StatCard icon={<MdReportProblem size={22} />} label="Total" value={stats.nb_signalements} color={Colors.orange} bg={Colors.orangeLight} />
                        <StatCard icon={<MdAssignment size={22} />} label="En attente" value={stats.nb_signalements_en_attente} color={Colors.orange} bg={Colors.orangeLight} />
                        <StatCard icon={<MdVerified size={22} />} label="Publiés" value={stats.nb_signalements_publies} color={Colors.primary} bg={Colors.primaryLight} />
                        <StatCard icon={<MdCheck size={22} />} label="Résolus" value={stats.nb_signalements_resolus} color={Colors.primaryMedium} bg={Colors.greenLight} />
                        <StatCard icon={<MdCrisisAlert size={22} />} label="Critiques (≥4)" value={stats.nb_signalements_critiques} color={Colors.red} bg={Colors.redLight} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Associations ── */}
            {tab === 'associations' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Associations</h2>
                    <p style={s.pageSubtitle}>{assocTotal} association{assocTotal !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {assocLoading ? <Spinner color={Colors.purple} /> : !assocList.length ? (
                  <EmptyState icon={<MdBusiness size={16} />} message="Aucune association" />
                ) : (
                  <>
                    <div style={s.list}>
                      {assocList.map((a) => (
                        <div key={a.id} style={r.card}>
                          <div style={{ ...r.icon, background: Colors.blue + '18', color: Colors.blue }}><MdBusiness size={20} /></div>
                          <div style={r.info}>
                            <p style={r.title}>{a.nom}</p>
                            <p style={r.meta}>{a.email}{a.wilaya ? ` · ${a.wilaya}` : ''}</p>
                            <p style={r.date}>{new Date(a.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
                              background: a.statut === 'validee' ? Colors.primaryLight : a.statut === 'rejetee' ? Colors.redLight : Colors.orangeLight,
                              color: a.statut === 'validee' ? Colors.primary : a.statut === 'rejetee' ? Colors.red : Colors.orange,
                            }}>{a.statut === 'en_attente' ? 'En attente' : a.statut === 'validee' ? 'Validée' : 'Rejetée'}</span>
                            <SmallBtn color={Colors.blue} onClick={() => setDetail({ item: a, type: 'associations' })}><MdVisibility size={16} /></SmallBtn>
                            {a.statut === 'en_attente' && (
                              <>
                                <SmallBtn color={Colors.primary} onClick={() => action(() => modererAssociation(a.id, 'validee')).then(() => loadAssociations(assocPage))}><MdCheck size={16} /></SmallBtn>
                                <SmallBtn color={Colors.orange} onClick={() => { setRejectTarget(a.id); setRejectMotif(''); }}><MdClose size={16} /></SmallBtn>
                              </>
                            )}
                            <SmallBtn color={Colors.red} onClick={() => setDeleteAssocTarget(a.id)}><MdDelete size={16} /></SmallBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Paginator page={assocPage} total={assocTotal} pageSize={ASSOC_PAGE_SIZE} onChange={setAssocPage} />
                  </>
                )}
              </div>
            )}

            {/* ── Points de collecte ── */}
            {tab === 'points' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Points de collecte</h2>
                    <p style={s.pageSubtitle}>
                      {propositionsTotal > 0 && <span style={{ color: Colors.orange, fontWeight: 700 }}>{propositionsTotal} proposition{propositionsTotal !== 1 ? 's' : ''} en attente · </span>}
                      {pointsTotal} point{pointsTotal !== 1 ? 's' : ''} actifs/inactifs
                    </p>
                  </div>
                  {pointsSubTab === 'actifs' && (
                    <button style={s.createBtn} onClick={() => {
                      setShowCreatePoint(true); setCreatePointError('');
                      setHorairesBuilder({ jours: [], ouverture: '08:00', fermeture: '17:00' });
                      setCreatePointForm({ nom: '', wilaya: '', adresse: '', horaires: '', latitude: '', longitude: '', type_dechet: [] });
                    }}><MdAdd size={18} /> Nouveau point</button>
                  )}
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', borderBottom: `2px solid ${Colors.greyBorder}`, marginBottom: 24 }}>
                  {([
                    { id: 'propositions' as const, label: `Propositions citoyens${propositionsTotal > 0 ? ` (${propositionsTotal})` : ''}` },
                    { id: 'actifs' as const, label: 'Gestion des points de collecte' },
                  ]).map(st => (
                    <button key={st.id} onClick={() => setPointsSubTab(st.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '10px 22px', fontSize: 14, fontWeight: 700,
                      color: pointsSubTab === st.id ? Colors.primary : Colors.grey,
                      borderBottom: pointsSubTab === st.id ? `2px solid ${Colors.primary}` : '2px solid transparent',
                      marginBottom: -2,
                    }}>{st.label}</button>
                  ))}
                </div>

                {/* Propositions sub-tab */}
                {pointsSubTab === 'propositions' && (
                  propositionsLoading ? <Spinner color={Colors.primary} /> :
                  !propositionsList.length ? (
                    <EmptyState icon={<MdLocationOn size={56} />} message="Aucune proposition en attente" />
                  ) : (
                    <div style={s.list}>
                      {propositionsList.map(p => {
                        const types: string[] = Array.isArray(p.type_dechet) ? p.type_dechet : [];
                        return (
                          <div key={p.id} style={r.card}>
                            <div style={{ ...r.icon, background: Colors.orangeLight, color: Colors.orange }}><MdLocationOn size={20} /></div>
                            <div style={r.info}>
                              <p style={r.title}>{p.wilaya ?? 'Wilaya non précisée'}{p.adresse ? ` · ${p.adresse}` : ''}</p>
                              <p style={r.meta}>{types.join(', ')}</p>
                              {p.note_citoyen && <p style={{ ...r.meta, fontStyle: 'italic', marginTop: 2, color: Colors.grey }}>"{p.note_citoyen}"</p>}
                              <p style={r.date}>{new Date(p.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <button
                                style={{ background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                                onClick={() => { setAcceptTarget(p); setAcceptNom(''); setAcceptHoraires(''); setAcceptHorairesBuilder({ jours: [], ouverture: '08:00', fermeture: '17:00' }); }}
                              ><MdCheck size={15} /> Accepter</button>
                              <button
                                style={{ background: 'none', color: Colors.red, border: `1.5px solid ${Colors.red}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                                onClick={() => setRejectPointTarget(p)}
                              ><MdClose size={15} /> Rejeter</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* Gestion sub-tab */}
                {pointsSubTab === 'actifs' && (
                  <>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 20, alignItems: 'center' }}>
                      <div style={{ ...s.searchWrap, minWidth: 220 }}>
                        <span style={s.searchIcon}><MdSearch size={16} /></span>
                        <input style={s.searchInput} placeholder="Rechercher nom, adresse..." value={pointsSearch} onChange={e => setPointsSearch(e.target.value)} />
                        {pointsSearch && <button onClick={() => setPointsSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.grey, display: 'flex', alignItems: 'center' }}><MdClose size={15} /></button>}
                      </div>
                      <div style={s.searchWrap}>
                        <span style={s.searchIcon}><MdLocationOn size={16} /></span>
                        <select style={s.searchInput} value={pointsWilaya} onChange={e => setPointsWilaya(e.target.value)}>
                          <option value="">Toutes les wilayas</option>
                          {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
                        </select>
                      </div>
                      <div style={s.searchWrap}>
                        <span style={s.searchIcon}><MdFilterList size={16} /></span>
                        <select style={s.searchInput} value={pointsStatut} onChange={e => setPointsStatut(e.target.value)}>
                          <option value="">Tous les statuts</option>
                          <option value="actif">Actif</option>
                          <option value="inactif">Inactif</option>
                        </select>
                      </div>
                      <div style={s.searchWrap}>
                        <span style={s.searchIcon}><MdRecycling size={16} /></span>
                        <select style={s.searchInput} value={pointsTypeFilter} onChange={e => setPointsTypeFilter(e.target.value)}>
                          <option value="">Tous les types</option>
                          {TYPES_DECHET.map(t => <option key={t.value} value={t.value}>{t.icon} {t.value}</option>)}
                        </select>
                      </div>
                      {(pointsWilaya || pointsStatut || pointsTypeFilter) && (
                        <button style={s.chipClear} onClick={() => { setPointsWilaya(''); setPointsStatut(''); setPointsTypeFilter(''); }}>
                          ✕ Effacer les filtres
                        </button>
                      )}
                    </div>
                    {pointsLoading ? <Spinner color={Colors.primary} /> : !pointsList.length ? (
                      <EmptyState icon={<MdLocationOn size={56} />} message="Aucun point de collecte" />
                    ) : (
                      <>
                        <div style={s.list}>
                          {pointsList.map(p => {
                            const types: string[] = Array.isArray(p.type_dechet) ? p.type_dechet : [];
                            const isActif = p.statut === 'actif';
                            return (
                              <div key={p.id} style={r.card}>
                                <div style={{ ...r.icon, background: Colors.primary + '18', color: Colors.primary }}><MdLocationOn size={20} /></div>
                                <div style={r.info}>
                                  <p style={r.title}>{p.nom}</p>
                                  <p style={r.meta}>{p.wilaya ? `${p.wilaya} · ` : ''}{types.slice(0, 3).join(', ')}</p>
                                  <p style={r.date}>{new Date(p.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, background: isActif ? Colors.primaryLight : Colors.greyLight, color: isActif ? Colors.primary : Colors.grey }}>
                                    {isActif ? 'Actif' : 'Inactif'}
                                  </span>
                                  <SmallBtn color={isActif ? Colors.orange : Colors.primary}
                                    onClick={() => action(() => modererPointCollecte(p.id, isActif ? 'inactif' : 'actif')).then(() => loadPoints(pointsPage))}>
                                    {isActif ? <MdWarning size={15} /> : <MdCheck size={15} />}
                                  </SmallBtn>
                                  <SmallBtn color={Colors.purple} onClick={() => {
                                    setEditPointTarget(p);
                                    setEditPointForm({
                                      nom: p.nom ?? '', wilaya: p.wilaya ?? '', adresse: p.adresse ?? '',
                                      horaires: p.horaires ?? '',
                                      type_dechet: Array.isArray(p.type_dechet) ? [...p.type_dechet] : [],
                                    });
                                    setEditHorairesBuilder(parseHoraires(p.horaires ?? ''));
                                    setEditPointError('');
                                  }}><MdEdit size={16} /></SmallBtn>
                                  <SmallBtn color={Colors.red} onClick={() => setDeletePointTarget(p.id)}><MdDelete size={16} /></SmallBtn>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Paginator page={pointsPage} total={pointsTotal} pageSize={POINTS_PAGE_SIZE} onChange={setPointsPage} />
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Moderation lists ── */}
            {MODERATION_TABS.includes(tab) && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>{TABS.find(t => t.id === tab)?.label}</h2>
                    <p style={s.pageSubtitle}>
                      {modTotal > 0 ? `${modTotal} élément${modTotal > 1 ? 's' : ''} en attente de modération` : 'File vide'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                    {tab === 'signalements' && (
                      <div style={{ ...s.searchWrap, minWidth: 220 }}>
                        <span style={s.searchIcon}><MdSearch size={16} /></span>
                        <input style={s.searchInput} placeholder="Rechercher titre, description..." value={signalSearch} onChange={e => setSignalSearch(e.target.value)} />
                        {signalSearch && <button onClick={() => setSignalSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.grey, fontSize: 14, padding: '0 4px' }}>✕</button>}
                      </div>
                    )}
                    <div style={s.searchWrap}>
                      <span style={s.searchIcon}><MdLocationOn size={16} /></span>
                      <select style={s.searchInput} value={wilayaFilter} onChange={(e) => setWilayaFilter(e.target.value)}>
                        <option value=''>Toutes les wilayas</option>
                        {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mode toggle + filtres — signalements only */}
                {tab === 'signalements' && (
                  <>
                    <div style={{ ...s.chipsRow, marginBottom: 8 }}>
                      {([
                        ['moderation',  <MdHourglassEmpty size={14} />, 'En attente de modération'],
                        ['a_resoudre',  <MdHandyman size={14} />,       'Publiés — à résoudre'],
                      ] as const).map(([mode, icon, label]) => (
                        <button key={mode}
                          style={{ ...s.chip, ...(signalMode === mode ? { borderColor: Colors.purple, background: Colors.purpleLight, color: Colors.purple, fontWeight: 700 } : {}) }}
                          onClick={() => { setSignalMode(mode as typeof signalMode); setDegreFilter([]); setPhotoResFilter(false); }}
                        >{icon}{label}</button>
                      ))}
                    </div>
                    <div style={s.chipsRow}>
                      {[1,2,3,4,5].map(d => {
                        const active = degreFilter.includes(d);
                        return (
                          <button key={d}
                            style={{ ...s.chip, ...(active ? { borderColor: DEGRE_COLORS[d], background: DEGRE_BG[d], color: DEGRE_COLORS[d] } : {}) }}
                            onClick={() => toggleDegre(d)}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: DEGRE_COLORS[d], display: 'inline-block', flexShrink: 0 }} />
                            <span>{d} — {DEGRE_LABELS[d]}</span>
                          </button>
                        );
                      })}
                      {degreFilter.length > 0 && (
                        <button style={s.chipClear} onClick={() => setDegreFilter([])}>✕ Effacer</button>
                      )}
                    </div>
                    {signalMode === 'a_resoudre' && (
                      <div style={{ ...s.chipsRow, marginTop: 6 }}>
                        <button
                          style={{ ...s.chip, ...(photoResFilter ? { borderColor: Colors.primary, background: Colors.primaryLight, color: Colors.primary, fontWeight: 700 } : {}) }}
                          onClick={() => setPhotoResFilter(v => !v)}
                        >
                          <MdCameraAlt size={14} /> Avec photos après nettoyage
                        </button>
                        {photoResFilter && (
                          <button style={s.chipClear} onClick={() => setPhotoResFilter(false)}>✕ Effacer</button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Type déchets chips — points de collecte only */}
                {tab === 'points' && (
                  <div style={s.chipsRow}>
                    {TYPES_DECHET.map(t => {
                      const active = typeFilter.includes(t.value);
                      return (
                        <button
                          key={t.value}
                          style={{ ...s.chip, ...(active ? { borderColor: t.color, background: t.color + '15', color: t.color } : {}) }}
                          onClick={() => toggleType(t.value)}
                        >
                          <span style={{ display: 'flex', alignItems: 'center' }}>{DECHET_ICONS[t.value]}</span>
                          <span>{t.value}</span>
                        </button>
                      );
                    })}
                    {typeFilter.length > 0 && (
                      <button style={s.chipClear} onClick={() => setTypeFilter([])}>✕ Effacer</button>
                    )}
                  </div>
                )}

                {tab === 'signalements' && signalMode === 'a_resoudre' ? (
                  resoudreLoading ? <Spinner color={Colors.purple} /> : (() => {
                    const filtered = resoudreItems.filter(i => {
                      if (wilayaFilter && i.wilaya !== wilayaFilter) return false;
                      if (degreFilter.length > 0 && !degreFilter.includes(i.degre_pollution)) return false;
                      if (photoResFilter && !hasResolutionPhotos(i)) return false;
                      return true;
                    });
                    return !filtered.length
                      ? <EmptyState icon={<MdVerified size={56} />} message="Aucun signalement publié à résoudre" />
                      : (
                        <div style={s.list}>
                          {filtered.map(item => (
                            <ItemRow key={item.id} item={item} type="signalements"
                              onDetail={() => setDetail({ item, type: 'signalements' })}
                              onValidate={() => action(() => modererSignalement(item.id, 'resolu')).then(() => loadResoudre())}
                              onReject={() => action(() => modererSignalement(item.id, 'rejete')).then(() => loadResoudre())}
                            />
                          ))}
                        </div>
                      );
                  })()
                ) : (
                  modLoading ? <Spinner color={Colors.purple} /> : !filteredModItems().length ? (
                    wilayaFilter
                      ? <EmptyState icon={<MdSearch size={56} />} message={`Aucun résultat pour « ${wilayaFilter} »`} />
                      : <EmptyState icon={<MdVerified size={56} />} message="File vide — rien à modérer" />
                  ) : (
                    <>
                      {tab === 'points' && filteredModItems().length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                          <button
                            style={{ background: Colors.red, color: Colors.white, border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            onClick={async () => {
                              if (!window.confirm(`Rejeter les ${filteredModItems().length} point(s) de collecte en attente ?`)) return;
                              await Promise.all(filteredModItems().map(item => modererPointCollecte(item.id, 'inactif').catch(() => {})));
                              loadModTab('points', modPage);
                            }}
                          >
                            Tout rejeter ({filteredModItems().length})
                          </button>
                        </div>
                      )}
                      <div style={s.list}>
                        {filteredModItems().map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            type={tab}
                            onDetail={() => setDetail({ item, type: tab })}
                            onValidate={() => {
                              if (tab === 'signalements') action(() => modererSignalement(item.id, 'publie'));
                              if (tab === 'points')       { setAcceptTarget(item); setAcceptNom(''); setAcceptHoraires(''); }
                            }}
                            onReject={() => {
                              if (tab === 'signalements') action(() => modererSignalement(item.id, 'rejete', 'Rejeté par l\'administrateur'));
                              if (tab === 'points')       action(() => modererPointCollecte(item.id, 'inactif'));
                            }}
                          />
                        ))}
                      </div>
                      <Paginator page={modPage} total={modTotal} pageSize={MOD_PAGE_SIZE} onChange={p => { setModPage(p); loadModTab(tab, p); }} />
                    </>
                  )
                )}
              </div>
            )}

            {/* ── Utilisateurs ── */}
            {tab === 'utilisateurs' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Utilisateurs</h2>
                    <p style={s.pageSubtitle}>{usersTotal > 0 ? `${usersTotal} citoyens inscrits` : 'Aucun utilisateur'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <div style={{ ...s.searchWrap, minWidth: 220 }}>
                      <span style={s.searchIcon}><MdSearch size={16} /></span>
                      <input
                        style={s.searchInput}
                        placeholder="Rechercher nom, prénom, téléphone..."
                        value={usersSearch}
                        onChange={e => setUsersSearch(e.target.value)}
                      />
                      {usersSearch && <button onClick={() => setUsersSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.grey, fontSize: 14, padding: '0 4px' }}>✕</button>}
                    </div>
                    <div style={s.searchWrap}>
                      <span style={s.searchIcon}><MdLocationOn size={16} /></span>
                      <select style={s.searchInput} value={usersWilaya} onChange={(e) => { setUsersWilaya(e.target.value); setUsersPage(1); }}>
                        <option value=''>Toutes les wilayas</option>
                        {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {usersLoading ? <Spinner color={Colors.blue} /> : !users.length ? (
                  <EmptyState icon={<MdPeople size={56} />} message="Aucun utilisateur trouvé" />
                ) : (
                  <>
                    <div style={s.list}>
                      {users.map((u, i) => {
                        const rank = (usersPage - 1) * USERS_PAGE_SIZE + i + 1;
                        const isBanned = u.actif === false;
                        return (
                          <div key={u.id} style={{ ...s.userCard, ...(isBanned ? { opacity: 0.6, background: Colors.redLight } : {}) }}>
                            <div style={{ ...s.userRank, color: isBanned ? Colors.red : Colors.grey, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isBanned ? <MdBlock size={16} /> : `#${rank}`}
                            </div>
                            <div style={{ ...s.userAvatar, background: isBanned ? Colors.red + '22' : undefined, color: isBanned ? Colors.red : undefined }}>
                              {(u.prenom?.[0] ?? '?').toUpperCase()}{(u.nom?.[0] ?? '').toUpperCase()}
                            </div>
                            <div style={s.userInfo}>
                              <p style={s.userName}>{u.prenom} {u.nom}</p>
                              <p style={{ ...s.userMeta, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {u.wilaya ? <><MdLocationOn size={13} />{u.wilaya}</> : 'Wilaya non renseignée'}
                                {u.telephone ? ` · ${u.telephone}` : ''}
                              </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                              <div style={{ textAlign: 'right' as const }}>
                                <span style={s.userPts}>{(u.points_total ?? 0).toLocaleString('fr-DZ')} pts</span>
                                <span style={{ ...s.userNiv, display: 'block', marginTop: 4 }}>Niveau {u.niveau}</span>
                              </div>
                              <button
                                onClick={() => setBanTarget({ id: u.id, nom: u.nom, prenom: u.prenom, actif: u.actif !== false })}
                                style={{ background: (isBanned ? Colors.primary : Colors.red) + '15', color: isBanned ? Colors.primary : Colors.red, border: `1.5px solid ${(isBanned ? Colors.primary : Colors.red)}30`, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const }}
                              >
                                {isBanned
                                  ? <><MdPersonAdd size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Réactiver</>
                                  : <><MdBlock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Bannir</>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Paginator page={usersPage} total={usersTotal} pageSize={USERS_PAGE_SIZE} onChange={setUsersPage} />
                  </>
                )}
              </div>
            )}

            {/* ── Employés ── */}
            {tab === 'employes' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Employés</h2>
                    <p style={s.pageSubtitle}>{empTotal} employé{empTotal !== 1 ? 's' : ''}</p>
                  </div>
                  <button style={s.createBtn} onClick={() => { setShowCreateEmp(true); setEmpForm({ nom: '', prenom: '', telephone: '', wilaya: '' }); setEmpFormError(''); }}>
                    + Nouvel employé
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 20 }}>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>📍</span>
                    <select style={s.searchInput} value={empWilaya} onChange={e => setEmpWilaya(e.target.value)}>
                      <option value="">Toutes les wilayas</option>
                      {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
                    </select>
                  </div>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>🔘</span>
                    <select style={s.searchInput} value={empStatut} onChange={e => setEmpStatut(e.target.value)}>
                      <option value="">Tous les statuts</option>
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  </div>
                </div>
                {empLoading ? <Spinner color={Colors.primary} /> : !empList.length ? (
                  <EmptyState icon={<MdEngineering size={16} />} message="Aucun employé" />
                ) : (
                  <>
                    <div style={s.list}>
                      {empList.map(e => (
                        <div key={e.id} style={r.card}>
                          <div style={{ ...r.icon, background: Colors.blue + '18', color: Colors.blue }}>👷</div>
                          <div style={r.info}>
                            <p style={r.title}>{e.prenom} {e.nom}</p>
                            <p style={r.meta}>{e.telephone}{e.wilaya ? ` · ${e.wilaya}` : ''}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, background: e.statut === 'actif' ? Colors.primaryLight : Colors.greyLight, color: e.statut === 'actif' ? Colors.primary : Colors.grey }}>
                              {e.statut}
                            </span>
                            <SmallBtn color={Colors.purple} onClick={() => {
                              setEditEmpTarget(e);
                              setEmpForm({ nom: e.nom, prenom: e.prenom, telephone: e.telephone, wilaya: e.wilaya ?? '' });
                              setEmpFormError('');
                            }}><MdEdit size={16} /></SmallBtn>
                            <SmallBtn color={e.statut === 'actif' ? Colors.orange : Colors.primary}
                              onClick={() => modifierEmploye(e.id, { statut: e.statut === 'actif' ? 'inactif' : 'actif' }).then(() => loadEmployes(empPage))}>
                              {e.statut === 'actif' ? <MdWarning size={15} /> : <MdCheck size={15} />}
                            </SmallBtn>
                            <SmallBtn color={Colors.red} onClick={() => setDeleteEmpTarget(e.id)}><MdDelete size={16} /></SmallBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Paginator page={empPage} total={empTotal} pageSize={FLEET_PAGE_SIZE} onChange={setEmpPage} />
                  </>
                )}
              </div>
            )}

            {/* ── Camions ── */}
            {tab === 'camions' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Camions</h2>
                    <p style={s.pageSubtitle}>{camTotal} camion{camTotal !== 1 ? 's' : ''}</p>
                  </div>
                  <button style={s.createBtn} onClick={() => { setShowCreateCam(true); setCamForm({ immatriculation: '', capacite: '', wilaya: '' }); setCamFormError(''); }}>
                    + Nouveau camion
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 20 }}>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>📍</span>
                    <select style={s.searchInput} value={camWilaya} onChange={e => setCamWilaya(e.target.value)}>
                      <option value="">Toutes les wilayas</option>
                      {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
                    </select>
                  </div>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>🔘</span>
                    <select style={s.searchInput} value={camStatut} onChange={e => setCamStatut(e.target.value)}>
                      <option value="">Tous les statuts</option>
                      <option value="disponible">Disponible</option>
                      <option value="en_service">En service</option>
                      <option value="en_maintenance">En maintenance</option>
                    </select>
                  </div>
                </div>
                {camLoading ? <Spinner color={Colors.primary} /> : !camList.length ? (
                  <EmptyState icon={<MdLocalShipping size={16} />} message="Aucun camion" />
                ) : (
                  <>
                    <div style={s.list}>
                      {camList.map(c => {
                        const statutColor = c.statut === 'disponible' ? Colors.primary : c.statut === 'en_service' ? Colors.orange : Colors.red;
                        const statutBg    = c.statut === 'disponible' ? Colors.primaryLight : c.statut === 'en_service' ? Colors.orangeLight : Colors.redLight;
                        return (
                          <div key={c.id} style={r.card}>
                            <div style={{ ...r.icon, background: Colors.orange + '18', color: Colors.orange }}>🚛</div>
                            <div style={r.info}>
                              <p style={r.title}>{c.immatriculation}</p>
                              <p style={r.meta}>{c.wilaya ?? '—'}{c.capacite ? ` · ${c.capacite} m³` : ''}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, background: statutBg, color: statutColor }}>
                                {c.statut.replace('_', ' ')}
                              </span>
                              <SmallBtn color={Colors.purple} onClick={() => {
                                setEditCamTarget(c);
                                setCamForm({ immatriculation: c.immatriculation, capacite: c.capacite?.toString() ?? '', wilaya: c.wilaya ?? '' });
                                setCamFormError('');
                              }}><MdEdit size={16} /></SmallBtn>
                              <SmallBtn color={Colors.red} onClick={() => setDeleteCamTarget(c.id)}><MdDelete size={16} /></SmallBtn>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Paginator page={camPage} total={camTotal} pageSize={FLEET_PAGE_SIZE} onChange={setCamPage} />
                  </>
                )}
              </div>
            )}

            {/* ── Collectes ── */}
            {tab === 'collectes' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Planification des collectes</h2>
                    <p style={s.pageSubtitle}>{colTotal} collecte{colTotal !== 1 ? 's' : ''}</p>
                  </div>
                  <button style={s.createBtn} onClick={async () => {
                    const [eRes, cRes] = await Promise.all([getEmployes(1, 200), getCamions(1, 200)]);
                    setEmpAll(eRes.data.data.items ?? []);
                    setCamAll(cRes.data.data.items ?? []);
                    setColForm({ employe_id: '', camion_id: '', date_prevue: '', creneau: '', notes: '', signalement_id: '' });
                    setColFormError('');
                    setShowCreateCol(true);
                  }}>
                    + Planifier une collecte
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 20 }}>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>🔘</span>
                    <select style={s.searchInput} value={colStatutFilter} onChange={e => setColStatutFilter(e.target.value)}>
                      <option value="">Tous les statuts</option>
                      <option value="planifiee">Planifiée</option>
                      <option value="en_cours">En cours</option>
                      <option value="terminee">Terminée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                  </div>
                </div>
                {colLoading ? <Spinner color={Colors.primary} /> : !colList.length ? (
                  <EmptyState icon={<MdAssignment size={16} />} message="Aucune collecte planifiée" />
                ) : (
                  <>
                    <div style={s.list}>
                      {colList.map(c => {
                        const statutColor: Record<string, string> = { planifiee: Colors.orange, en_cours: Colors.blue, terminee: Colors.primary, annulee: Colors.red };
                        const statutBg: Record<string, string>    = { planifiee: Colors.orangeLight, en_cours: Colors.blueLight, terminee: Colors.primaryLight, annulee: Colors.redLight };
                        const sc = statutColor[c.statut] ?? Colors.grey;
                        const sb = statutBg[c.statut]    ?? Colors.greyLight;
                        return (
                          <div key={c.id} style={r.card}>
                            <div style={{ ...r.icon, background: sc + '22', color: sc }}>📋</div>
                            <div style={r.info}>
                              <p style={r.title}>
                                {c.employe ? `${c.employe.prenom} ${c.employe.nom}` : '—'}
                                {c.camion ? ` · 🚛 ${c.camion.immatriculation}` : ''}
                              </p>
                              <p style={r.meta}>
                                📅 {c.date_prevue}{c.creneau ? ` · ${c.creneau}` : ''}
                                {c.signalement ? ` · ⚠️ ${c.signalement.titre}` : ''}
                              </p>
                              {c.notes && <p style={{ ...r.date, fontStyle: 'italic' }}>{c.notes}</p>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                              <span style={{ borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, background: sb, color: sc }}>
                                {c.statut.replace('_', ' ')}
                              </span>
                              {c.statut === 'planifiee' && (
                                <SmallBtn color={Colors.blue} onClick={() => modifierStatutCollecte(c.id, 'en_cours').then(() => loadCollectes(colPage))}><MdRefresh size={15} /></SmallBtn>
                              )}
                              {c.statut === 'en_cours' && (
                                <SmallBtn color={Colors.primary} onClick={() => modifierStatutCollecte(c.id, 'terminee').then(() => loadCollectes(colPage))}><MdCheck size={15} /></SmallBtn>
                              )}
                              {(c.statut === 'planifiee' || c.statut === 'en_cours') && (
                                <SmallBtn color={Colors.red} onClick={() => modifierStatutCollecte(c.id, 'annulee').then(() => loadCollectes(colPage))}><MdClose size={15} /></SmallBtn>
                              )}
                              <SmallBtn color={Colors.red} onClick={() => setDeleteColTarget(c.id)}><MdDelete size={16} /></SmallBtn>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Paginator page={colPage} total={colTotal} pageSize={FLEET_PAGE_SIZE} onChange={setColPage} />
                  </>
                )}
              </div>
            )}

            {/* ── Événements ── */}
            {tab === 'evenements' && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <h2 style={s.pageTitle}>Événements</h2>
                    <p style={s.pageSubtitle}>{evTotal} événement{evTotal !== 1 ? 's' : ''} au total</p>
                  </div>
                </div>
                {evLoading ? <Spinner color={Colors.primary} /> : !evList.length ? (
                  <EmptyState icon={<MdEvent size={56} />} message="Aucun événement pour l'instant" />
                ) : (
                  <>
                    <div style={s.list}>
                      {evList.map((ev) => {
                        const isMasque = ev.statut === 'annule';
                        return (
                          <div key={ev.id} style={{ ...r.card, opacity: isMasque ? 0.6 : 1, borderLeft: isMasque ? `4px solid ${Colors.grey}` : `4px solid ${Colors.primary}` }}>
                            {ev.photo
                              ? <img src={ev.photo} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' as const, flexShrink: 0 }} />
                              : <div style={{ width: 56, height: 56, borderRadius: 8, background: Colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: Colors.primary }}><MdEvent size={26} /></div>
                            }
                            <div style={r.info}>
                              <p style={r.title}>{ev.titre}</p>
                              <p style={{ ...r.meta, display: 'flex', alignItems: 'center', gap: 4 }}>{ev.association?.nom}{ev.wilaya ? <><span>·</span><MdLocationOn size={13} />{ev.wilaya}</> : ''}</p>
                              <p style={r.date}>{new Date(ev.date_debut).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              {isMasque ? (
                                <button style={evBtn(Colors.primary)} onClick={() => republierEvenementAdmin(ev.id).then(() => loadEvenements(evPage))}>Republier</button>
                              ) : (
                                <button style={evBtn(Colors.orange)} onClick={() => masquerEvenementAdmin(ev.id).then(() => loadEvenements(evPage))}>Masquer</button>
                              )}
                              <button style={{ background: Colors.red + '15', color: Colors.red, border: `1.5px solid ${Colors.red}40`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteEvTarget(ev.id)} title="Supprimer"><MdDelete size={16} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Paginator page={evPage} total={evTotal} pageSize={EV_PAGE_SIZE} onChange={p => { setEvPage(p); loadEvenements(p); }} />
                  </>
                )}
              </div>
            )}

            {/* ── Configuration points ── */}
            {tab === 'config' && (
              <div style={{ maxWidth: 500 }}>
                <h2 style={s.pageTitle}>Configuration des points</h2>
                <p style={{ fontSize: 13, color: Colors.grey, marginTop: 4, marginBottom: 28, lineHeight: 1.6 }}>
                  Ces valeurs s'appliquent à tous les nouveaux événements et signalements. Les événements déjà créés conservent leurs points.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
                  <ConfigField
                    icon={<MdReportProblem size={20} color={Colors.orange} />}
                    label="Points pour un signalement publié"
                    description="Attribués au citoyen quand son signalement est validé par l'admin"
                    value={configData.points_signalement}
                    onChange={v => setConfigData(d => ({ ...d, points_signalement: v }))}
                  />
                  <ConfigField
                    icon={<MdCrisisAlert size={20} color={Colors.red} />}
                    label="Bonus signalement critique (degré 5)"
                    description="Points supplémentaires pour un signalement de niveau critique"
                    value={configData.points_signalement_critique}
                    onChange={v => setConfigData(d => ({ ...d, points_signalement_critique: v }))}
                  />
                  <ConfigField
                    icon={<MdEvent size={20} color={Colors.blue} />}
                    label="Points pour participation à un événement"
                    description="Attribués au citoyen lors du scan QR de présence"
                    value={configData.points_participation}
                    onChange={v => setConfigData(d => ({ ...d, points_participation: v }))}
                  />
                  <ConfigField
                    icon={<MdOutlineAddLocationAlt size={20} color={Colors.primary} />}
                    label="Points pour proposition de point de collecte"
                    description="Attribués au citoyen quand l'admin accepte sa proposition de point"
                    value={configData.points_proposition_point}
                    onChange={v => setConfigData(d => ({ ...d, points_proposition_point: v }))}
                  />
                </div>
                {configErr && <p style={{ color: Colors.red, fontSize: 13, marginTop: 16 }}>{configErr}</p>}
                {configMsg && <p style={{ color: Colors.primary, fontSize: 13, marginTop: 16 }}>{configMsg}</p>}
                <button
                  style={{ ...s.createBtn, marginTop: 24, opacity: configSaving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={saveConfig}
                  disabled={configSaving}
                >
                  <MdSave size={18} />
                  {configSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>

                <div style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${Colors.greyBorder}` }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: Colors.black, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MdEmojiEvents size={20} color={Colors.orange} /> Récompenses mensuelles — Top 20
                  </h3>
                  <p style={{ fontSize: 13, color: Colors.grey, marginBottom: 20, lineHeight: 1.6 }}>
                    Envoie une notification push aux 20 citoyens ayant le plus de points. À déclencher manuellement en fin de mois.
                  </p>
                  {top20Err && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{top20Err}</p>}
                  {top20Msg && <p style={{ color: Colors.primary, fontSize: 13, marginBottom: 12 }}>{top20Msg}</p>}
                  <button
                    style={{ ...s.createBtn, background: Colors.purple, opacity: top20Loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={handleNotifierTop20}
                    disabled={top20Loading}
                  >
                    <MdNotificationsActive size={18} />
                    {top20Loading ? 'Envoi en cours...' : 'Notifier le top 20'}
                  </button>
                </div>
              </div>
            )}

          </>
        )}
      </main>

      {/* ── Delete event confirm ── */}
      {deleteEvTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 380 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}><MdDelete size={26} /></div>
            <h3 style={s.modalTitle}>Supprimer l'événement ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible. Les participations associées seront également supprimées.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button style={{ ...s.modalBtn, background: Colors.greyLight, color: Colors.grey }} onClick={() => setDeleteEvTarget(null)}>Annuler</button>
              <button style={{ ...s.modalBtn, background: Colors.red, color: Colors.white }} onClick={async () => {
                await supprimerEvenementAdmin(deleteEvTarget!);
                setDeleteEvTarget(null);
                loadEvenements(evPage);
              }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail panel (drawer) ── */}
      {detail && (
        <div style={s.overlay} onClick={closeDetail}>
          <div style={s.panel} onClick={(e) => e.stopPropagation()}>
            <div style={s.panelHeader}>
              <div>
                <h3 style={s.panelTitle}>
                  Détail
                </h3>
                <p style={s.panelSubtitle}>{TABS.find(t => t.id === detail.type)?.label}</p>
              </div>
              <button style={s.closeBtn} onClick={closeDetail}><MdClose size={18} /></button>
            </div>
            <div style={s.panelBody}>
              {detail.type === 'signalements' && (
                <SignalementDetail item={detail.item} onOpenLightbox={(urls, i) => setLightbox({ urls, index: i })} />
              )}
              {detail.type === 'evenements'   && <EvenementDetail item={detail.item} />}
              {detail.type === 'associations' && <AssocDetail     item={detail.item} />}
              {detail.type === 'points'       && (
                <PointDetail item={detail.item} onOpenLightbox={(urls, i) => setLightbox({ urls, index: i })} />
              )}
            </div>
            <div style={s.panelFooter}>
              {detail.type === 'signalements' && signalMode === 'a_resoudre' ? (
                <ActionBtn color={Colors.primary} icon={<MdCheck size={16} />} onClick={async () => {
                  await modererSignalement(detail.item.id, 'resolu'); closeDetail(); loadMain(); loadResoudre();
                }}>Résolu</ActionBtn>
              ) : (
                <>
                  {!(detail.type === 'associations' && detail.item.statut !== 'en_attente') && (
                    <ActionBtn color={Colors.primary} icon={<MdCheck size={16} />} onClick={() => {
                      if (detail.type === 'associations') action(() => modererAssociation(detail.item.id, 'validee'));
                      if (detail.type === 'signalements') action(() => modererSignalement(detail.item.id, 'publie'));
                      if (detail.type === 'points')       { setAcceptTarget(detail.item); setAcceptNom(''); setAcceptHoraires(''); closeDetail(); }
                    }}>Valider</ActionBtn>
                  )}
                  {detail.type === 'signalements' && (
                    <ActionBtn color={Colors.blue} icon={<MdCheck size={16} />} onClick={() => action(() => modererSignalement(detail.item.id, 'resolu'))}>
                      Résolu
                    </ActionBtn>
                  )}
                  {!(detail.type === 'associations' && detail.item.statut !== 'en_attente') && (
                    <ActionBtn color={Colors.red} icon={<MdClose size={16} />} onClick={() => {
                      if (detail.type === 'associations') { setRejectTarget(detail.item.id); setRejectMotif(''); closeDetail(); }
                      else if (detail.type === 'signalements') { setSignalRejectTarget(detail.item.id); setRejectMotif(''); closeDetail(); }
                      else if (detail.type === 'points')       action(() => modererPointCollecte(detail.item.id, 'inactif'));
                    }}>Rejeter</ActionBtn>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create point modal ── */}
      {showCreatePoint && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' as const }}>
            <div style={{ ...s.modalIcon, background: Colors.primaryLight, color: Colors.primary }}><MdAdd size={26} /></div>
            <h3 style={s.modalTitle}>Nouveau point de collecte</h3>
            {createPointError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{createPointError}</p>}
            <input placeholder="Nom *" value={createPointForm.nom} onChange={e => setCreatePointForm(f => ({ ...f, nom: e.target.value }))} style={s.formInput} />
            <select value={createPointForm.wilaya} onChange={e => setCreatePointForm(f => ({ ...f, wilaya: e.target.value }))} style={s.formInput}>
              <option value="">Wilaya *</option>
              {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
            </select>
            <input placeholder="Adresse" value={createPointForm.adresse} onChange={e => setCreatePointForm(f => ({ ...f, adresse: e.target.value }))} style={s.formInput} />
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: Colors.grey, margin: '0 0 6px' }}>Jours d'ouverture</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(j => {
                  const active = horairesBuilder.jours.includes(j);
                  return (
                    <button key={j} type="button"
                      style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${active ? Colors.primary : Colors.greyBorder}`, background: active ? Colors.primaryLight : Colors.white, color: active ? Colors.primary : Colors.grey, fontWeight: active ? 700 : 400, fontSize: 12, cursor: 'pointer' }}
                      onClick={() => setHorairesBuilder(b => {
                        const jours = b.jours.includes(j) ? b.jours.filter(x => x !== j) : [...b.jours, j];
                        const next = { ...b, jours };
                        setCreatePointForm(f => ({ ...f, horaires: computeHoraires(next) }));
                        return next;
                      })}
                    >{j}</button>
                  );
                })}
                <button type="button"
                  style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...horairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven'] }; setHorairesBuilder(next); setCreatePointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}
                >Lun-Ven</button>
                <button type="button"
                  style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...horairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven','Sam'] }; setHorairesBuilder(next); setCreatePointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}
                >Lun-Sam</button>
                <button type="button"
                  style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...horairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] }; setHorairesBuilder(next); setCreatePointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}
                >7j/7</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: Colors.grey }}>De</span>
                <input type="time" value={horairesBuilder.ouverture}
                  onChange={e => { const next = { ...horairesBuilder, ouverture: e.target.value }; setHorairesBuilder(next); setCreatePointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}
                  style={{ ...s.formInput, width: 110, marginBottom: 0 }} />
                <span style={{ fontSize: 12, color: Colors.grey }}>à</span>
                <input type="time" value={horairesBuilder.fermeture}
                  onChange={e => { const next = { ...horairesBuilder, fermeture: e.target.value }; setHorairesBuilder(next); setCreatePointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}
                  style={{ ...s.formInput, width: 110, marginBottom: 0 }} />
              </div>
              {createPointForm.horaires && (
                <p style={{ fontSize: 12, color: Colors.primary, fontWeight: 600, margin: '6px 0 0' }}>→ {createPointForm.horaires}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <input placeholder="Latitude *" type="number" step="any" value={createPointForm.latitude} onChange={e => setCreatePointForm(f => ({ ...f, latitude: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <input placeholder="Longitude *" type="number" step="any" value={createPointForm.longitude} onChange={e => setCreatePointForm(f => ({ ...f, longitude: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <button type="button" onClick={() => {
                const lat = parseFloat(createPointForm.latitude);
                const lng = parseFloat(createPointForm.longitude);
                if (!isNaN(lat) && !isNaN(lng)) setCreatePointMapMarker([lat, lng]);
                setCreatePointMapOpen(true);
              }} style={{ ...s.chip, borderColor: Colors.primary, color: Colors.primary, background: Colors.primaryLight, fontWeight: 700, whiteSpace: 'nowrap', height: 38 }}>
                <MdMap size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Carte
              </button>
            </div>
            <p style={{ fontSize: 11, color: Colors.grey, marginBottom: 10 }}>Types de déchets *</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {TYPES_DECHET.map(t => {
                const active = createPointForm.type_dechet.includes(t.value);
                return (
                  <button key={t.value} type="button"
                    style={{ ...s.chip, ...(active ? { borderColor: t.color, background: t.color + '15', color: t.color, fontWeight: 700 } : {}) }}
                    onClick={() => setCreatePointForm(f => ({
                      ...f,
                      type_dechet: active ? f.type_dechet.filter(x => x !== t.value) : [...f.type_dechet, t.value],
                    }))}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>{DECHET_ICONS[t.value]}</span> {t.value}
                  </button>
                );
              })}
            </div>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setShowCreatePoint(false)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.primary} icon={<MdLocationOn size={16} />}
                disabled={createPointLoading || !createPointForm.nom.trim() || !createPointForm.wilaya || !createPointForm.latitude || !createPointForm.longitude || createPointForm.type_dechet.length === 0}
                onClick={async () => {
                  setCreatePointLoading(true); setCreatePointError('');
                  try {
                    const res = await creerPointCollecte({
                      nom: createPointForm.nom, wilaya: createPointForm.wilaya,
                      adresse: createPointForm.adresse || undefined, horaires: createPointForm.horaires || undefined,
                      latitude: parseFloat(createPointForm.latitude), longitude: parseFloat(createPointForm.longitude),
                      type_dechet: createPointForm.type_dechet,
                    });
                    const newId = res.data.data?.id;
                    if (newId) await modifierPointCollecteAdmin(newId, { statut: 'actif' });
                    setShowCreatePoint(false);
                    setPointsSubTab('actifs');
                    loadPoints(1);
                    loadMain();
                  } catch (e: any) {
                    setCreatePointError(e?.response?.data?.error ?? 'Erreur lors de la création');
                  } finally { setCreatePointLoading(false); }
                }}>
                {createPointLoading ? 'Création...' : 'Créer'}
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Map picker for create point ── */}
      {createPointMapOpen && (
        <div style={{ ...s.overlay, zIndex: 1100, background: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 620, maxWidth: '95vw', background: Colors.white, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${Colors.greyBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: Colors.primaryDark, fontSize: 15 }}>Choisir l'emplacement</p>
                <p style={{ margin: 0, fontSize: 12, color: Colors.grey, marginTop: 2 }}>Cliquez sur la carte pour placer le marqueur</p>
              </div>
              {createPointMapMarker && (
                <span style={{ fontSize: 12, color: Colors.primary, fontWeight: 600 }}>
                  {createPointMapMarker[0].toFixed(5)}, {createPointMapMarker[1].toFixed(5)}
                </span>
              )}
            </div>
            <div style={{ height: 420 }}>
              <MapContainer
                center={(() => {
                  if (createPointMapMarker) return createPointMapMarker;
                  const w = WILAYAS.find(w => w.nom === createPointForm.wilaya);
                  if (w) return [w.lat, w.lng] as [number, number];
                  return [28.0339, 1.6596] as [number, number];
                })()}
                zoom={(() => {
                  if (createPointMapMarker) return 14;
                  const w = WILAYAS.find(w => w.nom === createPointForm.wilaya);
                  if (w) return w.zoom;
                  return 6;
                })()}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onPick={(lat, lng) => setCreatePointMapMarker([lat, lng])} />
                {createPointMapMarker && (
                  <Marker
                    position={createPointMapMarker}
                    draggable
                    eventHandlers={{ dragend(e) { const p = (e.target as any).getLatLng(); setCreatePointMapMarker([p.lat, p.lng]); } }}
                  />
                )}
              </MapContainer>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: 14 }}>
              <button onClick={() => setCreatePointMapOpen(false)} style={{ ...s.chip, flex: 1, justifyContent: 'center', padding: '10px 0' }}>Annuler</button>
              <button
                onClick={() => {
                  if (createPointMapMarker) {
                    setCreatePointForm(f => ({ ...f, latitude: createPointMapMarker[0].toFixed(6), longitude: createPointMapMarker[1].toFixed(6) }));
                  }
                  setCreatePointMapOpen(false);
                }}
                disabled={!createPointMapMarker}
                style={{ ...s.chip, flex: 2, justifyContent: 'center', padding: '10px 0', borderColor: Colors.primary, background: Colors.primary, color: Colors.white, fontWeight: 700, opacity: createPointMapMarker ? 1 : 0.5 }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit point modal ── */}
      {editPointTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' as const }}>
            <div style={{ ...s.modalIcon, background: Colors.purpleLight, color: Colors.purple }}><MdEdit size={26} /></div>
            <h3 style={s.modalTitle}>Modifier le point de collecte</h3>
            {editPointError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{editPointError}</p>}
            <input placeholder="Nom" value={editPointForm.nom} onChange={e => setEditPointForm(f => ({ ...f, nom: e.target.value }))} style={s.formInput} />
            <select value={editPointForm.wilaya} onChange={e => setEditPointForm(f => ({ ...f, wilaya: e.target.value }))} style={s.formInput}>
              <option value="">Wilaya</option>
              {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
            </select>
            <input placeholder="Adresse" value={editPointForm.adresse} onChange={e => setEditPointForm(f => ({ ...f, adresse: e.target.value }))} style={s.formInput} />
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: Colors.grey, margin: '0 0 6px' }}>Jours d'ouverture</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(j => {
                  const active = editHorairesBuilder.jours.includes(j);
                  return (
                    <button key={j} type="button"
                      style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${active ? Colors.primary : Colors.greyBorder}`, background: active ? Colors.primaryLight : Colors.white, color: active ? Colors.primary : Colors.grey, fontWeight: active ? 700 : 400, fontSize: 12, cursor: 'pointer' }}
                      onClick={() => setEditHorairesBuilder(b => {
                        const jours = b.jours.includes(j) ? b.jours.filter(x => x !== j) : [...b.jours, j];
                        const next = { ...b, jours };
                        setEditPointForm(f => ({ ...f, horaires: computeHoraires(next) }));
                        return next;
                      })}
                    >{j}</button>
                  );
                })}
                <button type="button" style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...editHorairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven'] }; setEditHorairesBuilder(next); setEditPointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}>Lun-Ven</button>
                <button type="button" style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...editHorairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven','Sam'] }; setEditHorairesBuilder(next); setEditPointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}>Lun-Sam</button>
                <button type="button" style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...editHorairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] }; setEditHorairesBuilder(next); setEditPointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}>7j/7</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: Colors.grey }}>De</span>
                <input type="time" value={editHorairesBuilder.ouverture}
                  onChange={e => { const next = { ...editHorairesBuilder, ouverture: e.target.value }; setEditHorairesBuilder(next); setEditPointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}
                  style={{ ...s.formInput, width: 110, marginBottom: 0 }} />
                <span style={{ fontSize: 12, color: Colors.grey }}>à</span>
                <input type="time" value={editHorairesBuilder.fermeture}
                  onChange={e => { const next = { ...editHorairesBuilder, fermeture: e.target.value }; setEditHorairesBuilder(next); setEditPointForm(f => ({ ...f, horaires: computeHoraires(next) })); }}
                  style={{ ...s.formInput, width: 110, marginBottom: 0 }} />
              </div>
              {editPointForm.horaires && (
                <p style={{ fontSize: 12, color: Colors.primary, fontWeight: 600, margin: '6px 0 0' }}>→ {editPointForm.horaires}</p>
              )}
            </div>
            <p style={{ fontSize: 11, color: Colors.grey, marginBottom: 10 }}>Types de déchets</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {TYPES_DECHET.map(t => {
                const active = editPointForm.type_dechet.includes(t.value);
                return (
                  <button key={t.value} type="button"
                    style={{ ...s.chip, ...(active ? { borderColor: t.color, background: t.color + '15', color: t.color, fontWeight: 700 } : {}) }}
                    onClick={() => setEditPointForm(f => ({
                      ...f,
                      type_dechet: active ? f.type_dechet.filter(x => x !== t.value) : [...f.type_dechet, t.value],
                    }))}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>{DECHET_ICONS[t.value]}</span> {t.value}
                  </button>
                );
              })}
            </div>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setEditPointTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.purple} icon={<MdEdit size={16} />}
                disabled={editPointLoading}
                onClick={async () => {
                  setEditPointLoading(true); setEditPointError('');
                  try {
                    await modifierPointCollecteAdmin(editPointTarget.id, {
                      nom: editPointForm.nom || undefined,
                      wilaya: editPointForm.wilaya || undefined,
                      adresse: editPointForm.adresse || undefined,
                      horaires: editPointForm.horaires || undefined,
                      type_dechet: editPointForm.type_dechet.length > 0 ? editPointForm.type_dechet : undefined,
                    });
                    setEditPointTarget(null); loadPoints(pointsPage);
                  } catch (e: any) {
                    setEditPointError(e?.response?.data?.error ?? 'Erreur lors de la modification');
                  } finally { setEditPointLoading(false); }
                }}>
                {editPointLoading ? 'Enregistrement...' : 'Enregistrer'}
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Accept proposal modal ── */}
      {acceptTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 480 }}>
            <div style={{ ...s.modalIcon, background: Colors.primaryLight, color: Colors.primary }}><MdCheck size={26} /></div>
            <h3 style={s.modalTitle}>Accepter la proposition</h3>
            <p style={{ fontSize: 13, color: Colors.grey, marginBottom: 16, textAlign: 'center' as const }}>
              {acceptTarget.wilaya}{acceptTarget.adresse ? ` · ${acceptTarget.adresse}` : ''}
            </p>
            <input
              placeholder="Nom du point *"
              value={acceptNom}
              onChange={e => setAcceptNom(e.target.value)}
              style={s.formInput}
              autoFocus
            />
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: Colors.grey, margin: '0 0 6px' }}>Jours d'ouverture</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(j => {
                  const active = acceptHorairesBuilder.jours.includes(j);
                  return (
                    <button key={j} type="button"
                      style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${active ? Colors.primary : Colors.greyBorder}`, background: active ? Colors.primaryLight : Colors.white, color: active ? Colors.primary : Colors.grey, fontWeight: active ? 700 : 400, fontSize: 12, cursor: 'pointer' }}
                      onClick={() => setAcceptHorairesBuilder(b => {
                        const jours = b.jours.includes(j) ? b.jours.filter(x => x !== j) : [...b.jours, j];
                        const next = { ...b, jours };
                        setAcceptHoraires(computeHoraires(next));
                        return next;
                      })}
                    >{j}</button>
                  );
                })}
                <button type="button" style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...acceptHorairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven'] }; setAcceptHorairesBuilder(next); setAcceptHoraires(computeHoraires(next)); }}>Lun-Ven</button>
                <button type="button" style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...acceptHorairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven','Sam'] }; setAcceptHorairesBuilder(next); setAcceptHoraires(computeHoraires(next)); }}>Lun-Sam</button>
                <button type="button" style={{ padding: '5px 9px', borderRadius: 8, border: `1.5px solid ${Colors.greyBorder}`, background: Colors.white, color: Colors.grey, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { const next = { ...acceptHorairesBuilder, jours: ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] }; setAcceptHorairesBuilder(next); setAcceptHoraires(computeHoraires(next)); }}>7j/7</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: Colors.grey }}>De</span>
                <input type="time" value={acceptHorairesBuilder.ouverture}
                  onChange={e => { const next = { ...acceptHorairesBuilder, ouverture: e.target.value }; setAcceptHorairesBuilder(next); setAcceptHoraires(computeHoraires(next)); }}
                  style={{ ...s.formInput, width: 110, marginBottom: 0 }} />
                <span style={{ fontSize: 12, color: Colors.grey }}>à</span>
                <input type="time" value={acceptHorairesBuilder.fermeture}
                  onChange={e => { const next = { ...acceptHorairesBuilder, fermeture: e.target.value }; setAcceptHorairesBuilder(next); setAcceptHoraires(computeHoraires(next)); }}
                  style={{ ...s.formInput, width: 110, marginBottom: 0 }} />
              </div>
              {acceptHoraires && (
                <p style={{ fontSize: 12, color: Colors.primary, fontWeight: 600, margin: '6px 0 0' }}>→ {acceptHoraires}</p>
              )}
            </div>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setAcceptTarget(null)}>Annuler</ActionBtn>
              <ActionBtn
                color={Colors.primary}
                icon={<MdCheck size={16} />}
                disabled={acceptLoading || !acceptNom.trim()}
                onClick={async () => {
                  setAcceptLoading(true);
                  try {
                    await modifierPointCollecteAdmin(acceptTarget.id, {
                      statut: 'actif',
                      nom: acceptNom.trim(),
                      horaires: acceptHoraires.trim() || undefined,
                    });
                    setAcceptTarget(null);
                    loadPropositions();
                    loadPoints(pointsPage);
                    loadMain();
                  } catch (e: any) {
                    alert(e?.response?.data?.error ?? 'Erreur lors de la validation');
                  } finally { setAcceptLoading(false); }
                }}
              >{acceptLoading ? 'Validation...' : 'Valider et activer'}</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject proposal modal ── */}
      {rejectPointTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 440 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}>
              <MdClose size={26} />
            </div>
            <h3 style={s.modalTitle}>Rejeter cette proposition ?</h3>
            <div style={{ background: Colors.greyLight, borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'left' as const }}>
              {rejectPointTarget.nom && (
                <p style={{ fontSize: 14, fontWeight: 700, color: Colors.primaryDark, margin: '0 0 6px' }}>{rejectPointTarget.nom}</p>
              )}
              {(rejectPointTarget.wilaya || rejectPointTarget.adresse) && (
                <p style={{ fontSize: 13, color: Colors.grey, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MdLocationOn size={14} color={Colors.grey} />
                  {[rejectPointTarget.wilaya, rejectPointTarget.adresse].filter(Boolean).join(' · ')}
                </p>
              )}
              {Array.isArray(rejectPointTarget.type_dechet) && rejectPointTarget.type_dechet.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginTop: 6 }}>
                  {rejectPointTarget.type_dechet.map((t: string) => (
                    <span key={t} style={{ fontSize: 11, background: Colors.orangeLight, color: Colors.orange, borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <p style={s.modalDesc}>La proposition sera définitivement rejetée et le citoyen ne recevra pas de points.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setRejectPointTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdClose size={16} />} onClick={async () => {
                const id = rejectPointTarget.id;
                setRejectPointTarget(null);
                await modifierPointCollecteAdmin(id, { statut: 'inactif' });
                loadPropositions();
              }}>Confirmer le rejet</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete point confirm ── */}
      {deletePointTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}><MdDelete size={26} /></div>
            <h3 style={s.modalTitle}>Supprimer ce point ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setDeletePointTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdDelete size={16} />} onClick={async () => {
                await supprimerPointCollecteAdmin(deletePointTarget!);
                setDeletePointTarget(null); loadPoints(pointsPage); loadMain();
              }}>Confirmer</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Ban confirm modal ── */}
      {banTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={{ ...s.modalIcon, background: banTarget.actif ? Colors.redLight : Colors.primaryLight, color: banTarget.actif ? Colors.red : Colors.primary }}>
              {banTarget.actif ? <MdBlock size={26} /> : <MdPersonAdd size={26} />}
            </div>
            <h3 style={s.modalTitle}>{banTarget.actif ? 'Bannir cet utilisateur ?' : 'Réactiver cet utilisateur ?'}</h3>
            <p style={s.modalDesc}>
              {banTarget.prenom} {banTarget.nom} —{' '}
              {banTarget.actif
                ? 'Il ne pourra plus se connecter ni soumettre de signalements.'
                : 'Il pourra à nouveau accéder à l\'application.'}
            </p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setBanTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={banTarget.actif ? Colors.red : Colors.primary} icon={banTarget.actif ? <MdPersonOff size={16} /> : <MdPersonAdd size={16} />}
                onClick={async () => {
                  const newActif = !banTarget.actif;
                  await banUtilisateur(banTarget.id, newActif);
                  setUsers(prev => prev.map(u => u.id === banTarget.id ? { ...u, actif: newActif } : u));
                  setBanTarget(null);
                }}>
                {banTarget.actif ? 'Confirmer le ban' : 'Confirmer la réactivation'}
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Create association modal ── */}
      {showCreateAssoc && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 520 }}>
            <div style={{ ...s.modalIcon, background: Colors.purpleLight, color: Colors.purple }}><MdBusiness size={26} /></div>
            <h3 style={s.modalTitle}>Nouvelle association</h3>
            {createError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{createError}</p>}
            <input placeholder="Nom *" value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))} style={s.formInput} />
            <input placeholder="Email *" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} style={s.formInput} />
            <input placeholder="Mot de passe * (min 8 car.)" type="password" value={createForm.mot_de_passe} onChange={e => setCreateForm(f => ({ ...f, mot_de_passe: e.target.value }))} style={s.formInput} />
            <input placeholder="Téléphone" value={createForm.telephone} onChange={e => setCreateForm(f => ({ ...f, telephone: e.target.value }))} style={s.formInput} />
            <select value={createForm.wilaya} onChange={e => setCreateForm(f => ({ ...f, wilaya: e.target.value }))} style={s.formInput}>
              <option value="">Wilaya *</option>
              {WILAYAS.map(w => (
                <option key={w.id} value={w.nom}>{w.id.toString().padStart(2, '0')} · {w.nom}</option>
              ))}
            </select>
            <textarea placeholder="Description" rows={3} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} style={{ ...s.formInput, height: 72, resize: 'vertical' as const }} />
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setShowCreateAssoc(false)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.purple} icon={<MdBusiness size={16} />} disabled={createLoading || !createForm.nom.trim() || !createForm.email.trim() || createForm.mot_de_passe.length < 8 || !createForm.wilaya}
                onClick={async () => {
                  setCreateLoading(true); setCreateError('');
                  try {
                    await creerAssociationAdmin({ nom: createForm.nom, email: createForm.email, mot_de_passe: createForm.mot_de_passe, wilaya: createForm.wilaya || undefined, telephone: createForm.telephone || undefined, description: createForm.description || undefined });
                    setShowCreateAssoc(false);
                    loadAssociations(assocPage);
                    loadMain();
                  } catch (e: any) {
                    setCreateError(e?.response?.data?.error ?? 'Erreur lors de la création');
                  } finally { setCreateLoading(false); }
                }}>
                {createLoading ? 'Création...' : 'Créer'}
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete association confirm ── */}
      {deleteAssocTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}><MdDelete size={26} /></div>
            <h3 style={s.modalTitle}>Supprimer l'association ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible. Tous les événements liés seront également supprimés.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setDeleteAssocTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdDelete size={16} />} onClick={async () => {
                await supprimerAssociation(deleteAssocTarget!);
                setDeleteAssocTarget(null);
                loadAssociations(assocPage);
                loadMain();
              }}>Confirmer</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {rejectTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={s.modal}>
            <div style={s.modalIcon}>✗</div>
            <h3 style={s.modalTitle}>Motif de rejet</h3>
            <p style={s.modalDesc}>Ce motif sera communiqué à l'association.</p>
            <textarea style={s.motifArea} rows={4} value={rejectMotif}
              onChange={(e) => setRejectMotif(e.target.value)}
              placeholder="Expliquez la raison du rejet..." />
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setRejectTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdClose size={16} />} disabled={!rejectMotif.trim()}
                onClick={() => action(() => { setRejectTarget(null); return modererAssociation(rejectTarget!, 'rejetee', rejectMotif); })}>
                Confirmer le rejet
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject signalement modal ── */}
      {signalRejectTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={s.modal}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}>✗</div>
            <h3 style={s.modalTitle}>Motif de rejet</h3>
            <p style={s.modalDesc}>Ce motif sera enregistré avec le signalement.</p>
            <textarea style={s.motifArea} rows={4} value={rejectMotif}
              onChange={(e) => setRejectMotif(e.target.value)}
              placeholder="Expliquez la raison du rejet..." />
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setSignalRejectTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdClose size={16} />} disabled={!rejectMotif.trim()}
                onClick={() => action(() => { setSignalRejectTarget(null); return modererSignalement(signalRejectTarget!, 'rejete', rejectMotif); })}>
                Confirmer le rejet
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Employé : create modal ── */}
      {showCreateEmp && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 460 }}>
            <div style={{ ...s.modalIcon, background: Colors.blueLight, color: Colors.blue }}>👷</div>
            <h3 style={s.modalTitle}>Nouvel employé</h3>
            {empFormError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{empFormError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <input placeholder="Prénom *" value={empForm.prenom} onChange={e => setEmpForm(f => ({ ...f, prenom: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <input placeholder="Nom *" value={empForm.nom} onChange={e => setEmpForm(f => ({ ...f, nom: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
            </div>
            <input placeholder="Téléphone *" value={empForm.telephone} onChange={e => setEmpForm(f => ({ ...f, telephone: e.target.value }))} style={s.formInput} />
            <select value={empForm.wilaya} onChange={e => setEmpForm(f => ({ ...f, wilaya: e.target.value }))} style={s.formInput}>
              <option value="">Wilaya</option>
              {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
            </select>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setShowCreateEmp(false)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.blue} icon={<MdEngineering size={16} />} disabled={empFormLoading || !empForm.nom.trim() || !empForm.prenom.trim() || !empForm.telephone.trim()}
                onClick={async () => {
                  setEmpFormLoading(true); setEmpFormError('');
                  try {
                    await creerEmploye({ nom: empForm.nom, prenom: empForm.prenom, telephone: empForm.telephone, wilaya: empForm.wilaya || undefined });
                    setShowCreateEmp(false); loadEmployes(empPage);
                  } catch (e: any) { setEmpFormError(e?.response?.data?.error ?? 'Erreur'); }
                  finally { setEmpFormLoading(false); }
                }}>{empFormLoading ? 'Création...' : 'Créer'}</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Employé : edit modal ── */}
      {editEmpTarget && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 460 }}>
            <div style={{ ...s.modalIcon, background: Colors.purpleLight, color: Colors.purple }}><MdEdit size={26} /></div>
            <h3 style={s.modalTitle}>Modifier l'employé</h3>
            {empFormError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{empFormError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <input placeholder="Prénom" value={empForm.prenom} onChange={e => setEmpForm(f => ({ ...f, prenom: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <input placeholder="Nom" value={empForm.nom} onChange={e => setEmpForm(f => ({ ...f, nom: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
            </div>
            <input placeholder="Téléphone" value={empForm.telephone} onChange={e => setEmpForm(f => ({ ...f, telephone: e.target.value }))} style={s.formInput} />
            <select value={empForm.wilaya} onChange={e => setEmpForm(f => ({ ...f, wilaya: e.target.value }))} style={s.formInput}>
              <option value="">Wilaya</option>
              {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
            </select>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setEditEmpTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.purple} icon={<MdEdit size={16} />} disabled={empFormLoading}
                onClick={async () => {
                  setEmpFormLoading(true); setEmpFormError('');
                  try {
                    await modifierEmploye(editEmpTarget.id, { nom: empForm.nom, prenom: empForm.prenom, telephone: empForm.telephone, wilaya: empForm.wilaya || undefined });
                    setEditEmpTarget(null); loadEmployes(empPage);
                  } catch (e: any) { setEmpFormError(e?.response?.data?.error ?? 'Erreur'); }
                  finally { setEmpFormLoading(false); }
                }}>{empFormLoading ? 'Enregistrement...' : 'Enregistrer'}</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Employé : delete confirm ── */}
      {deleteEmpTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 400 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}><MdDelete size={26} /></div>
            <h3 style={s.modalTitle}>Supprimer cet employé ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setDeleteEmpTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdDelete size={16} />} onClick={async () => {
                await supprimerEmploye(deleteEmpTarget!); setDeleteEmpTarget(null); loadEmployes(empPage);
              }}>Confirmer</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Camion : create modal ── */}
      {showCreateCam && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 460 }}>
            <div style={{ ...s.modalIcon, background: Colors.orangeLight, color: Colors.orange }}><MdLocalShipping size={26} /></div>
            <h3 style={s.modalTitle}>Nouveau camion</h3>
            {camFormError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{camFormError}</p>}
            <input placeholder="Immatriculation * (ex: 123-456-07)" value={camForm.immatriculation} onChange={e => setCamForm(f => ({ ...f, immatriculation: e.target.value }))} style={s.formInput} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input placeholder="Capacité m³" type="number" min="1" value={camForm.capacite} onChange={e => setCamForm(f => ({ ...f, capacite: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <select value={camForm.wilaya} onChange={e => setCamForm(f => ({ ...f, wilaya: e.target.value }))} style={{ ...s.formInput, flex: 1 }}>
                <option value="">Wilaya</option>
                {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
              </select>
            </div>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setShowCreateCam(false)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.orange} icon={<MdLocalShipping size={16} />} disabled={camFormLoading || !camForm.immatriculation.trim()}
                onClick={async () => {
                  setCamFormLoading(true); setCamFormError('');
                  try {
                    await creerCamion({ immatriculation: camForm.immatriculation, capacite: camForm.capacite ? parseInt(camForm.capacite) : undefined, wilaya: camForm.wilaya || undefined });
                    setShowCreateCam(false); loadCamions(camPage);
                  } catch (e: any) { setCamFormError(e?.response?.data?.error ?? 'Erreur'); }
                  finally { setCamFormLoading(false); }
                }}>{camFormLoading ? 'Création...' : 'Créer'}</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Camion : edit modal ── */}
      {editCamTarget && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 460 }}>
            <div style={{ ...s.modalIcon, background: Colors.purpleLight, color: Colors.purple }}><MdEdit size={26} /></div>
            <h3 style={s.modalTitle}>Modifier le camion</h3>
            {camFormError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{camFormError}</p>}
            <input placeholder="Immatriculation" value={camForm.immatriculation} onChange={e => setCamForm(f => ({ ...f, immatriculation: e.target.value }))} style={s.formInput} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input placeholder="Capacité m³" type="number" min="1" value={camForm.capacite} onChange={e => setCamForm(f => ({ ...f, capacite: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <select value={camForm.wilaya} onChange={e => setCamForm(f => ({ ...f, wilaya: e.target.value }))} style={{ ...s.formInput, flex: 1 }}>
                <option value="">Wilaya</option>
                {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
              </select>
            </div>
            <p style={{ fontSize: 11, color: Colors.grey, marginBottom: 6 }}>Statut</p>
            <select value={editCamTarget.statut} onChange={e => setEditCamTarget((c: any) => ({ ...c, statut: e.target.value }))} style={s.formInput}>
              <option value="disponible">Disponible</option>
              <option value="en_service">En service</option>
              <option value="en_maintenance">En maintenance</option>
            </select>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setEditCamTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.purple} icon={<MdEdit size={16} />} disabled={camFormLoading}
                onClick={async () => {
                  setCamFormLoading(true); setCamFormError('');
                  try {
                    await modifierCamion(editCamTarget.id, { immatriculation: camForm.immatriculation, capacite: camForm.capacite ? parseInt(camForm.capacite) : undefined, wilaya: camForm.wilaya || undefined, statut: editCamTarget.statut });
                    setEditCamTarget(null); loadCamions(camPage);
                  } catch (e: any) { setCamFormError(e?.response?.data?.error ?? 'Erreur'); }
                  finally { setCamFormLoading(false); }
                }}>{camFormLoading ? 'Enregistrement...' : 'Enregistrer'}</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Camion : delete confirm ── */}
      {deleteCamTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 400 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}><MdDelete size={26} /></div>
            <h3 style={s.modalTitle}>Supprimer ce camion ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setDeleteCamTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdDelete size={16} />} onClick={async () => {
                await supprimerCamion(deleteCamTarget!); setDeleteCamTarget(null); loadCamions(camPage);
              }}>Confirmer</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Collecte : create modal ── */}
      {showCreateCol && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' as const }}>
            <div style={{ ...s.modalIcon, background: Colors.primaryLight, color: Colors.primary }}><MdAssignment size={26} /></div>
            <h3 style={s.modalTitle}>Planifier une collecte</h3>
            {colFormError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{colFormError}</p>}
            <select value={colForm.employe_id} onChange={e => setColForm(f => ({ ...f, employe_id: e.target.value }))} style={s.formInput}>
              <option value="">Employé *</option>
              {empAll.filter(e => e.statut === 'actif').map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}{e.wilaya ? ` (${e.wilaya})` : ''}</option>)}
            </select>
            <select value={colForm.camion_id} onChange={e => setColForm(f => ({ ...f, camion_id: e.target.value }))} style={s.formInput}>
              <option value="">Camion *</option>
              {camAll.map(c => <option key={c.id} value={c.id}>{c.immatriculation}{c.wilaya ? ` — ${c.wilaya}` : ''} ({c.statut.replace('_',' ')})</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="date" value={colForm.date_prevue} onChange={e => setColForm(f => ({ ...f, date_prevue: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <input placeholder="Créneau (ex: 8h-12h)" value={colForm.creneau}
                onChange={e => setColForm(f => ({ ...f, creneau: e.target.value }))}
                style={{ ...s.formInput, flex: 1, borderColor: colForm.creneau && !/^\d{1,2}h-\d{1,2}h$/.test(colForm.creneau) ? Colors.red : undefined }} />
            </div>
            {colForm.creneau && !/^\d{1,2}h-\d{1,2}h$/.test(colForm.creneau) && (
              <p style={{ color: Colors.red, fontSize: 11, marginTop: -8, marginBottom: 10 }}>Format requis : Xh-Yh (ex: 8h-12h)</p>
            )}
            <input placeholder="N° Signalement lié (optionnel)" type="number" value={colForm.signalement_id} onChange={e => setColForm(f => ({ ...f, signalement_id: e.target.value }))} style={s.formInput} />
            <textarea placeholder="Notes" rows={2} value={colForm.notes} onChange={e => setColForm(f => ({ ...f, notes: e.target.value }))} style={{ ...s.formInput, height: 60, resize: 'vertical' as const }} />
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setShowCreateCol(false)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.primary} icon={<MdAssignment size={16} />}
                disabled={colFormLoading || !colForm.employe_id || !colForm.camion_id || !colForm.date_prevue || (!!colForm.creneau && !/^\d{1,2}h-\d{1,2}h$/.test(colForm.creneau))}
                onClick={async () => {
                  setColFormLoading(true); setColFormError('');
                  try {
                    await creerCollecte({
                      employe_id: parseInt(colForm.employe_id), camion_id: parseInt(colForm.camion_id),
                      date_prevue: colForm.date_prevue, creneau: colForm.creneau || undefined,
                      notes: colForm.notes || undefined,
                      signalement_id: colForm.signalement_id ? parseInt(colForm.signalement_id) : undefined,
                    });
                    setShowCreateCol(false); loadCollectes(colPage);
                  } catch (e: any) { setColFormError(e?.response?.data?.error ?? 'Erreur'); }
                  finally { setColFormLoading(false); }
                }}>{colFormLoading ? 'Planification...' : 'Planifier'}</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Collecte : delete confirm ── */}
      {deleteColTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...s.modal, maxWidth: 400 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}><MdDelete size={26} /></div>
            <h3 style={s.modalTitle}>Supprimer cette collecte ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} onClick={() => setDeleteColTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon={<MdDelete size={16} />} onClick={async () => {
                await supprimerCollecte(deleteColTarget!); setDeleteColTarget(null); loadCollectes(colPage);
              }}>Confirmer</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div style={lb.overlay} onClick={() => setLightbox(null)}>
          <button style={lb.closeBtn} onClick={() => setLightbox(null)}><MdClose size={20} /></button>
          <div style={lb.counter}>{lightbox.index + 1} / {lightbox.urls.length}</div>

          {lightbox.index > 0 && (
            <button style={{ ...lb.navBtn, left: 20 }}
              onClick={(e) => { e.stopPropagation(); setLightbox(l => l ? { ...l, index: l.index - 1 } : l); }}>
              ‹
            </button>
          )}

          <img
            src={lightbox.urls[lightbox.index]}
            alt={`photo ${lightbox.index + 1}`}
            style={lb.img}
            onClick={(e) => e.stopPropagation()}
          />

          {lightbox.index < lightbox.urls.length - 1 && (
            <button style={{ ...lb.navBtn, right: 20 }}
              onClick={(e) => { e.stopPropagation(); setLightbox(l => l ? { ...l, index: l.index + 1 } : l); }}>
              ›
            </button>
          )}

          {lightbox.urls.length > 1 && (
            <div style={lb.thumbRow} onClick={(e) => e.stopPropagation()}>
              {lightbox.urls.map((url, i) => (
                <img key={i} src={url} alt="" style={{ ...lb.thumb, ...(i === lightbox.index ? lb.thumbActive : {}) }}
                  onClick={() => setLightbox(l => l ? { ...l, index: i } : l)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Detail components ── */

function SignalementDetail({ item, onOpenLightbox }: { item: any; onOpenLightbox: (urls: string[], index: number) => void }) {
  const photos: string[] = Array.isArray(item.photos) ? item.photos : [];
  const rawResolution: any[] = Array.isArray(item.photos_resolution) ? item.photos_resolution : [];
  const photosResolution: string[] = rawResolution.map(r => typeof r === 'string' ? r : r.url);

  const submitters: { utilisateur_id: number; nom: string; prenom: string; count: number }[] = Object.values(
    rawResolution.filter(r => typeof r !== 'string').reduce((acc: any, r) => {
      const k = r.utilisateur_id;
      if (!acc[k]) acc[k] = { utilisateur_id: k, nom: r.nom, prenom: r.prenom, count: 0 };
      acc[k].count++;
      return acc;
    }, {})
  );
  const deg   = item.degre_pollution ?? 0;
  const color = DEGRE_COLORS[deg] ?? Colors.grey;
  const bg    = DEGRE_BG[deg]    ?? Colors.greyLight;
  const label = DEGRE_LABELS[deg] ?? '—';
  const mapsUrl = item.latitude && item.longitude
    ? `https://maps.google.com/?q=${item.latitude},${item.longitude}` : null;

  return (
    <div style={d.section}>
      <Section title="Informations">
        <DetailRow label="Titre"    value={item.titre} />
        {item.description && <DetailRow label="Description" value={item.description} />}
        <DetailRow label="Citoyen"  value={`${item.citoyen?.prenom ?? ''} ${item.citoyen?.nom ?? ''}`} />
        <DetailRow label="Degré de pollution"
          value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color, borderRadius: 20, padding: '4px 12px', fontWeight: 700, fontSize: 13 }}>
              {'⬤'.repeat(deg)}{'○'.repeat(5 - deg)} {deg}/5 — {label}
            </span>
          } />
        <DetailRow label="Confirmations citoyens"
          value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: Colors.primary, borderRadius: 20, padding: '4px 12px', fontWeight: 700, fontSize: 13 }}>
              👥 {item.confirmations_count ?? 0} citoyen{(item.confirmations_count ?? 0) !== 1 ? 's' : ''} ont confirmé
            </span>
          } />
      </Section>

      <Section title="Localisation">
        {item.wilaya  && <DetailRow label="Wilaya"  value={item.wilaya} />}
        {item.commune && <DetailRow label="Commune" value={item.commune} />}
        <DetailRow label="Coordonnées GPS"
          value={item.latitude
            ? <a href={mapsUrl!} target="_blank" rel="noreferrer" style={{ color: Colors.blue, fontWeight: 600 }}>
                {parseFloat(item.latitude).toFixed(5)}, {parseFloat(item.longitude).toFixed(5)} — Voir sur Maps ↗
              </a>
            : '—'} />
        <DetailRow label="Signalé le" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
      </Section>

      {photos.length > 0 && (
        <Section title={`Photos originales (${photos.length})`}>
          <div style={d.photoGrid}>
            {photos.map((url, i) => (
              <div key={i} style={d.photoWrap} onClick={() => onOpenLightbox(photos, i)}>
                <img src={url} alt={`photo ${i + 1}`} style={d.photo} />
                <div style={d.photoOverlay}>
                  <span style={d.photoZoom}>🔍</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: Colors.grey, marginTop: 8 }}>
            Cliquez sur une photo pour l'agrandir · Flèches ← → pour naviguer
          </p>
        </Section>
      )}

      {photosResolution.length > 0 && (
        <Section title={`📷 Photos après nettoyage (${photosResolution.length})`}>
          {submitters.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: Colors.grey, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Soumis par
              </p>
              {submitters.map(s => (
                <div key={s.utilisateur_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: Colors.primaryLight, borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: Colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: Colors.white, flexShrink: 0 }}>
                    {(s.prenom[0] ?? '?').toUpperCase()}{(s.nom[0] ?? '').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: Colors.primaryDark }}>{s.prenom} {s.nom}</p>
                    <p style={{ fontSize: 11, color: Colors.primary }}>{s.count} photo{s.count > 1 ? 's' : ''} soumise{s.count > 1 ? 's' : ''}</p>
                  </div>
                  <span style={{ fontSize: 11, color: Colors.grey }}>#{s.utilisateur_id}</span>
                </div>
              ))}
            </div>
          )}
          <div style={d.photoGrid}>
            {photosResolution.map((url, i) => (
              <div key={i} style={d.photoWrap} onClick={() => onOpenLightbox(photosResolution, i)}>
                <img src={url} alt={`résolution ${i + 1}`} style={d.photo} />
                <div style={d.photoOverlay}>
                  <span style={d.photoZoom}>🔍</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function EvenementDetail({ item }: { item: any }) {
  const mapsUrl = item.latitude && item.longitude
    ? `https://maps.google.com/?q=${item.latitude},${item.longitude}` : null;
  return (
    <div style={d.section}>
      {item.photo && (
        <img src={item.photo} alt={item.titre}
          style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 16, display: 'block' }} />
      )}
      <Section title="Informations">
        <DetailRow label="Titre"       value={item.titre} />
        {item.description && <DetailRow label="Description" value={item.description} />}
        <DetailRow label="Association" value={item.association?.nom ?? '—'} />
        <DetailRow label="Points"      value={<span style={{ color: Colors.primary, fontWeight: 700 }}>+{item.points_participation} pts</span>} />
        {item.nb_places_max && <DetailRow label="Places max" value={`${item.nb_places_max} volontaires`} />}
      </Section>
      <Section title="Date & Lieu">
        <DetailRow label="Début"   value={new Date(item.date_debut).toLocaleString('fr-DZ')} />
        <DetailRow label="Fin"     value={new Date(item.date_fin).toLocaleString('fr-DZ')} />
        {item.wilaya  && <DetailRow label="Wilaya"  value={item.wilaya} />}
        {item.adresse && <DetailRow label="Adresse" value={item.adresse} />}
        {mapsUrl && (
          <DetailRow label="Carte"
            value={<a href={mapsUrl} target="_blank" rel="noreferrer" style={{ color: Colors.blue, fontWeight: 600 }}>
              {parseFloat(item.latitude).toFixed(5)}, {parseFloat(item.longitude).toFixed(5)} — Voir sur Maps ↗
            </a>} />
        )}
        <DetailRow label="Créé le" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
      </Section>
    </div>
  );
}

function AssocDetail({ item }: { item: any }) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    en_attente: { bg: Colors.orangeLight, color: Colors.orange },
    validee:    { bg: Colors.primaryLight, color: Colors.primary },
    rejetee:    { bg: Colors.redLight, color: Colors.red },
  };
  const sc = statusColors[item.statut] ?? statusColors.en_attente;
  const photos: string[] = Array.isArray(item.photos) ? item.photos : [];

  return (
    <div style={d.section}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        {item.logo
          ? <img src={item.logo} alt="logo" style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', border: `2px solid ${Colors.greyBorder}` }} />
          : <div style={{ width: 80, height: 80, borderRadius: 16, background: Colors.purpleLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: Colors.purple }}>
              {item.nom?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
        }
      </div>
      <Section title="Informations">
        <DetailRow label="Nom"   value={item.nom} />
        <DetailRow label="Email" value={item.email} />
        {item.telephone   && <DetailRow label="Téléphone"   value={item.telephone} />}
        {item.wilaya      && <DetailRow label="Wilaya"      value={item.wilaya} />}
        {item.adresse     && <DetailRow label="Adresse"     value={item.adresse} />}
        {item.facebook    && <DetailRow label="Facebook"    value={<a href={item.facebook} target="_blank" rel="noreferrer" style={{ color: Colors.blue }}>{item.facebook}</a>} />}
        {item.description && <DetailRow label="Description" value={item.description} />}
      </Section>
      <Section title="Statut">
        <DetailRow label="Statut" value={
          <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
            {item.statut === 'en_attente' ? 'En attente' : item.statut === 'validee' ? 'Validée' : 'Rejetée'}
          </span>
        } />
        {item.motif_rejet && (
          <DetailRow label="Motif rejet" value={
            <span style={{ color: Colors.red }}>{item.motif_rejet}</span>
          } />
        )}
        <DetailRow label="Inscrite le" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
      </Section>
      {photos.length > 0 && (
        <Section title={`Photos (${photos.length})`}>
          <div style={d.photoGrid}>
            {photos.map((url, i) => (
              <div key={i} style={d.photoWrap}>
                <img src={url} alt={`photo ${i + 1}`} style={d.photo} />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function PointDetail({ item, onOpenLightbox }: { item: any; onOpenLightbox: (urls: string[], index: number) => void }) {
  const types  = Array.isArray(item.type_dechet) ? item.type_dechet : [];
  const photos: string[] = Array.isArray(item.photos) ? item.photos : [];
  const mapsUrl = item.latitude && item.longitude
    ? `https://maps.google.com/?q=${item.latitude},${item.longitude}` : null;
  return (
    <div style={d.section}>
      <Section title="Informations">
        <DetailRow label="Nom" value={item.nom} />
        {item.description && <DetailRow label="Description" value={item.description} />}
        {item.horaires    && <DetailRow label="Horaires"    value={item.horaires} />}
        <DetailRow label="Types de déchets"
          value={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {types.map((t: string) => (
                <span key={t} style={{ background: Colors.primaryLight, color: Colors.primaryDark, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          } />
      </Section>
      <Section title="Localisation">
        {item.wilaya  && <DetailRow label="Wilaya"  value={item.wilaya} />}
        {item.adresse && <DetailRow label="Adresse" value={item.adresse} />}
        {mapsUrl && (
          <DetailRow label="Carte"
            value={<a href={mapsUrl} target="_blank" rel="noreferrer" style={{ color: Colors.blue, fontWeight: 600 }}>
              {parseFloat(item.latitude).toFixed(5)}, {parseFloat(item.longitude).toFixed(5)} — Voir sur Maps ↗
            </a>} />
        )}
        <DetailRow label="Proposé le" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
      </Section>
      {photos.length > 0 && (
        <Section title={`Photos (${photos.length})`}>
          <div style={d.photoGrid}>
            {photos.map((url, i) => (
              <div key={i} style={d.photoWrap} onClick={() => onOpenLightbox(photos, i)}>
                <img src={url} alt={`photo ${i + 1}`} style={d.photo} />
                <div style={d.photoOverlay}><span style={d.photoZoom}>🔍</span></div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Shared components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={d.sectionBlock}>
      <p style={d.sectionTitle}>{title}</p>
      <div style={d.sectionBody}>{children}</div>
    </div>
  );
}

function ItemRow({ item, type, onDetail, onValidate, onReject }: {
  item: any; type: Tab; onDetail: () => void; onValidate: () => void; onReject: () => void;
}) {
  const labelMap: Record<Tab, string> = {
    stats: '', utilisateurs: '', carte: '', employes: '', camions: '', collectes: '', config: '',
    associations: item.nom, evenements: item.titre, signalements: item.titre, points: item.nom,
  };
  const metaMap: Record<Tab, string> = {
    stats: '', utilisateurs: '', carte: '', employes: '', camions: '', collectes: '', config: '',
    associations: item.email,
    evenements:   `${item.association?.nom ?? '—'}${item.wilaya ? ` · ${item.wilaya}` : ''}`,
    signalements: `${item.citoyen?.prenom ?? ''} ${item.citoyen?.nom ?? ''}${item.wilaya ? ` · ${item.wilaya}` : ''}`,
    points:       `${item.wilaya ? `${item.wilaya} · ` : ''}${Array.isArray(item.type_dechet) ? item.type_dechet.slice(0, 3).join(', ') : item.type_dechet}`,
  };
  const iconNodes: Record<Tab, React.ReactNode> = {
    stats: null, utilisateurs: null, carte: null,
    associations: <MdBusiness size={20} />,
    evenements: <MdEvent size={20} />,
    signalements: <MdReportProblem size={20} />,
    points: <MdLocationOn size={20} />,
    employes: <MdEngineering size={20} />,
    camions: <MdLocalShipping size={20} />,
    collectes: <MdAssignment size={20} />,
    config: null,
  };
  const iconColors: Record<Tab, string> = { stats: '', utilisateurs: '', carte: '', associations: Colors.blue, evenements: Colors.purple, signalements: Colors.orange, points: Colors.primary, employes: Colors.blue, camions: Colors.orange, collectes: Colors.primary, config: Colors.grey };

  const photos: string[] = type === 'signalements' && Array.isArray(item.photos) ? item.photos : [];
  const deg = type === 'signalements' ? (item.degre_pollution ?? 0) : 0;

  return (
    <div style={r.card}>
      <div style={{ ...r.icon, background: iconColors[type] + '18', color: iconColors[type] }}>
        {iconNodes[type]}
      </div>
      <div style={r.info}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          <p style={r.title}>{labelMap[type]}</p>
          {type === 'signalements' && deg > 0 && (
            <span style={{ background: DEGRE_BG[deg], color: DEGRE_COLORS[deg], borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              {deg}/5 {DEGRE_LABELS[deg]}
            </span>
          )}
          {photos.length > 0 && (
            <span style={{ background: Colors.blueLight, color: Colors.blue, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MdCameraAlt size={12} /> {photos.length}
            </span>
          )}
        </div>
        <p style={r.meta}>{metaMap[type]}</p>
        <p style={r.date}>{new Date(item.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
      <div style={r.actions}>
        <button style={r.detailBtn} onClick={onDetail}><MdVisibility size={15} style={{ marginRight: 4 }} />Détail</button>
        <SmallBtn color={Colors.primary} onClick={onValidate}><MdCheck size={16} /></SmallBtn>
        <SmallBtn color={Colors.red}     onClick={onReject}><MdClose size={16} /></SmallBtn>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={d.row}>
      <span style={d.label}>{label}</span>
      <span style={d.value}>{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div style={sc.card}>
      <div style={{ ...sc.iconWrap, background: bg, color }}>
        {icon}
      </div>
      <p style={sc.val}>{value.toLocaleString('fr-DZ')}</p>
      <p style={sc.label}>{label}</p>
      <div style={{ ...sc.bar, background: bg }}>
        <div style={{ ...sc.barFill, background: color, width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function ActionBtn({ children, color, icon, onClick, disabled }: {
  children: React.ReactNode; color: string; icon?: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      background: color, color: Colors.white,
      border: 'none', borderRadius: 12, padding: '11px 20px',
      fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, flex: 1, justifyContent: 'center',
      boxShadow: `0 4px 12px ${color}30`,
    }}>
      {icon}{children}
    </button>
  );
}

const evBtn = (color: string): React.CSSProperties => ({
  background: color + '15', color, border: `1.5px solid ${color}40`,
  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', whiteSpace: 'nowrap',
});

function Paginator({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const shown = new Set([1, totalPages, page, Math.max(1, page - 1), Math.min(totalPages, page + 1)]);
  const sorted = [...shown].sort((a, b) => a - b);
  const pages: (number | '…')[] = [];
  sorted.forEach((p, i) => { if (i > 0 && p - sorted[i - 1] > 1) pages.push('…'); pages.push(p); });
  const btnBase: React.CSSProperties = { border: '1.5px solid', borderRadius: 8, padding: '6px 11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 36, textAlign: 'center' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, flexWrap: 'wrap' }}>
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        style={{ ...btnBase, borderColor: Colors.greyBorder, background: Colors.white, color: page === 1 ? Colors.grey : Colors.primaryDark, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Préc.</button>
      {pages.map((p, i) => p === '…'
        ? <span key={`e${i}`} style={{ fontSize: 13, color: Colors.grey, padding: '0 2px' }}>…</span>
        : <button key={p} onClick={() => onChange(p)}
            style={{ ...btnBase, borderColor: p === page ? Colors.purple : Colors.greyBorder, background: p === page ? Colors.purple : Colors.white, color: p === page ? Colors.white : Colors.primaryDark, fontWeight: p === page ? 800 : 600 }}>{p}</button>
      )}
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
        style={{ ...btnBase, borderColor: Colors.greyBorder, background: Colors.white, color: page === totalPages ? Colors.grey : Colors.primaryDark, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Suiv. →</button>
    </div>
  );
}

function SmallBtn({ children, color, onClick }: { children: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: color + '12', color, border: `1.5px solid ${color}25`,
      borderRadius: 9, width: 34, height: 34,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s',
    }}>{children}</button>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{
        width: 40, height: 40, border: `4px solid ${Colors.greyBorder}`,
        borderTopColor: color, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: Colors.grey }}>
      <div style={{ fontSize: 56, marginBottom: 14, display: 'flex', justifyContent: 'center', opacity: 0.35 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 600 }}>{message}</p>
    </div>
  );
}

function ConfigField({ icon, label, description, value, onChange }: { icon: React.ReactNode; label: string; description: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ background: Colors.white, borderRadius: 12, padding: '16px 20px', border: `1px solid ${Colors.greyBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {icon}
        <p style={{ fontSize: 14, fontWeight: 700, color: Colors.primaryDark, margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 12, color: Colors.grey, marginBottom: 12, marginLeft: 28 }}>{description}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 28 }}>
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
          style={{ width: 100, border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 18, fontWeight: 700, color: Colors.primaryDark, textAlign: 'center' as const }}
        />
        <span style={{ fontSize: 13, color: Colors.grey }}>points</span>
      </div>
    </div>
  );
}

/* ── Styles ── */

const s: Record<string, React.CSSProperties> = {
  critiqueBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(220,38,38,0.08)',
    border: '1.5px solid rgba(220,38,38,0.25)',
    backdropFilter: 'blur(8px)',
    borderRadius: 14, padding: '12px 18px', marginBottom: 20,
    color: '#991B1B',
  },
  critiqueBtn: {
    background: '#DC2626', color: '#fff', border: 'none',
    borderRadius: 8, padding: '6px 14px', fontSize: 13,
    fontWeight: 700, cursor: 'pointer', flexShrink: 0,
  },
  critiqueDismiss: {
    background: 'none', border: 'none', color: '#B91C1C',
    cursor: 'pointer', padding: '2px 4px', flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
  layout:    { display: 'flex', minHeight: '100vh', background: '#F0F2F8' },
  sidebar:   {
    width: 260, background: Colors.white,
    borderRight: `1px solid ${Colors.greyBorder}`,
    display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
    boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
  },
  sideTop:   { padding: '24px 18px 18px', borderBottom: `1px solid ${Colors.greyBorder}` },
  logo:      { display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 800, color: Colors.primaryDark, marginBottom: 10 },
  roleTag:   { display: 'inline-flex', alignItems: 'center', gap: 5, background: Colors.purpleLight, color: Colors.purple, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 },
  nav:       { flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' as const },
  navItem:   { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, color: Colors.grey, fontWeight: 500, textAlign: 'left', width: '100%', transition: 'all 0.15s' },
  navActive: { background: `linear-gradient(135deg, ${Colors.purple}15 0%, ${Colors.purple}08 100%)`, color: Colors.purple, fontWeight: 700, borderLeft: `3px solid ${Colors.purple}` },
  navIcon:   { width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge:     { marginLeft: 'auto', background: Colors.red, color: Colors.white, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: 'center' },
  sideBottom:{ padding: '12px 10px', borderTop: `1px solid ${Colors.greyBorder}`, display: 'flex', flexDirection: 'column', gap: 8 },
  pendingAlert: { display: 'flex', alignItems: 'center', gap: 8, background: Colors.orangeLight, color: Colors.orange, borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600 },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: Colors.greyLight, color: Colors.grey, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  main:      { flex: 1, padding: '36px 40px', overflowY: 'auto' as const, maxWidth: 1100 },
  pageHeader:{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: Colors.primaryDark, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: Colors.grey },
  searchWrap:  { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon:  { position: 'absolute', left: 11, display: 'flex', alignItems: 'center', color: Colors.grey, pointerEvents: 'none' },
  searchInput: { border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '9px 14px 9px 34px', fontSize: 14, outline: 'none', width: 220, background: Colors.white, color: Colors.black },
  statsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 16 },
  periodeRow:  { display: 'flex', gap: 4, background: Colors.greyLight, borderRadius: 12, padding: 4 },
  periodePill: { border: 'none', background: 'none', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.grey },
  periodeActive: { background: Colors.white, color: Colors.purple, boxShadow: '0 2px 8px rgba(83,74,183,0.15)' },
  chipsRow:  { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  chip:      { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 20, background: Colors.white, fontSize: 13, fontWeight: 600, color: Colors.grey, cursor: 'pointer' },
  chipClear: { padding: '6px 14px', border: 'none', borderRadius: 20, background: Colors.greyLight, fontSize: 12, fontWeight: 600, color: Colors.grey, cursor: 'pointer' },
  list:      { display: 'flex', flexDirection: 'column', gap: 10 },
  pagination:{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 28 },
  pageBtn:   { background: Colors.white, border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.primaryDark },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pageInfo:  { fontSize: 13, color: Colors.grey },
  userCard:  { background: Colors.white, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${Colors.greyBorder}` },
  userCardTop: { borderColor: Colors.orange + '50', background: Colors.orangeLight + '40' },
  userRank:  { width: 40, fontSize: 18, textAlign: 'center', flexShrink: 0, fontWeight: 800 },
  userAvatar:{ width: 42, height: 42, borderRadius: 21, background: Colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: Colors.primaryDark, flexShrink: 0 },
  userInfo:  { flex: 1, minWidth: 0 },
  userName:  { fontSize: 15, fontWeight: 700, color: Colors.primaryDark },
  userMeta:  { fontSize: 12, color: Colors.grey, marginTop: 3 },
  userRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  userPts:   { fontSize: 15, fontWeight: 800, color: Colors.primaryDark },
  userNiv:   { fontSize: 12, color: Colors.grey, background: Colors.primaryLight, borderRadius: 20, padding: '2px 10px', fontWeight: 600 },
  overlay:   {
    position: 'fixed', inset: 0,
    background: 'rgba(10, 15, 40, 0.45)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 200,
  },
  panel:     {
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(20px)',
    width: 500, height: '100vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '-12px 0 48px rgba(0,0,0,0.18)',
    borderLeft: '1px solid rgba(255,255,255,0.6)',
  },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 28px', borderBottom: `1px solid ${Colors.greyBorder}` },
  panelTitle:  { fontSize: 18, fontWeight: 800, color: Colors.primaryDark },
  panelSubtitle: { fontSize: 13, color: Colors.grey, marginTop: 2 },
  closeBtn:    { background: Colors.greyLight, border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: Colors.grey, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panelBody:   { flex: 1, overflowY: 'auto' as const, padding: '24px 28px' },
  panelFooter: { padding: '16px 28px', borderTop: `1px solid ${Colors.greyBorder}`, display: 'flex', gap: 10 },
  createBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: `linear-gradient(135deg, ${Colors.purple} 0%, #6C63D3 100%)`,
    color: Colors.white, border: 'none', borderRadius: 12,
    padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 4px 14px ${Colors.purple}40`,
  },
  formInput: {
    width: '100%', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10,
    padding: '10px 14px', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', marginBottom: 10,
    background: '#FAFBFF', color: Colors.black,
    transition: 'border-color 0.15s',
  },
  modal: {
    background: 'rgba(255, 255, 255, 0.97)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 24, padding: '36px 32px',
    width: '100%', maxWidth: 460,
    boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.5)',
  },
  modalIcon: {
    width: 52, height: 52, borderRadius: 16,
    background: Colors.redLight, color: Colors.red,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  modalTitle:{ fontSize: 20, fontWeight: 800, color: Colors.primaryDark, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: Colors.grey, marginBottom: 20, lineHeight: 1.55 },
  motifArea: { width: '100%', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const, background: '#FAFBFF' },
  modalRow:  { display: 'flex', gap: 12, marginTop: 22 },
};

const r: Record<string, React.CSSProperties> = {
  card:      { background: Colors.white, borderRadius: 16, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${Colors.greyBorder}`, transition: 'box-shadow 0.15s' },
  icon:      { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:      { flex: 1, minWidth: 0 },
  title:     { fontSize: 14, fontWeight: 700, color: Colors.primaryDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 },
  meta:      { fontSize: 12, color: Colors.grey, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date:      { fontSize: 11, color: Colors.greyBorder, marginTop: 3 },
  actions:   { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' },
  detailBtn: { display: 'flex', alignItems: 'center', background: Colors.blueLight, color: Colors.blue, border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, gap: 4 },
};

const d: Record<string, React.CSSProperties> = {
  section:      { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionBlock: { background: Colors.greyLight + '80', borderRadius: 12, padding: '16px 18px' },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: Colors.grey, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  sectionBody:  { display: 'flex', flexDirection: 'column', gap: 10 },
  row:          { display: 'flex', flexDirection: 'column', gap: 3 },
  label:        { fontSize: 11, fontWeight: 700, color: Colors.grey, textTransform: 'uppercase', letterSpacing: '0.05em' },
  value:        { fontSize: 14, color: Colors.black, fontWeight: 500 },
  photoGrid:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 },
  photoWrap:    { position: 'relative', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1/1' },
  photo:        { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block', transition: 'transform 0.2s' },
  photoOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' },
  photoZoom:    { fontSize: 24, opacity: 0, transition: 'opacity 0.2s' },
};

const sc: Record<string, React.CSSProperties> = {
  card:    { background: Colors.white, borderRadius: 18, padding: '22px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `1px solid ${Colors.greyBorder}` },
  iconWrap:{ width: 50, height: 50, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  icon:    { fontSize: 22 },
  val:     { fontSize: 36, fontWeight: 800, color: Colors.primaryDark, marginBottom: 4, letterSpacing: '-0.5px' },
  label:   { fontSize: 12.5, color: Colors.grey, marginBottom: 14, lineHeight: 1.4 },
  bar:     { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, minWidth: 4 },
};

const lb: Record<string, React.CSSProperties> = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  img:      { maxWidth: '80vw', maxHeight: '72vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' },
  closeBtn: { position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)', border: 'none', color: Colors.white, fontSize: 20, width: 44, height: 44, borderRadius: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  counter:  { position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: Colors.white, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 14px' },
  navBtn:   { position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.18)', border: 'none', color: Colors.white, fontSize: 40, width: 52, height: 52, borderRadius: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 },
  thumbRow: { position: 'absolute', bottom: 24, display: 'flex', gap: 8 },
  thumb:    { width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', opacity: 0.5, border: '2px solid transparent', transition: 'all 0.15s' },
  thumbActive: { opacity: 1, borderColor: Colors.white },
};
