import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import CommitteeWorkspaceNav from '../components/CommitteeWorkspaceNav';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Member {
  _id: string;
  userId: { _id: string; name: string; email: string; studentId?: string };
  role: 'president' | 'committee' | 'user';
  committeeRole?: string;
}

const ROLE_STYLES: Record<string, string> = {
  president: 'bg-yellow-100 text-yellow-800',
  committee: 'bg-purple-100 text-purple-700',
  user: 'bg-gray-100 text-gray-600',
};

function roleLabel(member: Member) {
  if (member.role === 'committee') return `Committee${member.committeeRole ? ` · ${member.committeeRole}` : ''}`;
  return member.role.charAt(0).toUpperCase() + member.role.slice(1);
}

export default function CommitteeMembersPage() {
  const { selectedClub } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    setLoading(true);
    api.get(`/clubs/${selectedClub.clubId}/members`)
      .then(res => setMembers(res.data))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [selectedClub?.clubId]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(member => [
      member.userId.name,
      member.userId.email,
      member.userId.studentId,
      member.role,
      member.committeeRole,
    ].some(value => value?.toLowerCase().includes(q)));
  }, [members, query]);

  return (
    <div className="committee-workspace min-h-screen bg-[#140f24]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        <CommitteeWorkspaceNav active="Members" />

        <main className="flex-1">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Members</h1>
            <p className="text-sm text-purple-100/80 mt-0.5">View the current club team and committee labels.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Club Members</h2>
                <p className="text-sm text-gray-400 mt-0.5">{filteredMembers.length} of {members.length} shown</p>
              </div>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search members, email, role..."
                className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No matching members found.</div>
            ) : (
              <div className="max-h-[34rem] overflow-y-auto pr-2 divide-y divide-gray-100">
                {filteredMembers.map(member => (
                  <div key={member._id} className="py-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                      {member.userId.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800">{member.userId.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[member.role]}`}>
                          {roleLabel(member)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {member.userId.email}{member.userId.studentId ? ` · ${member.userId.studentId}` : ''}
                      </p>
                    </div>
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
