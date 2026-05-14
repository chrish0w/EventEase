import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

type TaskStatus = 'todo' | 'in_progress' | 'done';

interface WorkspaceRef { _id: string; name: string; type: string }
interface EventRef    { _id: string; title: string; date: string }
interface UserRef     { _id: string; name: string; email: string }

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  assignedTo: UserRef[];
  createdBy: UserRef;
  workspaceId: WorkspaceRef;
  eventId: EventRef;
}

const COLUMNS: { key: TaskStatus; label: string; headerColor: string; dotColor: string; icon: string }[] = [
  { key: 'todo',        label: 'To Do',       headerColor: 'bg-gray-100 border-gray-200',   dotColor: 'bg-gray-400',  icon: '📋' },
  { key: 'in_progress', label: 'In Progress',  headerColor: 'bg-blue-50 border-blue-200',   dotColor: 'bg-blue-500',  icon: '🔄' },
  { key: 'done',        label: 'Done',         headerColor: 'bg-green-50 border-green-200', dotColor: 'bg-green-500', icon: '✅' },
];

const STATUS_NEXT: Record<TaskStatus, TaskStatus | null> = {
  todo: 'in_progress', in_progress: 'done', done: null,
};
const STATUS_PREV: Record<TaskStatus, TaskStatus | null> = {
  todo: null, in_progress: 'todo', done: 'in_progress',
};

const TYPE_ICONS: Record<string, string> = {
  budget: '💰', logistics: '📦', equipment: '🔧',
  transport: '🚗', safety: '⚠️', documents: '📁', tasks: '✅', custom: '📌',
};

export default function CommitteeTasksPage() {
  const { selectedClub } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sidebarLinks = [
    { icon: '🏠', label: 'Dashboard',     path: '/committee/dashboard' },
    { icon: '←',  label: 'Explore Portal', path: '/user/dashboard' },
    { icon: '📅', label: 'Events',        path: '/committee/events' },
    { icon: '✅', label: 'Tasks',         path: '/committee/tasks', active: true },
  ];

  useEffect(() => {
    api.get('/tasks/my')
      .then(res => setTasks(res.data))
      .catch(() => setError('Failed to load tasks.'))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...res.data } : t));
    } catch {
      setError('Failed to update task status.');
    }
  };

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const stats = [
    { label: 'Total Tasks',  value: tasks.length,                   icon: '📋', color: 'bg-blue-50 text-blue-700' },
    { label: 'To Do',        value: byStatus('todo').length,        icon: '🕐', color: 'bg-gray-50 text-gray-700' },
    { label: 'In Progress',  value: byStatus('in_progress').length, icon: '🔄', color: 'bg-blue-50 text-blue-700' },
    { label: 'Completed',    value: byStatus('done').length,        icon: '✅', color: 'bg-green-50 text-green-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">

        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {selectedClub?.clubName || 'Club'} Workspace
            </p>
            <nav className="space-y-1">
              {sidebarLinks.map(link => (
                <a
                  key={link.label}
                  href="#"
                  onClick={e => { e.preventDefault(); navigate(link.path); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                    link.active
                      ? 'bg-purple-50 text-purple-700 font-medium'
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
        <main className="flex-1 min-w-0">

          {/* Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">✅ My Tasks</h1>
                <p className="text-sm opacity-90">Tasks assigned to you across all event workspaces.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Committee
              </span>
            </div>
          </div>

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

          {/* Kanban */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse">📋</div>
                <p className="text-sm">Loading your tasks...</p>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 font-medium">No tasks assigned to you yet</p>
              <p className="text-gray-400 text-sm mt-1">Tasks created in event workspaces will appear here when assigned to you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COLUMNS.map(col => {
                const colTasks = byStatus(col.key);
                return (
                  <div key={col.key} className="flex flex-col">
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border ${col.headerColor}`}>
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                      <span className="ml-auto text-xs font-semibold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 bg-gray-100/60 rounded-b-xl p-3 min-h-[200px]">
                      {colTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                          <span className="text-3xl mb-2">{col.icon}</span>
                          <p className="text-xs">No tasks here</p>
                        </div>
                      ) : (
                        colTasks.map(task => {
                          const nextStatus = STATUS_NEXT[task.status];
                          const prevStatus = STATUS_PREV[task.status];
                          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                          return (
                            <div key={task._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
                              <p className="font-semibold text-gray-800 text-sm leading-snug mb-1">{task.title}</p>

                              {task.description && (
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                              )}

                              {/* Context: workspace + event */}
                              <div className="flex items-center gap-1 mb-2 flex-wrap">
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  {TYPE_ICONS[task.workspaceId?.type] || '📌'} {task.workspaceId?.name}
                                </span>
                                <span className="text-xs text-gray-400 truncate max-w-[120px]">
                                  · {task.eventId?.title}
                                </span>
                              </div>

                              {task.dueDate && (
                                <p className={`text-xs mb-2 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                  {isOverdue ? '⚠ Overdue · ' : '📅 '}
                                  {new Date(task.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                </p>
                              )}

                              <div className="flex gap-2 pt-2 border-t border-gray-50">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
