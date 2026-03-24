import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Event {
  _id: string;
  title: string;
  date: string;
  location?: string;
  category: string;
  capacity?: number;
}

export default function UserDashboard() {
  const { user, selectedClub } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/events?clubId=${selectedClub.clubId}`)
      .then(res => setEvents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            <nav className="space-y-1">
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm">
                🏠 Dashboard
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition">
                🎟️ My RSVP'd Events
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition">
                👤 My Profile
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name}! 👋</h1>
                <p className="text-blue-100 text-sm">{selectedClub?.clubName} — here's what's coming up.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Member
              </span>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Events</h2>
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-500 font-medium">No upcoming events</p>
                <p className="text-gray-400 text-sm mt-1">Check back later for published events from your club.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {events.map(event => {
                  const dateStr = new Date(event.date).toLocaleDateString('en-AU', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  });
                  return (
                    <div key={event._id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{event.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          📅 {dateStr}{event.location ? ` · 📍 ${event.location}` : ''}
                          {event.capacity ? ` · 👥 ${event.capacity} capacity` : ''}
                        </p>
                      </div>
                      <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium">
                        RSVP
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My RSVP'd Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">My RSVP'd Events</h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-3">🎟️</div>
              <p className="text-gray-500 font-medium">No RSVPs yet</p>
              <p className="text-gray-400 text-sm mt-1">Events you register for will appear here.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
