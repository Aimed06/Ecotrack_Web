import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import { MdHome, MdArrowBack } from 'react-icons/md';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      {/* Background glows */}
      <div style={{ ...s.glow, background: `radial-gradient(ellipse at 25% 50%, ${Colors.blue}18 0%, transparent 60%)` }} />
      <div style={{ ...s.glow, background: `radial-gradient(ellipse at 80% 25%, ${Colors.purple}18 0%, transparent 55%)` }} />

      <div style={s.card}>
        {/* 404 large number */}
        <div style={s.bigCode}>
          <span style={{ ...s.bigCodeDigit, color: Colors.blue }}>4</span>
          <span style={{ ...s.bigCodeDigit, color: Colors.primary }}>0</span>
          <span style={{ ...s.bigCodeDigit, color: Colors.blue }}>4</span>
        </div>

        {/* Divider */}
        <div style={s.divider} />

        {/* Title */}
        <h1 style={s.title}>Page introuvable</h1>

        {/* Message */}
        <p style={s.message}>
          La page que vous cherchez n'existe pas ou a été déplacée.
          Vérifiez l'URL ou revenez à l'accueil.
        </p>

        {/* Actions */}
        <div style={s.actions}>
          <button style={s.btnPrimary} onClick={() => navigate('/')}>
            <MdHome size={18} />
            Retour à l'accueil
          </button>
          <button style={s.btnSecondary} onClick={() => navigate(-1 as any)}>
            <MdArrowBack size={18} />
            Page précédente
          </button>
        </div>

        {/* Path hint */}
        <p style={s.pathHint}>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>URL demandée : </span>
          <code style={s.pathCode}>{window.location.pathname}</code>
        </p>
      </div>

      <p style={s.footer}>© {new Date().getFullYear()} EcoTrack — Université A/Mira Béjaïa</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0F2027 0%, #1a2a35 50%, #0F2027 100%)',
    position: 'relative', overflow: 'hidden', gap: 24,
    padding: '24px 16px',
  },
  glow: { position: 'absolute', inset: 0 },
  card: {
    position: 'relative', zIndex: 1,
    background: 'rgba(255,255,255,0.055)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 28,
    padding: '44px 40px',
    width: '100%', maxWidth: 440,
    boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 20,
  },
  bigCode: { display: 'flex', gap: 2, lineHeight: 1 },
  bigCodeDigit: {
    fontSize: 88, fontWeight: 900, letterSpacing: -4,
    textShadow: '0 0 40px currentColor',
    opacity: 0.9,
  },
  divider: {
    width: 48, height: 3, borderRadius: 2,
    background: 'rgba(255,255,255,0.12)',
  },
  title: {
    fontSize: 24, fontWeight: 800, color: '#fff',
    margin: 0, textAlign: 'center',
  },
  message: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', lineHeight: 1.7, margin: 0,
    maxWidth: 320,
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 12, width: '100%' },
  btnPrimary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '14px 24px', borderRadius: 16, border: 'none',
    background: `linear-gradient(135deg, ${Colors.primary}, ${Colors.primaryMedium})`,
    boxShadow: `0 8px 24px ${Colors.primary}40`,
    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
  btnSecondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '14px 24px', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  pathHint: {
    fontSize: 12, color: 'rgba(255,255,255,0.25)',
    margin: 0, textAlign: 'center',
  },
  pathCode: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'monospace', fontSize: 12,
    background: 'rgba(255,255,255,0.08)',
    padding: '2px 8px', borderRadius: 6,
  },
  footer: {
    position: 'relative', zIndex: 1,
    fontSize: 11, color: 'rgba(255,255,255,0.2)',
  },
};
