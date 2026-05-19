import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CommitteeWorkspaceNav from '../components/CommitteeWorkspaceNav';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Event {
  _id: string;
  title: string;
  date: string;
  location?: string;
  status: 'draft' | 'published' | 'cancelled';
}

interface AssignedWorkspace {
  _id: string;
  name: string;
  type: string;
  description?: string;
  dueDate?: string;
  status: string;
  event?: Event | null;
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
  const [assignedWorkspaces, setAssignedWorkspaces] = useState<AssignedWorkspace[]>([]);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then(res => setEvents(res.data))
      .catch(() => {});
    api.get(`/workspaces/assigned?clubId=${selectedClub.clubId}`)
      .then(res => setAssignedWorkspaces(res.data))
      .catch(() => setAssignedWorkspaces([]));
  }, [selectedClub]);
  const roleLabel = selectedClub?.committeeRole
    ? selectedClub.committeeRole.charAt(0).toUpperCase() + selectedClub.committeeRole.slice(1) + ' Committee'
    : 'Committee';
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    return {
      upcomingEvents: events
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      pastEvents: events
        .filter(event => new Date(event.date) < now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [events]);

  const renderEventList = (items: Event[]) => (
    <div className="divide-y divide-gray-50">
      {items.slice(0, 3).map(event => {
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
  );

  return (
    <div className="committee-workspace min-h-screen bg-[#140f24]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <CommitteeWorkspaceNav active="Dashboard" />

        {/* Main Content */}
        <main className="flex-1">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">{selectedClub?.clubName || 'Club'} Committee Workspace</h1>
                <p className="text-purple-100 text-sm">Welcome, {roleLabel} {user?.name}. Manage your tasks and events from here.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Assigned Workspaces', value: String(assignedWorkspaces.length), icon: '🗂️', color: 'bg-purple-50 text-purple-700' },
              { label: 'Club Events', value: String(events.length), icon: '📅', color: 'bg-blue-50 text-blue-700' },
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

          {/* Assigned Work */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">My Assigned Work</h2>
              <button onClick={() => navigate('/committee/assigned-work')} className="text-sm text-purple-600 hover:underline font-medium">
                View Assigned Work →
              </button>
            </div>
            {assignedWorkspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-5xl mb-4">🗂️</div>
                <p className="text-gray-500 font-medium">No workspaces assigned yet</p>
                <p className="text-gray-400 text-sm mt-1">When the president assigns you to an event workspace, it will appear here.</p>
              </div>
            ) : (
              <div className="max-h-[26rem] overflow-y-auto pr-2 divide-y divide-gray-50">
                {assignedWorkspaces.map(workspace => (
                  <button
                    key={workspace._id}
                    onClick={() => navigate(`/workspaces/${workspace._id}`)}
                    className="flex w-full items-center gap-4 py-3 text-left hover:bg-purple-50/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{workspace.name}</p>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{workspace.type}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {workspace.event?.title || 'Event'}{workspace.dueDate ? ` · Due ${new Date(workspace.dueDate).toLocaleDateString('en-AU')}` : ' · No deadline set'}
                      </p>
                      {workspace.description && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{workspace.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-purple-600">Open →</span>
                  </button>
                ))}
              </div>
            )}
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
              <div className="max-h-[28rem] overflow-y-auto pr-2 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Upcoming Events</h3>
                    <span className="text-xs font-semibold text-gray-400">{upcomingEvents.length}</span>
                  </div>
                  {upcomingEvents.length > 0 ? renderEventList(upcomingEvents) : <p className="py-3 text-sm text-gray-400">No upcoming events.</p>}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700">Past Events</h3>
                    <span className="text-xs font-semibold text-gray-400">{pastEvents.length}</span>
                  </div>
                  {pastEvents.length > 0 ? renderEventList(pastEvents) : <p className="py-3 text-sm text-gray-400">No past events.</p>}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
