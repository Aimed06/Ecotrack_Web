import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import { loginAssociation } from '../../api';
import { useViewport } from '../../hooks/useViewport';
import { MdGroups, MdEmail, MdLock, MdLogin, MdArrowBack } from 'react-icons/md';

export default function AssocLogin() {
  const navigate = useNavigate();
  const { isMobile } = useViewport();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginAssociation(email, password);
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', 'association');
      localStorage.setItem('assoc', JSON.stringify(res.data.data.association ?? {}));
      navigate('/assoc');
    } catch (err: any) {
      if (!err.response) setError('Impossible de joindre le serveur. Vérifiez que le backend est démarré.');
      else setError(err.response.data?.error || err.response.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...s.page, padding: isMobile ? 16 : 24 }}>
      <div style={s.bg1} />
      <div style={s.bg2} />
      <div style={{ ...s.card, padding: isMobile ? '32px 24px' : '44px 40px' }}>
        <div style={s.header}>
          <div style={s.iconWrap}>
            <MdGroups size={32} color={Colors.primary} />
          </div>
          <h1 style={s.title}>Espace Association</h1>
          <p style={s.sub}>Gérez vos événements EcoTrack</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Adresse email</label>
            <div style={s.inputWrap}>
              <MdEmail size={18} color={Colors.grey} style={{ flexShrink: 0 }} />
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@association.dz"
                required
              />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Mot de passe</label>
            <div style={s.inputWrap}>
              <MdLock size={18} color={Colors.grey} style={{ flexShrink: 0 }} />
              <input
                style={s.input}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div style={s.errorBox}>
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          <button style={{ ...s.btn, opacity: loading ? 0.75 : 1 }} type="submit" disabled={loading}>
            {loading ? (
              <span>Connexion en cours…</span>
            ) : (
              <>
                <MdLogin size={18} />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>

        <button style={s.back} onClick={() => navigate('/')}>
          <MdArrowBack size={15} />
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #065f46 100%)',
    position: 'relative', overflow: 'hidden',
  },
  bg1: {
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse at 25% 65%, ${Colors.primary}35 0%, transparent 55%)`,
  },
  bg2: {
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse at 80% 15%, ${Colors.primaryAccent}15 0%, transparent 50%)`,
  },
  card: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.07)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(255, 255, 255, 0.13)',
    borderRadius: 28,
    padding: '44px 40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 32px 80px rgba(0, 0, 0, 0.5)',
  },
  header: { textAlign: 'center', marginBottom: 32 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    background: Colors.primaryLight,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: { fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: 12, padding: '0 14px',
  },
  input: {
    flex: 1, border: 'none', background: 'none', outline: 'none',
    padding: '13px 0', fontSize: 14, color: '#fff',
  },
  errorBox: {
    background: 'rgba(226, 75, 74, 0.15)',
    border: '1px solid rgba(226, 75, 74, 0.35)',
    borderRadius: 10, padding: '10px 14px', color: '#fca5a5',
  },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: `linear-gradient(135deg, ${Colors.primary} 0%, #16a34a 100%)`,
    boxShadow: `0 8px 20px ${Colors.primary}50`,
    color: '#fff', border: 'none', borderRadius: 13,
    padding: '14px', fontSize: 15, fontWeight: 700, marginTop: 4, cursor: 'pointer',
  },
  back: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', marginTop: 20, background: 'none',
    border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
  },
};
