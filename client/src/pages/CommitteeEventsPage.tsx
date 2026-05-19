import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CommitteeWorkspaceNav from '../components/CommitteeWorkspaceNav';
import DisclaimerMarkdown from '../components/DisclaimerMarkdown';
import PdfPreview from '../components/PdfPreview';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface AssignedMember {
  userId: { _id: string; name: string; email: string };
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
  rsvpDeadline?: string;
  requiresSafetyDisclaimer: boolean;
  disclaimerTitle?: string | null;
  disclaimerContent?: string | null;
  disclaimerType?: 'text' | 'pdf';
  disclaimerFileUrl?: string | null;
  assignedCommittee: AssignedMember[];
  createdBy: { _id: string; name: string };
}

interface AssignedWorkspace {
  _id: string;
  event?: { _id: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

function EventCard({ event, myRole, hasAssignedWork, onOpenWorkspaces, onViewDisclaimer }: { event: Event; myRole: string; hasAssignedWork: boolean; onOpenWorkspaces: () => void; onViewDisclaimer: (e: Event) => void }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <article className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${expanded ? 'border-purple-200 ring-1 ring-purple-100' : 'border-gray-100 hover:border-purple-200 hover:shadow-md'}`}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full p-5 text-left focus:outline-none"
      >
      <div className="flex items-start justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-800">{event.title}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
              {event.status}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {myRole || 'General'}
            </span>
            {event.requiresSafetyDisclaimer && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onViewDisclaimer(event); }}
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
              >
                ⚠️ Safety Required
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>📅 {dateStr}</span>
            {event.location && <span>📍 {event.location}</span>}
            {event.capacity && <span>👥 {event.capacity} capacity</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {hasAssignedWork && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onOpenWorkspaces(); }}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
            >
              View assigned work for this event
            </button>
          )}
          <span className="text-xs font-medium text-gray-400">{expanded ? 'Hide details' : 'Click card for details'}</span>
        </div>
      </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          <p className="text-sm text-gray-500 whitespace-pre-line">
            {event.description || 'No additional description for this event.'}
          </p>
          {event.assignedCommittee.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Assigned committee</p>
              <div className="flex flex-wrap gap-2">
                {event.assignedCommittee.map(assignment => (
                  <span key={`${event._id}-${assignment.userId._id}-${assignment.role}`} className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                    {assignment.userId.name} · {assignment.role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function CommitteeEventsPage() {
  const { user, selectedClub } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [assignedWorkspaces, setAssignedWorkspaces] = useState<AssignedWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDisclaimer, setViewingDisclaimer] = useState<Event | null>(null);
  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'assigned' | 'completed'>('all');

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    setLoading(true);
    Promise.all([
      api.get(`/events?clubId=${selectedClub.clubId}`),
      api.get(`/workspaces/assigned?clubId=${selectedClub.clubId}`),
    ])
      .then(([eventsRes, workspacesRes]) => {
        setEvents(eventsRes.data);
        setAssignedWorkspaces(workspacesRes.data);
      })
      .catch(() => {
        setEvents([]);
        setAssignedWorkspaces([]);
      })
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const assignedEventIds = useMemo(() => new Set(
    assignedWorkspaces.map(workspace => workspace.event?._id).filter(Boolean)
  ), [assignedWorkspaces]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const query = eventSearch.trim().toLowerCase();
    return events
      .filter(event => {
        const matchesSearch = !query || [
          event.title,
          event.description,
          event.location,
          event.category,
        ].some(value => value?.toLowerCase().includes(query));
        const matchesFilter = eventFilter === 'all'
          || (eventFilter === 'assigned' && assignedEventIds.has(event._id))
          || (eventFilter === 'completed' && new Date(event.date) < now);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [assignedEventIds, eventFilter, eventSearch, events]);

  const getMyRole = (event: Event): string => {
    const assignment = event.assignedCommittee.find(a => a.userId._id === user?.id);
    return assignment?.role ?? 'general';
  };

  return (
    <div className="committee-workspace min-h-screen bg-[#140f24]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <CommitteeWorkspaceNav active="Events" />

        {/* Main */}
        <main className="flex-1">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Club Events</h1>
            <p className="text-sm text-purple-100/80 mt-0.5">All events for your club.</p>
          </div>

          <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 md:grid-cols-[1fr_260px]">
            <input
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              placeholder="Search events, locations, categories..."
              className="rounded-lg border border-white/10 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <select
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value as 'all' | 'assigned' | 'completed')}
              className="rounded-lg border border-white/10 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="all">All events</option>
              <option value="assigned">My assigned work</option>
              <option value="completed">Completed events</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-500 font-medium">No events yet</p>
              <p className="text-gray-400 text-sm mt-1">Events created by the president will appear here.</p>
            </div>
          ) : (
            <div className="h-[70vh] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-white/10 p-3 [scrollbar-color:rgba(168,85,247,.55)_transparent] [scrollbar-width:thin]">
              {filteredEvents.length === 0 ? (
                <div className="rounded-xl bg-white p-12 text-center text-sm text-gray-400">No events match this filter.</div>
              ) : filteredEvents.map(event => (
                <EventCard
                  key={event._id}
                  event={event}
                  myRole={getMyRole(event)}
                  hasAssignedWork={assignedEventIds.has(event._id)}
                  onOpenWorkspaces={() => navigate(`/committee/events/${event._id}/workspaces`)}
                  onViewDisclaimer={setViewingDisclaimer}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {viewingDisclaimer && (
        <div
          className="!fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingDisclaimer(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  ⚠️ {viewingDisclaimer.disclaimerTitle || 'Safety Disclaimer'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  For event: {viewingDisclaimer.title}
                </p>
              </div>
              <button
                onClick={() => setViewingDisclaimer(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {viewingDisclaimer.disclaimerType === 'pdf' ? (
                <PdfPreview url={`/events/${viewingDisclaimer._id}/disclaimer-file`} />
              ) : (
                <DisclaimerMarkdown content={viewingDisclaimer.disclaimerContent ?? ''} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
