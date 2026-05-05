const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/super-admin', require('./routes/superAdmin'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/safety-files', require('./routes/safetyFiles'));
app.use('/api/club-registration-requests', require('./routes/clubRegistrationRequests'));
app.use('/api/organisation-registration-requests', require('./routes/organisationRegistrationRequests'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
