require('dotenv').config({ path: './.env' });
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Organisation = require('../src/models/Organisation');
const OrgAdminAssignment = require('../src/models/OrgAdminAssignment');
const Club = require('../src/models/Club');
const ClubMembership = require('../src/models/ClubMembership');
const ClubInvitation = require('../src/models/ClubInvitation');
const ClubRegistrationRequest = require('../src/models/ClubRegistrationRequest');
const OrganisationRegistrationRequest = require('../src/models/OrganisationRegistrationRequest');
const JoinRequest = require('../src/models/JoinRequest');
const ClubFollow = require('../src/models/ClubFollow');
const Event = require('../src/models/Event');
const EventRsvp = require('../src/models/EventRsvp');
const Budget = require('../src/models/Budget');
const BudgetDraft = require('../src/models/BudgetDraft');
const Workspace = require('../src/models/Workspace');
const Task = require('../src/models/Task');

const PASSWORD = '123456';
const SUPER_ADMIN_PASSWORD = '123456';
const ORG_NAME = 'University of Melbourne';
const CLUB_FIXTURES = [
  {
    name: 'Melbourne Coding Society',
    category: 'Technology',
    description: 'A test club for coding, projects, and hackathons.',
    president: ['Priya President', 'president@codingclub.test', 'P10001'],
    committee: [
      ['Casey Committee', 'committee@codingclub.test', 'C10002', 'general'],
      ['Finley Finance Lead', 'finance@codingclub.test', 'C10003', 'finance'],
      ['Logan Logistics Lead', 'logistics@codingclub.test', 'C10004', 'logistics'],
    ],
    members: [
      ['Mia Member', 'member@codingclub.test', 'M10003'],
      ['Noah Code Member', 'member2@codingclub.test', 'M10004'],
      ['Ava Code Member', 'member3@codingclub.test', 'M10005'],
      ['Ethan Code Member', 'member4@codingclub.test', 'M10006'],
    ],
  },
  {
    name: 'Melbourne Arts Collective',
    category: 'Arts',
    description: 'A test club for creative events and exhibitions.',
    president: ['Jordan Arts President', 'president@artsclub.test', 'P20001'],
    committee: [
      ['Harper Arts Committee', 'committee@artsclub.test', 'C20002', 'general'],
      ['Riley Arts Logistics', 'logistics@artsclub.test', 'C20003', 'logistics'],
    ],
    members: [
      ['Sofia Arts Member', 'member@artsclub.test', 'M20003'],
      ['Leo Arts Member', 'member2@artsclub.test', 'M20004'],
      ['Isla Arts Member', 'member3@artsclub.test', 'M20005'],
    ],
  },
  {
    name: 'Unimelb Robotics Club',
    category: 'Engineering',
    description: 'A robotics club for builds, demos, and competitions.',
    president: ['Morgan Robotics President', 'president@robotics.test', 'P30001'],
    committee: [
      ['Taylor Equipment Lead', 'equipment@robotics.test', 'C30002', 'equipment'],
      ['Jamie Transport Lead', 'transport@robotics.test', 'C30003', 'transport'],
    ],
    members: [
      ['Nina Robotics Member', 'member@robotics.test', 'M30003'],
      ['Owen Robotics Member', 'member2@robotics.test', 'M30004'],
      ['Amelia Robotics Member', 'member3@robotics.test', 'M30005'],
      ['Henry Robotics Member', 'member4@robotics.test', 'M30006'],
    ],
  },
  {
    name: 'Campus Outdoors Club',
    category: 'Outdoor',
    description: 'A test club for hikes, camps, and outdoor safety flows.',
    president: ['Sky Outdoors President', 'president@outdoors.test', 'P40001'],
    committee: [
      ['Parker Safety Lead', 'safety@outdoors.test', 'C40002', 'general'],
      ['Quinn Transport Lead', 'transport@outdoors.test', 'C40003', 'transport'],
    ],
    members: [
      ['Grace Outdoors Member', 'member@outdoors.test', 'M40003'],
      ['Lucas Outdoors Member', 'member2@outdoors.test', 'M40004'],
      ['Chloe Outdoors Member', 'member3@outdoors.test', 'M40005'],
    ],
  },
  {
    name: 'Commerce Students Society',
    category: 'Business',
    description: 'A test club for networking nights, panels, and budgets.',
    president: ['Alex Commerce President', 'president@commerce.test', 'P50001'],
    committee: [
      ['Blair Finance Committee', 'finance@commerce.test', 'C50002', 'finance'],
      ['Drew Events Committee', 'events@commerce.test', 'C50003', 'general'],
    ],
    members: [
      ['Ella Commerce Member', 'member@commerce.test', 'M50003'],
      ['Oscar Commerce Member', 'member2@commerce.test', 'M50004'],
      ['Zoe Commerce Member', 'member3@commerce.test', 'M50005'],
    ],
  },
  // --- New UniMelb clubs ---
  {
    name: 'UniMelb Medical Students Society',
    category: 'Health',
    description: 'Connecting medical students through health forums, clinical skill workshops, and wellbeing events.',
    president: ['Marcus Med President', 'president@medclub.test', 'P60001'],
    committee: [
      ['Diana Med Committee', 'committee@medclub.test', 'C60002', 'general'],
      ['Felix Med Finance', 'finance@medclub.test', 'C60003', 'finance'],
    ],
    members: [
      ['Hannah Med Member', 'member@medclub.test', 'M60003'],
      ['Ivan Med Member', 'member2@medclub.test', 'M60004'],
      ['Julia Med Member', 'member3@medclub.test', 'M60005'],
    ],
  },
  {
    name: 'UniMelb Law Society',
    category: 'Academic',
    description: 'Supporting law students with mooting competitions, networking events, and career workshops.',
    president: ['Nathan Law President', 'president@lawsociety.test', 'P70001'],
    committee: [
      ['Olivia Law Committee', 'committee@lawsociety.test', 'C70002', 'general'],
      ['Patrick Law Logistics', 'logistics@lawsociety.test', 'C70003', 'logistics'],
    ],
    members: [
      ['Queenie Law Member', 'member@lawsociety.test', 'M70003'],
      ['Ryan Law Member', 'member2@lawsociety.test', 'M70004'],
      ['Stella Law Member', 'member3@lawsociety.test', 'M70005'],
    ],
  },
  {
    name: 'Melbourne Environment Collective',
    category: 'Environment',
    description: 'Driving sustainability initiatives, campus clean-ups, and environmental awareness campaigns.',
    president: ['Talia Env President', 'president@envclub.test', 'P80001'],
    committee: [
      ['Umar Env Committee', 'committee@envclub.test', 'C80002', 'general'],
      ['Violet Env Logistics', 'logistics@envclub.test', 'C80003', 'logistics'],
    ],
    members: [
      ['Will Env Member', 'member@envclub.test', 'M80003'],
      ['Xena Env Member', 'member2@envclub.test', 'M80004'],
      ['Yuki Env Member', 'member3@envclub.test', 'M80005'],
    ],
  },
  {
    name: 'Melbourne Gaming Society',
    category: 'Gaming',
    description: 'Bringing gamers together through tournaments, LAN events, and casual gaming sessions.',
    president: ['Zara Gaming President', 'president@gamingclub.test', 'P90001'],
    committee: [
      ['Aaron Gaming Committee', 'committee@gamingclub.test', 'C90002', 'general'],
      ['Bella Gaming Finance', 'finance@gamingclub.test', 'C90003', 'finance'],
    ],
    members: [
      ['Carl Gaming Member', 'member@gamingclub.test', 'M90003'],
      ['Demi Gaming Member', 'member2@gamingclub.test', 'M90004'],
      ['Eli Gaming Member', 'member3@gamingclub.test', 'M90005'],
    ],
  },
  {
    name: 'Melbourne Photography Club',
    category: 'Photography',
    description: 'A creative community for photography enthusiasts to share, learn, and exhibit their work.',
    president: ['Fiona Photo President', 'president@photoclub.test', 'P100001'],
    committee: [
      ['George Photo Committee', 'committee@photoclub.test', 'C100002', 'general'],
      ['Holly Photo Logistics', 'logistics@photoclub.test', 'C100003', 'logistics'],
    ],
    members: [
      ['Igor Photo Member', 'member@photoclub.test', 'M100003'],
      ['Jade Photo Member', 'member2@photoclub.test', 'M100004'],
      ['Karl Photo Member', 'member3@photoclub.test', 'M100005'],
    ],
  },
];

const MONASH_CLUB_FIXTURES = [
  {
    name: 'Monash Film Club',
    category: 'Arts',
    description: 'Celebrating cinema through screenings, short filmmaking workshops, and creative discussions.',
    president: ['Leo Film President', 'president@monashfilm.test', 'MP10001'],
    committee: [
      ['Maya Film Committee', 'committee@monashfilm.test', 'MC10002', 'general'],
      ['Nick Film Logistics', 'logistics@monashfilm.test', 'MC10003', 'logistics'],
    ],
    members: [
      ['Olivia Film Member', 'member@monashfilm.test', 'MM10003'],
      ['Pete Film Member', 'member2@monashfilm.test', 'MM10004'],
      ['Quinn Film Member', 'member3@monashfilm.test', 'MM10005'],
    ],
  },
  {
    name: 'Monash Engineering Society',
    category: 'Engineering',
    description: 'Connecting engineering students with industry professionals, projects, and design competitions.',
    president: ['Rachel Eng President', 'president@monasheng.test', 'MP20001'],
    committee: [
      ['Sam Eng Committee', 'committee@monasheng.test', 'MC20002', 'general'],
      ['Tina Eng Finance', 'finance@monasheng.test', 'MC20003', 'finance'],
    ],
    members: [
      ['Uma Eng Member', 'member@monasheng.test', 'MM20003'],
      ['Victor Eng Member', 'member2@monasheng.test', 'MM20004'],
      ['Wendy Eng Member', 'member3@monasheng.test', 'MM20005'],
    ],
  },
  {
    name: 'Monash Business Society',
    category: 'Business',
    description: 'Empowering Monash business students through networking nights, case competitions, and speaker events.',
    president: ['Xavier Biz President', 'president@monashbiz.test', 'MP30001'],
    committee: [
      ['Yasmin Biz Committee', 'committee@monashbiz.test', 'MC30002', 'general'],
      ['Zack Biz Finance', 'finance@monashbiz.test', 'MC30003', 'finance'],
    ],
    members: [
      ['Alice Biz Member', 'member@monashbiz.test', 'MM30003'],
      ['Bob Biz Member', 'member2@monashbiz.test', 'MM30004'],
      ['Clara Biz Member', 'member3@monashbiz.test', 'MM30005'],
    ],
  },
  {
    name: 'Monash Science Society',
    category: 'Science',
    description: 'Fostering scientific curiosity through experiments, research showcases, and science communication events.',
    president: ['Daniel Sci President', 'president@monashsci.test', 'MP40001'],
    committee: [
      ['Eva Sci Committee', 'committee@monashsci.test', 'MC40002', 'general'],
      ['Frank Sci Logistics', 'logistics@monashsci.test', 'MC40003', 'logistics'],
    ],
    members: [
      ['Grace Sci Member', 'member@monashsci.test', 'MM40003'],
      ['Harry Sci Member', 'member2@monashsci.test', 'MM40004'],
      ['Iris Sci Member', 'member3@monashsci.test', 'MM40005'],
    ],
  },
  {
    name: 'Monash Coding Club',
    category: 'Technology',
    description: 'Building coding skills through hackathons, workshops, and collaborative software projects.',
    president: ['Jack Code President', 'president@monashcode.test', 'MP50001'],
    committee: [
      ['Karen Code Committee', 'committee@monashcode.test', 'MC50002', 'general'],
      ['Liam Code Finance', 'finance@monashcode.test', 'MC50003', 'finance'],
    ],
    members: [
      ['Mona Code Member', 'member@monashcode.test', 'MM50003'],
      ['Ned Code Member', 'member2@monashcode.test', 'MM50004'],
      ['Ora Code Member', 'member3@monashcode.test', 'MM50005'],
    ],
  },
  {
    name: 'Monash International Students Club',
    category: 'Cultural',
    description: 'Welcoming international students with cultural festivals, language exchanges, and community support.',
    president: ['Paul Intl President', 'president@monashintl.test', 'MP60001'],
    committee: [
      ['Qian Intl Committee', 'committee@monashintl.test', 'MC60002', 'general'],
      ['Rosa Intl Logistics', 'logistics@monashintl.test', 'MC60003', 'logistics'],
    ],
    members: [
      ['Sana Intl Member', 'member@monashintl.test', 'MM60003'],
      ['Tao Intl Member', 'member2@monashintl.test', 'MM60004'],
      ['Uma Intl Member', 'member3@monashintl.test', 'MM60005'],
    ],
  },
];

const FIXTURE_USER_EMAILS = CLUB_FIXTURES.flatMap(club => [
  club.president[1],
  ...club.committee.map(member => member[1]),
  ...club.members.map(member => member[1]),
]);
const MONASH_FIXTURE_USER_EMAILS = MONASH_CLUB_FIXTURES.flatMap(club => [
  club.president[1],
  ...club.committee.map(member => member[1]),
  ...club.members.map(member => member[1]),
]);
const REQUEST_ONLY_EMAILS = [
  'requester@clubs.test',
  'norole@student.test',
  'robotics.requester@clubs.test',
  'film.requester@monash.test',
  'futurepresident@biomed.test',
  'invitedpresident@artsclub.test',
  'alex.admin@vsa.test',
  'jamie@clubsnetwork.test',
];
const SEED_USER_EMAILS = [
  'superadmin@eventease.com',
  'orgadmin@unimelb.test',
  'orgadmin2@unimelb.test',
  'orgadmin@monash.test',
  'requester@clubs.test',
  'norole@student.test',
  ...FIXTURE_USER_EMAILS,
  ...MONASH_FIXTURE_USER_EMAILS,
];
const SEED_INVITE_EMAILS = ['invitedpresident@artsclub.test'];
const SEED_ORG_NAMES = [
  'University of Melbourne',
  'Monash University',
  'RMIT',
  'Victoria Student Association',
  'National Clubs Network',
];
const SEED_CLUB_NAMES = [
  ...CLUB_FIXTURES.map(club => club.name),
  ...MONASH_CLUB_FIXTURES.map(club => club.name),
  'Biomedical Students Club',
  'Robotics Builders Club',
];

const proofFile = {
  name: 'test-proof.txt',
  type: 'text/plain',
  size: 64,
  data: 'data:text/plain;base64,VGVzdCB2ZXJpZmljYXRpb24gZXZpZGVuY2UgZm9yIEV2ZW50RWFzZS4=',
};

async function upsertUser({ name, email, role = 'user', studentId, password = PASSWORD, organisationId }) {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.studentId = studentId;
    existing.password = password;
    existing.organisationId = organisationId;
    await existing.save();
    return existing;
  }
  return User.create({ name, email, password, role, studentId, organisationId });
}

async function upsertOrg({ name, description, type, officialWebsite, officialEmail, createdBy }) {
  return Organisation.findOneAndUpdate(
    { name },
    { name, description, type, officialWebsite, officialEmail, createdBy },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertClub({ name, description, category, officialClubLink, orgId, createdBy }) {
  return Club.findOneAndUpdate(
    { name, orgId },
    { name, description, category, officialClubLink, orgId, createdBy },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function setMembership({ userId, clubId, role, committeeRole }) {
  if (role === 'president') {
    await ClubMembership.updateMany(
      { clubId, role: 'president', userId: { $ne: userId } },
      { role: 'user', $unset: { committeeRole: '' } }
    );
  }
  return ClubMembership.findOneAndUpdate(
    { userId, clubId },
    { $set: { userId, clubId, role }, ...(committeeRole ? { $set: { userId, clubId, role, committeeRole } } : { $unset: { committeeRole: '' } }) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function daysFromNow(days, hour = 18) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function eventTemplatesForClub(clubFixture) {
  const prefix = clubFixture.name.replace(/^(Melbourne|UniMelb|Monash|Campus)\s+/, '');
  return [
    {
      title: `${prefix} Welcome Night`,
      description: `A relaxed welcome event for ${clubFixture.name} members to meet the committee and hear what is coming up this semester.`,
      category: 'social',
      location: 'Union House Function Room',
      date: daysFromNow(7, 18),
      capacity: 90,
      status: 'published',
      workspaces: [
        { name: 'Logistics', type: 'logistics', description: 'Run sheet, catering, and room setup.' },
        { name: 'Tasks / Notes', type: 'tasks', description: 'Shared checklist for the committee.' },
      ],
    },
    {
      title: `${prefix} Planning Workshop`,
      description: `A hands-on planning session for upcoming ${clubFixture.category.toLowerCase()} activities and committee coordination.`,
      category: clubFixture.category === 'Business' ? 'finance' : 'other',
      location: 'Arts West Seminar Room',
      date: daysFromNow(18, 17),
      capacity: 45,
      status: 'published',
      workspaces: [
        { name: 'Budget', type: 'budget', description: 'Track expected and actual spend.' },
        { name: 'Documents', type: 'documents', description: 'Planning docs, slides, and shared files.' },
      ],
    },
    {
      title: `${prefix} Outdoor Social`,
      description: `An outdoor social event for ${clubFixture.name}, including attendance tracking and safety acknowledgement testing.`,
      category: 'outdoor',
      location: 'South Lawn',
      date: daysFromNow(31, 12),
      capacity: 120,
      status: 'published',
      requiresSafetyDisclaimer: true,
      disclaimerTitle: `${clubFixture.name} Outdoor Event Safety`,
      disclaimerContent: [
        `By RSVPing to this ${clubFixture.name} outdoor event, attendees acknowledge that outdoor activities may involve weather, surface, crowd, and travel risks.`,
        'Attendees agree to follow committee instructions, stay within designated event areas, and tell organisers about any relevant safety concerns.',
        'This seeded disclaimer is for EventEase testing only.',
      ].join('\n\n'),
      disclaimerType: 'text',
      workspaces: [
        { name: 'Safety', type: 'safety', description: 'Risk assessment, contacts, and safety files.' },
        { name: 'Transport', type: 'transport', description: 'Routes, access, and arrival planning.' },
      ],
    },
  ];
}

async function seedEventsForClub({ clubFixture, club, president, committeeMembers }) {
  const assignedCommittee = committeeMembers.slice(0, 2).map(member => ({
    userId: member._id,
    role: member.committeeRole || 'general',
  }));

  for (const template of eventTemplatesForClub(clubFixture)) {
    const { workspaces = [], ...eventData } = template;
    const event = await Event.create({
      ...eventData,
      rsvpDeadline: daysFromNow(Math.max(1, Math.ceil((eventData.date - new Date()) / 86400000) - 2), 23),
      assignedCommittee,
      createdBy: president._id,
      clubId: club._id,
    });

    for (const workspace of workspaces) {
      await Workspace.create({
        ...workspace,
        eventId: event._id,
        owner: assignedCommittee[0]?.userId,
        collaborators: assignedCommittee.slice(1).map(member => member.userId),
        status: 'not_started',
        createdBy: president._id,
      });
    }

    await Task.create({
      workspaceId: (await Workspace.findOne({ eventId: event._id, type: workspaces[0]?.type || 'tasks' }))?._id,
      eventId: event._id,
      title: 'Confirm event plan',
      description: 'Seeded task for testing the workspace task board.',
      assignedTo: assignedCommittee[0]?.userId ? [assignedCommittee[0].userId] : [],
      dueDate: daysFromNow(3, 17),
      status: 'todo',
      createdBy: president._id,
    });
  }
}

async function seedClubsForOrg({ fixtures, org, orgAdmin }) {
  const seededClubs = {};
  for (const clubFixture of fixtures) {
    const club = await upsertClub({
      name: clubFixture.name,
      description: clubFixture.description,
      category: clubFixture.category,
      officialClubLink: `https://example.com/${clubFixture.name.toLowerCase().replace(/\s+/g, '-')}`,
      orgId: org._id,
      createdBy: orgAdmin._id,
    });
    seededClubs[clubFixture.name] = club;

    const [presidentName, presidentEmail, presidentStudentId] = clubFixture.president;
    const president = await upsertUser({
      name: presidentName,
      email: presidentEmail,
      role: 'user',
      studentId: presidentStudentId,
      organisationId: org._id,
    });
    await setMembership({ userId: president._id, clubId: club._id, role: 'president' });

    const committeeMembers = [];
    for (const [name, email, studentId, committeeRole] of clubFixture.committee) {
      const committeeMember = await upsertUser({ name, email, role: 'user', studentId, organisationId: org._id });
      committeeMember.committeeRole = committeeRole;
      committeeMembers.push(committeeMember);
      await setMembership({ userId: committeeMember._id, clubId: club._id, role: 'committee', committeeRole });
    }

    for (const [name, email, studentId] of clubFixture.members) {
      const member = await upsertUser({ name, email, role: 'user', studentId, organisationId: org._id });
      await setMembership({ userId: member._id, clubId: club._id, role: 'user' });
    }

    await seedEventsForClub({ clubFixture, club, president, committeeMembers });
  }
  return seededClubs;
}

async function upsertClubRequest({ status, orgId, clubName, requesterFullName, requesterEmail, requesterRole, presidentFullName, presidentEmail }) {
  const token = crypto.randomBytes(12).toString('hex');
  return ClubRegistrationRequest.findOneAndUpdate(
    { requesterEmail, clubName },
    {
      clubName,
      clubDescription: `${clubName} is a test club registration request.`,
      clubCategory: 'Technology',
      officialClubLink: `https://example.com/${clubName.toLowerCase().replace(/\s+/g, '-')}`,
      orgId,
      requesterFullName,
      requesterEmail,
      requesterRole,
      isPresident: requesterEmail === presidentEmail,
      presidentFullName,
      presidentEmail,
      proofFile,
      additionalNotes: 'Seeded request for testing the review workflow.',
      emailConfirmationToken: token,
      emailConfirmedAt: status === 'awaiting_email_confirmation' ? undefined : new Date(),
      status,
      emailLog: [{
        to: requesterEmail,
        subject: 'Seeded club request email',
        body: 'This is a seeded development email.',
        sentAt: new Date(),
      }],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertOrgRequest({ status, organisationName, adminFullName, adminEmail }) {
  const token = crypto.randomBytes(12).toString('hex');
  return OrganisationRegistrationRequest.findOneAndUpdate(
    { organisationName, adminEmail },
    {
      organisationName,
      organisationDescription: `${organisationName} is a seeded organisation registration request.`,
      organisationType: 'Student Association',
      officialWebsite: `https://example.com/${organisationName.toLowerCase().replace(/\s+/g, '-')}`,
      officialEmail: `admin@${organisationName.toLowerCase().replace(/\s+/g, '')}.example`,
      adminFullName,
      adminEmail,
      adminRole: 'Clubs Coordinator',
      contactNumber: '0400 000 000',
      expectedClubs: '11-25 clubs',
      expectedUsers: '50+ users',
      mainUseCase: 'Testing organisation approval, admin assignment, and workspace creation.',
      proofFile,
      additionalNotes: 'Seeded organisation request for super admin review.',
      emailConfirmationToken: token,
      emailConfirmedAt: status === 'awaiting_email_confirmation' ? undefined : new Date(),
      status,
      emailLog: [{
        to: adminEmail,
        subject: 'Seeded organisation request email',
        body: 'This is a seeded development email.',
        sentAt: new Date(),
      }],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function resetSeedData() {
  const seedUsers = await User.find({ email: { $in: SEED_USER_EMAILS } }).select('_id');
  const seedUserIds = seedUsers.map(user => user._id);

  const seedOrgs = await Organisation.find({ name: { $in: SEED_ORG_NAMES } }).select('_id');
  const seedOrgIds = seedOrgs.map(org => org._id);

  const seedClubs = await Club.find({
    $or: [
      { name: { $in: SEED_CLUB_NAMES } },
      { orgId: { $in: seedOrgIds } },
    ],
  }).select('_id');
  const seedClubIds = seedClubs.map(club => club._id);

  const seedEvents = await Event.find({
    $or: [
      { clubId: { $in: seedClubIds } },
      { createdBy: { $in: seedUserIds } },
      { 'assignedCommittee.userId': { $in: seedUserIds } },
    ],
  }).select('_id');
  const seedEventIds = seedEvents.map(event => event._id);

  const seedWorkspaces = await Workspace.find({
    $or: [
      { eventId: { $in: seedEventIds } },
      { owner: { $in: seedUserIds } },
      { collaborators: { $in: seedUserIds } },
      { createdBy: { $in: seedUserIds } },
      { 'files.uploadedBy': { $in: seedUserIds } },
    ],
  }).select('_id');
  const seedWorkspaceIds = seedWorkspaces.map(workspace => workspace._id);

  await Task.deleteMany({
    $or: [
      { workspaceId: { $in: seedWorkspaceIds } },
      { eventId: { $in: seedEventIds } },
      { assignedTo: { $in: seedUserIds } },
      { createdBy: { $in: seedUserIds } },
    ],
  });
  await Workspace.deleteMany({ _id: { $in: seedWorkspaceIds } });
  await Budget.deleteMany({ $or: [{ clubId: { $in: seedClubIds } }, { eventId: { $in: seedEventIds } }] });
  await BudgetDraft.deleteMany({ $or: [{ clubId: { $in: seedClubIds } }, { userId: { $in: seedUserIds } }] });
  await EventRsvp.deleteMany({ $or: [{ userId: { $in: seedUserIds } }, { eventId: { $in: seedEventIds } }] });
  await Event.deleteMany({ _id: { $in: seedEventIds } });
  await JoinRequest.deleteMany({ $or: [{ userId: { $in: seedUserIds } }, { clubId: { $in: seedClubIds } }] });
  await ClubFollow.deleteMany({ $or: [{ userId: { $in: seedUserIds } }, { clubId: { $in: seedClubIds } }] });
  await ClubMembership.deleteMany({ $or: [{ userId: { $in: seedUserIds } }, { clubId: { $in: seedClubIds } }] });
  await ClubInvitation.deleteMany({
    $or: [
      { email: { $in: SEED_INVITE_EMAILS } },
      { clubId: { $in: seedClubIds } },
    ],
  });
  await OrgAdminAssignment.deleteMany({ $or: [{ userId: { $in: seedUserIds } }, { orgId: { $in: seedOrgIds } }] });
  await ClubRegistrationRequest.deleteMany({
    $or: [
      { requesterEmail: { $in: [...SEED_USER_EMAILS, ...REQUEST_ONLY_EMAILS] } },
      { presidentEmail: { $in: ['futurepresident@biomed.test', 'robotics.requester@clubs.test', 'film.requester@monash.test'] } },
      { clubName: { $in: SEED_CLUB_NAMES } },
      { orgId: { $in: seedOrgIds } },
    ],
  });
  await OrganisationRegistrationRequest.deleteMany({
    $or: [
      { organisationName: { $in: SEED_ORG_NAMES } },
      { adminEmail: { $in: ['alex.admin@vsa.test', 'jamie@clubsnetwork.test'] } },
    ],
  });
  await Club.deleteMany({ _id: { $in: seedClubIds } });
  await Organisation.deleteMany({ _id: { $in: seedOrgIds } });
  await User.deleteMany({ _id: { $in: seedUserIds } });
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await resetSeedData();

  const superAdmin = await upsertUser({
    name: 'EventEase Super Admin',
    email: 'superadmin@eventease.com',
    password: SUPER_ADMIN_PASSWORD,
    role: 'super_admin',
  });

  // --- University of Melbourne ---
  const melbourne = await upsertOrg({
    name: ORG_NAME,
    description: 'Seeded university organisation for club onboarding tests.',
    type: 'University',
    officialWebsite: 'https://www.unimelb.edu.au',
    officialEmail: 'clubs@unimelb.example',
    createdBy: superAdmin._id,
  });
  const orgAdmin = await upsertUser({ name: 'Olivia Org Admin', email: 'orgadmin@unimelb.test', role: 'admin', organisationId: melbourne._id });
  const secondOrgAdmin = await upsertUser({ name: 'Sam Second Admin', email: 'orgadmin2@unimelb.test', role: 'admin', organisationId: melbourne._id });
  await OrgAdminAssignment.findOneAndUpdate({ userId: orgAdmin._id }, { userId: orgAdmin._id, orgId: melbourne._id }, { upsert: true, new: true });
  await OrgAdminAssignment.findOneAndUpdate({ userId: secondOrgAdmin._id }, { userId: secondOrgAdmin._id, orgId: melbourne._id }, { upsert: true, new: true });

  const requester = await upsertUser({ name: 'Riley Requester', email: 'requester@clubs.test', role: 'user', studentId: 'R10004', organisationId: melbourne._id });
  await upsertUser({ name: 'Avery No Role', email: 'norole@student.test', role: 'user', studentId: 'N10005', organisationId: melbourne._id });

  const seededMelbClubs = await seedClubsForOrg({ fixtures: CLUB_FIXTURES, org: melbourne, orgAdmin });

  await ClubInvitation.findOneAndUpdate(
    { email: 'invitedpresident@artsclub.test', clubId: seededMelbClubs['Melbourne Arts Collective']._id, role: 'president', status: 'pending' },
    {
      email: 'invitedpresident@artsclub.test',
      name: 'Jordan Invited President',
      clubId: seededMelbClubs['Melbourne Arts Collective']._id,
      role: 'president',
      token: crypto.randomBytes(16).toString('hex'),
      status: 'pending',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    { upsert: true, new: true }
  );

  await upsertClubRequest({
    status: 'pending_review',
    orgId: melbourne._id,
    clubName: 'Biomedical Students Club',
    requesterFullName: requester.name,
    requesterEmail: requester.email,
    requesterRole: 'Secretary',
    presidentFullName: 'Taylor Future President',
    presidentEmail: 'futurepresident@biomed.test',
  });
  await upsertClubRequest({
    status: 'more_info_needed',
    orgId: melbourne._id,
    clubName: 'Robotics Builders Club',
    requesterFullName: 'Morgan Robotics',
    requesterEmail: 'robotics.requester@clubs.test',
    requesterRole: 'Treasurer',
    presidentFullName: 'Morgan Robotics',
    presidentEmail: 'robotics.requester@clubs.test',
  });

  // --- Monash University ---
  const monash = await upsertOrg({
    name: 'Monash University',
    description: 'Seeded Monash University organisation for multi-org testing.',
    type: 'University',
    officialWebsite: 'https://www.monash.edu',
    officialEmail: 'clubs@monash.example',
    createdBy: superAdmin._id,
  });
  const monashOrgAdmin = await upsertUser({ name: 'Morgan Monash Admin', email: 'orgadmin@monash.test', role: 'admin', organisationId: monash._id });
  await OrgAdminAssignment.findOneAndUpdate({ userId: monashOrgAdmin._id }, { userId: monashOrgAdmin._id, orgId: monash._id }, { upsert: true, new: true });

  await seedClubsForOrg({ fixtures: MONASH_CLUB_FIXTURES, org: monash, orgAdmin: monashOrgAdmin });

  // --- Org registration requests ---
  await upsertOrgRequest({
    status: 'pending_review',
    organisationName: 'Victoria Student Association',
    adminFullName: 'Alex Association Admin',
    adminEmail: 'alex.admin@vsa.test',
  });
  await upsertOrgRequest({
    status: 'more_info_needed',
    organisationName: 'National Clubs Network',
    adminFullName: 'Jamie Network',
    adminEmail: 'jamie@clubsnetwork.test',
  });

  console.log('\nSeeded EventEase test data successfully.\n');
  console.table([
    { role: 'Super Admin', email: 'superadmin@eventease.com', password: SUPER_ADMIN_PASSWORD, notes: 'Platform admin' },
    { role: 'Org Admin', email: 'orgadmin@unimelb.test', password: PASSWORD, notes: 'Manages University of Melbourne' },
    { role: 'Org Admin', email: 'orgadmin2@unimelb.test', password: PASSWORD, notes: 'Second admin for UniMelb' },
    { role: 'Org Admin', email: 'orgadmin@monash.test', password: PASSWORD, notes: 'Manages Monash University' },
    ...CLUB_FIXTURES.flatMap(club => [
      { role: 'President', email: club.president[1], password: PASSWORD, notes: `President of ${club.name} (UniMelb)` },
      ...club.committee.map(member => ({ role: `Committee (${member[3]})`, email: member[1], password: PASSWORD, notes: `Committee in ${club.name}` })),
      ...club.members.map(member => ({ role: 'Member', email: member[1], password: PASSWORD, notes: `Member in ${club.name}` })),
    ]),
    ...MONASH_CLUB_FIXTURES.flatMap(club => [
      { role: 'President', email: club.president[1], password: PASSWORD, notes: `President of ${club.name} (Monash)` },
      ...club.committee.map(member => ({ role: `Committee (${member[3]})`, email: member[1], password: PASSWORD, notes: `Committee in ${club.name}` })),
      ...club.members.map(member => ({ role: 'Member', email: member[1], password: PASSWORD, notes: `Member in ${club.name}` })),
    ]),
    { role: 'Requester', email: 'requester@clubs.test', password: PASSWORD, notes: 'Submitted Biomedical Students Club request' },
    { role: 'No Role User', email: 'norole@student.test', password: PASSWORD, notes: 'Useful for assigning by email' },
    { role: 'Pending Invite', email: 'invitedpresident@artsclub.test', password: '(not registered yet)', notes: 'Register with this email to accept president invite' },
  ]);
  console.log('\nUseful request scenarios:');
  console.log('- Super admin: review Victoria Student Association under Organisation Requests.');
  console.log('- Org admin: review Biomedical Students Club under Club Registration Requests.');
  console.log('- Pending invite: register invitedpresident@artsclub.test with any password to become president of Melbourne Arts Collective.');
  console.log('');

  await mongoose.disconnect();
}

run().catch(async err => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
