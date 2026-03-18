import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Membership {
  _id: string;
  clubId: { _id: string; name: string; description?: string };
  role: 'president' | 'committee' | 'user';
  committeeRole?: string;
}

const ROLE_STYLES: Record<string, string> = {
  president: 'bg-yellow-100 text-yellow-700',
  committee: 'bg-purple-100 text-purple-700',
  user: 'bg-blue-100 text-blue-700',
};

const ROLE_LABELS: Record<string, string> = {
  president: 'President',
  committee: 'Committee',
  user: 'Member',
};

export default function ClubSelectPage() {
  const { user, selectClub, logout } = useAuth();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/clubs/my')
      .then(res => setMemberships(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (m: Membership) => {
    selectClub({
      clubId: m.clubId._id,
      clubName: m.clubId.name,
      role: m.role,
      committeeRole: m.committeeRole,
    });
    if (m.role === 'president') navigate('/president/dashboard');
    else if (m.role === 'committee') navigate('/committee/dashboard');
    else navigate('/user/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">EventEase</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}!</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400">Loading your clubs...</div>
        ) : memberships.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">🏫</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">You haven't joined any clubs yet</h2>
            <p className="text-gray-400 text-sm mb-6">Browse clubs and apply to join one to get started.</p>
            <button
              onClick={() => navigate('/clubs/join')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Browse Clubs
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Select a Club to Continue</h2>
            {memberships.map(m => (
              <button
                key={m._id}
                onClick={() => handleSelect(m)}
                className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-left hover:border-blue-300 hover:shadow-md transition group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition">
                      {m.clubId.name}
                    </p>
                    {m.clubId.description && (
                      <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{m.clubId.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_STYLES[m.role]}`}>
                    {ROLE_LABELS[m.role]}
                    {m.committeeRole ? ` · ${m.committeeRole}` : ''}
                  </span>
                </div>
              </button>
            ))}
            <button
              onClick={() => navigate('/clubs/join')}
              className="w-full text-sm text-blue-600 hover:underline text-center pt-2"
            >
              + Join another club
            </button>
          </div>
        )}

        <button
          onClick={logout}
          className="mt-8 w-full text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
