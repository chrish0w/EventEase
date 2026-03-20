import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import CommitteeDashboard from './pages/CommitteeDashboard';
import PresidentDashboard from './pages/PresidentDashboard';
import BudgetPage from './pages/BudgetPage';

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'president') return <Navigate to="/president/dashboard" />;
  if (user?.role === 'committee') return <Navigate to="/committee/dashboard" />;
  return <Navigate to="/user/dashboard" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><RoleDashboard /></PrivateRoute>} />
          <Route path="/user/dashboard" element={<PrivateRoute requiredRole="user"><UserDashboard /></PrivateRoute>} />
          <Route path="/committee/dashboard" element={<PrivateRoute requiredRole="committee"><CommitteeDashboard /></PrivateRoute>} />
          <Route path="/president/dashboard" element={<PrivateRoute requiredRole="president"><PresidentDashboard /></PrivateRoute>} />
          <Route path="/president/budget" element={<PrivateRoute requiredRole="president"><BudgetPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
