import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

type Role = 'user' | 'committee' | 'president';

interface Member {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  role: Role;
  createdAt: string;
}

const ROLE_BADGE: Record<Role, string> = {
  president: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  committee: 'bg-purple-100 text-purple-800 border border-purple-300',
  user:      'bg-blue-100 text-blue-800 border border-blue-300',
};

const ROLE_AVATAR: Record<Role, string> = {
  president: 'bg-yellow-500 text-white',
  committee: 'bg-purple-600 text-white',
  user:      'bg-blue-600 text-white',
};

const ROLE_LABELS: Record<Role, string> = {
  president: 'President',
  committee: 'Committee',
  user:      'Member',
};

export default function MembersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPresident = user?.role === 'president';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const sidebarLinks = isPresident
    ? [
        { icon: '🏠', label: 'Dashboard',    path: '/president/dashboard' },
        { icon: '📅', label: 'Events',       path: '#' },
        { icon: '✅', label: 'Tasks',        path: '#' },
        { icon: '💰', label: 'Budget',       path: '#' },
        { icon: '👥', label: 'Members',      path: '/president/members', active: true },
        { icon: '🗂️', label: 'Safety Files', path: '#' },
      ]
    : [
        { icon: '🏠', label: 'Dashboard', path: '/committee/dashboard' },
        { icon: '📅', label: 'Events',    path: '#' },
        { icon: '✅', label: 'Tasks',     path: '#' },
        { icon: '👥', label: 'Members',   path: '/committee/members', active: true },
      ];

  useEffect(() => {
    api.get('/members')
      .then(res => setMembers(res.data))
      .catch(() => setError('Failed to load members.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(memberId: string, newRole: Role) {
    setUpdatingId(memberId);
    try {
      const res = await api.patch(`/members/${memberId}/role`, { role: newRole });
      setMembers(prev => prev.map(m => m._id === memberId ? res.data : m));
    } catch {
      setError('Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from the club?`)) return;
    try {
      await api.delete(`/members/${memberId}`);
      setMembers(prev => prev.filter(m => m._id !== memberId));
    } catch {
      setError('Failed to remove member.');
    }
  }

  const filtered = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                        m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const count = (role: Role) => members.filter(m => m.role === role).length;

  const stats = [
    { label: 'Total Members',     value: members.length,    icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { label: 'Presidents',        value: count('president'), icon: '👑', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Committee Members', value: count('committee'), icon: '🎖️', color: 'bg-purple-50 text-purple-700' },
    { label: 'Regular Members',   value: count('user'),      icon: '🙋', color: 'bg-green-50 text-green-700' },
  ];

  const bannerClass = isPresident
    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
    : 'bg-gradient-to-r from-purple-600 to-indigo-700';

  const activeSidebarClass = isPresident
    ? 'bg-yellow-50 text-yellow-800 font-medium'
    : 'bg-purple-50 text-purple-700 font-medium';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">

        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            <nav className="space-y-1">
              {sidebarLinks.map(link => (
                <a
                  key={link.label}
                  href={link.path}
                  onClick={link.path !== '#' ? (e) => { e.preventDefault(); navigate(link.path); } : undefined}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                    link.active ? activeSidebarClass : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.icon} {link.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">

          {/* Banner */}
          <div className={`${bannerClass} rounded-xl p-6 text-white mb-6 shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {isPresident ? '👥 Manage Members' : '👥 Club Members'}
                </h1>
                <p className="text-sm opacity-90">
                  {isPresident
                    ? 'View all members, manage roles, and maintain your team.'
                    : 'View all club members and their roles.'}
                </p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {isPresident ? 'President' : 'Committee'}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
              {error}
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">✕</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${s.color}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Members List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <h2 className="text-lg font-semibold text-gray-800 shrink-0">All Members</h2>
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                <select
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value as Role | 'all')}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-600"
                >
                  <option value="all">All Roles</option>
                  <option value="president">President</option>
                  <option value="committee">Committee</option>
                  <option value="user">Member</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="text-4xl mb-3 animate-pulse">👥</div>
                <p className="text-sm">Loading members...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-gray-500 font-medium">No members found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {search || filterRole !== 'all'
                    ? 'Try adjusting your search or filter.'
                    : 'No members have registered yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map(member => (
                  <div
                    key={member._id}
                    className="flex items-center gap-4 py-4 hover:bg-gray-50 rounded-lg px-2 transition"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${ROLE_AVATAR[member.role]}`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 text-sm">{member.name}</p>
                        {member._id === user?.id && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[member.role]}`}>
                          {ROLE_LABELS[member.role]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{member.email}</p>
                      {member.studentId && (
                        <p className="text-xs text-gray-400 mt-0.5">ID: {member.studentId}</p>
                      )}
                    </div>

                    {/* Joined date */}
                    <div className="hidden sm:block text-right shrink-0">
                      <p className="text-xs text-gray-400">Joined</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(member.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* President actions */}
                    {isPresident && member._id !== user?.id && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={member.role}
                          disabled={updatingId === member._id}
                          onChange={e => handleRoleChange(member._id, e.target.value as Role)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                        >
                          <option value="user">Member</option>
                          <option value="committee">Committee</option>
                          <option value="president">President</option>
                        </select>
                        <button
                          onClick={() => handleRemove(member._id, member.name)}
                          className="text-gray-300 hover:text-red-500 transition text-sm px-1"
                          title="Remove member"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
