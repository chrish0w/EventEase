import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface Organisation {
  _id: string;
  name: string;
  description?: string;
  createdBy: { name: string };
}

export default function SuperAdminOrgsPage() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const fetchOrgs = () => {
    api.get('/super-admin/organisations')
      .then(res => setOrgs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/super-admin/organisations', form);
      setForm({ name: '', description: '' });
      setShowCreate(false);
      fetchOrgs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to create');
    }
  };

  const handleEdit = async (id: string) => {
    try {
      await api.put(`/super-admin/organisations/${id}`, editForm);
      setEditingId(null);
      fetchOrgs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This also removes all clubs and admin assignments.`)) return;
    try {
      await api.delete(`/super-admin/organisations/${id}`);
      fetchOrgs();
    } catch {
      alert('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Organisation Management</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">All Organisations ({orgs.length})</h2>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              {showCreate ? 'Cancel' : '+ New Organisation'}
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Create Organisation</h3>
              <input
                required
                placeholder="Organisation name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button type="submit" className="bg-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-purple-700 transition">
                Create
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No organisations yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orgs.map(org => (
                <div key={org._id} className="py-4">
                  {editingId === org._id ? (
                    <div className="space-y-2">
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        value={editForm.description}
                        onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Description"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(org._id)} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{org.name}</p>
                        {org.description && <p className="text-xs text-gray-400 mt-0.5">{org.description}</p>}
                        <p className="text-xs text-gray-300 mt-0.5">Created by {org.createdBy?.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingId(org._id); setEditForm({ name: org.name, description: org.description || '' }); }}
                          className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(org._id, org.name)}
                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
