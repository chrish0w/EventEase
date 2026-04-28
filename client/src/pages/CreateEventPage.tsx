import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface CommitteeMember {
  _id: string;
  name: string;
  email: string;
}

interface AssignedMember {
  userId: string;
  role: string;
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
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'logistics', label: 'Logistics', icon: '📦' },
  { value: 'equipment', label: 'Equipment', icon: '🔧' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'general', label: 'General', icon: '📋' },
];

const CATEGORIES = [
  { value: 'social', label: 'Social', icon: '🎉' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'outdoor', label: 'Outdoor', icon: '🏕️' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'other', label: 'Other', icon: '📌' },
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
  });
  const [assignedCommittee, setAssignedCommittee] = useState<AssignedMember[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [budgetLineItems, setBudgetLineItems] = useState<BudgetLineItem[]>([emptyBudgetLineItem()]);
  const [budgetDraftId, setBudgetDraftId] = useState('');
  const [budgetDirty, setBudgetDirty] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPresident = selectedClub?.role === 'president';

  // Load existing event data when editing
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addCommitteeMember = () => {
    setAssignedCommittee(prev => [...prev, { userId: '', role: 'general' }]);
  };

  const updateAssignment = (index: number, field: 'userId' | 'role', value: string) => {
    setAssignedCommittee(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const removeAssignment = (index: number) => {
    setAssignedCommittee(prev => prev.filter((_, i) => i !== index));
  };

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
    setBudgetLineItems(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
    setBudgetDirty(true);
    setBudgetMessage('');
  };

  const addBudgetLineItem = () => {
    setBudgetLineItems(prev => [...prev, emptyBudgetLineItem()]);
    setBudgetDirty(true);
    setBudgetMessage('');
  };

  const removeBudgetLineItem = (index: number) => {
    setBudgetLineItems(prev => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [emptyBudgetLineItem()];
    });
    setBudgetDirty(true);
    setBudgetMessage('');
  };

  const saveBudgetSection = async () => {
    if (!isPresident || !selectedClub?.clubId) return undefined;

    const lineItems = getBudgetPayload();
    setBudgetSaving(true);
    setError('');
    try {
      if (isEdit && eventId) {
        await api.put(`/budget/event/${eventId}`, {
          clubId: selectedClub.clubId,
          lineItems,
        });
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
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        clubId: selectedClub?.clubId,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        rsvpDeadline: form.rsvpDeadline || undefined,
      };
      if (isPresident) {
        payload.assignedCommittee = assignedCommittee.filter(a => a.userId);
      }
      if (isEdit && eventId) {
        await api.put(`/events/${eventId}`, payload);
        if (budgetDirty) {
          await saveBudgetSection();
        }
      } else {
        const hasBudgetRows = getBudgetPayload().length > 0;
        let nextBudgetDraftId = budgetDraftId;
        if (isPresident && hasBudgetRows && (!nextBudgetDraftId || budgetDirty)) {
          nextBudgetDraftId = await saveBudgetSection() || '';
        }
        if (nextBudgetDraftId) {
          payload.budgetDraftId = nextBudgetDraftId;
        }
        await api.post('/events', payload);
      }
      navigate(isPresident ? '/president/events' : '/committee/events');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const backPath = isPresident ? '/president/dashboard' : '/committee/events';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(backPath)}
            className="text-gray-500 hover:text-gray-700 transition"
          >
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
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="e.g. Annual Charity Gala"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="What is this event about?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Campus Hall A"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  min="1"
                  placeholder="Max attendees"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Deadline</label>
                <input
                  type="date"
                  name="rsvpDeadline"
                  value={form.rsvpDeadline}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Conditional banners */}
          {form.category === 'outdoor' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">Safety Disclaimer Required</p>
                <p className="text-sm text-orange-700 mt-0.5">Outdoor events require attendees to acknowledge a safety disclaimer before RSVPing.</p>
              </div>
            </div>
          )}

          {form.category === 'finance' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Budget Tracking Enabled</p>
                <p className="text-sm text-green-700 mt-0.5">Budget tracking features will be available for this event once created.</p>
              </div>
            </div>
          )}

          {/* Assign Committee (President only) */}
          {isPresident && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-700">Assign Committee Members</h2>
                <button
                  type="button"
                  onClick={addCommitteeMember}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Member
                </button>
              </div>

              {assignedCommittee.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No committee members assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {assignedCommittee.map((assignment, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <select
                        value={assignment.userId}
                        onChange={e => updateAssignment(index, 'userId', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select member...</option>
                        {committeeMembers.map(m => (
                          <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                        ))}
                      </select>
                      <select
                        value={assignment.role}
                        onChange={e => updateAssignment(index, 'role', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {COMMITTEE_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeAssignment(index)}
                        className="text-gray-400 hover:text-red-500 transition text-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isPresident && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-700">Event Budget</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {isEdit
                      ? 'Assigned amounts are locked. Update actual spending and descriptions as the event progresses.'
                      : 'Assign the planned budget now. Actual amounts start at zero and can be updated later from the event edit page.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveBudgetSection()}
                  disabled={budgetSaving}
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
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
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.assignedAmount}
                            onChange={event => updateBudgetLineItem(index, 'assignedAmount', event.target.value)}
                            placeholder="0.00"
                            disabled={isEdit}
                            className={`w-full bg-transparent px-2 py-2 text-sm outline-none ${isEdit ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}`}
                          />
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-blue-500">
                          <span className="text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.actualAmount}
                            onChange={event => updateBudgetLineItem(index, 'actualAmount', event.target.value)}
                            placeholder="0.00"
                            disabled={!isEdit}
                            className={`w-full bg-transparent px-2 py-2 text-sm outline-none ${!isEdit ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}`}
                          />
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <input
                          value={item.description}
                          onChange={event => updateBudgetLineItem(index, 'description', event.target.value)}
                          placeholder="What will this money be used for?"
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="px-4 py-3 text-right">
                        {!isEdit && (
                          <button
                            type="button"
                            onClick={() => removeBudgetLineItem(index)}
                            className="text-lg text-gray-400 hover:text-red-500 transition"
                            aria-label="Remove budget row"
                          >
                            x
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                {!isEdit && (
                  <button
                    type="button"
                    onClick={addBudgetLineItem}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    + Add Row
                  </button>
                )}
                <div className="ml-auto text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    Total Budget: {formatCurrency(isEdit ? totalActualBudget : totalAssignedBudget)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isEdit ? 'Assigned Amount' : 'Actual Amount'}: {formatCurrency(isEdit ? totalAssignedBudget : totalActualBudget)}
                  </p>
                </div>
              </div>

              {budgetMessage && (
                <p className="mt-3 text-sm font-medium text-green-700">{budgetMessage}</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
