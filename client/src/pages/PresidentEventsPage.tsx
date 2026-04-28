import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface AssignedMember {
  userId: { _id: string; name: string };
  role: string;
}

interface Event {
  _id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  category: string;
  status: 'draft' | 'published' | 'cancelled';
  capacity?: number;
  requiresSafetyDisclaimer: boolean;
  assignedCommittee: AssignedMember[];
  createdBy: { _id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const CATEGORY_ICONS: Record<string, string> = {
  social: '🎉',
  sports: '⚽',
  outdoor: '🏕️',
  finance: '💰',
  other: '📌',
};

const sidebarLinks = [
  { icon: '🏠', label: 'Dashboard', path: '/president/dashboard' },
  { icon: '📅', label: 'Events', path: '/president/events' },
  { icon: '✅', label: 'Tasks', path: null },
  { icon: '💰', label: 'Budget', path: '/president/budget' },
  { icon: '👥', label: 'Members', path: null },
  { icon: '🗂️', label: 'Safety Files', path: null },
];

export default function PresidentEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const { selectedClub } = useAuth();

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then(res => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(e => e._id !== id));
    } catch {
      alert('Failed to delete event.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            <nav className="space-y-1">
              {sidebarLinks.map(link => (
                <a
                  key={link.label}
                  href="#"
                  onClick={e => { e.preventDefault(); if (link.path) navigate(link.path); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    link.label === 'Events'
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

        {/* Main */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800">All Events</h1>
              <p className="text-sm text-gray-500 mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} total</p>
            </div>
            <button
              onClick={() => navigate('/president/events/create')}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Create New Event
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-500 font-medium">No events yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first event to get started.</p>
              <button
                onClick={() => navigate('/president/events/create')}
                className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                Create New Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => {
                const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div key={event._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{CATEGORY_ICONS[event.category] ?? '📌'}</span>
                          <h3 className="text-base font-semibold text-gray-800">{event.title}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                            {event.status}
                          </span>
                          {event.requiresSafetyDisclaimer && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              ⚠️ Safety
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                          <span>📅 {dateStr}</span>
                          {event.location && <span>📍 {event.location}</span>}
                          {event.capacity && <span>👥 Capacity: {event.capacity}</span>}
                          {event.assignedCommittee.length > 0 && (
                            <span>🧑‍💼 {event.assignedCommittee.length} committee assigned</span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-1">{event.description}</p>
                        )}
                        {event.assignedCommittee.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {event.assignedCommittee.map((a, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {a.userId.name} · {a.role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => navigate(`/president/events/${event._id}/edit`)}
                          className="text-xs text-blue-500 hover:text-blue-700 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event._id)}
                          className="text-xs text-red-400 hover:text-red-600 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
