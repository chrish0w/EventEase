import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface ClubRequest {
  _id: string;
  clubName: string;
  clubDescription: string;
  clubCategory: string;
  officialClubLink: string;
  requesterFullName: string;
  requesterEmail: string;
  requesterRole: string;
  isPresident: boolean;
  presidentFullName: string;
  presidentEmail: string;
  proofFile: {
    name: string;
    type: string;
    size: number;
  };
  additionalNotes?: string;
  status: 'awaiting_email_confirmation' | 'pending_review' | 'more_info_needed' | 'approved' | 'rejected';
  emailConfirmedAt?: string;
  adminNotes?: string;
  createdClubId?: string;
  createdAt: string;
}

interface Organisation {
  _id: string;
  name: string;
}

interface ProofFile {
  name: string;
  type: string;
  data: string;
}

const statusStyles: Record<ClubRequest['status'], string> = {
  awaiting_email_confirmation: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-100 text-yellow-800',
  more_info_needed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusLabels: Record<ClubRequest['status'], string> = {
  awaiting_email_confirmation: 'Awaiting Email Confirmation',
  pending_review: 'Pending Review',
  more_info_needed: 'More Info Needed',
  approved: 'Approved',
  rejected: 'Rejected',
};

const emptyReviewForm = {
  orgId: '',
  clubName: '',
  clubDescription: '',
  clubCategory: '',
  officialClubLink: '',
  presidentName: '',
  presidentEmail: '',
  adminNotes: '',
};

export default function SuperAdminClubRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [actionMode, setActionMode] = useState<'more-info' | 'reject' | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => requests.find(request => request._id === selectedId) || null,
    [requests, selectedId]
  );

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/club-registration-requests'),
      api.get('/super-admin/organisations'),
    ]).then(([requestsRes, orgsRes]) => {
      setRequests(requestsRes.data);
      setOrgs(orgsRes.data);
      if (!selectedId && requestsRes.data.length > 0) setSelectedId(requestsRes.data[0]._id);
    }).catch(() => {
      setError('Could not load club registration requests.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setReviewForm({
      orgId: orgs[0]?._id || '',
      clubName: selected.clubName,
      clubDescription: selected.clubDescription,
      clubCategory: selected.clubCategory,
      officialClubLink: selected.officialClubLink,
      presidentName: selected.presidentFullName,
      presidentEmail: selected.presidentEmail,
      adminNotes: selected.adminNotes || '',
    });
  }, [selected, orgs]);

  const updateReviewForm = (field: keyof typeof emptyReviewForm, value: string) => {
    setReviewForm(prev => ({ ...prev, [field]: value }));
  };

  const viewProof = async () => {
    if (!selected) return;
    try {
      const { data } = await api.get<ProofFile>(`/club-registration-requests/${selected._id}/proof`);
      const win = window.open();
      if (win) {
        win.document.write(`<title>${data.name}</title>`);
        if (data.type.startsWith('image/')) {
          win.document.write(`<img src="${data.data}" alt="${data.name}" style="max-width:100%;height:auto;" />`);
        } else {
          win.document.write(`<iframe src="${data.data}" title="${data.name}" style="width:100%;height:100vh;border:0;"></iframe>`);
        }
      }
    } catch {
      setError('Could not open the uploaded proof.');
    }
  };

  const approve = async () => {
    if (!selected) return;
    if (!confirm(`Approve and create a club workspace for ${reviewForm.clubName}?`)) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/club-registration-requests/${selected._id}/approve`, reviewForm);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not approve this request.');
    } finally {
      setSaving(false);
    }
  };

  const sendAction = async () => {
    if (!selected || !actionMode) return;
    if (!actionMessage.trim()) {
      setError(actionMode === 'reject' ? 'Please enter a rejection reason.' : 'Please enter the information you need.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const path = actionMode === 'reject' ? 'reject' : 'request-more-info';
      const payload = actionMode === 'reject' ? { reason: actionMessage } : { message: actionMessage };
      await api.put(`/club-registration-requests/${selected._id}/${path}`, payload);
      setActionMode(null);
      setActionMessage('');
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not update this request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Club Registration Requests</h1>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 text-center text-gray-500">
            No club registration requests yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-fit">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Submitted Requests</h2>
              <div className="space-y-2">
                {requests.map(request => (
                  <button
                    key={request._id}
                    onClick={() => setSelectedId(request._id)}
                    className={`w-full text-left rounded-lg border p-3 transition ${selectedId === request._id ? 'border-purple-300 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{request.clubName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{request.requesterFullName}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusStyles[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Submitted {new Date(request.createdAt).toLocaleDateString('en-AU')}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            {selected && (
              <main className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Review Club Registration Request</h2>
                      <p className="text-sm text-gray-500 mt-1">Status: {statusLabels[selected.status]}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[selected.status]}`}>
                      {statusLabels[selected.status]}
                    </span>
                  </div>

                  <section className="border-b border-gray-100 pb-6 mb-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Original Request Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <ReadOnly label="Requester Name" value={selected.requesterFullName} />
                      <ReadOnly label="Requester Email" value={selected.requesterEmail} />
                      <ReadOnly label="Requester Role" value={selected.requesterRole} />
                      <ReadOnly label="Submitted Club Name" value={selected.clubName} />
                      <ReadOnly label="President Name" value={selected.presidentFullName} />
                      <ReadOnly label="President Email" value={selected.presidentEmail} />
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Official Club Link</p>
                        <a href={selected.officialClubLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                          {selected.officialClubLink}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Uploaded Proof</p>
                        <button onClick={viewProof} className="text-blue-600 hover:underline">
                          View {selected.proofFile.name}
                        </button>
                      </div>
                    </div>
                    {selected.additionalNotes && (
                      <div className="mt-4">
                        <ReadOnly label="Additional Notes" value={selected.additionalNotes} />
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Approved Club Workspace Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Organisation *</span>
                        <select value={reviewForm.orgId} onChange={e => updateReviewForm('orgId', e.target.value)} className="form-input">
                          <option value="">Select organisation</option>
                          {orgs.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
                        </select>
                      </label>
                      <Editable label="Club Name" value={reviewForm.clubName} onChange={value => updateReviewForm('clubName', value)} />
                      <Editable label="Category" value={reviewForm.clubCategory} onChange={value => updateReviewForm('clubCategory', value)} />
                      <Editable label="Official Club Link" value={reviewForm.officialClubLink} onChange={value => updateReviewForm('officialClubLink', value)} />
                      <Editable label="President Name" value={reviewForm.presidentName} onChange={value => updateReviewForm('presidentName', value)} />
                      <Editable label="President Email" value={reviewForm.presidentEmail} onChange={value => updateReviewForm('presidentEmail', value)} />
                      <label className="block md:col-span-2">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Description *</span>
                        <textarea value={reviewForm.clubDescription} onChange={e => updateReviewForm('clubDescription', e.target.value)} rows={4} className="form-input resize-none" />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</span>
                        <textarea value={reviewForm.adminNotes} onChange={e => updateReviewForm('adminNotes', e.target.value)} rows={3} placeholder="Verified requester email and proof document." className="form-input resize-none" />
                      </label>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={approve}
                        disabled={saving || selected.status === 'approved' || selected.status === 'rejected' || selected.status === 'awaiting_email_confirmation'}
                        className="bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        Approve & Create Club Workspace
                      </button>
                      <button
                        onClick={() => setActionMode('more-info')}
                        disabled={saving || selected.status === 'approved' || selected.status === 'rejected'}
                        className="bg-blue-50 text-blue-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                      >
                        Request More Info
                      </button>
                      <button
                        onClick={() => setActionMode('reject')}
                        disabled={saving || selected.status === 'approved' || selected.status === 'rejected'}
                        className="bg-red-50 text-red-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                      >
                        Reject Request
                      </button>
                    </div>
                  </section>
                </div>
              </main>
            )}
          </div>
        )}
      </div>

      {actionMode && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {actionMode === 'reject' ? 'Reject Registration Request' : 'Request More Information'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              This message will be sent to: <span className="font-medium text-gray-700">{selected.requesterEmail}</span>
            </p>
            <textarea
              value={actionMessage}
              onChange={e => setActionMessage(e.target.value)}
              rows={5}
              placeholder={actionMode === 'reject'
                ? 'Explain why this request could not be approved.'
                : 'Explain what additional information is needed.'}
              className="form-input resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => { setActionMode(null); setActionMessage(''); }} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={sendAction}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 ${actionMode === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {actionMode === 'reject' ? 'Reject Request' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-400 mb-1">{label}</p>
      <p className="text-gray-800">{value || '-'}</p>
    </div>
  );
}

function Editable({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label} *</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="form-input" />
    </label>
  );
}
