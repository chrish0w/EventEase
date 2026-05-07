import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import Reveal from '../components/Reveal';

const flow = [
  ['01', 'Request enters', 'Organisation or club requests start from Contact and include evidence.'],
  ['02', 'Review lands correctly', 'Super admins review organisations; org admins review clubs.'],
  ['03', 'Workspace opens', 'Approved requests become governed workspaces with the right roles.'],
  ['04', 'Committees run events', 'Presidents and committees manage events, budgets, tasks, and members.'],
];

const signals = [
  ['Pending review', '12'],
  ['Active clubs', '48'],
  ['Assigned roles', '186'],
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PublicNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_18%_22%,#2563eb,transparent_34%),radial-gradient(circle_at_78%_30%,#0f766e,transparent_32%),linear-gradient(135deg,#020617,#0f172a_48%,#022c22)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-14 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200 mb-5">Club operations platform</p>
              <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
                One workspace for organisations and the clubs they support.
              </h1>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl">
                EventEase gives student organisations a clear way to review onboarding requests,
                assign responsibility, and help clubs run events without losing context.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-400 transition text-center">
                  Explore Events
                </Link>
                <Link to="/contact" className="bg-white text-gray-950 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition text-center">
                  Start a Request
                </Link>
                <Link to="/about" className="border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition text-center">
                  Learn More
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm text-gray-300">EventEase overview</p>
                    <p className="text-xl font-bold">Workspace pipeline</p>
                  </div>
                  <span className="rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold px-3 py-1">Live flow</span>
                </div>
                <div className="space-y-3">
                  {flow.map(([number, title, body], index) => (
                    <div key={number} className={`group rounded-xl border border-white/10 bg-gray-950/50 p-4 hover:bg-white/10 transition ${index % 2 === 0 ? 'scroll-slide-left' : 'scroll-slide-right'}`}>
                      <div className="flex gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-500/20 text-blue-100 flex items-center justify-center font-bold">{number}</div>
                        <div>
                          <p className="font-semibold">{title}</p>
                          <p className="text-sm text-gray-400 mt-1">{body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {signals.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-white/10 border border-white/10 p-3">
                      <p className="text-2xl font-black">{value}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-28 overflow-hidden bg-gray-950">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_18%_55%,#f97316,transparent_26%),radial-gradient(circle_at_78%_28%,#2563eb,transparent_28%)]" />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-14 items-center">
          <Reveal className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl scroll-slide-left">
            <div className="aspect-[1.1/1] bg-[radial-gradient(circle_at_30%_28%,#fef3c7,transparent_18%),radial-gradient(circle_at_72%_38%,#fb923c,transparent_20%),linear-gradient(135deg,#0f172a,#1e3a8a_45%,#0f766e)] p-8 flex items-end">
              <div className="w-full rounded-2xl bg-gray-950/60 border border-white/10 p-5 backdrop-blur">
                <p className="text-sm uppercase tracking-[0.18em] text-orange-200 font-bold mb-3">For students</p>
                <div className="grid grid-cols-3 gap-3">
                  {['Markets', 'Workshops', 'Socials'].map(label => (
                    <div key={label} className="rounded-xl bg-white/10 p-3">
                      <div className="h-16 rounded-lg bg-white/10 mb-3" />
                      <p className="text-xs font-semibold text-gray-200">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal className="scroll-slide-right">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-200 mb-4">Discover campus life</p>
            <h2 className="text-4xl md:text-6xl font-black leading-tight mb-6">Find clubs, browse events, and keep track of what you are going to.</h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-8">
              Members can choose their organisation, explore clubs in that community, RSVP to published events,
              and keep a personal dashboard of upcoming and past activity.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register" className="bg-white text-gray-950 font-semibold px-6 py-3 rounded-lg hover:bg-orange-50 transition text-center">
                Create a Member Account
              </Link>
              <Link to="/login" className="border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition text-center">
                Sign In
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative px-6 py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_20%,#2563eb,transparent_30%),radial-gradient(circle_at_75%_80%,#0f766e,transparent_28%)]" />
        <div className="relative max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200 mb-3">Who EventEase supports</p>
            <h2 className="text-3xl md:text-4xl font-black">A connected workflow from approval to event delivery.</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Reveal delay={0}><InfoCard index="01" title="For organisations" body="Approve organisation-level access, assign admins, and keep club onboarding governed." /></Reveal>
            <Reveal delay={120}><InfoCard index="02" title="For clubs" body="Request a workspace, nominate a president, and move into event planning after approval." /></Reveal>
            <Reveal delay={240}><InfoCard index="03" title="For committees" body="Work from one place for events, responsibilities, budgets, and member coordination." /></Reveal>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_22%_40%,#2563eb,transparent_30%),radial-gradient(circle_at_78%_20%,#0f766e,transparent_32%)]" />
        <Reveal className="relative max-w-5xl mx-auto rounded-2xl border border-white/10 bg-white/5 px-8 md:px-12 py-16 md:py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-10 scroll-scale-focus">
          <div>
            <h2 className="text-3xl font-bold mb-2">Need to onboard an organisation or club?</h2>
            <p className="text-gray-400">Contact has both request paths in one place.</p>
          </div>
          <Link to="/contact" className="bg-white text-gray-950 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition text-center">
            Open Contact
          </Link>
        </Reveal>
      </section>

      <footer className="bg-gray-950 text-gray-400 pt-6 pb-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-white font-semibold">EventEase</p>
          <p className="text-sm">© 2026 EventEase. Built for organisations, clubs, and student communities.</p>
        </div>
      </footer>
    </div>
  );
}

function InfoCard({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-10 md:p-12 min-h-80 md:min-h-96 hover:bg-white/10 hover:-translate-y-1 transition flex flex-col justify-between scroll-card-rise">
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-8">
        <div className="h-full bg-blue-300 scroll-progress-fill" />
      </div>
      <div>
        <p className="text-sm font-bold text-blue-200 mb-5">{index}</p>
        <h3 className="text-2xl md:text-3xl font-semibold mb-4">{title}</h3>
        <p className="text-base text-gray-400 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
