import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PresidentWorkspaceNav from '../components/PresidentWorkspaceNav';
import DisclaimerMarkdown from '../components/DisclaimerMarkdown';
import PdfPreview from '../components/PdfPreview';
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
  disclaimerTitle?: string | null;
  disclaimerContent?: string | null;
  disclaimerType?: 'text' | 'pdf';
  disclaimerFileUrl?: string | null;
  assignedCommittee: AssignedMember[];
  createdBy: { _id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function PresidentEventsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDisclaimer, setViewingDisclaimer] = useState<Event | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

  const { selectedClub } = useAuth();

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then(res => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const handleDelete = async (event: Event) => {
    try {
      await api.delete(`/events/${event._id}`);
      setEvents(prev => prev.filter(e => e._id !== event._id));
      setExpandedEventId(null);
      setDeleteTarget(null);
    } catch {
      alert('Failed to delete event.');
    }
  };

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

  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId) setExpandedEventId(eventId);
  }, [searchParams]);

  const renderEventCard = (event: Event) => {
    const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    return (
      <div
        key={event._id}
        className={`overflow-hidden rounded-xl bg-white shadow-sm transition ${
          expandedEventId === event._id
            ? 'border border-yellow-300 ring-1 ring-yellow-200'
            : 'border border-gray-100 hover:border-yellow-200 hover:shadow-md'
        }`}
      >
        <button
          type="button"
          onClick={() => setExpandedEventId(prev => prev === event._id ? null : event._id)}
          className="w-full bg-transparent p-5 text-left focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">📌</span>
                <h3 className="text-base font-semibold text-gray-800">{event.title}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
                  {event.status}
                </span>
                {event.requiresSafetyDisclaimer && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setViewingDisclaimer(event); }}
                    className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
                  >
                    ⚠️ Safety
                  </button>
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
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{event.description}</p>
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
            <span className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-800">
              View details
            </span>
          </div>
        </button>
        {expandedEventId === event._id && (
          <div className="border-t border-gray-100 bg-white px-5 pb-5 pt-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Event details</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                  {event.description || 'No description provided.'}
                </p>
                {event.assignedCommittee.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.assignedCommittee.map((assignment, index) => (
                      <span key={index} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {assignment.userId.name}{assignment.role ? ` · ${assignment.role}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <aside className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-gray-400">Category</p>
                    <p className="font-semibold text-gray-800">{event.category || 'Event'}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-gray-400">Capacity</p>
                    <p className="font-semibold text-gray-800">{event.capacity || 'Not set'}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <button onClick={() => navigate(`/president/events/${event._id}/workspaces`)} className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700">
                    View Workspaces
                  </button>
                  <button onClick={() => navigate(`/president/events/${event._id}/edit`)} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                    Edit Event
                  </button>
                  <button onClick={() => setDeleteTarget(event)} className="w-full rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100">
                    Delete Event
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    );
  };

  const sections = searchParams.get('view') === 'completed'
    ? [
        { key: 'completed', title: 'Completed Events', subtitle: 'Past events for reporting and follow-up.', items: completedEvents },
        { key: 'upcoming', title: 'Upcoming Events', subtitle: 'Scheduled events still ahead.', items: upcomingEvents },
      ]
    : [
        { key: 'upcoming', title: 'Upcoming Events', subtitle: 'Scheduled events still ahead.', items: upcomingEvents },
        { key: 'completed', title: 'Completed Events', subtitle: 'Past events for reporting and follow-up.', items: completedEvents },
      ];

  return (
    <div className="president-workspace min-h-screen bg-[#201609]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <PresidentWorkspaceNav active="Events" />

        {/* Main */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">All Events</h1>
              <p className="text-sm text-yellow-100/80 mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} total</p>
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
            <div className="grid gap-6">
              {sections.map(section => (
                <section key={section.key} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                      <p className="mt-1 text-sm text-yellow-100/70">{section.subtitle}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                      {section.items.length}
                    </span>
                  </div>
                  {section.items.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center">
                      <p className="text-sm font-medium text-gray-500">
                        {section.key === 'upcoming' ? 'No upcoming events.' : 'No completed events yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="h-[28rem] space-y-3 overflow-y-auto pr-2">
                      {section.items.map(renderEventCard)}
                    </div>
                  )}
                </section>
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

      {deleteTarget && (
        <div className="!fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Delete this event?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will remove "{deleteTarget.title}" and its event workspaces. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteTarget)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
