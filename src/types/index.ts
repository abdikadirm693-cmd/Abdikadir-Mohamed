export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'employee' | 'admin';
  savedPubgId?: string;
  savedPubgNickname?: string;
  pepPoints: number;
  profilePhotoUrl?: string;
  isActive?: boolean;
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

export type OrderStatus = 'incomplete' | 'pending' | 'completed' | 'failed';

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
  status: OrderStatus;
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

// Support-focused customer record for employees (strictly excludes totalSpentUsd / financial metrics)
export interface EmployeeCustomer {
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

export interface AdminStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  incompleteOrders: number;
  failedOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalFulfilledCustomers?: number;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  targetUrl?: string;
  orderIndex: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutFieldLabels {
  playerIdLabelEn: string;
  playerIdLabelSo: string;
  nicknameLabelEn: string;
  nicknameLabelSo: string;
  playerIdPlaceholderEn?: string;
  playerIdPlaceholderSo?: string;
  nicknamePlaceholderEn?: string;
  nicknamePlaceholderSo?: string;
  updatedAt?: string;
}
