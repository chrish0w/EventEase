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

const presidentNavLinks = [
  { key: 'dashboard', label: 'Dashboard', path: '/president/dashboard' },
  { key: 'events', label: 'Events', path: '/president/events' },
  { key: 'budget', label: 'Budget', path: '/president/budget' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'members', label: 'Members' },
  { key: 'safety', label: 'Safety Files' },
] as const satisfies ReadonlyArray<{ key: string; label: string; path?: string }>;

export function PresidentNav({ active }: { active: 'dashboard' | 'events' | 'budget' }) {
  const navigate = useNavigate();

  return (
    <aside className="w-56 shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
        <nav className="space-y-1">
          {presidentNavLinks.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => { if ('path' in link && link.path) navigate(link.path); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                link.key === active
                  ? 'bg-yellow-50 text-yellow-800 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeStyles[user.role] || roleBadgeStyles.user}`}>
                  {roleLabels[user.role] || user.role}
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
