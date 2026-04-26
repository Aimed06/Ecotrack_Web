import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Colors } from '../../constants/colors';
import { getSignalements, getPointsCollecte, getEvenements, modererSignalement, rejeterPhotosResolution } from '../../api';
import WILAYAS from '../../constants/wilayas';
import TYPES_DECHET from '../../constants/typesDechet';

// ── Fix leaflet default icon (Vite asset issue) ───────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom SVG marker factory ─────────────────────────────────────────────────
const makeIcon = (color: string, symbol: string, size = 36) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px; height:${size}px; border-radius:50% 50% 50% 0;
        transform:rotate(-45deg); background:${color};
        border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.35);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:${size * 0.44}px;line-height:1;">${symbol}</span>
      </div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -size],
  });

const DEGRE_COLORS = ['', '#22c55e', '#84cc16', Colors.orange, '#f97316', Colors.red];
const DEGRE_LABELS = ['', 'Très léger', 'Léger', 'Modéré', 'Grave', 'Critique'];

const signalIcon = (deg: number) => makeIcon(DEGRE_COLORS[deg] ?? Colors.orange, '⚠');
const pointIcon  = makeIcon(Colors.primary, '♻');
const eventIcon  = makeIcon(Colors.purple,  '📅', 32);

// ── Fit bounds helper ─────────────────────────────────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [points.length]);
  return null;
}

// ── Fly to wilaya helper ──────────────────────────────────────────────────────
function FlyToWilaya({ wilaya }: { wilaya: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!wilaya) {
      map.flyTo([28.0339, 1.6596], 5, { duration: 1 });
      return;
    }
    const w = WILAYAS.find((x) => x.nom === wilaya);
    if (w) map.flyTo([w.lat, w.lng], w.zoom, { duration: 1 });
  }, [wilaya]);
  return null;
}

// ── Layer toggle types ────────────────────────────────────────────────────────
type LayerKey = 'signalements' | 'points' | 'evenements';

const LAYERS: { key: LayerKey; label: string; color: string; icon: string }[] = [
  { key: 'signalements', label: 'Signalements', color: Colors.orange,  icon: '⚠️' },
  { key: 'points',       label: 'Points de collecte', color: Colors.primary, icon: '♻️' },
  { key: 'evenements',   label: 'Événements',   color: Colors.purple,  icon: '📅' },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminMap() {
  const [signalements, setSignalements] = useState<any[]>([]);
  const [pointsCollecte, setPointsCollecte] = useState<any[]>([]);
  const [evenements, setEvenements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(
    new Set(['signalements', 'points', 'evenements'])
  );
  const [wilaya, setWilaya] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [degreFilter, setDegreFilter] = useState<number[]>([]);

  const toggleType  = (v: string) =>
    setTypeFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleDegre = (d: number) =>
    setDegreFilter(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  useEffect(() => {
    Promise.all([
      getSignalements(1, 200, 'publie'),
      getPointsCollecte(1, 200),
      getEvenements(1),
    ]).then(([sRes, pRes, eRes]) => {
      setSignalements((sRes.data.data ?? []).filter((s: any) => s.latitude && s.longitude));
      setPointsCollecte((pRes.data.data ?? []).filter((p: any) => p.latitude && p.longitude && p.statut === 'actif'));
      setEvenements((eRes.data.data ?? []).filter((e: any) => e.latitude && e.longitude));
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filteredS = signalements.filter(s => {
    if (wilaya && s.wilaya !== wilaya) return false;
    if (degreFilter.length > 0 && !degreFilter.includes(s.degre_pollution)) return false;
    return true;
  });
  const filteredE = wilaya ? evenements.filter(e => e.wilaya === wilaya) : evenements;
  const filteredP = pointsCollecte.filter(p => {
    if (wilaya && p.wilaya !== wilaya) return false;
    if (typeFilter.length > 0 && !typeFilter.some(t => Array.isArray(p.type_dechet) && p.type_dechet.includes(t))) return false;
    return true;
  });

  const allPoints: [number, number][] = [
    ...signalements.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number]),
    ...pointsCollecte.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)] as [number, number]),
    ...evenements.map(e => [parseFloat(e.latitude), parseFloat(e.longitude)] as [number, number]),
  ];

  const counts = {
    signalements: filteredS.length,
    points: filteredP.length,
    evenements: filteredE.length,
  };

  if (loading) {
    return (
      <div style={ms.loadingWrap}>
        <div style={ms.spinner} />
        <p style={{ color: Colors.grey, marginTop: 16 }}>Chargement de la carte...</p>
      </div>
    );
  }

  return (
    <div style={ms.wrap}>
      {/* ── Controls ── */}
      <div style={ms.controls}>
        <div style={ms.controlsLeft}>
          <p style={ms.controlTitle}>Couches</p>
          <div style={ms.layerBtns}>
            {LAYERS.map(l => (
              <button
                key={l.key}
                style={{ ...ms.layerBtn, ...(activeLayers.has(l.key) ? { ...ms.layerBtnActive, borderColor: l.color, color: l.color, background: l.color + '12' } : {}) }}
                onClick={() => toggleLayer(l.key)}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
                <span style={{ ...ms.countBadge, background: activeLayers.has(l.key) ? l.color : Colors.greyBorder, color: Colors.white }}>
                  {counts[l.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={ms.wilayaWrap}>
          <p style={ms.controlTitle}>Wilaya</p>
          <select
            style={ms.wilayaSelect}
            value={wilaya ?? ''}
            onChange={e => setWilaya(e.target.value || null)}
          >
            <option value=''>— Toute l'Algérie —</option>
            {WILAYAS.map(w => (
              <option key={w.id} value={w.nom}>{w.id.toString().padStart(2,'0')} · {w.nom}</option>
            ))}
          </select>
        </div>

        <div style={ms.typeWrap}>
          <p style={ms.controlTitle}>Type de déchets ♻️</p>
          <div style={ms.typeChips}>
            {TYPES_DECHET.map(t => {
              const active = typeFilter.includes(t.value);
              return (
                <button
                  key={t.value}
                  style={{ ...ms.typeChip, ...(active ? { borderColor: t.color, background: t.color + '15', color: t.color } : {}) }}
                  onClick={() => toggleType(t.value)}
                >
                  {t.icon} {t.value}
                </button>
              );
            })}
            {typeFilter.length > 0 && (
              <button style={ms.typeChipClear} onClick={() => setTypeFilter([])}>✕</button>
            )}
          </div>
        </div>

        <div style={ms.legend}>
          <p style={ms.controlTitle}>Degré de pollution ⚠️</p>
          <div style={ms.legendItems}>
            {[1,2,3,4,5].map(d => {
              const active = degreFilter.includes(d);
              return (
                <button
                  key={d}
                  style={{ ...ms.typeChip, ...(active ? { borderColor: DEGRE_COLORS[d], background: DEGRE_COLORS[d] + '18', color: DEGRE_COLORS[d] } : {}) }}
                  onClick={() => toggleDegre(d)}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: DEGRE_COLORS[d], display: 'inline-block', flexShrink: 0 }} />
                  {d} — {DEGRE_LABELS[d]}
                </button>
              );
            })}
            {degreFilter.length > 0 && (
              <button style={ms.typeChipClear} onClick={() => setDegreFilter([])}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={ms.mapWrap}>
        <MapContainer
          center={[28.0339, 1.6596]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={allPoints} />
          <FlyToWilaya wilaya={wilaya} />

          {/* Signalements */}
          {activeLayers.has('signalements') && filteredS.map(s => (
            <Marker
              key={`s-${s.id}`}
              position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
              icon={signalIcon(s.degre_pollution)}
            >
              <Popup maxWidth={320}>
                <SignalementPopup
                  s={s}
                  onResolu={() => setSignalements(prev => prev.filter(x => x.id !== s.id))}
                  onPhotosCleared={(id) => setSignalements(prev => prev.map(x => x.id === id ? { ...x, photos_resolution: [] } : x))}
                />
              </Popup>
            </Marker>
          ))}

          {/* Points de collecte */}
          {activeLayers.has('points') && filteredP.map(p => (
            <Marker
              key={`p-${p.id}`}
              position={[parseFloat(p.latitude), parseFloat(p.longitude)]}
              icon={pointIcon}
            >
              <Popup maxWidth={300}>
                <div style={mp.popup}>
                  <div style={{ ...mp.header, background: Colors.primary }}>
                    <span style={mp.headerIcon}>♻️</span>
                    <span style={mp.headerLabel}>Point de collecte</span>
                    <span style={mp.headerId}>#{p.id}</span>
                  </div>
                  <div style={mp.body}>
                    <p style={mp.title}>{p.nom}</p>
                    <div style={mp.divider} />
                    <div style={mp.metaGrid}>
                      {p.wilaya && (
                        <div style={mp.metaItem}>
                          <span style={mp.metaIcon}>📍</span>
                          <span style={mp.metaText}>{p.wilaya}</span>
                        </div>
                      )}
                      {p.adresse && (
                        <div style={mp.metaItem}>
                          <span style={mp.metaIcon}>🏠</span>
                          <span style={mp.metaText}>{p.adresse}</span>
                        </div>
                      )}
                      {p.horaires && (
                        <div style={mp.metaItem}>
                          <span style={mp.metaIcon}>🕐</span>
                          <span style={mp.metaText}>{p.horaires}</span>
                        </div>
                      )}
                    </div>
                    {Array.isArray(p.type_dechet) && p.type_dechet.length > 0 && (
                      <>
                        <div style={mp.divider} />
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.type_dechet.map((t: string) => (
                            <span key={t} style={{ background: Colors.primaryLight, color: Colors.primaryDark, borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>{t}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Événements */}
          {activeLayers.has('evenements') && filteredE.map(e => (
            <Marker
              key={`e-${e.id}`}
              position={[parseFloat(e.latitude), parseFloat(e.longitude)]}
              icon={eventIcon}
            >
              <Popup maxWidth={300}>
                <div style={mp.popup}>
                  <div style={{ ...mp.header, background: Colors.purple }}>
                    <span style={mp.headerIcon}>📅</span>
                    <span style={mp.headerLabel}>Événement</span>
                    <span style={mp.headerId}>#{e.id}</span>
                  </div>
                  <div style={mp.body}>
                    <p style={mp.title}>{e.titre}</p>
                    <div style={mp.divider} />
                    <div style={mp.metaGrid}>
                      {e.wilaya && (
                        <div style={mp.metaItem}>
                          <span style={mp.metaIcon}>📍</span>
                          <span style={mp.metaText}>{e.wilaya}</span>
                        </div>
                      )}
                      {e.association?.nom && (
                        <div style={mp.metaItem}>
                          <span style={mp.metaIcon}>🏢</span>
                          <span style={mp.metaText}>{e.association.nom}</span>
                        </div>
                      )}
                      <div style={mp.metaItem}>
                        <span style={mp.metaIcon}>🗓</span>
                        <span style={mp.metaText}>{new Date(e.date_debut).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div style={mp.divider} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: Colors.purpleLight, color: Colors.purple, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                        +{e.points_participation} pts
                      </span>
                      {e.nb_places_max && (
                        <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                          {e.nb_places_max} places
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

/* ── Signalement popup component ── */

function SignalementPopup({ s, onResolu, onPhotosCleared }: { s: any; onResolu: () => void; onPhotosCleared: (id: number) => void }) {
  const [busy, setBusy] = useState<'resolu' | 'rejete' | null>(null);

  const parsePhotos = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
    return [];
  };
  const photosAvant = parsePhotos(s.photos);
  const photosApres = parsePhotos(s.photos_resolution);
  const color = DEGRE_COLORS[s.degre_pollution] ?? Colors.orange;

  const handleResolu = async () => {
    setBusy('resolu');
    try {
      await modererSignalement(s.id, 'resolu');
      onResolu();
    } catch { setBusy(null); }
  };

  const handleRejetePhotos = async () => {
    setBusy('rejete');
    try {
      await rejeterPhotosResolution(s.id);
      setPhotosApresLocal([]);
      onPhotosCleared(s.id);
    } catch {}
    setBusy(null);
  };

  return (
    <div style={mp.popup}>
      <div style={{ ...mp.header, background: color }}>
        <span style={mp.headerIcon}>⚠️</span>
        <span style={mp.headerLabel}>Signalement</span>
        <span style={mp.headerId}>#{s.id}</span>
      </div>
      <div style={mp.body}>
        <p style={mp.title}>{s.titre}</p>

        <div style={mp.degreRow}>
          <div style={mp.degreBar}>
            {[1,2,3,4,5].map(d => (
              <div key={d} style={{ flex: 1, height: '100%', borderRadius: 3, background: d <= s.degre_pollution ? color : '#E5E7EB' }} />
            ))}
          </div>
          <span style={{ ...mp.degreBadge, background: color + '18', color }}>
            {DEGRE_LABELS[s.degre_pollution]}
          </span>
        </div>

        <div style={mp.divider} />

        <div style={mp.metaGrid}>
          {s.wilaya && (
            <div style={mp.metaItem}>
              <span style={mp.metaIcon}>📍</span>
              <span style={mp.metaText}>{s.wilaya}{s.commune ? `, ${s.commune}` : ''}</span>
            </div>
          )}
          {s.citoyen && (
            <div style={mp.metaItem}>
              <span style={mp.metaIcon}>👤</span>
              <span style={mp.metaText}>{s.citoyen.prenom} {s.citoyen.nom}</span>
            </div>
          )}
          <div style={mp.metaItem}>
            <span style={mp.metaIcon}>🗓</span>
            <span style={mp.metaText}>{new Date(s.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {(s.confirmations_count ?? 0) > 0 && (
            <div style={mp.metaItem}>
              <span style={mp.metaIcon}>👥</span>
              <span style={{ ...mp.metaText, color: Colors.primary, fontWeight: 600 }}>
                {s.confirmations_count} citoyen{s.confirmations_count > 1 ? 's' : ''} ont confirmé
              </span>
            </div>
          )}
        </div>

        {/* Photos avant */}
        {photosAvant.length > 0 && (
          <>
            <div style={mp.divider} />
            <p style={mp.photoSectionLabel}>📸 Avant</p>
            <div style={mp.thumbRow}>
              {photosAvant.slice(0, 3).map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" style={mp.thumb} />
                </a>
              ))}
              {photosAvant.length > 3 && (
                <div style={mp.moreThumb}>+{photosAvant.length - 3}</div>
              )}
            </div>
          </>
        )}

        {/* Photos après */}
        {photosApres.length > 0 && (
          <>
            <div style={mp.divider} />
            <p style={{ ...mp.photoSectionLabel, color: Colors.primary }}>✅ Après nettoyage</p>
            <div style={mp.thumbRow}>
              {photosApres.slice(0, 3).map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" style={{ ...mp.thumb, borderColor: Colors.primary + '60' }} />
                </a>
              ))}
              {photosApres.length > 3 && (
                <div style={mp.moreThumb}>+{photosApres.length - 3}</div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div style={mp.divider} />
        <div style={mp.actionRow}>
          <button
            style={{ ...mp.actionBtn, background: Colors.primary, opacity: busy ? 0.6 : 1 }}
            disabled={!!busy}
            onClick={handleResolu}
          >
            {busy === 'resolu' ? '...' : '✓ Résolu'}
          </button>
          {photosApres.length > 0 && (
            <button
              style={{ ...mp.actionBtn, background: Colors.red, opacity: busy ? 0.6 : 1 }}
              disabled={!!busy}
              onClick={handleRejetePhotos}
            >
              {busy === 'rejete' ? '...' : '✕ Rejeter photos'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */

const ms: Record<string, React.CSSProperties> = {
  wrap:       { display: 'flex', flexDirection: 'column', gap: 16 },
  loadingWrap:{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  spinner:    { width: 40, height: 40, border: `4px solid ${Colors.greyBorder}`, borderTopColor: Colors.purple, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  controls:   { display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' as const, background: Colors.white, borderRadius: 14, padding: '14px 20px', border: `1px solid ${Colors.greyBorder}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  controlsLeft: { display: 'flex', flexDirection: 'column', gap: 8 },
  controlTitle: { fontSize: 11, fontWeight: 800, color: Colors.grey, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 },
  layerBtns:  { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  layerBtn:   { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 20, background: Colors.white, fontSize: 13, fontWeight: 600, color: Colors.grey, cursor: 'pointer', transition: 'all 0.15s' },
  layerBtnActive: { fontWeight: 700 },
  countBadge: { borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  wilayaWrap:   { display: 'flex', flexDirection: 'column', gap: 8 },
  wilayaSelect: {
    border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 8, padding: '7px 10px',
    fontSize: 13, color: Colors.black, background: Colors.white, cursor: 'pointer',
    outline: 'none', minWidth: 200,
  },
  typeWrap:      { display: 'flex', flexDirection: 'column', gap: 8 },
  typeChips:     { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  typeChip:      { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 20, background: Colors.white, fontSize: 12, fontWeight: 600, color: Colors.grey, cursor: 'pointer' },
  typeChipClear: { padding: '5px 10px', border: 'none', borderRadius: 20, background: Colors.greyLight, fontSize: 12, color: Colors.grey, cursor: 'pointer', fontWeight: 700 },
  legend:     { display: 'flex', flexDirection: 'column', gap: 8 },
  legendItems:{ display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  mapWrap:    { height: 600, borderRadius: 16, overflow: 'hidden', border: `1px solid ${Colors.greyBorder}`, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
};

const mp: Record<string, React.CSSProperties> = {
  popup:      { fontFamily: 'Inter, sans-serif', minWidth: 240, overflow: 'hidden' },
  header:     { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px' },
  headerIcon: { fontSize: 15 },
  headerLabel:{ flex: 1, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.95)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  headerId:   { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)' },
  body:       { padding: '12px 14px 14px' },
  title:      { fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.35, marginBottom: 0 },
  divider:    { height: 1, background: '#F3F4F6', margin: '10px 0' },
  degreRow:   { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  degreBar:   { flex: 1, display: 'flex', gap: 3, height: 6 },
  degreBadge: { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' as const },
  metaGrid:   { display: 'flex', flexDirection: 'column', gap: 5 },
  metaItem:   { display: 'flex', alignItems: 'flex-start', gap: 6 },
  metaIcon:   { fontSize: 12, marginTop: 1, flexShrink: 0 },
  metaText:   { fontSize: 12, color: '#374151', lineHeight: 1.4 },
  thumbRow:   { display: 'flex', gap: 5, alignItems: 'center' },
  thumb:      { width: 60, height: 60, objectFit: 'cover' as const, borderRadius: 8, cursor: 'pointer', border: '2px solid #F3F4F6' },
  moreThumb:  { width: 60, height: 60, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6B7280' },
  photoSectionLabel: { fontSize: 11, fontWeight: 800, color: Colors.grey, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 },
  actionRow:  { display: 'flex', gap: 8 },
  actionBtn:  { flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};
