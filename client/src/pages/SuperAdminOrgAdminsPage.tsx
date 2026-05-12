import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  orgId?: string | null;
}

interface Organisation {
  _id: string;
  name: string;
}

export default function SuperAdminOrgAdminsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteOrgMap, setPromoteOrgMap] = useState<Record<string, string>>({});

  const fetchData = () => {
    Promise.all([
      api.get('/super-admin/users'),
      api.get('/super-admin/organisations'),
    ]).then(([usersRes, orgsRes]) => {
      setUsers(usersRes.data);
      setOrgs(orgsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssignOrgAdmin = async (userId: string) => {
    const orgId = promoteOrgMap[userId];
    if (!orgId) return alert('Please select an organisation first');
    try {
      await api.put(`/super-admin/users/${userId}/assign-org-admin`, { orgId });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to assign org admin');
    }
  };

  const handleRemoveOrgAdmin = async (userId: string) => {
    try {
      await api.put(`/super-admin/users/${userId}/remove-org-admin`);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to remove org admin');
    }
  };

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  const orgNameById = (id?: string | null) => orgs.find(o => o._id === id?.toString())?.name || 'Unknown';

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
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Org Admins ({admins.length})</h2>
              {admins.length === 0 ? (
                <p className="text-sm text-gray-400">No org admins yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {admins.map(u => (
                    <div key={u._id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        <p className="text-xs text-purple-500 mt-0.5">Org: {orgNameById(u.orgId?.toString())}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveOrgAdmin(u._id)}
                        className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Assign Org Admin</h2>
              {regularUsers.length === 0 ? (
                <p className="text-sm text-gray-400">No users available.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {regularUsers.map(u => (
                    <div key={u._id} className="py-3">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <select
                          value={promoteOrgMap[u._id] || ''}
                          onChange={e => setPromoteOrgMap(p => ({ ...p, [u._id]: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select organisation...</option>
                          {orgs.map(o => (
                            <option key={o._id} value={o._id}>{o.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignOrgAdmin(u._id)}
                          className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition whitespace-nowrap"
                        >
                          Assign as Org Admin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
