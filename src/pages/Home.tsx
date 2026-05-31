import { useNavigate } from 'react-router-dom';
import { Colors } from '../constants/colors';
import { MdShield, MdGroups, MdArrowForward, MdMailOutline } from 'react-icons/md';

const CONTACT_EMAIL = 'contact@ecotrack.dz'; // ← remplace par ton adresse

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.bg1} />
      <div style={s.bg2} />
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIconWrap}>
            <span style={{ fontSize: 36 }}>🌿</span>
          </div>
          <h1 style={s.title}>EcoTrack</h1>
          <p style={s.subtitle}>Plateforme de gestion environnementale</p>
        </div>

        <div style={s.divider} />

        <div style={s.buttons}>
          <button style={{ ...s.btn, ...s.btnAdmin }} onClick={() => navigate('/admin/login')}>
            <div style={{ ...s.btnIconWrap, background: 'rgba(255,255,255,0.18)' }}>
              <MdShield size={22} />
            </div>
            <div style={s.btnText}>
              <div style={s.btnTitle}>Espace Admin</div>
              <div style={s.btnSub}>Modération &amp; statistiques</div>
            </div>
            <MdArrowForward size={18} style={{ opacity: 0.7 }} />
          </button>

          <button style={{ ...s.btn, ...s.btnAssoc }} onClick={() => navigate('/assoc/login')}>
            <div style={{ ...s.btnIconWrap, background: 'rgba(255,255,255,0.18)' }}>
              <MdGroups size={22} />
            </div>
            <div style={s.btnText}>
              <div style={s.btnTitle}>Espace Association</div>
              <div style={s.btnSub}>Gérer vos événements</div>
            </div>
            <MdArrowForward size={18} style={{ opacity: 0.7 }} />
          </button>
        </div>

        <div style={s.contactWrap}>
          <MdMailOutline size={16} color={Colors.primaryAccent} style={{ flexShrink: 0 }} />
          <span style={s.contactText}>Une remarque ou suggestion ?</span>
          <a href={`mailto:${CONTACT_EMAIL}`} style={s.contactLink}>Contactez-nous</a>
        </div>

        <p style={s.footer}>© {new Date().getFullYear()} EcoTrack — Université A/Mira Béjaïa</p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  bg1: {
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse at 20% 50%, ${Colors.primary}25 0%, transparent 60%)`,
  },
  bg2: {
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse at 80% 20%, ${Colors.purple}20 0%, transparent 55%)`,
  },
  card: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 28,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
  },
  logo: { textAlign: 'center', marginBottom: 32 },
  logoIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: { fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  divider: { height: 1, background: 'rgba(255,255,255,0.10)', margin: '0 0 28px' },
  buttons: { display: 'flex', flexDirection: 'column', gap: 14 },
  btn: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 20px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', cursor: 'pointer', textAlign: 'left',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  btnAdmin: {
    background: `linear-gradient(135deg, ${Colors.purple} 0%, #6C63D3 100%)`,
    boxShadow: `0 8px 24px ${Colors.purple}50`,
  },
  btnAssoc: {
    background: `linear-gradient(135deg, ${Colors.primary} 0%, #22c55e 100%)`,
    boxShadow: `0 8px 24px ${Colors.primary}50`,
  },
  btnIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  btnText: { flex: 1 },
  btnTitle: { fontSize: 15, fontWeight: 700 },
  btnSub: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  contactWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 24, padding: '10px 16px', borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  contactText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  contactLink: {
    fontSize: 13, fontWeight: 600,
    color: Colors.primaryAccent,
    textDecoration: 'none',
  },
  footer: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 16 },
};
