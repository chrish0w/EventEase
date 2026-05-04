import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PublicNav />
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_18%_20%,#2563eb,transparent_30%),radial-gradient(circle_at_80%_28%,#0f766e,transparent_32%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200 mb-3">Contact</p>
            <h1 className="text-5xl md:text-6xl font-black mb-5">Request access to EventEase</h1>
            <p className="text-gray-300 leading-relaxed text-lg">
            Choose the request type that matches what you manage. Organisation requests are reviewed by
            super admins. Club requests are routed to the selected organisation admin.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <RequestCard
              title="Register an Organisation"
              body="For universities, student associations, faculty bodies, or authorised representatives managing multiple clubs."
              to="/request-organisation-registration"
              label="Request Organisation Access"
            />
            <RequestCard
              title="Register a Club"
              body="For existing clubs or societies that want a workspace under an existing organisation."
              to="/request-club-registration"
              label="Request Club Registration"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function RequestCard({ title, body, to, label }: { title: string; body: string; to: string; label: string }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur">
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      <p className="text-gray-300 text-sm leading-relaxed mb-6">{body}</p>
      <Link to={to} className="inline-flex bg-white text-gray-950 font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50">
        {label}
      </Link>
    </div>
  );
}
