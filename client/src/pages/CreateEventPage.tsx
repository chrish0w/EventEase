import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DisclaimerMarkdown from '../components/DisclaimerMarkdown';
import PdfPreview from '../components/PdfPreview';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface DisclaimerTemplate {
  _id: string;
  title: string;
  type: 'text' | 'pdf';
  content: string | null;
}

interface CommitteeMember {
  _id: string;
  name: string;
  email: string;
}

interface AssignedMember {
  userId: string;
  role: string;
}

interface DraftWorkspace {
  type: string;
  name: string;
  description: string;
  ownerId: string;
}

interface BudgetLineItem {
  _id?: string;
  description: string;
  assignedAmount: string;
  actualAmount: string;
}

interface SavedBudgetLineItem {
  _id?: string;
  description?: string;
  label?: string;
  assignedAmount?: number;
  budgetedAmount?: number;
  actualAmount?: number;
}

interface EventBudgetResponse {
  event: {
    lineItems: SavedBudgetLineItem[];
  };
}

const COMMITTEE_ROLES = [
  { value: 'finance',   label: 'Finance',   icon: '💰' },
  { value: 'logistics', label: 'Logistics', icon: '📦' },
  { value: 'equipment', label: 'Equipment', icon: '🔧' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'general',   label: 'General',   icon: '📋' },
];

const WORKSPACE_TEMPLATES = [
  { type: 'budget',    name: 'Budget',       icon: '💰', desc: 'Track estimated and actual spending' },
  { type: 'logistics', name: 'Logistics',    icon: '📦', desc: 'Run sheets, timelines, checklists' },
  { type: 'equipment', name: 'Equipment',    icon: '🔧', desc: 'Item lists, sources, statuses' },
  { type: 'transport', name: 'Transport',    icon: '🚗', desc: 'Routes, schedules, contacts' },
  { type: 'safety',    name: 'Safety',       icon: '⚠️', desc: 'Risk assessments, safety docs' },
  { type: 'documents', name: 'Documents',    icon: '📁', desc: 'Linked docs, sheets, slides' },
  { type: 'tasks',     name: 'Tasks / Notes', icon: '✅', desc: 'Lightweight task delegation' },
];

const CATEGORIES = [
  { value: 'social',   label: 'Social',   icon: '🎉' },
  { value: 'sports',   label: 'Sports',   icon: '⚽' },
  { value: 'outdoor',  label: 'Outdoor',  icon: '🏕️' },
  { value: 'finance',  label: 'Finance',  icon: '💰' },
  { value: 'other',    label: 'Other',    icon: '📌' },
];

const emptyBudgetLineItem = (): BudgetLineItem => ({
  description: '',
  assignedAmount: '',
  actualAmount: '0',
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CreateEventPage() {
  const { selectedClub } = useAuth();
  const navigate = useNavigate();
  const { id: eventId } = useParams<{ id?: string }>();
  const isEdit = !!eventId;

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    category: 'other',
    status: 'published',
    capacity: '',
    rsvpDeadline: '',
    requiresSafetyDisclaimer: false,
    disclaimerTemplateId: '',
  });
  const [disclaimerTemplates, setDisclaimerTemplates] = useState<DisclaimerTemplate[]>([]);
  const [assignedCommittee, setAssignedCommittee] = useState<AssignedMember[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);

  // Workspace state (new event flow)
  const [workspaces, setWorkspaces] = useState<DraftWorkspace[]>([]);
  const [customName, setCustomName] = useState('');

  // Budget state
  const [budgetLineItems, setBudgetLineItems] = useState<BudgetLineItem[]>([emptyBudgetLineItem()]);
  const [budgetDraftId, setBudgetDraftId] = useState('');
  const [budgetDirty, setBudgetDirty] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPresident = selectedClub?.role === 'president';

  useEffect(() => {
    if (!isEdit || !eventId) return;
    api.get(`/events/${eventId}`)
      .then(res => {
        const e = res.data;
        setForm({
          title: e.title ?? '',
          description: e.description ?? '',
          date: e.date ? new Date(e.date).toISOString().slice(0, 16) : '',
          location: e.location ?? '',
          category: e.category ?? 'other',
          status: e.status ?? 'draft',
          capacity: e.capacity ? String(e.capacity) : '',
          rsvpDeadline: e.rsvpDeadline ? e.rsvpDeadline.slice(0, 10) : '',
          requiresSafetyDisclaimer: !!e.requiresSafetyDisclaimer,
          disclaimerTemplateId: e.disclaimerTemplateId ?? '',
        });
        if (e.assignedCommittee) {
          setAssignedCommittee(e.assignedCommittee.map((a: { userId: { _id: string }; role: string }) => ({
            userId: a.userId._id,
            role: a.role,
          })));
        }
      })
      .catch(() => {});
  }, [isEdit, eventId]);

  useEffect(() => {
    if (!isPresident || !isEdit || !eventId || !selectedClub?.clubId) return;
    api.get<EventBudgetResponse>(`/budget/event/${eventId}?clubId=${selectedClub.clubId}`)
      .then(res => {
        const lineItems = res.data.event.lineItems || [];
        setBudgetLineItems(lineItems.length ? lineItems.map(item => ({
          _id: item._id,
          description: item.description ?? item.label ?? '',
          assignedAmount: String(item.assignedAmount ?? item.budgetedAmount ?? 0),
          actualAmount: String(item.actualAmount ?? 0),
        })) : [emptyBudgetLineItem()]);
        setBudgetDirty(false);
      })
      .catch(() => {});
  }, [eventId, isEdit, isPresident, selectedClub?.clubId]);

  useEffect(() => {
    if (isPresident && selectedClub?.clubId) {
      api.get(`/events/committee-members?clubId=${selectedClub.clubId}`)
        .then(res => setCommitteeMembers(res.data))
        .catch(() => {});
    }
  }, [isPresident, selectedClub]);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    api.get<DisclaimerTemplate[]>(`/disclaimer-templates?clubId=${selectedClub.clubId}`)
      .then(res => setDisclaimerTemplates(res.data))
      .catch(() => setDisclaimerTemplates([]));
  }, [selectedClub?.clubId]);

  const selectedTemplate = useMemo(
    () => disclaimerTemplates.find(t => t._id === form.disclaimerTemplateId) || null,
    [disclaimerTemplates, form.disclaimerTemplateId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'category' && value === 'outdoor' && prev.category !== 'outdoor') {
        next.requiresSafetyDisclaimer = true;
      }
      return next;
    });
  };

  const addCommitteeMember = () => setAssignedCommittee(prev => [...prev, { userId: '', role: 'general' }]);
  const updateAssignment = (index: number, field: 'userId' | 'role', value: string) =>
    setAssignedCommittee(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  const removeAssignment = (index: number) =>
    setAssignedCommittee(prev => prev.filter((_, i) => i !== index));

  // Workspace helpers
  const toggleTemplate = (type: string, name: string) => {
    setWorkspaces(prev => {
      const exists = prev.find(w => w.type === type);
      if (exists) return prev.filter(w => w.type !== type);
      return [...prev, { type, name, description: '', ownerId: '' }];
    });
  };
  const updateWorkspace = (index: number, field: keyof DraftWorkspace, value: string) =>
    setWorkspaces(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w));
  const removeWorkspace = (index: number) =>
    setWorkspaces(prev => prev.filter((_, i) => i !== index));
  const addCustomWorkspace = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setWorkspaces(prev => [...prev, { type: 'custom', name: trimmed, description: '', ownerId: '' }]);
    setCustomName('');
  };

  // Budget helpers
  const totalAssignedBudget = useMemo(
    () => budgetLineItems.reduce((sum, item) => sum + Number(item.assignedAmount || 0), 0),
    [budgetLineItems]
  );
  const totalActualBudget = useMemo(
    () => budgetLineItems.reduce((sum, item) => sum + Number(item.actualAmount || 0), 0),
    [budgetLineItems]
  );
  const getBudgetPayload = () => budgetLineItems
    .map(item => ({
      _id: item._id,
      description: item.description.trim(),
      assignedAmount: Number(item.assignedAmount || 0),
      actualAmount: Number(item.actualAmount || 0),
    }))
    .filter(item => item.description || item.assignedAmount || item.actualAmount);

  const updateBudgetLineItem = (index: number, field: keyof BudgetLineItem, value: string) => {
    setBudgetLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    setBudgetDirty(true);
    setBudgetMessage('');
  };
  const addBudgetLineItem = () => { setBudgetLineItems(prev => [...prev, emptyBudgetLineItem()]); setBudgetDirty(true); };
  const removeBudgetLineItem = (index: number) => {
    setBudgetLineItems(prev => { const next = prev.filter((_, i) => i !== index); return next.length ? next : [emptyBudgetLineItem()]; });
    setBudgetDirty(true);
  };

  const saveBudgetSection = async () => {
    if (!isPresident || !selectedClub?.clubId) return undefined;
    const lineItems = getBudgetPayload();
    setBudgetSaving(true);
    setError('');
    try {
      if (isEdit && eventId) {
        await api.put(`/budget/event/${eventId}`, { clubId: selectedClub.clubId, lineItems });
        setBudgetMessage('Budget saved.');
        setBudgetDirty(false);
        return undefined;
      }
      const res = await api.put<{ draftId: string }>('/budget/draft', {
        clubId: selectedClub.clubId,
        draftId: budgetDraftId || undefined,
        lineItems,
      });
      setBudgetDraftId(res.data.draftId);
      setBudgetMessage('Budget saved for this event draft.');
      setBudgetDirty(false);
      return res.data.draftId;
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save budget.');
      throw err;
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.requiresSafetyDisclaimer && !form.disclaimerTemplateId) {
      setError('Please select a disclaimer template, or turn off "Requires Safety Disclaimer".');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        clubId: selectedClub?.clubId,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        rsvpDeadline: form.rsvpDeadline || undefined,
        disclaimerTemplateId: form.requiresSafetyDisclaimer ? form.disclaimerTemplateId : null,
      };
      if (isPresident) {
        payload.assignedCommittee = assignedCommittee.filter(a => a.userId);
      }

      let savedEventId = eventId;
      if (isEdit && eventId) {
        await api.put(`/events/${eventId}`, payload);
        if (budgetDirty) await saveBudgetSection();
      } else {
        // Save budget draft first if there are rows
        const hasBudgetRows = getBudgetPayload().length > 0;
        let nextBudgetDraftId = budgetDraftId;
        if (isPresident && hasBudgetRows && (!nextBudgetDraftId || budgetDirty)) {
          nextBudgetDraftId = await saveBudgetSection() || '';
        }
        if (nextBudgetDraftId) payload.budgetDraftId = nextBudgetDraftId;

        const res = await api.post('/events', payload);
        savedEventId = res.data._id;

        // Create attached workspaces
        if (savedEventId && workspaces.length > 0) {
          await Promise.all(workspaces.map(w =>
            api.post(`/events/${savedEventId}/workspaces`, {
              name: w.name,
              type: w.type,
              description: w.description || undefined,
              owner: w.ownerId || undefined,
            })
          ));
        }
      }
      navigate(isPresident ? '/president/events' : '/committee/events');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const backPath = isPresident ? '/president/dashboard' : '/committee/events';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className="text-gray-500 hover:text-gray-700 transition">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Edit Event' : 'Create New Event'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-700">Event Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input name="title" value={form.title} onChange={handleChange} required
                placeholder="e.g. Annual Charity Gala"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                placeholder="What is this event about?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                <input type="datetime-local" name="date" value={form.date} onChange={handleChange} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Campus Hall A"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" value={form.category} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input type="number" name="capacity" value={form.capacity} onChange={handleChange} min="1"
                  placeholder="Max attendees"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Deadline</label>
                <input type="date" name="rsvpDeadline" value={form.rsvpDeadline} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Safety Disclaimer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <input
                id="requires-safety-disclaimer"
                type="checkbox"
                checked={form.requiresSafetyDisclaimer}
                onChange={e => setForm(prev => ({
                  ...prev,
                  requiresSafetyDisclaimer: e.target.checked,
                  disclaimerTemplateId: e.target.checked ? prev.disclaimerTemplateId : '',
                }))}
                className="mt-1"
              />
              <label htmlFor="requires-safety-disclaimer" className="cursor-pointer">
                <p className="text-sm font-semibold text-gray-800">⚠️ Requires Safety Disclaimer</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Attendees will be required to acknowledge before RSVPing. Recommended for outdoor and high-risk events.
                </p>
              </label>
            </div>

            {form.requiresSafetyDisclaimer && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disclaimer Template <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.disclaimerTemplateId}
                    onChange={e => setForm(prev => ({ ...prev, disclaimerTemplateId: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a template...</option>
                    {disclaimerTemplates.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.type === 'pdf' ? '📕' : '📄'} {t.title} ({t.type})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-96 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">{selectedTemplate.title}</h4>
                    {selectedTemplate.type === 'pdf' ? (
                      <PdfPreview url={`/disclaimer-templates/${selectedTemplate._id}/file`} />
                    ) : (
                      <DisclaimerMarkdown content={selectedTemplate.content ?? ''} />
                    )}
                  </div>
                )}

                {disclaimerTemplates.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No templates yet.{' '}
                    <Link
                      to={isPresident ? '/president/disclaimers' : '/committee/disclaimers'}
                      className="font-medium underline"
                    >
                      Create one first →
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>

          {form.category === 'finance' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Budget Tracking Enabled</p>
                <p className="text-sm text-green-700 mt-0.5">Budget tracking features will be available for this event once created.</p>
              </div>
            </div>
          )}

          {/* Assign Committee */}
          {isPresident && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-700">Assign Committee Members</h2>
                <button type="button" onClick={addCommitteeMember} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Add Member
                </button>
              </div>
              {assignedCommittee.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No committee members assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {assignedCommittee.map((assignment, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <select value={assignment.userId} onChange={e => updateAssignment(index, 'userId', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select member...</option>
                        {committeeMembers.map(m => <option key={m._id} value={m._id}>{m.name} ({m.email})</option>)}
                      </select>
                      <select value={assignment.role} onChange={e => updateAssignment(index, 'role', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {COMMITTEE_ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                      </select>
                      <button type="button" onClick={() => removeAssignment(index)} className="text-gray-400 hover:text-red-500 transition text-lg">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Budget (President only) */}
          {isPresident && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-700">Event Budget</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {isEdit
                      ? 'Assigned amounts are locked. Update actual spending and descriptions as the event progresses.'
                      : 'Assign the planned budget now. Actual amounts start at zero and can be updated later.'}
                  </p>
                </div>
                <button type="button" onClick={() => saveBudgetSection()} disabled={budgetSaving}
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {budgetSaving ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[1fr_1fr_2fr_48px] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <div className="px-4 py-3 border-b border-gray-200">Assigned Amount</div>
                    <div className="px-4 py-3 border-b border-gray-200">Actual Amount</div>
                    <div className="px-4 py-3 border-b border-gray-200">Description</div>
                    <div className="px-4 py-3 border-b border-gray-200" />
                  </div>
                  {budgetLineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_2fr_48px] items-center border-b border-gray-100 last:border-b-0">
                      <div className="px-4 py-3">
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-blue-500">
                          <span className="text-sm text-gray-500">$</span>
                          <input type="number" min="0" step="0.01" value={item.assignedAmount}
                            onChange={e => updateBudgetLineItem(index, 'assignedAmount', e.target.value)}
                            placeholder="0.00" disabled={isEdit}
                            className={`w-full bg-transparent px-2 py-2 text-sm outline-none ${isEdit ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}`} />
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-blue-500">
                          <span className="text-sm text-gray-500">$</span>
                          <input type="number" min="0" step="0.01" value={item.actualAmount}
                            onChange={e => updateBudgetLineItem(index, 'actualAmount', e.target.value)}
                            placeholder="0.00" disabled={!isEdit}
                            className={`w-full bg-transparent px-2 py-2 text-sm outline-none ${!isEdit ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}`} />
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <input value={item.description} onChange={e => updateBudgetLineItem(index, 'description', e.target.value)}
                          placeholder="What will this money be used for?"
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="px-4 py-3 text-right">
                        {!isEdit && (
                          <button type="button" onClick={() => removeBudgetLineItem(index)}
                            className="text-lg text-gray-400 hover:text-red-500 transition">×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                {!isEdit && (
                  <button type="button" onClick={addBudgetLineItem} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    + Add Row
                  </button>
                )}
                <div className="ml-auto text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    Total Budget: {formatCurrency(isEdit ? totalActualBudget : totalAssignedBudget)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isEdit ? 'Assigned' : 'Actual'}: {formatCurrency(isEdit ? totalAssignedBudget : totalActualBudget)}
                  </p>
                </div>
              </div>
              {budgetMessage && <p className="mt-3 text-sm font-medium text-green-700">{budgetMessage}</p>}
            </div>
          )}

          {/* Workspaces (President only, new event) */}
          {isPresident && !isEdit && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-700">Add Workspaces</h2>
                <p className="text-xs text-gray-500 mt-0.5">Pick the operational areas for this event. You can edit them anytime later.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {WORKSPACE_TEMPLATES.map(t => {
                  const selected = workspaces.some(w => w.type === t.type);
                  return (
                    <button type="button" key={t.type} onClick={() => toggleTemplate(t.type, t.name)}
                      className={`text-left border rounded-lg p-3 transition ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{t.icon}</span>
                        <span className="text-sm font-medium text-gray-800">{t.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mb-4">
                <input value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="Custom workspace name (e.g. Sponsorship)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={addCustomWorkspace}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition">
                  + Add Custom
                </button>
              </div>
              {workspaces.length > 0 && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {workspaces.map((w, index) => (
                    <div key={`${w.type}-${index}`} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-800">
                          {WORKSPACE_TEMPLATES.find(t => t.type === w.type)?.icon ?? '📌'} {w.name}
                          <span className="ml-2 text-xs text-gray-400">({w.type})</span>
                        </div>
                        <button type="button" onClick={() => removeWorkspace(index)}
                          className="text-gray-400 hover:text-red-500 transition text-lg">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={w.ownerId} onChange={e => updateWorkspace(index, 'ownerId', e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Owner (optional)…</option>
                          {committeeMembers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                        </select>
                        <input value={w.description} onChange={e => updateWorkspace(index, 'description', e.target.value)}
                          placeholder="Short description (optional)"
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isPresident && isEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <span className="text-xl">🗂️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Manage workspaces separately</p>
                <p className="text-sm text-blue-700 mt-0.5">Use the event's Workspaces page to add, edit, or delete workspaces and tasks.</p>
              </div>
              {eventId && (
                <button type="button" onClick={() => navigate(`/president/events/${eventId}/workspaces`)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition self-center">
                  Open Workspaces
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate(backPath)}
              className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
