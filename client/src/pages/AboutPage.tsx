import PublicNav from '../components/PublicNav';

const values = [
  ['🏆', 'Share success', 'Strong events and well-run clubs should be easier to repeat, not rediscovered every semester.'],
  ['🎯', 'Make it happen', 'Clear approvals, clear owners, and clear next steps keep teams moving.'],
  ['🧩', 'Challenge assumptions', 'EventEase separates responsibilities so each organisation can shape a workflow that fits.'],
  ['📚', 'Keep learning', 'Every request, role, and event leaves context that helps future committees improve.'],
  ['🚀', 'Go above and beyond', 'We build for the clubs that want to operate with confidence and ambition.'],
];

const workflowTiles = [
  {
    step: '01',
    title: 'Review',
    body: 'Requests arrive with club details, authority evidence, and the nominated admin path.',
    meta: 'Evidence checked',
    accent: 'from-blue-500/30 to-cyan-400/10',
    className: 'lg:translate-y-2 scroll-slide-left',
  },
  {
    step: '02',
    title: 'Approve',
    body: 'The right organisation admin reviews the request before any workspace is created.',
    meta: 'Admin decision',
    accent: 'from-emerald-500/30 to-teal-300/10',
    className: 'lg:translate-y-14 scroll-slide-right',
  },
  {
    step: '03',
    title: 'Assign',
    body: 'Presidents and organisation admins are linked by email, with pending invites handled cleanly.',
    meta: 'Roles linked',
    accent: 'from-cyan-500/30 to-blue-300/10',
    className: 'lg:-translate-y-4 scroll-slide-left',
  },
  {
    step: '04',
    title: 'Operate',
    body: 'Committees move into event planning with responsibilities, budgets, and members in one place.',
    meta: 'Clubs active',
    accent: 'from-indigo-500/30 to-violet-300/10',
    className: 'lg:translate-y-8 scroll-slide-right',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PublicNav />
      <main>
        <section className="relative overflow-hidden px-6 py-20 md:py-28">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_15%_20%,#2563eb,transparent_30%),radial-gradient(circle_at_85%_10%,#0f766e,transparent_28%)]" />
          <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_620px] gap-14 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200 mb-4">About Us</p>
              <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">Built for layered student communities.</h1>
              <p className="text-lg text-gray-300 leading-relaxed">
                EventEase separates platform governance from organisation administration and club operations,
                so requests are reviewed by the people responsible for the right workspace.
              </p>
            </div>
            <div className="relative reveal-soft">
              <div className="absolute left-1/2 top-8 bottom-8 hidden w-px -translate-x-1/2 bg-gradient-to-b from-blue-300/0 via-blue-200/40 to-emerald-200/0 lg:block" />
              <div className="absolute inset-x-10 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-blue-300/0 via-teal-200/30 to-blue-300/0 lg:block" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                {workflowTiles.map(tile => (
                  <WorkflowTile key={tile.step} {...tile} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 bg-gray-900 border-y border-white/10">
          <div className="max-w-7xl mx-auto reveal-up scroll-scale-focus">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-200 mb-3">Mission Statement</p>
            <h2 className="text-3xl md:text-4xl font-bold max-w-4xl">
              To give student organisations and clubs a trusted operating system for approvals,
              responsibilities, and event delivery.
            </h2>
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-5xl md:text-6xl font-black mb-16"><span className="text-blue-300">EventEase</span> Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16">
              {values.slice(0, 3).map(([icon, title, body]) => (
                <ValueItem key={title} icon={icon} title={title} body={body} />
              ))}
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16 max-w-3xl mx-auto">
              {values.slice(3).map(([icon, title, body]) => (
                <ValueItem key={title} icon={icon} title={title} body={body} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function WorkflowTile({
  step,
  title,
  body,
  meta,
  accent,
  className,
}: {
  step: string;
  title: string;
  body: string;
  meta: string;
  accent: string;
  className: string;
}) {
  return (
    <div className={`relative min-h-56 overflow-hidden rounded-2xl border border-white/10 bg-gray-950/55 p-6 shadow-2xl backdrop-blur scroll-depth-card ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10 bg-white/10" />
      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-blue-100">{step}</span>
          <span className="rounded-full bg-gray-950/60 px-3 py-1 text-xs font-semibold text-gray-300">{meta}</span>
        </div>
        <div>
          <h3 className="text-2xl font-black mb-3">{title}</h3>
          <p className="text-sm leading-relaxed text-gray-300">{body}</p>
        </div>
      </div>
    </div>
  );
}

function ValueItem({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center reveal-up">
      <div className="h-36 w-36 md:h-44 md:w-44 rounded-[2rem] bg-blue-500/15 border border-white/10 flex items-center justify-center text-7xl md:text-8xl shadow-2xl mb-6 scroll-spin-in">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold mb-3">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs">{body}</p>
    </div>
  );
}
