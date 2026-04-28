import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
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
  status: string;
  owner?: UserRef | null;
  collaborators: UserRef[];
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
  const [draft, setDraft] = useState({ type: 'tasks', name: '', description: '', ownerId: '' });
  const [error, setError] = useState('');

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
      });
      setWorkspaces(prev => [...prev, res.data]);
      setDraft({ type: 'tasks', name: '', description: '', ownerId: '' });
      setShowAdd(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to add workspace');
    }
  };

  const handleStatusChange = async (ws: Workspace, status: string) => {
    try {
      const res = await api.put(`/workspaces/${ws._id}`, { status });
      setWorkspaces(prev => prev.map(w => w._id === ws._id ? res.data : w));
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleDelete = async (ws: Workspace) => {
    if (!confirm(`Delete workspace "${ws.name}" and all its tasks?`)) return;
    try {
      await api.delete(`/workspaces/${ws._id}`);
      setWorkspaces(prev => prev.filter(w => w._id !== ws._id));
    } catch {
      alert('Failed to delete workspace.');
    }
  };

  const backPath = isPresident ? '/president/events' : '/committee/events';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className="text-gray-500 hover:text-gray-700 transition">
            ← Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Workspaces</h1>
            {event && <p className="text-sm text-gray-500 mt-0.5">{event.title}</p>}
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
            <div className="grid grid-cols-2 gap-3">
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
                      {ws.collaborators.length > 0 && (
                        <span>🤝 {ws.collaborators.length} collaborator{ws.collaborators.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/workspaces/${ws._id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Open →
                    </button>
                    {isPresident && (
                      <div className="flex items-center gap-2">
                        <select
                          value={ws.status}
                          onChange={e => handleStatusChange(ws, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.keys(STATUS_LABELS).map(s => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDelete(ws)}
                          className="text-xs text-red-400 hover:text-red-600 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
