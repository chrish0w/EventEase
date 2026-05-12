const router = require('express').Router();
const crypto = require('crypto');
const superAdmin = require('../middleware/superAdmin');
const OrganisationRegistrationRequest = require('../models/OrganisationRegistrationRequest');
const Organisation = require('../models/Organisation');
const User = require('../models/User');
const OrgAdminAssignment = require('../models/OrgAdminAssignment');
const { sendDevEmail } = require('../utils/devMailer');

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

router.post('/', async (req, res) => {
  try {
    const {
      organisationName,
      organisationDescription,
      organisationType,
      officialWebsite,
      officialEmail,
      adminFullName,
      adminEmail,
      adminRole,
      contactNumber,
      expectedClubs,
      expectedUsers,
      mainUseCase,
      additionalOfficialLink,
      additionalNotes,
      proofFile,
      declarations,
    } = req.body;

    const required = [
      organisationName,
      organisationDescription,
      organisationType,
      officialWebsite,
      officialEmail,
      adminFullName,
      adminEmail,
      adminRole,
      expectedClubs,
      expectedUsers,
      mainUseCase,
    ];

    if (required.some(field => !field || !String(field).trim())) {
      return res.status(400).json({ message: 'Please complete all required fields.' });
    }
    if (!isValidEmail(officialEmail) || !isValidEmail(adminEmail)) {
      return res.status(400).json({ message: 'Please enter valid organisation and administrator email addresses.' });
    }
    if (!proofFile?.name || !proofFile?.type || !proofFile?.size || !proofFile?.data) {
      return res.status(400).json({ message: 'Please upload proof of authority.' });
    }
    if (proofFile.size > MAX_PROOF_SIZE) {
      return res.status(400).json({ message: 'Proof file must be 5MB or smaller.' });
    }
    if (!declarations?.authorised || !declarations?.reviewAcknowledged || !declarations?.adminResponsibility) {
      return res.status(400).json({ message: 'Please accept all declarations before submitting.' });
    }

    const emailConfirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationUrl = `${frontendUrl()}/confirm-organisation-registration/${emailConfirmationToken}`;
    const confirmationEmail = sendDevEmail({
      to: adminEmail,
      subject: 'Confirm your EventEase organisation registration request',
      body: `Hi ${adminFullName},\n\nThanks for submitting a registration request for ${organisationName}.\n\nPlease confirm your email address before the request is reviewed:\n${confirmationUrl}\n\nRegards,\nEventEase Admin Team`,
    });

    const request = await OrganisationRegistrationRequest.create({
      organisationName,
      organisationDescription,
      organisationType,
      officialWebsite,
      officialEmail,
      adminFullName,
      adminEmail,
      adminRole,
      contactNumber,
      expectedClubs,
      expectedUsers,
      mainUseCase,
      additionalOfficialLink,
      additionalNotes,
      proofFile,
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
    const request = await OrganisationRegistrationRequest.findOne({ emailConfirmationToken: req.params.token });
    if (!request) return res.status(404).json({ message: 'Confirmation link is invalid.' });
    if (request.emailConfirmedAt) return res.json({ status: request.status, message: 'Email already confirmed.' });
    request.emailConfirmedAt = new Date();
    request.status = 'pending_review';
    await request.save();
    res.json({ status: request.status, message: 'Email confirmed. Your organisation request is now pending review.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', superAdmin, async (req, res) => {
  try {
    const requests = await OrganisationRegistrationRequest.find()
      .select('-proofFile.data -emailConfirmationToken')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/proof', superAdmin, async (req, res) => {
  try {
    const request = await OrganisationRegistrationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request.proofFile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/request-more-info', superAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required.' });
    const request = await OrganisationRegistrationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const email = sendDevEmail({
      to: request.adminEmail,
      subject: 'More information needed for your EventEase organisation registration',
      body: `Hi ${request.adminFullName},\n\nThanks for submitting a registration request for ${request.organisationName}.\n\nBefore we can approve your organisation workspace, we need some additional information:\n\n${message}\n\nRegards,\nEventEase Admin Team`,
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

router.put('/:id/reject', superAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: 'Rejection reason is required.' });
    const request = await OrganisationRegistrationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const email = sendDevEmail({
      to: request.adminEmail,
      subject: 'EventEase organisation registration request outcome',
      body: `Hi ${request.adminFullName},\n\nThank you for submitting a registration request for ${request.organisationName}.\n\nUnfortunately, we were unable to approve your request because:\n\n${reason}\n\nRegards,\nEventEase Admin Team`,
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

router.put('/:id/approve', superAdmin, async (req, res) => {
  try {
    const {
      organisationName,
      organisationDescription,
      organisationType,
      officialWebsite,
      officialEmail,
      adminFullName,
      adminEmail,
      adminNotes,
    } = req.body;
    if (![organisationName, organisationDescription, organisationType, officialWebsite, officialEmail, adminFullName, adminEmail].every(Boolean)) {
      return res.status(400).json({ message: 'Please complete all organisation workspace details.' });
    }
    if (!isValidEmail(officialEmail) || !isValidEmail(adminEmail)) {
      return res.status(400).json({ message: 'Please enter valid organisation and administrator email addresses.' });
    }

    const request = await OrganisationRegistrationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status === 'approved') return res.status(400).json({ message: 'Request has already been approved.' });
    if (!request.emailConfirmedAt) return res.status(400).json({ message: 'Requester email has not been confirmed yet.' });

    const organisation = await Organisation.create({
      name: organisationName,
      description: organisationDescription,
      type: organisationType,
      officialWebsite,
      officialEmail,
      createdBy: req.user.id,
    });

    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    let temporaryPassword = null;
    if (!admin) {
      temporaryPassword = `EventEase@${crypto.randomInt(100000, 999999)}`;
      admin = await User.create({
        name: adminFullName,
        email: adminEmail,
        password: temporaryPassword,
        role: 'admin',
      });
    } else {
      if (await require('../models/ClubMembership').findOne({ userId: admin._id })) {
        return res.status(400).json({ message: 'This user already has a club role and cannot become an organisation admin.' });
      }
      admin.role = 'admin';
      await admin.save();
    }

    await OrgAdminAssignment.findOneAndUpdate(
      { userId: admin._id },
      { userId: admin._id, orgId: organisation._id },
      { upsert: true, new: true }
    );

    const approvalEmail = sendDevEmail({
      to: request.adminEmail,
      subject: 'Your EventEase organisation workspace has been approved',
      body: `Hi ${request.adminFullName},\n\nYour registration request for ${organisationName} has been approved.\n\nAn organisation workspace has now been created on EventEase.\n\nRegards,\nEventEase Admin Team`,
    });
    request.organisationName = organisationName;
    request.organisationDescription = organisationDescription;
    request.organisationType = organisationType;
    request.officialWebsite = officialWebsite;
    request.officialEmail = officialEmail;
    request.adminFullName = adminFullName;
    request.adminEmail = adminEmail;
    request.status = 'approved';
    request.adminNotes = adminNotes;
    request.createdOrganisationId = organisation._id;
    request.emailLog.push(approvalEmail);
    if (temporaryPassword) {
      request.emailLog.push(sendDevEmail({
        to: adminEmail,
        subject: 'Your EventEase organisation admin account',
        body: `Hi ${adminFullName},\n\nYou have been assigned as the organisation admin for ${organisationName}.\n\nEmail: ${adminEmail}\nTemporary password: ${temporaryPassword}\n\nRegards,\nEventEase Admin Team`,
      }));
    }
    await request.save();
    res.json({ request: publicRequest(request), organisation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
