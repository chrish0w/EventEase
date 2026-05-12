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

interface WorkspaceFile {
  _id: string;
  originalName: string;
  filename: string;
  size: number;
  mimetype: string;
  uploadedBy: { _id: string; name: string; email: string } | null;
  uploadedAt: string;
}

interface TemplateItem {
  title: string;
  description: string;
}

const COLUMNS: { key: Task['status']; label: string; tone: string; dropTone: string }[] = [
  { key: 'todo',        label: 'To do',       tone: 'bg-gray-50 border-gray-200',   dropTone: 'ring-gray-400' },
  { key: 'in_progress', label: 'In progress', tone: 'bg-blue-50 border-blue-200',   dropTone: 'ring-blue-400' },
  { key: 'done',        label: 'Done',        tone: 'bg-green-50 border-green-200', dropTone: 'ring-green-400' },
];

const TYPE_ICONS: Record<string, string> = {
  budget: '💰', logistics: '📦', equipment: '🔧',
  transport: '🚗', safety: '⚠️', documents: '📁', tasks: '✅', custom: '📌',
};

const LOGISTICS_TEMPLATE: TemplateItem[] = [
  { title: 'Confirm venue booking',               description: 'Verify the venue is booked and collect confirmation details.' },
  { title: 'Arrange catering',                    description: 'Decide on food/drink options and place orders or organise vendors.' },
  { title: 'Confirm headcount & RSVPs',           description: 'Finalise attendee numbers for catering and seating.' },
  { title: 'Set up registration / check-in',      description: 'Prepare attendee list and check-in process for event day.' },
  { title: 'Prepare signage and printed materials', description: 'Design and print any banners, name tags, or handouts.' },
  { title: 'Coordinate volunteer schedule',       description: 'Assign roles and arrival times for all helpers.' },
  { title: 'Confirm A/V and equipment setup',     description: 'Test microphones, projectors, and any hired equipment.' },
  { title: 'Communicate parking & transport info', description: 'Share venue access, parking, and public transport details with attendees.' },
  { title: 'Safety and first aid check',          description: 'Identify first aid station, emergency exits, and on-call contacts.' },
  { title: 'Post-event cleanup plan',             description: 'Assign cleanup duties and confirm venue handover time.' },
];

const EQUIPMENT_TEMPLATE: TemplateItem[] = [
  { title: 'Set up AV equipment',             description: 'Prepare projector, microphone, speakers, and slides playback device.' },
  { title: 'Arrange tables and chairs',       description: 'Set up layout for registration desk, audience seating, and presenter area.' },
  { title: 'Print signage and QR codes',      description: 'Prepare directional signs, activity info boards, and QR code displays.' },
  { title: 'Prepare registration tools',      description: 'Set up sign-in sheet, iPad/laptop, and name tags for check-in.' },
  { title: 'Bring club banner and materials', description: 'Pack club banner, brochures, and any club merchandise.' },
  { title: 'Organise power supplies',         description: 'Bring extension cords, chargers, and HDMI/display adapters.' },
  { title: 'Prepare food supplies',           description: 'Pack plates, cups, napkins, and rubbish bags for catering.' },
  { title: 'Pack safety items',               description: 'Bring first aid kit and print emergency contact list.' },
  { title: 'Test AV setup on site',           description: 'Run a full AV check — slides, mic levels, and screen visibility — before doors open.' },
  { title: 'Pack down and return equipment',  description: 'Collect all equipment after the event and return any borrowed items.' },
];

const TRANSPORT_TEMPLATE: TemplateItem[] = [
  { title: 'Confirm vehicle arrangement',      description: 'Confirm who is driving and whether a van, Uber, or hired vehicle is needed.' },
  { title: 'Arrange equipment transport',      description: 'Plan how to move banners, speakers, tables, and event materials to the venue.' },
  { title: 'Assign loading & unloading crew',  description: 'Designate people responsible for loading, unloading, and delivering items on site.' },
  { title: 'Confirm food pickup or delivery',  description: 'Arrange food collection or delivery schedule and confirm arrival times.' },
  { title: 'Organise volunteer / guest transport', description: 'Arrange travel for committee members, volunteers, or guest speakers to the venue.' },
  { title: 'Check parking & venue access',     description: 'Confirm parking availability, loading zones, and venue entry points.' },
  { title: 'Communicate transport plan to team', description: 'Share pickup times, addresses, and driver contacts with all relevant members.' },
  { title: 'Arrange return transport',         description: 'Plan post-event equipment return, leftover food collection, and vehicle drop-off.' },
];

const TEMPLATE_MAP: Record<string, TemplateItem[]> = {
  logistics: LOGISTICS_TEMPLATE,
  equipment: EQUIPMENT_TEMPLATE,
  transport: TRANSPORT_TEMPLATE,
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
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      api.get(`/workspaces/${workspaceId}`),
      api.get(`/workspaces/${workspaceId}/tasks`),
      api.get(`/workspaces/${workspaceId}/files`),
    ])
      .then(([ws, ts, fs]) => {
        setWorkspace(ws.data);
        setTasks(ts.data);
        setFiles(fs.data);
        const template = TEMPLATE_MAP[ws.data.type];
        if (template) {
          const existingTitles = new Set((ts.data as Task[]).map(t => t.title));
          setTemplateItems(template.filter(t => !existingTitles.has(t.title)));
        }
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
      // Restore to template sidebar if this task originated from a template
      if (workspace) {
        const template = TEMPLATE_MAP[workspace.type];
        if (template) {
          const origin = template.find(t => t.title === task.title);
          if (origin && !templateItems.some(t => t.title === origin.title)) {
            setTemplateItems(prev => {
              const order = template.map(t => t.title);
              return [...prev, origin].sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
            });
          }
        }
      }
    } catch {
      alert('Failed to delete task.');
    }
  };

  // Unified drop handler for kanban columns — handles both template cards and existing task cards
  const handleColumnDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingTaskId(null);

    const taskId = e.dataTransfer.getData('task-id');
    const templateIdxRaw = e.dataTransfer.getData('template-idx');

    if (taskId) {
      // Move existing task to this column
      const task = tasks.find(t => t._id === taskId);
      if (task && task.status !== status) await updateStatus(task, status);
      return;
    }

    if (templateIdxRaw !== '') {
      const idx = parseInt(templateIdxRaw, 10);
      if (isNaN(idx) || !workspaceId) return;
      const item = templateItems[idx];
      if (!item) return;
      setTemplateItems(prev => prev.filter((_, i) => i !== idx));
      try {
        const res = await api.post(`/workspaces/${workspaceId}/tasks`, {
          title: item.title,
          description: item.description,
          status,
        });
        setTasks(prev => [...prev, res.data]);
      } catch {
        setTemplateItems(prev => { const next = [...prev]; next.splice(idx, 0, item); return next; });
        alert('Failed to add task.');
      }
    }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/workspaces/${workspaceId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles(prev => [...prev, res.data]);
    } catch {
      alert('Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const deleteFile = async (fileId: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/files/${fileId}`);
      setFiles(prev => prev.filter(f => f._id !== fileId));
    } catch {
      alert('Failed to delete file.');
    }
  };

  const downloadFile = (fileId: string) => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:5001/api/workspaces/${workspaceId}/files/${fileId}/download`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Download failed.'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-400">Loading workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500">Workspace not found.</div>
      </div>
    );
  }

  const memberMembers = canActInWorkspace ? members : [];
  const showSidebar = canActInWorkspace && templateItems.length > 0;
  const ACCENTS: Record<string, { bg: string; border: string; text: string; hint: string; cardHover: string }> = {
    logistics: { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   hint: 'text-blue-400',   cardHover: 'hover:border-blue-300' },
    equipment: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', hint: 'text-orange-400', cardHover: 'hover:border-orange-300' },
    transport: { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   hint: 'text-teal-400',   cardHover: 'hover:border-teal-300' },
  };
  const accent = ACCENTS[workspace.type] ?? ACCENTS.logistics;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
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
              <button type="submit" className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                Create Task
              </button>
            </div>
          </form>
        )}

        {/* Board area: optional template sidebar + kanban */}
        <div className="flex gap-4 items-start">

          {/* Template sidebar */}
          {showSidebar && (
            <div className={`hidden md:flex flex-col w-48 shrink-0 rounded-xl border ${accent.border} ${accent.bg} p-3`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold uppercase tracking-wide ${accent.text}`}>
                  {TYPE_ICONS[workspace.type]} Template
                </span>
                <button
                  onClick={() => setTemplateItems([])}
                  className={`text-xs ${accent.hint} hover:text-gray-500 transition`}
                  title="Dismiss all"
                >
                  ✕
                </button>
              </div>
              <p className={`text-xs mb-3 ${accent.hint}`}>Drag tasks into the board →</p>
              <div className="space-y-2 overflow-y-auto max-h-[70vh]">
                {templateItems.map((item, idx) => (
                  <div
                    key={item.title}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('template-idx', String(idx));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`bg-white border border-gray-200 rounded-lg p-2.5 cursor-grab active:cursor-grabbing shadow-sm ${accent.cardHover} hover:shadow-md transition select-none`}
                  >
                    <p className="text-xs font-medium text-gray-800 leading-snug">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-snug">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kanban columns */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.key);
              const isOver = dragOverColumn === col.key;
              return (
                <div
                  key={col.key}
                  className={`rounded-xl border ${col.tone} p-3 min-h-[200px] transition-all ${isOver ? `ring-2 ${col.dropTone} ring-offset-1` : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOverColumn(col.key); }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null);
                  }}
                  onDrop={e => handleColumnDrop(e, col.key)}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                    <span className="text-xs text-gray-500">{colTasks.length}</span>
                  </div>

                  {isOver && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg py-3 mb-2 text-center text-xs text-gray-400">
                      Drop here
                    </div>
                  )}

                  <div className="space-y-2">
                    {colTasks.length === 0 && !isOver && (
                      <p className="text-xs text-gray-400 px-1">No tasks.</p>
                    )}
                    {colTasks.map(task => {
                      const canEditTask = canActInWorkspace || isAssignee(task);
                      const isDragging = draggingTaskId === task._id;
                      return (
                        <div
                          key={task._id}
                          draggable={canEditTask}
                          onDragStart={e => {
                            e.dataTransfer.setData('task-id', task._id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggingTaskId(task._id);
                          }}
                          onDragEnd={() => setDraggingTaskId(null)}
                          className={`bg-white rounded-lg shadow-sm border border-gray-100 p-3 transition-opacity select-none
                            ${canEditTask ? 'cursor-grab active:cursor-grabbing' : ''}
                            ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 flex-1 min-w-0 break-words">{task.title}</p>
                            {canActInWorkspace && (
                              <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={() => handleDelete(task)}
                                className="text-gray-300 hover:text-red-500 transition text-sm shrink-0"
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
                                  onMouseDown={e => e.stopPropagation()}
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

        {/* Files section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">📎 Files</h2>
            {canActInWorkspace && (
              <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-sm font-medium transition ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {uploading ? 'Uploading…' : '+ Upload File'}
                <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
              </label>
            )}
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-gray-400">No files uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {files.map(f => (
                <li key={f._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">
                      {f.mimetype.includes('pdf') ? '📄' : f.mimetype.includes('image') ? '🖼️' : f.mimetype.includes('word') || f.mimetype.includes('docx') ? '📝' : '📁'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{f.originalName}</p>
                      <p className="text-xs text-gray-400">
                        {(f.size / 1024).toFixed(0)} KB · {f.uploadedBy?.name ?? 'Unknown'} · {new Date(f.uploadedAt).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => downloadFile(f._id)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Download
                    </button>
                    {canActInWorkspace && (
                      <button onClick={() => deleteFile(f._id, f.originalName)} className="text-xs text-red-400 hover:text-red-600 transition">
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
