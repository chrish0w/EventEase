import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Member {
  _id: string;
  userId: { _id: string; name: string; email: string; studentId?: string };
  role: 'president' | 'committee' | 'user';
  committeeRole?: string;
}

const COMMITTEE_ROLES = [
  { value: 'finance', label: 'Finance' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'transport', label: 'Transport' },
  { value: 'general', label: 'General' },
];

const ROLE_STYLES: Record<string, string> = {
  president: 'bg-yellow-100 text-yellow-800',
  committee: 'bg-blue-100 text-blue-700',
  user: 'bg-gray-100 text-gray-600',
};

const sidebarLinks = [
  { icon: '🏠', label: 'Dashboard', path: '/president/dashboard' },
  { icon: '📅', label: 'Events', path: '/president/events' },
  { icon: '✅', label: 'Tasks', path: null },
  { icon: '💰', label: 'Budget', path: null },
  { icon: '👥', label: 'Members', path: '/president/members' },
  { icon: '🗂️', label: 'Safety Files', path: null },
];

export default function PresidentMembersPage() {
  const { selectedClub } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [localRoles, setLocalRoles] = useState<Record<string, { role: string; committeeRole: string }>>({});

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/clubs/${selectedClub.clubId}/members`)
      .then(res => {
        setMembers(res.data);
        const init: Record<string, { role: string; committeeRole: string }> = {};
        res.data.forEach((m: Member) => {
          init[m.userId._id] = { role: m.role, committeeRole: m.committeeRole || 'general' };
        });
        setLocalRoles(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const handleSave = async (userId: string) => {
    if (!selectedClub?.clubId) return;
    const { role, committeeRole } = localRoles[userId];
    setSaving(userId);
    try {
      await api.put(`/clubs/${selectedClub.clubId}/members/${userId}/role`, {
        role,
        committeeRole: role === 'committee' ? committeeRole : undefined,
      });
      setMembers(prev => prev.map(m =>
        m.userId._id === userId ? { ...m, role: role as Member['role'], committeeRole: role === 'committee' ? committeeRole : undefined } : m
      ));
    } catch {
      alert('Failed to update role.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            <nav className="space-y-1">
              {sidebarLinks.map((link) => (
                <a
                  key={link.label}
                  href="#"
                  onClick={e => { e.preventDefault(); if (link.path) navigate(link.path); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    link.label === 'Members'
                      ? 'bg-yellow-50 text-yellow-800 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.icon} {link.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Club Members</h2>

            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No members found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {members.map(member => {
                  const uid = member.userId._id;
                  const local = localRoles[uid] || { role: member.role, committeeRole: member.committeeRole || 'general' };
                  const isPresident = member.role === 'president';
                  const isDirty = local.role !== member.role || (local.role === 'committee' && local.committeeRole !== (member.committeeRole || 'general'));

                  return (
                    <div key={member._id} className="py-4 flex items-center gap-4">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800">{member.userId.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[member.role]}`}>
                            {member.role === 'committee' && member.committeeRole
                              ? `Committee · ${member.committeeRole}`
                              : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {member.userId.email}{member.userId.studentId ? ` · ${member.userId.studentId}` : ''}
                        </p>
                      </div>

                      {/* Role controls */}
                      {!isPresident ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={local.role}
                            onChange={e => setLocalRoles(prev => ({ ...prev, [uid]: { ...prev[uid], role: e.target.value } }))}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="user">Member</option>
                            <option value="committee">Committee</option>
                          </select>

                          {local.role === 'committee' && (
                            <select
                              value={local.committeeRole}
                              onChange={e => setLocalRoles(prev => ({ ...prev, [uid]: { ...prev[uid], committeeRole: e.target.value } }))}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {COMMITTEE_ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          )}

                          <button
                            onClick={() => handleSave(uid)}
                            disabled={!isDirty || saving === uid}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-40"
                          >
                            {saving === uid ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Club President</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
