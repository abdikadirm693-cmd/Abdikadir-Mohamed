import dotenv from 'dotenv';
dotenv.config();

import { db, User, Order, PubgPackage, getPackageRewardAndCost } from './db.js';
import { createToken } from './auth.js';

const BASE_URL = 'http://localhost:3000';

async function runPhase4Tests() {
  console.log('======================================================================');
  console.log('   SOMPLAY Phase 4: UC, WOW Coin, PEP Rewards & Redemption Tests      ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Locate or create test users
  let adminUser = await db.findUserByEmail('admin_p4@somplay.so');
  if (!adminUser) {
    adminUser = await db.createUser({
      id: `admin_p4_${Date.now()}`,
      name: 'Admin Phase 4',
      email: 'admin_p4@somplay.so',
      phone: '252615999444',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'admin',
      isActive: true,
      pepPoints: 0,
      createdAt: new Date().toISOString(),
    });
  } else {
    adminUser = (await db.updateUser(adminUser.id, { isActive: true, role: 'admin' })) || adminUser;
  }

  let employeeUser = await db.findUserByEmail('staff_p4@somplay.so');
  if (!employeeUser) {
    employeeUser = await db.createUser({
      id: `emp_p4_${Date.now()}`,
      name: 'Staff Phase 4',
      email: 'staff_p4@somplay.so',
      phone: '252615000444',
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

  let customerUser = await db.findUserByEmail('cust_p4@somplay.so');
  if (!customerUser) {
    customerUser = await db.createUser({
      id: `cust_p4_${Date.now()}`,
      name: 'Customer Phase 4',
      email: 'cust_p4@somplay.so',
      phone: '252615555444',
      passwordHash: 'dummy',
      salt: 'dummy',
      role: 'customer',
      isActive: true,
      pepPoints: 200,
      createdAt: new Date().toISOString(),
    });
  } else {
    customerUser = (await db.updateUser(customerUser.id, { isActive: true, role: 'customer', pepPoints: 200 })) || customerUser;
  }

  const adminToken = createToken(adminUser.id);
  const employeeToken = createToken(employeeUser.id);
  const customerToken = createToken(customerUser.id);

  // ----------------------------------------------------
  // TEST 1: UC and WOW Coin Packages Schedule & Costs
  // ----------------------------------------------------
  console.log('Test 1: Validating UC and WOW Coin packages schedule and costs...');
  try {
    const res = await fetch(`${BASE_URL}/api/packages`);
    const data = await res.json();
    const packages: PubgPackage[] = data.packages || [];

    const ucPkgs = packages.filter((p) => p.currencyType === 'uc' || (!p.currencyType && !p.id.includes('wow')));
    const wowPkgs = packages.filter((p) => p.currencyType === 'wow_coin' || p.id.includes('wow'));

    const expectedTiers = [
      { units: 60, cost: 0.89, price: 1.50, profit: 0.61, pep: 6, redeem: 150 },
      { units: 325, cost: 4.49, price: 5.50, profit: 1.01, pep: 10, redeem: 550 },
      { units: 660, cost: 8.99, price: 10.50, profit: 1.51, pep: 15, redeem: 1050 },
      { units: 1800, cost: 22.49, price: 25.00, profit: 2.51, pep: 25, redeem: 2500 },
      { units: 3850, cost: 44.99, price: 49.00, profit: 4.01, pep: 40, redeem: 4900 },
      { units: 8100, cost: 89.99, price: 97.00, profit: 7.01, pep: 70, redeem: 9700 },
    ];

    let allMatch = true;
    for (const exp of expectedTiers) {
      const matchUc = ucPkgs.find((p) => (p.ucAmount + p.bonusUc) === exp.units);
      const matchWow = wowPkgs.find((p) => (p.ucAmount + p.bonusUc) === exp.units);

      if (!matchUc || !matchWow) {
        console.error(`Missing tier for ${exp.units} units:`, { matchUc: !!matchUc, matchWow: !!matchWow });
        allMatch = false;
        break;
      }

      if (matchUc.priceUsd !== exp.price || matchWow.priceUsd !== exp.price) {
        console.error(`Price mismatch for ${exp.units}:`, { ucPrice: matchUc.priceUsd, wowPrice: matchWow.priceUsd, exp: exp.price });
        allMatch = false;
        break;
      }

      const ucCalc = getPackageRewardAndCost(matchUc);
      if (
        ucCalc.supplierCostUsd !== exp.cost ||
        ucCalc.grossProfitUsd !== exp.profit ||
        ucCalc.pepReward !== exp.pep ||
        ucCalc.redemptionPep !== exp.redeem
      ) {
        console.error(`Cost/Profit/PEP calculation mismatch for ${exp.units}:`, { ucCalc, exp });
        allMatch = false;
        break;
      }
    }

    if (allMatch && ucPkgs.length >= 6 && wowPkgs.length >= 6) {
      console.log(`✓ PASS: All 6 UC and 6 WOW Coin packages verified with exact supplier costs and selling prices`);
      passed++;
    } else {
      console.error('✗ FAIL: Package tier validation failed');
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 2: Authoritative PEP Reward Calculation (10% Profit)
  // ----------------------------------------------------
  console.log('\nTest 2: Authoritative PEP reward rules (10% gross profit converted to PEP)...');
  try {
    const rewardsCheck = [
      { units: 60, price: 1.50, cost: 0.89, expPep: 6 },
      { units: 325, price: 5.50, cost: 4.49, expPep: 10 },
      { units: 660, price: 10.50, cost: 8.99, expPep: 15 },
      { units: 1800, price: 25.00, cost: 22.49, expPep: 25 },
      { units: 3850, price: 49.00, cost: 44.99, expPep: 40 },
      { units: 8100, price: 97.00, cost: 89.99, expPep: 70 },
    ];

    let rewardsOk = true;
    for (const r of rewardsCheck) {
      const calc = getPackageRewardAndCost({ ucAmount: r.units, priceUsd: r.price });
      if (calc.pepReward !== r.expPep) {
        console.error(`Reward mismatch: Units: ${r.units}, Expected: ${r.expPep}, Got: ${calc.pepReward}`);
        rewardsOk = false;
      }
    }

    if (rewardsOk) {
      console.log('✓ PASS: All expected PEP rewards match specification: 6, 10, 15, 25, 40, 70 PEP');
      passed++;
    } else {
      console.error('✗ FAIL: PEP reward calculations incorrect');
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 3: Strict PEP Balance Cap at 1,500 PEP
  // ----------------------------------------------------
  console.log('\nTest 3: Customer PEP balance cap (must never exceed 1,500 PEP)...');
  try {
    // Set customer balance to 1,480
    await db.updateUser(customerUser.id, { pepPoints: 1480 });
    // Attempt to award 50 points (would be 1,530)
    const newBal1 = await db.awardPepPoints(customerUser.id, 50);
    // Attempt to award another 500 points
    const newBal2 = await db.awardPepPoints(customerUser.id, 500);

    const checkedCust = await db.findUserById(customerUser.id);

    if (newBal1 === 1500 && newBal2 === 1500 && checkedCust?.pepPoints === 1500) {
      console.log(`✓ PASS: PEP balance strictly capped at 1,500 PEP (Tested +50 and +500, capped at ${checkedCust.pepPoints})`);
      passed++;
    } else {
      console.error(`✗ FAIL: Balance cap exceeded: newBal1=${newBal1}, newBal2=${newBal2}, inDb=${checkedCust?.pepPoints}`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 4: Role Restrictions: Employees & Admins cannot earn or redeem PEP
  // ----------------------------------------------------
  console.log('\nTest 4: Employee and Admin accounts blocked from earning or redeeming PEP...');
  try {
    const empAward = await db.awardPepPoints(employeeUser.id, 50);
    const adminAward = await db.awardPepPoints(adminUser.id, 50);

    const empRedeemRes = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        packageId: 'pkg_60uc',
        pubgId: '512345678',
      }),
    });

    const adminRedeemRes = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        packageId: 'pkg_60uc',
        pubgId: '512345678',
      }),
    });

    if (
      empAward === 0 &&
      adminAward === 0 &&
      empRedeemRes.status === 403 &&
      adminRedeemRes.status === 403
    ) {
      console.log('✓ PASS: Non-customer accounts strictly prohibited from earning and redeeming PEP points');
      passed++;
    } else {
      console.error('✗ FAIL: Role restriction breached:', {
        empAward,
        adminAward,
        empRedeemStatus: empRedeemRes.status,
        adminRedeemStatus: adminRedeemRes.status,
      });
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 5: Cash Order PEP Award on Confirmed Fulfillment Only
  // ----------------------------------------------------
  console.log('\nTest 5: Cash order earns points only after confirmed successful fulfillment...');
  try {
    // Reset customer points to 200
    await db.updateUser(customerUser.id, { pepPoints: 200 });

    const phone = '252615' + Math.floor(100000 + Math.random() * 900000);
    const pubgId = '599' + Math.floor(100000 + Math.random() * 900000);

    // Place cash order for 60 UC ($1.50 -> expected reward: 6 PEP)
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: 'pkg_60uc',
        pubgId,
        walletId: 'evc_plus',
        senderPhone: phone,
      }),
    });

    const orderData = await orderRes.json();
    const cashOrder: Order = orderData.order;

    // Check customer balance right now (status is pending)
    const midCust = await db.findUserById(customerUser.id);
    if (midCust?.pepPoints !== 200) {
      console.error(`✗ FAIL: Points awarded before fulfillment! Current: ${midCust?.pepPoints}`);
      failed++;
    } else {
      // Now employee fulfills order
      const fulfillRes = await fetch(`${BASE_URL}/api/employee/orders/${cashOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
        body: JSON.stringify({
          status: 'completed',
          adminNote: 'Sent 60 UC to PUBG ID',
        }),
      });

      const afterCust = await db.findUserById(customerUser.id);
      const pointsGained = (afterCust?.pepPoints || 0) - 200;

      if (fulfillRes.status === 200 && pointsGained === 6) {
        console.log(`✓ PASS: Cash order gained exactly +6 PEP upon fulfillment (New Balance: ${afterCust?.pepPoints})`);
        passed++;
      } else {
        console.error(`✗ FAIL: Expected +6 PEP, received: +${pointsGained}`);
        failed++;
      }
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 6: Customer PEP Redemption Flow
  // ----------------------------------------------------
  console.log('\nTest 6: Customer PEP redemption (atomic deduction, distinct order created)...');
  let redemptionOrder: Order | null = null;
  try {
    // Set customer balance to 400 PEP
    await db.updateUser(customerUser.id, { pepPoints: 400 });

    const redeemPubgId = '512999888';
    const res = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: 'pkg_60wow', // 60 WOW Coin -> requires 150 PEP
        pubgId: redeemPubgId,
        pubgNickname: 'SomaliPro',
      }),
    });

    const data = await res.json();
    redemptionOrder = data.order;
    const updatedCust = await db.findUserById(customerUser.id);

    if (
      res.status === 201 &&
      data.newBalance === 250 &&
      updatedCust?.pepPoints === 250 &&
      redemptionOrder?.isPepRedemption === true &&
      redemptionOrder?.walletId === 'pep_rewards' &&
      redemptionOrder?.status === 'pending' &&
      redemptionOrder?.pepSpent === 150
    ) {
      console.log(`✓ PASS: Atomically deducted 150 PEP (New balance: ${data.newBalance} PEP)`);
      console.log(`✓ PASS: Distinct PEP redemption order created: ${redemptionOrder.id} (${redemptionOrder.packageName})`);
      passed++;
    } else {
      console.error('✗ FAIL: PEP redemption failed:', { status: res.status, data, balance: updatedCust?.pepPoints });
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 7: No Infinite Reward Loop on PEP Redemption
  // ----------------------------------------------------
  console.log('\nTest 7: No infinite reward loop (redeemed orders do not earn PEP points)...');
  try {
    if (!redemptionOrder) {
      throw new Error('No redemption order from previous test');
    }

    const beforeCust = await db.findUserById(customerUser.id);
    const beforeBal = beforeCust?.pepPoints || 0;

    // Staff fulfills the PEP redemption order
    const fulfillRes = await fetch(`${BASE_URL}/api/employee/orders/${redemptionOrder.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'completed',
        adminNote: 'Manually transferred 60 WOW Coin via player UID',
      }),
    });

    const afterCust = await db.findUserById(customerUser.id);
    const afterBal = afterCust?.pepPoints || 0;

    if (fulfillRes.status === 200 && afterBal === beforeBal) {
      console.log(`✓ PASS: PEP redemption order completed without awarding extra PEP points (Balance remained ${afterBal})`);
      passed++;
    } else {
      console.error(`✗ FAIL: Infinite loop detected! Balance changed from ${beforeBal} to ${afterBal}`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 8: PEP Points Refund upon Rejected/Failed Redemption
  // ----------------------------------------------------
  console.log('\nTest 8: Automatic PEP points refund upon failed / rejected redemption...');
  try {
    // Current customer balance is 250 PEP
    // Customer redeems another 60 UC package (150 PEP) -> balance becomes 100 PEP
    const redeemRes = await fetch(`${BASE_URL}/api/pep/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        packageId: 'pkg_60uc',
        pubgId: '599111222',
      }),
    });

    const redeemData = await redeemRes.json();
    const orderToReject: Order = redeemData.order;

    const midCust = await db.findUserById(customerUser.id);
    if (midCust?.pepPoints !== 100) {
      throw new Error(`Customer balance expected to be 100, got ${midCust?.pepPoints}`);
    }

    // Staff rejects the redemption order
    const rejectRes = await fetch(`${BASE_URL}/api/employee/orders/${orderToReject.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        status: 'failed',
        rejectionReason: 'Invalid PUBG Character UID - player does not exist',
      }),
    });

    const refundedCust = await db.findUserById(customerUser.id);

    if (rejectRes.status === 200 && refundedCust?.pepPoints === 250) {
      console.log(`✓ PASS: 150 PEP refunded safely to customer upon rejection (Balance restored to ${refundedCust.pepPoints} PEP)`);
      passed++;
    } else {
      console.error('✗ FAIL: PEP refund failed:', { status: rejectRes.status, balance: refundedCust?.pepPoints });
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // TEST 9: Fulfilled Customer Records Endpoint
  // ----------------------------------------------------
  console.log('\nTest 9: Admin Fulfilled Customers records aggregation endpoint...');
  try {
    const custRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const custData = await custRes.json();

    if (custRes.status === 200 && Array.isArray(custData.customers)) {
      console.log(`✓ PASS: Retrieved ${custData.customers.length} fulfilled customer records`);
      if (custData.customers.length > 0) {
        const sample = custData.customers[0];
        console.log(`       Sample Customer: ${sample.name} (${sample.email}), Total Orders: ${sample.totalOrders}, Spent: $${sample.totalSpentUsd}`);
      }
      passed++;
    } else {
      console.error('✗ FAIL: Customer records endpoint returned error:', custData);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ FAIL with error:', err.message);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`   PHASE 4 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests();
