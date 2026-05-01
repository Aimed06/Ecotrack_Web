import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import {
  getAdminStats, getModerationQueue, getUtilisateurs,
  modererAssociation, modererEvenementAdmin,
  modererSignalement, modererPointCollecte,
  getAssociations, creerAssociationAdmin, supprimerAssociation,
  getSignalements,
  getPointsAdmin, creerPointCollecte, supprimerPointCollecteAdmin, modifierPointCollecteAdmin,
} from '../../api';
import AdminMap from './AdminMap';
import WILAYAS from '../../constants/wilayas';
import TYPES_DECHET from '../../constants/typesDechet';

type Tab = 'stats' | 'associations' | 'evenements' | 'signalements' | 'points' | 'utilisateurs' | 'carte';
interface Stats {
  nb_citoyens: number; nb_associations: number; nb_signalements: number;
  nb_evenements_publies: number; nb_participations: number;
}
interface Queue { associations: any[]; evenements: any[]; signalements: any[]; points_collecte: any[]; }

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'stats',         label: 'Statistiques',      icon: '📊' },
  { id: 'carte',         label: 'Carte',             icon: '🗺️' },
  { id: 'associations',  label: 'Associations',       icon: '🏢' },
  { id: 'evenements',    label: 'Événements',         icon: '📅' },
  { id: 'signalements',  label: 'Signalements',       icon: '⚠️' },
  { id: 'points',        label: 'Points de collecte', icon: '📍' },
  { id: 'utilisateurs',  label: 'Utilisateurs',       icon: '👥' },
];

const DEGRE_COLORS = ['', '#22c55e', '#84cc16', Colors.orange, '#f97316', Colors.red];
const DEGRE_BG     = ['', '#f0fdf4', '#f7fee7', Colors.orangeLight, '#fff7ed', Colors.redLight];
const DEGRE_LABELS = ['', 'Très léger', 'Léger', 'Modéré', 'Grave', 'Critique'];
const MODERATION_TABS: Tab[] = ['evenements', 'signalements'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'stats');
  const [stats, setStats]     = useState<Stats | null>(null);
  const [queue, setQueue]     = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState<{ item: any; type: Tab } | null>(null);
  const [rejectMotif, setRejectMotif]   = useState('');
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  type Periode = 'tout' | 'semaine' | 'mois';
  const [periode, setPeriode] = useState<Periode>('tout');
  const [statsLoading, setStatsLoading] = useState(false);
  const periodeInitialized = useRef(false);

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
  const [editPointForm, setEditPointForm] = useState({ nom: '', wilaya: '', adresse: '', horaires: '', description: '', type_dechet: [] as string[] });
  const [editPointLoading, setEditPointLoading] = useState(false);
  const [editPointError, setEditPointError] = useState('');
  const [createPointForm, setCreatePointForm] = useState({
    nom: '', wilaya: '', adresse: '', horaires: '', description: '',
    latitude: '', longitude: '', type_dechet: [] as string[],
  });
  const [createPointLoading, setCreatePointLoading] = useState(false);
  const [createPointError, setCreatePointError] = useState('');
  const [pointsWilaya, setPointsWilaya] = useState('');
  const [pointsStatut, setPointsStatut] = useState('');
  const [pointsTypeFilter, setPointsTypeFilter] = useState('');

  const [signalMode, setSignalMode] = useState<'moderation' | 'a_resoudre'>('moderation');
  const [resoudreItems, setResoudreItems] = useState<any[]>([]);
  const [resoudreLoading, setResoudreLoading] = useState(false);

  const toggleType  = (v: string) =>
    setTypeFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleDegre = (d: number) =>
    setDegreFilter(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

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

  const [users, setUsers]             = useState<any[]>([]);
  const [usersPage, setUsersPage]     = useState(1);
  const [usersTotal, setUsersTotal]   = useState(0);
  const [usersWilaya, setUsersWilaya] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

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

  const loadUsers = useCallback(async (wilaya: string, page: number) => {
    setUsersLoading(true);
    try {
      const res = await getUtilisateurs(wilaya || undefined, page);
      const data = res.data.data;
      setUsers(data?.classement ?? data ?? []);
      setUsersTotal(res.data.meta?.total ?? 0);
    } catch {}
    finally { setUsersLoading(false); }
  }, []);

  const loadPoints = useCallback(async (page: number, wilaya = pointsWilaya, statut = pointsStatut, type_dechet = pointsTypeFilter) => {
    setPointsLoading(true);
    try {
      const res = await getPointsAdmin(page, POINTS_PAGE_SIZE, {
        wilaya: wilaya || undefined,
        statut: statut || undefined,
        type_dechet: type_dechet || undefined,
      });
      setPointsList(res.data.data.items ?? []);
      setPointsTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setPointsLoading(false); }
  }, [pointsWilaya, pointsStatut, pointsTypeFilter]);

  const loadResoudre = useCallback(async () => {
    setResoudreLoading(true);
    try {
      const res = await getSignalements(1, 200, 'publie');
      setResoudreItems(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {}
    finally { setResoudreLoading(false); }
  }, []);

  const loadAssociations = useCallback(async (page: number) => {
    setAssocLoading(true);
    try {
      const res = await getAssociations(page, ASSOC_PAGE_SIZE);
      setAssocList(res.data.data.items ?? []);
      setAssocTotal(res.data.data.total ?? 0);
    } catch {}
    finally { setAssocLoading(false); }
  }, []);

  useEffect(() => { loadMain(); }, []);
  useEffect(() => {
    if (!periodeInitialized.current) { periodeInitialized.current = true; return; }
    loadStats(periode);
  }, [periode]);
  useEffect(() => {
    if (tab === 'utilisateurs') loadUsers(usersWilaya, usersPage);
  }, [tab, usersWilaya, usersPage]);

  useEffect(() => {
    if (tab === 'associations') loadAssociations(assocPage);
  }, [tab, assocPage]);

  useEffect(() => {
    if (tab === 'points') { setPointsPage(1); loadPoints(1, pointsWilaya, pointsStatut, pointsTypeFilter); }
  }, [tab, pointsWilaya, pointsStatut, pointsTypeFilter]);

  useEffect(() => {
    if (tab === 'points' && pointsPage > 1) loadPoints(pointsPage);
  }, [pointsPage]);

  useEffect(() => {
    if (tab === 'signalements' && signalMode === 'a_resoudre') loadResoudre();
  }, [tab, signalMode]);

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
    points:       queue?.points_collecte.length ?? 0,
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
          <div style={s.logo}>🌿 EcoTrack</div>
          <div style={s.roleTag}>Administrateur</div>
        </div>
        <nav style={s.nav}>
          {TABS.map((t) => {
            const n = pendingCounts[t.id] ?? 0;
            return (
              <button key={t.id}
                style={{ ...s.navItem, ...(tab === t.id ? s.navActive : {}) }}
                onClick={() => {
                  setTab(t.id);
                  setSearchParams({ tab: t.id });
                  setWilayaFilter('');
                  setTypeFilter([]);
                  setDegreFilter([]);
                  if (MODERATION_TABS.includes(t.id)) { setModPage(1); loadModTab(t.id, 1); }
                }}
              >
                <span style={s.navIcon}>{t.icon}</span>
                <span style={{ flex: 1 }}>{t.label}</span>
                {n > 0 && <span style={s.badge}>{n}</span>}
              </button>
            );
          })}
        </nav>
        <div style={s.sideBottom}>
          {totalPending > 0 && (
            <div style={s.pendingAlert}>
              <span>🔔</span>
              <span>{totalPending} en attente</span>
            </div>
          )}
          <button style={s.logoutBtn} onClick={logout}>
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>
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
                  <div style={s.statsGrid}>
                    <StatCard icon="👥" label={periode === 'tout' ? 'Citoyens inscrits' : 'Nouveaux citoyens'} value={stats.nb_citoyens} color={Colors.blue} bg={Colors.blueLight} />
                    <StatCard icon="🏢" label={periode === 'tout' ? 'Associations validées' : 'Nouvelles associations'} value={stats.nb_associations} color={Colors.primary} bg={Colors.primaryLight} />
                    <StatCard icon="⚠️" label={periode === 'tout' ? 'Signalements totaux' : 'Nouveaux signalements'} value={stats.nb_signalements} color={Colors.orange} bg={Colors.orangeLight} />
                    <StatCard icon="📅" label={periode === 'tout' ? 'Événements publiés' : 'Nouveaux événements'} value={stats.nb_evenements_publies} color={Colors.purple} bg={Colors.purpleLight} />
                    <StatCard icon="✅" label={periode === 'tout' ? 'Participations validées' : 'Nouvelles participations'} value={stats.nb_participations} color={Colors.primaryMedium} bg={Colors.greenLight} />
                    <StatCard icon="🔔" label="En attente (total)" value={totalPending} color={Colors.red} bg={Colors.redLight} />
                  </div>
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
                  <button style={s.createBtn} onClick={() => { setShowCreateAssoc(true); setCreateError(''); setCreateForm({ nom: '', email: '', mot_de_passe: '', wilaya: '', telephone: '', description: '' }); }}>
                    + Nouvelle association
                  </button>
                </div>
                {assocLoading ? <Spinner color={Colors.purple} /> : !assocList.length ? (
                  <EmptyState icon="🏢" message="Aucune association" />
                ) : (
                  <>
                    <div style={s.list}>
                      {assocList.map((a) => (
                        <div key={a.id} style={r.card}>
                          <div style={{ ...r.icon, background: Colors.blue + '18', color: Colors.blue }}>🏢</div>
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
                            }}>{a.statut}</span>
                            {a.statut === 'en_attente' && (
                              <>
                                <SmallBtn color={Colors.primary} onClick={() => action(() => modererAssociation(a.id, 'validee')).then(() => loadAssociations(assocPage))}>✓</SmallBtn>
                                <SmallBtn color={Colors.orange} onClick={() => { setRejectTarget(a.id); setRejectMotif(''); }}>✗</SmallBtn>
                              </>
                            )}
                            <SmallBtn color={Colors.red} onClick={() => setDeleteAssocTarget(a.id)}>🗑</SmallBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                    {assocTotal > ASSOC_PAGE_SIZE && (
                      <div style={s.pagination}>
                        <button style={{ ...s.pageBtn, ...(assocPage === 1 ? s.pageBtnDisabled : {}) }}
                          disabled={assocPage === 1} onClick={() => setAssocPage(p => p - 1)}>← Précédent</button>
                        <span style={s.pageInfo}>Page <strong>{assocPage}</strong> / {Math.ceil(assocTotal / ASSOC_PAGE_SIZE)}</span>
                        <button style={{ ...s.pageBtn, ...(assocPage * ASSOC_PAGE_SIZE >= assocTotal ? s.pageBtnDisabled : {}) }}
                          disabled={assocPage * ASSOC_PAGE_SIZE >= assocTotal} onClick={() => setAssocPage(p => p + 1)}>Suivant →</button>
                      </div>
                    )}
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
                    <p style={s.pageSubtitle}>{pointsTotal} point{pointsTotal !== 1 ? 's' : ''}</p>
                  </div>
                  <button style={s.createBtn} onClick={() => {
                    setShowCreatePoint(true); setCreatePointError('');
                    setCreatePointForm({ nom: '', wilaya: '', adresse: '', horaires: '', description: '', latitude: '', longitude: '', type_dechet: [] });
                  }}>+ Nouveau point</button>
                </div>

                {/* Filtres */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 20, alignItems: 'center' }}>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>📍</span>
                    <select style={s.searchInput} value={pointsWilaya} onChange={e => setPointsWilaya(e.target.value)}>
                      <option value="">Toutes les wilayas</option>
                      {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
                    </select>
                  </div>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>🔘</span>
                    <select style={s.searchInput} value={pointsStatut} onChange={e => setPointsStatut(e.target.value)}>
                      <option value="">Tous les statuts</option>
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  </div>
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>♻️</span>
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
                  <EmptyState icon="📍" message="Aucun point de collecte" />
                ) : (
                  <>
                    <div style={s.list}>
                      {pointsList.map(p => {
                        const types: string[] = Array.isArray(p.type_dechet) ? p.type_dechet : [];
                        const isActif = p.statut === 'actif';
                        return (
                          <div key={p.id} style={r.card}>
                            <div style={{ ...r.icon, background: Colors.primary + '18', color: Colors.primary }}>📍</div>
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
                                {isActif ? '⏸' : '▶'}
                              </SmallBtn>
                              <SmallBtn color={Colors.purple} onClick={() => {
                                setEditPointTarget(p);
                                setEditPointForm({
                                  nom: p.nom ?? '', wilaya: p.wilaya ?? '', adresse: p.adresse ?? '',
                                  horaires: p.horaires ?? '', description: p.description ?? '',
                                  type_dechet: Array.isArray(p.type_dechet) ? [...p.type_dechet] : [],
                                });
                                setEditPointError('');
                              }}>✏️</SmallBtn>
                              <SmallBtn color={Colors.red} onClick={() => setDeletePointTarget(p.id)}>🗑</SmallBtn>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {pointsTotal > POINTS_PAGE_SIZE && (
                      <div style={s.pagination}>
                        <button style={{ ...s.pageBtn, ...(pointsPage === 1 ? s.pageBtnDisabled : {}) }}
                          disabled={pointsPage === 1} onClick={() => setPointsPage(p => p - 1)}>← Précédent</button>
                        <span style={s.pageInfo}>Page <strong>{pointsPage}</strong> / {Math.ceil(pointsTotal / POINTS_PAGE_SIZE)}</span>
                        <button style={{ ...s.pageBtn, ...(pointsPage * POINTS_PAGE_SIZE >= pointsTotal ? s.pageBtnDisabled : {}) }}
                          disabled={pointsPage * POINTS_PAGE_SIZE >= pointsTotal} onClick={() => setPointsPage(p => p + 1)}>Suivant →</button>
                      </div>
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
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>📍</span>
                    <select
                      style={s.searchInput}
                      value={wilayaFilter}
                      onChange={(e) => setWilayaFilter(e.target.value)}
                    >
                      <option value=''>Toutes les wilayas</option>
                      {WILAYAS.map(w => (
                        <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mode toggle + filtres — signalements only */}
                {tab === 'signalements' && (
                  <>
                    <div style={{ ...s.chipsRow, marginBottom: 8 }}>
                      {([['moderation', '⏳ En attente de modération'], ['a_resoudre', '🔧 Publiés — à résoudre']] as const).map(([mode, label]) => (
                        <button key={mode}
                          style={{ ...s.chip, ...(signalMode === mode ? { borderColor: Colors.purple, background: Colors.purpleLight, color: Colors.purple, fontWeight: 700 } : {}) }}
                          onClick={() => { setSignalMode(mode); setDegreFilter([]); }}
                        >{label}</button>
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
                          <span>{t.icon}</span>
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
                      return true;
                    });
                    return !filtered.length
                      ? <EmptyState icon="✅" message="Aucun signalement publié à résoudre" />
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
                      ? <EmptyState icon="🔍" message={`Aucun résultat pour « ${wilayaFilter} »`} />
                      : <EmptyState icon="✅" message="File vide — rien à modérer" />
                  ) : (
                    <>
                      <div style={s.list}>
                        {filteredModItems().map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            type={tab}
                            onDetail={() => setDetail({ item, type: tab })}
                            onValidate={() => {
                              if (tab === 'evenements')   action(() => modererEvenementAdmin(item.id, true));
                              if (tab === 'signalements') action(() => modererSignalement(item.id, 'publie'));
                              if (tab === 'points')       action(() => modererPointCollecte(item.id, 'actif'));
                            }}
                            onReject={() => {
                              if (tab === 'evenements')   action(() => modererEvenementAdmin(item.id, false));
                              if (tab === 'signalements') action(() => modererSignalement(item.id, 'rejete', 'Rejeté par l\'administrateur'));
                              if (tab === 'points')       action(() => modererPointCollecte(item.id, 'inactif'));
                            }}
                          />
                        ))}
                      </div>
                      {modTotal > MOD_PAGE_SIZE && (
                        <div style={s.pagination}>
                          <button style={{ ...s.pageBtn, ...(modPage === 1 ? s.pageBtnDisabled : {}) }}
                            disabled={modPage === 1}
                            onClick={() => { const p = modPage - 1; setModPage(p); loadModTab(tab, p); }}>
                            ← Précédent
                          </button>
                          <span style={s.pageInfo}>
                            Page <strong>{modPage}</strong> / {Math.ceil(modTotal / MOD_PAGE_SIZE)}
                          </span>
                          <button style={{ ...s.pageBtn, ...(modPage * MOD_PAGE_SIZE >= modTotal ? s.pageBtnDisabled : {}) }}
                            disabled={modPage * MOD_PAGE_SIZE >= modTotal}
                            onClick={() => { const p = modPage + 1; setModPage(p); loadModTab(tab, p); }}>
                            Suivant →
                          </button>
                        </div>
                      )}
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
                  <div style={s.searchWrap}>
                    <span style={s.searchIcon}>📍</span>
                    <select
                      style={s.searchInput}
                      value={usersWilaya}
                      onChange={(e) => { setUsersWilaya(e.target.value); setUsersPage(1); }}
                    >
                      <option value=''>Toutes les wilayas</option>
                      {WILAYAS.map(w => (
                        <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {usersLoading ? <Spinner color={Colors.blue} /> : !users.length ? (
                  <EmptyState icon="👥" message="Aucun utilisateur trouvé" />
                ) : (
                  <>
                    <div style={s.list}>
                      {users.map((u, i) => {
                        const rank = (usersPage - 1) * 50 + i + 1;
                        const isTop3 = (u.rang ?? rank) <= 3;
                        const MEDAL = ['🥇', '🥈', '🥉'];
                        return (
                          <div key={u.id} style={{ ...s.userCard, ...(isTop3 ? s.userCardTop : {}) }}>
                            <div style={s.userRank}>
                              {isTop3 ? MEDAL[(u.rang ?? rank) - 1] : `#${u.rang ?? rank}`}
                            </div>
                            <div style={s.userAvatar}>
                              {(u.prenom?.[0] ?? '?').toUpperCase()}{(u.nom?.[0] ?? '').toUpperCase()}
                            </div>
                            <div style={s.userInfo}>
                              <p style={s.userName}>{u.prenom} {u.nom}</p>
                              <p style={s.userMeta}>{u.wilaya ? `📍 ${u.wilaya}` : 'Wilaya non renseignée'}</p>
                            </div>
                            <div style={s.userRight}>
                              <span style={s.userPts}>{(u.points_total ?? 0).toLocaleString('fr-DZ')} pts</span>
                              <span style={s.userNiv}>Niveau {u.niveau}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={s.pagination}>
                      <button style={{ ...s.pageBtn, ...(usersPage === 1 ? s.pageBtnDisabled : {}) }}
                        disabled={usersPage === 1} onClick={() => setUsersPage(p => p - 1)}>← Précédent</button>
                      <span style={s.pageInfo}>
                        Page <strong>{usersPage}</strong> / {Math.max(1, Math.ceil(usersTotal / 50))}
                      </span>
                      <button style={{ ...s.pageBtn, ...(usersPage * 50 >= usersTotal ? s.pageBtnDisabled : {}) }}
                        disabled={usersPage * 50 >= usersTotal} onClick={() => setUsersPage(p => p + 1)}>Suivant →</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Detail panel (drawer) ── */}
      {detail && (
        <div style={s.overlay} onClick={closeDetail}>
          <div style={s.panel} onClick={(e) => e.stopPropagation()}>
            <div style={s.panelHeader}>
              <div>
                <h3 style={s.panelTitle}>
                  {TABS.find(t => t.id === detail.type)?.icon} Détail
                </h3>
                <p style={s.panelSubtitle}>{TABS.find(t => t.id === detail.type)?.label}</p>
              </div>
              <button style={s.closeBtn} onClick={closeDetail}>✕</button>
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
                <>
                  <ActionBtn color={Colors.primary} icon="✓" onClick={async () => {
                    await modererSignalement(detail.item.id, 'resolu'); closeDetail(); loadMain(); loadResoudre();
                  }}>Résolu</ActionBtn>
                  <ActionBtn color={Colors.red} icon="✗" onClick={async () => {
                    await modererSignalement(detail.item.id, 'rejete'); closeDetail(); loadMain(); loadResoudre();
                  }}>Rejeter</ActionBtn>
                </>
              ) : (
                <>
                  <ActionBtn color={Colors.primary} icon="✓" onClick={() => {
                    if (detail.type === 'associations') action(() => modererAssociation(detail.item.id, 'validee'));
                    if (detail.type === 'evenements')   action(() => modererEvenementAdmin(detail.item.id, true));
                    if (detail.type === 'signalements') action(() => modererSignalement(detail.item.id, 'publie'));
                    if (detail.type === 'points')       action(() => modererPointCollecte(detail.item.id, 'actif'));
                  }}>Valider</ActionBtn>
                  {detail.type === 'signalements' && (
                    <ActionBtn color={Colors.blue} icon="✓" onClick={() => action(() => modererSignalement(detail.item.id, 'resolu'))}>
                      Résolu
                    </ActionBtn>
                  )}
                  <ActionBtn color={Colors.red} icon="✗" onClick={() => {
                    if (detail.type === 'associations') { setRejectTarget(detail.item.id); setRejectMotif(''); closeDetail(); }
                    else if (detail.type === 'evenements')   action(() => modererEvenementAdmin(detail.item.id, false));
                    else if (detail.type === 'signalements') action(() => modererSignalement(detail.item.id, 'rejete'));
                    else if (detail.type === 'points')       action(() => modererPointCollecte(detail.item.id, 'inactif'));
                  }}>Rejeter</ActionBtn>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create point modal ── */}
      {showCreatePoint && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ ...s.modal, maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' as const }}>
            <div style={{ ...s.modalIcon, background: Colors.primaryLight, color: Colors.primary }}>📍</div>
            <h3 style={s.modalTitle}>Nouveau point de collecte</h3>
            {createPointError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{createPointError}</p>}
            <input placeholder="Nom *" value={createPointForm.nom} onChange={e => setCreatePointForm(f => ({ ...f, nom: e.target.value }))} style={s.formInput} />
            <select value={createPointForm.wilaya} onChange={e => setCreatePointForm(f => ({ ...f, wilaya: e.target.value }))} style={s.formInput}>
              <option value="">Wilaya *</option>
              {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
            </select>
            <input placeholder="Adresse" value={createPointForm.adresse} onChange={e => setCreatePointForm(f => ({ ...f, adresse: e.target.value }))} style={s.formInput} />
            <input placeholder="Horaires (ex: Lun-Ven 8h-17h)" value={createPointForm.horaires} onChange={e => setCreatePointForm(f => ({ ...f, horaires: e.target.value }))} style={s.formInput} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input placeholder="Latitude *" type="number" step="any" value={createPointForm.latitude} onChange={e => setCreatePointForm(f => ({ ...f, latitude: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
              <input placeholder="Longitude *" type="number" step="any" value={createPointForm.longitude} onChange={e => setCreatePointForm(f => ({ ...f, longitude: e.target.value }))} style={{ ...s.formInput, flex: 1 }} />
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
                    {t.icon} {t.value}
                  </button>
                );
              })}
            </div>
            <textarea placeholder="Description" rows={2} value={createPointForm.description} onChange={e => setCreatePointForm(f => ({ ...f, description: e.target.value }))} style={{ ...s.formInput, height: 60, resize: 'vertical' as const }} />
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} icon="" onClick={() => setShowCreatePoint(false)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.primary} icon="📍"
                disabled={createPointLoading || !createPointForm.nom.trim() || !createPointForm.wilaya || !createPointForm.latitude || !createPointForm.longitude || createPointForm.type_dechet.length === 0}
                onClick={async () => {
                  setCreatePointLoading(true); setCreatePointError('');
                  try {
                    await creerPointCollecte({
                      nom: createPointForm.nom, wilaya: createPointForm.wilaya,
                      adresse: createPointForm.adresse || undefined, horaires: createPointForm.horaires || undefined,
                      description: createPointForm.description || undefined,
                      latitude: parseFloat(createPointForm.latitude), longitude: parseFloat(createPointForm.longitude),
                      type_dechet: createPointForm.type_dechet,
                    });
                    setShowCreatePoint(false); loadPoints(pointsPage); loadMain();
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

      {/* ── Edit point modal ── */}
      {editPointTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ ...s.modal, maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' as const }}>
            <div style={{ ...s.modalIcon, background: Colors.purpleLight, color: Colors.purple }}>✏️</div>
            <h3 style={s.modalTitle}>Modifier le point de collecte</h3>
            {editPointError && <p style={{ color: Colors.red, fontSize: 13, marginBottom: 12 }}>{editPointError}</p>}
            <input placeholder="Nom" value={editPointForm.nom} onChange={e => setEditPointForm(f => ({ ...f, nom: e.target.value }))} style={s.formInput} />
            <select value={editPointForm.wilaya} onChange={e => setEditPointForm(f => ({ ...f, wilaya: e.target.value }))} style={s.formInput}>
              <option value="">Wilaya</option>
              {WILAYAS.map(w => <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>)}
            </select>
            <input placeholder="Adresse" value={editPointForm.adresse} onChange={e => setEditPointForm(f => ({ ...f, adresse: e.target.value }))} style={s.formInput} />
            <div>
              <input
                placeholder="Horaires (ex: 8h-17h)"
                value={editPointForm.horaires}
                onChange={e => setEditPointForm(f => ({ ...f, horaires: e.target.value }))}
                style={{ ...s.formInput, borderColor: editPointForm.horaires && !/^\d{1,2}h-\d{1,2}h$/.test(editPointForm.horaires) ? Colors.red : undefined }}
              />
              {editPointForm.horaires && !/^\d{1,2}h-\d{1,2}h$/.test(editPointForm.horaires) && (
                <p style={{ color: Colors.red, fontSize: 11, marginTop: -8, marginBottom: 10 }}>Format requis : Xh-Yh (ex: 8h-17h)</p>
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
                    {t.icon} {t.value}
                  </button>
                );
              })}
            </div>
            <textarea placeholder="Description" rows={2} value={editPointForm.description} onChange={e => setEditPointForm(f => ({ ...f, description: e.target.value }))} style={{ ...s.formInput, height: 60, resize: 'vertical' as const }} />
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} icon="" onClick={() => setEditPointTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.purple} icon="✏️"
                disabled={editPointLoading || (!!editPointForm.horaires && !/^\d{1,2}h-\d{1,2}h$/.test(editPointForm.horaires))}
                onClick={async () => {
                  setEditPointLoading(true); setEditPointError('');
                  try {
                    await modifierPointCollecteAdmin(editPointTarget.id, {
                      nom: editPointForm.nom || undefined,
                      wilaya: editPointForm.wilaya || undefined,
                      adresse: editPointForm.adresse || undefined,
                      horaires: editPointForm.horaires || undefined,
                      description: editPointForm.description || undefined,
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

      {/* ── Delete point confirm ── */}
      {deletePointTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}>🗑</div>
            <h3 style={s.modalTitle}>Supprimer ce point ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} icon="" onClick={() => setDeletePointTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon="🗑" onClick={async () => {
                await supprimerPointCollecteAdmin(deletePointTarget!);
                setDeletePointTarget(null); loadPoints(pointsPage); loadMain();
              }}>Confirmer</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Create association modal ── */}
      {showCreateAssoc && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ ...s.modal, maxWidth: 520 }}>
            <div style={{ ...s.modalIcon, background: Colors.purpleLight, color: Colors.purple }}>🏢</div>
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
              <ActionBtn color={Colors.grey} icon="" onClick={() => setShowCreateAssoc(false)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.purple} icon="🏢" disabled={createLoading || !createForm.nom.trim() || !createForm.email.trim() || createForm.mot_de_passe.length < 8 || !createForm.wilaya}
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
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ ...s.modal, maxWidth: 420 }}>
            <div style={{ ...s.modalIcon, background: Colors.redLight, color: Colors.red }}>🗑</div>
            <h3 style={s.modalTitle}>Supprimer l'association ?</h3>
            <p style={s.modalDesc}>Cette action est irréversible. Tous les événements liés seront également supprimés.</p>
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} icon="" onClick={() => setDeleteAssocTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon="🗑" onClick={async () => {
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
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={s.modal}>
            <div style={s.modalIcon}>✗</div>
            <h3 style={s.modalTitle}>Motif de rejet</h3>
            <p style={s.modalDesc}>Ce motif sera communiqué à l'association.</p>
            <textarea style={s.motifArea} rows={4} value={rejectMotif}
              onChange={(e) => setRejectMotif(e.target.value)}
              placeholder="Expliquez la raison du rejet..." />
            <div style={s.modalRow}>
              <ActionBtn color={Colors.grey} icon="" onClick={() => setRejectTarget(null)}>Annuler</ActionBtn>
              <ActionBtn color={Colors.red} icon="✗" disabled={!rejectMotif.trim()}
                onClick={() => action(() => { setRejectTarget(null); return modererAssociation(rejectTarget!, 'rejetee', rejectMotif); })}>
                Confirmer le rejet
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div style={lb.overlay} onClick={() => setLightbox(null)}>
          <button style={lb.closeBtn} onClick={() => setLightbox(null)}>✕</button>
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
  return (
    <div style={d.section}>
      <Section title="Informations">
        <DetailRow label="Nom"   value={item.nom} />
        <DetailRow label="Email" value={item.email} />
        {item.telephone   && <DetailRow label="Téléphone"   value={item.telephone} />}
        {item.wilaya      && <DetailRow label="Wilaya"      value={item.wilaya} />}
        {item.description && <DetailRow label="Description" value={item.description} />}
      </Section>
      <Section title="Statut">
        <DetailRow label="Statut actuel" value={
          <span style={{ background: Colors.orangeLight, color: Colors.orange, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
            {item.statut}
          </span>
        } />
        <DetailRow label="Inscrite le" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
      </Section>
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
    stats: '', utilisateurs: '', carte: '',
    associations: item.nom, evenements: item.titre, signalements: item.titre, points: item.nom,
  };
  const metaMap: Record<Tab, string> = {
    stats: '', utilisateurs: '', carte: '',
    associations: item.email,
    evenements:   `${item.association?.nom ?? '—'}${item.wilaya ? ` · ${item.wilaya}` : ''}`,
    signalements: `${item.citoyen?.prenom ?? ''} ${item.citoyen?.nom ?? ''}${item.wilaya ? ` · ${item.wilaya}` : ''}`,
    points:       `${item.wilaya ? `${item.wilaya} · ` : ''}${Array.isArray(item.type_dechet) ? item.type_dechet.slice(0, 3).join(', ') : item.type_dechet}`,
  };
  const icons: Record<Tab, string> = { stats: '', utilisateurs: '', carte: '', associations: '🏢', evenements: '📅', signalements: '⚠️', points: '📍' };
  const iconColors: Record<Tab, string> = { stats: '', utilisateurs: '', carte: '', associations: Colors.blue, evenements: Colors.purple, signalements: Colors.orange, points: Colors.primary };

  const photos: string[] = type === 'signalements' && Array.isArray(item.photos) ? item.photos : [];
  const deg = type === 'signalements' ? (item.degre_pollution ?? 0) : 0;

  return (
    <div style={r.card}>
      <div style={{ ...r.icon, background: iconColors[type] + '18', color: iconColors[type] }}>
        {icons[type]}
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
            <span style={{ background: Colors.blueLight, color: Colors.blue, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
              📷 {photos.length}
            </span>
          )}
        </div>
        <p style={r.meta}>{metaMap[type]}</p>
        <p style={r.date}>{new Date(item.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
      <div style={r.actions}>
        <button style={r.detailBtn} onClick={onDetail}>👁 Détail</button>
        <SmallBtn color={Colors.primary} onClick={onValidate}>✓</SmallBtn>
        <SmallBtn color={Colors.red}     onClick={onReject}>✗</SmallBtn>
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

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: number; color: string; bg: string }) {
  return (
    <div style={sc.card}>
      <div style={{ ...sc.iconWrap, background: bg, color }}>
        <span style={sc.icon}>{icon}</span>
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
  children: React.ReactNode; color: string; icon: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: color, color: Colors.white,
      border: 'none', borderRadius: 10, padding: '10px 20px',
      fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, flex: 1, justifyContent: 'center',
    }}>
      {icon && <span>{icon}</span>}{children}
    </button>
  );
}

function SmallBtn({ children, color, onClick }: { children: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: color + '15', color, border: `1.5px solid ${color}30`,
      borderRadius: 8, width: 34, height: 34, fontSize: 15, fontWeight: 700,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: Colors.grey }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 600 }}>{message}</p>
    </div>
  );
}

/* ── Styles ── */

const s: Record<string, React.CSSProperties> = {
  layout:    { display: 'flex', minHeight: '100vh', background: '#F8F9FB' },
  sidebar:   { width: 256, background: Colors.white, borderRight: `1px solid ${Colors.greyBorder}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  sideTop:   { padding: '28px 20px 20px', borderBottom: `1px solid ${Colors.greyBorder}` },
  logo:      { fontSize: 20, fontWeight: 800, color: Colors.primaryDark, marginBottom: 10 },
  roleTag:   { display: 'inline-block', background: Colors.purpleLight, color: Colors.purple, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 },
  nav:       { flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem:   { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: Colors.grey, fontWeight: 500, textAlign: 'left', width: '100%', transition: 'all 0.15s' },
  navActive: { background: Colors.purpleLight, color: Colors.purple, fontWeight: 700 },
  navIcon:   { fontSize: 18, width: 24, textAlign: 'center' },
  badge:     { marginLeft: 'auto', background: Colors.red, color: Colors.white, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  sideBottom:{ padding: '12px 10px', borderTop: `1px solid ${Colors.greyBorder}`, display: 'flex', flexDirection: 'column', gap: 8 },
  pendingAlert: { display: 'flex', alignItems: 'center', gap: 8, background: Colors.orangeLight, color: Colors.orange, borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600 },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: Colors.greyLight, color: Colors.grey, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  main:      { flex: 1, padding: '36px 40px', overflowY: 'auto' as const, maxWidth: 1100 },
  pageHeader:{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: Colors.primaryDark, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: Colors.grey },
  searchWrap:  { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon:  { position: 'absolute', left: 12, fontSize: 14, pointerEvents: 'none' },
  searchInput: { border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '9px 14px 9px 36px', fontSize: 14, outline: 'none', width: 220, background: Colors.white, color: Colors.black },
  statsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 },
  periodeRow:  { display: 'flex', gap: 4, background: Colors.greyLight, borderRadius: 12, padding: 4 },
  periodePill: { border: 'none', background: 'none', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.grey },
  periodeActive: { background: Colors.white, color: Colors.purple, boxShadow: '0 1px 6px rgba(0,0,0,0.10)' },
  chipsRow:  { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  chip:      { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 20, background: Colors.white, fontSize: 13, fontWeight: 600, color: Colors.grey, cursor: 'pointer' },
  chipClear: { padding: '6px 14px', border: 'none', borderRadius: 20, background: Colors.greyLight, fontSize: 12, fontWeight: 600, color: Colors.grey, cursor: 'pointer' },
  list:      { display: 'flex', flexDirection: 'column', gap: 8 },
  pagination:{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 28 },
  pageBtn:   { background: Colors.white, border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.primaryDark },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pageInfo:  { fontSize: 13, color: Colors.grey },
  userCard:  { background: Colors.white, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: `1px solid ${Colors.greyBorder}` },
  userCardTop: { borderColor: Colors.orange + '50', background: Colors.orangeLight + '40' },
  userRank:  { width: 40, fontSize: 20, textAlign: 'center', flexShrink: 0 },
  userAvatar:{ width: 42, height: 42, borderRadius: 21, background: Colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: Colors.primaryDark, flexShrink: 0 },
  userInfo:  { flex: 1, minWidth: 0 },
  userName:  { fontSize: 15, fontWeight: 700, color: Colors.primaryDark },
  userMeta:  { fontSize: 12, color: Colors.grey, marginTop: 3 },
  userRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  userPts:   { fontSize: 15, fontWeight: 800, color: Colors.primaryDark },
  userNiv:   { fontSize: 12, color: Colors.grey, background: Colors.primaryLight, borderRadius: 20, padding: '2px 10px', fontWeight: 600 },
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 200 },
  panel:     { background: Colors.white, width: 500, height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 28px', borderBottom: `1px solid ${Colors.greyBorder}` },
  panelTitle:  { fontSize: 18, fontWeight: 800, color: Colors.primaryDark },
  panelSubtitle: { fontSize: 13, color: Colors.grey, marginTop: 2 },
  closeBtn:    { background: Colors.greyLight, border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 15, color: Colors.grey, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panelBody:   { flex: 1, overflowY: 'auto' as const, padding: '24px 28px' },
  panelFooter: { padding: '16px 28px', borderTop: `1px solid ${Colors.greyBorder}`, display: 'flex', gap: 10 },
  createBtn: { background: Colors.purple, color: Colors.white, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  formInput: { width: '100%', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10, background: Colors.white, color: Colors.black },
  modal:     { background: Colors.white, borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 460, boxShadow: '0 12px 48px rgba(0,0,0,0.20)' },
  modalIcon: { width: 48, height: 48, borderRadius: 24, background: Colors.redLight, color: Colors.red, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontWeight: 700 },
  modalTitle:{ fontSize: 20, fontWeight: 800, color: Colors.primaryDark, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: Colors.grey, marginBottom: 20 },
  motifArea: { width: '100%', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const },
  modalRow:  { display: 'flex', gap: 12, marginTop: 20 },
};

const r: Record<string, React.CSSProperties> = {
  card:      { background: Colors.white, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${Colors.greyBorder}` },
  icon:      { fontSize: 20, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:      { flex: 1, minWidth: 0 },
  title:     { fontSize: 14, fontWeight: 700, color: Colors.primaryDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 },
  meta:      { fontSize: 12, color: Colors.grey, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date:      { fontSize: 11, color: Colors.greyBorder, marginTop: 3 },
  actions:   { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' },
  detailBtn: { background: Colors.blueLight, color: Colors.blue, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const },
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
  card:    { background: Colors.white, borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${Colors.greyBorder}` },
  iconWrap:{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  icon:    { fontSize: 22 },
  val:     { fontSize: 34, fontWeight: 800, color: Colors.primaryDark, marginBottom: 4 },
  label:   { fontSize: 13, color: Colors.grey, marginBottom: 12 },
  bar:     { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, minWidth: 4 },
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
