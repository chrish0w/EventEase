import { useState, useEffect } from 'react';
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
      } else {
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
      <div className="max-w-2xl mx-auto px-6 py-8">
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
