import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CommitteeWorkspaceNav from '../components/CommitteeWorkspaceNav';
import PresidentWorkspaceNav from '../components/PresidentWorkspaceNav';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface CommitteeMember {
  _id: string;
  name: string;
  email: string;
}

interface UserRef {
  _id: string;
  name: string;
  email: string;
}

interface Workspace {
  _id: string;
  name: string;
  type: string;
  description?: string;
  dueDate?: string;
  status: string;
  owner?: UserRef | null;
  collaborators: UserRef[];
  closeoutRequest?: {
    status: 'none' | 'pending' | 'approved' | 'rejected';
    note?: string;
    responseNote?: string;
    requestedBy?: UserRef;
    requestedAt?: string;
    reviewedBy?: UserRef;
    reviewedAt?: string;
  };
}

function getUserName(user?: UserRef | string) {
  if (!user || typeof user === 'string') return '';
  return user.name || user.email || '';
}

function shouldShowRejectedCloseout(ws: Workspace) {
  if (ws.closeoutRequest?.status !== 'rejected') return false;
  if (!ws.closeoutRequest.reviewedAt) return true;
  return Date.now() - new Date(ws.closeoutRequest.reviewedAt).getTime() < 8000;
}

interface EventLite {
  _id: string;
  title: string;
  date: string;
  clubId: string;
}

const TEMPLATES = [
  { type: 'budget', name: 'Budget', icon: '💰' },
  { type: 'logistics', name: 'Logistics', icon: '📦' },
  { type: 'equipment', name: 'Equipment', icon: '🔧' },
  { type: 'transport', name: 'Transport', icon: '🚗' },
  { type: 'safety', name: 'Safety', icon: '⚠️' },
  { type: 'documents', name: 'Documents', icon: '📁' },
  { type: 'tasks', name: 'Tasks / Notes', icon: '✅' },
];

const TYPE_ICONS: Record<string, string> = Object.fromEntries(TEMPLATES.map(t => [t.type, t.icon]));

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  ready: 'Ready',
  blocked: 'Blocked',
};

export default function EventWorkspacesPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedClub } = useAuth();
  const isPresident = selectedClub?.role === 'president';

  const [event, setEvent] = useState<EventLite | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ type: 'tasks', name: '', description: '', ownerId: '', dueDate: '' });
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Workspace | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');
  const [, setCloseoutNoticeTick] = useState(0);
  const [error, setError] = useState('');

  const filteredMembers = members.filter(member => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return true;
    return [member.name, member.email].some(value => value.toLowerCase().includes(term));
  });

  useEffect(() => {
    if (!eventId) return;
    Promise.all([
      api.get(`/events/${eventId}`),
      api.get(`/events/${eventId}/workspaces`),
    ])
      .then(([ev, ws]) => {
        setEvent(ev.data);
        setWorkspaces(ws.data);
      })
      .catch(() => setError('Failed to load workspaces'))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (!isPresident || !selectedClub?.clubId) return;
    api.get(`/events/committee-members?clubId=${selectedClub.clubId}`)
      .then(res => setMembers(res.data))
      .catch(() => {});
  }, [isPresident, selectedClub]);

  useEffect(() => {
    if (!workspaces.some(shouldShowRejectedCloseout)) return;
    const timeout = window.setTimeout(() => setCloseoutNoticeTick(tick => tick + 1), 8200);
    return () => window.clearTimeout(timeout);
  }, [workspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setError('');
    try {
      const res = await api.post(`/events/${eventId}/workspaces`, {
        name: draft.name || TEMPLATES.find(t => t.type === draft.type)?.name || 'Workspace',
        type: draft.type,
        description: draft.description || undefined,
        owner: draft.ownerId || undefined,
        dueDate: draft.dueDate || undefined,
      });
      setWorkspaces(prev => [...prev, res.data]);
      setDraft({ type: 'tasks', name: '', description: '', ownerId: '', dueDate: '' });
      setShowAdd(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to add workspace');
    }
  };

  const saveWorkspace = async () => {
    if (!editingWorkspace) return;
    try {
      const res = await api.put(`/workspaces/${editingWorkspace._id}`, {
        name: editingWorkspace.name,
        description: editingWorkspace.description || undefined,
        owner: editingWorkspace.owner?._id || undefined,
        dueDate: editingWorkspace.dueDate || undefined,
      });
      setWorkspaces(prev => prev.map(w => w._id === editingWorkspace._id ? res.data : w));
      setEditingWorkspace(null);
    } catch {
      setError('Failed to update workspace.');
    }
  };

  const handleDelete = async (ws: Workspace) => {
    try {
      await api.delete(`/workspaces/${ws._id}`);
      setWorkspaces(prev => prev.filter(w => w._id !== ws._id));
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete workspace.');
    }
  };

  const openCloseoutReview = (ws: Workspace, decision: 'approved' | 'rejected') => {
    setReviewTarget(ws);
    setReviewDecision(decision);
    setReviewNote('');
  };

  const submitCloseoutReview = async () => {
    if (!reviewTarget) return;
    try {
      const res = await api.put(`/workspaces/${reviewTarget._id}/closeout-request`, {
        decision: reviewDecision,
        responseNote: reviewNote,
      });
      setWorkspaces(prev => prev.map(w => w._id === reviewTarget._id ? res.data : w));
      setReviewTarget(null);
      setReviewNote('');
    } catch {
      setError('Failed to review close-out request.');
    }
  };

  const backPath = isPresident ? '/president/events' : '/committee/events';

  return (
    <div className={`${isPresident ? 'president-workspace bg-[#201609]' : 'committee-workspace bg-[#140f24]'} min-h-screen`}>
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        {isPresident ? (
          <PresidentWorkspaceNav active="Events" />
        ) : (
          <CommitteeWorkspaceNav active="Events" />
        )}

        <main className="flex-1">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className={`${isPresident ? 'text-yellow-100/80 hover:text-white' : 'text-purple-100/80 hover:text-white'} transition`}>
            ← Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Workspaces</h1>
            {event && <p className={`text-sm mt-0.5 ${isPresident ? 'text-yellow-100/80' : 'text-purple-100/80'}`}>{event.title}</p>}
          </div>
          {isPresident && (
            <button
              onClick={() => setShowAdd(v => !v)}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showAdd ? 'Cancel' : '+ Add Workspace'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {showAdd && isPresident && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={draft.type}
                  onChange={e => setDraft({ ...draft, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TEMPLATES.map(t => (
                    <option key={t.type} value={t.type}>{t.icon} {t.name}</option>
                  ))}
                  <option value="custom">📌 Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder={TEMPLATES.find(t => t.type === draft.type)?.name ?? 'Workspace name'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <select
                  value={draft.ownerId}
                  onChange={e => setDraft({ ...draft, ownerId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={draft.description}
                  onChange={e => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Optional"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={e => setDraft({ ...draft, dueDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Create Workspace
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">🗂️</div>
            <p className="text-gray-500 font-medium">No workspaces yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {isPresident ? 'Add a workspace to start delegating areas of this event.' : 'The president has not added any workspaces yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map(ws => (
              <div key={ws._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{TYPE_ICONS[ws.type] ?? '📌'}</span>
                      <h3 className="text-base font-semibold text-gray-800">{ws.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[ws.status]}`}>
                        {STATUS_LABELS[ws.status]}
                      </span>
                      <span className="text-xs text-gray-400">({ws.type})</span>
                    </div>
                    {ws.description && (
                      <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{ws.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                      <span>👤 {ws.owner ? ws.owner.name : 'Unassigned'}</span>
                      {ws.dueDate && <span>📅 Due {new Date(ws.dueDate).toLocaleDateString('en-AU')}</span>}
                      {ws.collaborators.length > 0 && (
                        <span>🤝 {ws.collaborators.length} collaborator{ws.collaborators.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {ws.closeoutRequest?.status === 'pending' && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-amber-900">
                              Close-out requested{getUserName(ws.closeoutRequest.requestedBy) ? ` by ${getUserName(ws.closeoutRequest.requestedBy)}` : ''}
                            </p>
                            {ws.closeoutRequest.note && (
                              <p className="mt-1 text-sm text-amber-800">{ws.closeoutRequest.note}</p>
                            )}
                          </div>
                          {isPresident && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openCloseoutReview(ws, 'approved')}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openCloseoutReview(ws, 'rejected')}
                                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {ws.closeoutRequest?.status === 'approved' && (
                      <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                        Close-out approved
                      </p>
                    )}
                    {shouldShowRejectedCloseout(ws) && (
                      <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                        Close-out rejected{ws.closeoutRequest?.responseNote ? `: ${ws.closeoutRequest.responseNote}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/workspaces/${ws._id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Open →
                    </button>
                    {isPresident && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingWorkspace(ws);
                            setMemberSearch('');
                          }}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Edit Workspace
                        </button>
                        <button
                          onClick={() => setDeleteTarget(ws)}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete Workspace
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </main>
      </div>

      {editingWorkspace && (
        <div
          className="!fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditingWorkspace(null)}
        >
          <div className="w-full max-w-2xl rounded-xl !bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Edit workspace</h3>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input value={editingWorkspace.name} onChange={e => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea value={editingWorkspace.description || ''} onChange={e => setEditingWorkspace({ ...editingWorkspace, description: e.target.value })} rows={3} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Owner</label>
                  <div className="rounded-lg border border-gray-200 !bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{editingWorkspace.owner?.name || 'Unassigned'}</p>
                        <p className="text-xs text-gray-400">{editingWorkspace.owner?.email || 'No committee member selected'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOwnerPicker(value => !value)}
                        className="rounded-lg !bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:!bg-blue-100"
                      >
                        Change Owner
                      </button>
                    </div>
                    {showOwnerPicker && (
                      <div className="mt-3">
                        <input
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full rounded-lg border border-gray-200 !bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-100 !bg-white shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWorkspace({ ...editingWorkspace, owner: null });
                              setShowOwnerPicker(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                          >
                            Unassigned
                          </button>
                          {filteredMembers.map(member => (
                            <button
                              type="button"
                              key={member._id}
                              onClick={() => {
                                setEditingWorkspace({ ...editingWorkspace, owner: member });
                                setShowOwnerPicker(false);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                            >
                              <span className="font-medium text-gray-800">{member.name}</span>
                              <span className="ml-2 text-xs text-gray-400">{member.email}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Deadline</label>
                  <input type="date" value={editingWorkspace.dueDate ? editingWorkspace.dueDate.slice(0, 10) : ''} onChange={e => setEditingWorkspace({ ...editingWorkspace, dueDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditingWorkspace(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveWorkspace} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save Workspace</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="!fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Delete workspace?</h3>
            <p className="mt-2 text-sm text-gray-500">This will delete "{deleteTarget.name}" and all tasks inside it. This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete Workspace</button>
            </div>
          </div>
        </div>
      )}

      {reviewTarget && (
        <div
          className="!fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setReviewTarget(null)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">
              {reviewDecision === 'approved' ? 'Approve close-out?' : 'Reject close-out?'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {reviewDecision === 'approved'
                ? `"${reviewTarget.name}" will be marked approved and move to Previous Work for the committee member.`
                : `The committee member will see that "${reviewTarget.name}" needs more work.`}
            </p>
            <textarea
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              rows={3}
              placeholder={reviewDecision === 'approved' ? 'Optional approval note...' : 'Add a short reason or next step...'}
              className="mt-4 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setReviewTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={submitCloseoutReview}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${reviewDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {reviewDecision === 'approved' ? 'Approve Close-Out' : 'Reject Close-Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
