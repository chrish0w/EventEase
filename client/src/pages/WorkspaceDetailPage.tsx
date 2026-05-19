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
  completionRequest?: {
    status: 'none' | 'pending' | 'approved' | 'rejected';
    note?: string;
    responseNote?: string;
    requestedBy?: UserRef;
    requestedAt?: string;
    reviewedBy?: UserRef;
    reviewedAt?: string;
  };
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

interface SafetyTemplate {
  _id: string;
  title: string;
  type: 'text' | 'pdf';
  content: string | null;
  fileUrl?: string | null;
  updatedAt?: string;
}

interface TemplateItem {
  title: string;
  description: string;
}

interface BudgetLineItem {
  _id?: string;
  description: string;
  assignedAmount: number;
  actualAmount: number;
  notes: string;
}

const COLUMNS: { key: Task['status']; label: string; tone: string; dropTone: string }[] = [
  { key: 'todo',        label: 'To do',       tone: 'bg-gray-50 border-gray-200',   dropTone: 'ring-gray-400' },
  { key: 'in_progress', label: 'In progress', tone: 'bg-blue-50 border-blue-200',   dropTone: 'ring-blue-400' },
  { key: 'done',        label: 'Done',        tone: 'bg-green-50 border-green-200', dropTone: 'ring-green-400' },
];

const STATUS_BADGE: Record<Task['status'], string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};
const STATUS_LABEL: Record<Task['status'], string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

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
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [budgetMsg, setBudgetMsg] = useState('');
  const [budgetDirty, setBudgetDirty] = useState(false);
  const [safetyTemplates, setSafetyTemplates] = useState<SafetyTemplate[]>([]);
  const [safetyDraft, setSafetyDraft] = useState({ title: '', content: '' });
  const [safetyUploadTitle, setSafetyUploadTitle] = useState('');
  const [safetyUploadFile, setSafetyUploadFile] = useState<File | null>(null);
  const [safetySaving, setSafetySaving] = useState(false);
  const [attachingSafetyId, setAttachingSafetyId] = useState<string | null>(null);
  const [safetyMsg, setSafetyMsg] = useState('');
  const [safetyMsgTone, setSafetyMsgTone] = useState<'success' | 'error'>('success');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskEditMode, setTaskEditMode] = useState(false);
  const [taskEditDraft, setTaskEditDraft] = useState({ description: '', dueDate: '', assigneeId: '' });
  const [completionNote, setCompletionNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [savingTask, setSavingTask] = useState(false);

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

  useEffect(() => {
    if (!workspace || workspace.type !== 'budget' || isPresident || !selectedClub?.clubId) return;
    api.get(`/budget/event/${workspace.eventId}?clubId=${selectedClub.clubId}`)
      .then(res => {
        setBudgetItems(res.data.event.lineItems.map((item: BudgetLineItem) => ({
          _id: item._id,
          description: item.description,
          assignedAmount: item.assignedAmount,
          actualAmount: item.actualAmount,
          notes: item.notes,
        })));
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setBudgetMsg(msg || 'Failed to load budget data.');
      });
  }, [workspace, isPresident, selectedClub]);

  useEffect(() => {
    if (!workspace || workspace.type !== 'safety' || !selectedClub?.clubId) return;
    api.get(`/disclaimer-templates?clubId=${selectedClub.clubId}`)
      .then(res => setSafetyTemplates(res.data))
      .catch(() => setSafetyTemplates([]));
  }, [workspace, selectedClub?.clubId]);

  const canActInWorkspace = useMemo(() => {
    if (!workspace || !user) return false;
    if (isPresident) return false;
    if (workspace.owner?._id === user.id) return true;
    return workspace.collaborators.some(c => c._id === user.id);
  }, [workspace, user, isPresident]);

  const isAssignee = (task: Task) => task.assignedTo.some(u => u._id === user?.id);

  const createSafetyTemplate = async (mode: 'text' | 'pdf') => {
    if (!selectedClub?.clubId || !workspaceId) return;
    if (mode === 'text' && (!safetyDraft.title.trim() || !safetyDraft.content.trim())) return;
    if (mode === 'pdf' && (!safetyUploadTitle.trim() || !safetyUploadFile)) return;
    setSafetySaving(true);
    setSafetyMsg('');
    setSafetyMsgTone('success');
    try {
      const fd = new FormData();
      fd.append('clubId', selectedClub.clubId);
      fd.append('workspaceId', workspaceId);
      fd.append('type', mode);
      if (mode === 'text') {
        fd.append('title', safetyDraft.title.trim());
        fd.append('content', safetyDraft.content.trim());
      } else {
        fd.append('title', safetyUploadTitle.trim());
        fd.append('file', safetyUploadFile as File);
      }
      const res = await api.post('/disclaimer-templates', fd);
      setSafetyTemplates(prev => [res.data, ...prev]);
      setSafetyDraft({ title: '', content: '' });
      setSafetyUploadTitle('');
      setSafetyUploadFile(null);
      setSafetyMsgTone('success');
      setSafetyMsg('Safety disclaimer saved. Select it below to attach it to this event.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSafetyMsgTone('error');
      setSafetyMsg(msg || 'Failed to save safety disclaimer.');
    } finally {
      setSafetySaving(false);
    }
  };

  const attachSafetyDisclaimer = async (templateId: string) => {
    if (!workspaceId) return;
    setAttachingSafetyId(templateId);
    setSafetyMsg('');
    setSafetyMsgTone('success');
    try {
      await api.put(`/workspaces/${workspaceId}/safety-disclaimer`, { templateId });
      setSafetyMsgTone('success');
      setSafetyMsg('Safety disclaimer attached to this event.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSafetyMsgTone('error');
      setSafetyMsg(msg || 'Failed to attach safety disclaimer.');
    } finally {
      setAttachingSafetyId(null);
    }
  };

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

  const changeOwner = async () => {
    if (!workspaceId || !newOwnerId) return;
    try {
      const res = await api.put(`/workspaces/${workspaceId}`, { owner: newOwnerId });
      setWorkspace(prev => prev ? { ...prev, owner: res.data.owner } : prev);
      setEditingOwner(false);
      setNewOwnerId('');
    } catch {
      setError('Failed to update owner.');
    }
  };

  const updateStatus = async (task: Task, status: Task['status']) => {
    try {
      const res = await api.put(`/tasks/${task._id}`, { status });
      setTasks(prev => prev.map(t => t._id === task._id ? res.data : t));
      setSelectedTask(prev => prev?._id === task._id ? res.data : prev);
    } catch {
      alert('Failed to update task.');
    }
  };

  const updateTaskDetail = async () => {
    if (!selectedTask) return;
    setSavingTask(true);
    try {
      const res = await api.put(`/tasks/${selectedTask._id}`, {
        description: taskEditDraft.description,
        dueDate: taskEditDraft.dueDate || undefined,
        assignedTo: taskEditDraft.assigneeId ? [taskEditDraft.assigneeId] : [],
      });
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? res.data : t));
      setSelectedTask(res.data);
      setTaskEditMode(false);
    } catch {
      alert('Failed to update task.');
    } finally {
      setSavingTask(false);
    }
  };

  const submitCompletionRequest = async () => {
    if (!selectedTask) return;
    setSavingTask(true);
    try {
      const res = await api.post(`/tasks/${selectedTask._id}/completion-request`, { note: completionNote });
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? res.data : t));
      setSelectedTask(res.data);
      setCompletionNote('');
    } catch {
      alert('Failed to submit completion request.');
    } finally {
      setSavingTask(false);
    }
  };

  const reviewCompletionRequest = async (decision: 'approved' | 'rejected') => {
    if (!selectedTask) return;
    setSavingTask(true);
    try {
      const res = await api.put(`/tasks/${selectedTask._id}/completion-request`, { decision, responseNote: reviewNote });
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? res.data : t));
      setSelectedTask(res.data);
      setReviewNote('');
    } catch {
      alert('Failed to review completion request.');
    } finally {
      setSavingTask(false);
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  const updateBudgetItem = (idx: number, field: keyof BudgetLineItem, value: string | number) => {
    setBudgetItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    setBudgetDirty(true);
  };

  const addBudgetItem = () => {
    setBudgetItems(prev => [...prev, { description: '', assignedAmount: 0, actualAmount: 0, notes: '' }]);
    setBudgetDirty(true);
  };

  const removeBudgetItem = (idx: number) => {
    setBudgetItems(prev => prev.filter((_, i) => i !== idx));
    setBudgetDirty(true);
  };

  const saveBudget = async () => {
    if (!workspace || !selectedClub?.clubId) return;
    setBudgetSaving(true);
    setBudgetMsg('');
    try {
      const res = await api.put(`/budget/event/${workspace.eventId}`, {
        clubId: selectedClub.clubId,
        lineItems: budgetItems,
      });
      setBudgetItems(res.data.event.lineItems.map((item: BudgetLineItem) => ({
        _id: item._id,
        description: item.description,
        assignedAmount: item.assignedAmount,
        actualAmount: item.actualAmount,
        notes: item.notes,
      })));
      setBudgetDirty(false);
      setBudgetMsg('Saved!');
      setTimeout(() => setBudgetMsg(''), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setBudgetMsg(msg || 'Failed to save budget.');
    } finally {
      setBudgetSaving(false);
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
      <div className={`${isPresident ? 'president-workspace bg-[#201609]' : 'committee-workspace bg-[#140f24]'} min-h-screen`}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-400">Loading workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className={`${isPresident ? 'president-workspace bg-[#201609]' : 'committee-workspace bg-[#140f24]'} min-h-screen`}>
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
    <div className={`${isPresident ? 'president-workspace bg-[#201609]' : 'committee-workspace bg-[#140f24]'} min-h-screen`}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/${isPresident ? 'president' : 'committee'}/events/${workspace.eventId}/workspaces`)}
            className={`${isPresident ? 'text-yellow-100/80 hover:text-white' : 'text-purple-100/80 hover:text-white'} transition`}
          >
            ← Back
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{TYPE_ICONS[workspace.type] ?? '📌'}</span>
              <h1 className="text-xl font-bold text-white">{workspace.name}</h1>
              <span className={`${isPresident ? 'text-yellow-100/70' : 'text-purple-100/70'} text-xs`}>({workspace.type})</span>
            </div>
            {workspace.description && <p className={`${isPresident ? 'text-yellow-100/80' : 'text-purple-100/80'} mt-0.5 text-sm`}>{workspace.description}</p>}
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm ${isPresident ? 'text-yellow-100/80' : 'text-purple-100/80'}`}>
              <span className="flex items-center gap-2">
                👤 Owner:{' '}
                {editingOwner && isPresident ? (
                  <>
                    <select
                      value={newOwnerId}
                      onChange={e => setNewOwnerId(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select member</option>
                      {members.map(m => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={changeOwner}
                      disabled={!newOwnerId}
                      className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingOwner(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span>{workspace.owner?.name ?? 'Unassigned'}</span>
                  </>
                )}
              </span>
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

        {/* Budget line items are completed by assigned budget workspace owners/collaborators. */}
        {workspace.type === 'budget' && canActInWorkspace && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">💰 Budget Line Items</h2>
              <div className="flex items-center gap-3">
                {budgetMsg && (
                  <span className={`text-xs font-medium ${budgetMsg === 'Saved!' ? 'text-green-600' : 'text-red-500'}`}>
                    {budgetMsg}
                  </span>
                )}
                {budgetDirty && (
                  <button
                    onClick={saveBudget}
                    disabled={budgetSaving}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {budgetSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                )}
                <button
                  onClick={addBudgetItem}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  + Add Item
                </button>
              </div>
            </div>
            {budgetItems.length === 0 ? (
              <p className="text-sm text-gray-400">No budget items yet. Click "+ Add Item" to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 pr-3">Description</th>
                      <th className="pb-2 pr-3 text-right whitespace-nowrap">Budgeted (AUD)</th>
                      <th className="pb-2 pr-3 text-right whitespace-nowrap">Actual (AUD)</th>
                      <th className="pb-2 pr-3">Notes</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {budgetItems.map((item, idx) => {
                      return (
                        <tr key={idx} className="group">
                          <td className="py-2 pr-3">
                            <input
                              value={item.description}
                              onChange={e => updateBudgetItem(idx, 'description', e.target.value)}
                              placeholder="e.g. Venue hire"
                              className="w-full border-0 border-b border-transparent focus:border-gray-300 focus:outline-none px-0 py-0.5 text-sm bg-transparent"
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.assignedAmount === 0 ? '' : item.assignedAmount}
                              onChange={e => updateBudgetItem(idx, 'assignedAmount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-24 border-0 border-b border-transparent focus:border-gray-300 focus:outline-none px-0 py-0.5 text-sm bg-transparent text-right"
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.actualAmount === 0 ? '' : item.actualAmount}
                              onChange={e => updateBudgetItem(idx, 'actualAmount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-24 border-0 border-b border-transparent focus:border-gray-300 focus:outline-none px-0 py-0.5 text-sm bg-transparent text-right"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={item.notes}
                              onChange={e => updateBudgetItem(idx, 'notes', e.target.value)}
                              placeholder="—"
                              className="w-full border-0 border-b border-transparent focus:border-gray-300 focus:outline-none px-0 py-0.5 text-sm bg-transparent text-gray-500"
                            />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => removeBudgetItem(idx)}
                              className="text-gray-300 hover:text-red-500 transition text-sm opacity-0 group-hover:opacity-100"
                              title="Remove"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="text-xs font-semibold text-gray-600 border-t border-gray-200">
                      <td className="pt-2 pr-3">Total</td>
                      <td className="pt-2 pr-3 text-right">{formatCurrency(budgetItems.reduce((s, i) => s + i.assignedAmount, 0))}</td>
                      <td className="pt-2 pr-3 text-right">{formatCurrency(budgetItems.reduce((s, i) => s + i.actualAmount, 0))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {workspace.type === 'safety' && canActInWorkspace && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">⚠️ Safety Disclaimers</h2>
                <p className="mt-0.5 text-sm text-gray-500">Create or upload a reusable safety disclaimer, then attach it to this event.</p>
              </div>
              {safetyMsg && (
                <span className={`max-w-md text-right text-xs font-medium ${safetyMsgTone === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                  {safetyMsg}
                </span>
              )}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-amber-900">Create new text disclaimer</p>
                <input
                  value={safetyDraft.title}
                  onChange={e => setSafetyDraft(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Safety disclaimer title"
                  className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <textarea
                  value={safetyDraft.content}
                  onChange={e => setSafetyDraft(prev => ({ ...prev, content: e.target.value }))}
                  rows={5}
                  placeholder="Write the safety disclaimer or risk acknowledgement here..."
                  className="w-full resize-none rounded-lg border border-amber-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <button
                  type="button"
                    onClick={() => createSafetyTemplate('text')}
                  disabled={safetySaving || !safetyDraft.title.trim() || !safetyDraft.content.trim()}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                    {safetySaving ? 'Saving...' : 'Save Text Disclaimer'}
                </button>
                </div>
                <div className="border-t border-amber-200 pt-4">
                  <p className="text-sm font-semibold text-amber-900">Upload PDF disclaimer</p>
                  <div className="mt-3 space-y-3">
                    <input
                      value={safetyUploadTitle}
                      onChange={e => setSafetyUploadTitle(e.target.value)}
                      placeholder="Uploaded disclaimer title"
                      className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={e => setSafetyUploadFile(e.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => createSafetyTemplate('pdf')}
                      disabled={safetySaving || !safetyUploadTitle.trim() || !safetyUploadFile}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {safetySaving ? 'Uploading...' : 'Upload PDF Disclaimer'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-800">Saved safety disclaimers</h3>
                {safetyTemplates.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400">No saved safety disclaimers yet.</p>
                ) : (
                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {safetyTemplates.map(template => (
                      <div key={template._id} className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{template.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {template.type === 'pdf' ? 'PDF safety disclaimer' : template.content}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => attachSafetyDisclaimer(template._id)}
                            disabled={attachingSafetyId === template._id}
                            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {attachingSafetyId === template._id ? 'Attaching...' : 'Attach'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskEditMode(false);
                            setTaskEditDraft({
                              description: task.description ?? '',
                              dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
                              assigneeId: task.assignedTo[0]?._id ?? '',
                            });
                          }}
                          className={`bg-white rounded-lg shadow-sm border border-gray-100 p-3 transition-opacity select-none
                            ${canEditTask ? 'cursor-pointer' : 'cursor-pointer'}
                            ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 flex-1 min-w-0 break-words">{task.title}</p>
                            {canActInWorkspace && (
                              <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); handleDelete(task); }}
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
                              {task.completionRequest?.status === 'pending' && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">Awaiting approval</span>
                              )}
	                          </div>
                          {canEditTask && (
                            <div className="flex gap-1 mt-2">
                              {COLUMNS.filter(c => c.key !== col.key).map(c => (
                                <button
                                  key={c.key}
                                  onMouseDown={e => e.stopPropagation()}
                                  onClick={e => { e.stopPropagation(); updateStatus(task, c.key); }}
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

      {/* Task detail modal */}
      {selectedTask && (
        <div
          className="!fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${STATUS_BADGE[selectedTask.status]}`}>
                  {STATUS_LABEL[selectedTask.status]}
                </span>
                <h2 className="text-base font-bold text-gray-800 break-words">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0 mt-0.5"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                {taskEditMode ? (
                  <textarea
                    value={taskEditDraft.description}
                    onChange={e => setTaskEditDraft(d => ({ ...d, description: e.target.value }))}
                    rows={3}
                    placeholder="Add a description…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedTask.description || <span className="text-gray-400 italic">No description provided.</span>}
                  </p>
                )}
              </div>

              {/* Grid info */}
              <div className="grid grid-cols-2 gap-4">
                {/* Assigned To */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned To</p>
                  {taskEditMode ? (
                    <select
                      value={taskEditDraft.assigneeId}
                      onChange={e => setTaskEditDraft(d => ({ ...d, assigneeId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {workspace?.owner && (
                        <option value={workspace.owner._id}>{workspace.owner.name} (owner)</option>
                      )}
                      {workspace?.collaborators.map(c => (
                        <option key={c._id} value={c._id}>{c.name} (collaborator)</option>
                      ))}
                      {memberMembers
                        .filter(m => m._id !== workspace?.owner?._id && !workspace?.collaborators.some(c => c._id === m._id))
                        .map(m => (
                          <option key={m._id} value={m._id}>{m.name}</option>
                        ))}
                    </select>
                  ) : selectedTask.assignedTo.length > 0 ? (
                    <div className="space-y-1">
                      {selectedTask.assignedTo.map(u => (
                        <div key={u._id} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700">{u.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Due Date</p>
                  {taskEditMode ? (
                    <input
                      type="date"
                      value={taskEditDraft.dueDate}
                      onChange={e => setTaskEditDraft(d => ({ ...d, dueDate: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-700">
                      {selectedTask.dueDate
                        ? new Date(selectedTask.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span className="text-gray-400">No deadline set</span>}
                    </p>
                  )}
                </div>

                {/* Created By */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Created By</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                      {selectedTask.createdBy?.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <span className="text-sm text-gray-700">{selectedTask.createdBy?.name ?? '—'}</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[selectedTask.status]}`}>
                    {STATUS_LABEL[selectedTask.status]}
                  </span>
                </div>
              </div>

              {selectedTask.completionRequest?.status && selectedTask.completionRequest.status !== 'none' && (
                <div className={`rounded-xl border p-3 ${
                  selectedTask.completionRequest.status === 'approved'
                    ? 'border-green-200 bg-green-50'
                    : selectedTask.completionRequest.status === 'rejected'
                      ? 'border-red-200 bg-red-50'
                      : 'border-amber-200 bg-amber-50'
                }`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Completion request</p>
                  <p className="mt-1 text-sm text-gray-700">
                    Status: <span className="font-semibold capitalize">{selectedTask.completionRequest.status}</span>
                  </p>
                  {selectedTask.completionRequest.note && (
                    <p className="mt-2 text-sm text-gray-600">{selectedTask.completionRequest.note}</p>
                  )}
                  {selectedTask.completionRequest.responseNote && (
                    <p className="mt-2 text-sm text-gray-600">President response: {selectedTask.completionRequest.responseNote}</p>
                  )}
                </div>
              )}

              {!isPresident && isAssignee(selectedTask) && selectedTask.status !== 'done' && selectedTask.completionRequest?.status !== 'pending' && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm font-semibold text-blue-900">Finished this task?</p>
                  <textarea
                    value={completionNote}
                    onChange={e => setCompletionNote(e.target.value)}
                    rows={2}
                    placeholder="Optional note for the president..."
                    className="mt-2 w-full resize-none rounded-lg border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    onClick={submitCompletionRequest}
                    disabled={savingTask}
                    className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Submit completion request
                  </button>
                </div>
              )}

              {isPresident && selectedTask.completionRequest?.status === 'pending' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">Review completion request</p>
                  <textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    rows={2}
                    placeholder="Optional response note..."
                    className="mt-2 w-full resize-none rounded-lg border border-amber-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => reviewCompletionRequest('approved')}
                      disabled={savingTask}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reviewCompletionRequest('rejected')}
                      disabled={savingTask}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex gap-2">
                {(canActInWorkspace || isAssignee(selectedTask)) && !taskEditMode && (
                  COLUMNS.filter(c => c.key !== selectedTask.status).map(c => (
                    <button
                      key={c.key}
                      onClick={() => updateStatus(selectedTask, c.key)}
                      className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition font-medium"
                    >
                      → {c.label}
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                {canActInWorkspace && !taskEditMode && (
                  <>
                    <button
                      onClick={() => setTaskEditMode(true)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { handleDelete(selectedTask); setSelectedTask(null); }}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition"
                    >
                      Delete
                    </button>
                  </>
                )}
                {taskEditMode && (
                  <>
                    <button
                      onClick={() => setTaskEditMode(false)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateTaskDetail}
                      disabled={savingTask}
                      className="text-xs font-medium px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {savingTask ? 'Saving…' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
