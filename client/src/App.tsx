import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import CommitteeDashboard from './pages/CommitteeDashboard';
import PresidentDashboard from './pages/PresidentDashboard';
import CreateEventPage from './pages/CreateEventPage';
import CommitteeEventsPage from './pages/CommitteeEventsPage';
import PresidentEventsPage from './pages/PresidentEventsPage';
import ClubSelectPage from './pages/ClubSelectPage';
import JoinClubPage from './pages/JoinClubPage';
import AdminDashboard from './pages/AdminDashboard';
import PresidentMembersPage from './pages/PresidentMembersPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminOrgsPage from './pages/SuperAdminOrgsPage';
import SuperAdminOrgAdminsPage from './pages/SuperAdminOrgAdminsPage';

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { token, user, selectedClub } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (requiredRole === 'super_admin' && user?.role !== 'super_admin') return <Navigate to="/dashboard" />;
  if (requiredRole === 'admin' && user?.role !== 'admin') return <Navigate to="/club-select" />;
  if (requiredRole && !['admin', 'super_admin'].includes(requiredRole) && selectedClub?.role !== requiredRole) return <Navigate to="/club-select" />;
  return <>{children}</>;
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <Navigate to="/super-admin/dashboard" />;
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
          <Route path="/super-admin/dashboard" element={<PrivateRoute requiredRole="super_admin"><SuperAdminDashboard /></PrivateRoute>} />
          <Route path="/super-admin/organisations" element={<PrivateRoute requiredRole="super_admin"><SuperAdminOrgsPage /></PrivateRoute>} />
          <Route path="/super-admin/org-admins" element={<PrivateRoute requiredRole="super_admin"><SuperAdminOrgAdminsPage /></PrivateRoute>} />
          <Route path="/president/events" element={<PrivateRoute requiredRole="president"><PresidentEventsPage /></PrivateRoute>} />
          <Route path="/president/events/create" element={<PrivateRoute requiredRole="president"><CreateEventPage /></PrivateRoute>} />
          <Route path="/president/events/:id/edit" element={<PrivateRoute requiredRole="president"><CreateEventPage /></PrivateRoute>} />
          <Route path="/committee/events" element={<PrivateRoute requiredRole="committee"><CommitteeEventsPage /></PrivateRoute>} />
          <Route path="/president/members" element={<PrivateRoute requiredRole="president"><PresidentMembersPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
