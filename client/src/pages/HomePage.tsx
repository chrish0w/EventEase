import { Link } from 'react-router-dom';

const features = [
  {
    icon: '📅',
    title: 'Event Planning',
    description: 'Create and manage club events with ease. Set dates, venues, and capacities in minutes.',
  },
  {
    icon: '✅',
    title: 'Task Assignment',
    description: 'Delegate responsibilities to committee members and track progress in real-time.',
  },
  {
    icon: '🎟️',
    title: 'RSVP Management',
    description: 'Let members register for events and get accurate headcounts automatically.',
  },
  {
    icon: '💰',
    title: 'Budget Tracking',
    description: 'Monitor event expenditures and stay within budget with transparent financial tracking.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Create an Event',
    description: 'President or committee members set up events with all the necessary details and requirements.',
  },
  {
    number: '2',
    title: 'Assign Tasks',
    description: 'Break the event into actionable tasks and assign them to committee members with deadlines.',
  },
  {
    number: '3',
    title: 'Track Everything',
    description: 'Monitor RSVPs, task completion, budget usage, and safety files all in one dashboard.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">EventEase</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Monash</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Built for Monash University Clubs
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Smarter Event Planning<br />
            <span className="text-blue-200">for Monash Clubs</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Managing club events shouldn't mean juggling spreadsheets, group chats, and forgotten tasks.
            EventEase brings everything together — events, tasks, RSVPs, and budgets — in one clean dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition shadow-lg text-lg"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="border border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need to run great events</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Designed specifically for student club committees at Monash University.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-gray-500 text-lg">Three simple steps to a perfectly organised event.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-blue-100"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-blue-200">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-blue-600 py-16 px-6 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to simplify your club events?</h2>
        <p className="text-blue-100 mb-8 text-lg">Join EventEase today and make every event a success.</p>
        <Link
          to="/register"
          className="bg-white text-blue-600 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition shadow-lg text-lg inline-block"
        >
          Create Your Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6 text-center">
        <p className="text-white font-semibold text-lg mb-1">EventEase</p>
        <p className="text-sm">Team CS_04 &bull; FIT3161 / FIT3162 &bull; Monash University</p>
        <p className="text-xs mt-3 text-gray-600">© 2026 EventEase. All rights reserved.</p>
      </footer>
    </div>
  );
}
