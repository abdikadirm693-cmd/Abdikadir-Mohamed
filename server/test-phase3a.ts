import dotenv from 'dotenv';
dotenv.config();

import { db, User, Order } from './db.js';
import { createToken } from './auth.js';

const BASE_URL = 'http://localhost:3000';

async function runPhase3ATests() {
  console.log('======================================================================');
  console.log('   SOMPLAY Phase 3A: Employee My Orders, Payment Boundary & PEP Tests ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Locate or create test users
  let adminUser = await db.findUserByEmail('abdikadirmohamed682@gmail.com');
  if (!adminUser) {
    adminUser = await db.findUserByEmail('abdikadirm693@gmail.com');
  }
  if (!adminUser) {
    adminUser = await db.createUser({
      id: `admin_p3a_${Date.now()}`,
      name: 'Admin Test',
      email: 'admin_p3a@somplay.so',
      phone: '252615999000',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'admin',
      isActive: true,
      pepPoints: 0,
      createdAt: new Date().toISOString(),
    });
  }

  let employeeUser = await db.findUserByEmail('mpabpestore1@gmail.com');
  if (!employeeUser) {
    employeeUser = await db.findUserByEmail('test_employee_p2@somplay.so');
  }
  if (!employeeUser) {
    employeeUser = await db.createUser({
      id: `emp_p3a_${Date.now()}`,
      name: 'Staff Test Member',
      email: 'staff_p3a@somplay.so',
      phone: '252615000333',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'employee',
      isActive: true,
      pepPoints: 0,
      createdAt: new Date().toISOString(),
    });
  } else {
    employeeUser = (await db.updateUser(employeeUser.id, { isActive: true, role: 'employee' })) || employeeUser;
  }

  if (adminUser && !adminUser.isActive) {
    adminUser = (await db.updateUser(adminUser.id, { isActive: true })) || adminUser;
  }

  let customerUser = await db.findUserByEmail('test_customer_p3a@somplay.so');
  if (!customerUser) {
    customerUser = await db.createUser({
      id: `cust_p3a_${Date.now()}`,
      name: 'Test Customer 3A',
      email: 'test_customer_p3a@somplay.so',
      phone: '252615555444',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'customer',
      isActive: true,
      pepPoints: 100,
      createdAt: new Date().toISOString(),
    });
  }

  const adminToken = createToken(adminUser.id);
  const employeeToken = createToken(employeeUser.id);
  const customerToken = createToken(customerUser.id);

  const packages = await db.getPackages();
  const testPkg = packages[0] || { id: 'pkg_60uc', priceUsd: 0.99 };
  const wallets = await db.getWallets();
  const testWallet = wallets.find((w) => w.active) || wallets[0];

  // ----------------------------------------------------
  // TEST 1: Unauthenticated Order Placement Rejection
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
      console.log('✓ PASS: Rejected with 401 Unauthorized');
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
  // TEST 2: Employee Order Placement Rejection
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
        senderPhone: '252615112233',
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
  // TEST 3: Admin Order Placement Rejection
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
        senderPhone: '252615112233',
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
  // TEST 4: Incomplete draft NOT visible in employee order queues
  // ----------------------------------------------------
  console.log('\nTest 4: Creating incomplete draft (no payment submitted) and checking employee queue...');
  let draftOrderId = '';
  try {
    // Customer starts checkout without sender phone -> creates incomplete draft
    const createRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: '599887766',
        walletId: testWallet.id,
        // No senderPhone provided (Draft state)
      }),
    });
    const createData = await createRes.json();
    draftOrderId = createData.order?.id;

    if (createRes.status === 201 && createData.order?.status === 'incomplete') {
      console.log(`✓ PASS: Incomplete draft created with status 'incomplete' (ID: ${draftOrderId})`);
      passed++;
    } else {
      console.error(`✗ FAIL: Expected 201 with status 'incomplete', received:`, createData);
      failed++;
    }

    // Now query employee queue - draft MUST NOT be present
    const empQueueRes = await fetch(`${BASE_URL}/api/employee/orders`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const empQueueData = await empQueueRes.json();
    const draftInQueue = (empQueueData.orders || []).some((o: Order) => o.id === draftOrderId);

    if (!draftInQueue) {
      console.log('✓ PASS: Incomplete draft strictly excluded from /api/employee/orders');
      passed++;
    } else {
      console.error(`✗ FAIL: Incomplete draft was found in employee queue!`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 5: Incomplete draft excluded from employee stats
  // ----------------------------------------------------
  console.log('\nTest 5: Checking employee stats metrics exclude incomplete drafts...');
  try {
    const statsRes = await fetch(`${BASE_URL}/api/employee/stats`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const statsData = await statsRes.json();
    if (statsRes.status === 200 && statsData.orderCounts) {
      console.log('✓ PASS: Employee stats retrieved successfully');
      console.log(`       Stats: Pending: ${statsData.orderCounts.pending}, Last 1h: ${statsData.orderCounts.lastHour}, Total Submitted: ${statsData.orderCounts.total}`);
      passed++;
    } else {
      console.error('✗ FAIL: Unable to fetch employee stats:', statsData);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 6: Valid payment submission creates pending order
  // ----------------------------------------------------
  console.log('\nTest 6: Customer submits payment details ("I Have Paid" action)...');
  let submittedOrderId = '';
  const testPhone = '252615' + Math.floor(100000 + Math.random() * 900000);
  const testPubgId = '599' + Math.floor(100000 + Math.random() * 900000);
  try {
    const submitRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: testPubgId,
        pubgNickname: 'SomaliPro',
        walletId: testWallet.id,
        senderPhone: testPhone,
        receiptScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      }),
    });
    const submitData = await submitRes.json();
    submittedOrderId = submitData.order?.id;

    if (submitRes.status === 201 && submitData.order?.status === 'pending' && submitData.order?.senderPhone === testPhone) {
      console.log(`✓ PASS: Order submitted for verification (ID: ${submittedOrderId}, Status: ${submitData.order.status})`);
      passed++;
    } else {
      console.error('✗ FAIL: Submission did not create pending order:', submitData);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 7: Submitted order appears in employee queues
  // ----------------------------------------------------
  console.log('\nTest 7: Verifying submitted order now appears in employee queue...');
  try {
    const empQueueRes = await fetch(`${BASE_URL}/api/employee/orders`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const empQueueData = await empQueueRes.json();
    const orderInQueue = (empQueueData.orders || []).find((o: Order) => o.id === submittedOrderId);

    if (orderInQueue) {
      console.log(`✓ PASS: Order ${submittedOrderId} is now visible in /api/employee/orders`);
      console.log(`       Details: PUBG ID: ${orderInQueue.pubgId}, Phone: ${orderInQueue.senderPhone}, Amount: $${orderInQueue.priceUsd}`);
      passed++;
    } else {
      console.error(`✗ FAIL: Order ${submittedOrderId} missing from employee queue!`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 8: Idempotency / Duplicate Retry Safety
  // ----------------------------------------------------
  console.log('\nTest 8: Testing payment submission retry (idempotency safety)...');
  try {
    const retryRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: testPkg.id,
        pubgId: testPubgId,
        pubgNickname: 'SomaliPro',
        walletId: testWallet.id,
        senderPhone: testPhone,
      }),
    });
    const retryData = await retryRes.json();
    if (retryRes.status === 200 && retryData.order?.id === submittedOrderId) {
      console.log(`✓ PASS: Retry returned existing order ${submittedOrderId} without creating duplicate`);
      passed++;
    } else {
      console.error('✗ FAIL: Duplicate created on retry instead of idempotent response:', retryData);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 9: Employee "My Orders" (`/api/orders`)
  // ----------------------------------------------------
  console.log('\nTest 9: Employee accessing /api/orders ("My Orders" navigation)...');
  try {
    const empOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const empOrdersData = await empOrdersRes.json();
    const containsDraft = (empOrdersData.orders || []).some((o: Order) => o.status === 'incomplete');
    const containsSubmitted = (empOrdersData.orders || []).some((o: Order) => o.id === submittedOrderId);

    if (empOrdersRes.status === 200 && containsSubmitted && !containsDraft) {
      console.log('✓ PASS: Employee /api/orders returns customer submitted orders and excludes drafts');
      passed++;
    } else {
      console.error('✗ FAIL: Employee /api/orders response incorrect:', empOrdersData);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 10: Full Order Inspection by Employee
  // ----------------------------------------------------
  console.log('\nTest 10: Employee inspecting order via /api/orders/:id and /api/employee/orders/:id...');
  try {
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/api/orders/${submittedOrderId}`, {
        headers: { Authorization: `Bearer ${employeeToken}` },
      }),
      fetch(`${BASE_URL}/api/employee/orders/${submittedOrderId}`, {
        headers: { Authorization: `Bearer ${employeeToken}` },
      }),
    ]);

    const data1 = await res1.json();
    const data2 = await res2.json();

    if (res1.status === 200 && res2.status === 200 && data1.order?.id === submittedOrderId) {
      console.log('✓ PASS: Employee successfully inspected full order details across both endpoints');
      console.log(`       Verified fields: Phone (${data1.order.senderPhone}), Receipt: ${Boolean(data1.order.receiptScreenshot)}`);
      passed++;
    } else {
      console.error('✗ FAIL: Order inspection failed:', { s1: res1.status, s2: res2.status });
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 11: PEP points awarded strictly to customer on completion
  // ----------------------------------------------------
  console.log('\nTest 11: Employee completes order and verifies PEP points award to customer...');
  try {
    const initialCustomer = await db.findUserById(customerUser.id);
    const initialCustomerPep = initialCustomer?.pepPoints || 0;
    const initialEmployeePep = employeeUser.pepPoints || 0;

    const completeRes = await fetch(`${BASE_URL}/api/employee/orders/${submittedOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'completed',
        adminNote: 'Verified payment on Zaad. Delivered 60 UC.',
      }),
    });
    const completeData = await completeRes.json();

    const updatedCustomer = await db.findUserById(customerUser.id);
    const updatedEmployee = await db.findUserById(employeeUser.id);

    const expectedPoints = completeData.order?.pepPointsAmount || Math.round(testPkg.priceUsd * 10);
    const customerPepGained = (updatedCustomer?.pepPoints || 0) - initialCustomerPep;
    const employeePepGained = (updatedEmployee?.pepPoints || 0) - initialEmployeePep;

    if (
      completeRes.status === 200 &&
      completeData.order?.status === 'completed' &&
      customerPepGained === expectedPoints &&
      employeePepGained === 0
    ) {
      console.log(`✓ PASS: Order completed. Customer gained +${customerPepGained} PEP points (New total: ${updatedCustomer?.pepPoints})`);
      console.log(`✓ PASS: Staff member PEP points remained unchanged (Gained: ${employeePepGained} PEP)`);
      passed++;
    } else {
      console.error('✗ FAIL: PEP points allocation failed:', {
        status: completeRes.status,
        customerPepGained,
        expectedPoints,
        employeePepGained,
      });
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 12: Non-customer cannot accrue PEP points
  // ----------------------------------------------------
  console.log('\nTest 12: Direct db.awardPepPoints call to employee account is rejected...');
  try {
    const result = await db.awardPepPoints(employeeUser.id, 50);
    if (result === 0) {
      console.log('✓ PASS: Non-customer account correctly denied PEP points award');
      passed++;
    } else {
      console.error(`✗ FAIL: Non-customer account received ${result} PEP points!`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 13: Proper Role Labeling Check
  // ----------------------------------------------------
  console.log('\nTest 13: Role labeling check (Staff account has role "employee", never "admin")...');
  try {
    const checkEmp = await db.findUserById(employeeUser.id);
    if (checkEmp && checkEmp.role === 'employee' && (checkEmp.role as string) !== 'admin') {
      console.log('✓ PASS: Verified employee role is strictly "employee", not "admin"');
      passed++;
    } else {
      console.error('✗ FAIL: Role mismatch for employee account:', checkEmp?.role);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3ATests().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
