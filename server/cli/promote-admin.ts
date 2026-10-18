import dotenv from 'dotenv';
dotenv.config();

import { db } from '../db.js';

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('\nUsage: npm run promote-admin <email>');
  console.error('Example: npm run promote-admin owner@somplay.so\n');
  process.exit(1);
}

async function run() {
  const user = await db.promoteUserToAdmin(email);

  if (!user) {
    console.error(`\n[ERROR] No account found with email: "${email}".`);
    console.error('The owner must first register an account with their private password on the SOMPLAY website.');
    console.error('Once registered, re-run this command to grant admin privileges.\n');
    process.exit(1);
  }

  console.log(`\n[SUCCESS] User "${user.name}" (${user.email}) has been successfully granted administrator privileges.`);
  console.log(`[AUDIT] Timestamp: ${new Date().toISOString()}`);
  console.log('The user can now log in and access the SOMPLAY Admin Dashboard.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to promote user:', err);
  process.exit(1);
});
