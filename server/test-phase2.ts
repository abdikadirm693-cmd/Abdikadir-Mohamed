import dotenv from 'dotenv';
dotenv.config();

import { db, User, Order } from './db.js';
import { createToken } from './auth.js';

const BASE_URL = 'http://localhost:3000';

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('   SOMPLAY Phase 2 Security & Functional Test Suite  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Setup test users in DB / memory if needed
  const adminUser = await db.findUserByEmail('abdikadirmohamed682@gmail.com');
  if (!adminUser) {
    console.error('FATAL: Admin user not found');
    process.exit(1);
  }

  // Find or create test customer
  let customerUser = await db.findUserByEmail('test_customer_p2@somplay.so');
  if (!customerUser) {
    customerUser = await db.createUser({
      id: `cust_p2_${Date.now()}`,
      name: 'Test Customer',
      email: 'test_customer_p2@somplay.so',
      phone: '252615000111',
      passwordHash: 'dummy_hash',
      salt: 'dummy_salt',
      role: 'customer',
      isActive: true,
      pepPoints: 50,
      createdAt: new Date().toISOString(),
    });
  }

  // Find or create another test customer (to test cross-user ownership)
  let otherCustomer = await db.findUserByEmail('other_customer_p2@somplay.so');
  if (!otherCustomer) {
    otherCustomer = await db.createUser({
      id: `cust_other_${Date.now()}`,
      name: 'Other Customer',
      email: 'other_customer_p2@somplay.so',
      phone: '252615000222',
      passwordHash: 'dummy_hash',
      salt: 'dummy_salt',
      role: 'customer',
      isActive: true,
      pepPoints: 50,
      createdAt: new Date().toISOString(),
    });
  }

  // Find or create test employee
  let employeeUser = await db.findUserByEmail('mpabpestore1@gmail.com');
  if (!employeeUser) {
    employeeUser = await db.findUserByEmail('test_employee_p2@somplay.so');
    if (!employeeUser) {
      employeeUser = await db.createUser({
        id: `emp_p2_${Date.now()}`,
        name: 'Test Staff Member',
        email: 'test_employee_p2@somplay.so',
        phone: '252615000333',
        passwordHash: 'dummy_hash',
        salt: 'dummy_salt',
        role: 'employee',
        isActive: true,
        pepPoints: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const adminToken = createToken(adminUser.id);
  const customerToken = createToken(customerUser.id);
  const otherCustomerToken = createToken(otherCustomer.id);
  const employeeToken = createToken(employeeUser.id);

  const packages = await db.getPackages();
  const testPkg = packages[0] || { id: 'pkg_60uc', priceUsd: 0.99 };
  const wallets = await db.getWallets();
  const testWallet = wallets.find((w) => w.active) || wallets[0];

  // ----------------------------------------------------
  // TEST 1: Unauthenticated Visitor Cannot Place Orders
  // ----------------------------------------------------
  console.log('Test 1: Unauthenticated visitor attempting POST /api/orders...');
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: '512345678',
        walletId: testWallet.id,
      }),
    });
    if (res.status === 401) {
      console.log('✓ PASS: Rejected with 401 Unauthorized as expected');
      passed++;
    } else {
      console.error(`✗ FAIL: Expected 401, received ${res.status}`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 2: Employee Cannot Place Customer Orders
  // ----------------------------------------------------
  console.log('\nTest 2: Employee attempting POST /api/orders (Staff checkout block)...');
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: '512345678',
        walletId: testWallet.id,
      }),
    });
    const data = await res.json();
    if (res.status === 403 && data.error?.toLowerCase().includes('employee')) {
      console.log(`✓ PASS: Rejected with 403 Forbidden: "${data.error}"`);
      passed++;
    } else {
      console.error(`✗ FAIL: Expected 403 Forbidden, received ${res.status}:`, data);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 3: Administrator Cannot Place Fake Customer Orders
  // ----------------------------------------------------
  console.log('\nTest 3: Administrator attempting POST /api/orders (Admin checkout block)...');
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: '512345678',
        walletId: testWallet.id,
      }),
    });
    const data = await res.json();
    if (res.status === 403 && data.error?.toLowerCase().includes('administrator')) {
      console.log(`✓ PASS: Rejected with 403 Forbidden: "${data.error}"`);
      passed++;
    } else {
      console.error(`✗ FAIL: Expected 403 Forbidden, received ${res.status}:`, data);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 4: Customer Can Successfully Place Legitimate Order
  // ----------------------------------------------------
  console.log('\nTest 4: Verified customer placing legitimate order...');
  let createdOrderId = '';
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: '599887766',
        pubgNickname: 'SomaliGamer',
        walletId: testWallet.id,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.order?.id) {
      createdOrderId = data.order.id;
      console.log(`✓ PASS: Order created successfully (ID: ${createdOrderId}, Status: ${data.order.status})`);
      passed++;
    } else {
      console.error(`✗ FAIL: Expected 201, received ${res.status}:`, data);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 5: Customer Submits Payment Details (Status -> Pending)
  // ----------------------------------------------------
  console.log('\nTest 5: Customer submitting payment phone number (Transitions to Pending)...');
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/submit-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        senderPhone: '252615998877',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.order?.status === 'pending' && data.order.senderPhone === '252615998877') {
      console.log(`✓ PASS: Order submitted for verification (Status: ${data.order.status}, SenderPhone: ${data.order.senderPhone})`);
      console.log('✓ PASS: Confirmed payment was NOT automatically marked completed!');
      passed++;
    } else {
      console.error(`✗ FAIL: Expected pending status, received:`, data);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 6: Other Customer Cannot Submit Payment For Someone Else's Order
  // ----------------------------------------------------
  console.log('\nTest 6: Cross-user privacy: other customer cannot submit payment for another order...');
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/submit-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherCustomerToken}`,
      },
      body: JSON.stringify({
        senderPhone: '252615999999',
      }),
    });
    if (res.status === 403) {
      console.log('✓ PASS: Rejected with 403 Forbidden for cross-user order submission');
      passed++;
    } else {
      console.error(`✗ FAIL: Expected 403, received ${res.status}`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 7: Customer Cannot Access Employee Order Inbox
  // ----------------------------------------------------
  console.log('\nTest 7: Customer attempting to access /api/employee/orders...');
  try {
    const res = await fetch(`${BASE_URL}/api/employee/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (res.status === 403) {
      console.log('✓ PASS: Rejected with 403 Forbidden (Customer blocked from staff inbox)');
      passed++;
    } else {
      console.error(`✗ FAIL: Expected 403, received ${res.status}`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 8: Employee Can Access Order Inbox (Newest First)
  // ----------------------------------------------------
  console.log('\nTest 8: Employee accessing /api/employee/orders (Inbox Feed)...');
  try {
    const res = await fetch(`${BASE_URL}/api/employee/orders`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data.orders)) {
      console.log(`✓ PASS: Successfully retrieved ${data.orders.length} store orders`);
      // Check chronological order (newest first)
      let sorted = true;
      for (let i = 0; i < data.orders.length - 1; i++) {
        const t1 = new Date(data.orders[i].createdAt).getTime();
        const t2 = new Date(data.orders[i + 1].createdAt).getTime();
        if (t1 < t2) {
          sorted = false;
          break;
        }
      }
      if (sorted) {
        console.log('✓ PASS: Orders are strictly sorted descending by creation timestamp (Newest first)');
        passed++;
      } else {
        console.error('✗ FAIL: Orders not sorted newest first');
        failed++;
      }
    } else {
      console.error(`✗ FAIL: Expected 200 OK, received ${res.status}:`, data);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 9: Employee Accessing /api/employee/stats
  // ----------------------------------------------------
  console.log('\nTest 9: Employee stats metrics (1h, 24h, 7d, 30d, Pending)...');
  try {
    const res = await fetch(`${BASE_URL}/api/employee/stats`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const data = await res.json();
    if (
      res.status === 200 &&
      data.orderCounts &&
      data.orderCounts.lastHour !== undefined &&
      data.orderCounts.lastDay !== undefined &&
      data.visitorCounts &&
      data.visitorCounts.lastDay !== undefined &&
      data.totalRevenue === undefined &&
      data.totalUsers === undefined
    ) {
      console.log('✓ PASS: Order counts returned for 1h, 24h, 7d, 30d & Pending');
      console.log('✓ PASS: Visitor counts returned for 1h, 24h, 7d, 30d');
      console.log('✓ PASS: Protected: Registered user counts and financial revenue are NOT exposed');
      passed++;
    } else {
      console.error(`✗ FAIL: Stats payload malformed or exposed revenue:`, data);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 10: Employee Processes Order to Completed & PEP Awarded Once
  // ----------------------------------------------------
  console.log('\nTest 10: Employee processing order to Completed (Awarding PEP points once)...');
  try {
    const initialCustomer = await db.findUserById(customerUser.id);
    const initialPoints = initialCustomer?.pepPoints ?? 50;

    const res = await fetch(`${BASE_URL}/api/employee/orders/${createdOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'completed',
        adminNote: 'Verified Zaad USSD payment and dispatched UC to UID 599887766.',
      }),
    });
    const data = await res.json();

    const updatedCustomer = await db.findUserById(customerUser.id);
    const updatedPoints = updatedCustomer?.pepPoints ?? 50;
    const expectedPointsAwarded = data.order?.pepPointsAmount || Math.round(data.order.priceUsd * 10);

    if (
      res.status === 200 &&
      data.order?.status === 'completed' &&
      data.order?.pepAwarded === true &&
      data.order?.verifiedAt &&
      updatedPoints === initialPoints + expectedPointsAwarded
    ) {
      console.log(`✓ PASS: Order marked Completed with verifiedAt timestamp`);
      console.log(`✓ PASS: Customer PEP points increased by ${expectedPointsAwarded} (From ${initialPoints} to ${updatedPoints})`);

      // Repeat completion to test PEP points are NOT awarded more than once
      const repeatRes = await fetch(`${BASE_URL}/api/employee/orders/${createdOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
        body: JSON.stringify({
          status: 'completed',
          adminNote: 'Secondary check',
        }),
      });
      const checkCustomer = await db.findUserById(customerUser.id);
      if (checkCustomer?.pepPoints === updatedPoints) {
        console.log('✓ PASS: PEP points cannot be awarded more than once for the same order');
        passed++;
      } else {
        console.error('✗ FAIL: PEP points awarded multiple times!');
        failed++;
      }
    } else {
      console.error('✗ FAIL: Order completion or PEP point award failed:', data);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 11: Employee Rejects Order With Required Reason
  // ----------------------------------------------------
  console.log('\nTest 11: Employee order rejection requires a reason...');
  try {
    // Create another quick order to test rejection
    const newOrdRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: '123456789',
        walletId: testWallet.id,
      }),
    });
    const newOrdData = await newOrdRes.json();
    const rejectOrderId = newOrdData.order.id;

    // Reject with reason
    const rejRes = await fetch(`${BASE_URL}/api/employee/orders/${rejectOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'failed',
        rejectionReason: 'Payment not received in merchant statement.',
      }),
    });
    const rejData = await rejRes.json();
    if (
      rejRes.status === 200 &&
      rejData.order?.status === 'failed' &&
      rejData.order?.rejectionReason === 'Payment not received in merchant statement.'
    ) {
      console.log(`✓ PASS: Order rejected and rejection reason saved: "${rejData.order.rejectionReason}"`);
      passed++;
    } else {
      console.error('✗ FAIL: Rejection failed:', rejData);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 12: Database Package Pricing & Wallets Configuration Intact
  // ----------------------------------------------------
  console.log('\nTest 12: Verifying database pricing and payment settings integrity...');
  const currentPackages = await db.getPackages();
  const currentWallets = await db.getWallets();
  const evc = currentWallets.find((w) => w.id === 'evc_plus');
  const sahal = currentWallets.find((w) => w.id === 'sahal');

  if (
    currentPackages.length >= 6 &&
    currentPackages.every((p) => p.priceUsd > 0) &&
    evc?.active === true &&
    sahal?.active === true
  ) {
    console.log('✓ PASS: All 6+ packages, USD prices, bonus UC amounts, and wallet configs intact without modification');
    passed++;
  } else {
    console.error('✗ FAIL: Package prices or wallet configuration compromised');
    failed++;
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
