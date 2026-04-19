import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Event {
  _id: string;
  title: string;
  date: string;
  location?: string;
  status: 'draft' | 'published' | 'cancelled';
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function CommitteeDashboard() {
  const { user, selectedClub } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then(res => setEvents(res.data))
      .catch(() => {});
  }, [selectedClub]);
  const roleLabel = selectedClub?.committeeRole
    ? selectedClub.committeeRole.charAt(0).toUpperCase() + selectedClub.committeeRole.slice(1) + ' Committee'
    : 'Committee';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            <nav className="space-y-1">
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-medium text-sm"
              >
                🏠 Dashboard
              </a>
              <a
                href="#"
                onClick={e => { e.preventDefault(); navigate('/committee/events'); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition"
              >
                📅 Events
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition"
              >
                ✅ Tasks
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition"
              >
                👥 Members
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Welcome, {roleLabel} {user?.name}! 🎉</h1>
                <p className="text-purple-100 text-sm">Manage your tasks and events from here.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'My Assigned Tasks', value: '0', icon: '✅', color: 'bg-blue-50 text-blue-700' },
              { label: 'Club Events', value: String(events.length), icon: '📅', color: 'bg-purple-50 text-purple-700' },
              { label: 'Pending RSVPs', value: '0', icon: '🎟️', color: 'bg-yellow-50 text-yellow-700' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* My Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">My Tasks</h2>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 font-medium">No tasks assigned yet</p>
              <p className="text-gray-400 text-sm mt-1">Tasks assigned to you by the president will appear here.</p>
            </div>
          </div>

          {/* Club Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Club Events</h2>
              <button
                onClick={() => navigate('/committee/events')}
                className="text-sm text-purple-600 hover:underline font-medium"
              >
                View All →
              </button>
            </div>
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-500 font-medium">No events yet</p>
                <p className="text-gray-400 text-sm mt-1">Events created by the president will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {events.slice(0, 5).map(event => {
                  const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  });
                  return (
                    <div key={event._id} className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[event.status]}`}>
                            {event.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          📅 {dateStr}{event.location ? ` · 📍 ${event.location}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
