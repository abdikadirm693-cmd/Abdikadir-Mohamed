import dotenv from 'dotenv';
dotenv.config();

import { db, User, Order, PubgPackage, getPackageRewardAndCost } from './db.js';
import { createToken } from './auth.js';

const BASE_URL = 'http://localhost:3000';

async function runPhase41Tests() {
  console.log('======================================================================');
  console.log('   SOMPLAY Phase 4.1: Secure PEP & Fulfilled Customers Test Suite     ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // --- Setup Test Accounts ---
  console.log('--- Setting up test accounts ---');
  let admin = await db.findUserByEmail('admin_test_p41@somplay.so');
  if (!admin) {
    admin = await db.createUser({
      id: `admin_p41_${Date.now()}`,
      name: 'Admin P41',
      email: 'admin_test_p41@somplay.so',
      phone: '252615999001',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'admin',
      isActive: true,
      pepPoints: 0,
      createdAt: new Date().toISOString(),
    });
  } else {
    admin = (await db.updateUser(admin.id, { role: 'admin', isActive: true })) || admin;
  }

  let employee = await db.findUserByEmail('employee_test_p41@somplay.so');
  if (!employee) {
    employee = await db.createUser({
      id: `emp_p41_${Date.now()}`,
      name: 'Employee P41',
      email: 'employee_test_p41@somplay.so',
      phone: '252615999002',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'employee',
      isActive: true,
      pepPoints: 0,
      createdAt: new Date().toISOString(),
    });
  } else {
    employee = (await db.updateUser(employee.id, { role: 'employee', isActive: true })) || employee;
  }

  let customer = await db.findUserByEmail('cust_test_p41@somplay.so');
  if (!customer) {
    customer = await db.createUser({
      id: `cust_p41_${Date.now()}`,
      name: 'Customer P41',
      email: 'cust_test_p41@somplay.so',
      phone: '252615999003',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'customer',
      isActive: true,
      pepPoints: 150,
      savedPubgId: '5123456789',
      savedPubgNickname: 'SomaliSniper',
      createdAt: new Date().toISOString(),
    });
  } else {
    customer = (await db.updateUser(customer.id, {
      role: 'customer',
      isActive: true,
      pepPoints: 150,
      savedPubgId: '5123456789',
      savedPubgNickname: 'SomaliSniper',
    })) || customer;
  }

  const adminToken = createToken(admin.id);
  const employeeToken = createToken(employee.id);
  const customerToken = createToken(customer.id);

  const packages = await db.getPackages();
  const pkg60 = packages.find((p) => p.ucAmount === 60) || packages[0];

  // ----------------------------------------------------
  // TEST 1: Database-Level Constraint & PEP Balance Limits (0 to 1,500)
  // ----------------------------------------------------
  console.log('\nTest 1: Validating PEP balance boundaries (0 - 1500) & database integrity...');
  try {
    const allUsers = await db.getUsers();
    const invalidUsers = allUsers.filter((u) => (u.pepPoints ?? 0) < 0 || (u.pepPoints ?? 0) > 1500);
    assert(invalidUsers.length === 0, 'All existing users adhere to 0 <= pepPoints <= 1500', `Violations: ${invalidUsers.length}`);

    // Test award cap at 1500
    await db.updateUser(customer.id, { pepPoints: 1490 });
    const cappedTotal = await db.awardPepPoints(customer.id, 50);
    const updatedCust = await db.findUserById(customer.id);
    assert(cappedTotal === 1500 && updatedCust?.pepPoints === 1500, 'awardPepPoints caps balance strictly at 1,500');

    // Reset customer back to 150
    await db.updateUser(customer.id, { pepPoints: 150 });
  } catch (err: any) {
    assert(false, 'PEP balance limit check', err.message);
  }

  // ----------------------------------------------------
  // TEST 2: Role Restrictions on PEP Earning and Redemption
  // ----------------------------------------------------
  console.log('\nTest 2: Verifying role restrictions (Only customers can redeem or earn PEP)...');
  try {
    // Employee attempt to redeem PEP
    const empRes = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        packageId: pkg60.id,
        pubgId: '5123456789',
      }),
    });
    assert(empRes.status === 403, 'Employee is blocked from redeeming PEP (HTTP 403)');

    // Admin attempt to redeem PEP
    const admRes = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        packageId: pkg60.id,
        pubgId: '5123456789',
      }),
    });
    assert(admRes.status === 403, 'Admin is blocked from redeeming PEP (HTTP 403)');

    // Direct db point deduction block
    const empDeduct = await db.deductPepPoints(employee.id, 50);
    assert(!empDeduct.success, 'db.deductPepPoints rejects non-customer roles');
  } catch (err: any) {
    assert(false, 'Role restriction tests', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: Insufficient PEP Balance Validation
  // ----------------------------------------------------
  console.log('\nTest 3: Insufficient PEP balance handling...');
  try {
    await db.updateUser(customer.id, { pepPoints: 50 }); // Less than 150 required for 60 UC
    const res = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: pkg60.id,
        pubgId: '5123456789',
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes('Insufficient'), 'Customer with insufficient balance is rejected with clear error');
  } catch (err: any) {
    assert(false, 'Insufficient balance test', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: Concurrency & Race Condition Prevention
  // ----------------------------------------------------
  console.log('\nTest 4: Concurrent redemption race condition prevention...');
  try {
    // Set customer balance to exactly 150 PEP (enough for exactly ONE 60 UC package redemption)
    await db.updateUser(customer.id, { pepPoints: 150 });

    // Send 5 concurrent redemption requests simultaneously
    const attempts = await Promise.all(
      Array.from({ length: 5 }).map((_, i) =>
        fetch(`${BASE_URL}/api/pep/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
          body: JSON.stringify({
            packageId: pkg60.id,
            pubgId: '5123456789',
            idempotencyKey: `concurrent_test_${Date.now()}_${i}`,
          }),
        }).then(async (r) => ({ status: r.status, data: await r.json() }))
      )
    );

    const successfulAttempts = attempts.filter((a) => a.status === 201);
    const rejectedAttempts = attempts.filter((a) => a.status === 400);

    const finalCust = await db.findUserById(customer.id);
    assert(
      successfulAttempts.length === 1 && rejectedAttempts.length === 4,
      'Exactly 1 concurrent request succeeds and 4 fail when balance only covers one redemption',
      `Success: ${successfulAttempts.length}, Rejected: ${rejectedAttempts.length}`
    );
    assert(finalCust?.pepPoints === 0, 'Final customer PEP balance is exactly 0 and never goes negative', `Balance: ${finalCust?.pepPoints}`);
  } catch (err: any) {
    assert(false, 'Concurrency race condition test', err.message);
  }

  // ----------------------------------------------------
  // TEST 5: Idempotency Protection for Redemption Retries
  // ----------------------------------------------------
  console.log('\nTest 5: Safe idempotency protection on network retries...');
  try {
    // Give customer 300 PEP
    await db.updateUser(customer.id, { pepPoints: 300 });
    const idempotencyKey = `idem_key_${Date.now()}`;

    // First request
    const res1 = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: pkg60.id,
        pubgId: '5123456789',
        idempotencyKey,
      }),
    });
    const data1 = await res1.json();
    assert(res1.status === 201 && data1.success, 'First request creates order and deducts 150 points');

    const balAfter1 = (await db.findUserById(customer.id))?.pepPoints;
    assert(balAfter1 === 150, 'Balance is 150 after first request');

    // Immediate retry with the EXACT same idempotency key
    const res2 = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: pkg60.id,
        pubgId: '5123456789',
        idempotencyKey,
      }),
    });
    const data2 = await res2.json();
    assert(res2.status === 200 && data2.success, 'Idempotent retry returns HTTP 200 with existing order');
    assert(data2.order.id === data1.order.id, 'Idempotent retry returns identical order ID');

    const balAfter2 = (await db.findUserById(customer.id))?.pepPoints;
    assert(balAfter2 === 150, 'Balance was NOT deducted twice on retry (strictly 150 PEP remains)');
  } catch (err: any) {
    assert(false, 'Idempotency test', err.message);
  }

  // ----------------------------------------------------
  // TEST 6: Points Restoration on Rejection/Cancellation
  // ----------------------------------------------------
  console.log('\nTest 6: Points restoration on rejected PEP order...');
  try {
    // Customer has 150 points now. Redeem 150 points to create pending order.
    const res = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: pkg60.id,
        pubgId: '5123456789',
      }),
    });
    const redeemData = await res.json();
    const orderId = redeemData.order.id;

    const balAfterRedeem = (await db.findUserById(customer.id))?.pepPoints;
    assert(balAfterRedeem === 0, 'Balance is 0 after redemption');

    // Staff rejects the order with reason
    const rejectRes = await fetch(`${BASE_URL}/api/employee/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'failed',
        rejectionReason: 'Invalid PUBG UID provided by customer',
      }),
    });
    assert(rejectRes.status === 200, 'Employee marks PEP order as failed/rejected');

    const balAfterReject = (await db.findUserById(customer.id))?.pepPoints;
    assert(balAfterReject === 150, 'Deducted 150 points are safely refunded on rejection', `Balance: ${balAfterReject}`);

    // Attempting to reject again must not duplicate refund
    await fetch(`${BASE_URL}/api/employee/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'failed',
        rejectionReason: 'Duplicate rejection test',
      }),
    });
    const balAfterSecondReject = (await db.findUserById(customer.id))?.pepPoints;
    assert(balAfterSecondReject === 150, 'Second rejection does NOT double-refund points');
  } catch (err: any) {
    assert(false, 'Point restoration test', err.message);
  }

  // ----------------------------------------------------
  // TEST 7: Completed PEP Order Does NOT Earn PEP Points
  // ----------------------------------------------------
  console.log('\nTest 7: No PEP points earned on PEP-funded orders (prevent reward loop)...');
  try {
    // Redeem an order
    const redeemRes = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: pkg60.id,
        pubgId: '5123456789',
      }),
    });
    const orderId = (await redeemRes.json()).order.id;
    const balBeforeComplete = (await db.findUserById(customer.id))?.pepPoints;

    // Staff fulfills and marks order completed
    const completeRes = await fetch(`${BASE_URL}/api/employee/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'completed',
        adminNote: 'Top-up sent successfully in Midasbuy/PUBG client',
      }),
    });
    assert(completeRes.status === 200, 'Employee completes PEP order');

    const balAfterComplete = (await db.findUserById(customer.id))?.pepPoints;
    assert(
      balAfterComplete === balBeforeComplete,
      'No PEP reward is awarded for PEP-funded orders',
      `Before: ${balBeforeComplete}, After: ${balAfterComplete}`
    );
  } catch (err: any) {
    assert(false, 'No reward loop test', err.message);
  }

  // ----------------------------------------------------
  // TEST 8: Fulfilled Customers in Admin Dashboard
  // ----------------------------------------------------
  console.log('\nTest 8: Admin Customers endpoint & aggregation (/api/admin/customers)...');
  try {
    // Unauthenticated access check
    const unauthRes = await fetch(`${BASE_URL}/api/admin/customers`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /api/admin/customers returns 401');

    // Employee access check (Admin only)
    const empCustRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empCustRes.status === 403, 'Employee access to /api/admin/customers is rejected with 403');

    // Admin access check
    const adminCustRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCustRes.status === 200, 'Admin can access /api/admin/customers (200 OK)');
    const adminCustData = await adminCustRes.json();
    const adminCustomers = adminCustData.customers || [];

    // Verify all customers in list have at least 1 completed order
    assert(Array.isArray(adminCustomers), 'Customers is an array');
    const allHaveCompleted = adminCustomers.every((c: any) => c.totalOrders > 0);
    assert(allHaveCompleted, 'Every customer in fulfilled list has totalOrders >= 1');

    // Verify presence of totalSpentUsd on admin side
    const hasFinancialFields = adminCustomers.length > 0 ? typeof adminCustomers[0].totalSpentUsd === 'number' : true;
    assert(hasFinancialFields, 'Admin customers endpoint includes totalSpentUsd');
  } catch (err: any) {
    assert(false, 'Admin customers test', err.message);
  }

  // ----------------------------------------------------
  // TEST 9: Fulfilled Customers in Employee Dashboard (Privacy & Support View)
  // ----------------------------------------------------
  console.log('\nTest 9: Employee Customers endpoint (/api/employee/customers) & privacy...');
  try {
    // Customer access check (must be blocked)
    const custDenyRes = await fetch(`${BASE_URL}/api/employee/customers`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custDenyRes.status === 403, 'Customer cannot access /api/employee/customers (403 Forbidden)');

    // Employee access check
    const empCustRes = await fetch(`${BASE_URL}/api/employee/customers`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empCustRes.status === 200, 'Employee can access /api/employee/customers (200 OK)');

    const empCustData = await empCustRes.json();
    const empCustomers = empCustData.customers || [];
    assert(Array.isArray(empCustomers), 'Employee customers response contains customers array');

    // STRICT PRIVACY CHECK: Verify totalSpentUsd is NOT exposed to employees
    const leaksFinancials = empCustomers.some((c: any) => 'totalSpentUsd' in c || 'totalRevenue' in c);
    assert(!leaksFinancials, 'Employee endpoint STRICTLY EXCLUDES totalSpentUsd and financial metrics');

    // Verify support fields are present
    if (empCustomers.length > 0) {
      const sample = empCustomers[0];
      const hasSupportFields =
        typeof sample.name === 'string' &&
        typeof sample.email === 'string' &&
        typeof sample.savedPubgId === 'string' &&
        typeof sample.totalOrders === 'number' &&
        typeof sample.firstOrderAt === 'string';
      assert(hasSupportFields, 'Employee endpoint provides necessary customer support fields (PUBG UID, email, orders)');
    }
  } catch (err: any) {
    assert(false, 'Employee customers test', err.message);
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n======================================================================');
  console.log(`   Phase 4.1 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase41Tests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
