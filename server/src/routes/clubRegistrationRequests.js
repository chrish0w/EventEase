const router = require('express').Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const ClubRegistrationRequest = require('../models/ClubRegistrationRequest');
const Organisation = require('../models/Organisation');
const Club = require('../models/Club');
const User = require('../models/User');
const ClubMembership = require('../models/ClubMembership');
const OrgAdminAssignment = require('../models/OrgAdminAssignment');
const ClubInvitation = require('../models/ClubInvitation');
const { sendDevEmail } = require('../utils/devMailer');

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ORGANISATIONS = [
  'University of Melbourne',
  'RMIT',
  'Monash University',
  'Deakin University',
  'Swinburne University',
];

function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email || '').trim());
}

function frontendUrl() {
  return process.env.CLIENT_URL || 'http://localhost:5173';
}

function publicRequest(request) {
  const requestObject = request.toObject();
  if (requestObject.proofFile?.data) delete requestObject.proofFile.data;
  if (requestObject.emailConfirmationToken) delete requestObject.emailConfirmationToken;
  return requestObject;
}

async function getAdminOrgId(userId) {
  const assignment = await OrgAdminAssignment.findOne({ userId });
  return assignment?.orgId || null;
}

async function ensureDefaultOrganisations() {
  const superAdmin = await User.findOne({ role: 'super_admin' });
  if (!superAdmin) return;
  await Promise.all(DEFAULT_ORGANISATIONS.map(name =>
    Organisation.findOneAndUpdate(
      { name },
      { name, description: `${name} clubs and societies`, createdBy: superAdmin._id },
      { upsert: true, setDefaultsOnInsert: true }
    )
  ));
}

async function ensureOrgAdmin(req, res, requestId = null) {
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Org admin only' });
    return null;
  }
  const orgId = await getAdminOrgId(req.user.id);
  if (!orgId) {
    res.status(403).json({ message: 'No organisation assigned' });
    return null;
  }
  if (!requestId) return { orgId };
  const request = await ClubRegistrationRequest.findById(requestId);
  if (!request) {
    res.status(404).json({ message: 'Request not found' });
    return null;
  }
  if (request.orgId.toString() !== orgId.toString()) {
    res.status(403).json({ message: 'Request belongs to another organisation' });
    return null;
  }
  return { orgId, request };
}

router.get('/organisations', async (req, res) => {
  try {
    await ensureDefaultOrganisations();
    const orgs = await Organisation.find({}, 'name description').sort({ name: 1 });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      orgId,
      clubName,
      clubDescription,
      clubCategory,
      officialClubLink,
      requesterFullName,
      requesterEmail,
      requesterRole,
      isPresident,
      presidentFullName,
      presidentEmail,
      proofFile,
      additionalNotes,
      declarations,
    } = req.body;

    const requiredFields = [
      orgId,
      clubName,
      clubDescription,
      clubCategory,
      officialClubLink,
      requesterFullName,
      requesterEmail,
      requesterRole,
    ];

    if (requiredFields.some(field => !field || !String(field).trim())) {
      return res.status(400).json({ message: 'Please complete all required fields.' });
    }

    const org = await Organisation.findById(orgId);
    if (!org) return res.status(400).json({ message: 'Please select a valid university.' });

    if (!isValidEmail(requesterEmail)) {
      return res.status(400).json({ message: 'Please enter a valid requester email address.' });
    }

    if (!isPresident && !isValidEmail(presidentEmail)) {
      return res.status(400).json({ message: 'Please enter a valid president email address.' });
    }

    if (typeof isPresident !== 'boolean') {
      return res.status(400).json({ message: 'Please confirm whether you are the current club president.' });
    }

    if (!isPresident && (!presidentFullName || !presidentEmail)) {
      return res.status(400).json({ message: 'Please provide the current club president details.' });
    }

    if (!proofFile?.name || !proofFile?.type || !proofFile?.size || !proofFile?.data) {
      return res.status(400).json({ message: 'Please upload proof of your club role.' });
    }

    if (proofFile.size > MAX_PROOF_SIZE) {
      return res.status(400).json({ message: 'Proof file must be 5MB or smaller.' });
    }

    if (!declarations?.authorised || !declarations?.reviewAcknowledged) {
      return res.status(400).json({ message: 'Please accept both declarations before submitting.' });
    }

    const emailConfirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationUrl = `${frontendUrl()}/confirm-club-registration/${emailConfirmationToken}`;
    const confirmationEmail = sendDevEmail({
      to: requesterEmail,
      subject: 'Confirm your EventEase club registration request',
      body: `Hi ${requesterFullName},\n\nThanks for submitting a registration request for ${clubName}.\n\nPlease confirm your email address before the request is reviewed:\n${confirmationUrl}\n\nRegards,\nEventEase Admin Team`,
    });

    const request = await ClubRegistrationRequest.create({
      clubName,
      clubDescription,
      clubCategory,
      officialClubLink,
      orgId,
      requesterFullName,
      requesterEmail,
      requesterRole,
      isPresident,
      presidentFullName: isPresident ? requesterFullName : presidentFullName,
      presidentEmail: isPresident ? requesterEmail : presidentEmail,
      proofFile,
      additionalNotes,
      emailConfirmationToken,
      emailLog: [confirmationEmail],
    });

    res.status(201).json({
      id: request._id,
      status: request.status,
      confirmationUrl,
      message: 'Confirmation email sent. In local development, use confirmationUrl to complete verification.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/confirm/:token', async (req, res) => {
  try {
    const request = await ClubRegistrationRequest.findOne({ emailConfirmationToken: req.params.token });
    if (!request) return res.status(404).json({ message: 'Confirmation link is invalid.' });
    if (request.emailConfirmedAt) return res.json({ status: request.status, message: 'Email already confirmed.' });

    request.emailConfirmedAt = new Date();
    request.status = 'pending_review';
    await request.save();
    res.json({ status: request.status, message: 'Email confirmed. Your request is now pending review.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const admin = await ensureOrgAdmin(req, res);
    if (!admin) return;
    const requests = await ClubRegistrationRequest.find()
      .where('orgId').equals(admin.orgId)
      .select('-proofFile.data -emailConfirmationToken')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const admin = await ensureOrgAdmin(req, res, req.params.id);
    if (!admin) return;
    const requestObject = publicRequest(admin.request);
    res.json(requestObject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/proof', auth, async (req, res) => {
  try {
    const admin = await ensureOrgAdmin(req, res, req.params.id);
    if (!admin) return;
    res.json(admin.request.proofFile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/request-more-info', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required.' });

    const admin = await ensureOrgAdmin(req, res, req.params.id);
    if (!admin) return;
    const { request } = admin;

    const email = sendDevEmail({
      to: request.requesterEmail,
      subject: 'More information needed for your EventEase club registration',
      body: `Hi ${request.requesterFullName},\n\nThanks for submitting a registration request for ${request.clubName}.\n\nBefore we can approve your club workspace, we need some additional information:\n\n${message}\n\nRegards,\nEventEase Admin Team`,
    });

    request.status = 'more_info_needed';
    request.adminNotes = message;
    request.emailLog.push(email);
    await request.save();
    res.json(publicRequest(request));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: 'Rejection reason is required.' });

    const admin = await ensureOrgAdmin(req, res, req.params.id);
    if (!admin) return;
    const { request } = admin;

    const email = sendDevEmail({
      to: request.requesterEmail,
      subject: 'EventEase club registration request outcome',
      body: `Hi ${request.requesterFullName},\n\nThank you for submitting a registration request for ${request.clubName}.\n\nUnfortunately, we were unable to approve your request because:\n\n${reason}\n\nRegards,\nEventEase Admin Team`,
    });

    request.status = 'rejected';
    request.adminNotes = reason;
    request.emailLog.push(email);
    await request.save();
    res.json(publicRequest(request));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/approve', auth, async (req, res) => {
  try {
    const {
      clubName,
      clubDescription,
      clubCategory,
      officialClubLink,
      presidentName,
      presidentEmail,
      adminNotes,
    } = req.body;

    if (![clubName, clubDescription, clubCategory, officialClubLink, presidentName, presidentEmail].every(Boolean)) {
      return res.status(400).json({ message: 'Please complete all approved club workspace details.' });
    }

    if (!isValidEmail(presidentEmail)) {
      return res.status(400).json({ message: 'Please enter a valid president email address.' });
    }

    const admin = await ensureOrgAdmin(req, res, req.params.id);
    if (!admin) return;
    const { request, orgId } = admin;
    if (request.status === 'approved') return res.status(400).json({ message: 'Request has already been approved.' });
    if (!request.emailConfirmedAt) return res.status(400).json({ message: 'Requester email has not been confirmed yet.' });

    let president = await User.findOne({ email: presidentEmail.toLowerCase() });
    if (president?.role === 'admin') {
      return res.status(400).json({ message: 'Organisation admins cannot be assigned as club presidents.' });
    }

    const club = await Club.create({
      name: clubName,
      description: clubDescription,
      category: clubCategory,
      officialClubLink,
      orgId: request.orgId,
      createdBy: req.user.id,
    });

    if (president) {
      await ClubMembership.updateMany(
        { clubId: club._id, role: 'president', userId: { $ne: president._id } },
        { role: 'user', $unset: { committeeRole: '' } }
      );
      await ClubMembership.findOneAndUpdate(
        { userId: president._id, clubId: club._id },
        { $set: { userId: president._id, clubId: club._id, role: 'president' }, $unset: { committeeRole: '' } },
        { upsert: true, new: true }
      );
    } else {
      const token = crypto.randomBytes(32).toString('hex');
      await ClubInvitation.findOneAndUpdate(
        { email: presidentEmail.toLowerCase(), clubId: club._id, role: 'president', status: 'pending' },
        {
          email: presidentEmail,
          name: presidentName,
          clubId: club._id,
          role: 'president',
          token,
          status: 'pending',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
        { upsert: true, new: true }
      );
      request.emailLog.push(sendDevEmail({
        to: presidentEmail,
        subject: 'You have been invited to EventEase as club president',
        body: `Hi ${presidentName},\n\nYou have been invited to join EventEase as President of ${clubName}.\n\nIn local development, register using this email address and the invitation can be linked during account setup.\n\nRegards,\nEventEase Admin Team`,
      }));
    }

    const requesterEmail = sendDevEmail({
      to: request.requesterEmail,
      subject: 'Your EventEase club workspace has been approved',
      body: `Hi ${request.requesterFullName},\n\nYour registration request for ${clubName} has been approved.\n\nA club workspace has now been created on EventEase, and the nominated president has been assigned.\n\nRegards,\nEventEase Admin Team`,
    });

    request.clubName = clubName;
    request.clubDescription = clubDescription;
    request.clubCategory = clubCategory;
    request.officialClubLink = officialClubLink;
    request.presidentFullName = presidentName;
    request.presidentEmail = presidentEmail;
    request.status = 'approved';
    request.adminNotes = adminNotes;
    request.createdClubId = club._id;
    request.emailLog.push(requesterEmail);

    await request.save();
    res.json({ request: publicRequest(request), club });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
