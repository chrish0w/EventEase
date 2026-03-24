import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar, { PresidentNav } from '../components/Navbar';
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

const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social',
  sports: 'Sports',
  outdoor: 'Outdoor',
  finance: 'Finance',
  other: 'Other',
};

export default function PresidentEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedClub } = useAuth();

  useEffect(() => {
    if (!selectedClub?.clubId) {
      setLoading(false);
      return;
    }

    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then((res) => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((event) => event._id !== id));
    } catch {
      alert('Failed to delete event.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <PresidentNav active="events" />

        <main className="flex-1">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">All Events</h1>
              <p className="mt-0.5 text-sm text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''} total</p>
            </div>
            <button
              onClick={() => navigate('/president/events/create')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              + Create New Event
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="mb-4 text-5xl">Events</div>
              <p className="font-medium text-gray-500">No events yet</p>
              <p className="mt-1 text-sm text-gray-400">Create your first event to get started.</p>
              <button
                onClick={() => navigate('/president/events/create')}
                className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Create New Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={event._id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                            {CATEGORY_LABELS[event.category] ?? 'Other'}
                          </span>
                          <h3 className="text-base font-semibold text-gray-800">{event.title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status]}`}>
                            {event.status}
                          </span>
                          {event.requiresSafetyDisclaimer && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                              Safety
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span>{dateStr}</span>
                          {event.location && <span>{event.location}</span>}
                          {event.capacity && <span>Capacity: {event.capacity}</span>}
                          {event.assignedCommittee.length > 0 && (
                            <span>{event.assignedCommittee.length} committee assigned</span>
                          )}
                        </div>
                        {event.description && (
                          <p className="mt-2 line-clamp-1 text-sm text-gray-400">{event.description}</p>
                        )}
                        {event.assignedCommittee.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {event.assignedCommittee.map((assignment, index) => (
                              <span key={index} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {assignment.userId.name} | {assignment.role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <button
                          onClick={() => navigate(`/president/events/${event._id}/edit`)}
                          className="text-xs text-blue-500 transition hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event._id)}
                          className="text-xs text-red-400 transition hover:text-red-600"
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
