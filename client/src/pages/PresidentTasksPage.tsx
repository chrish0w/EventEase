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

const TYPE_ICONS: Record<string, string> = {
  budget: '💰', logistics: '📦', equipment: '🔧',
  transport: '🚗', safety: '⚠️', documents: '📁', tasks: '✅', custom: '📌',
};

const sidebarLinks = [
  { icon: '🏠', label: 'Dashboard',     path: '/president/dashboard' },
  { icon: '←',  label: 'Explore Portal', path: '/user/dashboard' },
  { icon: '📅', label: 'Events',        path: '/president/events' },
  { icon: '✅', label: 'Tasks',         path: '/president/tasks', active: true },
  { icon: '💰', label: 'Budget',        path: '/president/budget' },
  { icon: '👥', label: 'Members',       path: '/president/members' },
];

export default function PresidentTasksPage() {
  const { selectedClub } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMember, setFilterMember] = useState('');

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get(`/tasks/club?clubId=${selectedClub.clubId}`)
      .then(res => setTasks(res.data))
      .catch(() => setError('Failed to load tasks.'))
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const allMembers = Array.from(
    new Map(
      tasks.flatMap(t => t.assignedTo).map(u => [u._id, u])
    ).values()
  );

  const filtered = filterMember
    ? tasks.filter(t => t.assignedTo.some(u => u._id === filterMember))
    : tasks;

  const byStatus = (status: TaskStatus) => filtered.filter(t => t.status === status);

  const stats = [
    { label: 'Total Tasks',  value: tasks.length,                          icon: '📋', color: 'bg-blue-50 text-blue-700' },
    { label: 'To Do',        value: tasks.filter(t => t.status === 'todo').length,        icon: '🕐', color: 'bg-gray-50 text-gray-700' },
    { label: 'In Progress',  value: tasks.filter(t => t.status === 'in_progress').length, icon: '🔄', color: 'bg-blue-50 text-blue-700' },
    { label: 'Completed',    value: tasks.filter(t => t.status === 'done').length,        icon: '✅', color: 'bg-green-50 text-green-700' },
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
                      ? 'bg-yellow-50 text-yellow-800 font-medium'
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
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">👑 Task Overview</h1>
                <p className="text-sm opacity-90">All tasks across every event workspace in your club.</p>
              </div>
              <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                President
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

          {/* Filter by member */}
          {allMembers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by:</span>
              <select
                value={filterMember}
                onChange={e => setFilterMember(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
              >
                <option value="">All members</option>
                {allMembers.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
              {filterMember && (
                <button onClick={() => setFilterMember('')} className="text-xs text-gray-400 hover:text-gray-600">
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Kanban */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse">📋</div>
                <p className="text-sm">Loading tasks...</p>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 font-medium">No tasks created yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Go to an event's workspace and create tasks to assign to committee members.
              </p>
              <button
                onClick={() => navigate('/president/events')}
                className="mt-4 bg-yellow-500 text-white px-5 py-2 rounded-lg hover:bg-yellow-600 transition font-medium text-sm"
              >
                Go to Events →
              </button>
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
                          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                          return (
                            <div
                              key={task._id}
                              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition cursor-pointer"
                              onClick={() => navigate(`/workspaces/${task.workspaceId?._id}`)}
                            >
                              <p className="font-semibold text-gray-800 text-sm leading-snug mb-1">{task.title}</p>

                              {task.description && (
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                              )}

                              {/* Context */}
                              <div className="flex items-center gap-1 mb-2 flex-wrap">
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  {TYPE_ICONS[task.workspaceId?.type] || '📌'} {task.workspaceId?.name}
                                </span>
                                <span className="text-xs text-gray-400 truncate">· {task.eventId?.title}</span>
                              </div>

                              {/* Assignees */}
                              {task.assignedTo.length > 0 && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  {task.assignedTo.map(u => (
                                    <div key={u._id} className="flex items-center gap-1">
                                      <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-semibold">
                                        {u.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-xs text-gray-500">{u.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {task.dueDate && (
                                <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                  {isOverdue ? '⚠ Overdue · ' : '📅 '}
                                  {new Date(task.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                </p>
                              )}
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
