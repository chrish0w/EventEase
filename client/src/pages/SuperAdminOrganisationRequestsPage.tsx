import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface OrgRequest {
  _id: string;
  organisationName: string;
  organisationDescription: string;
  organisationType: string;
  officialWebsite: string;
  officialEmail: string;
  adminFullName: string;
  adminEmail: string;
  adminRole: string;
  expectedClubs: string;
  expectedUsers: string;
  mainUseCase: string;
  proofFile: { name: string; type: string; size: number };
  status: string;
}

export default function SuperAdminOrganisationRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<OrgRequest[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [action, setAction] = useState<'more-info' | 'reject' | null>(null);
  const [message, setMessage] = useState('');
  const selected = requests.find(r => r._id === selectedId) || null;
  const [form, setForm] = useState({
    organisationName: '',
    organisationDescription: '',
    organisationType: '',
    officialWebsite: '',
    officialEmail: '',
    adminFullName: '',
    adminEmail: '',
    adminNotes: '',
  });

  const fetchRequests = () => {
    api.get('/organisation-registration-requests').then(res => {
      setRequests(res.data);
      if (!selectedId && res.data.length) setSelectedId(res.data[0]._id);
    }).catch(() => {});
  };

  useEffect(() => { fetchRequests(); }, []);
  useEffect(() => {
    if (!selected) return;
    setForm({
      organisationName: selected.organisationName,
      organisationDescription: selected.organisationDescription,
      organisationType: selected.organisationType,
      officialWebsite: selected.officialWebsite,
      officialEmail: selected.officialEmail,
      adminFullName: selected.adminFullName,
      adminEmail: selected.adminEmail,
      adminNotes: '',
    });
  }, [selected]);

  const viewProof = async () => {
    if (!selected) return;
    const { data } = await api.get(`/organisation-registration-requests/${selected._id}/proof`);
    const win = window.open();
    if (!win) return;
    win.document.write(`<title>${data.name}</title>`);
    if (data.type.startsWith('image/')) win.document.write(`<img src="${data.data}" alt="${data.name}" style="max-width:100%;height:auto;" />`);
    else win.document.write(`<iframe src="${data.data}" title="${data.name}" style="width:100%;height:100vh;border:0;"></iframe>`);
  };

  const approve = async () => {
    if (!selected) return;
    if (!confirm(`Approve and create ${form.organisationName}?`)) return;
    await api.put(`/organisation-registration-requests/${selected._id}/approve`, form);
    fetchRequests();
  };

  const sendAction = async () => {
    if (!selected || !action || !message.trim()) return;
    const path = action === 'reject' ? 'reject' : 'request-more-info';
    const payload = action === 'reject' ? { reason: message } : { message };
    await api.put(`/organisation-registration-requests/${selected._id}/${path}`, payload);
    setAction(null);
    setMessage('');
    fetchRequests();
  };

  return (
    <div className="super-admin-workspace min-h-screen bg-[#130c24]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-purple-100/80 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-white">Organisation Registration Requests</h1>
        </div>
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500">No organisation requests yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-stretch">
            <aside className="h-[76vh] overflow-y-auto bg-white rounded-xl border border-gray-100 p-4">
              {requests.map(request => (
                <button key={request._id} onClick={() => setSelectedId(request._id)} className={`w-full text-left rounded-lg border p-3 mb-2 ${selectedId === request._id ? 'border-purple-300 bg-purple-50' : 'border-gray-100'}`}>
                  <p className="text-sm font-semibold text-gray-800">{request.organisationName}</p>
                  <p className="text-xs text-gray-400">{request.adminFullName} · {request.status.replaceAll('_', ' ')}</p>
                </button>
              ))}
            </aside>
            {selected && (
              <main className="flex h-[76vh] flex-col bg-white rounded-xl border border-gray-100 p-6">
                <div className="shrink-0">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Review Organisation Registration Request</h2>
                  <p className="text-sm text-gray-500 mb-6">Request Status: {selected.status.replaceAll('_', ' ')}</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                  <section className="border-b border-gray-100 pb-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <ReadOnly label="Requested By" value={selected.adminFullName} />
                    <ReadOnly label="Requester Email" value={selected.adminEmail} />
                    <ReadOnly label="Requester Role" value={selected.adminRole} />
                    <ReadOnly label="Submitted Organisation" value={selected.organisationName} />
                    <ReadOnly label="Expected Clubs" value={selected.expectedClubs} />
                    <ReadOnly label="Expected Users" value={selected.expectedUsers} />
                    <div><p className="text-xs font-semibold uppercase text-gray-400 mb-1">Uploaded Proof</p><button onClick={viewProof} className="text-blue-600 hover:underline">{selected.proofFile.name}</button></div>
                    <div><p className="text-xs font-semibold uppercase text-gray-400 mb-1">Official Website</p><a href={selected.officialWebsite} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selected.officialWebsite}</a></div>
                  </section>
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(form).map(([key, value]) => (
                      <label key={key} className={key.includes('Description') || key === 'adminNotes' ? 'block md:col-span-2' : 'block'}>
                        <span className="block text-sm font-medium text-gray-700 mb-1">{labelFor(key)}</span>
                        {key.includes('Description') || key === 'adminNotes' ? (
                          <textarea value={value} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3} className="form-input resize-none" />
                        ) : (
                          <input value={value} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
                        )}
                      </label>
                    ))}
                  </section>
                </div>
                <div className="mt-6 flex shrink-0 flex-wrap gap-2 border-t border-gray-100 pt-4">
                  <button disabled={selected.status === 'approved' || selected.status === 'rejected' || selected.status === 'awaiting_email_confirmation'} onClick={approve} className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">Approve & Create Organisation Workspace</button>
                  <button disabled={selected.status === 'approved' || selected.status === 'rejected'} onClick={() => setAction('more-info')} className="bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg">Request More Info</button>
                  <button disabled={selected.status === 'approved' || selected.status === 'rejected'} onClick={() => setAction('reject')} className="bg-red-50 text-red-700 text-sm font-semibold px-4 py-2 rounded-lg">Reject Request</button>
                </div>
              </main>
            )}
          </div>
        )}
      </div>
      {action && selected && (
        <div
          className="!fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { setAction(null); setMessage(''); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{action === 'reject' ? 'Reject Organisation Request' : 'Request More Information'}</h2>
            <p className="text-sm text-gray-500 mb-4">This message will be sent to {selected.adminEmail}</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className="form-input resize-none" />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={sendAction} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${action === 'reject' ? 'bg-red-600' : 'bg-blue-600'}`}>{action === 'reject' ? 'Reject Request' : 'Send Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-gray-400 mb-1">{label}</p><p className="text-gray-800">{value}</p></div>;
}

function labelFor(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}
