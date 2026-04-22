import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import { getEvenements, creerEvenement } from '../../api';

type View = 'evenements' | 'creer';

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente de validation', color: Colors.orange },
  publie:     { label: 'Publié',  color: Colors.primary },
  annule:     { label: 'Annulé', color: Colors.red },
  termine:    { label: 'Terminé', color: Colors.grey },
};

export default function AssocDashboard() {
  const navigate = useNavigate();
  const assoc = (() => { try { return JSON.parse(localStorage.getItem('assoc') ?? '{}'); } catch { return {}; } })();
  const assocId: number | undefined = assoc.id;

  const [view, setView] = useState<View>('evenements');
  const [evenements, setEvenements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [adresse, setAdresse] = useState('');
  const [nbPlaces, setNbPlaces] = useState('');
  const [points, setPoints] = useState('50');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadEvenements = async () => {
    if (!assocId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getEvenements(1, assocId);
      // backend returns data: rows (array directly)
      const data = res.data.data;
      setEvenements(Array.isArray(data) ? data : []);
    } catch {
      navigate('/assoc/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvenements(); }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('assoc');
    navigate('/assoc/login');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    if (!titre.trim() || !dateDebut || !dateFin) {
      setFormError('Titre, date de début et date de fin sont obligatoires.');
      return;
    }
    if (new Date(dateFin) <= new Date(dateDebut)) {
      setFormError('La date de fin doit être après la date de début.');
      return;
    }
    setSubmitting(true);
    try {
      await creerEvenement({
        titre: titre.trim(),
        description: description.trim() || undefined,
        date_debut: new Date(dateDebut).toISOString(),
        date_fin: new Date(dateFin).toISOString(),
        wilaya: wilaya.trim() || undefined,
        adresse: adresse.trim() || undefined,
        nb_places_max: nbPlaces ? parseInt(nbPlaces) : undefined,
        points_participation: points ? parseInt(points) : 50,
      });
      setFormSuccess("Événement créé et soumis à validation. L'admin le reviewera sous peu.");
      setTitre(''); setDescription(''); setDateDebut(''); setDateFin('');
      setWilaya(''); setAdresse(''); setNbPlaces(''); setPoints('50');
      loadEvenements();
      setTimeout(() => setView('evenements'), 1500);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.layout}>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>🌿 EcoTrack</div>
          <div style={s.roleTag}>Association</div>
          {assoc.nom && <p style={s.assocName}>{assoc.nom}</p>}
        </div>
        <nav style={s.nav}>
          {([
            { id: 'evenements', label: 'Mes événements', icon: '📅', count: evenements.length },
            { id: 'creer', label: 'Créer un événement', icon: '➕', count: 0 },
          ] as { id: View; label: string; icon: string; count: number }[]).map((item) => (
            <button
              key={item.id}
              style={{ ...s.navItem, ...(view === item.id ? s.navItemActive : {}) }}
              onClick={() => setView(item.id)}
            >
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count > 0 && <span style={s.navCount}>{item.count}</span>}
            </button>
          ))}
        </nav>
        <button style={s.logoutBtn} onClick={logout}>🚪 Déconnexion</button>
      </aside>

      <main style={s.main}>
        {/* ── Mes événements ── */}
        {view === 'evenements' && (
          <div>
            <div style={s.pageHeader}>
              <h2 style={s.pageTitle}>Mes événements</h2>
              <button style={s.createBtn} onClick={() => setView('creer')}>+ Créer un événement</button>
            </div>

            {!assocId ? (
              <div style={s.empty}>
                <div style={{ fontSize: 40 }}>⚠️</div>
                <p style={{ fontSize: 15, color: Colors.grey }}>
                  Impossible d'identifier votre association.
                </p>
                <button style={s.emptyBtn} onClick={() => { localStorage.clear(); navigate('/assoc/login'); }}>
                  Se reconnecter
                </button>
              </div>
            ) : loading ? (
              <div style={s.center}><div style={s.spinner} /></div>
            ) : !evenements.length ? (
              <div style={s.empty}>
                <div style={{ fontSize: 48 }}>📅</div>
                <p style={{ fontSize: 15, color: Colors.grey }}>Aucun événement pour l'instant</p>
                <button style={s.emptyBtn} onClick={() => setView('creer')}>Créer votre premier événement</button>
              </div>
            ) : (
              <div style={s.grid}>
                {evenements.map((ev) => {
                  const statut = STATUT_CONFIG[ev.statut] ?? STATUT_CONFIG.publie;
                  const inscrits = ev.participations?.length ?? 0;
                  const ratio = ev.nb_places_max ? inscrits / ev.nb_places_max : 0;
                  return (
                    <div key={ev.id} style={s.card}>
                      <div style={s.cardHead}>
                        <span style={{ ...s.badge, background: statut.color + '18', color: statut.color }}>
                          {statut.label}
                        </span>
                        {ev.valide_par_admin && (
                          <span style={{ ...s.badge, background: Colors.greenLight, color: Colors.primaryDark }}>
                            ✓ Validé admin
                          </span>
                        )}
                      </div>

                      <h3 style={s.cardTitle}>{ev.titre}</h3>

                      {ev.description && (
                        <p style={s.cardDesc}>{ev.description}</p>
                      )}

                      <div style={s.metaRow}>
                        <span>📅</span>
                        <span>{new Date(ev.date_debut).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      {ev.wilaya && (
                        <div style={s.metaRow}>
                          <span>📍</span>
                          <span>{ev.wilaya}{ev.adresse ? ` — ${ev.adresse}` : ''}</span>
                        </div>
                      )}

                      {ev.nb_places_max ? (
                        <div style={s.progressSection}>
                          <div style={s.progressMeta}>
                            <span style={{ fontSize: 12, color: Colors.grey }}>👥 {inscrits} / {ev.nb_places_max} inscrits</span>
                            <span style={{ fontSize: 12, color: Colors.grey }}>{Math.round(ratio * 100)}%</span>
                          </div>
                          <div style={s.progressBar}>
                            <div style={{ ...s.progressFill, width: `${Math.min(ratio * 100, 100)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: Colors.grey, marginTop: 8 }}>Places illimitées</p>
                      )}

                      <div style={s.cardFooter}>
                        <span style={s.ptsBadge}>+{ev.points_participation} pts</span>
                        <span style={{ fontSize: 12, color: Colors.grey }}>
                          Créé le {new Date(ev.created_at).toLocaleDateString('fr-DZ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Créer un événement ── */}
        {view === 'creer' && (
          <div style={s.formWrap}>
            <h2 style={s.pageTitle}>Créer un événement</h2>
            <p style={s.formNote}>
              Votre événement sera soumis à validation par l'administrateur avant publication.
            </p>

            <form onSubmit={handleCreate} style={s.form}>
              <Field label="Titre *">
                <input style={s.input} value={titre} onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex : Collecte de déchets - Alger Centre" maxLength={200} required />
              </Field>

              <Field label="Description">
                <textarea style={{ ...s.input, height: 100, resize: 'vertical' }}
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez l'objectif, le déroulement..." />
              </Field>

              <div style={s.row}>
                <Field label="Date et heure de début *">
                  <input style={s.input} type="datetime-local" value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)} required />
                </Field>
                <Field label="Date et heure de fin *">
                  <input style={s.input} type="datetime-local" value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)} required />
                </Field>
              </div>

              <div style={s.row}>
                <Field label="Wilaya">
                  <input style={s.input} value={wilaya} onChange={(e) => setWilaya(e.target.value)}
                    placeholder="Ex : Alger" />
                </Field>
                <Field label="Adresse / lieu">
                  <input style={s.input} value={adresse} onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Ex : Parc de la liberté, Hydra" />
                </Field>
              </div>

              <div style={s.row}>
                <Field label="Nombre de places max">
                  <input style={s.input} type="number" min={1} value={nbPlaces}
                    onChange={(e) => setNbPlaces(e.target.value)} placeholder="Laisser vide = illimité" />
                </Field>
                <Field label="Points de participation">
                  <input style={s.input} type="number" min={0} value={points}
                    onChange={(e) => setPoints(e.target.value)} placeholder="50" />
                </Field>
              </div>

              {formError && <div style={s.errorBox}>{formError}</div>}
              {formSuccess && <div style={s.successBox}>{formSuccess}</div>}

              <button style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Soumettre pour validation'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: Colors.black }}>{label}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', minHeight: '100vh', background: Colors.greyLight },
  sidebar: {
    width: 240, background: Colors.white, borderRight: `1px solid ${Colors.greyBorder}`,
    display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
  },
  sidebarTop: { padding: '24px 20px 16px', borderBottom: `1px solid ${Colors.greyBorder}` },
  logo: { fontSize: 18, fontWeight: 800, color: Colors.primaryDark, marginBottom: 8 },
  roleTag: {
    display: 'inline-block', background: Colors.primaryLight, color: Colors.primaryDark,
    borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
  },
  assocName: { fontSize: 12, color: Colors.grey, marginTop: 6, fontWeight: 500 },
  nav: { flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 14, color: Colors.grey, fontWeight: 500, textAlign: 'left', width: '100%',
  },
  navItemActive: { background: Colors.primaryLight, color: Colors.primaryDark, fontWeight: 700 },
  navCount: {
    background: Colors.primary, color: Colors.white,
    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
  },
  logoutBtn: {
    margin: 12, padding: '10px 12px', borderRadius: 10, border: 'none',
    background: Colors.greyLight, color: Colors.grey, cursor: 'pointer', fontSize: 13,
  },
  main: { flex: 1, padding: '32px 36px', overflowY: 'auto' as const },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: Colors.primaryDark, marginBottom: 0 },
  createBtn: {
    background: Colors.primary, color: Colors.white, border: 'none',
    borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' },
  spinner: {
    width: 36, height: 36, border: `4px solid ${Colors.greyBorder}`,
    borderTopColor: Colors.primary, borderRadius: '50%',
  },
  empty: { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyBtn: {
    marginTop: 4, background: Colors.primaryLight, color: Colors.primaryDark,
    border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card: {
    background: Colors.white, borderRadius: 16, padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardHead: { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  badge: { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: Colors.primaryDark, marginTop: 4 },
  cardDesc: { fontSize: 13, color: Colors.grey, lineHeight: 1.5 },
  metaRow: { display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13, color: Colors.grey },
  progressSection: { marginTop: 4 },
  progressMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  progressBar: { height: 6, background: Colors.greyBorder, borderRadius: 3 },
  progressFill: { height: 6, background: Colors.primary, borderRadius: 3, transition: 'width .3s' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  ptsBadge: {
    background: Colors.primaryLight, color: Colors.primaryDark,
    borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700,
  },
  formWrap: { maxWidth: 740 },
  formNote: { fontSize: 13, color: Colors.grey, marginTop: 6, marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  row: { display: 'flex', gap: 16 },
  input: {
    border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10,
    padding: '12px 14px', fontSize: 14, outline: 'none', width: '100%', background: Colors.white,
  },
  errorBox: { color: Colors.red, fontSize: 13, background: '#FEE2E2', borderRadius: 10, padding: '12px 16px' },
  successBox: { color: Colors.primaryDark, fontSize: 13, background: Colors.primaryLight, borderRadius: 10, padding: '12px 16px' },
  submitBtn: {
    background: Colors.primary, color: Colors.white, border: 'none',
    borderRadius: 12, padding: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
};
