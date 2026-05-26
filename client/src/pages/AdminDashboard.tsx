import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface Club {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  officialClubLink?: string;
  logoUrl?: string;
}

interface ClubMember {
  _id: string;
  user: { name: string; email: string; studentId?: string };
  club: { _id: string; name: string } | null;
  role: string;
  committeeRole?: string;
  status?: 'active' | 'pending_invite' | 'org_member';
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface OrganisationInfo {
  _id: string;
  name: string;
  description?: string;
}

interface ClubRequest {
  _id: string;
  clubName: string;
  clubDescription: string;
  clubCategory: string;
  officialClubLink: string;
  requesterFullName: string;
  requesterEmail: string;
  requesterRole: string;
  presidentFullName: string;
  presidentEmail: string;
  proofFile: { name: string; type: string; size: number };
  additionalNotes?: string;
  status: 'awaiting_email_confirmation' | 'pending_review' | 'more_info_needed' | 'approved' | 'rejected';
}

const emptyClubForm = { name: '', description: '', category: '', officialClubLink: '', logoUrl: '' };

export default function AdminDashboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [archivedClubs, setArchivedClubs] = useState<Club[]>([]);
  const [organisation, setOrganisation] = useState<OrganisationInfo | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyClubForm);
  const [clubSearch, setClubSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyClubForm);
  const [presidentEmail, setPresidentEmail] = useState<Record<string, string>>({});
  const [editingPresidentClubId, setEditingPresidentClubId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [requestAction, setRequestAction] = useState<'more-info' | 'reject' | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestEdit, setRequestEdit] = useState({
    clubName: '',
    clubDescription: '',
    clubCategory: '',
    officialClubLink: '',
    presidentName: '',
    presidentEmail: '',
    adminNotes: '',
  });

  const selectedRequest = requests.find(request => request._id === selectedRequestId) || null;

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/clubs'),
      api.get('/clubs/org/users'),
      api.get('/club-registration-requests'),
      api.get('/auth/users'),
      api.get('/clubs/org/info'),
      api.get('/clubs/org/archived'),
    ]).then(([clubsRes, membersRes, requestsRes, usersRes, orgRes, archivedRes]) => {
      setClubs(clubsRes.data);
      setMembers(membersRes.data);
      setRequests(requestsRes.data);
      setAllUsers(usersRes.data);
      setOrganisation(orgRes.data);
      setArchivedClubs(archivedRes.data);
      if (!selectedRequestId && requestsRes.data.length > 0) setSelectedRequestId(requestsRes.data[0]._id);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedRequest) return;
    setRequestEdit({
      clubName: selectedRequest.clubName,
      clubDescription: selectedRequest.clubDescription,
      clubCategory: selectedRequest.clubCategory,
      officialClubLink: selectedRequest.officialClubLink,
      presidentName: selectedRequest.presidentFullName,
      presidentEmail: selectedRequest.presidentEmail,
      adminNotes: '',
    });
  }, [selectedRequest]);

  const filteredClubs = useMemo(() => {
    const query = clubSearch.toLowerCase().trim();
    return clubs.filter(club => !query
      || club.name.toLowerCase().includes(query)
      || (club.description || '').toLowerCase().includes(query)
      || (club.category || '').toLowerCase().includes(query));
  }, [clubs, clubSearch]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.toLowerCase().trim();
    return members.filter(member => !query
      || member.user.name.toLowerCase().includes(query)
      || member.user.email.toLowerCase().includes(query)
      || (member.club?.name || 'organisation member').toLowerCase().includes(query)
      || member.role.toLowerCase().includes(query)
      || (member.committeeRole || '').toLowerCase().includes(query));
  }, [members, memberSearch]);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clubs', form);
      setForm(emptyClubForm);
      setShowCreate(false);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to create club');
    }
  };

  const handleUpdateClub = async (clubId: string) => {
    try {
      await api.put(`/clubs/${clubId}`, editForm);
      setEditingClubId(null);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update club');
    }
  };

  const handleAssignPresident = async (clubId: string) => {
    const email = presidentEmail[clubId]?.trim();
    if (!email) return alert('Enter the user email address first.');
    try {
      await api.post(`/clubs/${clubId}/assign-president`, { email });
      setPresidentEmail(prev => ({ ...prev, [clubId]: '' }));
      setEditingPresidentClubId(null);
      alert('President assigned successfully');
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to assign president');
    }
  };

  const handleArchiveClub = async (clubId: string, clubName: string) => {
    if (!confirm(`Archive ${clubName}? Members lose access until it is restored.`)) return;
    try {
      await api.delete(`/clubs/${clubId}`);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to archive club');
    }
  };

  const handleRestoreClub = async (clubId: string) => {
    try {
      await api.post(`/clubs/${clubId}/restore`);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to restore club');
    }
  };

  const viewProof = async () => {
    if (!selectedRequest) return;
    const { data } = await api.get(`/club-registration-requests/${selectedRequest._id}/proof`);
    const win = window.open();
    if (!win) return;
    win.document.write(`<title>${data.name}</title>`);
    if (data.type.startsWith('image/')) {
      win.document.write(`<img src="${data.data}" alt="${data.name}" style="max-width:100%;height:auto;" />`);
    } else {
      win.document.write(`<iframe src="${data.data}" title="${data.name}" style="width:100%;height:100vh;border:0;"></iframe>`);
    }
  };

  const approveRequest = async () => {
    if (!selectedRequest) return;
    if (!confirm(`Approve and create workspace for ${requestEdit.clubName}?`)) return;
    try {
      await api.put(`/club-registration-requests/${selectedRequest._id}/approve`, requestEdit);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to approve request');
    }
  };

  const sendRequestAction = async () => {
    if (!selectedRequest || !requestAction) return;
    if (!requestMessage.trim()) return alert('Enter a message first.');
    const path = requestAction === 'reject' ? 'reject' : 'request-more-info';
    const payload = requestAction === 'reject' ? { reason: requestMessage } : { message: requestMessage };
    try {
      await api.put(`/club-registration-requests/${selectedRequest._id}/${path}`, payload);
      setRequestAction(null);
      setRequestMessage('');
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update request');
    }
  };

  return (
    <div className="org-workspace min-h-screen bg-[#071b17]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 rounded-xl p-6 text-white shadow">
          <h1 className="text-2xl font-bold mb-1">{organisation?.name || 'Organisation'} Admin Workspace</h1>
          <p className="text-gray-300 text-sm">
            Managing {organisation?.name || 'your organisation'}.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : (
          <>
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <h2 className="text-lg font-semibold text-gray-800">Club Registration Requests ({requests.length})</h2>
                {selectedRequest && <span className="text-sm text-gray-500">Selected: {selectedRequest.clubName}</span>}
              </div>
              {requests.length === 0 ? (
                <p className="text-sm text-gray-400">No registration requests for your organisation yet.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
                  <div className="space-y-2">
                    {requests.map(request => (
                      <button
                        key={request._id}
                        onClick={() => setSelectedRequestId(request._id)}
                        className={`w-full text-left border rounded-lg p-3 ${selectedRequestId === request._id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                      >
                        <p className="text-sm font-semibold text-gray-800">{request.clubName}</p>
                        <p className="text-xs text-gray-400">{request.requesterFullName} · {request.status.replaceAll('_', ' ')}</p>
                      </button>
                    ))}
                  </div>
                  {selectedRequest && (
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-5">
                        <ReadOnly label="Requester" value={`${selectedRequest.requesterFullName} (${selectedRequest.requesterEmail})`} />
                        <ReadOnly label="Requester Role" value={selectedRequest.requesterRole} />
                        <ReadOnly label="President" value={`${selectedRequest.presidentFullName} (${selectedRequest.presidentEmail})`} />
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Proof</p>
                          <button onClick={viewProof} className="text-blue-600 hover:underline">{selectedRequest.proofFile.name}</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input label="Club Name" value={requestEdit.clubName} onChange={v => setRequestEdit(p => ({ ...p, clubName: v }))} />
                        <Input label="Category" value={requestEdit.clubCategory} onChange={v => setRequestEdit(p => ({ ...p, clubCategory: v }))} />
                        <Input label="Official Link" value={requestEdit.officialClubLink} onChange={v => setRequestEdit(p => ({ ...p, officialClubLink: v }))} />
                        <Input label="President Email" value={requestEdit.presidentEmail} onChange={v => setRequestEdit(p => ({ ...p, presidentEmail: v }))} />
                        <Input label="President Name" value={requestEdit.presidentName} onChange={v => setRequestEdit(p => ({ ...p, presidentName: v }))} />
                        <Input label="Admin Notes" value={requestEdit.adminNotes} onChange={v => setRequestEdit(p => ({ ...p, adminNotes: v }))} />
                        <label className="block md:col-span-2">
                          <span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
                          <textarea value={requestEdit.clubDescription} onChange={e => setRequestEdit(p => ({ ...p, clubDescription: e.target.value }))} rows={3} className="form-input resize-none" />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button disabled={selectedRequest.status === 'approved' || selectedRequest.status === 'rejected' || selectedRequest.status === 'awaiting_email_confirmation'} onClick={approveRequest} className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">Approve & Create Club Workspace</button>
                        <button disabled={selectedRequest.status === 'approved' || selectedRequest.status === 'rejected'} onClick={() => setRequestAction('more-info')} className="bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-100 disabled:opacity-50">Request More Info</button>
                        <button disabled={selectedRequest.status === 'approved' || selectedRequest.status === 'rejected'} onClick={() => setRequestAction('reject')} className="bg-red-50 text-red-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50">Reject</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <h2 className="text-lg font-semibold text-gray-800">Clubs ({filteredClubs.length})</h2>
                <div className="flex gap-2">
                  <input value={clubSearch} onChange={e => setClubSearch(e.target.value)} placeholder="Search clubs" className="form-input md:w-64" />
                  <button onClick={() => setShowCreate(v => !v)} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap">{showCreate ? 'Cancel' : '+ New Club'}</button>
                </div>
              </div>

              {showCreate && (
                <form onSubmit={handleCreateClub} className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Club Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
                  <Input label="Category" value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} />
                  <Input label="Official Link" value={form.officialClubLink} onChange={v => setForm(p => ({ ...p, officialClubLink: v }))} />
                  <Input label="Logo URL" value={form.logoUrl} onChange={v => setForm(p => ({ ...p, logoUrl: v }))} />
                  <Input label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} />
                  <button type="submit" className="md:col-span-2 bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition">Create Club</button>
                </form>
              )}

              <div className="max-h-[30rem] overflow-y-auto pr-2 divide-y divide-gray-100">
                {filteredClubs.map(club => (
                  <div key={club._id} className="py-4">
                    {editingClubId === club._id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input label="Club Name" value={editForm.name} onChange={v => setEditForm(p => ({ ...p, name: v }))} />
                        <Input label="Category" value={editForm.category} onChange={v => setEditForm(p => ({ ...p, category: v }))} />
                        <Input label="Official Link" value={editForm.officialClubLink} onChange={v => setEditForm(p => ({ ...p, officialClubLink: v }))} />
                        <Input label="Logo URL" value={editForm.logoUrl} onChange={v => setEditForm(p => ({ ...p, logoUrl: v }))} />
                        <Input label="Description" value={editForm.description} onChange={v => setEditForm(p => ({ ...p, description: v }))} />
                        <div className="md:col-span-2 flex gap-2">
                          <button onClick={() => handleUpdateClub(club._id)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                          <button onClick={() => setEditingClubId(null)} className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{club.name}</p>
                            <p className="text-xs text-gray-400">{club.category || 'No category'}{club.description ? ` · ${club.description}` : ''}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setEditingClubId(club._id); setEditForm({ name: club.name, description: club.description || '', category: club.category || '', officialClubLink: club.officialClubLink || '', logoUrl: club.logoUrl || '' }); }} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">Edit</button>
                            <button onClick={() => handleArchiveClub(club._id, club.name)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Archive</button>
                          </div>
                        </div>
                        <PresidentAssignment
                          clubId={club._id}
                          president={getClubPresident(members, club._id)}
                          isEditing={editingPresidentClubId === club._id}
                          query={presidentEmail[club._id] || ''}
                          users={allUsers}
                          onEdit={() => setEditingPresidentClubId(club._id)}
                          onCancel={() => { setEditingPresidentClubId(null); setPresidentEmail(p => ({ ...p, [club._id]: '' })); }}
                          onQueryChange={value => setPresidentEmail(p => ({ ...p, [club._id]: value }))}
                          onSelect={user => setPresidentEmail(p => ({ ...p, [club._id]: user.email }))}
                          onAssign={() => handleAssignPresident(club._id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {archivedClubs.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-5">Archived Clubs ({archivedClubs.length})</h2>
                <div className="divide-y divide-gray-100">
                  {archivedClubs.map(club => (
                    <div key={club._id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{club.name}</p>
                        <p className="text-xs text-gray-400">{club.category || 'No category'}{club.description ? ` · ${club.description}` : ''}</p>
                      </div>
                      <button onClick={() => handleRestoreClub(club._id)} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 shrink-0">Restore</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <h2 className="text-lg font-semibold text-gray-800">Club Users ({filteredMembers.length})</h2>
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search users, emails, clubs, roles" className="form-input md:w-80" />
              </div>
              <div className="max-h-[34rem] overflow-y-auto pr-2 divide-y divide-gray-100">
                {filteredMembers.map(member => (
                  <div key={member._id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{member.user.name}</p>
                      <p className="text-xs text-gray-400">{member.user.email}</p>
                    </div>
                    <p className="text-sm text-gray-600 text-right">
                      {member.role === 'member' ? 'Organisation member' : member.role}
                      {member.committeeRole ? ` (${member.committeeRole})` : ''} · {member.club?.name || organisation?.name || 'Organisation'}
                      {'status' in member && member.status === 'pending_invite' ? ' · Pending invite' : ''}
                      {'status' in member && member.status === 'org_member' ? ' · No club yet' : ''}
                    </p>
                  </div>
                ))}
                {filteredMembers.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No club users found.</p>}
              </div>
            </section>
          </>
        )}
      </div>

      {requestAction && selectedRequest && (
        <div
          className="!fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { setRequestAction(null); setRequestMessage(''); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{requestAction === 'reject' ? 'Reject Request' : 'Request More Information'}</h2>
            <p className="text-sm text-gray-500 mb-4">This message will be sent to {selectedRequest.requesterEmail}</p>
            <textarea value={requestMessage} onChange={e => setRequestMessage(e.target.value)} rows={5} className="form-input resize-none" />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => { setRequestAction(null); setRequestMessage(''); }} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={sendRequestAction} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${requestAction === 'reject' ? 'bg-red-600' : 'bg-blue-600'}`}>{requestAction === 'reject' ? 'Reject Request' : 'Send Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="form-input" />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-400 mb-1">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}

function getClubPresident(members: ClubMember[], clubId: string) {
  return members.find(member => member.club?._id === clubId && member.role === 'president')?.user || null;
}

function PresidentAssignment({
  president,
  isEditing,
  query,
  users,
  onEdit,
  onCancel,
  onQueryChange,
  onSelect,
  onAssign,
}: {
  clubId: string;
  president: ClubMember['user'] | null;
  isEditing: boolean;
  query: string;
  users: UserOption[];
  onEdit: () => void;
  onCancel: () => void;
  onQueryChange: (value: string) => void;
  onSelect: (user: UserOption) => void;
  onAssign: () => void;
}) {
  const shouldShowPicker = !president || isEditing;

  if (!shouldShowPicker) {
    return (
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-yellow-50 border border-yellow-100 px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase text-yellow-700">President</p>
          <p className="text-sm font-medium text-gray-800">{president.name}</p>
          <p className="text-xs text-gray-500">{president.email}</p>
        </div>
        <button onClick={onEdit} className="text-xs bg-white text-yellow-700 border border-yellow-200 px-3 py-1.5 rounded-lg hover:bg-yellow-100">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {president && (
        <div className="mb-2 text-xs text-gray-500">
          Current president: <span className="font-medium text-gray-700">{president.name}</span> ({president.email})
        </div>
      )}
      <EmailUserPicker
        query={query}
        users={users}
        placeholder="Search user email to assign president"
        actionLabel={president ? 'Change President' : 'Assign President'}
        onQueryChange={onQueryChange}
        onSelect={onSelect}
        onAction={onAssign}
      />
      {president && (
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
  onQueryChange,
  onSelect,
  onAction,
}: {
  query: string;
  users: UserOption[];
  placeholder: string;
  actionLabel: string;
  onQueryChange: (value: string) => void;
  onSelect: (user: UserOption) => void;
  onAction: () => void;
}) {
  const trimmed = query.trim().toLowerCase();
  const suggestions = trimmed
    ? users
      .filter(user => user.email.toLowerCase().includes(trimmed) || user.name.toLowerCase().includes(trimmed))
      .slice(0, 5)
    : [];

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <input
          type="email"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="form-input"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            {suggestions.map(user => (
              <button
                key={user._id}
                type="button"
                onClick={() => onSelect(user)}
                className="block w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                <p className="text-sm font-medium text-gray-800">{user.email}</p>
                <p className="text-xs text-gray-400">{user.name} · {user.role}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onAction} className="text-sm bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 whitespace-nowrap">
        {actionLabel}
      </button>
    </div>
  );
}
