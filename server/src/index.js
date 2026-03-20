const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { mongoUri, port } = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));

app.listen(port, () => console.log(`Server running on port ${port}`));
