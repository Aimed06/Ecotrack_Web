import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import { MdLock, MdBlock, MdArrowBack, MdLogin, MdShield } from 'react-icons/md';

type Reason = 'unauthenticated' | 'forbidden';
type Role   = 'admin' | 'association';

interface Props { reason: Reason; role: Role; }

export default function AccessDenied({ reason, role }: Props) {
  const navigate   = useNavigate();
  const isUnauth   = reason === 'unauthenticated';
  const loginPath  = role === 'admin' ? '/admin/login' : '/assoc/login';
  const code       = isUnauth ? '401' : '403';
  const accentColor = isUnauth ? Colors.orange : Colors.red;
  const accentLight = isUnauth ? Colors.orangeLight : Colors.redLight;

  return (
    <div style={s.page}>
      {/* Background glows */}
      <div style={{ ...s.glow, background: `radial-gradient(ellipse at 30% 40%, ${accentColor}20 0%, transparent 60%)` }} />
      <div style={{ ...s.glow, background: `radial-gradient(ellipse at 75% 70%, ${Colors.purple}18 0%, transparent 55%)` }} />

      <div style={s.card}>
        {/* Code badge */}
        <div style={{ ...s.codeBadge, background: `${accentColor}18`, border: `1px solid ${accentColor}35` }}>
          <span style={{ ...s.codeText, color: accentColor }}>{code}</span>
        </div>

        {/* Icon */}
        <div style={{ ...s.iconWrap, background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
          {isUnauth
            ? <MdLock  size={42} color={accentColor} />
            : <MdBlock size={42} color={accentColor} />}
        </div>

        {/* Title */}
        <h1 style={s.title}>
          {isUnauth ? 'Connexion requise' : 'Accès non autorisé'}
        </h1>

        {/* Message */}
        <p style={s.message}>
          {isUnauth
            ? `Cette page est réservée aux ${role === 'admin' ? 'administrateurs' : 'associations validées'}. Veuillez vous connecter pour continuer.`
            : `Vous êtes connecté avec un compte ${role === 'admin' ? 'association' : 'admin'}, mais cette section requiert un accès ${role === 'admin' ? 'administrateur' : 'association'}.`
          }
        </p>

        {/* Actions */}
        <div style={s.actions}>
          <button style={{ ...s.btn, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, boxShadow: `0 8px 24px ${accentColor}40` }}
            onClick={() => navigate(loginPath)}>
            <MdLogin size={18} />
            {isUnauth
              ? `Se connecter ${role === 'admin' ? '(Admin)' : '(Association)'}`
              : `Changer de compte`}
          </button>
          <button style={s.btnSecondary} onClick={() => navigate('/')}>
            <MdArrowBack size={18} />
            Retour à l'accueil
          </button>
        </div>

        {/* Context hint */}
        <div style={s.hint}>
          <MdShield size={14} color={'rgba(255,255,255,0.25)'} />
          <span style={s.hintText}>
            {role === 'admin' ? 'Espace Administration — EcoTrack' : 'Espace Association — EcoTrack'}
          </span>
        </div>
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
  codeBadge: {
    borderRadius: 20, padding: '5px 16px',
  },
  codeText: { fontSize: 13, fontWeight: 800, letterSpacing: 1 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 24,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 26, fontWeight: 800, color: '#fff',
    margin: 0, textAlign: 'center', letterSpacing: 0.2,
  },
  message: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 1.7, margin: 0,
    maxWidth: 320,
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 4 },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '14px 24px', borderRadius: 16, border: 'none',
    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnSecondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    padding: '14px 24px', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  hint: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
  },
  hintText: { fontSize: 12, color: 'rgba(255,255,255,0.25)' },
  footer: {
    position: 'relative', zIndex: 1,
    fontSize: 11, color: 'rgba(255,255,255,0.2)',
  },
};
