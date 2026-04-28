import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface UserRef {
  _id: string;
  name: string;
  email: string;
}

interface Workspace {
  _id: string;
  eventId: string;
  name: string;
  type: string;
  description?: string;
  status: string;
  owner?: UserRef | null;
  collaborators: UserRef[];
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  assignedTo: UserRef[];
  dueDate?: string;
  status: 'todo' | 'in_progress' | 'done';
  createdBy: UserRef;
}

interface CommitteeMember {
  _id: string;
  name: string;
  email: string;
}

const COLUMNS: { key: Task['status']; label: string; tone: string }[] = [
  { key: 'todo', label: 'To do', tone: 'bg-gray-50 border-gray-200' },
  { key: 'in_progress', label: 'In progress', tone: 'bg-blue-50 border-blue-200' },
  { key: 'done', label: 'Done', tone: 'bg-green-50 border-green-200' },
];

const TYPE_ICONS: Record<string, string> = {
  budget: '💰',
  logistics: '📦',
  equipment: '🔧',
  transport: '🚗',
  safety: '⚠️',
  documents: '📁',
  tasks: '✅',
  custom: '📌',
};

export default function WorkspaceDetailPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, selectedClub } = useAuth();
  const isPresident = selectedClub?.role === 'president';

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', dueDate: '', assigneeId: '' });

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      api.get(`/workspaces/${workspaceId}`),
      api.get(`/workspaces/${workspaceId}/tasks`),
    ])
      .then(([ws, ts]) => {
        setWorkspace(ws.data);
        setTasks(ts.data);
      })
      .catch(() => setError('Failed to load workspace'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!selectedClub?.clubId || !isPresident) return;
    api.get(`/events/committee-members?clubId=${selectedClub.clubId}`)
      .then(res => setMembers(res.data))
      .catch(() => {});
  }, [selectedClub, isPresident]);

  const canActInWorkspace = useMemo(() => {
    if (!workspace || !user) return false;
    if (isPresident) return true;
    if (workspace.owner?._id === user.id) return true;
    return workspace.collaborators.some(c => c._id === user.id);
  }, [workspace, user, isPresident]);

  const isAssignee = (task: Task) => task.assignedTo.some(u => u._id === user?.id);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setError('');
    try {
      const res = await api.post(`/workspaces/${workspaceId}/tasks`, {
        title: draft.title,
        description: draft.description || undefined,
        dueDate: draft.dueDate || undefined,
        assignedTo: draft.assigneeId ? [draft.assigneeId] : [],
      });
      setTasks(prev => [...prev, res.data]);
      setDraft({ title: '', description: '', dueDate: '', assigneeId: '' });
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create task');
    }
  };

  const updateStatus = async (task: Task, status: Task['status']) => {
    try {
      const res = await api.put(`/tasks/${task._id}`, { status });
      setTasks(prev => prev.map(t => t._id === task._id ? res.data : t));
    } catch {
      alert('Failed to update task.');
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks(prev => prev.filter(t => t._id !== task._id));
    } catch {
      alert('Failed to delete task.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-gray-400">Loading workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-gray-500">Workspace not found.</div>
      </div>
    );
  }

  const memberMembers = canActInWorkspace ? members : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/${isPresident ? 'president' : 'committee'}/events/${workspace.eventId}/workspaces`)}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ← Back
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{TYPE_ICONS[workspace.type] ?? '📌'}</span>
              <h1 className="text-xl font-bold text-gray-800">{workspace.name}</h1>
              <span className="text-xs text-gray-400">({workspace.type})</span>
            </div>
            {workspace.description && <p className="text-sm text-gray-500 mt-0.5">{workspace.description}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
              <span>👤 Owner: {workspace.owner?.name ?? 'Unassigned'}</span>
              {workspace.collaborators.length > 0 && (
                <span>🤝 {workspace.collaborators.map(c => c.name).join(', ')}</span>
              )}
            </div>
          </div>
          {canActInWorkspace && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? 'Cancel' : '+ Add Task'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {showForm && canActInWorkspace && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                value={draft.title}
                onChange={e => setDraft({ ...draft, title: e.target.value })}
                required
                placeholder="e.g. Confirm catering quote"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={draft.description}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={e => setDraft({ ...draft, dueDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                <select
                  value={draft.assigneeId}
                  onChange={e => setDraft({ ...draft, assigneeId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {/* Workspace owner & collaborators always selectable */}
                  {workspace.owner && (
                    <option value={workspace.owner._id}>{workspace.owner.name} (owner)</option>
                  )}
                  {workspace.collaborators.map(c => (
                    <option key={c._id} value={c._id}>{c.name} (collaborator)</option>
                  ))}
                  {memberMembers
                    .filter(m => m._id !== workspace.owner?._id && !workspace.collaborators.some(c => c._id === m._id))
                    .map(m => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Create Task
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className={`rounded-xl border ${col.tone} p-3 min-h-[200px]`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs text-gray-500">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0 ? (
                    <p className="text-xs text-gray-400 px-1">No tasks.</p>
                  ) : colTasks.map(task => {
                    const canEditTask = canActInWorkspace || isAssignee(task);
                    return (
                      <div key={task._id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 flex-1 min-w-0 break-words">{task.title}</p>
                          {canActInWorkspace && (
                            <button
                              onClick={() => handleDelete(task)}
                              className="text-gray-300 hover:text-red-500 transition text-sm"
                              title="Delete"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-gray-500">
                          {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString('en-AU')}</span>}
                          {task.assignedTo.length > 0 && (
                            <span>👤 {task.assignedTo.map(u => u.name).join(', ')}</span>
                          )}
                        </div>
                        {canEditTask && (
                          <div className="flex gap-1 mt-2">
                            {COLUMNS.filter(c => c.key !== col.key).map(c => (
                              <button
                                key={c.key}
                                onClick={() => updateStatus(task, c.key)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                → {c.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
