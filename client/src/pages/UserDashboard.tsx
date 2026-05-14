import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Organisation { _id: string; name: string; }

interface Club {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  logoUrl?: string;
  officialClubLink?: string;
  following?: boolean;
  followers?: number;
  membershipRole?: string | null;
  committeeRole?: string;
  orgId?: { _id: string; name: string };
  upcomingEvents?: EventItem[];
}

interface EventItem {
  _id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  category: string;
  capacity?: number;
  rsvped?: boolean;
  clubId?: { _id: string; name: string; category?: string; logoUrl?: string; orgId?: { _id: string; name: string } };
}

interface RsvpItem { _id: string; event: EventItem; }

interface Profile {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  organisationName?: string;
  profileImage?: string;
  bio?: string;
}

const tabs = ['overview', 'clubs', 'events', 'following', 'profile'] as const;
type Tab = typeof tabs[number];

const scopeLabels: Record<string, string> = {
  mine: 'My organisation',
  all: 'All organisations',
};

export default function UserDashboard() {
  const { user, updateUser, selectClub } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [rsvps, setRsvps] = useState<RsvpItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [clubScope, setClubScope] = useState('mine');
  const [eventScope, setEventScope] = useState('mine');
  const [clubSearch, setClubSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchClubs = async (scope = clubScope) => {
    const { data } = await api.get(`/clubs/browse?orgId=${scope}`);
    setClubs(data);
  };

  const fetchEvents = async (scope = eventScope) => {
    const { data } = await api.get(`/events/browse/all?orgId=${scope}`);
    setEvents(data);
  };

  const fetchRsvps = async () => {
    const { data } = await api.get('/events/rsvps/my');
    setRsvps(data);
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [orgsRes, profileRes] = await Promise.all([
        api.get('/club-registration-requests/organisations'),
        api.get('/auth/me'),
      ]);
      setOrganisations(orgsRes.data);
      setProfile(profileRes.data);
      updateUser(profileRes.data);
      await Promise.all([fetchClubs('mine'), fetchEvents('mine'), fetchRsvps()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => setLoading(false));
  }, []);

  const followingClubs = clubs.filter(club => club.following);
  const workspaceClubs = clubs.filter(club => club.membershipRole === 'president' || club.membershipRole === 'committee');
  const upcomingEvents = useMemo(() => events.filter(event => new Date(event.date) >= new Date()).slice(0, 4), [events]);
  const pastRsvps = useMemo(() => rsvps.filter(item => item.event && new Date(item.event.date) < new Date()), [rsvps]);

  const filteredClubs = clubs.filter(club => {
    const q = clubSearch.toLowerCase();
    return [club.name, club.description, club.category, club.orgId?.name].some(value => value?.toLowerCase().includes(q));
  });

  const categories = ['all', ...Array.from(new Set(events.map(event => event.category).filter(Boolean)))];
  const filteredEvents = events.filter(event => {
    const q = eventSearch.toLowerCase();
    const matchesSearch = [event.title, event.description, event.location, event.clubId?.name, event.clubId?.orgId?.name]
      .some(value => value?.toLowerCase().includes(q));
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openClubDetail = async (clubId: string) => {
    const { data } = await api.get(`/clubs/${clubId}/detail`);
    setSelectedClub(data);
  };

  const toggleFollow = async (club: Club) => {
    if (club.following) {
      await api.delete(`/clubs/${club._id}/follow`);
    } else {
      await api.post(`/clubs/${club._id}/follow`);
    }
    await fetchClubs(clubScope);
    if (selectedClub?._id === club._id) {
      const { data } = await api.get(`/clubs/${club._id}/detail`);
      setSelectedClub(data);
    }
  };

  const openClubWorkspace = (club: Club) => {
    if (club.membershipRole !== 'president' && club.membershipRole !== 'committee') return;
    selectClub({
      clubId: club._id,
      clubName: club.name,
      role: club.membershipRole as 'president' | 'committee',
      committeeRole: club.committeeRole,
    });
    navigate(club.membershipRole === 'president' ? '/president/dashboard' : '/committee/dashboard');
  };

  const handleRsvp = async (eventId: string) => {
    await api.post(`/events/${eventId}/rsvp`);
    setEvents(prev => prev.map(event => event._id === eventId ? { ...event, rsvped: true } : event));
    await fetchRsvps();
  };

  const handleCancelRsvp = async (eventId: string) => {
    await api.delete(`/events/${eventId}/rsvp`);
    setEvents(prev => prev.map(event => event._id === eventId ? { ...event, rsvped: false } : event));
    await fetchRsvps();
  };

  const changeClubScope = async (scope: string) => {
    setClubScope(scope);
    await fetchClubs(scope);
  };

  const changeEventScope = async (scope: string) => {
    setEventScope(scope);
    await fetchEvents(scope);
  };

  const handleProfileImage = (file?: File) => {
    if (!file || !profile) return;
    const reader = new FileReader();
    reader.onload = () => setProfile({ ...profile, profileImage: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: profile.name,
        studentId: profile.studentId,
        bio: profile.bio,
        profileImage: profile.profileImage,
      });
      setProfile(data);
      updateUser(data);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08111f] text-white">
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_12%_8%,#155e75,transparent_28%),radial-gradient(circle_at_86%_4%,#7c2d12,transparent_26%),linear-gradient(135deg,#08111f,#102033_48%,#111827)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <section className="rounded-3xl border border-white/10 bg-[#101c2e]/85 p-8 shadow-2xl backdrop-blur mb-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200 mb-3">Student Hub</p>
                <h1 className="text-4xl md:text-5xl font-black mb-3">Welcome back, {profile?.name || user?.name}</h1>
                <p className="text-slate-300 max-w-2xl">
                  Follow clubs, browse events across organisations, and keep a personal record of what you are going to.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[420px]">
                <Stat label="Following" value={followingClubs.length} />
                <Stat label="Events" value={events.length} />
                <Stat label="RSVPs" value={rsvps.length} />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <aside className="rounded-2xl border border-white/10 bg-[#101c2e]/85 p-4 h-fit backdrop-blur">
              {workspaceClubs.length > 0 && (
                <div className="mb-5 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3">
                  <p className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">My Workspaces</p>
                  <div className="space-y-2">
                    {workspaceClubs.map(club => (
                      <button
                        key={club._id}
                        onClick={() => openClubWorkspace(club)}
                        className="w-full rounded-xl bg-[#08111f]/70 px-3 py-3 text-left transition hover:bg-cyan-300/20"
                      >
                        <p className="text-sm font-bold text-white">{club.name}</p>
                        <p className="text-xs capitalize text-cyan-200">
                          {club.membershipRole === 'president' ? 'President workspace' : `${club.committeeRole || 'Committee'} workspace`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full text-left rounded-xl px-4 py-3 text-sm font-semibold capitalize transition ${activeTab === tab ? 'bg-cyan-100 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </aside>

            <section className="min-h-[600px]">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-[#101c2e]/85 p-10 text-center text-slate-300">Loading your dashboard...</div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <Panel title="Upcoming Events" action={<button onClick={() => setActiveTab('events')} className="text-sm font-semibold text-cyan-200">Browse all</button>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {upcomingEvents.length ? upcomingEvents.map(event => <EventCard key={event._id} event={event} onRsvp={handleRsvp} onCancelRsvp={handleCancelRsvp} />) : <EmptyState title="No events yet" body="Published events will appear here." />}
                        </div>
                      </Panel>
                      <Panel title="Following">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {followingClubs.slice(0, 3).map(club => <ClubCard key={club._id} club={club} onOpen={openClubDetail} onFollow={toggleFollow} onOpenWorkspace={openClubWorkspace} />)}
                          {!followingClubs.length && <EmptyState title="No followed clubs yet" body="Open a club profile and follow it to keep track of its activity." />}
                        </div>
                      </Panel>
                      <Panel title="Your RSVPs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rsvps.slice(0, 4).map(item => item.event && <EventCard key={item._id} event={{ ...item.event, rsvped: true }} onRsvp={handleRsvp} onCancelRsvp={handleCancelRsvp} />)}
                          {!rsvps.length && <EmptyState title="No RSVPs yet" body="RSVP to an event and it will be saved here." />}
                        </div>
                      </Panel>
                      <Panel title="Past Attended Events">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pastRsvps.map(item => item.event && <EventCard key={item._id} event={{ ...item.event, rsvped: true }} onRsvp={handleRsvp} onCancelRsvp={handleCancelRsvp} />)}
                          {!pastRsvps.length && <EmptyState title="No past events yet" body="Events you RSVP to will move here after their date has passed." />}
                        </div>
                      </Panel>
                    </div>
                  )}

                  {activeTab === 'clubs' && (
                    <Panel title="Browse Clubs">
                      <FilterRow>
                        <input value={clubSearch} onChange={e => setClubSearch(e.target.value)} placeholder="Search clubs, categories, or organisations" className="dashboard-input" />
                        <ScopeSelect value={clubScope} onChange={changeClubScope} organisations={organisations} />
                        <div className="dashboard-muted-box">{filteredClubs.length} clubs</div>
                      </FilterRow>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredClubs.map(club => <ClubCard key={club._id} club={club} onOpen={openClubDetail} onFollow={toggleFollow} onOpenWorkspace={openClubWorkspace} large />)}
                      </div>
                    </Panel>
                  )}

                  {activeTab === 'events' && (
                    <Panel title="Browse Events">
                      <FilterRow>
                        <input value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Search events, clubs, or locations" className="dashboard-input" />
                        <ScopeSelect value={eventScope} onChange={changeEventScope} organisations={organisations} />
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="dashboard-input">
                          {categories.map(category => <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>)}
                        </select>
                      </FilterRow>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {filteredEvents.map(event => <EventCard key={event._id} event={event} onRsvp={handleRsvp} onCancelRsvp={handleCancelRsvp} />)}
                      </div>
                    </Panel>
                  )}

                  {activeTab === 'following' && (
                    <Panel title="Following">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {followingClubs.map(club => <ClubCard key={club._id} club={club} onOpen={openClubDetail} onFollow={toggleFollow} onOpenWorkspace={openClubWorkspace} large />)}
                        {!followingClubs.length && <EmptyState title="No followed clubs yet" body="Following replaces joining for normal users. Follow clubs to track their events." />}
                      </div>
                    </Panel>
                  )}

                  {activeTab === 'profile' && profile && (
                    <Panel title="Profile">
                      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                        <div className="text-center">
                          <div className="mx-auto h-40 w-40 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500 to-orange-500 overflow-hidden flex items-center justify-center text-5xl font-black">
                            {profile.profileImage ? <img src={profile.profileImage} alt="" className="h-full w-full object-cover" /> : profile.name.charAt(0).toUpperCase()}
                          </div>
                          <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-cyan-100 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white">
                            Upload Picture
                            <input type="file" accept="image/*" className="sr-only" onChange={e => handleProfileImage(e.target.files?.[0])} />
                          </label>
                        </div>
                        <div className="space-y-4">
                          <ProfileField label="Name" value={profile.name} onChange={value => setProfile({ ...profile, name: value })} />
                          <ProfileField label="Email" value={profile.email} disabled />
                          <ProfileField label="Primary organisation" value={profile.organisationName || ''} disabled />
                          <ProfileField label="Student ID" value={profile.studentId || ''} onChange={value => setProfile({ ...profile, studentId: value })} />
                          <label className="block">
                            <span className="block text-sm font-semibold text-slate-300 mb-1">Bio</span>
                            <textarea value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} rows={4} className="dashboard-input" />
                          </label>
                          <button onClick={saveProfile} disabled={savingProfile} className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
                            {savingProfile ? 'Saving...' : 'Save Profile'}
                          </button>
                        </div>
                      </div>
                    </Panel>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </main>
      {selectedClub && <ClubDetailModal club={selectedClub} onClose={() => setSelectedClub(null)} onFollow={toggleFollow} onRsvp={handleRsvp} />}
    </div>
  );
}

function ScopeSelect({ value, onChange, organisations }: { value: string; onChange: (value: string) => void; organisations: Organisation[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="dashboard-input">
      <option value="mine">{scopeLabels.mine}</option>
      <option value="all">{scopeLabels.all}</option>
      {organisations.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
    </select>
  );
}

function FilterRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_180px] gap-3 mb-6">{children}</div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#08111f]/60 p-4">
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c2e]/85 p-6 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ClubCard({ club, onOpen, onFollow, onOpenWorkspace, large }: { club: Club; onOpen: (clubId: string) => void; onFollow: (club: Club) => void; onOpenWorkspace: (club: Club) => void; large?: boolean }) {
  const canOpenWorkspace = club.membershipRole === 'president' || club.membershipRole === 'committee';
  return (
    <article className={`group overflow-hidden rounded-2xl border border-white/10 bg-[#08111f]/70 shadow-xl transition hover:-translate-y-1 hover:bg-white/10 ${large ? 'min-h-[370px]' : ''}`}>
      <button onClick={() => onOpen(club._id)} className="block w-full text-left">
        <div className="aspect-square bg-white p-5 flex items-center justify-center">
          {club.logoUrl ? <img src={club.logoUrl} alt="" className="h-full w-full object-contain" /> : <LogoFallback name={club.name} />}
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold text-cyan-200 mb-2">{club.orgId?.name || 'Organisation'} · {club.category || 'General'}</p>
          <h3 className="text-lg font-black leading-tight mb-2">{club.name}</h3>
          {club.description && <p className="text-sm text-slate-400 line-clamp-2 mb-4">{club.description}</p>}
        </div>
      </button>
      <div className="px-5 pb-5 grid grid-cols-1 gap-2">
        {canOpenWorkspace && (
          <button onClick={() => onOpenWorkspace(club)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50">Open workspace</button>
        )}
        <button onClick={() => onFollow(club)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${club.following ? 'bg-cyan-400/20 text-cyan-100' : 'bg-orange-400 text-slate-950 hover:bg-orange-300'}`}>
          {club.following ? 'Following' : 'Follow club'}
        </button>
      </div>
    </article>
  );
}

function EventCard({ event, onRsvp, onCancelRsvp }: { event: EventItem; onRsvp: (eventId: string) => void; onCancelRsvp?: (eventId: string) => void }) {
  const date = new Date(event.date);
  return (
    <article className="rounded-2xl border border-white/10 bg-[#08111f]/70 p-5 transition hover:-translate-y-1 hover:bg-white/10">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{event.clubId?.name || 'EventEase club'}</p>
          <p className="text-xs text-slate-500 mt-1">{event.clubId?.orgId?.name}</p>
          <h3 className="text-xl font-black mt-2">{event.title}</h3>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{event.category}</span>
      </div>
      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{event.description || 'More details will be shared by the club soon.'}</p>
      <div className="space-y-2 text-sm text-slate-300 mb-5">
        <p>{date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} at {date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
        {event.location && <p>{event.location}</p>}
        {event.capacity && <p>{event.capacity} capacity</p>}
      </div>
      {event.rsvped ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-emerald-300">Your response: Going</p>
          <button
            onClick={() => onCancelRsvp?.(event._id)}
            className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:text-red-400 transition"
          >
            Cancel RSVP
          </button>
        </div>
      ) : (
        <button onClick={() => onRsvp(event._id)} className="w-full rounded-lg px-4 py-2 text-sm font-semibold transition bg-cyan-500 text-slate-950 hover:bg-cyan-300">
          RSVP
        </button>
      )}
    </article>
  );
}

function ClubDetailModal({ club, onClose, onFollow, onRsvp }: { club: Club; onClose: () => void; onFollow: (club: Club) => void; onRsvp: (eventId: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#101c2e] text-white shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr]">
          <div className="bg-white p-8 flex items-center justify-center">
            {club.logoUrl ? <img src={club.logoUrl} alt="" className="max-h-72 w-full object-contain" /> : <LogoFallback name={club.name} />}
          </div>
          <div className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyan-200">{club.orgId?.name} · {club.category || 'General'}</p>
                <h2 className="text-3xl font-black mt-2">{club.name}</h2>
              </div>
              <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/20">Close</button>
            </div>
            <p className="mt-5 text-slate-300 leading-relaxed">{club.description || 'This club has not added a description yet.'}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-2xl font-black">{club.followers || 0}</p>
                <p className="text-xs uppercase text-slate-400">Followers</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-2xl font-black">{club.upcomingEvents?.length || 0}</p>
                <p className="text-xs uppercase text-slate-400">Upcoming events</p>
              </div>
            </div>
            <button onClick={() => onFollow(club)} className={`mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold ${club.following ? 'bg-cyan-400/20 text-cyan-100' : 'bg-orange-400 text-slate-950 hover:bg-orange-300'}`}>
              {club.following ? 'Following club' : 'Follow club'}
            </button>
            <h3 className="mt-8 mb-3 text-lg font-bold">Upcoming Events</h3>
            <div className="space-y-3">
              {club.upcomingEvents?.length ? club.upcomingEvents.map(event => (
                <div key={event._id} className="rounded-xl border border-white/10 bg-[#08111f]/80 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-slate-400">{new Date(event.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button onClick={() => onRsvp(event._id)} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">RSVP</button>
                </div>
              )) : <p className="text-sm text-slate-400">No upcoming published events yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoFallback({ name }: { name: string }) {
  return <div className="h-full min-h-40 w-full rounded-2xl bg-gradient-to-br from-cyan-500 to-orange-400 flex items-center justify-center text-5xl font-black text-white">{name.slice(0, 2).toUpperCase()}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-white/10 bg-[#08111f]/70 p-8 text-center">
      <p className="font-semibold text-slate-200">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{body}</p>
    </div>
  );
}

function ProfileField({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-300 mb-1">{label}</span>
      <input value={value} disabled={disabled} onChange={e => onChange?.(e.target.value)} className="dashboard-input disabled:text-slate-400" />
    </label>
  );
}
