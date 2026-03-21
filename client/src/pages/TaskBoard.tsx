import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high';

interface Member {
  _id: string;
  name: string;
  email: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  assignedTo: Member;
  assignedBy: Member;
  createdAt: string;
}

const STATUS_COLUMNS: { key: TaskStatus; label: string; icon: string; headerColor: string; dotColor: string }[] = [
  { key: 'pending',     label: 'To Do',       icon: '📋', headerColor: 'bg-gray-100 border-gray-200',   dotColor: 'bg-gray-400' },
  { key: 'in_progress', label: 'In Progress',  icon: '🔄', headerColor: 'bg-blue-50 border-blue-200',   dotColor: 'bg-blue-500' },
  { key: 'completed',   label: 'Done',         icon: '✅', headerColor: 'bg-green-50 border-green-200', dotColor: 'bg-green-500' },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high:   'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low:    'bg-green-100 text-green-700 border border-green-200',
};

const STATUS_NEXT: Record<TaskStatus, TaskStatus | null> = {
  pending:     'in_progress',
  in_progress: 'completed',
  completed:   null,
};

const STATUS_PREV: Record<TaskStatus, TaskStatus | null> = {
  pending:     null,
  in_progress: 'pending',
  completed:   'in_progress',
};

function formatDeadline(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const label = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  if (days < 0) return { label, overdue: true };
  if (days <= 3) return { label, overdue: false, urgent: true };
  return { label, overdue: false, urgent: false };
}

export default function TaskBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPresident = user?.role === 'president';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium' as TaskPriority,
    deadline: '',
  });

  const dashboardPath = isPresident ? '/president/dashboard' : '/committee/dashboard';

  const sidebarLinks = isPresident
    ? [
        { icon: '🏠', label: 'Dashboard', path: '/president/dashboard' },
        { icon: '📅', label: 'Events',    path: '#' },
        { icon: '✅', label: 'Tasks',     path: '/president/tasks', active: true },
        { icon: '💰', label: 'Budget',    path: '#' },
        { icon: '👥', label: 'Members',   path: '#' },
        { icon: '🗂️', label: 'Safety Files', path: '#' },
      ]
    : [
        { icon: '🏠', label: 'Dashboard', path: '/committee/dashboard' },
        { icon: '📅', label: 'Events',    path: '#' },
        { icon: '✅', label: 'Tasks',     path: '/committee/tasks', active: true },
        { icon: '👥', label: 'Members',   path: '#' },
      ];

  useEffect(() => {
    fetchTasks();
    if (isPresident) fetchMembers();
  }, []);

  async function fetchTasks() {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers() {
    try {
      const res = await api.get('/tasks/members');
      setMembers(res.data);
    } catch {
      // silently fail
    }
  }

  async function updateStatus(taskId: string, newStatus: TaskStatus) {
    try {
      const res = await api.patch(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
    } catch {
      setError('Failed to update task status.');
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch {
      setError('Failed to delete task.');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.assignedTo) return;
    setSubmitting(true);
    try {
      const res = await api.post('/tasks', {
        title: form.title,
        description: form.description,
        assignedTo: form.assignedTo,
        priority: form.priority,
        deadline: form.deadline || undefined,
      });
      setTasks(prev => [res.data, ...prev]);
      setShowModal(false);
      setForm({ title: '', description: '', assignedTo: '', priority: 'medium', deadline: '' });
    } catch {
      setError('Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  }

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const bannerClass = isPresident
    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
    : 'bg-gradient-to-r from-purple-600 to-indigo-700';

  const activeSidebarClass = isPresident
    ? 'bg-yellow-50 text-yellow-800 font-medium'
    : 'bg-purple-50 text-purple-700 font-medium';

  const accentBtn = isPresident
    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
    : 'bg-purple-600 hover:bg-purple-700 text-white';

  const stats = [
    { label: 'Total Tasks',    value: tasks.length,                              icon: '📋', color: 'bg-blue-50 text-blue-700' },
    { label: 'To Do',          value: byStatus('pending').length,                icon: '🕐', color: 'bg-gray-50 text-gray-700' },
    { label: 'In Progress',    value: byStatus('in_progress').length,            icon: '🔄', color: 'bg-blue-50 text-blue-700' },
    { label: 'Completed',      value: byStatus('completed').length,              icon: '✅', color: 'bg-green-50 text-green-700' },
  ];

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
                  href={link.path === '#' ? '#' : undefined}
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

          {/* Welcome Banner */}
          <div className={`${bannerClass} rounded-xl p-6 text-white mb-6 shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {isPresident ? '👑 Task Management' : '✅ My Tasks'}
                </h1>
                <p className="text-sm opacity-90">
                  {isPresident
                    ? 'Assign tasks to committee members and track progress in real time.'
                    : 'View and update the tasks assigned to you.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {isPresident ? 'President' : 'Committee'}
                </span>
                {isPresident && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-white text-yellow-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-yellow-50 transition shadow-sm"
                  >
                    + New Task
                  </button>
                )}
              </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-lg mb-2 ${s.color}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Kanban Board */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse">📋</div>
                <p className="text-sm">Loading tasks...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STATUS_COLUMNS.map(col => {
                const colTasks = byStatus(col.key);
                return (
                  <div key={col.key} className="flex flex-col">
                    {/* Column Header */}
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border ${col.headerColor} mb-0`}>
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                      <span className="ml-auto text-xs font-semibold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-3 bg-gray-100/60 rounded-b-xl p-3 min-h-[200px]">
                      {colTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                          <span className="text-3xl mb-2">{col.icon}</span>
                          <p className="text-xs">No tasks here</p>
                        </div>
                      ) : (
                        colTasks.map(task => {
                          const dl = formatDeadline(task.deadline);
                          const nextStatus = STATUS_NEXT[task.status];
                          const prevStatus = STATUS_PREV[task.status];
                          return (
                            <div
                              key={task._id}
                              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition"
                            >
                              {/* Title row */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="font-semibold text-gray-800 text-sm leading-snug flex-1">{task.title}</p>
                                {isPresident && (
                                  <button
                                    onClick={() => deleteTask(task._id)}
                                    className="text-gray-300 hover:text-red-500 transition text-xs shrink-0 mt-0.5"
                                    title="Delete task"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* Description */}
                              {task.description && (
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Priority + Deadline */}
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
                                  {task.priority}
                                </span>
                                {dl && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                    dl.overdue
                                      ? 'bg-red-50 text-red-600 border-red-200'
                                      : dl.urgent
                                      ? 'bg-orange-50 text-orange-600 border-orange-200'
                                      : 'bg-gray-50 text-gray-500 border-gray-200'
                                  }`}>
                                    {dl.overdue ? '⚠ Overdue · ' : '📅 '}{dl.label}
                                  </span>
                                )}
                              </div>

                              {/* Assignee */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-semibold shrink-0">
                                  {task.assignedTo.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs text-gray-500 truncate">{task.assignedTo.name}</span>
                              </div>

                              {/* Move buttons */}
                              <div className="flex gap-2 pt-3 border-t border-gray-50">
                                {prevStatus && (
                                  <button
                                    onClick={() => updateStatus(task._id, prevStatus)}
                                    className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition"
                                  >
                                    ← Back
                                  </button>
                                )}
                                {nextStatus && (
                                  <button
                                    onClick={() => updateStatus(task._id, nextStatus)}
                                    className={`flex-1 text-xs rounded-lg py-1.5 transition font-medium ${
                                      nextStatus === 'in_progress'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                    }`}
                                  >
                                    {nextStatus === 'in_progress' ? 'Start →' : 'Done ✓'}
                                  </button>
                                )}
                                {!prevStatus && !nextStatus && (
                                  <span className="text-xs text-green-600 font-medium">Completed ✓</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Create task shortcut at bottom of To Do column (president) */}
                      {isPresident && col.key === 'pending' && (
                        <button
                          onClick={() => setShowModal(true)}
                          className="border-2 border-dashed border-gray-200 rounded-xl py-3 text-gray-400 text-xs hover:border-yellow-300 hover:text-yellow-600 transition"
                        >
                          + Add Task
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Create Task Modal */}
      {showModal && isPresident && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Create New Task</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Set up event venue"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional details about the task..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                />
              </div>

              {/* Assign To */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assign To *</label>
                <select
                  required
                  value={form.assignedTo}
                  onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
                >
                  <option value="">Select committee member</option>
                  {members.map(m => (
                    <option key={m._id} value={m._id}>{m.name} — {m.email}</option>
                  ))}
                </select>
                {members.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No committee members found. Register committee accounts first.</p>
                )}
              </div>

              {/* Priority + Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 ${accentBtn} text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60`}
                >
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
