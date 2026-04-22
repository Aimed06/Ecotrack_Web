import { useNavigate } from 'react-router-dom';
import { Colors } from '../constants/colors';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoIcon}>🌿</span>
          <h1 style={s.title}>EcoTrack</h1>
          <p style={s.subtitle}>Plateforme de gestion</p>
        </div>

        <div style={s.buttons}>
          <button style={{ ...s.btn, background: Colors.purple }} onClick={() => navigate('/admin/login')}>
            <span style={s.btnIcon}>🛡️</span>
            <div>
              <div style={s.btnTitle}>Espace Admin</div>
              <div style={s.btnSub}>Modération & statistiques</div>
            </div>
          </button>

          <button style={{ ...s.btn, background: Colors.primary }} onClick={() => navigate('/assoc/login')}>
            <span style={s.btnIcon}>🏢</span>
            <div>
              <div style={s.btnTitle}>Espace Association</div>
              <div style={s.btnSub}>Gérer vos événements</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(135deg, ${Colors.primaryLight} 0%, #fff 50%, ${Colors.purpleLight} 100%)`,
  },
  card: {
    background: Colors.white, borderRadius: 24, padding: 48,
    boxShadow: '0 8px 40px rgba(0,0,0,0.10)', width: '100%', maxWidth: 420,
  },
  logo: { textAlign: 'center', marginBottom: 40 },
  logoIcon: { fontSize: 48 },
  title: { fontSize: 32, fontWeight: 800, color: Colors.primaryDark, marginTop: 8 },
  subtitle: { fontSize: 14, color: Colors.grey, marginTop: 4 },
  buttons: { display: 'flex', flexDirection: 'column', gap: 16 },
  btn: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '18px 24px', borderRadius: 16, border: 'none',
    color: Colors.white, cursor: 'pointer', transition: 'opacity .15s',
    textAlign: 'left',
  },
  btnIcon: { fontSize: 28 },
  btnTitle: { fontSize: 15, fontWeight: 700 },
  btnSub: { fontSize: 12, opacity: 0.8, marginTop: 2 },
};
