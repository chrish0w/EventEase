import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DisclaimerMarkdown from '../components/DisclaimerMarkdown';
import PdfPreview from '../components/PdfPreview';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface UserRef {
  _id: string;
  name: string;
  email: string;
}

interface Template {
  _id: string;
  clubId: string;
  title: string;
  type: 'text' | 'pdf';
  content: string | null;
  fileUrl: string | null;
  createdBy?: UserRef;
  updatedBy?: UserRef;
  createdAt: string;
  updatedAt: string;
}

const presidentSidebarLinks = [
  { icon: '🏠', label: 'Dashboard', path: '/president/dashboard' },
  { icon: '📅', label: 'Events', path: '/president/events' },
  { icon: '✅', label: 'Tasks', path: null as string | null },
  { icon: '💰', label: 'Budget', path: '/president/budget' },
  { icon: '👥', label: 'Members', path: '/president/members' },
  { icon: '⚠️', label: 'Safety Disclaimers', path: '/president/disclaimers' },
];

const committeeSidebarLinks = [
  { icon: '🏠', label: 'Dashboard', path: '/committee/dashboard' },
  { icon: '📅', label: 'Events', path: '/committee/events' },
  { icon: '✅', label: 'Tasks', path: null as string | null },
  { icon: '👥', label: 'Members', path: null as string | null },
  { icon: '⚠️', label: 'Safety Disclaimers', path: '/committee/disclaimers' },
];

function timeAgo(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DisclaimersPage() {
  const { selectedClub } = useAuth();
  const navigate = useNavigate();
  const isPresident = selectedClub?.role === 'president';
  const sidebarLinks = isPresident ? presidentSidebarLinks : committeeSidebarLinks;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorTemplate, setEditorTemplate] = useState<Template | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState('');

  const fetchTemplates = () => {
    if (!selectedClub?.clubId) return;
    setLoading(true);
    api.get<Template[]>(`/disclaimer-templates?clubId=${selectedClub.clubId}`)
      .then(res => setTemplates(res.data))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedClub?.clubId]);

  const openCreate = () => {
    setEditorMode('create');
    setEditorTemplate(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorError('');
    setEditorOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditorMode('edit');
    setEditorTemplate(t);
    setEditorTitle(t.title);
    setEditorContent(t.content ?? '');
    setEditorError('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (editorSaving) return;
    setEditorOpen(false);
  };

  const handleSave = async () => {
    if (!selectedClub?.clubId) return;
    if (!editorTitle.trim() || !editorContent.trim()) {
      setEditorError('Title and content are required');
      return;
    }
    setEditorSaving(true);
    setEditorError('');
    try {
      if (editorMode === 'create') {
        await api.post('/disclaimer-templates', {
          clubId: selectedClub.clubId,
          title: editorTitle.trim(),
          content: editorContent,
        });
      } else if (editorTemplate) {
        await api.put(`/disclaimer-templates/${editorTemplate._id}`, {
          title: editorTitle.trim(),
          content: editorContent,
        });
      }
      setEditorOpen(false);
      fetchTemplates();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditorError(msg || 'Failed to save template');
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Delete template "${t.title}"? Existing events keep their snapshot.`)) return;
    try {
      await api.delete(`/disclaimer-templates/${t._id}`);
      setTemplates(prev => prev.filter(x => x._id !== t._id));
    } catch {
      alert('Failed to delete template.');
    }
  };

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
                  href="#"
                  onClick={e => { e.preventDefault(); if (link.path) navigate(link.path); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    link.label === 'Safety Disclaimers'
                      ? (isPresident ? 'bg-yellow-50 text-yellow-800 font-medium' : 'bg-purple-50 text-purple-700 font-medium')
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
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Safety Disclaimers</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isPresident
                  ? 'Manage disclaimer templates that committee can attach when creating events.'
                  : 'Read-only library of disclaimer templates for this club.'}
              </p>
            </div>
            {isPresident && (
              <button
                onClick={openCreate}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                + New Template
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 font-medium">No templates yet</p>
              <p className="text-gray-400 text-sm mt-1">
                {isPresident
                  ? 'Create one to allow events to attach a safety disclaimer.'
                  : 'Ask your president to create disclaimer templates.'}
              </p>
              {isPresident && (
                <button
                  onClick={openCreate}
                  className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                >
                  Create Template
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => {
                const isExpanded = expandedId === t._id;
                return (
                  <div key={t._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-800">{t.title}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            t.type === 'pdf' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {t.type === 'pdf' ? '📕 PDF' : '📄 Text'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Updated {timeAgo(t.updatedAt)}
                          {t.updatedBy?.name ? ` by ${t.updatedBy.name}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : t._id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                        {isPresident && (
                          <>
                            <button
                              onClick={() => openEdit(t)}
                              className="text-xs text-gray-500 hover:text-gray-800 font-medium"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              className="text-xs text-red-400 hover:text-red-600 font-medium"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        {t.type === 'pdf' ? (
                          <PdfPreview url={`/disclaimer-templates/${t._id}/file`} />
                        ) : (
                          <DisclaimerMarkdown content={t.content ?? ''} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editorMode === 'create' ? 'New Disclaimer Template' : 'Edit Disclaimer Template'}
              </h2>
              <button
                onClick={closeEditor}
                className="text-gray-400 hover:text-gray-600 text-xl"
                disabled={editorSaving}
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editorTitle}
                  onChange={e => setEditorTitle(e.target.value)}
                  placeholder="e.g. Outdoor Hiking Disclaimer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content (Markdown) *
                  </label>
                  <textarea
                    value={editorContent}
                    onChange={e => setEditorContent(e.target.value)}
                    rows={16}
                    placeholder={'## Risks\n\n- Item one\n- Item two\n\nBy participating you acknowledge...'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Supports headings, lists, links, **bold**, *italic*, and tables.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Live Preview</label>
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 h-[420px] overflow-y-auto">
                    <DisclaimerMarkdown content={editorContent} />
                  </div>
                </div>
              </div>

              {editorError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
                  {editorError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={closeEditor}
                disabled={editorSaving}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={editorSaving}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {editorSaving ? 'Saving...' : (editorMode === 'create' ? 'Create' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
