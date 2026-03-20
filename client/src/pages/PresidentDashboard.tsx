import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const stats = [
  { label: 'Total Events', value: '0', icon: 'Events', color: 'bg-blue-50 text-blue-700' },
  { label: 'Total Members', value: '0', icon: 'Members', color: 'bg-green-50 text-green-700' },
  { label: 'Active Tasks', value: '0', icon: 'Tasks', color: 'bg-purple-50 text-purple-700' },
  { label: 'Budget Overview', value: '$0', icon: 'Budget', color: 'bg-yellow-50 text-yellow-700' },
];

const sidebarLinks = [
  { label: 'Dashboard', to: '/president/dashboard', active: true },
  { label: 'Events', to: '#', active: false },
  { label: 'Tasks', to: '#', active: false },
  { label: 'Budget', to: '/president/budget', active: false },
  { label: 'Members', to: '#', active: false },
  { label: 'Safety Files', to: '#', active: false },
];

export default function PresidentDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            <nav className="space-y-1">
              {sidebarLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    link.active ? 'bg-yellow-50 text-yellow-800 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Welcome, President {user?.name}!</h1>
                <p className="text-yellow-100 text-sm">You have full control of all club activities and events.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                President
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold mb-3 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Events</h2>
              <button className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                + Create New Event
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-5xl mb-4">Events</div>
              <p className="text-gray-500 font-medium">No events created yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first event to get started.</p>
              <button className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm">
                Create New Event
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Team Overview</h2>
              <button className="text-sm text-blue-600 hover:underline font-medium">
                Manage Members
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-5xl mb-4">Members</div>
              <p className="text-gray-500 font-medium">No team members yet</p>
              <p className="text-gray-400 text-sm mt-1">Invite committee members to start collaborating.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
