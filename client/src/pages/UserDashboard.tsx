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
  requiresSafetyDisclaimer?: boolean;
  disclaimerTitle?: string | null;
  disclaimerContent?: string | null;
  disclaimerType?: 'text' | 'pdf';
  clubId?: { _id: string; name: string; category?: string; logoUrl?: string; orgId?: { _id: string; name: string } };
}

interface RsvpItem {
  _id: string;
  status: string;
  attendeeName?: string;
  contactNumber?: string;
  notes?: string;
  agreedSafetyDisclaimer?: boolean;
  event: EventItem;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  organisationName?: string;
  profileImage?: string;
  bio?: string;
}

interface RsvpForm {
  attendeeName: string;
  contactNumber: string;
  notes: string;
  agreedSafetyDisclaimer: boolean;
}

interface ConfirmAction {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: 'danger' | 'neutral';
  onConfirm: () => Promise<void>;
}

const tabs = ['overview', 'clubs', 'events', 'following', 'profile'] as const;
type Tab = typeof tabs[number];

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
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [rsvpEvent, setRsvpEvent] = useState<EventItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [toast, setToast] = useState('');
  const [orgScope, setOrgScope] = useState('all');
  const [clubSearch, setClubSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const fetchClubs = async (scope = orgScope) => {
    const { data } = await api.get(`/clubs/browse?orgId=${scope}`);
    setClubs(data);
  };

  const fetchEvents = async (scope = orgScope) => {
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
      const [profileRes, orgsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/club-registration-requests/organisations'),
      ]);
      setProfile(profileRes.data);
      setOrganisations(orgsRes.data);
      updateUser(profileRes.data);
      await Promise.all([fetchClubs('all'), fetchEvents('all'), fetchRsvps()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => setLoading(false));
  }, []);

  const followingClubs = clubs.filter(club => club.following);
  const workspaceClubs = clubs.filter(club => club.membershipRole === 'president' || club.membershipRole === 'committee');
  const rsvpedEventIds = useMemo(() => new Set(rsvps.map(item => item.event?._id).filter(Boolean)), [rsvps]);
  const eventsWithRsvp = events.map(event => ({ ...event, rsvped: event.rsvped || rsvpedEventIds.has(event._id) }));
  const upcomingRsvps = useMemo(
    () => rsvps.filter(item => item.event && new Date(item.event.date) >= new Date()).sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime()),
    [rsvps]
  );
  const pastRsvps = useMemo(() => rsvps.filter(item => item.event && new Date(item.event.date) < new Date()), [rsvps]);
  const suggestedEvents = eventsWithRsvp.filter(event => !event.rsvped && new Date(event.date) >= new Date()).slice(0, 4);

  const filteredClubs = clubs.filter(club => {
    const q = clubSearch.toLowerCase();
    return [club.name, club.description, club.category, club.orgId?.name].some(value => value?.toLowerCase().includes(q));
  });

  const availableEvents = eventsWithRsvp.filter(event => new Date(event.date) >= new Date());
  const categories = ['all', ...Array.from(new Set(availableEvents.map(event => event.category).filter(Boolean)))];
  const filteredEvents = availableEvents.filter(event => {
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

  const refreshClubDetail = async (clubId: string) => {
    const { data } = await api.get(`/clubs/${clubId}/detail`);
    setSelectedClub(data);
  };

  const changeOrgScope = async (scope: string) => {
    setOrgScope(scope);
    await Promise.all([fetchClubs(scope), fetchEvents(scope)]);
  };

  const toggleFollow = async (club: Club) => {
    if (club.following) {
      setConfirmAction({
        title: `Unfollow ${club.name}?`,
        body: 'This club will be removed from your Following tab. You can follow it again later.',
        confirmLabel: 'Unfollow club',
        tone: 'danger',
        onConfirm: async () => {
          await api.delete(`/clubs/${club._id}/follow`);
          await fetchClubs();
          if (selectedClub?._id === club._id) await refreshClubDetail(club._id);
          showToast(`You unfollowed ${club.name}.`);
        },
      });
      return;
    }
    await api.post(`/clubs/${club._id}/follow`);
    await fetchClubs();
    if (selectedClub?._id === club._id) await refreshClubDetail(club._id);
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

  const submitRsvp = async (event: EventItem, form: RsvpForm) => {
    await api.post(`/events/${event._id}/rsvp`, form);
    setEvents(prev => prev.map(item => item._id === event._id ? { ...item, rsvped: true } : item));
    setSelectedEvent(prev => prev?._id === event._id ? { ...prev, rsvped: true } : prev);
    if (selectedClub) await refreshClubDetail(selectedClub._id);
    await fetchRsvps();
    setRsvpEvent(null);
    showToast(`RSVP saved for ${event.title}.`);
  };

  const requestCancelRsvp = (event: EventItem) => {
    setConfirmAction({
      title: 'Cancel RSVP?',
      body: `You will be removed from "${event.title}".`,
      confirmLabel: 'Cancel RSVP',
      tone: 'danger',
      onConfirm: async () => {
        await api.delete(`/events/${event._id}/rsvp`);
        setEvents(prev => prev.map(item => item._id === event._id ? { ...item, rsvped: false } : item));
        setSelectedEvent(prev => prev?._id === event._id ? { ...prev, rsvped: false } : prev);
        if (selectedClub) await refreshClubDetail(selectedClub._id);
        await fetchRsvps();
        showToast(`RSVP cancelled for ${event.title}.`);
      },
    });
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
      showToast('Profile saved.');
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
                  Follow clubs, RSVP to events, and keep track of the activities you are actually attending.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[420px]">
                <Stat label="Following" value={followingClubs.length} />
                <Stat label="Saved RSVPs" value={rsvps.length} />
                <Stat label="Clubs" value={clubs.length} />
              </div>
            </div>
          </section>

          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-white/10 bg-[#101c2e]/85 p-4 h-fit backdrop-blur">
              {workspaceClubs.length > 0 && (
                <div className="mb-5 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3">
                  <p className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">My Workspaces</p>
                  <div className="space-y-2">
                    {workspaceClubs.map(club => (
                      <button key={club._id} onClick={() => openClubWorkspace(club)} className="w-full rounded-xl bg-[#08111f]/70 px-3 py-3 text-left transition hover:bg-cyan-300/20">
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
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left rounded-xl px-4 py-3 text-sm font-semibold capitalize transition ${activeTab === tab ? 'bg-cyan-100 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}>
                    {tab}
                  </button>
                ))}
              </nav>
            </aside>

            <section className="min-h-[600px] min-w-0 overflow-hidden">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-[#101c2e]/85 p-10 text-center text-slate-300">Loading your dashboard...</div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <div className="min-w-0 space-y-6">
                      <Panel title="My Upcoming RSVPs" action={<button onClick={() => setActiveTab('events')} className="text-sm font-semibold text-cyan-200">Browse events</button>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {upcomingRsvps.length ? upcomingRsvps.slice(0, 4).map(item => (
                            <EventCard key={item._id} event={{ ...item.event, rsvped: true }} onOpen={setSelectedEvent} onRsvp={setRsvpEvent} onCancelRsvp={requestCancelRsvp} />
                          )) : <EmptyState title="No upcoming RSVPs yet" body="RSVP to events and they will appear here as your personal schedule." />}
                        </div>
                      </Panel>
                      <Panel title="Suggested Events">
                        <div className={`max-w-full min-w-0 overflow-hidden ${suggestedEvents.length ? '' : 'flex justify-center'}`}>
                          <div className="flex max-w-full gap-4 overflow-x-auto pb-2">
                          {suggestedEvents.length ? suggestedEvents.map(event => (
                            <div key={event._id} className="w-[22rem] shrink-0">
                              <EventCard event={event} onOpen={setSelectedEvent} onRsvp={setRsvpEvent} onCancelRsvp={requestCancelRsvp} />
                            </div>
                          )) : <EmptyState title="No new suggestions" body="You have RSVP'd to every upcoming event currently available." />}
                          </div>
                        </div>
                      </Panel>
                      <Panel title="Following">
                        <div className={`max-w-full min-w-0 overflow-hidden ${followingClubs.length ? '' : 'flex justify-center'}`}>
                          <div className="flex max-w-full gap-4 overflow-x-auto pb-2">
                          {followingClubs.slice(0, 8).map(club => (
                            <div key={club._id} className="w-[18rem] shrink-0">
                              <ClubCard club={club} onOpen={openClubDetail} onFollow={toggleFollow} onOpenWorkspace={openClubWorkspace} />
                            </div>
                          ))}
                          {!followingClubs.length && <EmptyState title="No followed clubs yet" body="Open a club profile and follow it to keep track of its activity." />}
                          </div>
                        </div>
                      </Panel>
                      <Panel title="Past Attended Events">
                        <div className={`max-w-full min-w-0 overflow-hidden ${pastRsvps.length ? '' : 'flex justify-center'}`}>
                          <div className="flex max-w-full gap-4 overflow-x-auto pb-2">
                          {pastRsvps.map(item => item.event && (
                            <div key={item._id} className="w-[22rem] shrink-0">
                              <EventCard event={{ ...item.event, rsvped: true }} onOpen={setSelectedEvent} onRsvp={setRsvpEvent} onCancelRsvp={requestCancelRsvp} />
                            </div>
                          ))}
                          {!pastRsvps.length && <EmptyState title="No past events yet" body="Events you RSVP to will move here after their date has passed." />}
                          </div>
                        </div>
                      </Panel>
                    </div>
                  )}

                  {activeTab === 'clubs' && (
                    <Panel title="Browse Clubs">
                      <FilterRow columns="clubs">
                        <input value={clubSearch} onChange={e => setClubSearch(e.target.value)} placeholder="Search clubs, categories, or organisations" className="dashboard-input" />
                        <OrgScopeSelect value={orgScope} onChange={changeOrgScope} organisations={organisations} />
                        <div className="dashboard-muted-box">{filteredClubs.length} clubs</div>
                      </FilterRow>
                      <div className="max-h-[34rem] overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredClubs.map(club => <ClubCard key={club._id} club={club} onOpen={openClubDetail} onFollow={toggleFollow} onOpenWorkspace={openClubWorkspace} large />)}
                      </div>
                    </Panel>
                  )}

                  {activeTab === 'events' && (
                    <Panel title="Browse Events">
                      <FilterRow>
                        <input value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Search events, clubs, or locations" className="dashboard-input" />
                        <OrgScopeSelect value={orgScope} onChange={changeOrgScope} organisations={organisations} />
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="dashboard-input">
                          {categories.map(category => <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>)}
                        </select>
                      </FilterRow>
                      <p className="mb-5 text-sm text-slate-400">Categories are populated dynamically from published events, so new event categories appear here automatically.</p>
                      <div className="max-h-[38rem] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {filteredEvents.map(event => <EventCard key={event._id} event={event} onOpen={setSelectedEvent} onRsvp={setRsvpEvent} onCancelRsvp={requestCancelRsvp} />)}
                      </div>
                    </Panel>
                  )}

                  {activeTab === 'following' && (
                    <Panel title="Following">
                      <div className="max-h-[34rem] overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
      {toast && <Toast message={toast} />}
      {selectedClub && (
        <ClubDetailModal
          club={selectedClub}
          onClose={() => setSelectedClub(null)}
          onFollow={toggleFollow}
          onOpenEvent={setSelectedEvent}
          onRsvp={setRsvpEvent}
          onCancelRsvp={requestCancelRsvp}
        />
      )}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onRsvp={setRsvpEvent} onCancelRsvp={requestCancelRsvp} />}
      {rsvpEvent && <RsvpModal event={rsvpEvent} profile={profile} onClose={() => setRsvpEvent(null)} onSubmit={submitRsvp} />}
      {confirmAction && <ConfirmModal action={confirmAction} onClose={() => setConfirmAction(null)} />}
    </div>
  );
}

function FilterRow({ children, columns = 'default' }: { children: ReactNode; columns?: 'default' | 'clubs' }) {
  const cls = columns === 'clubs' ? 'grid-cols-1 md:grid-cols-[1fr_240px_160px]' : 'grid-cols-1 md:grid-cols-[1fr_240px_200px]';
  return <div className={`grid ${cls} gap-3 mb-6`}>{children}</div>;
}

function OrgScopeSelect({ value, onChange, organisations }: { value: string; onChange: (value: string) => void; organisations: Organisation[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="dashboard-input">
      <option value="all">All organisations</option>
      {organisations.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
    </select>
  );
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
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101c2e]/85 p-6 shadow-2xl backdrop-blur">
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

function EventCard({ event, onOpen, onRsvp, onCancelRsvp }: { event: EventItem; onOpen: (event: EventItem) => void; onRsvp: (event: EventItem) => void; onCancelRsvp: (event: EventItem) => void }) {
  const date = new Date(event.date);
  const isPast = date < new Date();
  return (
    <article className={`rounded-2xl border border-white/10 bg-[#08111f]/70 p-5 transition ${isPast ? 'opacity-45 grayscale' : 'hover:-translate-y-1 hover:bg-white/10'}`}>
      <button onClick={() => !isPast && onOpen(event)} disabled={isPast} className="block w-full text-left disabled:cursor-not-allowed">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{event.clubId?.name || 'EventEase club'}</p>
            <p className="text-xs text-slate-500 mt-1">{event.clubId?.orgId?.name}</p>
            <h3 className="text-xl font-black mt-2">{event.title}</h3>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{isPast ? 'Event ended' : event.category}</span>
        </div>
        <p className="text-sm text-slate-400 mb-4 line-clamp-3">{event.description || 'More details will be shared by the club soon.'}</p>
        <div className="space-y-2 text-sm text-slate-300 mb-5">
          <p>{date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} at {date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
          {event.location && <p>{event.location}</p>}
          {event.capacity && <p>{event.capacity} capacity</p>}
        </div>
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button disabled={isPast} onClick={() => onOpen(event)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">{isPast ? 'Unavailable' : 'View details'}</button>
        {isPast ? (
          <button disabled className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-slate-400">RSVP closed</button>
        ) : event.rsvped ? (
          <button onClick={() => onCancelRsvp(event)} className="rounded-lg bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-red-500/20 hover:text-red-100">Going</button>
        ) : (
          <button onClick={() => onRsvp(event)} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">RSVP</button>
        )}
      </div>
    </article>
  );
}

function ClubDetailModal({ club, onClose, onFollow, onOpenEvent, onRsvp, onCancelRsvp }: { club: Club; onClose: () => void; onFollow: (club: Club) => void; onOpenEvent: (event: EventItem) => void; onRsvp: (event: EventItem) => void; onCancelRsvp: (event: EventItem) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#101c2e] text-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
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
              <Metric label="Followers" value={club.followers || 0} />
              <Metric label="Upcoming events" value={club.upcomingEvents?.length || 0} />
            </div>
            <button onClick={() => onFollow(club)} className={`mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold ${club.following ? 'bg-cyan-400/20 text-cyan-100' : 'bg-orange-400 text-slate-950 hover:bg-orange-300'}`}>
              {club.following ? 'Following club' : 'Follow club'}
            </button>
            <h3 className="mt-8 mb-3 text-lg font-bold">Upcoming Events</h3>
            <div className="space-y-3">
              {club.upcomingEvents?.length ? club.upcomingEvents.map(event => (
                <div key={event._id} className="rounded-xl border border-white/10 bg-[#08111f]/80 p-4">
                  <button onClick={() => onOpenEvent(event)} className="block w-full text-left">
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-slate-400 mt-1">{new Date(event.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    {event.description && <p className="mt-2 text-sm text-slate-400 line-clamp-2">{event.description}</p>}
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => onOpenEvent(event)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100">Details</button>
                    {event.rsvped ? (
                      <button onClick={() => onCancelRsvp(event)} className="rounded-lg bg-emerald-400/20 px-3 py-2 text-xs font-semibold text-emerald-100">Going</button>
                    ) : (
                      <button onClick={() => onRsvp(event)} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">RSVP</button>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-400">No upcoming published events yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, onClose, onRsvp, onCancelRsvp }: { event: EventItem; onClose: () => void; onRsvp: (event: EventItem) => void; onCancelRsvp: (event: EventItem) => void }) {
  const date = new Date(event.date);
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 p-4 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#101c2e] p-8 text-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-200">{event.clubId?.name || 'EventEase club'} · {event.category}</p>
            <h2 className="mt-2 text-3xl font-black">{event.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/20">Close</button>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Metric label="Date" text={date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} />
          <Metric label="Time" text={date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} />
          <Metric label="Capacity" text={event.capacity ? String(event.capacity) : 'Open'} />
        </div>
        {event.location && <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">{event.location}</p>}
        <p className="mt-5 whitespace-pre-line text-slate-300 leading-relaxed">{event.description || 'More details will be shared by the club soon.'}</p>
        {event.requiresSafetyDisclaimer && (
          <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
            <p className="font-bold text-amber-100">{event.disclaimerTitle || 'Safety acknowledgement required'}</p>
            {event.disclaimerContent && <p className="mt-2 whitespace-pre-line text-sm text-amber-50/80">{event.disclaimerContent}</p>}
          </div>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {event.rsvped ? (
            <button onClick={() => onCancelRsvp(event)} className="rounded-lg bg-emerald-400/20 px-5 py-3 text-sm font-semibold text-emerald-100 hover:bg-red-500/20 hover:text-red-100">You are going · Cancel RSVP</button>
          ) : (
            <button onClick={() => onRsvp(event)} className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">RSVP to this event</button>
          )}
        </div>
      </div>
    </div>
  );
}

function RsvpModal({ event, profile, onClose, onSubmit }: { event: EventItem; profile: Profile | null; onClose: () => void; onSubmit: (event: EventItem, form: RsvpForm) => Promise<void> }) {
  const [form, setForm] = useState<RsvpForm>({
    attendeeName: profile?.name || '',
    contactNumber: '',
    notes: '',
    agreedSafetyDisclaimer: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (event.requiresSafetyDisclaimer && !form.agreedSafetyDisclaimer) {
      setError('Please acknowledge the safety disclaimer before RSVPing.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(event, form);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not save RSVP.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 p-4 flex items-center justify-center" onMouseDown={onClose}>
      <form onSubmit={submit} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#101c2e] p-7 text-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-200">RSVP</p>
            <h2 className="mt-1 text-2xl font-black">{event.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/20">Close</button>
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
        <div className="mt-5 space-y-4">
          <ProfileField label="Attendee name" value={form.attendeeName} onChange={value => setForm({ ...form, attendeeName: value })} />
          <ProfileField label="Contact number" value={form.contactNumber} onChange={value => setForm({ ...form, contactNumber: value })} />
          <label className="block">
            <span className="block text-sm font-semibold text-slate-300 mb-1">Accessibility, dietary, or attendance notes</span>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="dashboard-input" />
          </label>
          {event.requiresSafetyDisclaimer && (
            <label className="flex gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-50">
              <input type="checkbox" checked={form.agreedSafetyDisclaimer} onChange={e => setForm({ ...form, agreedSafetyDisclaimer: e.target.checked })} className="mt-1" />
              <span>I have read and acknowledge the safety disclaimer for this event.</span>
            </label>
          )}
        </div>
        <button disabled={submitting} className="mt-6 w-full rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
          {submitting ? 'Saving RSVP...' : 'Confirm RSVP'}
        </button>
      </form>
    </div>
  );
}

function ConfirmModal({ action, onClose }: { action: ConfirmAction; onClose: () => void }) {
  const [working, setWorking] = useState(false);
  const confirm = async () => {
    setWorking(true);
    try {
      await action.onConfirm();
      onClose();
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 p-4 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101c2e] p-7 text-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black">{action.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{action.body}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/20">Keep current</button>
          <button onClick={confirm} disabled={working} className={`rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60 ${action.tone === 'danger' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-300'}`}>
            {working ? 'Working...' : action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, text }: { label: string; value?: number; text?: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <p className="text-2xl font-black">{text ?? value ?? 0}</p>
      <p className="text-xs uppercase text-slate-400">{label}</p>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-[90] max-w-sm rounded-2xl border border-cyan-200/30 bg-cyan-950 px-5 py-4 text-sm font-semibold text-cyan-50 shadow-2xl">
      {message}
    </div>
  );
}

function LogoFallback({ name }: { name: string }) {
  return <div className="h-full min-h-40 w-full rounded-2xl bg-gradient-to-br from-cyan-500 to-orange-400 flex items-center justify-center text-5xl font-black text-white">{name.slice(0, 2).toUpperCase()}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="col-span-full w-full max-w-lg rounded-2xl border border-white/10 bg-[#08111f]/70 p-8 text-center">
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
