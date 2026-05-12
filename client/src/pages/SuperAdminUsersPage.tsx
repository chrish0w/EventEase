import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  orgName?: string | null;
  status?: string;
  memberships: { clubName: string; role: string; committeeRole?: string }[];
}

export default function SuperAdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    api.get('/super-admin/users').then(res => setUsers(res.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return users.filter(user => {
      const roleText = describeUserRole(user).toLowerCase();
      const matchesSearch = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || roleText.includes(query);
      const matchesRole = roleFilter === 'all'
        || (roleFilter === 'org_admin' && user.role === 'admin')
        || (roleFilter === 'pending' && user.status === 'pending_invite')
        || (roleFilter === 'member' && user.memberships.some(m => m.role === 'user'))
        || user.memberships.some(m => m.role === roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Users & Roles</h1>
        </div>
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <h2 className="text-lg font-semibold text-gray-800">All Users ({filtered.length})</h2>
            <div className="flex gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, role, club" className="form-input md:w-72" />
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="form-input md:w-44">
                <option value="all">All roles</option>
                <option value="org_admin">Org admin</option>
                <option value="president">President</option>
                <option value="committee">Committee</option>
                <option value="member">Member</option>
                <option value="pending">Pending invite</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map(user => (
              <div key={user._id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <p className="text-sm text-gray-600 text-right max-w-xl">{describeUserRole(user)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function describeUserRole(user: User) {
  const roles: string[] = [];
  if (user.status === 'pending_invite') roles.push('Pending invite');
  if (user.role === 'admin') roles.push(`Org admin${user.orgName ? ` at ${user.orgName}` : ''}`);
  user.memberships.forEach(membership => {
    if (membership.role === 'president') roles.push(`President of ${membership.clubName}`);
    else if (membership.role === 'committee') roles.push(`Committee${membership.committeeRole ? ` (${membership.committeeRole})` : ''} of ${membership.clubName}`);
    else roles.push(`Member of ${membership.clubName}`);
  });
  return roles.length ? roles.join(' · ') : 'No club role';
}
