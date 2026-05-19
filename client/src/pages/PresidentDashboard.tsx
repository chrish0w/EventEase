import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PresidentWorkspaceNav from '../components/PresidentWorkspaceNav';
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

interface ClubMember {
  _id: string;
  role?: 'president' | 'committee' | 'user';
  committeeRole?: string;
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
  const [members, setMembers] = useState<ClubMember[]>([]);
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
    api.get(`/clubs/${selectedClub.clubId}/members`)
      .then(res => setMembers(res.data))
      .catch(() => setMembers([]));
  }, [selectedClub]);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/budget?clubId=${selectedClub.clubId}`)
      .then(res => setRemainingBudget(Number(res.data.remainingBudget || 0)))
      .catch(() => setRemainingBudget(0));
  }, [selectedClub]);

  const { completedEvents, upcomingEvents } = useMemo(() => {
    const now = new Date();
    return {
      completedEvents: events
        .filter(event => new Date(event.date) < now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      upcomingEvents: events
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }, [events]);

  const committeeCount = members.filter(member => member.role === 'committee').length;
  const unassignedUpcomingCount = upcomingEvents.filter(event => event.assignedCommittee.length === 0).length;
  const nextEvent = upcomingEvents[0];

  const renderEventPreview = (items: Event[], emptyText: string) => (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
          <p className="text-sm text-gray-400">{emptyText}</p>
        </div>
      ) : (
        items.slice(0, 3).map(event => {
          const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          return (
            <button
              key={event._id}
              type="button"
              onClick={() => navigate(`/president/events?event=${event._id}`)}
              className="block w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:border-yellow-200 hover:bg-yellow-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-800">{event.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status]}`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    📅 {dateStr}{event.location ? ` · 📍 ${event.location}` : ''}
                  </p>
                  {event.assignedCommittee.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400">👥 {event.assignedCommittee.length} assigned</p>
                  )}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  const stats = [
    { label: 'Total Events', value: String(events.length), icon: '📅', color: 'bg-blue-50 text-blue-700' },
    { label: 'Club Members', value: String(members.length), icon: '👥', color: 'bg-green-50 text-green-700', actionPath: '/president/members' },
    { label: 'Club Budget Overview', value: formatCurrency(remainingBudget), icon: '💰', color: 'bg-yellow-50 text-yellow-700', actionPath: '/president/budget' },
  ];

  return (
    <div className="president-workspace min-h-screen bg-[#201609]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <PresidentWorkspaceNav active="Dashboard" />

        {/* Main Content */}
        <main className="flex-1">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">{selectedClub?.clubName || 'Club'} President Workspace</h1>
                <p className="text-yellow-100 text-sm">Welcome, President {user?.name}. You have full control of this club's activities and events.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                President
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <div className="mb-6 grid gap-5 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Upcoming Events</h2>
                  <p className="text-sm text-gray-400">Next events scheduled for this club.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/president/events?view=upcoming')}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  View all upcoming →
                </button>
              </div>
              {loadingEvents ? (
                <div className="py-10 text-center text-sm text-gray-400">Loading events...</div>
              ) : (
                renderEventPreview(upcomingEvents, 'No upcoming events.')
              )}
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Completed Events</h2>
                  <p className="text-sm text-gray-400">Past events for reporting and reference.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/president/events?view=completed')}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  View all completed →
                </button>
              </div>
              {loadingEvents ? (
                <div className="py-10 text-center text-sm text-gray-400">Loading events...</div>
              ) : (
                renderEventPreview(completedEvents, 'No completed events yet.')
              )}
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
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Committee</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{committeeCount}</p>
                <p className="mt-1 text-xs text-gray-500">active committee member{committeeCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Needs Assignment</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{unassignedUpcomingCount}</p>
                <p className="mt-1 text-xs text-gray-500">upcoming event{unassignedUpcomingCount !== 1 ? 's' : ''} without committee</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Next Event</p>
                <p className="mt-2 truncate text-sm font-bold text-gray-900">{nextEvent?.title || 'None scheduled'}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {nextEvent ? new Date(nextEvent.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Create one in Events'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Completed</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{completedEvents.length}</p>
                <p className="mt-1 text-xs text-gray-500">past event{completedEvents.length !== 1 ? 's' : ''} recorded</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
