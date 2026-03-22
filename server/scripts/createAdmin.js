require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ADMIN = {
  name: 'Monash Admin',
  email: 'admin@monash.edu',
  password: 'Admin@2026',
  role: 'admin',
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const exists = await User.findOne({ email: ADMIN.email });
  if (exists) {
    console.log('Admin already exists:', ADMIN.email);
    process.exit(0);
  }
  await User.create(ADMIN);
  console.log('Admin created successfully!');
  console.log('  Email   :', ADMIN.email);
  console.log('  Password:', ADMIN.password);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
