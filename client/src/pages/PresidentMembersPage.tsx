import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PresidentWorkspaceNav from '../components/PresidentWorkspaceNav';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Member {
  _id: string;
  userId: { _id: string; name: string; email: string; studentId?: string };
  role: 'president' | 'committee' | 'user';
  committeeRole?: string;
}

interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
}

const COMMITTEE_LABEL_SUGGESTIONS = [
  'Event lead',
  'Budget support',
  'Safety coordinator',
  'Logistics support',
  'Equipment coordinator',
  'Marketing support',
  'General committee',
];

const ROLE_STYLES: Record<string, string> = {
  president: 'bg-yellow-100 text-yellow-800',
  committee: 'bg-blue-100 text-blue-700',
  user: 'bg-gray-100 text-gray-600',
};

export default function PresidentMembersPage() {
  const { selectedClub } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [localRoles, setLocalRoles] = useState<Record<string, { role: string; committeeRole: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<PlatformUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [newCommitteeLabel, setNewCommitteeLabel] = useState('general');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [message, setMessage] = useState('');
  const [addError, setAddError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/clubs/${selectedClub.clubId}/members`)
      .then(res => {
        setMembers(res.data);
        const init: Record<string, { role: string; committeeRole: string }> = {};
        res.data.forEach((m: Member) => {
          init[m.userId._id] = { role: m.role, committeeRole: m.committeeRole || '' };
        });
        setLocalRoles(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub]);

  useEffect(() => {
    if (!showAddModal || !selectedClub?.clubId) return;
    const term = userSearchTerm.trim();
    if (term.length < 2 || selectedUser) {
      setUserResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      setSearchingUsers(true);
      api.get(`/clubs/${selectedClub.clubId}/member-search?q=${encodeURIComponent(term)}`)
        .then(res => setUserResults(res.data))
        .catch(() => setUserResults([]))
        .finally(() => setSearchingUsers(false));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [selectedClub?.clubId, selectedUser, showAddModal, userSearchTerm]);

  const handleSave = async (userId: string) => {
    if (!selectedClub?.clubId) return;
    const { committeeRole } = localRoles[userId];
    setSaving(userId);
    try {
      await api.put(`/clubs/${selectedClub.clubId}/members/${userId}/role`, {
        role: 'committee',
        committeeRole,
      });
      setMembers(prev => prev.map(m =>
        m.userId._id === userId ? { ...m, role: 'committee', committeeRole: committeeRole || 'general' } : m
      ));
    } catch {
      alert('Failed to update committee label.');
    } finally {
      setSaving(null);
    }
  };

  const removeMember = async () => {
    if (!selectedClub?.clubId || !removeTarget) return;
    try {
      await api.delete(`/clubs/${selectedClub.clubId}/members/${removeTarget.userId._id}`);
      setMembers(prev => prev.filter(member => member.userId._id !== removeTarget.userId._id));
      setLocalRoles(prev => {
        const next = { ...prev };
        delete next[removeTarget.userId._id];
        return next;
      });
      setMessage(`${removeTarget.userId.name} removed from the club.`);
      setRemoveTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to remove member.');
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setUserSearchTerm('');
    setUserResults([]);
    setSelectedUser(null);
    setNewCommitteeLabel('general');
    setMessage('');
    setAddError('');
  };

  const addCommitteeMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClub?.clubId || !selectedUser) return;
    setAddingMember(true);
    setMessage('');
    setAddError('');
    try {
      const res = await api.post(`/clubs/${selectedClub.clubId}/members`, {
        userId: selectedUser._id,
        committeeRole: newCommitteeLabel,
      });
      const member = res.data as Member;
      setMembers(prev => [...prev, member].sort((a, b) => a.userId.name.localeCompare(b.userId.name)));
      setLocalRoles(prev => ({
        ...prev,
        [member.userId._id]: { role: member.role, committeeRole: member.committeeRole || '' },
      }));
      setShowAddModal(false);
      setMessage(`${member.userId.name} added to the committee.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddError(msg || 'Failed to add committee member.');
    } finally {
      setAddingMember(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [
      member.userId.name,
      member.userId.email,
      member.userId.studentId || '',
      member.role,
      member.committeeRole || '',
    ].some(value => value.toLowerCase().includes(term));
  });

  return (
    <div className="president-workspace min-h-screen bg-[#201609]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <PresidentWorkspaceNav active="Members" />

        {/* Main */}
        <main className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Club Members</h2>
                <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''} in this club</p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                <button
                  type="button"
                  onClick={openAddModal}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Add Committee Member
                </button>
                <div className="relative w-full sm:w-80">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">⌕</span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search members..."
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
            {message && (
              <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                {message}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No members found.</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No members match your search.</div>
            ) : (
              <div className="max-h-[34rem] overflow-y-auto pr-2 divide-y divide-gray-100">
                {filteredMembers.map(member => {
                  const uid = member.userId._id;
                  const local = localRoles[uid] || { role: member.role, committeeRole: member.committeeRole || '' };
                  const isPresident = member.role === 'president';
                  const isDirty = local.committeeRole !== (member.committeeRole || '');

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
                          <input
                            list="committee-label-suggestions"
                            placeholder="Label, e.g. Events lead"
                            value={local.committeeRole}
                            onChange={e => setLocalRoles(prev => ({ ...prev, [uid]: { ...prev[uid], role: 'committee', committeeRole: e.target.value } }))}
                            className="w-56 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <datalist id="committee-label-suggestions">
                            {COMMITTEE_LABEL_SUGGESTIONS.map(label => <option key={label} value={label} />)}
                          </datalist>

                          <button
                            onClick={() => handleSave(uid)}
                            disabled={!isDirty || saving === uid}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-40"
                          >
                            {saving === uid ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(member)}
                            className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-medium"
                          >
                            Remove
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

      {showAddModal && (
        <div className="!fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <form onSubmit={addCommitteeMember} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add committee member</h3>
                <p className="mt-1 text-sm text-gray-500">Search platform users, then add them to this club committee.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-gray-700">Member</label>
              {selectedUser ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedUser.name}</p>
                      <p className="text-xs text-gray-500">
                        {selectedUser.email}{selectedUser.studentId ? ` · ${selectedUser.studentId}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setUserSearchTerm('');
                      }}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    placeholder="Search by name, email, or student ID..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {userSearchTerm.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl">
                      {searchingUsers ? (
                        <p className="px-3 py-3 text-sm text-gray-400">Searching...</p>
                      ) : userResults.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-gray-400">No available users found.</p>
                      ) : (
                        userResults.map(user => (
                          <button
                            type="button"
                            key={user._id}
                            onClick={() => {
                              setSelectedUser(user);
                              setUserSearchTerm(user.name);
                              setUserResults([]);
                            }}
                            className="block w-full px-3 py-3 text-left hover:bg-blue-50"
                          >
                            <span className="block text-sm font-semibold text-gray-900">{user.name}</span>
                            <span className="block text-xs text-gray-500">
                              {user.email}{user.studentId ? ` · ${user.studentId}` : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Committee label</label>
              <input
                list="new-committee-label-suggestions"
                value={newCommitteeLabel}
                onChange={e => setNewCommitteeLabel(e.target.value)}
                placeholder="general"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="new-committee-label-suggestions">
                {COMMITTEE_LABEL_SUGGESTIONS.map(label => <option key={label} value={label} />)}
              </datalist>
            </div>

            {addError && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {addError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedUser || addingMember}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addingMember ? 'Adding...' : 'Add to Committee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {removeTarget && (
        <div
          className="!fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setRemoveTarget(null)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Remove committee member?</h3>
            <p className="mt-2 text-sm text-gray-500">
              {removeTarget.userId.name} will no longer have access to this club workspace. They can still follow the club from the Student Hub.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setRemoveTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={removeMember} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Remove from Club
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
