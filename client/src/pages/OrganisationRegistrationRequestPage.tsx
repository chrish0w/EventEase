import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import api from '../api/axios';

const organisationTypes = ['University', 'Student Association', 'Faculty / Department', 'Other'];
const ranges = ['1-10', '11-25', '26-50', '50+'];

const emptyForm = {
  organisationName: '',
  organisationDescription: '',
  organisationType: '',
  officialWebsite: '',
  officialEmail: '',
  adminFullName: '',
  adminEmail: '',
  adminRole: '',
  contactNumber: '',
  expectedClubs: '',
  expectedUsers: '',
  mainUseCase: '',
  additionalOfficialLink: '',
  additionalNotes: '',
  authorised: false,
  reviewAcknowledged: false,
  adminResponsibility: false,
};

type ProofFile = { name: string; type: string; size: number; data: string };

export default function OrganisationRegistrationRequestPage() {
  const [form, setForm] = useState(emptyForm);
  const [proofFile, setProofFile] = useState<ProofFile | null>(null);
  const [error, setError] = useState('');
  const [confirmationUrl, setConfirmationUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof emptyForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFile = (file?: File) => {
    setProofFile(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Please choose a file that is 5MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofFile({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!proofFile) return setError('Please upload proof of authority.');
    if (!form.authorised || !form.reviewAcknowledged || !form.adminResponsibility) {
      return setError('Please accept all declarations before submitting.');
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/organisation-registration-requests', {
        ...form,
        proofFile,
        declarations: {
          authorised: form.authorised,
          reviewAcknowledged: form.reviewAcknowledged,
          adminResponsibility: form.adminResponsibility,
        },
      });
      setConfirmationUrl(data.confirmationUrl || '');
      setSubmitted(true);
      setForm(emptyForm);
      setProofFile(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not submit your organisation request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <main className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-5 text-2xl">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Organisation Request Submitted</h1>
            <p className="text-gray-600">Confirm your email address before the request moves to super admin review.</p>
            {confirmationUrl && (
              <div className="mt-6 rounded-lg bg-blue-50 border border-blue-100 p-4 text-left">
                <p className="text-sm font-semibold text-blue-900 mb-2">Development confirmation link</p>
                <p className="text-xs text-blue-700 break-all">{confirmationUrl}</p>
                <a href={confirmationUrl} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">Confirm email now</a>
              </div>
            )}
            <Link to="/contact" className="mt-8 inline-flex bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg">Back to Contact</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase text-blue-600 tracking-wide mb-2">Organisation onboarding</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Request Organisation Registration</h1>
          <p className="text-gray-600 leading-relaxed">
            EventEase supports organisations that manage multiple clubs, societies, or student groups.
            A super administrator will review your request before creating the organisation workspace.
          </p>
        </div>
        {error && <div className="mb-6 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}
        <form onSubmit={submit} className="bg-white border border-gray-100 rounded-xl shadow-sm">
          <Section title="Organisation Details">
            <Field label="Organisation Name" value={form.organisationName} onChange={v => update('organisationName', v)} required />
            <Field label="Organisation Description" value={form.organisationDescription} onChange={v => update('organisationDescription', v)} required textarea />
            <Select label="Organisation Type" value={form.organisationType} onChange={v => update('organisationType', v)} options={organisationTypes} />
            <Field label="Official Organisation Website" value={form.officialWebsite} onChange={v => update('officialWebsite', v)} required type="url" />
            <Field label="Official Organisation Email" value={form.officialEmail} onChange={v => update('officialEmail', v)} required type="email" />
          </Section>
          <Section title="Primary Administrator Details">
            <Field label="Full Name" value={form.adminFullName} onChange={v => update('adminFullName', v)} required />
            <Field label="Email" value={form.adminEmail} onChange={v => update('adminEmail', v)} required type="email" />
            <Field label="Role / Position" value={form.adminRole} onChange={v => update('adminRole', v)} required />
            <Field label="Contact Number" value={form.contactNumber} onChange={v => update('contactNumber', v)} />
          </Section>
          <Section title="Organisation Scope">
            <Select label="Expected Number of Clubs" value={form.expectedClubs} onChange={v => update('expectedClubs', v)} options={ranges.map(r => `${r} clubs`)} />
            <Select label="Expected Number of Users" value={form.expectedUsers} onChange={v => update('expectedUsers', v)} options={ranges.map(r => `${r} users`)} />
            <Field label="Main Use Case" value={form.mainUseCase} onChange={v => update('mainUseCase', v)} required textarea />
          </Section>
          <Section title="Verification">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Upload Proof of Authority <span className="text-red-500">*</span></span>
              <input required type="file" onChange={e => handleFile(e.target.files?.[0])} className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
            </label>
            <Field label="Additional Official Link" value={form.additionalOfficialLink} onChange={v => update('additionalOfficialLink', v)} type="url" />
            <Field label="Additional Notes" value={form.additionalNotes} onChange={v => update('additionalNotes', v)} textarea />
          </Section>
          <section className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Declarations</h2>
            <Checkbox checked={form.authorised} onChange={v => update('authorised', v)} label="I confirm that I am authorised to request EventEase access for this organisation." />
            <Checkbox checked={form.reviewAcknowledged} onChange={v => update('reviewAcknowledged', v)} label="I understand that this request will be reviewed before the organisation is created." />
            <Checkbox checked={form.adminResponsibility} onChange={v => update('adminResponsibility', v)} label="I understand that organisation admins can manage clubs and users under this organisation." />
            <button disabled={submitting} className="mt-6 w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Organisation Registration Request'}
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900 mb-5">{title}</h2><div className="space-y-4">{children}</div></section>;
}

function Field({ label, value, onChange, required, textarea, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; textarea?: boolean; type?: string }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</span>{textarea ? <textarea required={required} value={value} onChange={e => onChange(e.target.value)} rows={4} className="form-input resize-none" /> : <input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} className="form-input" />}</label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">{label} <span className="text-red-500">*</span></span><select required value={value} onChange={e => onChange(e.target.value)} className="form-input"><option value="">Select option</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex items-start gap-3 text-sm text-gray-700 mb-3"><input required type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" /><span>{label}</span></label>;
}
