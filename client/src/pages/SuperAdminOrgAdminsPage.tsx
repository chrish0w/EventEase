import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Club {
  _id: string;
  name: string;
}

export default function SuperAdminOrgAdminsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get('/super-admin/users'),
      api.get('/super-admin/clubs'),
    ]).then(([usersRes, clubsRes]) => {
      setUsers(usersRes.data);
      setClubs(clubsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await api.put(`/super-admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: res.data.role } : u));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update role');
    }
  };

  const handleAssignPresident = async (clubId: string) => {
    const userId = assignMap[clubId];
    if (!userId) return alert('Please select a user first');
    try {
      await api.post(`/super-admin/clubs/${clubId}/assign-president`, { userId });
      alert('President assigned successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to assign president');
    }
  };

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => !['admin', 'super_admin'].includes(u.role));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Org Admin Management</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Platform Admins ({admins.length})</h2>
              {admins.length === 0 ? (
                <p className="text-sm text-gray-400">No admins yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {admins.map(u => (
                    <div key={u._id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <button
                        onClick={() => handleRoleChange(u._id, 'user')}
                        className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        Remove Admin
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Promote User to Admin</h2>
              <div className="divide-y divide-gray-50">
                {regularUsers.map(u => (
                  <div key={u._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
                    </div>
                    <button
                      onClick={() => handleRoleChange(u._id, 'admin')}
                      className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition"
                    >
                      Make Admin
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Assign Club Presidents</h2>
              <div className="divide-y divide-gray-50">
                {clubs.map(club => (
                  <div key={club._id} className="py-4">
                    <p className="text-sm font-semibold text-gray-800 mb-2">{club.name}</p>
                    <div className="flex gap-2 items-center">
                      <select
                        value={assignMap[club._id] || ''}
                        onChange={e => setAssignMap(p => ({ ...p, [club._id]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select user...</option>
                        {users.map(u => (
                          <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignPresident(club._id)}
                        className="text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition font-medium"
                      >
                        Assign President
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
