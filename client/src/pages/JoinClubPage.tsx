import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface Club {
  _id: string;
  name: string;
  description?: string;
}

export default function JoinClubPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/clubs')
      .then(res => setClubs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRequest = async (clubId: string) => {
    try {
      await api.post(`/clubs/${clubId}/request`, { message: message[clubId] || '' });
      setRequested(prev => new Set(prev).add(clubId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to send request');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/club-select')} className="text-gray-500 hover:text-gray-700 transition">
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Browse Clubs</h1>
            <p className="text-sm text-gray-400">Apply to join a club — the President will review your request.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading clubs...</div>
        ) : clubs.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No clubs available yet.</div>
        ) : (
          <div className="space-y-4">
            {clubs.map(club => (
              <div key={club._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-base font-semibold text-gray-800">{club.name}</h3>
                {club.description && (
                  <p className="text-sm text-gray-400 mt-1">{club.description}</p>
                )}
                {requested.has(club._id) ? (
                  <p className="mt-3 text-sm text-green-600 font-medium">✓ Request sent — waiting for approval</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Optional message to the President..."
                      value={message[club._id] || ''}
                      onChange={e => setMessage(prev => ({ ...prev, [club._id]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleRequest(club._id)}
                      className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Apply to Join
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
