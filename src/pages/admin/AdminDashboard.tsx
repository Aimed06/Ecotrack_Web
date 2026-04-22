import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import {
  getAdminStats, getModerationQueue, getUtilisateurs,
  modererAssociation, modererEvenementAdmin,
  modererSignalement, modererPointCollecte,
} from '../../api';

type Tab = 'stats' | 'associations' | 'evenements' | 'signalements' | 'points' | 'utilisateurs';
interface Stats {
  nb_citoyens: number; nb_associations: number; nb_signalements: number;
  nb_evenements_publies: number; nb_participations: number;
}
interface Queue { associations: any[]; evenements: any[]; signalements: any[]; points_collecte: any[]; }

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'stats',         label: 'Statistiques',      icon: '📊' },
  { id: 'associations',  label: 'Associations',       icon: '🏢' },
  { id: 'evenements',    label: 'Événements',         icon: '📅' },
  { id: 'signalements',  label: 'Signalements',       icon: '⚠️' },
  { id: 'points',        label: 'Points de collecte', icon: '📍' },
  { id: 'utilisateurs',  label: 'Utilisateurs',       icon: '👥' },
];

const DEGRE_COLORS = ['', Colors.primary, '#97C459', Colors.orange, '#E8703A', Colors.red];
const DEGRE_LABELS = ['', 'Très léger', 'Léger', 'Modéré', 'Grave', 'Critique'];
const MODERATION_TABS: Tab[] = ['associations', 'evenements', 'signalements', 'points'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab]         = useState<Tab>('stats');
  const [stats, setStats]     = useState<Stats | null>(null);
  const [queue, setQueue]     = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState<{ item: any; type: Tab } | null>(null);
  const [rejectMotif, setRejectMotif]   = useState('');
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  // Filtre période pour les stats
  type Periode = 'tout' | 'semaine' | 'mois';
  const [periode, setPeriode] = useState<Periode>('tout');
  const [statsLoading, setStatsLoading] = useState(false);
  const periodeInitialized = useRef(false);

  // Filtre wilaya pour les onglets de modération (client-side)
  const [wilayaFilter, setWilayaFilter] = useState('');

  // Utilisateurs
  const [users, setUsers]           = useState<any[]>([]);
  const [usersPage, setUsersPage]   = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersWilaya, setUsersWilaya] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

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

  useEffect(() => { loadMain(); }, []);
  useEffect(() => {
    if (!periodeInitialized.current) { periodeInitialized.current = true; return; }
    loadStats(periode);
  }, [periode]);
  useEffect(() => {
    if (tab === 'utilisateurs') loadUsers(usersWilaya, usersPage);
  }, [tab, usersWilaya, usersPage]);

  const logout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('role');
    navigate('/admin/login');
  };

  const closeDetail = () => setDetail(null);
  const action = async (fn: () => Promise<any>) => { await fn(); closeDetail(); loadMain(); };

  const pendingCounts: Record<string, number> = {
    associations: queue?.associations.length ?? 0,
    evenements:   queue?.evenements.length ?? 0,
    signalements: queue?.signalements.length ?? 0,
    points:       queue?.points_collecte.length ?? 0,
  };
  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  const allItems: Record<string, any[]> = {
    associations: queue?.associations ?? [],
    evenements:   queue?.evenements ?? [],
    signalements: queue?.signalements ?? [],
    points:       queue?.points_collecte ?? [],
  };

  // Filtre wilaya client-side sur les onglets de modération
  const filteredItems = (key: string) => {
    const list = allItems[key] ?? [];
    if (!wilayaFilter.trim()) return list;
    return list.filter((item) =>
      (item.wilaya ?? '').toLowerCase().includes(wilayaFilter.toLowerCase())
    );
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
                onClick={() => { setTab(t.id); setWilayaFilter(''); }}
              >
                <span>{t.icon}</span>
                <span style={{ flex: 1 }}>{t.label}</span>
                {n > 0 && <span style={s.redDot}>{n}</span>}
              </button>
            );
          })}
        </nav>
        <button style={s.logoutBtn} onClick={logout}>🚪 Déconnexion</button>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>
        {loading ? <Spinner color={Colors.purple} /> : (
          <>
            {/* Stats */}
            {tab === 'stats' && stats && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h2 style={{ ...s.pageTitle, marginBottom: 0 }}>Statistiques</h2>
                  <div style={s.periodeRow}>
                    {(['tout', 'semaine', 'mois'] as const).map(p => (
                      <button key={p}
                        style={{ ...s.periodePill, ...(periode === p ? s.periodeActive : {}) }}
                        onClick={() => setPeriode(p)}>
                        {p === 'tout' ? 'Tout' : p === 'semaine' ? 'Cette semaine' : 'Ce mois'}
                      </button>
                    ))}
                  </div>
                </div>
                {statsLoading ? <Spinner color={Colors.purple} /> : (
                  <div style={s.statsGrid}>
                    <Stat icon="👥" label={periode === 'tout' ? 'Citoyens inscrits'       : 'Nouveaux citoyens'}      value={stats.nb_citoyens}           color={Colors.blue} />
                    <Stat icon="🏢" label={periode === 'tout' ? 'Associations validées'   : 'Nouvelles associations'}  value={stats.nb_associations}       color={Colors.primary} />
                    <Stat icon="⚠️" label={periode === 'tout' ? 'Signalements totaux'     : 'Nouveaux signalements'}   value={stats.nb_signalements}       color={Colors.orange} />
                    <Stat icon="📅" label={periode === 'tout' ? 'Événements publiés'      : 'Nouveaux événements'}     value={stats.nb_evenements_publies} color={Colors.purple} />
                    <Stat icon="✅" label={periode === 'tout' ? 'Participations validées' : 'Nouvelles participations'} value={stats.nb_participations}     color={Colors.primaryMedium} />
                    <Stat icon="🔔" label="En attente (total)"      value={totalPending}                color={Colors.red} />
                  </div>
                )}
              </div>
            )}

            {/* Moderation lists */}
            {MODERATION_TABS.includes(tab) && (
              <div>
                <div style={s.listHeader}>
                  <h2 style={{ ...s.pageTitle, marginBottom: 0 }}>
                    {TABS.find(t => t.id === tab)?.label} en attente
                  </h2>
                  <input
                    style={s.searchInput}
                    placeholder="Filtrer par wilaya..."
                    value={wilayaFilter}
                    onChange={(e) => setWilayaFilter(e.target.value)}
                  />
                </div>

                {!filteredItems(tab).length ? (
                  wilayaFilter
                    ? <p style={s.noResult}>Aucun résultat pour « {wilayaFilter} »</p>
                    : <EmptyState />
                ) : (
                  <div style={s.list}>
                    {filteredItems(tab).map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        type={tab}
                        onDetail={() => setDetail({ item, type: tab })}
                        onValidate={() => {
                          if (tab === 'associations') action(() => modererAssociation(item.id, 'validee'));
                          if (tab === 'evenements')   action(() => modererEvenementAdmin(item.id, true));
                          if (tab === 'signalements') action(() => modererSignalement(item.id, 'publie'));
                          if (tab === 'points')       action(() => modererPointCollecte(item.id, 'actif'));
                        }}
                        onReject={() => {
                          if (tab === 'associations') { setRejectTarget(item.id); setRejectMotif(''); }
                          else if (tab === 'evenements')   action(() => modererEvenementAdmin(item.id, false));
                          else if (tab === 'signalements') action(() => modererSignalement(item.id, 'rejete'));
                          else if (tab === 'points')       action(() => modererPointCollecte(item.id, 'inactif'));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Utilisateurs */}
            {tab === 'utilisateurs' && (
              <div>
                <div style={s.listHeader}>
                  <h2 style={{ ...s.pageTitle, marginBottom: 0 }}>
                    Utilisateurs {usersTotal > 0 && <span style={s.totalBadge}>{usersTotal} total</span>}
                  </h2>
                  <input
                    style={s.searchInput}
                    placeholder="Filtrer par wilaya..."
                    value={usersWilaya}
                    onChange={(e) => { setUsersWilaya(e.target.value); setUsersPage(1); }}
                  />
                </div>

                {usersLoading ? <Spinner color={Colors.blue} /> : !users.length ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: Colors.grey }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                    <p>Aucun utilisateur trouvé</p>
                  </div>
                ) : (
                  <>
                    <div style={s.usersGrid}>
                      {users.map((u, i) => {
                        const rank = (usersPage - 1) * 50 + i + 1;
                        return (
                          <div key={u.id} style={u.rang <= 3 ? { ...s.userCard, borderColor: Colors.orange + '60' } : s.userCard}>
                            <div style={s.userRank}>#{u.rang ?? rank}</div>
                            <div style={s.userAvatar}>
                              {(u.prenom?.[0] ?? '?')}{(u.nom?.[0] ?? '')}
                            </div>
                            <div style={s.userInfo}>
                              <p style={s.userName}>{u.prenom} {u.nom}</p>
                              <p style={s.userMeta}>
                                {u.wilaya ? `📍 ${u.wilaya}` : 'Wilaya non renseignée'}
                              </p>
                            </div>
                            <div style={s.userRight}>
                              <span style={s.userPts}>{u.points_total} pts</span>
                              <span style={s.userNiv}>Niv. {u.niveau}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    <div style={s.pagination}>
                      <button style={s.pageBtn} disabled={usersPage === 1}
                        onClick={() => setUsersPage(p => p - 1)}>← Précédent</button>
                      <span style={s.pageInfo}>
                        Page {usersPage} / {Math.max(1, Math.ceil(usersTotal / 50))}
                      </span>
                      <button style={s.pageBtn} disabled={usersPage * 50 >= usersTotal}
                        onClick={() => setUsersPage(p => p + 1)}>Suivant →</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Detail panel ── */}
      {detail && (
        <div style={s.overlay} onClick={closeDetail}>
          <div style={s.panel} onClick={(e) => e.stopPropagation()}>
            <div style={s.panelHeader}>
              <h3 style={s.panelTitle}>Détail</h3>
              <button style={s.closeBtn} onClick={closeDetail}>✕</button>
            </div>
            <div style={s.panelBody}>
              {detail.type === 'signalements' && <SignalementDetail item={detail.item} />}
              {detail.type === 'evenements'   && <EvenementDetail   item={detail.item} />}
              {detail.type === 'associations' && <AssocDetail        item={detail.item} />}
              {detail.type === 'points'       && <PointDetail        item={detail.item} />}
            </div>
            <div style={s.panelFooter}>
              <Btn color={Colors.primary} onClick={() => {
                if (detail.type === 'associations') action(() => modererAssociation(detail.item.id, 'validee'));
                if (detail.type === 'evenements')   action(() => modererEvenementAdmin(detail.item.id, true));
                if (detail.type === 'signalements') action(() => modererSignalement(detail.item.id, 'publie'));
                if (detail.type === 'points')       action(() => modererPointCollecte(detail.item.id, 'actif'));
              }}>✓ Valider / Accepter</Btn>
              <Btn color={Colors.red} onClick={() => {
                if (detail.type === 'associations') { setRejectTarget(detail.item.id); setRejectMotif(''); closeDetail(); }
                else if (detail.type === 'evenements')   action(() => modererEvenementAdmin(detail.item.id, false));
                else if (detail.type === 'signalements') action(() => modererSignalement(detail.item.id, 'rejete'));
                else if (detail.type === 'points')       action(() => modererPointCollecte(detail.item.id, 'inactif'));
              }}>✗ Rejeter</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject association modal ── */}
      {rejectTarget !== null && (
        <div style={{ ...s.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Motif de rejet</h3>
            <textarea style={s.motifArea} rows={4} value={rejectMotif}
              onChange={(e) => setRejectMotif(e.target.value)}
              placeholder="Expliquez la raison du rejet de l'association..." />
            <div style={s.modalRow}>
              <Btn color={Colors.grey} onClick={() => setRejectTarget(null)}>Annuler</Btn>
              <Btn color={Colors.red} disabled={!rejectMotif.trim()}
                onClick={() => action(() => { setRejectTarget(null); return modererAssociation(rejectTarget!, 'rejetee', rejectMotif); })}>
                Confirmer le rejet
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Detail components ── */

function SignalementDetail({ item }: { item: any }) {
  const photos: string[] = Array.isArray(item.photos) ? item.photos : [];
  const color = DEGRE_COLORS[item.degre_pollution] ?? Colors.grey;
  const label = DEGRE_LABELS[item.degre_pollution] ?? '—';
  const mapsUrl = item.latitude && item.longitude
    ? `https://maps.google.com/?q=${item.latitude},${item.longitude}` : null;
  return (
    <div style={d.section}>
      <DetailRow label="Titre" value={item.titre} />
      {item.description && <DetailRow label="Description" value={item.description} />}
      <DetailRow label="Citoyen" value={`${item.citoyen?.prenom ?? ''} ${item.citoyen?.nom ?? ''}`} />
      <DetailRow label="Degré de pollution"
        value={<span style={{ color, fontWeight: 700 }}>{item.degre_pollution}/5 — {label}</span>} />
      {item.wilaya  && <DetailRow label="Wilaya"  value={item.wilaya} />}
      {item.commune && <DetailRow label="Commune" value={item.commune} />}
      <DetailRow label="Coordonnées GPS"
        value={item.latitude
          ? <a href={mapsUrl!} target="_blank" rel="noreferrer" style={{ color: Colors.blue }}>
              {parseFloat(item.latitude).toFixed(5)}, {parseFloat(item.longitude).toFixed(5)} ↗
            </a>
          : '—'} />
      <DetailRow label="Date" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
      {photos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={d.label}>Photos ({photos.length})</p>
          <div style={d.photoGrid}>
            {photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`photo ${i + 1}`} style={d.photo} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EvenementDetail({ item }: { item: any }) {
  const mapsUrl = item.latitude && item.longitude
    ? `https://maps.google.com/?q=${item.latitude},${item.longitude}` : null;
  return (
    <div style={d.section}>
      <DetailRow label="Titre"       value={item.titre} />
      {item.description && <DetailRow label="Description" value={item.description} />}
      <DetailRow label="Association" value={item.association?.nom ?? '—'} />
      <DetailRow label="Statut"      value={item.statut} />
      <DetailRow label="Date de début" value={new Date(item.date_debut).toLocaleString('fr-DZ')} />
      <DetailRow label="Date de fin"   value={new Date(item.date_fin).toLocaleString('fr-DZ')} />
      {item.wilaya  && <DetailRow label="Wilaya"  value={item.wilaya} />}
      {item.adresse && <DetailRow label="Adresse" value={item.adresse} />}
      {mapsUrl && (
        <DetailRow label="Localisation"
          value={<a href={mapsUrl} target="_blank" rel="noreferrer" style={{ color: Colors.blue }}>
            {parseFloat(item.latitude).toFixed(5)}, {parseFloat(item.longitude).toFixed(5)} — Voir sur Maps ↗
          </a>} />
      )}
      {item.nb_places_max && <DetailRow label="Places max" value={item.nb_places_max} />}
      <DetailRow label="Points participation" value={`+${item.points_participation} pts`} />
      <DetailRow label="Créé le" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
    </div>
  );
}

function AssocDetail({ item }: { item: any }) {
  return (
    <div style={d.section}>
      <DetailRow label="Nom"   value={item.nom} />
      <DetailRow label="Email" value={item.email} />
      {item.wilaya      && <DetailRow label="Wilaya"      value={item.wilaya} />}
      {item.telephone   && <DetailRow label="Téléphone"   value={item.telephone} />}
      {item.description && <DetailRow label="Description" value={item.description} />}
      <DetailRow label="Statut actuel" value={item.statut} />
      <DetailRow label="Inscrite le"   value={new Date(item.created_at).toLocaleString('fr-DZ')} />
    </div>
  );
}

function PointDetail({ item }: { item: any }) {
  const types = Array.isArray(item.type_dechet) ? item.type_dechet : [];
  const mapsUrl = item.latitude && item.longitude
    ? `https://maps.google.com/?q=${item.latitude},${item.longitude}` : null;
  return (
    <div style={d.section}>
      <DetailRow label="Nom" value={item.nom} />
      {item.description && <DetailRow label="Description" value={item.description} />}
      {item.wilaya  && <DetailRow label="Wilaya"  value={item.wilaya} />}
      {item.adresse && <DetailRow label="Adresse" value={item.adresse} />}
      {mapsUrl && (
        <DetailRow label="Localisation"
          value={<a href={mapsUrl} target="_blank" rel="noreferrer" style={{ color: Colors.blue }}>
            {parseFloat(item.latitude).toFixed(5)}, {parseFloat(item.longitude).toFixed(5)} — Voir sur Maps ↗
          </a>} />
      )}
      <DetailRow label="Types de déchets"
        value={<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 2 }}>
          {types.map((t: string) => (
            <span key={t} style={{ background: Colors.primaryLight, color: Colors.primaryDark, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{t}</span>
          ))}
        </div>} />
      {item.horaires && <DetailRow label="Horaires"   value={item.horaires} />}
      <DetailRow label="Proposé le" value={new Date(item.created_at).toLocaleString('fr-DZ')} />
    </div>
  );
}

/* ── Shared components ── */

function ItemRow({ item, type, onDetail, onValidate, onReject }: {
  item: any; type: Tab; onDetail: () => void; onValidate: () => void; onReject: () => void;
}) {
  const labelMap: Record<Tab, string> = {
    stats: '', utilisateurs: '',
    associations: item.nom, evenements: item.titre, signalements: item.titre, points: item.nom,
  };
  const metaMap: Record<Tab, string> = {
    stats: '', utilisateurs: '',
    associations: item.email,
    evenements:   `par ${item.association?.nom ?? '—'}${item.wilaya ? ` · ${item.wilaya}` : ''}`,
    signalements: `${item.citoyen?.prenom ?? ''} ${item.citoyen?.nom ?? ''} · degré ${item.degre_pollution}/5${item.wilaya ? ` · ${item.wilaya}` : ''}`,
    points:       `${item.wilaya ? `${item.wilaya} · ` : ''}${Array.isArray(item.type_dechet) ? item.type_dechet.join(', ') : item.type_dechet}`,
  };
  const icons: Record<Tab, string> = { stats: '', utilisateurs: '', associations: '🏢', evenements: '📅', signalements: '⚠️', points: '📍' };

  return (
    <div style={r.card}>
      <div style={r.icon}>{icons[type]}</div>
      <div style={r.info}>
        <p style={r.title}>{labelMap[type]}</p>
        <p style={r.meta}>{metaMap[type]}</p>
        <p style={r.date}>{new Date(item.created_at).toLocaleDateString('fr-DZ')}</p>
      </div>
      <div style={r.actions}>
        <button style={r.detailBtn} onClick={onDetail}>👁 Détail</button>
        <Btn color={Colors.primary} onClick={onValidate}>✓</Btn>
        <Btn color={Colors.red}     onClick={onReject}>✗</Btn>
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

function Stat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{ ...sc.card, borderTopColor: color }}>
      <span style={sc.icon}>{icon}</span>
      <p style={sc.val}>{value.toLocaleString('fr-DZ')}</p>
      <p style={sc.label}>{label}</p>
    </div>
  );
}

function Btn({ children, color, onClick, disabled }: {
  children: React.ReactNode; color: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: color + '18', color, border: `1.5px solid ${color}30`,
      borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 40, height: 40, border: `4px solid ${Colors.greyBorder}`, borderTopColor: color, borderRadius: '50%' }} />
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: Colors.grey }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <p style={{ fontSize: 15 }}>File vide — rien à modérer</p>
    </div>
  );
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  layout:    { display: 'flex', minHeight: '100vh', background: Colors.greyLight },
  sidebar:   { width: 240, background: Colors.white, borderRight: `1px solid ${Colors.greyBorder}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  sideTop:   { padding: '24px 20px 16px', borderBottom: `1px solid ${Colors.greyBorder}` },
  logo:      { fontSize: 18, fontWeight: 800, color: Colors.primaryDark, marginBottom: 8 },
  roleTag:   { display: 'inline-block', background: Colors.purpleLight, color: Colors.purple, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 },
  nav:       { flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  navItem:   { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: Colors.grey, fontWeight: 500, textAlign: 'left', width: '100%' },
  navActive: { background: Colors.purpleLight, color: Colors.purple, fontWeight: 700 },
  redDot:    { marginLeft: 'auto', background: Colors.red, color: Colors.white, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  logoutBtn: { margin: 12, padding: '10px 12px', borderRadius: 10, border: 'none', background: Colors.greyLight, color: Colors.grey, cursor: 'pointer', fontSize: 13 },
  main:      { flex: 1, padding: '32px 36px', overflowY: 'auto' as const },
  pageTitle: { fontSize: 22, fontWeight: 800, color: Colors.primaryDark, marginBottom: 24 },
  listHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16 },
  searchInput: { border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '9px 14px', fontSize: 14, outline: 'none', width: 220, background: Colors.white },
  noResult:    { color: Colors.grey, fontSize: 14, textAlign: 'center', padding: '40px 0' },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  periodeRow:   { display: 'flex', gap: 6, background: Colors.greyLight, borderRadius: 12, padding: 4 },
  periodePill:  { border: 'none', background: 'none', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.grey },
  periodeActive:{ background: Colors.white, color: Colors.purple, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' },
  list:      { display: 'flex', flexDirection: 'column', gap: 10 },
  totalBadge: { background: Colors.greyLight, color: Colors.grey, borderRadius: 20, padding: '2px 10px', fontSize: 14, fontWeight: 600, marginLeft: 8 },
  usersGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  userCard:  { background: Colors.white, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: `1px solid ${Colors.greyBorder}` },
  userRank:  { width: 36, fontSize: 13, fontWeight: 700, color: Colors.grey, textAlign: 'center', flexShrink: 0 },
  userAvatar:{ width: 40, height: 40, borderRadius: 20, background: Colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: Colors.primaryDark, flexShrink: 0 },
  userInfo:  { flex: 1, minWidth: 0 },
  userName:  { fontSize: 14, fontWeight: 700, color: Colors.primaryDark },
  userMeta:  { fontSize: 12, color: Colors.grey, marginTop: 2 },
  userRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  userPts:   { fontSize: 14, fontWeight: 700, color: Colors.primaryDark },
  userNiv:   { fontSize: 11, color: Colors.grey },
  pagination:{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 },
  pageBtn:   { background: Colors.white, border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.grey },
  pageInfo:  { fontSize: 13, color: Colors.grey },
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 200 },
  panel:     { background: Colors.white, width: 480, height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${Colors.greyBorder}` },
  panelTitle:  { fontSize: 18, fontWeight: 700, color: Colors.primaryDark },
  closeBtn:    { background: Colors.greyLight, border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14, color: Colors.grey },
  panelBody:   { flex: 1, overflowY: 'auto' as const, padding: '24px' },
  panelFooter: { padding: '16px 24px', borderTop: `1px solid ${Colors.greyBorder}`, display: 'flex', gap: 10 },
  modal:     { background: Colors.white, borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.15)' },
  modalTitle:{ fontSize: 18, fontWeight: 700, color: Colors.primaryDark, marginBottom: 16 },
  motifArea: { width: '100%', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, resize: 'vertical' as const, outline: 'none' },
  modalRow:  { display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' },
};
const r: Record<string, React.CSSProperties> = {
  card:      { background: Colors.white, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 },
  icon:      { fontSize: 22, width: 40, height: 40, borderRadius: 10, background: Colors.greyLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:      { flex: 1, minWidth: 0 },
  title:     { fontSize: 14, fontWeight: 700, color: Colors.primaryDark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta:      { fontSize: 12, color: Colors.grey, marginTop: 2 },
  date:      { fontSize: 11, color: Colors.greyBorder, marginTop: 2 },
  actions:   { display: 'flex', gap: 6, flexShrink: 0 },
  detailBtn: { background: Colors.blueLight, color: Colors.blue, border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
const d: Record<string, React.CSSProperties> = {
  section:   { display: 'flex', flexDirection: 'column', gap: 12 },
  row:       { display: 'flex', flexDirection: 'column', gap: 4 },
  label:     { fontSize: 12, fontWeight: 600, color: Colors.grey, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  value:     { fontSize: 14, color: Colors.black },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 },
  photo:     { width: '100%', aspectRatio: '4/3', objectFit: 'cover' as const, borderRadius: 10, cursor: 'pointer' },
};
const sc: Record<string, React.CSSProperties> = {
  card:  { background: Colors.white, borderRadius: 14, padding: 20, borderTop: '4px solid', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  icon:  { fontSize: 24 },
  val:   { fontSize: 32, fontWeight: 800, color: Colors.primaryDark, marginTop: 8 },
  label: { fontSize: 13, color: Colors.grey, marginTop: 4 },
};
