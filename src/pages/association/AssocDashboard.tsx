import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import { getEvenements, creerEvenement, getEvenementQRCode } from '../../api';
import WILAYAS from '../../constants/wilayas';

type View = 'evenements' | 'creer';

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  en_attente: { label: 'En attente',  color: Colors.orange,  icon: '⏳' },
  publie:     { label: 'Publié',       color: Colors.primary, icon: '✅' },
  annule:     { label: 'Annulé',      color: Colors.red,     icon: '❌' },
  termine:    { label: 'Terminé',     color: Colors.grey,    icon: '🏁' },
};

interface QRModal { evenement: any; qrCode: string }

export default function AssocDashboard() {
  const navigate = useNavigate();
  const assoc = (() => { try { return JSON.parse(localStorage.getItem('assoc') ?? '{}'); } catch { return {}; } })();
  const assocId: number | undefined = assoc.id;

  const [view, setView] = useState<View>('evenements');
  const [evenements, setEvenements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<QRModal | null>(null);
  const [qrLoading, setQrLoading] = useState<number | null>(null);

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

  const openQR = async (ev: any) => {
    setQrLoading(ev.id);
    try {
      const res = await getEvenementQRCode(ev.id);
      setQrModal({ evenement: ev, qrCode: res.data.data.qr_code });
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Impossible de générer le QR code.');
    } finally {
      setQrLoading(null);
    }
  };

  const downloadQR = () => {
    if (!qrModal) return;
    const a = document.createElement('a');
    a.href = qrModal.qrCode;
    a.download = `qr-${qrModal.evenement.titre.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
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

  const publishedCount  = evenements.filter(e => e.statut === 'publie').length;
  const pendingCount    = evenements.filter(e => e.statut === 'en_attente').length;

  return (
    <div style={s.layout}>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>🌿 EcoTrack</div>
          <div style={s.roleTag}>Association</div>
          {assoc.nom && <p style={s.assocName}>{assoc.nom}</p>}
        </div>

        <div style={s.sidebarStats}>
          <div style={s.statPill}>
            <span style={{ fontSize: 18, fontWeight: 800, color: Colors.primary }}>{publishedCount}</span>
            <span style={{ fontSize: 11, color: Colors.grey }}>Publiés</span>
          </div>
          <div style={s.statPill}>
            <span style={{ fontSize: 18, fontWeight: 800, color: Colors.orange }}>{pendingCount}</span>
            <span style={{ fontSize: 11, color: Colors.grey }}>En attente</span>
          </div>
        </div>

        <nav style={s.nav}>
          {([
            { id: 'evenements', label: 'Mes événements', icon: '📅', count: evenements.length },
            { id: 'creer',      label: 'Créer un événement', icon: '➕', count: 0 },
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
              <div>
                <h2 style={s.pageTitle}>Mes événements</h2>
                <p style={{ fontSize: 13, color: Colors.grey, marginTop: 2 }}>
                  {evenements.length} événement{evenements.length !== 1 ? 's' : ''} au total
                </p>
              </div>
              <button style={s.createBtn} onClick={() => setView('creer')}>+ Créer un événement</button>
            </div>

            {!assocId ? (
              <div style={s.empty}>
                <div style={{ fontSize: 40 }}>⚠️</div>
                <p style={{ fontSize: 15, color: Colors.grey }}>Impossible d'identifier votre association.</p>
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
                  const cfg    = STATUT_CONFIG[ev.statut] ?? STATUT_CONFIG.publie;
                  const inscrits = ev.participations?.length ?? 0;
                  const presents = (ev.participations ?? []).filter((p: any) => p.statut === 'present').length;
                  const ratio  = ev.nb_places_max ? inscrits / ev.nb_places_max : 0;
                  const isValidated = ev.valide_par_admin;
                  return (
                    <div key={ev.id} style={s.card}>
                      {/* Status strip */}
                      <div style={{ ...s.cardStrip, background: cfg.color }} />

                      <div style={s.cardInner}>
                        {/* Header */}
                        <div style={s.cardHead}>
                          <span style={{ ...s.badge, background: cfg.color + '18', color: cfg.color }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {isValidated && (
                            <span style={{ ...s.badge, background: Colors.primaryLight, color: Colors.primaryDark }}>
                              ✓ Validé
                            </span>
                          )}
                        </div>

                        <h3 style={s.cardTitle}>{ev.titre}</h3>

                        {ev.description && <p style={s.cardDesc}>{ev.description}</p>}

                        <div style={s.metaGroup}>
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
                        </div>

                        {/* Participation stats */}
                        <div style={s.statsRow}>
                          <div style={s.statBox}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: Colors.primaryDark }}>{inscrits}</span>
                            <span style={{ fontSize: 11, color: Colors.grey }}>inscrits</span>
                          </div>
                          <div style={s.statBox}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: Colors.primary }}>{presents}</span>
                            <span style={{ fontSize: 11, color: Colors.grey }}>présents</span>
                          </div>
                          <div style={s.statBox}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: Colors.purple }}>{ev.points_participation}</span>
                            <span style={{ fontSize: 11, color: Colors.grey }}>pts/pers.</span>
                          </div>
                        </div>

                        {ev.nb_places_max ? (
                          <div style={s.progressSection}>
                            <div style={s.progressMeta}>
                              <span style={{ fontSize: 12, color: Colors.grey }}>
                                {inscrits} / {ev.nb_places_max} places
                              </span>
                              <span style={{ fontSize: 12, color: Colors.grey }}>{Math.round(ratio * 100)}%</span>
                            </div>
                            <div style={s.progressBar}>
                              <div style={{
                                ...s.progressFill,
                                width: `${Math.min(ratio * 100, 100)}%`,
                                background: ratio >= 1 ? Colors.red : Colors.primary,
                              }} />
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: Colors.grey, marginTop: 4 }}>♾️ Places illimitées</p>
                        )}

                        {/* QR Code button */}
                        {isValidated && (
                          <button
                            style={{ ...s.qrBtn, opacity: qrLoading === ev.id ? 0.6 : 1 }}
                            onClick={() => openQR(ev)}
                            disabled={qrLoading === ev.id}
                          >
                            {qrLoading === ev.id ? (
                              <>⏳ Génération...</>
                            ) : (
                              <>📲 Afficher le QR Code</>
                            )}
                          </button>
                        )}

                        {!isValidated && (
                          <div style={s.pendingNote}>
                            ⏳ En attente de validation admin avant de pouvoir afficher le QR code
                          </div>
                        )}
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
              Votre événement sera soumis à validation par l'administrateur avant publication. Une fois validé, vous pourrez afficher le QR code pour les volontaires.
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
                  <select style={s.input} value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
                    <option value=''>— Choisir une wilaya —</option>
                    {WILAYAS.map(w => (
                      <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>
                    ))}
                  </select>
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

              {formError   && <div style={s.errorBox}>{formError}</div>}
              {formSuccess && <div style={s.successBox}>{formSuccess}</div>}

              <button style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Soumettre pour validation'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── QR Code Modal ── */}
      {qrModal && (
        <div style={s.overlay} onClick={() => setQrModal(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTag}>📲 QR Code de présence</div>
                <h3 style={s.modalTitle}>{qrModal.evenement.titre}</h3>
                {qrModal.evenement.wilaya && (
                  <p style={s.modalMeta}>📍 {qrModal.evenement.wilaya}{qrModal.evenement.adresse ? ` — ${qrModal.evenement.adresse}` : ''}</p>
                )}
                <p style={s.modalMeta}>
                  📅 {new Date(qrModal.evenement.date_debut).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button style={s.closeBtn} onClick={() => setQrModal(null)}>✕</button>
            </div>

            <div style={s.qrWrap}>
              <img src={qrModal.qrCode} alt="QR Code" style={s.qrImg} />
              <p style={s.qrHint}>
                Les volontaires inscrits scannent ce code via l'application mobile pour valider leur présence et recevoir leurs points.
              </p>
            </div>

            <div style={s.modalFooter}>
              <div style={s.modalStat}>
                <span style={{ fontSize: 20, fontWeight: 800, color: Colors.primaryDark }}>
                  {qrModal.evenement.points_participation}
                </span>
                <span style={{ fontSize: 12, color: Colors.grey }}>pts attribués</span>
              </div>
              {qrModal.evenement.nb_places_max && (
                <div style={s.modalStat}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: Colors.primaryDark }}>
                    {qrModal.evenement.nb_places_max}
                  </span>
                  <span style={{ fontSize: 12, color: Colors.grey }}>places max</span>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <button style={s.downloadBtn} onClick={downloadQR}>
                ⬇️ Télécharger le QR
              </button>
            </div>
          </div>
        </div>
      )}
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
  layout:     { display: 'flex', minHeight: '100vh', background: Colors.greyLight },
  sidebar:    { width: 240, background: Colors.white, borderRight: `1px solid ${Colors.greyBorder}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  sidebarTop: { padding: '24px 20px 16px', borderBottom: `1px solid ${Colors.greyBorder}` },
  logo:       { fontSize: 18, fontWeight: 800, color: Colors.primaryDark, marginBottom: 8 },
  roleTag:    { display: 'inline-block', background: Colors.primaryLight, color: Colors.primaryDark, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 },
  assocName:  { fontSize: 12, color: Colors.grey, marginTop: 6, fontWeight: 500 },
  sidebarStats: { display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${Colors.greyBorder}` },
  statPill:   { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: Colors.greyLight, borderRadius: 10, padding: '8px 4px', gap: 2 },
  nav:        { flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  navItem:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: Colors.grey, fontWeight: 500, textAlign: 'left', width: '100%' },
  navItemActive: { background: Colors.primaryLight, color: Colors.primaryDark, fontWeight: 700 },
  navCount:   { background: Colors.primary, color: Colors.white, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  logoutBtn:  { margin: 12, padding: '10px 12px', borderRadius: 10, border: 'none', background: Colors.greyLight, color: Colors.grey, cursor: 'pointer', fontSize: 13 },
  main:       { flex: 1, padding: '32px 36px', overflowY: 'auto' as const },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 800, color: Colors.primaryDark, marginBottom: 0 },
  createBtn:  { background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  center:     { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' },
  spinner:    { width: 36, height: 36, border: `4px solid ${Colors.greyBorder}`, borderTopColor: Colors.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  empty:      { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyBtn:   { marginTop: 4, background: Colors.primaryLight, color: Colors.primaryDark, border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },

  card:       { background: Colors.white, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' },
  cardStrip:  { height: 4, flexShrink: 0 },
  cardInner:  { padding: 20, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 },
  cardHead:   { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  badge:      { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  cardTitle:  { fontSize: 15, fontWeight: 700, color: Colors.primaryDark },
  cardDesc:   { fontSize: 13, color: Colors.grey, lineHeight: 1.5 },
  metaGroup:  { display: 'flex', flexDirection: 'column', gap: 5 },
  metaRow:    { display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13, color: Colors.grey },

  statsRow:   { display: 'flex', gap: 8, marginTop: 2 },
  statBox:    { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: Colors.greyLight, borderRadius: 10, padding: '8px 4px', gap: 2 },

  progressSection: { marginTop: 2 },
  progressMeta:    { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  progressBar:     { height: 6, background: Colors.greyBorder, borderRadius: 3 },
  progressFill:    { height: 6, borderRadius: 3, transition: 'width .3s' },

  qrBtn:      { marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: Colors.primaryDark, color: Colors.white, border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  pendingNote:{ marginTop: 4, fontSize: 12, color: Colors.orange, background: Colors.orange + '12', borderRadius: 8, padding: '8px 12px', lineHeight: 1.4 },

  formWrap:   { maxWidth: 740 },
  formNote:   { fontSize: 13, color: Colors.grey, marginTop: 6, marginBottom: 24, lineHeight: 1.6 },
  form:       { display: 'flex', flexDirection: 'column', gap: 18 },
  row:        { display: 'flex', gap: 16 },
  input:      { border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', width: '100%', background: Colors.white },
  errorBox:   { color: Colors.red, fontSize: 13, background: '#FEE2E2', borderRadius: 10, padding: '12px 16px' },
  successBox: { color: Colors.primaryDark, fontSize: 13, background: Colors.primaryLight, borderRadius: 10, padding: '12px 16px' },
  submitBtn:  { background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 12, padding: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer' },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal:      { background: Colors.white, borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 16px', borderBottom: `1px solid ${Colors.greyBorder}` },
  modalTag:   { fontSize: 11, fontWeight: 800, color: Colors.grey, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: Colors.primaryDark, lineHeight: 1.3, marginBottom: 4 },
  modalMeta:  { fontSize: 13, color: Colors.grey, marginTop: 2 },
  closeBtn:   { background: Colors.greyLight, border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: Colors.grey, flexShrink: 0 },
  qrWrap:     { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 16px', gap: 16 },
  qrImg:      { width: 220, height: 220, borderRadius: 12, border: `3px solid ${Colors.greyBorder}` },
  qrHint:     { fontSize: 13, color: Colors.grey, textAlign: 'center', lineHeight: 1.6, maxWidth: 340 },
  modalFooter:{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', background: Colors.greyLight, borderTop: `1px solid ${Colors.greyBorder}` },
  modalStat:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 60 },
  downloadBtn:{ background: Colors.primaryDark, color: Colors.white, border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};
