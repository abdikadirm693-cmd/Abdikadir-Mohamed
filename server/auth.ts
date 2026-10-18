import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { db, User } from './db.js';

function loadSessionSecret(): string {
  const envSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (envSecret && envSecret.trim().length >= 32) {
    return envSecret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET or SESSION_SECRET must be set to a strong key of at least 32 characters in production.');
  }

  // Development fallback: Read or create persistent local secret inside protected data directory
  const secretPath = path.resolve(process.cwd(), 'data', '.session_secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf-8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
  } catch {
    // Continue to generation
  }

  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(secretPath, generated, { encoding: 'utf-8', mode: 0o600 });
  } catch {
    // If write fails, generated remains in memory
  }
  return generated;
}

const TOKEN_SECRET = loadSessionSecret();

export interface AuthRequest extends Request {
  user?: User;
}

export function createToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(data)
      .digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }

  try {
    const user = await db.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ error: 'This account has been deactivated. Please contact the administrator.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication verification failed' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Admin authorization required' });
      return;
    }
    next();
  });
}

export function requireEmployee(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || (req.user.role !== 'employee' && req.user.role !== 'admin')) {
      res.status(403).json({ error: 'Employee or Admin authorization required' });
      return;
    }
    next();
  });
}

export function requireCustomer(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (req.user.isActive === false) {
      res.status(403).json({ error: 'This account has been deactivated. Please contact support.' });
      return;
    }
    if (req.user.role === 'employee') {
      res.status(403).json({
        error: 'Employee accounts are strictly prohibited from creating customer orders, purchasing packages, or initiating checkout.',
      });
      return;
    }
    if (req.user.role === 'admin') {
      res.status(403).json({
        error: 'Administrator accounts cannot place customer orders through ordinary customer endpoints.',
      });
      return;
    }
    if (req.user.role !== 'customer') {
      res.status(403).json({ error: 'Only customer accounts are permitted to place orders.' });
      return;
    }
    next();
  });
}

