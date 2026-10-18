import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { db, hashPassword } from '../db.js';

const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3]?.trim();
const name = process.argv[4]?.trim() || 'SOMPLAY Staff';

if (!email || !password) {
  console.error('\nUsage: npm run create-employee <email> <initial_password> [display_name]');
  console.error('Example: npm run create-employee Mpabpestore1@gmail.com Secr3tPass "Support Agent"\n');
  process.exit(1);
}

if (password.length < 6) {
  console.error('\n[ERROR] Initial password must be at least 6 characters long.\n');
  process.exit(1);
}

async function run() {
  const existing = await db.findUserByEmail(email);

  if (existing) {
    if (existing.role === 'admin') {
      console.error(`\n[ERROR] User "${email}" is currently an administrator. Cannot demote via this script.\n`);
      process.exit(1);
    }

    console.log(`\nAccount with email "${email}" already exists (current role: ${existing.role}). Updating to employee role and updating password...`);
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newPasswordHash = hashPassword(password, newSalt);
    const updated = await db.updateUser(existing.id, {
      role: 'employee',
      name: name || existing.name,
      passwordHash: newPasswordHash,
      salt: newSalt,
      isActive: true,
    });

    if (!updated) {
      console.error('\n[ERROR] Failed to update user to employee role. Check database constraints.');
      process.exit(1);
    }

    console.log(`\n[SUCCESS] Employee account "${updated.name}" (${updated.email}) updated successfully.`);
    console.log(`[STATUS] Role: employee, Active: true`);
    console.log(`[AUDIT] Timestamp: ${new Date().toISOString()}\n`);
    process.exit(0);
  }

  // Create new employee
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const newEmp = await db.createUser({
    id: `emp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    name,
    email,
    phone: '',
    passwordHash,
    salt,
    role: 'employee',
    isActive: true,
    pepPoints: 0,
    profilePhotoUrl: '',
    createdAt: new Date().toISOString(),
  });

  console.log(`\n[SUCCESS] New employee account created successfully:`);
  console.log(`  - User ID: ${newEmp.id}`);
  console.log(`  - Display Name: ${newEmp.name}`);
  console.log(`  - Email: ${newEmp.email}`);
  console.log(`  - Role: ${newEmp.role}`);
  console.log(`  - Active: ${newEmp.isActive}`);
  console.log(`[AUDIT] Timestamp: ${new Date().toISOString()}\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error('\n[ERROR] Failed to create employee:', err.message);
  process.exit(1);
});
