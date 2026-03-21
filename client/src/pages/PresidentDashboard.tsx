import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const stats = [
  { label: 'Total Events', value: '0', icon: '📅', color: 'bg-blue-50 text-blue-700' },
  { label: 'Total Members', value: '0', icon: '👥', color: 'bg-green-50 text-green-700' },
  { label: 'Active Tasks', value: '0', icon: '✅', color: 'bg-purple-50 text-purple-700' },
  { label: 'Budget Overview', value: '$0', icon: '💰', color: 'bg-yellow-50 text-yellow-700' },
];

const sidebarLinks = [
  { icon: '🏠', label: 'Dashboard',    path: '/president/dashboard', active: true },
  { icon: '📅', label: 'Events',       path: '#',                    active: false },
  { icon: '✅', label: 'Tasks',        path: '#',                    active: false },
  { icon: '💰', label: 'Budget',       path: '#',                    active: false },
  { icon: '👥', label: 'Members',      path: '/president/members',   active: false },
  { icon: '🗂️', label: 'Safety Files', path: '#',                   active: false },
];

export default function PresidentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            <nav className="space-y-1">
              {sidebarLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.path}
                  onClick={link.path !== '#' ? (e) => { e.preventDefault(); navigate(link.path); } : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                    link.active
                      ? 'bg-yellow-50 text-yellow-800 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.icon} {link.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Welcome, President {user?.name}! 👑</h1>
                <p className="text-yellow-100 text-sm">You have full control of all club activities and events.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                President
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Events</h2>
              <button className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                + Create New Event
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-500 font-medium">No events created yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first event to get started.</p>
              <button className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm">
                Create New Event
              </button>
            </div>
          </div>

          {/* Team Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Team Overview</h2>
              <button
                onClick={() => navigate('/president/members')}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Manage Members →
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-gray-500 font-medium">No team members yet</p>
              <p className="text-gray-400 text-sm mt-1">Invite committee members to start collaborating.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
