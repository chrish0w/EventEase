import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface Club {
  _id: string;
  name: string;
  description?: string;
  createdBy: { name: string };
  createdAt: string;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

export default function AdminDashboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([api.get('/clubs'), api.get('/auth/users')])
      .then(([clubsRes, usersRes]) => {
        setClubs(clubsRes.data);
        setUsers(usersRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/clubs', form);
      setClubs(prev => [...prev, data]);
      setForm({ name: '', description: '' });
      setShowCreate(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to create club');
    }
  };

  const handleAssignPresident = async (clubId: string) => {
    const userId = assignMap[clubId];
    if (!userId) return alert('Please select a user first');
    try {
      await api.post(`/clubs/${clubId}/assign-president`, { userId });
      alert('President assigned successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to assign president');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white mb-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
              <p className="text-gray-300 text-sm">Manage clubs and assign presidents.</p>
            </div>
            <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Admin
            </span>
          </div>
        </div>

        {/* Clubs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">Clubs ({clubs.length})</h2>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showCreate ? 'Cancel' : '+ New Club'}
            </button>
          </div>

          {/* Create Club Form */}
          {showCreate && (
            <form onSubmit={handleCreateClub} className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Create New Club</h3>
              <input
                required
                placeholder="Club name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Create Club
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🏫</div>
              <p className="text-gray-500 font-medium">No clubs yet</p>
              <p className="text-gray-400 text-sm mt-1">Create the first club above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clubs.map(club => (
                <div key={club._id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{club.name}</p>
                      {club.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{club.description}</p>
                      )}
                    </div>
                  </div>
                  {/* Assign President */}
                  <div className="mt-3 flex gap-2 items-center">
                    <select
                      value={assignMap[club._id] || ''}
                      onChange={e => setAssignMap(p => ({ ...p, [club._id]: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Assign President...</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignPresident(club._id)}
                      className="text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition font-medium"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
