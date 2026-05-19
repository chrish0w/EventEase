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

const PASSWORD = 'Password123!';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@2026';
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
];
const FIXTURE_USER_EMAILS = CLUB_FIXTURES.flatMap(club => [
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
  'requester@clubs.test',
  'norole@student.test',
  ...FIXTURE_USER_EMAILS,
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
  'Biomedical Students Club',
  'Robotics Builders Club',
  'Monash Film Club',
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
  const prefix = clubFixture.name.replace(/^Melbourne\s+/, '');
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

  const seededClubs = {};
  for (const clubFixture of CLUB_FIXTURES) {
    const club = await upsertClub({
      name: clubFixture.name,
      description: clubFixture.description,
      category: clubFixture.category,
      officialClubLink: `https://example.com/${clubFixture.name.toLowerCase().replace(/\s+/g, '-')}`,
      orgId: melbourne._id,
      createdBy: orgAdmin._id,
    });
    seededClubs[clubFixture.name] = club;

    const [presidentName, presidentEmail, presidentStudentId] = clubFixture.president;
    const president = await upsertUser({
      name: presidentName,
      email: presidentEmail,
      role: 'user',
      studentId: presidentStudentId,
      organisationId: melbourne._id,
    });
    await setMembership({ userId: president._id, clubId: club._id, role: 'president' });

    const committeeMembers = [];
    for (const [name, email, studentId, committeeRole] of clubFixture.committee) {
      const committeeMember = await upsertUser({ name, email, role: 'user', studentId, organisationId: melbourne._id });
      committeeMember.committeeRole = committeeRole;
      committeeMembers.push(committeeMember);
      await setMembership({ userId: committeeMember._id, clubId: club._id, role: 'committee', committeeRole });
    }

    for (const [name, email, studentId] of clubFixture.members) {
      const member = await upsertUser({ name, email, role: 'user', studentId, organisationId: melbourne._id });
      await setMembership({ userId: member._id, clubId: club._id, role: 'user' });
    }

    await seedEventsForClub({ clubFixture, club, president, committeeMembers });
  }

  await ClubInvitation.findOneAndUpdate(
    { email: 'invitedpresident@artsclub.test', clubId: seededClubs['Melbourne Arts Collective']._id, role: 'president', status: 'pending' },
    {
      email: 'invitedpresident@artsclub.test',
      name: 'Jordan Invited President',
      clubId: seededClubs['Melbourne Arts Collective']._id,
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
    { role: 'Org Admin', email: 'orgadmin2@unimelb.test', password: PASSWORD, notes: 'Second admin for same organisation' },
    ...CLUB_FIXTURES.flatMap(club => [
      { role: 'President', email: club.president[1], password: PASSWORD, notes: `President of ${club.name}` },
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
