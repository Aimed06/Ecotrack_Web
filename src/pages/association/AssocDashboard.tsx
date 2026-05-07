import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import { getEvenements, creerEvenement, getEvenementQRCode, updateProfilAssociation, getProfilAssociation, changerMotDePasseAssociation } from '../../api';
import WILAYAS from '../../constants/wilayas';

type View = 'evenements' | 'creer' | 'profil';

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  en_attente: { label: 'En attente',  color: Colors.orange,  icon: '⏳' },
  publie:     { label: 'Publié',       color: Colors.primary, icon: '✅' },
  annule:     { label: 'Annulé',      color: Colors.red,     icon: '❌' },
  termine:    { label: 'Terminé',     color: Colors.grey,    icon: '🏁' },
};

interface QRModal { evenement: any; qrCode: string }

export default function AssocDashboard() {
  const navigate = useNavigate();
  const [assoc, setAssoc] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('assoc') ?? '{}'); } catch { return {}; } });
  const assocId: number | undefined = assoc.id;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Profil form state
  const [profilNom, setProfilNom] = useState<string>('');
  const [profilDescription, setProfilDescription] = useState<string>('');
  const [profilAdresse, setProfilAdresse] = useState<string>('');
  const [profilWilaya, setProfilWilaya] = useState<string>('');
  const [profilTelephone, setProfilTelephone] = useState<string>('');
  const [profilFacebook, setProfilFacebook] = useState<string>('');
  const [profilLogo, setProfilLogo] = useState<File | null>(null);
  const [profilLogoPreview, setProfilLogoPreview] = useState<string | null>(null);
  const [profilPhotos, setProfilPhotos] = useState<string[]>([]);
  const [profilRemovedPhotos, setProfilRemovedPhotos] = useState<string[]>([]);
  const [profilNewPhotos, setProfilNewPhotos] = useState<File[]>([]);
  const [profilNewPhotosPreviews, setProfilNewPhotosPreviews] = useState<string[]>([]);
  const [profilSaving, setProfilSaving] = useState(false);
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilError, setProfilError] = useState('');
  const [profilSuccess, setProfilSuccess] = useState('');
  const profilLogoRef = useRef<HTMLInputElement>(null);

  // Changement de mot de passe
  const [mdpActuel, setMdpActuel]       = useState('');
  const [mdpNouveau, setMdpNouveau]     = useState('');
  const [mdpConfirmer, setMdpConfirmer] = useState('');
  const [mdpLoading, setMdpLoading]     = useState(false);
  const [mdpError, setMdpError]         = useState('');
  const [mdpSuccess, setMdpSuccess]     = useState('');
  const [showMdp, setShowMdp]           = useState(false);

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

  const loadProfil = async () => {
    setProfilLoading(true);
    try {
      const res = await getProfilAssociation();
      const data = res.data.data;
      setProfilNom(data.nom ?? '');
      setProfilDescription(data.description ?? '');
      setProfilAdresse(data.adresse ?? '');
      setProfilWilaya(data.wilaya ?? '');
      setProfilTelephone(data.telephone ?? '');
      setProfilFacebook(data.facebook ?? '');
      setProfilPhotos(data.photos ?? []);
      setProfilRemovedPhotos([]);
      setProfilNewPhotos([]);
      setProfilNewPhotosPreviews([]);
      const updated = { ...assoc, ...data };
      setAssoc(updated);
      localStorage.setItem('assoc', JSON.stringify(updated));
    } catch {}
    finally { setProfilLoading(false); }
  };

  useEffect(() => {
    if (view === 'profil') loadProfil();
  }, [view]);

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
    if (!description.trim() || !wilaya || !adresse.trim()) {
      setFormError('Description, wilaya et adresse sont obligatoires.');
      return;
    }
    if (!photo) {
      setFormError('Une photo est obligatoire.');
      return;
    }
    if (new Date(dateFin) <= new Date(dateDebut)) {
      setFormError('La date de fin doit être après la date de début.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('photo', photo);
      fd.append('titre', titre.trim());
      fd.append('description', description.trim());
      fd.append('date_debut', new Date(dateDebut).toISOString());
      fd.append('date_fin', new Date(dateFin).toISOString());
      fd.append('wilaya', wilaya);
      fd.append('adresse', adresse.trim());
      if (nbPlaces) fd.append('nb_places_max', nbPlaces);
      await creerEvenement(fd);
      setFormSuccess("Événement créé et soumis à validation. L'admin le reviewera sous peu.");
      setTitre(''); setDescription(''); setDateDebut(''); setDateFin('');
      setWilaya(''); setAdresse(''); setNbPlaces('');
      setPhoto(null); setPhotoPreview(null);
      loadEvenements();
      setTimeout(() => setView('evenements'), 1500);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfilError(''); setProfilSuccess('');
    if (!profilNom.trim()) { setProfilError('Le nom est obligatoire.'); return; }
    setProfilSaving(true);
    try {
      const fd = new FormData();
      fd.append('nom', profilNom.trim());
      fd.append('description', profilDescription.trim());
      fd.append('adresse', profilAdresse.trim());
      fd.append('wilaya', profilWilaya);
      fd.append('telephone', profilTelephone.trim());
      fd.append('facebook', profilFacebook.trim());
      if (profilLogo) fd.append('logo', profilLogo);
      profilRemovedPhotos.forEach(url => fd.append('remove_photos', url));
      profilNewPhotos.forEach(file => fd.append('photos', file));
      const res = await updateProfilAssociation(fd);
      const updated = { ...assoc, ...res.data.data };
      setAssoc(updated);
      localStorage.setItem('assoc', JSON.stringify(updated));
      setProfilPhotos(res.data.data.photos ?? []);
      setProfilLogo(null);
      setProfilLogoPreview(null);
      setProfilRemovedPhotos([]);
      setProfilNewPhotos([]);
      setProfilNewPhotosPreviews([]);
      setProfilSuccess('Profil mis à jour avec succès.');
    } catch (err: any) {
      setProfilError(err.response?.data?.error || err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setProfilSaving(false);
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

          {/* Logo upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <div
              style={s.logoWrap}
              title="Changer le logo"
              onClick={() => logoInputRef.current?.click()}
            >
              {assoc.logo ? (
                <img src={assoc.logo} alt="logo" style={s.logoImg} />
              ) : (
                <div style={s.logoPlaceholder}>
                  <span style={{ fontSize: 28 }}>{assoc.nom?.[0]?.toUpperCase() ?? '🏢'}</span>
                </div>
              )}
              <div style={s.logoOverlay}>{logoUploading ? '⏳' : '📷'}</div>
            </div>
            {assoc.nom && <p style={s.assocName}>{assoc.nom}</p>}
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLogoUploading(true);
                try {
                  const fd = new FormData();
                  fd.append('logo', file);
                  const res = await updateProfilAssociation(fd);
                  const updated = { ...assoc, ...res.data.data };
                  setAssoc(updated);
                  localStorage.setItem('assoc', JSON.stringify(updated));
                } catch {}
                finally { setLogoUploading(false); e.target.value = ''; }
              }}
            />
          </div>
        </div>

        <div style={s.sidebarStats}>
          <div style={s.statPill}>
            <span style={{ fontSize: 18, fontWeight: 800, color: Colors.primary }}>{publishedCount}</span>
            <span style={{ fontSize: 11, color: Colors.grey }}>Publiés</span>
          </div>
          <div style={s.statPill}>
            <span style={{ fontSize: 18, fontWeight: 800, color: Colors.primaryDark }}>{evenements.length}</span>
            <span style={{ fontSize: 11, color: Colors.grey }}>Total</span>
          </div>
        </div>

        <nav style={s.nav}>
          {([
            { id: 'evenements', label: 'Mes événements', icon: '📅', count: evenements.length },
            { id: 'creer',      label: 'Créer un événement', icon: '➕', count: 0 },
            { id: 'profil',     label: 'Mon profil', icon: '🏢', count: 0 },
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
                  return (
                    <div key={ev.id} style={s.card}>
                      {/* Photo hero */}
                      <div style={{ position: 'relative' }}>
                        {ev.photo ? (
                          <img src={ev.photo} alt={ev.titre} style={s.cardPhoto} />
                        ) : (
                          <div style={{ ...s.cardPhotoPlaceholder, background: cfg.color + '18' }}>
                            <span style={{ fontSize: 32 }}>📅</span>
                          </div>
                        )}
                        {/* Logo association flottant */}
                        <div style={s.cardLogoWrap}>
                          {assoc.logo ? (
                            <img src={assoc.logo} alt="" style={s.cardLogoImg} />
                          ) : (
                            <div style={s.cardLogoFallback}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: Colors.primary }}>
                                {assoc.nom?.[0]?.toUpperCase() ?? 'A'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={s.cardInner}>
                        {/* Header */}
                        <div style={s.cardHead}>
                          <span style={{ ...s.badge, background: cfg.color + '18', color: cfg.color }}>
                            {cfg.icon} {cfg.label}
                          </span>
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
                        <button
                          style={{ ...s.qrBtn, opacity: qrLoading === ev.id ? 0.6 : 1 }}
                          onClick={() => openQR(ev)}
                          disabled={qrLoading === ev.id}
                        >
                          {qrLoading === ev.id ? <>⏳ Génération...</> : <>📲 Afficher le QR Code</>}
                        </button>

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

              <Field label="Description *">
                <textarea style={{ ...s.input, height: 100, resize: 'vertical' }}
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez l'objectif, le déroulement..." />
              </Field>

              <Field label="Photo de l'événement *">
                <label style={s.photoUploadLabel}>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null;
                      setPhoto(file);
                      setPhotoPreview(file ? URL.createObjectURL(file) : null);
                    }} />
                  {photoPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={photoPreview} alt="preview" style={s.photoPreview} />
                      <div style={s.photoChangeOverlay}>Changer la photo</div>
                    </div>
                  ) : (
                    <div style={s.photoPlaceholder}>
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={{ fontSize: 13, color: Colors.grey, fontWeight: 600 }}>Cliquer pour ajouter une photo</span>
                      <span style={{ fontSize: 11, color: Colors.grey }}>JPEG, PNG, WebP — max 5 Mo</span>
                    </div>
                  )}
                </label>
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
                <Field label="Wilaya *">
                  <select style={s.input} value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
                    <option value=''>— Choisir une wilaya —</option>
                    {WILAYAS.map(w => (
                      <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Adresse / lieu *">
                  <input style={s.input} value={adresse} onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Ex : Parc de la liberté, Hydra" />
                </Field>
              </div>

              <Field label="Nombre de places max">
                <input style={s.input} type="number" min={1} value={nbPlaces}
                  onChange={(e) => setNbPlaces(e.target.value)} placeholder="Laisser vide = illimité" />
              </Field>

              {formError   && <div style={s.errorBox}>{formError}</div>}
              {formSuccess && <div style={s.successBox}>{formSuccess}</div>}

              <button style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Soumettre pour validation'}
              </button>
            </form>
          </div>
        )}

        {/* ── Mon profil ── */}
        {view === 'profil' && (
          <div style={s.formWrap}>
            <h2 style={s.pageTitle}>Mon profil</h2>
            <p style={s.formNote}>Modifiez les informations de votre association. Le nom et le logo apparaissent sur les événements publiés.</p>

            {profilLoading ? (
              <div style={s.center}><div style={s.spinner} /></div>
            ) : null}

            <form onSubmit={handleSaveProfil} style={{ ...s.form, opacity: profilLoading ? 0.4 : 1, pointerEvents: profilLoading ? 'none' : 'auto' }}>
              {/* Logo */}
              <Field label="Logo de l'association">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{ ...s.profilLogoWrap, cursor: 'pointer' }}
                    onClick={() => profilLogoRef.current?.click()}
                    onMouseEnter={e => { (e.currentTarget.lastChild as HTMLElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget.lastChild as HTMLElement).style.opacity = '0'; }}
                  >
                    {profilLogoPreview ? (
                      <img src={profilLogoPreview} alt="logo" style={s.profilLogoImg} />
                    ) : assoc.logo ? (
                      <img src={assoc.logo} alt="logo" style={s.profilLogoImg} />
                    ) : (
                      <div style={s.profilLogoFallback}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: Colors.primary }}>
                          {profilNom?.[0]?.toUpperCase() ?? '🏢'}
                        </span>
                      </div>
                    )}
                    <div style={s.profilLogoOverlay}>📷 Changer</div>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: Colors.black, margin: 0 }}>
                      {profilLogoPreview ? 'Nouveau logo sélectionné' : (assoc.logo ? 'Logo actuel' : 'Aucun logo')}
                    </p>
                    <p style={{ fontSize: 12, color: Colors.grey, marginTop: 4 }}>JPEG, PNG, WebP — max 5 Mo</p>
                    {profilLogoPreview && (
                      <button type="button" style={s.removeLinkBtn} onClick={() => { setProfilLogo(null); setProfilLogoPreview(null); }}>
                        Annuler le changement
                      </button>
                    )}
                  </div>
                  <input ref={profilLogoRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null;
                      setProfilLogo(file);
                      setProfilLogoPreview(file ? URL.createObjectURL(file) : null);
                      e.target.value = '';
                    }} />
                </div>
              </Field>

              <Field label="Nom de l'association *">
                <input style={s.input} value={profilNom} onChange={e => setProfilNom(e.target.value)}
                  placeholder="Nom de votre association" maxLength={200} required />
              </Field>

              <Field label="Description">
                <textarea style={{ ...s.input, height: 100, resize: 'vertical' as const }}
                  value={profilDescription} onChange={e => setProfilDescription(e.target.value)}
                  placeholder="Présentez votre association, ses objectifs..." />
              </Field>

              <Field label="Adresse *">
                <input style={s.input} value={profilAdresse} onChange={e => setProfilAdresse(e.target.value)}
                  placeholder="Ex : 12 Rue des Pins, Hydra, Alger" maxLength={500} />
              </Field>

              <div style={s.row}>
                <Field label="Wilaya">
                  <select style={s.input} value={profilWilaya} onChange={e => setProfilWilaya(e.target.value)}>
                    <option value=''>— Choisir une wilaya —</option>
                    {WILAYAS.map(w => (
                      <option key={w.id} value={w.nom}>{w.id.toString().padStart(2, '0')} · {w.nom}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Téléphone">
                  <input style={s.input} value={profilTelephone} onChange={e => setProfilTelephone(e.target.value)}
                    placeholder="Ex : 0555 123 456" maxLength={20} />
                </Field>
              </div>

              <Field label="Page Facebook">
                <div style={{ position: 'relative' as const }}>
                  <span style={{ position: 'absolute' as const, left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#1877F2' }}>f</span>
                  <input style={{ ...s.input, paddingLeft: 32 }} value={profilFacebook} onChange={e => setProfilFacebook(e.target.value)}
                    placeholder="https://facebook.com/votre-page" maxLength={500} />
                </div>
              </Field>

              <Field label="Photos de l'association">
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                  {profilPhotos.filter(url => !profilRemovedPhotos.includes(url)).map((url, i) => (
                    <div key={i} style={{ position: 'relative' as const, width: 90, height: 90, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
                      <button type="button"
                        style={{ position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                        onClick={() => setProfilRemovedPhotos(prev => [...prev, url])}>✕</button>
                    </div>
                  ))}
                  {profilNewPhotosPreviews.map((url, i) => (
                    <div key={`n${i}`} style={{ position: 'relative' as const, width: 90, height: 90, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' as const, opacity: 0.85 }} />
                      <div style={{ position: 'absolute' as const, bottom: 0, left: 0, right: 0, background: Colors.primary + 'CC', textAlign: 'center' as const, fontSize: 10, color: '#fff', padding: '2px 0' }}>Nouveau</div>
                      <button type="button"
                        style={{ position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                        onClick={() => { setProfilNewPhotos(p => p.filter((_, idx) => idx !== i)); setProfilNewPhotosPreviews(p => p.filter((_, idx) => idx !== i)); }}>✕</button>
                    </div>
                  ))}
                  <label style={{ width: 90, height: 90, border: `2px dashed ${Colors.greyBorder}`, borderRadius: 8, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, flexShrink: 0 }}>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        setProfilNewPhotos(p => [...p, ...files]);
                        setProfilNewPhotosPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
                        e.target.value = '';
                      }} />
                    <span style={{ fontSize: 24, color: Colors.grey }}>+</span>
                    <span style={{ fontSize: 10, color: Colors.grey, fontWeight: 600 }}>Ajouter</span>
                  </label>
                </div>
                <p style={{ fontSize: 11, color: Colors.grey, marginTop: 6 }}>Photos d'anciens événements, locaux, activités... (max 5 Mo par photo)</p>
              </Field>

              {profilError   && <div style={s.errorBox}>{profilError}</div>}
              {profilSuccess && <div style={s.successBox}>{profilSuccess}</div>}

              <button style={{ ...s.submitBtn, opacity: profilSaving ? 0.7 : 1 }} type="submit" disabled={profilSaving}>
                {profilSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </form>

            {/* ── Changement de mot de passe ── */}
            <div style={s.mdpSection}>
              <div style={s.mdpHeader}>
                <span style={{ fontSize: 16 }}>🔒</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: Colors.primaryDark, margin: 0 }}>Changer le mot de passe</p>
                  <p style={{ fontSize: 12, color: Colors.grey, marginTop: 2 }}>Utilisez un mot de passe fort d'au moins 8 caractères.</p>
                </div>
                <button
                  type="button"
                  style={{ ...s.mdpToggleBtn, marginLeft: 'auto' }}
                  onClick={() => setShowMdp(!showMdp)}
                >
                  {showMdp ? 'Annuler' : 'Modifier'}
                </button>
              </div>

              {showMdp && (
                <form style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setMdpError(''); setMdpSuccess('');
                    if (mdpNouveau.length < 8) { setMdpError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
                    if (mdpNouveau !== mdpConfirmer) { setMdpError('Les mots de passe ne correspondent pas.'); return; }
                    setMdpLoading(true);
                    try {
                      await changerMotDePasseAssociation(mdpActuel, mdpNouveau);
                      setMdpSuccess('Mot de passe mis à jour avec succès.');
                      setMdpActuel(''); setMdpNouveau(''); setMdpConfirmer('');
                      setShowMdp(false);
                    } catch (err: any) {
                      setMdpError(err.response?.data?.error || 'Erreur lors du changement de mot de passe.');
                    } finally {
                      setMdpLoading(false);
                    }
                  }}
                >
                  <Field label="Mot de passe actuel">
                    <input style={s.input} type="password" value={mdpActuel}
                      onChange={e => setMdpActuel(e.target.value)} placeholder="••••••••" required />
                  </Field>
                  <div style={s.row}>
                    <Field label="Nouveau mot de passe">
                      <input style={s.input} type="password" value={mdpNouveau}
                        onChange={e => setMdpNouveau(e.target.value)} placeholder="••••••••" required />
                    </Field>
                    <Field label="Confirmer le nouveau mot de passe">
                      <input style={{ ...s.input, borderColor: mdpConfirmer && mdpConfirmer !== mdpNouveau ? Colors.red : Colors.greyBorder }}
                        type="password" value={mdpConfirmer}
                        onChange={e => setMdpConfirmer(e.target.value)} placeholder="••••••••" required />
                    </Field>
                  </div>
                  {mdpError   && <div style={s.errorBox}>{mdpError}</div>}
                  {mdpSuccess && <div style={s.successBox}>{mdpSuccess}</div>}
                  <button style={{ ...s.submitBtn, opacity: mdpLoading ? 0.7 : 1 }} type="submit" disabled={mdpLoading}>
                    {mdpLoading ? 'Enregistrement...' : 'Changer le mot de passe'}
                  </button>
                </form>
              )}
            </div>
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
  assocName:  { fontSize: 12, color: Colors.grey, fontWeight: 600, textAlign: 'center' as const, maxWidth: 180 },
  logoWrap:   { position: 'relative' as const, width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${Colors.greyBorder}`, flexShrink: 0 },
  logoImg:    { width: '100%', height: '100%', objectFit: 'cover' as const },
  logoPlaceholder: { width: '100%', height: '100%', background: Colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoOverlay: { position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, opacity: 0, transition: 'opacity .2s' },
  cardLogoWrap: { position: 'absolute' as const, bottom: -18, left: 16, width: 40, height: 40, borderRadius: '50%', border: `2.5px solid ${Colors.white}`, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', background: Colors.white },
  cardLogoImg:  { width: '100%', height: '100%', objectFit: 'cover' as const },
  cardLogoFallback: { width: '100%', height: '100%', background: Colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' },
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

  card:            { background: Colors.white, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' },
  cardPhoto:       { width: '100%', height: 180, objectFit: 'cover' as const, display: 'block', flexShrink: 0 },
  cardPhotoPlaceholder: { height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInner:  { padding: '26px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 },
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
  photoUploadLabel: { cursor: 'pointer', display: 'block', borderRadius: 12, overflow: 'hidden', border: `2px dashed ${Colors.greyBorder}`, background: Colors.greyLight },
  photoPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 16px' },
  photoPreview: { width: '100%', height: 220, objectFit: 'cover' as const, display: 'block' },
  photoChangeOverlay: { position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, opacity: 0 },
  errorBox:   { color: Colors.red, fontSize: 13, background: '#FEE2E2', borderRadius: 10, padding: '12px 16px' },
  successBox: { color: Colors.primaryDark, fontSize: 13, background: Colors.primaryLight, borderRadius: 10, padding: '12px 16px' },
  submitBtn:  { background: Colors.primary, color: Colors.white, border: 'none', borderRadius: 12, padding: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer' },

  profilLogoWrap:    { position: 'relative' as const, width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${Colors.greyBorder}`, flexShrink: 0 },
  profilLogoImg:     { width: '100%', height: '100%', objectFit: 'cover' as const },
  profilLogoFallback:{ width: '100%', height: '100%', background: Colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  profilLogoOverlay: { position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, opacity: 0, transition: 'opacity .2s' },
  removeLinkBtn:     { marginTop: 4, background: 'none', border: 'none', color: Colors.red, fontSize: 12, cursor: 'pointer', padding: 0 },
  mdpSection: { marginTop: 28, borderTop: `1px solid ${Colors.greyBorder}`, paddingTop: 24 },
  mdpHeader:  { display: 'flex', alignItems: 'flex-start', gap: 12 },
  mdpToggleBtn: { background: Colors.greyLight, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: Colors.primaryDark, flexShrink: 0 },

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
