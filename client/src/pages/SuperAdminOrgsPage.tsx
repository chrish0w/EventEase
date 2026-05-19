import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface OrgAdmin {
  _id: string;
  name: string;
  email: string;
}

interface Organisation {
  _id: string;
  name: string;
  description?: string;
  admins: OrgAdmin[];
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  orgName?: string | null;
  memberships: { clubName: string; role: string; committeeRole?: string }[];
}

export default function SuperAdminOrgsPage() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [assignEmail, setAssignEmail] = useState<Record<string, string>>({});
  const [editingAdminOrgId, setEditingAdminOrgId] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/super-admin/organisations'),
      api.get('/super-admin/users'),
    ]).then(([orgsRes, usersRes]) => {
      setOrgs(orgsRes.data);
      setUsers(usersRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = async (id: string) => {
    try {
      await api.put(`/super-admin/organisations/${id}`, editForm);
      setEditingId(null);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update organisation');
    }
  };

  const handleAssignAdmin = async (orgId: string) => {
    const email = assignEmail[orgId]?.trim();
    if (!email) return alert('Enter a user email address first.');
    try {
      await api.put(`/super-admin/organisations/${orgId}/assign-admin-by-email`, { email });
      setAssignEmail(prev => ({ ...prev, [orgId]: '' }));
      setEditingAdminOrgId(null);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to assign org admin');
    }
  };

  const handleRemoveAdmin = async (orgId: string, userId: string) => {
    if (!confirm('Remove this organisation admin?')) return;
    try {
      await api.put(`/super-admin/organisations/${orgId}/remove-admin/${userId}`);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to remove org admin');
    }
  };

  return (
    <div className="super-admin-workspace min-h-screen bg-[#130c24]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-purple-100/80 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-white">Organisation Management</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-5">Universities ({orgs.length})</h2>
              <div className="max-h-[72vh] overflow-y-auto pr-2 divide-y divide-gray-100">
                {orgs.map(org => (
                  <div key={org._id} className="py-5">
                    {editingId === org._id ? (
                      <div className="space-y-2">
                        <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="form-input" />
                        <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="form-input" />
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(org._id)} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{org.name}</p>
                              {org.description && <p className="text-xs text-gray-400 mt-0.5">{org.description}</p>}
                            </div>
                            <button
                              onClick={() => { setEditingId(org._id); setEditForm({ name: org.name, description: org.description || '' }); }}
                              className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Organisation Admin</p>
                          <OrgAdminAssignment
                            admin={org.admins[0] || null}
                            extraAdmins={org.admins.slice(1)}
                            isEditing={editingAdminOrgId === org._id}
                            query={assignEmail[org._id] || ''}
                            users={users}
                            onEdit={() => setEditingAdminOrgId(org._id)}
                            onCancel={() => { setEditingAdminOrgId(null); setAssignEmail(prev => ({ ...prev, [org._id]: '' })); }}
                            onQueryChange={value => setAssignEmail(prev => ({ ...prev, [org._id]: value }))}
                            onSelect={user => setAssignEmail(prev => ({ ...prev, [org._id]: user.email }))}
                            onAssign={() => handleAssignAdmin(org._id)}
                            onRemove={adminId => handleRemoveAdmin(org._id, adminId)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}

function OrgAdminAssignment({
  admin,
  extraAdmins,
  isEditing,
  query,
  users,
  onEdit,
  onCancel,
  onQueryChange,
  onSelect,
  onAssign,
  onRemove,
}: {
  admin: OrgAdmin | null;
  extraAdmins: OrgAdmin[];
  isEditing: boolean;
  query: string;
  users: User[];
  onEdit: () => void;
  onCancel: () => void;
  onQueryChange: (value: string) => void;
  onSelect: (user: User) => void;
  onAssign: () => void;
  onRemove: (adminId: string) => void;
}) {
  if (admin && !isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
          <div>
            <p className="text-sm font-medium text-gray-800">{admin.name}</p>
            <p className="text-xs text-gray-500">{admin.email}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-xs bg-white text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100">Edit</button>
            <button onClick={() => onRemove(admin._id)} className="text-xs text-red-600 hover:underline">Remove</button>
          </div>
        </div>
        {extraAdmins.map(extra => (
          <div key={extra._id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{extra.name}</p>
              <p className="text-xs text-gray-400">{extra.email}</p>
            </div>
            <button onClick={() => onRemove(extra._id)} className="text-xs text-red-600 hover:underline">Remove</button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {admin && (
        <p className="text-xs text-gray-500 mb-2">
          Current org admin: <span className="font-medium text-gray-700">{admin.name}</span> ({admin.email})
        </p>
      )}
      {!admin && <p className="text-sm text-gray-400 mb-3">No org admin assigned.</p>}
      <EmailUserPicker
        query={query}
        users={users}
        placeholder="Search user email to assign admin"
        actionLabel="Add Admin"
        buttonClassName="bg-purple-600 hover:bg-purple-700"
        onQueryChange={onQueryChange}
        onSelect={onSelect}
        onAction={onAssign}
      />
      {admin && (
        <button onClick={onCancel} className="mt-2 text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      )}
    </div>
  );
}

function EmailUserPicker({
  query,
  users,
  placeholder,
  actionLabel,
  buttonClassName,
  onQueryChange,
  onSelect,
  onAction,
}: {
  query: string;
  users: User[];
  placeholder: string;
  actionLabel: string;
  buttonClassName: string;
  onQueryChange: (value: string) => void;
  onSelect: (user: User) => void;
  onAction: () => void;
}) {
  const trimmed = query.trim().toLowerCase();
  const suggestions = trimmed
    ? users
      .filter(user => user.email.toLowerCase().includes(trimmed) || user.name.toLowerCase().includes(trimmed))
      .slice(0, 5)
    : [];

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="email"
          placeholder={placeholder}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          className="form-input"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            {suggestions.map(user => (
              <button
                key={user._id}
                type="button"
                onClick={() => onSelect(user)}
                className="block w-full text-left px-3 py-2 hover:bg-purple-50"
              >
                <p className="text-sm font-medium text-gray-800">{user.email}</p>
                <p className="text-xs text-gray-400">{user.name} · {describeUserRole(user)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onAction} className={`text-sm text-white px-4 py-2 rounded-lg whitespace-nowrap ${buttonClassName}`}>
        {actionLabel}
      </button>
    </div>
  );
}

function describeUserRole(user: User) {
  const roles: string[] = [];
  if (user.role === 'admin') roles.push(`Org admin${user.orgName ? ` at ${user.orgName}` : ''}`);
  user.memberships.forEach(membership => {
    if (membership.role === 'president') roles.push(`President of ${membership.clubName}`);
    else if (membership.role === 'committee') roles.push(`Committee${membership.committeeRole ? ` (${membership.committeeRole})` : ''} of ${membership.clubName}`);
    else roles.push(`Member of ${membership.clubName}`);
  });
  return roles.length ? roles.join(' · ') : 'No club role';
}
