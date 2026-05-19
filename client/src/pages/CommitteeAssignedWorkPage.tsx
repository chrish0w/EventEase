import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CommitteeWorkspaceNav from '../components/CommitteeWorkspaceNav';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface AssignedWorkspace {
  _id: string;
  name: string;
  type: string;
  description?: string;
  dueDate?: string;
  status: string;
  closeoutRequest?: {
    status: 'none' | 'pending' | 'approved' | 'rejected';
    note?: string;
    responseNote?: string;
  };
  event?: {
    _id: string;
    title: string;
    date: string;
    status: string;
    location?: string;
  } | null;
  tasks?: Array<{
    _id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done';
    completionRequest?: {
      status: 'none' | 'pending' | 'approved' | 'rejected';
      note?: string;
      responseNote?: string;
    };
  }>;
}

function formatDate(date?: string) {
  if (!date) return 'No deadline';
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CommitteeAssignedWorkPage() {
  const { selectedClub } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<AssignedWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [confirmWorkspace, setConfirmWorkspace] = useState<AssignedWorkspace | null>(null);
  const [closeoutNote, setCloseoutNote] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    setLoading(true);
    api.get(`/workspaces/assigned?clubId=${selectedClub.clubId}`)
      .then(res => setWorkspaces(res.data))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, [selectedClub?.clubId]);

  const refreshAssignedWork = async () => {
    if (!selectedClub?.clubId) return;
    const res = await api.get(`/workspaces/assigned?clubId=${selectedClub.clubId}`);
    setWorkspaces(res.data);
  };

  const requestWorkspaceCompletion = async () => {
    if (!confirmWorkspace) return;
    const workspace = confirmWorkspace;
    const tasks = workspace.tasks || [];
    if (tasks.length === 0) {
      setMessage('Add at least one task in the workspace before requesting close-out.');
      return;
    }
    setRequestingId(workspace._id);
    setMessage('');
    try {
      await api.post(`/workspaces/${workspace._id}/closeout-request`, { note: closeoutNote });
      await refreshAssignedWork();
      setMessage('Close-out request sent to the president.');
      setConfirmWorkspace(null);
      setCloseoutNote('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(msg || 'Failed to submit completion request.');
    } finally {
      setRequestingId(null);
    }
  };

  const { upcoming, previous } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sorted = [...workspaces].sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
    return {
      upcoming: sorted.filter(workspace => workspace.closeoutRequest?.status !== 'approved' && (!workspace.dueDate || new Date(workspace.dueDate) >= today)),
      previous: sorted.filter(workspace => workspace.closeoutRequest?.status === 'approved' || (workspace.dueDate && new Date(workspace.dueDate) < today)),
    };
  }, [workspaces]);

  const renderGroup = (title: string, items: AssignedWorkspace[]) => (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Nothing here yet.</p>
      ) : (
        <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-2">
          {items.map(workspace => (
            <div
              key={workspace._id}
              className="rounded-xl border border-gray-100 p-4 transition hover:border-purple-200 hover:bg-purple-50/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => navigate(`/workspaces/${workspace._id}`)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">{workspace.event?.title || 'Event'}</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900">{workspace.name}</h3>
                  {workspace.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{workspace.description}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    {workspace.tasks?.length || 0} task{(workspace.tasks?.length || 0) !== 1 ? 's' : ''}
                    {workspace.closeoutRequest?.status === 'pending' && ' · Close-out awaiting approval'}
                    {workspace.closeoutRequest?.status === 'approved' && ' · Close-out approved'}
                    {workspace.closeoutRequest?.status === 'rejected' && ' · Close-out rejected'}
                  </p>
                </button>
                <div className="flex flex-col items-end gap-2 text-right text-sm">
                  <p className="font-semibold text-gray-800">{formatDate(workspace.dueDate)}</p>
                  <p className="mt-1 capitalize text-gray-400">{workspace.status.replaceAll('_', ' ')}</p>
                  <button
                    type="button"
                    onClick={() => setConfirmWorkspace(workspace)}
                    disabled={requestingId === workspace._id || workspace.closeoutRequest?.status === 'pending' || workspace.closeoutRequest?.status === 'approved'}
                    className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {workspace.closeoutRequest?.status === 'pending' ? 'Awaiting Approval' : workspace.closeoutRequest?.status === 'approved' ? 'Approved' : requestingId === workspace._id ? 'Sending...' : 'Request Close-Out'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="committee-workspace min-h-screen bg-[#140f24]">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <CommitteeWorkspaceNav active="Assigned Work" />
        <main className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Assigned Work</h1>
            <p className="mt-1 text-sm text-purple-100/80">Your event workspaces, grouped by deadline and sorted by earliest due date.</p>
            {message && <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white">{message}</p>}
          </div>
          {loading ? (
            <div className="rounded-xl bg-white p-12 text-center text-sm text-gray-400">Loading assigned work...</div>
          ) : (
            <>
              {renderGroup('Upcoming Work', upcoming)}
              {renderGroup('Previous Work', previous)}
            </>
          )}
        </main>
      </div>
      {confirmWorkspace && (
        <div className="!fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Request close-out?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will ask the president to review and close out "{confirmWorkspace.name}". The tasks do not need to be in Done first.
            </p>
            <textarea
              value={closeoutNote}
              onChange={e => setCloseoutNote(e.target.value)}
              rows={3}
              placeholder="Optional note about what has been completed..."
              className="mt-4 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirmWorkspace(null); setCloseoutNote(''); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={requestWorkspaceCompletion} disabled={requestingId === confirmWorkspace._id} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {requestingId === confirmWorkspace._id ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
