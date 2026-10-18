import dotenv from 'dotenv';
dotenv.config();

import { db } from './db.js';

async function main() {
  console.log('--- SOMPLAY Supabase Connection Test ---');
  const res = await db.testSupabaseConnection();
  console.log('Connected:', res.connected);
  console.log('Message:', res.message);
  if (res.details) {
    console.log('Details:', JSON.stringify(res.details, null, 2));
  }
}

main().catch(console.error);
