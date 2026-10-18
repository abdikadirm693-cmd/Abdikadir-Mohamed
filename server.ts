import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, Order, PubgPackage, WalletConfig, getPackageRewardAndCost } from './server/db.js';
import { createToken, requireAuth, requireAdmin, requireEmployee, requireCustomer, AuthRequest } from './server/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Lightweight visitor tracking middleware
  app.use((req, _res, next) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    db.recordVisitor(ip);
    next();
  });

  // Allow larger payload for screenshot upload (receipt images)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Sanitize user for client response (never leak passwordHash / salt)
  function sanitizeUser(user: any) {
    if (!user) return null;
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }

  // ==================== SYSTEM STATUS / HEALTH ====================
  app.get('/api/system/status', async (_req, res) => {
    try {
      const dbStatus = await db.testSupabaseConnection();
      return res.json({
        status: 'ok',
        supabase: dbStatus,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==================== AUTH ROUTES ====================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const existing = await db.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const newUser = await db.createUser({
        id: `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: (phone || '').trim(),
        passwordHash,
        salt,
        role: 'customer', // All users register as customers; admin role is granted only via server-side CLI
        pepPoints: 50, // Welcome bonus PEP points
        profilePhotoUrl: '',
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      const token = createToken(newUser.id);
      return res.status(201).json({
        user: sanitizeUser(newUser),
        token,
      });
    } catch (err: any) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Failed to register account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await db.findUserByEmail(email.trim());
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.isActive === false) {
        return res.status(403).json({ error: 'This account has been deactivated. Please contact the administrator.' });
      }

      const inputHash = hashPassword(password, user.salt);
      if (inputHash !== user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = createToken(user.id);
      return res.json({
        user: sanitizeUser(user),
        token,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Failed to log in' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    return res.json({ user: sanitizeUser(req.user) });
  });

  app.patch('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, phone, savedPubgId, savedPubgNickname } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (phone !== undefined) updates.phone = phone.trim();
      if (savedPubgId !== undefined) updates.savedPubgId = savedPubgId.trim();
      if (savedPubgNickname !== undefined) updates.savedPubgNickname = savedPubgNickname.trim();

      // Prevent email, role, or isActive changes via standard profile update
      const updated = await db.updateUser(req.user!.id, updates);
      return res.json({ user: sanitizeUser(updated || { ...req.user, ...updates }) });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.post('/api/auth/change-password', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const inputHash = hashPassword(currentPassword, req.user!.salt);
      if (inputHash !== req.user!.passwordHash) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      const newPasswordHash = hashPassword(newPassword, newSalt);
      await db.updateUser(req.user!.id, { passwordHash: newPasswordHash, salt: newSalt });

      return res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      return res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.post('/api/auth/upload-photo', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { photoData, mimeType } = req.body;
      if (!photoData || typeof photoData !== 'string') {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const detectedMime = mimeType || (photoData.startsWith('data:') ? photoData.split(';')[0].replace('data:', '') : 'image/jpeg');
      if (!allowedMimes.includes(detectedMime)) {
        return res.status(400).json({ error: 'Invalid image format. Allowed: JPG, PNG, WEBP, GIF' });
      }

      const base64Str = photoData.includes(',') ? photoData.split(',')[1] : photoData;
      const buffer = Buffer.from(base64Str, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Profile photo size exceeds maximum 5MB limit' });
      }

      const ext = detectedMime.split('/')[1] === 'jpeg' ? 'jpg' : detectedMime.split('/')[1];
      const filePath = `users/${req.user!.id}/avatar_${Date.now()}.${ext}`;

      const client = db.getClient();
      let publicUrl = '';
      if (client) {
        const { error: uploadError } = await client.storage.from('profile-photos').upload(filePath, buffer, {
          contentType: detectedMime,
          upsert: true,
        });
        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError);
          throw new Error(`Failed to upload to Supabase storage: ${uploadError.message}`);
        }
        const { data: urlData } = client.storage.from('profile-photos').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      } else {
        publicUrl = `data:${detectedMime};base64,${base64Str}`;
      }

      const updated = await db.updateUser(req.user!.id, { profilePhotoUrl: publicUrl });
      return res.json({
        success: true,
        profilePhotoUrl: publicUrl,
        user: sanitizeUser(updated || { ...req.user, profilePhotoUrl: publicUrl }),
      });
    } catch (err: any) {
      console.error('Upload photo error:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload profile photo' });
    }
  });

  app.post('/api/auth/remove-photo', requireAuth, async (req: AuthRequest, res) => {
    try {
      const updated = await db.updateUser(req.user!.id, { profilePhotoUrl: '' });
      return res.json({
        success: true,
        profilePhotoUrl: '',
        user: sanitizeUser(updated || { ...req.user, profilePhotoUrl: '' }),
      });
    } catch (err) {
      console.error('Remove photo error:', err);
      return res.status(500).json({ error: 'Failed to remove profile photo' });
    }
  });

  // ==================== PACKAGES ====================
  app.get('/api/packages', async (_req, res) => {
    try {
      const packages = await db.getPackages();
      return res.json({ packages });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch packages' });
    }
  });

  // ==================== WALLETS CONFIG ====================
  app.get('/api/wallets', async (_req, res) => {
    try {
      const wallets = await db.getWallets();
      return res.json({ wallets });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch wallets' });
    }
  });

  // ==================== ADS ====================
  app.get('/api/ads', async (_req, res) => {
    try {
      const ads = await db.getAdvertisements();
      return res.json({ ads });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch advertisements' });
    }
  });

  // ==================== CUSTOMER & STAFF ORDERS ====================
  // If user is Staff (employee/admin), "My Orders" displays customer-submitted orders for verification (excluding drafts).
  // If user is Customer, returns their own orders.
  app.get('/api/orders', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role === 'employee' || req.user!.role === 'admin') {
        let orders = await db.getOrders();
        // Strictly filter out incomplete / abandoned drafts from employee queues
        orders = orders.filter((o) => o.status !== 'incomplete');
        // Newest orders first
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return res.json({ orders });
      }

      const orders = await db.getOrdersByUserId(req.user!.id);
      return res.json({ orders });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.get('/api/orders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const order = await db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check ownership or staff access (employee/admin)
      if (order.userId !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'employee') {
        return res.status(403).json({ error: 'Access denied to this order' });
      }

      return res.json({ order });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  // Create new order (initial status: incomplete)
  // STRICT REQUIREMENT: Only verified customer accounts may create orders!
  // Employees & Administrators are strictly forbidden from placing customer orders.
  app.post('/api/orders', requireCustomer, async (req: AuthRequest, res) => {
    try {
      const {
        packageId,
        pubgId,
        pubgNickname,
        walletId,
        savePubgId,
        senderPhone,
        receiptScreenshot,
      } = req.body;

      if (!packageId || !pubgId || !walletId) {
        return res.status(400).json({ error: 'Package, PUBG Player ID, and Wallet are required' });
      }

      const pkg = await db.getPackageById(packageId);
      if (!pkg || !pkg.active) {
        return res.status(400).json({ error: 'Selected package is not available' });
      }

      const calc = getPackageRewardAndCost(pkg);

      // Handle PEP Points Redemption order
      if (walletId === 'pep_rewards') {
        const requiredPep = calc.redemptionPep;
        const deduct = await db.deductPepPoints(req.user!.id, requiredPep);
        if (!deduct.success) {
          return res.status(400).json({ error: deduct.error || 'Insufficient PEP balance' });
        }

        if (savePubgId) {
          await db.updateUser(req.user!.id, {
            savedPubgId: pubgId.trim(),
            savedPubgNickname: (pubgNickname || '').trim(),
          });
        }

        const orderNumber = `SP-PEP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const newOrder: Order = {
          id: orderNumber,
          userId: req.user!.id,
          userEmail: req.user!.email,
          userName: req.user!.name,
          userPhone: req.user!.phone,
          packageId: pkg.id,
          packageName: pkg.name,
          currencyType: calc.currencyType,
          ucAmount: pkg.ucAmount,
          bonusUc: pkg.bonusUc,
          totalUc: pkg.ucAmount + pkg.bonusUc,
          priceUsd: 0,
          pubgId: pubgId.trim(),
          pubgNickname: (pubgNickname || '').trim(),
          walletId: 'pep_rewards',
          walletName: 'PEP Points Balance',
          merchantNumber: 'PEP-REDEEM',
          ussdCode: 'N/A (Redeemed with PEP)',
          status: 'pending',
          senderPhone: senderPhone?.trim() || req.user!.phone || 'PEP-ACCOUNT',
          receiptScreenshot: '',
          adminNote: `[PEP_REDEMPTION:${requiredPep}] Customer redeemed ${requiredPep} PEP points for ${pkg.name}. Awaiting staff manual fulfillment.`,
          pepAwarded: true, // Prevents infinite reward loop
          pepPointsAmount: 0,
          pepSpent: requiredPep,
          isPepRedemption: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.createOrder(newOrder);
        return res.status(201).json({ order: newOrder, newBalance: deduct.newBalance });
      }

      const wallet = await db.getWalletById(walletId);
      if (!wallet || !wallet.active) {
        return res.status(400).json({ error: 'Selected mobile wallet is not active' });
      }

      // If senderPhone is supplied at submission step, validate length >= 6
      const hasPhone = senderPhone && typeof senderPhone === 'string' && senderPhone.trim().length >= 6;
      const initialStatus = hasPhone ? 'pending' : 'incomplete';

      // Idempotency: Prevent duplicate submissions on retry within 2 minutes
      if (hasPhone) {
        const userOrders = await db.getOrdersByUserId(req.user!.id);
        const duplicate = userOrders.find((o) =>
          o.status === 'pending' &&
          o.packageId === pkg.id &&
          o.pubgId === pubgId.trim() &&
          o.senderPhone === senderPhone.trim() &&
          (Date.now() - new Date(o.createdAt).getTime()) < 2 * 60 * 1000
        );
        if (duplicate) {
          return res.status(200).json({ order: duplicate, message: 'Existing order returned' });
        }
      }

      // Format USSD string: e.g. *712*{merchant}*{amount}#
      const ussdCode = wallet.ussdTemplate
        .replace('{merchant}', wallet.merchantNumber || '')
        .replace('{amount}', pkg.priceUsd.toString());

      // Save PUBG ID to user profile if requested
      if (savePubgId) {
        await db.updateUser(req.user!.id, {
          savedPubgId: pubgId.trim(),
          savedPubgNickname: (pubgNickname || '').trim(),
        });
      }

      const orderNumber = `SP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const newOrder: Order = {
        id: orderNumber,
        userId: req.user!.id,
        userEmail: req.user!.email,
        userName: req.user!.name,
        userPhone: req.user!.phone,
        packageId: pkg.id,
        packageName: pkg.name,
        currencyType: calc.currencyType,
        ucAmount: pkg.ucAmount,
        bonusUc: pkg.bonusUc,
        totalUc: pkg.ucAmount + pkg.bonusUc,
        priceUsd: pkg.priceUsd,
        pubgId: pubgId.trim(),
        pubgNickname: (pubgNickname || '').trim(),
        walletId: wallet.id,
        walletName: wallet.name,
        merchantNumber: wallet.merchantNumber,
        ussdCode,
        status: initialStatus,
        senderPhone: hasPhone ? senderPhone.trim() : '',
        receiptScreenshot: hasPhone && receiptScreenshot ? receiptScreenshot : '',
        pepAwarded: false,
        pepPointsAmount: calc.pepReward, // Authoritative 10% gross profit PEP reward
        isPepRedemption: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.createOrder(newOrder);

      return res.status(201).json({ order: newOrder });
    } catch (err: any) {
      console.error('Create order error:', err);
      return res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // Dedicated PEP Redemption Endpoint
  app.post('/api/pep/redeem', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'customer') {
        return res.status(403).json({ error: 'Only customer accounts can redeem PEP points. Employees and admins cannot redeem PEP.' });
      }

      const { packageId, pubgId, pubgNickname } = req.body;
      const idempotencyKey = String(
        req.body.idempotencyKey || req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || ''
      ).trim();

      if (!packageId || !pubgId) {
        return res.status(400).json({ error: 'Package and PUBG Player ID are required' });
      }

      const cleanId = String(pubgId).trim();
      if (!/^\d{5,15}$/.test(cleanId)) {
        return res.status(400).json({ error: 'PUBG Player ID must be between 5 and 15 digits' });
      }

      // Safe Idempotency Check: Return existing order without deducting points again on retries
      if (idempotencyKey) {
        const existingOrder = await db.findOrderByUserIdAndIdempotencyKey(req.user!.id, idempotencyKey);
        if (existingOrder) {
          const user = await db.findUserById(req.user!.id);
          return res.status(200).json({
            success: true,
            order: existingOrder,
            newBalance: user?.pepPoints ?? 0,
            message: 'Existing redemption order returned (idempotent retry).',
          });
        }
      }

      const pkg = await db.getPackageById(packageId);
      if (!pkg || !pkg.active) {
        return res.status(404).json({ error: 'Selected package is not available' });
      }

      const calc = getPackageRewardAndCost(pkg);
      const requiredPep = calc.redemptionPep;

      // Atomically deduct PEP points from customer with per-user lock and optimistic verification
      const deduct = await db.deductPepPoints(req.user!.id, requiredPep);
      if (!deduct.success) {
        return res.status(400).json({ error: deduct.error || 'Insufficient PEP balance' });
      }

      const orderNumber = `SP-PEP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const adminNote = `[PEP_REDEMPTION:${requiredPep}]${idempotencyKey ? ` [IDEMPOTENCY:${idempotencyKey}]` : ''} Customer redeemed ${requiredPep} PEP points for ${pkg.name}. Awaiting manual staff fulfillment.`;

      const newOrder: Order = {
        id: orderNumber,
        userId: req.user!.id,
        userEmail: req.user!.email,
        userName: req.user!.name,
        userPhone: req.user!.phone,
        packageId: pkg.id,
        packageName: pkg.name,
        currencyType: calc.currencyType,
        ucAmount: pkg.ucAmount,
        bonusUc: pkg.bonusUc,
        totalUc: pkg.ucAmount + pkg.bonusUc,
        priceUsd: 0,
        pubgId: cleanId,
        pubgNickname: (pubgNickname || '').trim(),
        walletId: 'pep_rewards',
        walletName: 'PEP Points Balance',
        merchantNumber: 'PEP-REDEEM',
        ussdCode: 'N/A (Redeemed with PEP)',
        status: 'pending', // Pending staff manual fulfillment in PUBG
        senderPhone: req.user!.phone || 'PEP-ACCOUNT',
        receiptScreenshot: '',
        adminNote,
        pepAwarded: true, // Prevents infinite reward loop
        pepPointsAmount: 0,
        pepSpent: requiredPep,
        isPepRedemption: true,
        idempotencyKey: idempotencyKey || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await db.createOrder(newOrder);
      } catch (createErr: any) {
        // Rollback points deduction immediately so a failed order creation never leaves points deducted
        console.error('Failed to create redemption order, rolling back deducted points:', createErr);
        await db.refundPepPoints(req.user!.id, requiredPep);
        return res.status(500).json({
          error: 'Failed to create redemption order. Deducted points have been safely restored to your balance.',
        });
      }

      return res.status(201).json({
        success: true,
        order: newOrder,
        newBalance: deduct.newBalance,
        message: 'PEP redemption order submitted successfully. Staff will fulfill the top-up to your PUBG account.',
      });
    } catch (err: any) {
      console.error('PEP redemption error:', err);
      return res.status(500).json({ error: 'Failed to process PEP redemption' });
    }
  });

  // Submit payment after phone dialer: transitions order to "pending" (Pending Verification)
  // STRICT REQUIREMENT: Only the customer who owns the order may submit payment details!
  // CRITICAL REQUIREMENT: Customer submission must NEVER automatically confirm payment!
  app.post('/api/orders/:id/submit-payment', requireCustomer, async (req: AuthRequest, res) => {
    try {
      const order = await db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied: You can only submit payment for your own orders' });
      }

      const { senderPhone, receiptScreenshot } = req.body;
      if (!senderPhone || senderPhone.trim().length < 6) {
        return res.status(400).json({ error: 'Valid sender phone number is required' });
      }

      const updated = await db.updateOrder(order.id, {
        senderPhone: senderPhone.trim(),
        receiptScreenshot: receiptScreenshot || order.receiptScreenshot,
        status: 'pending', // Pending Staff/Admin Verification
      });

      return res.json({
        order: updated,
        message: 'Order submitted for verification. Staff will verify and complete your top-up within minutes.',
      });
    } catch (err: any) {
      console.error('Submit payment error:', err);
      return res.status(500).json({ error: 'Failed to submit payment verification' });
    }
  });

  // ==================== EMPLOYEE ORDER INBOX & WORKSTATION ====================
  // Professional Gmail-style order list for employees and admins
  // STRICT REQUIREMENT: Incomplete drafts are excluded from employee order queues!
  app.get('/api/employee/orders', requireEmployee, async (req: AuthRequest, res) => {
    try {
      const { status, search } = req.query;
      let orders = await db.getOrders();

      // Strictly filter out incomplete / abandoned drafts from employee queues
      orders = orders.filter((o) => o.status !== 'incomplete');

      // Newest orders first
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (status && status !== 'all') {
        orders = orders.filter((o) => o.status === status);
      }

      if (search && typeof search === 'string') {
        const query = search.toLowerCase().trim();
        orders = orders.filter(
          (o) =>
            o.id.toLowerCase().includes(query) ||
            o.pubgId.toLowerCase().includes(query) ||
            (o.pubgNickname && o.pubgNickname.toLowerCase().includes(query)) ||
            o.userEmail.toLowerCase().includes(query) ||
            o.userName.toLowerCase().includes(query) ||
            (o.senderPhone && o.senderPhone.toLowerCase().includes(query)) ||
            (o.packageName && o.packageName.toLowerCase().includes(query)) ||
            (o.walletName && o.walletName.toLowerCase().includes(query))
        );
      }

      return res.json({ orders });
    } catch (err) {
      console.error('Fetch employee orders error:', err);
      return res.status(500).json({ error: 'Failed to fetch employee order inbox' });
    }
  });


  // Detailed single order viewing for employee workstation
  app.get('/api/employee/orders/:id', requireEmployee, async (req: AuthRequest, res) => {
    try {
      const order = await db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.json({ order });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch order details' });
    }
  });

  // Employee action: Process order status (Confirm / Reject / Add Staff Note)
  app.patch('/api/employee/orders/:id', requireEmployee, async (req: AuthRequest, res) => {
    try {
      const order = await db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const { status, adminNote, rejectionReason } = req.body;
      if (!['pending', 'completed', 'failed', 'incomplete'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const updates: Partial<Order> = {
        status,
        adminNote: adminNote !== undefined ? adminNote : order.adminNote,
        rejectionReason: rejectionReason !== undefined ? rejectionReason : order.rejectionReason,
      };

      const isPepOrder = Boolean(
        order.isPepRedemption ||
        order.walletId === 'pep_rewards' ||
        (order.adminNote && order.adminNote.includes('[PEP_REDEMPTION:'))
      );

      // Handle PEP point award when status changes to 'completed'
      // Strictly customer only. Never award points for PEP-redeemed orders (prevents infinite reward loop)
      if (status === 'completed') {
        updates.verifiedAt = new Date().toISOString();
        if (!order.pepAwarded && !isPepOrder) {
          let points = order.pepPointsAmount;
          if (!points) {
            const pkg = await db.getPackageById(order.packageId);
            if (pkg) {
              points = getPackageRewardAndCost(pkg).pepReward;
            } else {
              points = 6;
            }
          }
          if (points > 0) {
            await db.awardPepPoints(order.userId, points);
          }
          updates.pepAwarded = true;
        }
      }

      // Handle PEP refund if a PEP redemption order fails or is rejected (strictly once)
      const alreadyRefunded = Boolean(order.pepRefunded || (order.adminNote && order.adminNote.includes('[PEP_REFUNDED')));
      if (status === 'failed' && isPepOrder && !alreadyRefunded) {
        let spent = order.pepSpent || 0;
        if (!spent && order.adminNote) {
          const match = order.adminNote.match(/\[PEP_REDEMPTION:(\d+)\]/);
          if (match) spent = parseInt(match[1], 10);
        }
        if (!spent) {
          const pkg = await db.getPackageById(order.packageId);
          if (pkg) spent = Math.round(pkg.priceUsd * 100);
        }
        if (spent > 0) {
          await db.refundPepPoints(order.userId, spent);
          updates.pepRefunded = true;
          updates.adminNote = `${updates.adminNote || order.adminNote || ''} [PEP_REFUNDED:${spent}]`.trim();
        }
      }

      const updated = await db.updateOrder(order.id, updates);
      return res.json({ order: updated });
    } catch (err: any) {
      console.error('Employee update order error:', err);
      return res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  // Employee workstation stats:
  // Order counts & visitor counts for: last hour, last day, last week, last month, pending
  // STRICTLY NO access to registered user accounts or total financial revenue!
  app.get('/api/employee/stats', requireEmployee, async (_req: AuthRequest, res) => {
    try {
      const orderCounts = await db.getOrderCountsByPeriod();
      const visitorCounts = db.getVisitorCounts();

      return res.json({
        orderCounts: {
          lastHour: orderCounts.lastHour,
          lastDay: orderCounts.lastDay,
          lastWeek: orderCounts.lastWeek,
          lastMonth: orderCounts.lastMonth,
          pending: orderCounts.pending,
          total: orderCounts.total,
        },
        visitorCounts,
      });
    } catch (err) {
      console.error('Fetch employee stats error:', err);
      return res.status(500).json({ error: 'Failed to fetch employee workstation stats' });
    }
  });

  // Fulfilled Customer Records for Employee Workstation (Support View)
  // STRICT SECURITY REQUIREMENT: No financial data (totalSpentUsd, aggregate revenue, profit) exposed to employees!
  app.get('/api/employee/customers', requireEmployee, async (_req: AuthRequest, res) => {
    try {
      const customers = await db.getFulfilledCustomers();
      // Map to employee-safe customer profile without totalSpentUsd or financial metrics
      const safeCustomers = customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        role: c.role,
        pepPoints: c.pepPoints,
        profilePhotoUrl: c.profilePhotoUrl || '',
        savedPubgId: c.savedPubgId || '',
        savedPubgNickname: c.savedPubgNickname || '',
        totalOrders: c.totalOrders,
        firstOrderAt: c.firstOrderAt,
        lastOrderAt: c.lastOrderAt,
        createdAt: c.createdAt,
      }));
      return res.json({ customers: safeCustomers });
    } catch (err: any) {
      console.error('Fetch employee customers error:', err);
      return res.status(500).json({ error: 'Failed to fetch fulfilled customers' });
    }
  });

  // ==================== ADMIN ENDPOINTS ====================
  // Strictly protected with server-side authorization check
  app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
    try {
      const orders = await db.getOrders();
      const users = await db.getUsers();

      // Only submitted customer orders count towards official submitted order stats
      const submittedOrders = orders.filter((o) => o.status !== 'incomplete');

      const totalOrders = submittedOrders.length;
      const pendingOrders = orders.filter((o) => o.status === 'pending').length;
      const completedOrders = orders.filter((o) => o.status === 'completed').length;
      const incompleteOrders = orders.filter((o) => o.status === 'incomplete').length;
      const failedOrders = orders.filter((o) => o.status === 'failed').length;

      const totalRevenue = orders
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => sum + o.priceUsd, 0);

      return res.json({
        stats: {
          totalOrders,
          pendingOrders,
          completedOrders,
          incompleteOrders,
          failedOrders,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalUsers: users.length,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    try {
      const { status, search } = req.query;
      let orders = await db.getOrders();

      if (status && status !== 'all') {
        orders = orders.filter((o) => o.status === status);
      } else {
        // Exclude incomplete drafts from default queue
        orders = orders.filter((o) => o.status !== 'incomplete');
      }


      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        orders = orders.filter(
          (o) =>
            o.id.toLowerCase().includes(query) ||
            o.pubgId.toLowerCase().includes(query) ||
            o.userEmail.toLowerCase().includes(query) ||
            o.userName.toLowerCase().includes(query) ||
            (o.senderPhone && o.senderPhone.toLowerCase().includes(query))
        );
      }

      return res.json({ orders });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch admin orders' });
    }
  });

  // Admin review action: Confirm or Reject payment
  // AWARD PEP ONLY ONCE when an eligible order is completed!
  app.patch('/api/admin/orders/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const order = await db.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const { status, adminNote, rejectionReason } = req.body;
      if (!['pending', 'completed', 'failed', 'incomplete'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const updates: Partial<Order> = {
        status,
        adminNote: adminNote !== undefined ? adminNote : order.adminNote,
        rejectionReason: rejectionReason !== undefined ? rejectionReason : order.rejectionReason,
      };

      const isPepOrder = Boolean(
        order.isPepRedemption ||
        order.walletId === 'pep_rewards' ||
        (order.adminNote && order.adminNote.includes('[PEP_REDEMPTION:'))
      );

      // Handle PEP point award when status changes to 'completed'
      // Strictly customer only. Never award points for PEP-redeemed orders (prevents infinite reward loop)
      if (status === 'completed') {
        updates.verifiedAt = new Date().toISOString();
        if (!order.pepAwarded && !isPepOrder) {
          let points = order.pepPointsAmount;
          if (!points) {
            const pkg = await db.getPackageById(order.packageId);
            if (pkg) {
              points = getPackageRewardAndCost(pkg).pepReward;
            } else {
              points = 6;
            }
          }
          if (points > 0) {
            await db.awardPepPoints(order.userId, points);
          }
          updates.pepAwarded = true;
        }
      }

      // Handle PEP refund if a PEP redemption order fails or is rejected (strictly once)
      const alreadyRefunded = Boolean(order.pepRefunded || (order.adminNote && order.adminNote.includes('[PEP_REFUNDED')));
      if (status === 'failed' && isPepOrder && !alreadyRefunded) {
        let spent = order.pepSpent || 0;
        if (!spent && order.adminNote) {
          const match = order.adminNote.match(/\[PEP_REDEMPTION:(\d+)\]/);
          if (match) spent = parseInt(match[1], 10);
        }
        if (!spent) {
          const pkg = await db.getPackageById(order.packageId);
          if (pkg) spent = Math.round(pkg.priceUsd * 100);
        }
        if (spent > 0) {
          await db.refundPepPoints(order.userId, spent);
          updates.pepRefunded = true;
          updates.adminNote = `${updates.adminNote || order.adminNote || ''} [PEP_REFUNDED:${spent}]`.trim();
        }
      }

      const updated = await db.updateOrder(order.id, updates);
      return res.json({ order: updated });
    } catch (err: any) {
      console.error('Update order error:', err);
      return res.status(500).json({ error: 'Failed to update order' });
    }
  });

  // Fulfilled Customer Records Endpoint
  app.get('/api/admin/customers', requireAdmin, async (_req: AuthRequest, res) => {
    try {
      const customers = await db.getFulfilledCustomers();
      return res.json({ customers });
    } catch (err: any) {
      console.error('Fetch fulfilled customers error:', err);
      return res.status(500).json({ error: 'Failed to fetch fulfilled customers' });
    }
  });

  // Manage Packages
  app.post('/api/admin/packages', requireAdmin, async (req, res) => {
    try {
      const { name, ucAmount, bonusUc, priceUsd, badge, imageUrl, active } = req.body;
      if (!name || !ucAmount || priceUsd === undefined) {
        return res.status(400).json({ error: 'Name, UC amount, and Price are required' });
      }

      const allPackages = await db.getPackages();
      const newPkg: PubgPackage = {
        id: `pkg_${Date.now()}`,
        name: name.trim(),
        ucAmount: Number(ucAmount),
        bonusUc: Number(bonusUc || 0),
        priceUsd: Number(priceUsd),
        badge: (badge || '').trim(),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
        active: active !== undefined ? Boolean(active) : true,
        orderIndex: allPackages.length + 1,
      };

      await db.createPackage(newPkg);
      return res.status(201).json({ package: newPkg });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create package' });
    }
  });

  app.put('/api/admin/packages/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await db.updatePackage(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Package not found' });
      }
      return res.json({ package: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update package' });
    }
  });

  app.delete('/api/admin/packages/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await db.deletePackage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Package not found' });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete package' });
    }
  });

  // Manage Wallets & USSD templates
  app.put('/api/admin/wallets/:id', requireAdmin, async (req, res) => {
    try {
      const { merchantNumber, ussdTemplate, active, instructionsEn, instructionsSo } = req.body;
      const updates: any = {};
      if (merchantNumber !== undefined) updates.merchantNumber = merchantNumber.trim();
      if (ussdTemplate !== undefined) updates.ussdTemplate = ussdTemplate.trim();
      if (active !== undefined) updates.active = Boolean(active);
      if (instructionsEn !== undefined) updates.instructionsEn = instructionsEn;
      if (instructionsSo !== undefined) updates.instructionsSo = instructionsSo;

      const updated = await db.updateWallet(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      return res.json({ wallet: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update wallet configuration' });
    }
  });

  // Manage Ads
  app.put('/api/admin/ads/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await db.updateAdvertisement(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Ad not found' });
      }
      return res.json({ ad: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update advertisement' });
    }
  });

  // ==================== ADMIN EMPLOYEE MANAGEMENT ====================
  app.get('/api/admin/employees', requireAdmin, async (_req, res) => {
    try {
      const employees = await db.getEmployees();
      return res.json({ employees: employees.map(sanitizeUser) });
    } catch (err: any) {
      console.error('Fetch employees error:', err);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });

  app.post('/api/admin/employees', requireAdmin, async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and initial password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Initial password must be at least 6 characters' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await db.findUserByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email address already exists' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);

      const newEmployee = await db.createUser({
        id: `emp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: name.trim(),
        email: cleanEmail,
        phone: '',
        passwordHash,
        salt,
        role: 'employee',
        isActive: true,
        pepPoints: 0,
        profilePhotoUrl: '',
        createdAt: new Date().toISOString(),
      });

      return res.status(201).json({ employee: sanitizeUser(newEmployee) });
    } catch (err: any) {
      console.error('Create employee error:', err);
      return res.status(500).json({
        error: err.message || 'Failed to create employee account. Ensure the Phase 1 Supabase migration is applied.',
      });
    }
  });

  app.patch('/api/admin/employees/:id', requireAdmin, async (req, res) => {
    try {
      const { isActive, name, password } = req.body;
      const target = await db.findUserById(req.params.id);
      if (!target || target.role !== 'employee') {
        return res.status(404).json({ error: 'Employee account not found' });
      }

      const updates: any = {};
      if (isActive !== undefined) updates.isActive = Boolean(isActive);
      if (name !== undefined) updates.name = name.trim();
      if (password && password.length >= 6) {
        const newSalt = crypto.randomBytes(16).toString('hex');
        updates.salt = newSalt;
        updates.passwordHash = hashPassword(password, newSalt);
      }

      const updated = await db.updateUser(target.id, updates);
      return res.json({ employee: sanitizeUser(updated || { ...target, ...updates }) });
    } catch (err: any) {
      console.error('Update employee error:', err);
      return res.status(500).json({ error: 'Failed to update employee account' });
    }
  });

  // ==================== VITE MIDDLEWARE / STATIC ====================
  if (!isProduction) {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SOMPLAY server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SOMPLAY server:', err);
  process.exit(1);
});
