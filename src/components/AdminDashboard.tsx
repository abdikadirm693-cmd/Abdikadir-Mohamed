import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  DollarSign,
  Users,
  Package,
  Phone,
  Megaphone,
  Check,
  X,
  Search,
  ExternalLink,
  Coins,
  UserCheck,
  UserPlus,
  UserX,
  CreditCard,
  Copy,
} from 'lucide-react';
import { AdminStats, Order, PubgPackage, WalletConfig, Advertisement, User, FulfilledCustomer } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import { ProfilePhotoViewerModal } from './ProfilePhotoViewerModal.tsx';

interface AdminDashboardProps {
  onBackToApp: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToApp }) => {
  const { user: currentAdmin, authFetch } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'packages' | 'wallets' | 'ads' | 'employees'>('orders');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [packages, setPackages] = useState<PubgPackage[]>([]);
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [customers, setCustomers] = useState<FulfilledCustomer[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [copiedPubgId, setCopiedPubgId] = useState<string | null>(null);

  // Employee Management Modal State
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [employeeSuccess, setEmployeeSuccess] = useState('');

  // WhatsApp-style full screen photo preview
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null);

  // Selected Order for Review Action Modal
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<'complete' | 'reject'>('complete');
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Package Modal (Add / Edit)
  const [editingPackage, setEditingPackage] = useState<PubgPackage | null>(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [pkgFormName, setPkgFormName] = useState('');
  const [pkgFormUc, setPkgFormUc] = useState('');
  const [pkgFormBonus, setPkgFormBonus] = useState('0');
  const [pkgFormPrice, setPkgFormPrice] = useState('');
  const [pkgFormBadge, setPkgFormBadge] = useState('');
  const [pkgFormActive, setPkgFormActive] = useState(true);

  // Screenshot Lightbox
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);

  const fetchAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, ordersRes, pkgRes, walletsRes, adsRes, employeesRes, customersRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/orders'),
        authFetch('/api/packages'),
        authFetch('/api/wallets'),
        authFetch('/api/ads'),
        authFetch('/api/admin/employees'),
        authFetch('/api/admin/customers'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders);
      }
      if (pkgRes.ok) {
        const data = await pkgRes.json();
        setPackages(data.packages);
      }
      if (walletsRes.ok) {
        const data = await walletsRes.json();
        setWallets(data.wallets);
      }
      if (adsRes.ok) {
        const data = await adsRes.json();
        setAds(data.ads);
      }
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEmployee(true);
    setEmployeeError('');
    setEmployeeSuccess('');

    try {
      const res = await authFetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmpName.trim(),
          email: newEmpEmail.trim().toLowerCase(),
          password: newEmpPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee account');
      }

      setEmployees((prev) => [data.employee, ...prev.filter((emp) => emp.id !== data.employee.id)]);
      setEmployeeSuccess(t('employeeCreatedSuccess'));
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpPassword('');
      setTimeout(() => {
        setIsAddEmployeeModalOpen(false);
        setEmployeeSuccess('');
      }, 1500);
    } catch (err: any) {
      setEmployeeError(err.message || 'Error creating employee');
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  const handleToggleEmployeeStatus = async (employee: User) => {
    try {
      const newActive = !employee.isActive;
      const res = await authFetch(`/api/admin/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === data.employee.id ? data.employee : emp))
        );
      }
    } catch (err) {
      console.error('Error toggling employee status:', err);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.pubgId.toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q) ||
        (o.senderPhone && o.senderPhone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered fulfilled customers
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.savedPubgId && c.savedPubgId.toLowerCase().includes(q)) ||
      (c.savedPubgNickname && c.savedPubgNickname.toLowerCase().includes(q))
    );
  });

  // Handle Review Action (Confirm or Reject)
  const handleConfirmOrderAction = async () => {
    if (!selectedOrderForAction) return;
    setIsProcessingAction(true);
    setActionError('');

    try {
      const statusToSet = actionType === 'complete' ? 'completed' : 'failed';
      const body: any = {
        status: statusToSet,
        adminNote: adminNote.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined,
      };

      const res = await authFetch(`/api/admin/orders/${selectedOrderForAction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      // Update local state
      setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      setSelectedOrderForAction(null);
      setAdminNote('');
      setRejectionReason('');
      fetchAllAdminData(); // Refresh stats
    } catch (err: any) {
      setActionError(err.message || 'Error executing action');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Package Add/Edit
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: pkgFormName.trim(),
        ucAmount: Number(pkgFormUc),
        bonusUc: Number(pkgFormBonus || 0),
        priceUsd: Number(pkgFormPrice),
        badge: pkgFormBadge.trim(),
        active: pkgFormActive,
      };

      if (editingPackage) {
        const res = await authFetch(`/api/admin/packages/${editingPackage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setPackages((prev) => prev.map((p) => (p.id === data.package.id ? data.package : p)));
        }
      } else {
        const res = await authFetch('/api/admin/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setPackages((prev) => [...prev, data.package]);
        }
      }

      setIsPackageModalOpen(false);
      setEditingPackage(null);
    } catch (err) {
      console.error('Save package error:', err);
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      const res = await authFetch(`/api/admin/packages/${pkgId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPackages((prev) => prev.filter((p) => p.id !== pkgId));
      }
    } catch (err) {
      console.error('Delete package error:', err);
    }
  };

  // Handle Wallet Config Edit
  const handleUpdateWallet = async (walletId: string, updates: Partial<WalletConfig>) => {
    try {
      const res = await authFetch(`/api/admin/wallets/${walletId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setWallets((prev) => prev.map((w) => (w.id === data.wallet.id ? data.wallet : w)));
      }
    } catch (err) {
      console.error('Update wallet error:', err);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <UserAvatar
            profilePhotoUrl={currentAdmin?.profilePhotoUrl}
            name={currentAdmin?.name || 'Administrator'}
            email={currentAdmin?.email}
            size="lg"
            interactive
            onClick={() => {
              if (currentAdmin?.profilePhotoUrl) {
                setPreviewPhoto({ url: currentAdmin.profilePhotoUrl, name: currentAdmin.name });
              }
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg font-display">
                {t('adminDashboardTitle')}
              </h2>
              <span className="bg-red-500/20 text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-red-500/40 uppercase">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentAdmin?.name} ({currentAdmin?.email})
            </p>
          </div>
        </div>

        <button
          onClick={onBackToApp}
          className="self-start sm:self-auto px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
        >
          Back to Storefront
        </button>
      </div>

      {/* Admin Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('totalRevenueStat')}</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1 font-display">
              ${stats.totalRevenue.toFixed(2)}
            </div>
          </div>

          <div className="bg-white border-2 border-amber-400 rounded-xl p-3.5 shadow-xs relative">
            <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>{t('pendingReviewStat')}</span>
            </div>
            <div className="text-xl font-black text-amber-600 mt-1 font-display">
              {stats.pendingOrders}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('completedOrdersStat')}</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1 font-display">
              {stats.completedOrders}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('totalUsersStat')}</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1 font-display">
              {stats.totalUsers}
            </div>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t('tabOrdersReview')}</span>
          {stats && stats.pendingOrders > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white text-red-600 text-[10px] font-black">
              {stats.pendingOrders}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'customers'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customers ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{t('tabEmployees')} ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('packages')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'packages'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>{t('tabPackages')} ({packages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'wallets'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>{t('tabWallets')}</span>
        </button>

        <button
          onClick={() => setActiveTab('ads')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ads'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>{t('tabAds')}</span>
        </button>
      </div>

      {/* ================= TAB 1: ORDERS REVIEW ================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Sub Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
              {['pending', 'all', 'completed', 'incomplete', 'failed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                    orderStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, PUBG UID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
              />
            </div>
          </div>

          {/* Orders Table / Cards */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              No orders matching current filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white border rounded-xl p-4 shadow-xs text-xs space-y-3 ${
                    order.status === 'pending'
                      ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/50'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {order.id}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">
                        {new Date(order.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : order.status === 'incomplete'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.status}
                      </span>

                      <span className="font-black text-sm text-slate-900">
                        ${order.priceUsd.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Core Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-slate-700">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                        Customer
                      </span>
                      <div className="font-bold text-slate-900">{order.userName}</div>
                      <div className="text-[11px] text-slate-500">{order.userEmail}</div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                        PUBG Mobile Target
                      </span>
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        UID: {order.pubgId}
                      </div>
                      <div className="text-red-600 font-bold">
                        {order.totalUc} UC ({order.packageName})
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                        Payment Info
                      </span>
                      <div className="font-semibold text-slate-900">{order.walletName}</div>
                      <div className="font-mono font-bold text-slate-700">
                        Sender: {order.senderPhone || 'Not submitted yet'}
                      </div>
                    </div>
                  </div>

                  {/* Screenshot & Admin Notes Row */}
                  {(order.receiptScreenshot || order.adminNote || order.rejectionReason) && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {order.receiptScreenshot && (
                        <button
                          type="button"
                          onClick={() => setViewScreenshotUrl(order.receiptScreenshot || null)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt Screenshot</span>
                        </button>
                      )}

                      {order.adminNote && (
                        <span className="text-emerald-700 font-medium">
                          Note: {order.adminNote}
                        </span>
                      )}

                      {order.rejectionReason && (
                        <span className="text-red-700 font-medium">
                          Reason: {order.rejectionReason}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons for Pending / Incomplete Orders */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    {order.status !== 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedOrderForAction(order);
                          setActionType('complete');
                          setAdminNote(`PUBG recharge completed UID ${order.pubgId} via Midasbuy`);
                          setActionError('');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Complete</span>
                      </button>
                    )}

                    {order.status !== 'failed' && (
                      <button
                        onClick={() => {
                          setSelectedOrderForAction(order);
                          setActionType('reject');
                          setRejectionReason('Payment not found on merchant wallet line');
                          setActionError('');
                        }}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: FULFILLED CUSTOMERS ================= */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-red-600" />
                <span>Fulfilled Customer Directory ({customers.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified customer accounts with at least one successfully completed top-up. Excludes abandoned, pending, and failed checkouts.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, PUBG UID..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
              />
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Total Fulfilled Customers
              </span>
              <div className="text-lg font-black text-slate-900 font-display">
                {customers.length}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Total Completed Orders
              </span>
              <div className="text-lg font-black text-emerald-600 font-display">
                {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Customer Lifetime Spend
              </span>
              <div className="text-lg font-black text-slate-900 font-display">
                ${customers.reduce((sum, c) => sum + (c.totalSpentUsd || 0), 0).toFixed(2)} USD
              </div>
            </div>
          </div>

          {/* Customers Cards Grid */}
          {filteredCustomers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">
                {customerSearchQuery ? 'No matching customers found' : 'No Fulfilled Customers Yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {customerSearchQuery
                  ? 'Try searching with a different name, email, phone number, or PUBG Player UID.'
                  : 'Customer accounts will appear here automatically once their first game top-up order is successfully confirmed and fulfilled.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredCustomers.map((cust) => (
                <div
                  key={cust.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all text-xs"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      profilePhotoUrl={cust.profilePhotoUrl}
                      name={cust.name}
                      email={cust.email}
                      size="lg"
                      interactive
                      onClick={() => {
                        if (cust.profilePhotoUrl) {
                          setPreviewPhoto({ url: cust.profilePhotoUrl, name: cust.name });
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {cust.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {cust.totalOrders} {cust.totalOrders === 1 ? 'Order' : 'Orders'}
                        </span>
                      </div>

                      <p className="text-slate-500 text-xs font-mono truncate mt-0.5">
                        {cust.email}
                      </p>
                      {cust.phone && (
                        <p className="text-slate-500 text-xs font-mono truncate">
                          {cust.phone}
                        </p>
                      )}

                      <div className="mt-1 flex items-center gap-1.5 text-amber-800 font-bold text-[11px]">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>{cust.pepPoints || 0} PEP Points</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">Saved PUBG UID:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900">
                          {cust.savedPubgId || 'Not set'}
                        </span>
                        {cust.savedPubgId && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cust.savedPubgId);
                              setCopiedPubgId(cust.savedPubgId);
                              setTimeout(() => setCopiedPubgId(null), 2000);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                            title="Copy PUBG UID"
                          >
                            {copiedPubgId === cust.savedPubgId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {cust.savedPubgNickname && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Nickname:</span>
                        <span className="font-semibold text-slate-800">{cust.savedPubgNickname}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-slate-900 font-bold">
                      <span>Total Spent:</span>
                      <span className="font-display text-emerald-700">
                        ${(cust.totalSpentUsd || 0).toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      First: {new Date(cust.firstOrderAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span>
                      Last: {new Date(cust.lastOrderAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PACKAGES ================= */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 font-display">
              PUBG UC Packages ({packages.length})
            </h3>
            <button
              onClick={() => {
                setEditingPackage(null);
                setPkgFormName('');
                setPkgFormUc('');
                setPkgFormBonus('0');
                setPkgFormPrice('');
                setPkgFormBadge('');
                setPkgFormActive(true);
                setIsPackageModalOpen(true);
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addPackageBtn')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-red-600">
                        {pkg.badge || 'Standard'}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{pkg.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        pkg.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {pkg.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                    <div>UC Amount: <strong className="text-slate-900">{pkg.ucAmount} UC</strong></div>
                    <div>Bonus UC: <strong className="text-emerald-600">+{pkg.bonusUc} UC</strong></div>
                    <div>Price: <strong className="text-slate-900">${pkg.priceUsd.toFixed(2)} USD</strong></div>
                    <div>PEP Reward: <strong className="text-amber-600">{Math.round(pkg.priceUsd * 10)} PEP</strong></div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingPackage(pkg);
                      setPkgFormName(pkg.name);
                      setPkgFormUc(pkg.ucAmount.toString());
                      setPkgFormBonus(pkg.bonusUc.toString());
                      setPkgFormPrice(pkg.priceUsd.toString());
                      setPkgFormBadge(pkg.badge || '');
                      setPkgFormActive(pkg.active);
                      setIsPackageModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    title="Edit Package"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeletePackage(pkg.id)}
                    className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors cursor-pointer"
                    title="Delete Package"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: WALLETS CONFIG ================= */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
            <p className="font-bold text-slate-900 mb-1">
              Somali Mobile Wallet USSD Configuration
            </p>
            <p>
              Only use verified merchant phone numbers and official USSD syntax.
              Changes update immediately in the customer payment dialer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-sm text-slate-900 font-display">
                    {wallet.name}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wallet.active}
                      onChange={(e) => handleUpdateWallet(wallet.id, { active: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      {t('merchantNumberConfig')}
                    </label>
                    <input
                      type="text"
                      defaultValue={wallet.merchantNumber}
                      onBlur={(e) => {
                        if (e.target.value !== wallet.merchantNumber) {
                          handleUpdateWallet(wallet.id, { merchantNumber: e.target.value.trim() });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      {t('ussdTemplateConfig')}
                    </label>
                    <input
                      type="text"
                      defaultValue={wallet.ussdTemplate}
                      onBlur={(e) => {
                        if (e.target.value !== wallet.ussdTemplate) {
                          handleUpdateWallet(wallet.id, { ussdTemplate: e.target.value.trim() });
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] text-slate-500 font-mono">
                    Dialer Preview for $4.99: <br />
                    <strong className="text-slate-900">
                      {wallet.ussdTemplate
                        .replace('{merchant}', wallet.merchantNumber)
                        .replace('{amount}', '4.99')}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: ADS ================= */}
      {activeTab === 'ads' && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-900 font-display">
            Homepage Promotional Banners
          </h3>

          {ads.map((ad) => (
            <div key={ad.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title (Somali)</label>
                  <input
                    type="text"
                    defaultValue={ad.titleSo}
                    onBlur={(e) => {
                      authFetch(`/api/admin/ads/${ad.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ titleSo: e.target.value }),
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title (English)</label>
                  <input
                    type="text"
                    defaultValue={ad.titleEn}
                    onBlur={(e) => {
                      authFetch(`/api/admin/ads/${ad.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ titleEn: e.target.value }),
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle (Somali)</label>
                <input
                  type="text"
                  defaultValue={ad.subtitleSo}
                  onBlur={(e) => {
                    authFetch(`/api/admin/ads/${ad.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subtitleSo: e.target.value }),
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle (English)</label>
                <input
                  type="text"
                  defaultValue={ad.subtitleEn}
                  onBlur={(e) => {
                    authFetch(`/api/admin/ads/${ad.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subtitleEn: e.target.value }),
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB 5: EMPLOYEE MANAGEMENT ================= */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 font-display flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-red-600" />
                <span>{t('employeeListTitle')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('employeeListSubtitle')}
              </p>
            </div>

            <button
              onClick={() => {
                setNewEmpName('');
                setNewEmpEmail('Mpabpestore1@gmail.com');
                setNewEmpPassword('');
                setEmployeeError('');
                setEmployeeSuccess('');
                setIsAddEmployeeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('addEmployeeBtn')}</span>
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <UserPlus className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-sm text-slate-900 font-display">
                  No Employee Accounts Yet
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Add customer support agents or order processing staff. Employees can log in, view orders, and manage permitted operations without access to store settings.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewEmpName('SOMPLAY Staff');
                  setNewEmpEmail('Mpabpestore1@gmail.com');
                  setNewEmpPassword('');
                  setEmployeeError('');
                  setEmployeeSuccess('');
                  setIsAddEmployeeModalOpen(true);
                }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add First Employee (Mpabpestore1@gmail.com)</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {employees.map((emp) => {
                const isActive = emp.isActive !== false;
                return (
                  <div
                    key={emp.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        profilePhotoUrl={emp.profilePhotoUrl}
                        name={emp.name}
                        email={emp.email}
                        size="lg"
                        interactive
                        onClick={() => {
                          if (emp.profilePhotoUrl) {
                            setPreviewPhoto({ url: emp.profilePhotoUrl, name: emp.name });
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {emp.name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isActive ? t('employeeStatusActive') : t('employeeStatusInactive')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                          {emp.email}
                        </p>

                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                          <span>Role: <strong>Employee</strong></span>
                          <span>·</span>
                          <span>
                            {new Date(emp.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        {emp.profilePhotoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto({ url: emp.profilePhotoUrl || '', name: emp.name })}
                            className="text-red-600 hover:underline font-medium cursor-pointer"
                          >
                            {t('viewPhotoFull')}
                          </button>
                        ) : (
                          'Default Avatar'
                        )}
                      </span>

                      <button
                        onClick={() => handleToggleEmployeeStatus(emp)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-red-50 hover:bg-red-100 text-red-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>{t('deactivateBtn')}</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t('activateBtn')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Modal (Confirm & Complete / Reject) */}
      {selectedOrderForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">
                {actionType === 'complete' ? t('confirmPaymentModalTitle') : t('rejectOrderBtn')}
              </h3>
              <button
                onClick={() => setSelectedOrderForAction(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>Order: <strong className="font-mono text-slate-900">{selectedOrderForAction.id}</strong></div>
                <div>PUBG Player UID: <strong className="font-mono text-slate-900">{selectedOrderForAction.pubgId}</strong></div>
                <div>Amount: <strong className="text-slate-900">${selectedOrderForAction.priceUsd.toFixed(2)} USD</strong></div>
                <div>Sender Phone: <strong className="font-mono text-slate-900">{selectedOrderForAction.senderPhone || 'N/A'}</strong></div>
              </div>

              {actionType === 'complete' ? (
                <>
                  <p className="text-slate-600">{t('confirmPaymentHelp')}</p>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Admin Confirmation Note
                    </label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={t('adminNotePlaceholder')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>

                  {/* PEP AWARD GUARANTEE NOTICE */}
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      {t('awardPepNote', { points: selectedOrderForAction.pepPointsAmount })}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('rejectionReasonLabel')}
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t('rejectionReasonPlaceholder')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      required
                    />
                  </div>
                </>
              )}

              {actionError && (
                <p className="text-red-600 font-bold bg-red-50 p-2 rounded">
                  {actionError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForAction(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleConfirmOrderAction}
                  className={`px-4 py-2 font-bold rounded-lg text-white transition-colors cursor-pointer ${
                    actionType === 'complete'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessingAction ? 'Processing...' : actionType === 'complete' ? 'Confirm & Credit UC' : 'Reject Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Add / Edit Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">
                {editingPackage ? t('editPackageTitle') : t('addPackageBtn')}
              </h3>
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('packageNameLabel')}</label>
                <input
                  type="text"
                  value={pkgFormName}
                  onChange={(e) => setPkgFormName(e.target.value)}
                  placeholder="e.g. 60 UC or 300 + 25 UC"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ucAmountLabel')}</label>
                  <input
                    type="number"
                    value={pkgFormUc}
                    onChange={(e) => setPkgFormUc(e.target.value)}
                    placeholder="e.g. 600"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('bonusUcLabel')}</label>
                  <input
                    type="number"
                    value={pkgFormBonus}
                    onChange={(e) => setPkgFormBonus(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('priceUsdLabel')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pkgFormPrice}
                    onChange={(e) => setPkgFormPrice(e.target.value)}
                    placeholder="e.g. 9.99"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('badgeLabel')}</label>
                  <input
                    type="text"
                    value={pkgFormBadge}
                    onChange={(e) => setPkgFormBadge(e.target.value)}
                    placeholder="e.g. Most Popular"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgFormActive}
                  onChange={(e) => setPkgFormActive(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span>{t('activeSwitchLabel')}</span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                >
                  {t('savePackageBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screenshot Lightbox */}
      {viewScreenshotUrl && (
        <div
          onClick={() => setViewScreenshotUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-xl max-h-[90vh] overflow-hidden rounded-xl bg-white p-2">
            <img
              src={viewScreenshotUrl}
              alt="Receipt zoom"
              className="w-full h-auto object-contain max-h-[80vh] rounded"
            />
          </div>
        </div>
      )}

      {/* Add New Employee Modal */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display">
                    {t('addEmployeeBtn')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Register a new staff member with employee role
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEmployeeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('employeeNameLabel')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="e.g. Ahmed Ali or Support Agent 1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {t('employeeEmailLabel')} <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewEmpEmail('Mpabpestore1@gmail.com')}
                    className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    Use Mpabpestore1@gmail.com
                  </button>
                </div>
                <input
                  type="email"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  placeholder="e.g. Mpabpestore1@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('initialPasswordLabel')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={newEmpPassword}
                  onChange={(e) => setNewEmpPassword(e.target.value)}
                  placeholder="•••••••• (minimum 6 characters)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  minLength={6}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The employee can later change their password securely in their Profile Settings.
                </p>
              </div>

              {employeeError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold text-xs leading-relaxed">
                  {employeeError}
                </div>
              )}

              {employeeSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{employeeSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmployee}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEmployee ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Profile Photo Viewer Modal (WhatsApp Style) */}
      <ProfilePhotoViewerModal
        isOpen={Boolean(previewPhoto?.url)}
        photoUrl={previewPhoto?.url || null}
        name={previewPhoto?.name || 'Photo'}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  );
};
