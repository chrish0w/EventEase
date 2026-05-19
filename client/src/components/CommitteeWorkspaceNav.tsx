import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { icon: '🏠', label: 'Dashboard', path: '/committee/dashboard' },
  { icon: '🗂️', label: 'Assigned Work', path: '/committee/assigned-work' },
  { icon: '📅', label: 'Events', path: '/committee/events' },
  { icon: '👥', label: 'Members', path: '/committee/members' },
];

export default function CommitteeWorkspaceNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const { selectedClub } = useAuth();

  return (
    <aside className="w-56 shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {selectedClub?.clubName || 'Club'} Workspace
        </p>
        <button
          type="button"
          onClick={() => navigate('/user/dashboard')}
          className="mb-4 w-full rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-cyan-50 p-3 text-left transition hover:border-purple-200 hover:shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-500">Explore Portal</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{selectedClub?.clubName || 'Club'}</p>
          <p className="text-xs text-purple-700">Back to overview, clubs, events, following, and profile</p>
        </button>
        <nav className="space-y-1">
          {links.map(link => (
            <a
              key={link.label}
              href="#"
              onClick={e => { e.preventDefault(); navigate(link.path); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                active === link.label
                  ? 'bg-purple-50 text-purple-700 font-medium'
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
