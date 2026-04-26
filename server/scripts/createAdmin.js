require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ADMIN = {
  name: 'EventEase Super Admin',
  email: 'superadmin@eventease.com',
  password: 'SuperAdmin@2026',
  role: 'super_admin',
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
