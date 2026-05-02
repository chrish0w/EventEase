import PublicNav from '../components/PublicNav';

const values = [
  ['🏆', 'Share success', 'Strong events and well-run clubs should be easier to repeat, not rediscovered every semester.'],
  ['🎯', 'Make it happen', 'Clear approvals, clear owners, and clear next steps keep teams moving.'],
  ['🧩', 'Challenge assumptions', 'EventEase separates responsibilities so each organisation can shape a workflow that fits.'],
  ['📚', 'Keep learning', 'Every request, role, and event leaves context that helps future committees improve.'],
  ['🚀', 'Go above and beyond', 'We build for the clubs that want to operate with confidence and ambition.'],
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PublicNav />
      <main>
        <section className="relative overflow-hidden px-6 py-20">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_15%_20%,#2563eb,transparent_30%),radial-gradient(circle_at_85%_10%,#0f766e,transparent_28%)]" />
          <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200 mb-4">About Us</p>
              <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">Built for layered student communities.</h1>
              <p className="text-lg text-gray-300 leading-relaxed">
                EventEase separates platform governance from organisation administration and club operations,
                so requests are reviewed by the people responsible for the right workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <VisualTile label="Review" className="h-40 bg-blue-500/20" />
              <VisualTile label="Approve" className="h-56 bg-emerald-500/20 mt-8" />
              <VisualTile label="Assign" className="h-56 bg-cyan-500/20 -mt-8" />
              <VisualTile label="Operate" className="h-40 bg-indigo-500/20" />
            </div>
          </div>
        </section>

        <section className="px-6 py-16 bg-gray-900 border-y border-white/10">
          <div className="max-w-7xl mx-auto">
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

function VisualTile({ label, className }: { label: string; className: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 p-5 flex items-end ${className}`}>
      <p className="font-bold text-lg">{label}</p>
    </div>
  );
}

function ValueItem({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-36 w-36 md:h-44 md:w-44 rounded-[2rem] bg-blue-500/15 border border-white/10 flex items-center justify-center text-7xl md:text-8xl shadow-2xl mb-6">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold mb-3">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs">{body}</p>
    </div>
  );
}
