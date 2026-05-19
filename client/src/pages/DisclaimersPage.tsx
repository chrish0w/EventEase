import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import CommitteeWorkspaceNav from '../components/CommitteeWorkspaceNav';
import PresidentWorkspaceNav from '../components/PresidentWorkspaceNav';
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
  const isPresident = selectedClub?.role === 'president';

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
  const [editorType, setEditorType] = useState<'text' | 'pdf'>('text');
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorLocalPdfUrl, setEditorLocalPdfUrl] = useState<string>('');

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

  useEffect(() => {
    if (!editorFile) {
      setEditorLocalPdfUrl('');
      return;
    }
    const url = URL.createObjectURL(editorFile);
    setEditorLocalPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [editorFile]);

  const openCreate = () => {
    setEditorMode('create');
    setEditorTemplate(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorError('');
    setEditorType('text');
    setEditorFile(null);
    setEditorLocalPdfUrl('');
    setEditorOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditorMode('edit');
    setEditorTemplate(t);
    setEditorTitle(t.title);
    setEditorContent(t.content ?? '');
    setEditorError('');
    setEditorType(t.type);
    setEditorFile(null);
    setEditorLocalPdfUrl('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (editorSaving) return;
    setEditorOpen(false);
  };

  const handleSave = async () => {
    setEditorError('');
    if (!editorTitle.trim()) {
      setEditorError('Title is required');
      return;
    }
    if (editorType === 'text' && !editorContent.trim()) {
      setEditorError('Content is required');
      return;
    }
    if (editorMode === 'create' && editorType === 'pdf' && !editorFile) {
      setEditorError('Please select a PDF file');
      return;
    }
    setEditorSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', editorTitle.trim());
      if (editorMode === 'create') {
        fd.append('clubId', selectedClub!.clubId);
        fd.append('type', editorType);
      }
      if (editorType === 'text') {
        fd.append('content', editorContent);
      } else if (editorFile) {
        fd.append('file', editorFile);
      }

      if (editorMode === 'create') {
        await api.post('/disclaimer-templates', fd);
      } else if (editorTemplate) {
        await api.put(`/disclaimer-templates/${editorTemplate._id}`, fd);
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
    <div className={`${isPresident ? 'president-workspace min-h-screen bg-[#201609]' : 'committee-workspace min-h-screen bg-[#140f24]'}`}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        {isPresident ? (
          <PresidentWorkspaceNav active="Safety Disclaimers" />
        ) : (
          <CommitteeWorkspaceNav active="Safety Disclaimers" />
        )}

        {/* Main */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">Safety Disclaimers</h1>
              <p className={`text-sm mt-0.5 ${isPresident ? 'text-yellow-100/80' : 'text-purple-100/80'}`}>
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
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Type</p>
                <div className="flex gap-3">
                  <label className={`flex-1 border rounded-lg p-3 cursor-pointer ${editorType === 'text' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${editorMode === 'edit' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="radio" name="type" value="text" checked={editorType === 'text'}
                           onChange={() => setEditorType('text')} disabled={editorMode === 'edit'} className="mr-2" />
                    📄 Text (Markdown)
                  </label>
                  <label className={`flex-1 border rounded-lg p-3 cursor-pointer ${editorType === 'pdf' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'} ${editorMode === 'edit' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="radio" name="type" value="pdf" checked={editorType === 'pdf'}
                           onChange={() => setEditorType('pdf')} disabled={editorMode === 'edit'} className="mr-2" />
                    📕 PDF
                  </label>
                </div>
                {editorMode === 'edit' && (
                  <p className="text-xs text-gray-500 mt-1">Type cannot be changed after creation. Create a new template if needed.</p>
                )}
              </div>

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

              {editorType === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (Markdown)</label>
                  <textarea value={editorContent} onChange={e => setEditorContent(e.target.value)} rows={10}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editorMode === 'edit' ? 'Replace PDF (optional)' : 'PDF file *'}
                  </label>
                  <input type="file" accept="application/pdf,.pdf"
                    onChange={e => setEditorFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  {editorFile && (
                    <p className="text-xs text-gray-500 mt-1">{editorFile.name} — {(editorFile.size / 1024).toFixed(1)} KB</p>
                  )}
                  {editorLocalPdfUrl && (
                    <iframe src={editorLocalPdfUrl} title="New PDF preview" className="mt-2 w-full h-64 border border-gray-200 rounded-lg" />
                  )}
                  {editorMode === 'edit' && !editorFile && editorTemplate?.fileUrl && (
                    <p className="text-xs text-gray-400 mt-2">Current file will be kept if you don't pick a new one.</p>
                  )}
                </div>
              )}

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
