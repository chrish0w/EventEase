import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import CommitteeDashboard from './pages/CommitteeDashboard';
import PresidentDashboard from './pages/PresidentDashboard';
import BudgetPage from './pages/BudgetPage';
import CreateEventPage from './pages/CreateEventPage';
import CommitteeEventsPage from './pages/CommitteeEventsPage';
import PresidentEventsPage from './pages/PresidentEventsPage';
import ClubSelectPage from './pages/ClubSelectPage';
import JoinClubPage from './pages/JoinClubPage';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { token, user, selectedClub } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (requiredRole === 'admin' && user?.role !== 'admin') return <Navigate to="/club-select" />;
  if (requiredRole && requiredRole !== 'admin' && selectedClub?.role !== requiredRole) return <Navigate to="/club-select" />;
  return <>{children}</>;
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" />;
  return <Navigate to="/club-select" />;
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
          <Route path="/club-select" element={<PrivateRoute><ClubSelectPage /></PrivateRoute>} />
          <Route path="/clubs/join" element={<PrivateRoute><JoinClubPage /></PrivateRoute>} />
          <Route path="/admin/dashboard" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/president/events" element={<PrivateRoute requiredRole="president"><PresidentEventsPage /></PrivateRoute>} />
          <Route path="/president/events/create" element={<PrivateRoute requiredRole="president"><CreateEventPage /></PrivateRoute>} />
          <Route path="/president/events/:id/edit" element={<PrivateRoute requiredRole="president"><CreateEventPage /></PrivateRoute>} />
          <Route path="/president/budget" element={<PrivateRoute requiredRole="president"><BudgetPage /></PrivateRoute>} />
          <Route path="/committee/events" element={<PrivateRoute requiredRole="committee"><CommitteeEventsPage /></PrivateRoute>} />
          <Route path="/committee/events/create" element={<PrivateRoute requiredRole="committee"><CreateEventPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
