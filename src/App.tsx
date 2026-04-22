import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AssocLogin from './pages/association/AssocLogin';
import AssocDashboard from './pages/association/AssocDashboard';

function RequireAuth({ role, children }: { role: 'admin' | 'association'; children: React.ReactNode }) {
  const storedRole = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  if (!token || storedRole !== role) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/assoc/login'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <RequireAuth role="admin"><AdminDashboard /></RequireAuth>
        } />
        <Route path="/assoc/login" element={<AssocLogin />} />
        <Route path="/assoc" element={
          <RequireAuth role="association"><AssocDashboard /></RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
