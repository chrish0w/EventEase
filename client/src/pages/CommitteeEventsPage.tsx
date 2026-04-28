import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
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
  assignedCommittee: AssignedMember[];
  createdBy: { _id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const ROLE_STYLES: Record<string, string> = {
  finance: 'bg-yellow-100 text-yellow-700',
  logistics: 'bg-blue-100 text-blue-700',
  equipment: 'bg-purple-100 text-purple-700',
  transport: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
};

const ROLE_ICONS: Record<string, string> = {
  finance: '💰',
  logistics: '📦',
  equipment: '🔧',
  transport: '🚗',
  general: '📋',
};

function RolePanel({ role, event }: { role: string; event: Event }) {
  if (role === 'finance') {
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">💰</span>
          <h4 className="text-sm font-semibold text-gray-700">Budget Tracking</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Estimated Budget', value: '$0.00', color: 'text-blue-600' },
            { label: 'Spent', value: '$0.00', color: 'text-red-600' },
            { label: 'Remaining', value: '$0.00', color: 'text-green-600' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full text-sm text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition">
          + Add Budget Item
        </button>
      </div>
    );
  }

  if (role === 'logistics') {
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📦</span>
          <h4 className="text-sm font-semibold text-gray-700">Logistics Checklist</h4>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">No logistics items added yet.</p>
          <button className="mt-2 text-sm text-blue-600 hover:underline">+ Add Item</button>
        </div>
      </div>
    );
  }

  if (role === 'equipment') {
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🔧</span>
          <h4 className="text-sm font-semibold text-gray-700">Equipment List</h4>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">No equipment items listed yet.</p>
          <button className="mt-2 text-sm text-blue-600 hover:underline">+ Add Equipment</button>
        </div>
      </div>
    );
  }

  if (role === 'transport') {
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🚗</span>
          <h4 className="text-sm font-semibold text-gray-700">Transport Arrangements</h4>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">No transport details added yet.</p>
          <button className="mt-2 text-sm text-blue-600 hover:underline">+ Add Route</button>
        </div>
      </div>
    );
  }

  // general
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">📋</span>
        <h4 className="text-sm font-semibold text-gray-700">Event Notes</h4>
      </div>
      <p className="text-sm text-gray-400">
        {event.description || 'No additional notes for this event.'}
      </p>
    </div>
  );
}

function EventCard({ event, myRole }: { event: Event; myRole: string }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-800">{event.title}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
              {event.status}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLES[myRole]}`}>
              {ROLE_ICONS[myRole]} {myRole.charAt(0).toUpperCase() + myRole.slice(1)}
            </span>
            {event.requiresSafetyDisclaimer && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                ⚠️ Safety Required
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>📅 {dateStr}</span>
            {event.location && <span>📍 {event.location}</span>}
            {event.capacity && <span>👥 {event.capacity} capacity</span>}
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-4 text-gray-400 hover:text-gray-600 transition text-lg"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && <RolePanel role={myRole} event={event} />}
    </div>
  );
}

export default function CommitteeEventsPage() {
  const { user, selectedClub } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then(res => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const getMyRole = (event: Event): string => {
    const assignment = event.assignedCommittee.find(a => a.userId._id === user?.id);
    return assignment?.role ?? 'general';
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
              <a
                href="#"
                onClick={e => { e.preventDefault(); navigate('/committee/dashboard'); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition"
              >
                🏠 Dashboard
              </a>
              <a
                href="#"
                onClick={e => e.preventDefault()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-medium text-sm"
              >
                📅 Events
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition">
                ✅ Tasks
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition">
                👥 Members
              </a>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-800">Club Events</h1>
            <p className="text-sm text-gray-500 mt-0.5">All events for your club.</p>
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
            <div className="space-y-4">
              {events.map(event => (
                <EventCard key={event._id} event={event} myRole={getMyRole(event)} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
