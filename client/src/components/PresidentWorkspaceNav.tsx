import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { icon: '🏠', label: 'Dashboard', path: '/president/dashboard' },
  { icon: '📅', label: 'Events', path: '/president/events' },
  { icon: '💰', label: 'Club Budget', path: '/president/budget' },
  { icon: '👥', label: 'Members', path: '/president/members' },
];

export default function PresidentWorkspaceNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const { selectedClub } = useAuth();

  return (
    <aside className="w-56 shrink-0">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {selectedClub?.clubName || 'Club'} Workspace
        </p>
        <button
          type="button"
          onClick={() => navigate('/user/dashboard')}
          className="mb-4 w-full rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-cyan-50 p-3 text-left transition hover:border-yellow-200 hover:shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-700">Explore Portal</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{selectedClub?.clubName || 'Club'}</p>
          <p className="text-xs text-yellow-800">Back to overview, clubs, events, following, and profile</p>
        </button>
        <nav className="space-y-1">
          {links.map(link => (
            <a
              key={link.label}
              href="#"
              onClick={e => { e.preventDefault(); navigate(link.path); }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active === link.label
                  ? 'bg-yellow-50 font-medium text-yellow-800'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {link.icon} {link.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
