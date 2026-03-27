import { useEffect, useMemo, useState } from 'react';
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
  label: string;
  budgetedAmount: number;
  actualAmount: number;
  notes: string;
}

interface EventBudgetResponse {
  totalBudget: number;
  remainingBudget: number;
  event: {
    id: string;
    name: string;
    date: string;
    category: string;
    lineItems: BudgetLineItem[];
    budgetedAmount: number;
    actualAmount: number;
  };
}

const COMMITTEE_ROLES = [
  { value: 'finance', label: 'Finance', icon: 'Finance' },
  { value: 'logistics', label: 'Logistics', icon: 'Logistics' },
  { value: 'equipment', label: 'Equipment', icon: 'Equipment' },
  { value: 'transport', label: 'Transport', icon: 'Transport' },
  { value: 'general', label: 'General', icon: 'General' },
];

const CATEGORIES = [
  { value: 'social', label: 'Social', icon: 'Social' },
  { value: 'sports', label: 'Sports', icon: 'Sports' },
  { value: 'outdoor', label: 'Outdoor', icon: 'Outdoor' },
  { value: 'finance', label: 'Finance', icon: 'Finance' },
  { value: 'other', label: 'Other', icon: 'Other' },
];

const emptyLineItem = (): BudgetLineItem => ({
  label: '',
  budgetedAmount: 0,
  actualAmount: 0,
  notes: '',
});

export default function CreateEventPage() {
  const { selectedClub, updateSelectedClub } = useAuth();
  const navigate = useNavigate();
  const { id: eventId } = useParams<{ id?: string }>();
  const isEdit = !!eventId;
  const isPresident = selectedClub?.role === 'president';

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    category: 'other',
    status: 'draft',
    capacity: '',
    rsvpDeadline: '',
  });
  const [assignedCommittee, setAssignedCommittee] = useState<AssignedMember[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [totalBudget, setTotalBudget] = useState('0');
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [otherEventAllocations, setOtherEventAllocations] = useState(0);
  const [budgetLineItems, setBudgetLineItems] = useState<BudgetLineItem[]>([emptyLineItem()]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !eventId) return;

    api.get(`/events/${eventId}`)
      .then((res) => {
        const event = res.data;
        setForm({
          title: event.title ?? '',
          description: event.description ?? '',
          date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '',
          location: event.location ?? '',
          category: event.category ?? 'other',
          status: event.status ?? 'draft',
          capacity: event.capacity ? String(event.capacity) : '',
          rsvpDeadline: event.rsvpDeadline ? event.rsvpDeadline.slice(0, 10) : '',
        });
        if (event.assignedCommittee) {
          setAssignedCommittee(event.assignedCommittee.map((assignment: { userId: { _id: string }; role: string }) => ({
            userId: assignment.userId._id,
            role: assignment.role,
          })));
        }
      })
      .catch((err) => {
        const message = err.response?.data?.message || 'Failed to load event.';
        setError(message);
      });
  }, [eventId, isEdit]);

  useEffect(() => {
    if (!isPresident || !selectedClub?.clubId) return;

    api.get(`/events/committee-members?clubId=${selectedClub.clubId}`)
      .then((res) => setCommitteeMembers(res.data))
      .catch(() => {});
  }, [isPresident, selectedClub?.clubId]);

  useEffect(() => {
    if (!isPresident || !isEdit || !eventId || !selectedClub?.clubId) return;

    setBudgetLoading(true);
    api.get<EventBudgetResponse>(`/budget/event/${eventId}?clubId=${selectedClub.clubId}`)
      .then((res) => {
        const nextTotalBudget = res.data.totalBudget ?? 0;
        const nextRemainingBudget = res.data.remainingBudget ?? 0;
        const currentEventBudget = res.data.event?.budgetedAmount ?? 0;

        setTotalBudget(String(nextTotalBudget));
        setRemainingBudget(nextRemainingBudget);
        setOtherEventAllocations(nextTotalBudget - nextRemainingBudget - currentEventBudget);
        setBudgetLineItems(res.data.event?.lineItems?.length ? res.data.event.lineItems : [emptyLineItem()]);
        updateSelectedClub({
          totalBudget: nextTotalBudget,
          remainingBudget: nextRemainingBudget,
        });
      })
      .catch((err) => {
        const message = err.response?.data?.message || 'Failed to load event budget.';
        setError(message);
      })
      .finally(() => setBudgetLoading(false));
  }, [eventId, isEdit, isPresident, selectedClub?.clubId, updateSelectedClub]);

  const currentBudgetedAmount = useMemo(
    () => budgetLineItems.reduce((sum, item) => sum + Number(item.budgetedAmount || 0), 0),
    [budgetLineItems]
  );

  const currentActualAmount = useMemo(
    () => budgetLineItems.reduce((sum, item) => sum + Number(item.actualAmount || 0), 0),
    [budgetLineItems]
  );

  const projectedRemaining = Number(totalBudget || 0) - otherEventAllocations - currentBudgetedAmount;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addCommitteeMember = () => {
    setAssignedCommittee((prev) => [...prev, { userId: '', role: 'general' }]);
  };

  const updateAssignment = (index: number, field: 'userId' | 'role', value: string) => {
    setAssignedCommittee((prev) => prev.map((assignment, assignmentIndex) => (
      assignmentIndex === index ? { ...assignment, [field]: value } : assignment
    )));
  };

  const removeAssignment = (index: number) => {
    setAssignedCommittee((prev) => prev.filter((_, assignmentIndex) => assignmentIndex !== index));
  };

  const updateLineItem = (index: number, field: keyof BudgetLineItem, value: string) => {
    setBudgetLineItems((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? {
            ...item,
            [field]: field === 'label' || field === 'notes' ? value : Number(value || 0),
          }
        : item
    )));
  };

  const addLineItem = () => {
    setBudgetLineItems((prev) => [...prev, emptyLineItem()]);
  };

  const removeLineItem = (index: number) => {
    setBudgetLineItems((prev) => {
      const nextLineItems = prev.filter((_, itemIndex) => itemIndex !== index);
      return nextLineItems.length ? nextLineItems : [emptyLineItem()];
    });
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
        payload.assignedCommittee = assignedCommittee.filter((assignment) => assignment.userId);
      }

      if (isEdit && eventId) {
        await api.put(`/events/${eventId}`, payload);

        if (isPresident && selectedClub?.clubId) {
          const budgetRes = await api.put<EventBudgetResponse>(`/budget/event/${eventId}`, {
            clubId: selectedClub.clubId,
            totalBudget: Number(totalBudget || 0),
            lineItems: budgetLineItems.map((item) => ({
              label: item.label,
              budgetedAmount: Number(item.budgetedAmount || 0),
              actualAmount: Number(item.actualAmount || 0),
              notes: item.notes,
            })),
          });

          const nextTotalBudget = budgetRes.data.totalBudget ?? 0;
          const nextRemainingBudget = budgetRes.data.remainingBudget ?? 0;
          const currentEventBudget = budgetRes.data.event?.budgetedAmount ?? 0;

          updateSelectedClub({
            totalBudget: nextTotalBudget,
            remainingBudget: nextRemainingBudget,
          });
          setRemainingBudget(nextRemainingBudget);
          setOtherEventAllocations(nextTotalBudget - nextRemainingBudget - currentEventBudget);
        }
      } else {
        await api.post('/events', payload);
      }

      navigate(isPresident ? '/president/events' : '/committee/events');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || (isEdit ? 'Failed to save event.' : 'Failed to create event.'));
    } finally {
      setLoading(false);
    }
  };

  const backPath = isPresident ? '/president/events' : '/committee/events';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="text-gray-500 transition hover:text-gray-700"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Edit Event' : 'Create New Event'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-700">Event Details</h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Annual Charity Gala"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What is this event about?"
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g. Campus Hall A"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>{category.icon} {category.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    min="1"
                    placeholder="Max attendees"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">RSVP Deadline</label>
                  <input
                    type="date"
                    name="rsvpDeadline"
                    value={form.rsvpDeadline}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {form.category === 'outdoor' && (
            <div className="flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <span className="text-xl">Warning</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">Safety Disclaimer Required</p>
                <p className="mt-0.5 text-sm text-orange-700">
                  Outdoor events require attendees to acknowledge a safety disclaimer before RSVPing.
                </p>
              </div>
            </div>
          )}

          {isPresident && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-700">Assign Committee Members</h2>
                <button
                  type="button"
                  onClick={addCommitteeMember}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add Member
                </button>
              </div>

              {assignedCommittee.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No committee members assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {assignedCommittee.map((assignment, index) => (
                    <div key={`${assignment.userId}-${index}`} className="flex items-center gap-3">
                      <select
                        value={assignment.userId}
                        onChange={(e) => updateAssignment(index, 'userId', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select member...</option>
                        {committeeMembers.map((member) => (
                          <option key={member._id} value={member._id}>{member.name} ({member.email})</option>
                        ))}
                      </select>
                      <select
                        value={assignment.role}
                        onChange={(e) => updateAssignment(index, 'role', e.target.value)}
                        className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {COMMITTEE_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>{role.icon} {role.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeAssignment(index)}
                        className="text-lg text-gray-400 transition hover:text-red-500"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isPresident && isEdit && (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-700">Event Budget</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Budget is now managed inside each event. Edit the club total and this event&apos;s line items here.
                </p>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Total Club Budget</label>
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        value={totalBudget}
                        onChange={(event) => setTotalBudget(event.target.value)}
                        className="w-full bg-transparent px-2 py-2 text-sm text-gray-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">This Event Budgeted</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">${currentBudgetedAmount.toFixed(2)}</p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Projected Remaining</p>
                    <p className="mt-2 text-2xl font-bold text-amber-900">${projectedRemaining.toFixed(2)}</p>
                  </div>
                </div>

                {budgetLoading ? (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                    Loading event budget...
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-700">
                            <th className="border-b border-gray-200 px-4 py-3 font-semibold">Item</th>
                            <th className="border-b border-gray-200 px-4 py-3 font-semibold">Budgeted Amount</th>
                            <th className="border-b border-gray-200 px-4 py-3 font-semibold">Actual Amount</th>
                            <th className="border-b border-gray-200 px-4 py-3 font-semibold">Notes</th>
                            <th className="border-b border-gray-200 px-4 py-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetLineItems.map((item, index) => (
                            <tr key={item._id ?? `budget-item-${index}`}>
                              <td className="border-b border-gray-200 px-4 py-3">
                                <input
                                  value={item.label}
                                  onChange={(event) => updateLineItem(index, 'label', event.target.value)}
                                  placeholder="e.g. Food, venue, transport"
                                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="border-b border-gray-200 px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.budgetedAmount}
                                  onChange={(event) => updateLineItem(index, 'budgetedAmount', event.target.value)}
                                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="border-b border-gray-200 px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.actualAmount}
                                  onChange={(event) => updateLineItem(index, 'actualAmount', event.target.value)}
                                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="border-b border-gray-200 px-4 py-3">
                                <input
                                  value={item.notes}
                                  onChange={(event) => updateLineItem(index, 'notes', event.target.value)}
                                  placeholder="Optional notes"
                                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="border-b border-gray-200 px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => removeLineItem(index)}
                                  className="text-xs font-medium text-red-500 transition hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={addLineItem}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        + Add Budget Row
                      </button>

                      <div className="text-right text-sm text-gray-500">
                        <p>Actual spent: <span className="font-semibold text-gray-800">${currentActualAmount.toFixed(2)}</span></p>
                        <p>Saved remaining: <span className="font-semibold text-gray-800">${remainingBudget.toFixed(2)}</span></p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || budgetLoading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
