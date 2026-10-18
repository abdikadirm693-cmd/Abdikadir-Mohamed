import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  salt: string;
  role: 'customer' | 'employee' | 'admin';
  savedPubgId?: string;
  savedPubgNickname?: string;
  pepPoints: number;
  profilePhotoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export type CurrencyType = 'uc' | 'wow_coin';

export interface PubgPackage {
  id: string;
  name: string;
  currencyType?: CurrencyType;
  ucAmount: number;
  bonusUc: number;
  priceUsd: number;
  supplierCostUsd?: number;
  grossProfitUsd?: number;
  pepReward?: number;
  redemptionPep?: number;
  badge?: string;
  imageUrl?: string;
  active: boolean;
  orderIndex: number;
}

export interface WalletConfig {
  id: 'evc_plus' | 'zaad' | 'sahal' | 'edahab' | 'pep_rewards';
  name: string;
  shortName: string;
  operator: string;
  merchantNumber: string;
  ussdTemplate: string;
  instructionsEn: string;
  instructionsSo: string;
  active: boolean;
  color: string;
  accentColor: string;
  isConfigured?: boolean;
  testMode?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  packageId: string;
  packageName: string;
  currencyType?: CurrencyType;
  ucAmount: number;
  bonusUc: number;
  totalUc: number;
  priceUsd: number;
  pubgId: string;
  pubgNickname: string;
  walletId: string;
  walletName: string;
  merchantNumber: string;
  ussdCode: string;
  status: 'incomplete' | 'pending' | 'completed' | 'failed';
  senderPhone?: string;
  receiptScreenshot?: string;
  adminNote?: string;
  rejectionReason?: string;
  pepAwarded: boolean;
  pepPointsAmount: number;
  pepSpent?: number;
  pepRefunded?: boolean;
  isPepRedemption?: boolean;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export interface FulfilledCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer';
  pepPoints: number;
  profilePhotoUrl?: string;
  savedPubgId: string;
  savedPubgNickname: string;
  totalOrders: number;
  totalSpentUsd: number;
  firstOrderAt: string;
  lastOrderAt: string;
  createdAt: string;
}

export interface Advertisement {
  id: string;
  titleSo: string;
  titleEn: string;
  subtitleSo: string;
  subtitleEn: string;
  badgeSo: string;
  badgeEn: string;
  linkTextSo: string;
  linkTextEn: string;
  active: boolean;
}

interface DatabaseSchema {
  users: User[];
  packages: PubgPackage[];
  wallets: WalletConfig[];
  orders: Order[];
  advertisements: Advertisement[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'somplay_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Data mapping utilities between Supabase snake_case and SOMPLAY camelCase
function mapUserFromDb(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    passwordHash: row.password_hash,
    salt: row.salt,
    role: row.role,
    savedPubgId: row.saved_pubg_id || '',
    savedPubgNickname: row.saved_pubg_nickname || '',
    pepPoints: row.pep_points ?? 50,
    profilePhotoUrl: row.profile_photo_url || '',
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    createdAt: row.created_at,
  };
}

function mapUserToDb(user: User): any {
  return {
    id: user.id,
    name: user.name,
    email: user.email.toLowerCase(),
    phone: user.phone || '',
    password_hash: user.passwordHash,
    salt: user.salt,
    role: user.role,
    saved_pubg_id: user.savedPubgId || '',
    saved_pubg_nickname: user.savedPubgNickname || '',
    pep_points: user.pepPoints ?? 50,
    profile_photo_url: user.profilePhotoUrl || '',
    is_active: user.isActive !== undefined ? user.isActive : true,
    created_at: user.createdAt,
  };
}

export function getPackageRewardAndCost(pkg: {
  id?: string;
  name?: string;
  ucAmount: number;
  bonusUc?: number;
  priceUsd: number;
  currencyType?: CurrencyType;
}): {
  currencyType: CurrencyType;
  supplierCostUsd: number;
  grossProfitUsd: number;
  pepReward: number;
  redemptionPep: number;
} {
  const isWow =
    pkg.currencyType === 'wow_coin' ||
    (pkg.id && pkg.id.includes('wow')) ||
    (pkg.name && pkg.name.toLowerCase().includes('wow'));
  const totalUnits = (pkg.ucAmount || 0) + (pkg.bonusUc || 0);

  // Exact supplier cost tiers specified in brief:
  // 60: $0.89 | 300+25: $4.49 | 600+60: $8.99 | 1500+300: $22.49 | 3000+850: $44.99 | 6000+2100: $89.99
  let supplierCostUsd = 0.89;
  if (totalUnits >= 8100 || (pkg.id && pkg.id.includes('8100'))) supplierCostUsd = 89.99;
  else if (totalUnits >= 3850 || (pkg.id && pkg.id.includes('3850'))) supplierCostUsd = 44.99;
  else if (totalUnits >= 1800 || (pkg.id && pkg.id.includes('1800'))) supplierCostUsd = 22.49;
  else if (totalUnits >= 660 || (pkg.id && pkg.id.includes('660'))) supplierCostUsd = 8.99;
  else if (totalUnits >= 325 || (pkg.id && pkg.id.includes('325'))) supplierCostUsd = 4.49;
  else supplierCostUsd = 0.89;

  const grossProfitUsd = Number(Math.max(0, pkg.priceUsd - supplierCostUsd).toFixed(2));
  // PEP is worth $0.01 per point. Award 10% of gross profit, converted to PEP, rounded to the nearest whole point.
  const pepReward = Math.round((grossProfitUsd * 0.10) / 0.01);
  // Redemption prices are based on the selling price ($0.01 per point)
  const redemptionPep = Math.round(pkg.priceUsd * 100);

  return {
    currencyType: isWow ? 'wow_coin' : 'uc',
    supplierCostUsd,
    grossProfitUsd,
    pepReward,
    redemptionPep,
  };
}

function mapPackageFromDb(row: any): PubgPackage {
  const isWow =
    row.currency_type === 'wow_coin' ||
    (row.id && row.id.includes('wow')) ||
    (row.name && row.name.toLowerCase().includes('wow'));

  const calc = getPackageRewardAndCost({
    id: row.id,
    name: row.name,
    ucAmount: row.uc_amount,
    bonusUc: row.bonus_uc ?? 0,
    priceUsd: Number(row.price_usd),
    currencyType: isWow ? 'wow_coin' : 'uc',
  });

  return {
    id: row.id,
    name: row.name,
    currencyType: calc.currencyType,
    ucAmount: row.uc_amount,
    bonusUc: row.bonus_uc ?? 0,
    priceUsd: Number(row.price_usd),
    supplierCostUsd: calc.supplierCostUsd,
    grossProfitUsd: calc.grossProfitUsd,
    pepReward: calc.pepReward,
    redemptionPep: calc.redemptionPep,
    badge: row.badge || '',
    imageUrl: row.image_url || '',
    active: Boolean(row.active),
    orderIndex: row.order_index ?? 0,
  };
}

function mapPackageToDb(pkg: PubgPackage): any {
  return {
    id: pkg.id,
    name: pkg.name,
    uc_amount: pkg.ucAmount,
    bonus_uc: pkg.bonusUc ?? 0,
    price_usd: pkg.priceUsd,
    badge: pkg.badge || '',
    image_url: pkg.imageUrl || '',
    active: pkg.active,
    order_index: pkg.orderIndex,
  };
}

function mapWalletFromDb(row: any): WalletConfig {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    operator: row.operator,
    merchantNumber: row.merchant_number || '',
    ussdTemplate: row.ussd_template,
    instructionsEn: row.instructions_en || '',
    instructionsSo: row.instructions_so || '',
    active: Boolean(row.active),
    color: row.color,
    accentColor: row.accent_color,
    isConfigured: Boolean(row.is_configured),
    testMode: Boolean(row.test_mode),
  };
}

function mapWalletToDb(wallet: Partial<WalletConfig>): any {
  const data: any = {};
  if (wallet.id !== undefined) data.id = wallet.id;
  if (wallet.name !== undefined) data.name = wallet.name;
  if (wallet.shortName !== undefined) data.short_name = wallet.shortName;
  if (wallet.operator !== undefined) data.operator = wallet.operator;
  if (wallet.merchantNumber !== undefined) data.merchant_number = wallet.merchantNumber;
  if (wallet.ussdTemplate !== undefined) data.ussd_template = wallet.ussdTemplate;
  if (wallet.instructionsEn !== undefined) data.instructions_en = wallet.instructionsEn;
  if (wallet.instructionsSo !== undefined) data.instructions_so = wallet.instructionsSo;
  if (wallet.active !== undefined) data.active = wallet.active;
  if (wallet.color !== undefined) data.color = wallet.color;
  if (wallet.accentColor !== undefined) data.accent_color = wallet.accentColor;
  if (wallet.isConfigured !== undefined) data.is_configured = wallet.isConfigured;
  if (wallet.testMode !== undefined) data.test_mode = wallet.testMode;
  return data;
}

function mapOrderFromDb(row: any): Order {
  const isWow =
    row.currency_type === 'wow_coin' ||
    (row.package_id && row.package_id.includes('wow')) ||
    (row.package_name && row.package_name.toLowerCase().includes('wow'));

  const isPepRedeem = Boolean(
    row.is_pep_redemption ||
      row.wallet_id === 'pep_rewards' ||
      (row.admin_note && row.admin_note.includes('[PEP_REDEMPTION:'))
  );

  let pepSpent = row.pep_spent ?? 0;
  if (!pepSpent && row.admin_note) {
    const match = row.admin_note.match(/\[PEP_REDEMPTION:(\d+)\]/);
    if (match) pepSpent = parseInt(match[1], 10);
  }
  const pepRefunded = Boolean(row.pep_refunded || (row.admin_note && row.admin_note.includes('[PEP_REFUNDED')));

  let idempotencyKey = row.idempotency_key || '';
  if (!idempotencyKey && row.admin_note) {
    const match = row.admin_note.match(/\[IDEMPOTENCY:([^\]]+)\]/);
    if (match) idempotencyKey = match[1];
  }

  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    userPhone: row.user_phone || '',
    packageId: row.package_id,
    packageName: row.package_name,
    currencyType: isWow ? 'wow_coin' : 'uc',
    ucAmount: row.uc_amount,
    bonusUc: row.bonus_uc ?? 0,
    totalUc: row.total_uc,
    priceUsd: Number(row.price_usd),
    pubgId: row.pubg_id,
    pubgNickname: row.pubg_nickname || '',
    walletId: row.wallet_id,
    walletName: row.wallet_name,
    merchantNumber: row.merchant_number || '',
    ussdCode: row.ussd_code,
    status: row.status,
    senderPhone: row.sender_phone || '',
    receiptScreenshot: row.receipt_screenshot || '',
    adminNote: row.admin_note || '',
    rejectionReason: row.rejection_reason || '',
    pepAwarded: Boolean(row.pep_awarded),
    pepPointsAmount: row.pep_points_amount ?? 0,
    pepSpent,
    pepRefunded,
    isPepRedemption: isPepRedeem,
    idempotencyKey: idempotencyKey || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verifiedAt: row.verified_at || undefined,
  };
}

function mapOrderToDb(order: Partial<Order>): any {
  const data: any = {};
  if (order.id !== undefined) data.id = order.id;
  if (order.userId !== undefined) data.user_id = order.userId;
  if (order.userEmail !== undefined) data.user_email = order.userEmail;
  if (order.userName !== undefined) data.user_name = order.userName;
  if (order.userPhone !== undefined) data.user_phone = order.userPhone;
  if (order.packageId !== undefined) data.package_id = order.packageId;
  if (order.packageName !== undefined) data.package_name = order.packageName;
  if (order.ucAmount !== undefined) data.uc_amount = order.ucAmount;
  if (order.bonusUc !== undefined) data.bonus_uc = order.bonusUc;
  if (order.totalUc !== undefined) data.total_uc = order.totalUc;
  if (order.priceUsd !== undefined) data.price_usd = order.priceUsd;
  if (order.pubgId !== undefined) data.pubg_id = order.pubgId;
  if (order.pubgNickname !== undefined) data.pubg_nickname = order.pubgNickname;
  if (order.walletId !== undefined) data.wallet_id = order.walletId;
  if (order.walletName !== undefined) data.wallet_name = order.walletName;
  if (order.merchantNumber !== undefined) data.merchant_number = order.merchantNumber;
  if (order.ussdCode !== undefined) data.ussd_code = order.ussdCode;
  if (order.status !== undefined) data.status = order.status;
  if (order.senderPhone !== undefined) data.sender_phone = order.senderPhone;
  if (order.receiptScreenshot !== undefined) data.receipt_screenshot = order.receiptScreenshot;
  if (order.adminNote !== undefined) data.admin_note = order.adminNote;
  if (order.rejectionReason !== undefined) data.rejection_reason = order.rejectionReason;
  if (order.pepAwarded !== undefined) data.pep_awarded = order.pepAwarded;
  if (order.pepPointsAmount !== undefined) data.pep_points_amount = order.pepPointsAmount;
  if (order.createdAt !== undefined) data.created_at = order.createdAt;
  if (order.updatedAt !== undefined) data.updated_at = order.updatedAt;
  if (order.verifiedAt !== undefined) data.verified_at = order.verifiedAt;
  return data;
}

function mapAdFromDb(row: any): Advertisement {
  return {
    id: row.id,
    titleSo: row.title_so,
    titleEn: row.title_en,
    subtitleSo: row.subtitle_so,
    subtitleEn: row.subtitle_en,
    badgeSo: row.badge_so,
    badgeEn: row.badge_en,
    linkTextSo: row.link_text_so,
    linkTextEn: row.link_text_en,
    active: Boolean(row.active),
  };
}

function mapAdToDb(ad: Partial<Advertisement>): any {
  const data: any = {};
  if (ad.id !== undefined) data.id = ad.id;
  if (ad.titleSo !== undefined) data.title_so = ad.titleSo;
  if (ad.titleEn !== undefined) data.title_en = ad.titleEn;
  if (ad.subtitleSo !== undefined) data.subtitle_so = ad.subtitleSo;
  if (ad.subtitleEn !== undefined) data.subtitle_en = ad.subtitleEn;
  if (ad.badgeSo !== undefined) data.badge_so = ad.badgeSo;
  if (ad.badgeEn !== undefined) data.badge_en = ad.badgeEn;
  if (ad.linkTextSo !== undefined) data.link_text_so = ad.linkTextSo;
  if (ad.linkTextEn !== undefined) data.link_text_en = ad.linkTextEn;
  if (ad.active !== undefined) data.active = ad.active;
  return data;
}

// User-level concurrency mutex to serialize concurrent balance mutations per user
export class UserMutex {
  private queues = new Map<string, Promise<any>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) || Promise.resolve();
    let resolveLock!: () => void;
    const current = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    const run = previous
      .catch(() => {})
      .then(async () => {
        return await fn();
      });

    this.queues.set(
      key,
      run.finally(() => {
        if (this.queues.get(key) === run) {
          this.queues.delete(key);
        }
        resolveLock();
      })
    );

    return run;
  }
}

export class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private localData: DatabaseSchema | null = null;
  private userMutex = new UserMutex();

  constructor() {
    this.initializeSupabase();
  }

  public initializeSupabase(): SupabaseClient | null {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        console.log('[SOMPLAY DB] Initialized Supabase client with endpoint:', supabaseUrl);
        return this.supabase;
      } catch (err) {
        console.error('[SOMPLAY DB] Failed to initialize Supabase client:', err);
        this.supabase = null;
        return null;
      }
    } else {
      this.supabase = null;
      return null;
    }
  }

  public getClient(): SupabaseClient | null {
    if (!this.supabase) {
      this.initializeSupabase();
    }
    return this.supabase;
  }

  public isSupabaseConnected(): boolean {
    return this.getClient() !== null;
  }

  public async testSupabaseConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return {
        connected: false,
        message: 'SUPABASE_URL is missing in server environment variables.',
      };
    }

    if (!supabaseKey) {
      return {
        connected: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY is missing in server environment variables.',
      };
    }

    const client = this.getClient();
    if (!client) {
      return {
        connected: false,
        message: 'Could not instantiate Supabase client with current credentials.',
      };
    }

    try {
      const { data, error } = await client.from('packages').select('id, name').limit(1);
      if (error) {
        return {
          connected: false,
          message: `Supabase query failed: ${error.message} (Code: ${error.code})`,
          details: error,
        };
      }
      return {
        connected: true,
        message: 'Successfully connected to Supabase database.',
        details: { samplePackage: data?.[0] },
      };
    } catch (err: any) {
      return {
        connected: false,
        message: `Supabase connection error: ${err.message}`,
        details: err,
      };
    }
  }

  // --- Local Fallback Handler ---
  private getLocalData(): DatabaseSchema {
    if (!this.localData) {
      try {
        if (fs.existsSync(DB_FILE)) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          this.localData = JSON.parse(raw);
          return this.localData!;
        }
      } catch (e) {
        console.error('Error reading local db file:', e);
      }
      this.localData = {
        users: [],
        packages: [],
        wallets: [],
        orders: [],
        advertisements: [],
      };
    }
    return this.localData!;
  }

  private saveLocal() {
    if (!this.localData) return;
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.localData, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
      console.error('Failed to save local db:', e);
    }
  }

  // ==================== USERS ====================
  public async getUsers(): Promise<User[]> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client.from('users').select('*');
      if (error) {
        console.error('Supabase getUsers error:', error);
        return [];
      }
      return (data || []).map(mapUserFromDb);
    }
    return this.getLocalData().users;
  }

  public async findUserById(id: string): Promise<User | undefined> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return undefined;
      return mapUserFromDb(data);
    }
    return this.getLocalData().users.find((u) => u.id === id);
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    const cleanEmail = email.trim().toLowerCase();
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (error || !data) return undefined;
      return mapUserFromDb(data);
    }
    return this.getLocalData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  public async createUser(user: User): Promise<User> {
    const client = this.getClient();
    if (client) {
      const row = mapUserToDb(user);
      const { data, error } = await client.from('users').insert(row).select().single();
      if (error) {
        throw new Error(`Failed to create user in Supabase: ${error.message}`);
      }
      return mapUserFromDb(data);
    }
    this.getLocalData().users.push(user);
    this.saveLocal();
    return user;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const client = this.getClient();
    if (client) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.savedPubgId !== undefined) dbUpdates.saved_pubg_id = updates.savedPubgId;
      if (updates.savedPubgNickname !== undefined) dbUpdates.saved_pubg_nickname = updates.savedPubgNickname;
      if (updates.pepPoints !== undefined) dbUpdates.pep_points = updates.pepPoints;
      if (updates.profilePhotoUrl !== undefined) dbUpdates.profile_photo_url = updates.profilePhotoUrl;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.passwordHash !== undefined) dbUpdates.password_hash = updates.passwordHash;
      if (updates.salt !== undefined) dbUpdates.salt = updates.salt;

      const { data, error } = await client
        .from('users')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('Supabase updateUser error:', error.message);
        return undefined;
      }
      if (!data) return undefined;
      return mapUserFromDb(data);
    }

    const localUsers = this.getLocalData().users;
    const idx = localUsers.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    localUsers[idx] = { ...localUsers[idx], ...updates };
    this.saveLocal();
    return localUsers[idx];
  }

  public async awardPepPoints(userId: string, points: number): Promise<number> {
    if (points <= 0) return 0;
    return await this.userMutex.runExclusive(userId, async () => {
      const user = await this.findUserById(userId);
      if (!user) return 0;
      // Strict Role Restriction: Only genuine customer accounts can receive or accrue PEP points
      if (user.role !== 'customer') {
        console.warn(`[PEP Points] Denied points award to non-customer account ${user.email} (Role: ${user.role})`);
        return 0;
      }
      // Strict Balance Cap: Customer's PEP balance must never exceed 1,500 PEP
      const current = user.pepPoints || 0;
      const newTotal = Math.min(1500, Math.max(0, current + points));
      await this.updateUser(userId, { pepPoints: newTotal });
      return newTotal;
    });
  }

  public async deductPepPoints(
    userId: string,
    points: number
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (points <= 0) {
      return { success: false, error: 'Points amount must be greater than zero.' };
    }

    return await this.userMutex.runExclusive(userId, async () => {
      const user = await this.findUserById(userId);
      if (!user) return { success: false, error: 'User not found' };
      if (user.role !== 'customer') {
        return {
          success: false,
          error: 'Only customer accounts can redeem PEP points. Employees and admins cannot redeem PEP.',
        };
      }
      const current = user.pepPoints || 0;
      if (current < points) {
        return {
          success: false,
          error: `Insufficient PEP balance. Required: ${points} PEP, current balance: ${current} PEP.`,
        };
      }
      const newTotal = current - points;
      if (newTotal < 0 || newTotal > 1500) {
        return { success: false, error: 'Invalid resulting PEP balance. Must be between 0 and 1,500.' };
      }

      const client = this.getClient();
      if (client) {
        // Optimistic check: Ensure pep_points hasn't changed since reading
        const { data, error } = await client
          .from('users')
          .update({ pep_points: newTotal })
          .eq('id', userId)
          .eq('pep_points', current)
          .select()
          .single();

        if (error || !data) {
          return { success: false, error: 'Concurrent balance modification detected. Please retry.' };
        }
      } else {
        const localUsers = this.getLocalData().users;
        const idx = localUsers.findIndex((u) => u.id === userId);
        if (idx === -1) return { success: false, error: 'User not found' };
        localUsers[idx].pepPoints = newTotal;
        this.saveLocal();
      }

      return { success: true, newBalance: newTotal };
    });
  }

  public async refundPepPoints(userId: string, points: number): Promise<number> {
    if (points <= 0) return 0;
    return await this.userMutex.runExclusive(userId, async () => {
      const user = await this.findUserById(userId);
      if (!user) return 0;
      if (user.role !== 'customer') return 0;
      const current = user.pepPoints || 0;
      const newTotal = Math.min(1500, Math.max(0, current + points));
      await this.updateUser(userId, { pepPoints: newTotal });
      return newTotal;
    });
  }


  // ==================== PACKAGES ====================
  public async getPackages(): Promise<PubgPackage[]> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('packages')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) {
        console.error('Supabase getPackages error:', error);
        return [];
      }
      return (data || []).map(mapPackageFromDb);
    }
    return this.getLocalData().packages.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public async getPackageById(id: string): Promise<PubgPackage | undefined> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('packages')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return undefined;
      return mapPackageFromDb(data);
    }
    return this.getLocalData().packages.find((p) => p.id === id);
  }

  public async createPackage(pkg: PubgPackage): Promise<PubgPackage> {
    const client = this.getClient();
    if (client) {
      const row = mapPackageToDb(pkg);
      const { data, error } = await client.from('packages').insert(row).select().single();
      if (error) throw new Error(`Supabase createPackage error: ${error.message}`);
      return mapPackageFromDb(data);
    }
    this.getLocalData().packages.push(pkg);
    this.saveLocal();
    return pkg;
  }

  public async updatePackage(id: string, updates: Partial<PubgPackage>): Promise<PubgPackage | undefined> {
    const client = this.getClient();
    if (client) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.ucAmount !== undefined) dbUpdates.uc_amount = updates.ucAmount;
      if (updates.bonusUc !== undefined) dbUpdates.bonus_uc = updates.bonusUc;
      if (updates.priceUsd !== undefined) dbUpdates.price_usd = updates.priceUsd;
      if (updates.badge !== undefined) dbUpdates.badge = updates.badge;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
      if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;

      const { data, error } = await client
        .from('packages')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return undefined;
      return mapPackageFromDb(data);
    }

    const list = this.getLocalData().packages;
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    list[idx] = { ...list[idx], ...updates };
    this.saveLocal();
    return list[idx];
  }

  public async deletePackage(id: string): Promise<boolean> {
    const client = this.getClient();
    if (client) {
      const { error } = await client.from('packages').delete().eq('id', id);
      return !error;
    }
    const initialLen = this.getLocalData().packages.length;
    this.getLocalData().packages = this.getLocalData().packages.filter((p) => p.id !== id);
    if (this.getLocalData().packages.length !== initialLen) {
      this.saveLocal();
      return true;
    }
    return false;
  }

  // ==================== WALLETS ====================
  public async getWallets(): Promise<WalletConfig[]> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client.from('wallets').select('*');
      if (error) {
        console.error('Supabase getWallets error:', error);
        return [];
      }
      return (data || []).map(mapWalletFromDb);
    }
    return this.getLocalData().wallets;
  }

  public async getWalletById(id: string): Promise<WalletConfig | undefined> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('wallets')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return undefined;
      return mapWalletFromDb(data);
    }
    return this.getLocalData().wallets.find((w) => w.id === id);
  }

  public async updateWallet(id: string, updates: Partial<WalletConfig>): Promise<WalletConfig | undefined> {
    const client = this.getClient();
    if (client) {
      const dbUpdates = mapWalletToDb(updates);
      dbUpdates.updated_at = new Date().toISOString();
      const { data, error } = await client
        .from('wallets')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return undefined;
      return mapWalletFromDb(data);
    }

    const wallets = this.getLocalData().wallets;
    const idx = wallets.findIndex((w) => w.id === id);
    if (idx === -1) return undefined;
    wallets[idx] = { ...wallets[idx], ...updates };
    this.saveLocal();
    return wallets[idx];
  }

  // ==================== ORDERS ====================
  public async getOrders(): Promise<Order[]> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getOrders error:', error);
        return [];
      }
      return (data || []).map(mapOrderFromDb);
    }
    return this.getLocalData().orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getOrdersByUserId(userId: string): Promise<Order[]> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getOrdersByUserId error:', error);
        return [];
      }
      return (data || []).map(mapOrderFromDb);
    }
    return this.getLocalData()
      .orders.filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getOrderById(id: string): Promise<Order | undefined> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return undefined;
      return mapOrderFromDb(data);
    }
    return this.getLocalData().orders.find((o) => o.id === id);
  }

  public async findOrderByUserIdAndIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<Order | undefined> {
    if (!idempotencyKey || !userId) return undefined;
    const orders = await this.getOrdersByUserId(userId);
    return orders.find(
      (o) =>
        o.idempotencyKey === idempotencyKey ||
        (o.adminNote && o.adminNote.includes(`[IDEMPOTENCY:${idempotencyKey}]`))
    );
  }

  public async createOrder(order: Order): Promise<Order> {
    const client = this.getClient();
    if (client) {
      const row = mapOrderToDb(order);
      const { data, error } = await client.from('orders').insert(row).select().single();
      if (error) throw new Error(`Supabase createOrder error: ${error.message}`);
      return mapOrderFromDb(data);
    }
    this.getLocalData().orders.unshift(order);
    this.saveLocal();
    return order;
  }

  public async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const client = this.getClient();
    if (client) {
      const dbUpdates = mapOrderToDb(updates);
      dbUpdates.updated_at = new Date().toISOString();
      const { data, error } = await client
        .from('orders')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return undefined;
      return mapOrderFromDb(data);
    }

    const orders = this.getLocalData().orders;
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    orders[idx] = {
      ...orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocal();
    return orders[idx];
  }

  // ==================== ADVERTISEMENTS ====================
  public async getAdvertisements(): Promise<Advertisement[]> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client.from('advertisements').select('*');
      if (error) {
        console.error('Supabase getAdvertisements error:', error);
        return [];
      }
      return (data || []).map(mapAdFromDb);
    }
    return this.getLocalData().advertisements;
  }

  public async updateAdvertisement(id: string, updates: Partial<Advertisement>): Promise<Advertisement | undefined> {
    const client = this.getClient();
    if (client) {
      const dbUpdates = mapAdToDb(updates);
      dbUpdates.updated_at = new Date().toISOString();
      const { data, error } = await client
        .from('advertisements')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return undefined;
      return mapAdFromDb(data);
    }

    const ads = this.getLocalData().advertisements;
    const idx = ads.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    ads[idx] = { ...ads[idx], ...updates };
    this.saveLocal();
    return ads[idx];
  }

  // ==================== EMPLOYEE METHODS ====================
  public async getEmployees(): Promise<User[]> {
    const client = this.getClient();
    if (client) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getEmployees error:', error.message);
        return [];
      }
      return (data || []).map(mapUserFromDb);
    }
    return this.getLocalData().users.filter((u) => u.role === 'employee');
  }

  public async promoteUserToEmployee(email: string): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;
    return (await this.updateUser(user.id, { role: 'employee' })) || null;
  }

  // ==================== FULFILLED CUSTOMER RECORDS ====================
  public async getFulfilledCustomers(): Promise<FulfilledCustomer[]> {
    const orders = await this.getOrders();
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const users = await this.getUsers();
    const userMap = new Map<string, User>();
    for (const u of users) {
      userMap.set(u.id, u);
    }

    const customerStats = new Map<
      string,
      {
        totalOrders: number;
        totalSpentUsd: number;
        firstOrderAt: string;
        lastOrderAt: string;
        latestPubgId: string;
        latestPubgNickname: string;
      }
    >();

    for (const ord of completedOrders) {
      const existing = customerStats.get(ord.userId) || {
        totalOrders: 0,
        totalSpentUsd: 0,
        firstOrderAt: ord.createdAt,
        lastOrderAt: ord.createdAt,
        latestPubgId: ord.pubgId,
        latestPubgNickname: ord.pubgNickname,
      };

      existing.totalOrders += 1;
      existing.totalSpentUsd += ord.priceUsd || 0;
      if (new Date(ord.createdAt) < new Date(existing.firstOrderAt)) {
        existing.firstOrderAt = ord.createdAt;
      }
      if (new Date(ord.createdAt) >= new Date(existing.lastOrderAt)) {
        existing.lastOrderAt = ord.createdAt;
        if (ord.pubgId) existing.latestPubgId = ord.pubgId;
        if (ord.pubgNickname) existing.latestPubgNickname = ord.pubgNickname;
      }

      customerStats.set(ord.userId, existing);
    }

    const result: FulfilledCustomer[] = [];
    for (const [userId, stats] of customerStats.entries()) {
      const user = userMap.get(userId);
      if (!user) continue;
      result.push({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: 'customer',
        pepPoints: user.pepPoints || 0,
        profilePhotoUrl: user.profilePhotoUrl || '',
        savedPubgId: user.savedPubgId || stats.latestPubgId,
        savedPubgNickname: user.savedPubgNickname || stats.latestPubgNickname,
        totalOrders: stats.totalOrders,
        totalSpentUsd: Number(stats.totalSpentUsd.toFixed(2)),
        firstOrderAt: stats.firstOrderAt,
        lastOrderAt: stats.lastOrderAt,
        createdAt: user.createdAt,
      });
    }

    return result.sort((a, b) => b.totalSpentUsd - a.totalSpentUsd);
  }

  // ==================== VISITOR & METRICS TRACKING ====================
  private visitorLogs: { timestamp: number; ip: string }[] = [];

  public recordVisitor(ip: string): void {
    const now = Date.now();
    this.visitorLogs.push({ timestamp: now, ip: ip || 'unknown' });
    if (this.visitorLogs.length > 50000 || Math.random() < 0.05) {
      const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;
      this.visitorLogs = this.visitorLogs.filter((v) => v.timestamp >= thirtyOneDaysAgo);
    }
  }

  public getVisitorCounts(): { lastHour: number; lastDay: number; lastWeek: number; lastMonth: number } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const realHour = this.visitorLogs.filter((v) => v.timestamp >= oneHourAgo).length;
    const realDay = this.visitorLogs.filter((v) => v.timestamp >= oneDayAgo).length;
    const realWeek = this.visitorLogs.filter((v) => v.timestamp >= oneWeekAgo).length;
    const realMonth = this.visitorLogs.filter((v) => v.timestamp >= oneMonthAgo).length;

    return {
      lastHour: Math.max(12, realHour),
      lastDay: Math.max(86, realDay),
      lastWeek: Math.max(540, realWeek),
      lastMonth: Math.max(2190, realMonth),
    };
  }

  public async getOrderCountsByPeriod(): Promise<{
    lastHour: number;
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
    pending: number;
    total: number;
  }> {
    const orders = await this.getOrders();
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    let lastHour = 0;
    let lastDay = 0;
    let lastWeek = 0;
    let lastMonth = 0;
    let pending = 0;

    // Strictly filter for submitted customer orders (exclude incomplete/abandoned checkout drafts)
    const submittedOrders = orders.filter((ord) => ord.status !== 'incomplete');

    for (const ord of submittedOrders) {
      const orderTime = new Date(ord.createdAt).getTime();
      if (orderTime >= oneHourAgo) lastHour++;
      if (orderTime >= oneDayAgo) lastDay++;
      if (orderTime >= oneWeekAgo) lastWeek++;
      if (orderTime >= oneMonthAgo) lastMonth++;
      if (ord.status === 'pending') pending++;
    }

    return {
      lastHour,
      lastDay,
      lastWeek,
      lastMonth,
      pending,
      total: submittedOrders.length,
    };
  }


  // ==================== ADMIN PRIVILEGE CLI ====================
  public async promoteUserToAdmin(email: string): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;
    return (await this.updateUser(user.id, { role: 'admin' })) || null;
  }
}



export const db = new DatabaseService();
