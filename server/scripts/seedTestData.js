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

const PASSWORD = 'Password123!';

const proofFile = {
  name: 'test-proof.txt',
  type: 'text/plain',
  size: 64,
  data: 'data:text/plain;base64,VGVzdCB2ZXJpZmljYXRpb24gZXZpZGVuY2UgZm9yIEV2ZW50RWFzZS4=',
};

async function upsertUser({ name, email, role = 'user', studentId }) {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.studentId = studentId;
    await existing.save();
    return existing;
  }
  return User.create({ name, email, password: PASSWORD, role, studentId });
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

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const superAdmin = await upsertUser({
    name: 'EventEase Super Admin',
    email: 'superadmin@eventease.com',
    role: 'super_admin',
  });

  const melbourne = await upsertOrg({
    name: 'University of Melbourne',
    description: 'Seeded university organisation for club onboarding tests.',
    type: 'University',
    officialWebsite: 'https://www.unimelb.edu.au',
    officialEmail: 'clubs@unimelb.example',
    createdBy: superAdmin._id,
  });
  const monash = await upsertOrg({
    name: 'Monash University',
    description: 'Seeded university organisation for comparison tests.',
    type: 'University',
    officialWebsite: 'https://www.monash.edu',
    officialEmail: 'clubs@monash.example',
    createdBy: superAdmin._id,
  });
  const rmit = await upsertOrg({
    name: 'RMIT',
    description: 'Seeded university organisation with no admin assigned yet.',
    type: 'University',
    officialWebsite: 'https://www.rmit.edu.au',
    officialEmail: 'clubs@rmit.example',
    createdBy: superAdmin._id,
  });

  const orgAdmin = await upsertUser({ name: 'Olivia Org Admin', email: 'orgadmin@unimelb.test', role: 'admin' });
  const secondOrgAdmin = await upsertUser({ name: 'Sam Second Admin', email: 'orgadmin2@unimelb.test', role: 'admin' });
  await OrgAdminAssignment.findOneAndUpdate({ userId: orgAdmin._id }, { userId: orgAdmin._id, orgId: melbourne._id }, { upsert: true, new: true });
  await OrgAdminAssignment.findOneAndUpdate({ userId: secondOrgAdmin._id }, { userId: secondOrgAdmin._id, orgId: melbourne._id }, { upsert: true, new: true });

  const president = await upsertUser({ name: 'Priya President', email: 'president@codingclub.test', role: 'user', studentId: 'P10001' });
  const committee = await upsertUser({ name: 'Casey Committee', email: 'committee@codingclub.test', role: 'user', studentId: 'C10002' });
  const member = await upsertUser({ name: 'Mia Member', email: 'member@codingclub.test', role: 'user', studentId: 'M10003' });
  const requester = await upsertUser({ name: 'Riley Requester', email: 'requester@clubs.test', role: 'user', studentId: 'R10004' });
  await upsertUser({ name: 'Avery No Role', email: 'norole@student.test', role: 'user', studentId: 'N10005' });

  const codingClub = await upsertClub({
    name: 'Melbourne Coding Society',
    description: 'A test club for coding, projects, and hackathons.',
    category: 'Technology',
    officialClubLink: 'https://example.com/melbourne-coding-society',
    orgId: melbourne._id,
    createdBy: orgAdmin._id,
  });
  const artsClub = await upsertClub({
    name: 'Melbourne Arts Collective',
    description: 'A test club for creative events and exhibitions.',
    category: 'Arts',
    officialClubLink: 'https://example.com/melbourne-arts-collective',
    orgId: melbourne._id,
    createdBy: orgAdmin._id,
  });

  await setMembership({ userId: president._id, clubId: codingClub._id, role: 'president' });
  await setMembership({ userId: committee._id, clubId: codingClub._id, role: 'committee', committeeRole: 'general' });
  await setMembership({ userId: member._id, clubId: codingClub._id, role: 'user' });

  await ClubInvitation.findOneAndUpdate(
    { email: 'invitedpresident@artsclub.test', clubId: artsClub._id, role: 'president', status: 'pending' },
    {
      email: 'invitedpresident@artsclub.test',
      name: 'Jordan Invited President',
      clubId: artsClub._id,
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
  await upsertClubRequest({
    status: 'pending_review',
    orgId: monash._id,
    clubName: 'Monash Film Club',
    requesterFullName: 'Harper Film',
    requesterEmail: 'film.requester@monash.test',
    requesterRole: 'Events Officer',
    presidentFullName: 'Harper Film',
    presidentEmail: 'film.requester@monash.test',
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
    { role: 'Super Admin', email: 'superadmin@eventease.com', password: PASSWORD, notes: 'Platform admin' },
    { role: 'Org Admin', email: 'orgadmin@unimelb.test', password: PASSWORD, notes: 'Manages University of Melbourne' },
    { role: 'Org Admin', email: 'orgadmin2@unimelb.test', password: PASSWORD, notes: 'Second admin for same organisation' },
    { role: 'President', email: 'president@codingclub.test', password: PASSWORD, notes: 'President of Melbourne Coding Society' },
    { role: 'Committee', email: 'committee@codingclub.test', password: PASSWORD, notes: 'Committee in Melbourne Coding Society' },
    { role: 'Member', email: 'member@codingclub.test', password: PASSWORD, notes: 'Member in Melbourne Coding Society' },
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
