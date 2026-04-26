import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleBadgeStyles: Record<string, string> = {
  president: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  committee: 'bg-purple-100 text-purple-800 border border-purple-300',
  user: 'bg-blue-100 text-blue-800 border border-blue-300',
};

const roleLabels: Record<string, string> = {
  president: 'President',
  committee: 'Committee',
  user: 'Member',
};

export default function Navbar() {
  const { user, logout, selectedClub } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const clubRole = selectedClub?.role;
  const isSuperAdmin = user?.role === 'super_admin';
  const badgeStyle = isSuperAdmin
    ? 'bg-purple-100 text-purple-800 border border-purple-300'
    : (roleBadgeStyles[clubRole || ''] || roleBadgeStyles.user);
  const badgeLabel = isSuperAdmin ? 'Super Admin' : (
    clubRole === 'committee' && selectedClub?.committeeRole
      ? selectedClub.committeeRole.charAt(0).toUpperCase() + selectedClub.committeeRole.slice(1) + ' Committee'
      : roleLabels[clubRole || ''] || 'Member'
  );

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-600">EventEase</span>
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Monash</span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}>
                  {badgeLabel}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600 font-medium border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
