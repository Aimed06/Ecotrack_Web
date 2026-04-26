import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/colors';
import { loginAdmin } from '../../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginAdmin(email, password);
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', 'admin');
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.badge}>🛡️ Admin</div>
          <h1 style={s.title}>Connexion</h1>
          <p style={s.sub}>Tableau de bord administrateur</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              autoComplete='username'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ecotrack.dz"
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Mot de passe</label>
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

          {error && <p style={s.error}>{error}</p>}

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <button style={s.back} onClick={() => navigate('/')}>← Retour</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(135deg, ${Colors.purpleLight} 0%, #fff 100%)`,
  },
  card: {
    background: Colors.white, borderRadius: 24, padding: 40,
    boxShadow: '0 8px 40px rgba(0,0,0,0.10)', width: '100%', maxWidth: 400,
  },
  header: { textAlign: 'center', marginBottom: 32 },
  badge: {
    display: 'inline-block', background: Colors.purpleLight, color: Colors.purple,
    borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700, marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: 800, color: Colors.black },
  sub: { fontSize: 13, color: Colors.grey, marginTop: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: Colors.black },
  input: {
    border: `1.5px solid ${Colors.greyBorder}`, borderRadius: 10, padding: '12px 14px',
    fontSize: 14, outline: 'none', transition: 'border-color .15s',
  },
  error: { color: Colors.red, fontSize: 13, textAlign: 'center' },
  btn: {
    background: Colors.purple, color: Colors.white, border: 'none',
    borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700,
    marginTop: 4, cursor: 'pointer',
  },
  back: {
    display: 'block', width: '100%', marginTop: 16, background: 'none',
    border: 'none', color: Colors.grey, fontSize: 13, cursor: 'pointer',
    textAlign: 'center',
  },
};
