import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const roleOptions = [
  'Vice President',
  'Secretary',
  'Treasurer',
  'Events Officer',
  'General Committee Member',
  'Other',
];

const emptyForm = {
  orgId: '',
  clubName: '',
  clubDescription: '',
  clubCategory: '',
  officialClubLink: '',
  requesterFullName: '',
  requesterEmail: '',
  requesterRole: '',
  requesterRoleOther: '',
  isPresident: '',
  presidentFullName: '',
  presidentEmail: '',
  additionalNotes: '',
  authorised: false,
  reviewAcknowledged: false,
};

type ProofFile = {
  name: string;
  type: string;
  size: number;
  data: string;
};

type Organisation = {
  _id: string;
  name: string;
};

export default function ClubRegistrationRequestPage() {
  const [form, setForm] = useState(emptyForm);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [proofFile, setProofFile] = useState<ProofFile | null>(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [confirmationUrl, setConfirmationUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/club-registration-requests/organisations')
      .then(res => setOrganisations(res.data))
      .catch(() => setError('Could not load universities. Please refresh and try again.'));
  }, []);

  const updateForm = (field: keyof typeof emptyForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (file?: File) => {
    setFileError('');
    setProofFile(null);
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Please choose a file that is 5MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: String(reader.result),
      });
    };
    reader.onerror = () => setFileError('Could not read that file. Please try another file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!proofFile) {
      setError('Please upload proof of your club role.');
      return;
    }

    if (!form.authorised || !form.reviewAcknowledged) {
      setError('Please accept both declarations before submitting.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.requesterEmail.trim())) {
      setError('Please enter a valid requester email address.');
      return;
    }
    if (form.isPresident === 'no' && !emailPattern.test(form.presidentEmail.trim())) {
      setError('Please enter a valid president email address.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/club-registration-requests', {
        orgId: form.orgId,
        clubName: form.clubName,
        clubDescription: form.clubDescription,
        clubCategory: form.clubCategory,
        officialClubLink: form.officialClubLink,
        requesterFullName: form.requesterFullName,
        requesterEmail: form.requesterEmail,
        requesterRole: form.requesterRole === 'Other' ? form.requesterRoleOther : form.requesterRole,
        isPresident: form.isPresident === 'yes',
        presidentFullName: form.presidentFullName,
        presidentEmail: form.presidentEmail,
        proofFile,
        additionalNotes: form.additionalNotes,
        declarations: {
          authorised: form.authorised,
          reviewAcknowledged: form.reviewAcknowledged,
        },
      });
      setConfirmationUrl(data.confirmationUrl || '');
      setSubmitted(true);
      setForm(emptyForm);
      setProofFile(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not submit your registration request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-blue-600">EventEase</Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600">Login</Link>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-5 text-2xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Registration Request Submitted</h1>
            <p className="text-gray-600 leading-relaxed">
              Thanks for submitting your request. We have sent a confirmation email to verify your email address.
              Your request will move to admin review after confirmation.
            </p>
            <p className="text-gray-500 mt-4">You will be contacted once your request has been reviewed.</p>
            {confirmationUrl && (
              <div className="mt-6 rounded-lg bg-blue-50 border border-blue-100 p-4 text-left">
                <p className="text-sm font-semibold text-blue-900 mb-2">Development confirmation link</p>
                <p className="text-xs text-blue-700 break-all">{confirmationUrl}</p>
                <a href={confirmationUrl} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
                  Confirm email now
                </a>
              </div>
            )}
            <Link
              to="/"
              className="mt-8 inline-flex items-center justify-center bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-600">EventEase</Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-700">Home</Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600">Login</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-2">Club onboarding</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Request Club Registration</h1>
          <p className="text-gray-600 leading-relaxed">
            EventEase is for existing clubs and societies. If you are a current committee member,
            submit your club details below. An EventEase admin will review your request before creating your club workspace.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm">
          <section className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Club Details</h2>
            <p className="text-sm text-gray-500 mb-5">These are the details of the club being registered.</p>
            <div className="space-y-4">
              <FormField label="University" required>
                <select required value={form.orgId} onChange={e => updateForm('orgId', e.target.value)} className="form-input">
                  <option value="">Select university</option>
                  {organisations.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
                </select>
              </FormField>
              <FormField label="Club Name" required>
                <input required value={form.clubName} onChange={e => updateForm('clubName', e.target.value)} placeholder="Enter club name" className="form-input" />
              </FormField>
              <FormField label="Club Description" required>
                <textarea required value={form.clubDescription} onChange={e => updateForm('clubDescription', e.target.value)} placeholder="Briefly describe what your club does" rows={4} className="form-input resize-none" />
              </FormField>
              <FormField label="Club Category" required>
                <input required value={form.clubCategory} onChange={e => updateForm('clubCategory', e.target.value)} placeholder="Enter a category such as academic, cultural, sport, social, volunteering" className="form-input" />
              </FormField>
              <FormField label="Official Club Link" required>
                <input required type="url" value={form.officialClubLink} onChange={e => updateForm('officialClubLink', e.target.value)} placeholder="e.g. official club listing, website, Instagram, Facebook page" className="form-input" />
              </FormField>
            </div>
          </section>

          <section className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Details</h2>
            <p className="text-sm text-gray-500 mb-5">This section identifies the person submitting the request.</p>
            <div className="space-y-4">
              <FormField label="Full Name" required>
                <input required value={form.requesterFullName} onChange={e => updateForm('requesterFullName', e.target.value)} placeholder="Enter your full name" className="form-input" />
              </FormField>
              <FormField label="Email" required>
                <input required type="email" value={form.requesterEmail} onChange={e => updateForm('requesterEmail', e.target.value)} placeholder="Enter your email address" className="form-input" />
              </FormField>
              <FormField label="Your Role in the Club" required>
                <select required value={form.requesterRole} onChange={e => updateForm('requesterRole', e.target.value)} className="form-input">
                  <option value="">Select role</option>
                  {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </FormField>
              {form.requesterRole === 'Other' && (
                <FormField label="Please specify your role" required>
                  <input required value={form.requesterRoleOther} onChange={e => updateForm('requesterRoleOther', e.target.value)} placeholder="Enter role" className="form-input" />
                </FormField>
              )}
            </div>
          </section>

          <section className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">President Details</h2>
            <FormField label="Are you the current club president?" required>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ].map(option => (
                  <label key={option.value} className={`flex items-center justify-center border rounded-lg px-4 py-3 text-sm font-medium cursor-pointer transition ${form.isPresident === option.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input
                      required
                      type="radio"
                      name="isPresident"
                      value={option.value}
                      checked={form.isPresident === option.value}
                      onChange={e => updateForm('isPresident', e.target.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </FormField>
            {form.isPresident === 'no' && (
              <div className="mt-4 space-y-4">
                <FormField label="President Full Name" required>
                  <input required value={form.presidentFullName} onChange={e => updateForm('presidentFullName', e.target.value)} placeholder="Enter president's full name" className="form-input" />
                </FormField>
                <FormField label="President Email" required>
                  <input required type="email" value={form.presidentEmail} onChange={e => updateForm('presidentEmail', e.target.value)} placeholder="Enter president's email address" className="form-input" />
                </FormField>
              </div>
            )}
          </section>

          <section className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Verification</h2>
            <p className="text-sm text-gray-500 mb-5">
              Accepted examples include committee confirmation, AGM minutes, official committee listing,
              email from an official club account, or an MSA-related club document.
            </p>
            <div className="space-y-4">
              <FormField label="Upload Proof of Club Role" required>
                <input required type="file" onChange={e => handleFileChange(e.target.files?.[0])} className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
                {proofFile && <p className="mt-2 text-xs text-green-700">{proofFile.name} selected</p>}
                {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}
              </FormField>
              <FormField label="Additional Notes">
                <textarea value={form.additionalNotes} onChange={e => updateForm('additionalNotes', e.target.value)} placeholder="Add any extra information that may help us verify your request" rows={4} className="form-input resize-none" />
              </FormField>
            </div>
          </section>

          <section className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Declarations</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input required type="checkbox" checked={form.authorised} onChange={e => updateForm('authorised', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span>I confirm that I am authorised to request EventEase access for this club.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input required type="checkbox" checked={form.reviewAcknowledged} onChange={e => updateForm('reviewAcknowledged', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span>I understand that this request will be reviewed before my club is created on EventEase.</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Registration Request'}
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
