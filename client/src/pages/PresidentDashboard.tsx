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
  date: string;
  location?: string;
  category: string;
  status: 'draft' | 'published' | 'cancelled';
  assignedCommittee: AssignedMember[];
  createdBy: { _id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const sidebarLinks = [
  { icon: '🏠', label: 'Dashboard', path: '/president/dashboard' },
  { icon: '📅', label: 'Events', path: '/president/events' },
  { icon: '✅', label: 'Tasks', path: null },
  { icon: '💰', label: 'Budget', path: '/president/budget' },
  { icon: '👥', label: 'Members', path: '/president/members' },
  { icon: '🗂️', label: 'Safety Files', path: null },
];

interface JoinRequest {
  _id: string;
  userId: { _id: string; name: string; email: string; studentId?: string };
  message?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PresidentDashboard() {
  const { user, selectedClub } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [remainingBudget, setRemainingBudget] = useState(0);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then(res => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, [selectedClub]);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/clubs/${selectedClub.clubId}/requests`)
      .then(res => setJoinRequests(res.data))
      .catch(() => {});
  }, [selectedClub]);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/budget?clubId=${selectedClub.clubId}`)
      .then(res => setRemainingBudget(Number(res.data.remainingBudget || 0)))
      .catch(() => setRemainingBudget(0));
  }, [selectedClub]);

  const handleRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!selectedClub?.clubId) return;
    try {
      await api.put(`/clubs/${selectedClub.clubId}/requests/${requestId}`, { status });
      setJoinRequests(prev => prev.filter(r => r._id !== requestId));
    } catch {
      alert('Failed to update request.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(e => e._id !== id));
    } catch {
      alert('Failed to delete event.');
    }
  };

  const stats = [
    { label: 'Total Events', value: String(events.length), icon: '📅', color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Members', value: '0', icon: '👥', color: 'bg-green-50 text-green-700' },
    { label: 'Active Tasks', value: '0', icon: '✅', color: 'bg-purple-50 text-purple-700' },
    { label: 'Budget Overview', value: formatCurrency(remainingBudget), icon: '💰', color: 'bg-yellow-50 text-yellow-700', actionPath: '/president/budget' },
  ];

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
                  href="#"
                  onClick={e => { e.preventDefault(); if (link.path) navigate(link.path); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    link.label === 'Dashboard'
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
                <div className="flex items-start justify-between gap-3">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  {'actionPath' in stat && stat.actionPath && (
                    <button
                      type="button"
                      onClick={() => navigate(stat.actionPath)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Events</h2>
              <button
                onClick={() => navigate('/president/events/create')}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                + Create New Event
              </button>
            </div>

            {loadingEvents ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-500 font-medium">No events created yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first event to get started.</p>
                <button
                  onClick={() => navigate('/president/events/create')}
                  className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                >
                  Create New Event
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {events.map(event => {
                  const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
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
                          {event.assignedCommittee.length > 0 && ` · 👥 ${event.assignedCommittee.length} assigned`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="text-xs text-red-400 hover:text-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Join Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Join Requests
                {joinRequests.length > 0 && (
                  <span className="ml-2 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {joinRequests.length}
                  </span>
                )}
              </h2>
            </div>
            {joinRequests.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No pending join requests.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {joinRequests.map(req => (
                  <div key={req._id} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{req.userId.name}</p>
                      <p className="text-xs text-gray-400">{req.userId.email}{req.userId.studentId ? ` · ${req.userId.studentId}` : ''}</p>
                      {req.message && <p className="text-xs text-gray-500 mt-0.5 italic">"{req.message}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(req._id, 'approved')}
                        className="text-xs bg-green-100 text-green-700 hover:bg-green-200 font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequest(req._id, 'rejected')}
                        className="text-xs bg-red-100 text-red-600 hover:bg-red-200 font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
