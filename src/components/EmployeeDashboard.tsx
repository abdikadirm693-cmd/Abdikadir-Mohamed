import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  Lock,
  User as UserIcon,
  Camera,
  Trash2,
  Check,
  X,
  Search,
  ExternalLink,
  Shield,
  Eye,
  KeyRound,
  AlertCircle,
  Copy,
  RefreshCw,
  Filter,
  AlertTriangle,
  Smartphone,
  Gamepad2,
  CreditCard,
  FileText,
  CheckCheck,
  ArrowRight,
  TrendingUp,
  Users,
  Coins,
  Mail,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Order, EmployeeCustomer } from '../types/index.ts';
import { UserAvatar } from './UserAvatar.tsx';
import { ProfilePhotoViewerModal } from './ProfilePhotoViewerModal.tsx';

interface EmployeeDashboardProps {
  onBackToApp: () => void;
}

interface EmployeeStats {
  orderCounts: {
    lastHour: number;
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
    pending: number;
    total: number;
  };
  visitorCounts: {
    lastHour: number;
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
  };
}

function formatOrderTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onBackToApp }) => {
  const {
    user,
    updateProfile,
    changePassword,
    uploadProfilePhoto,
    removeProfilePhoto,
    authFetch,
  } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'station' | 'customers' | 'settings'>('station');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<EmployeeCustomer[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [copiedCustPubgId, setCopiedCustPubgId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'failed' | 'incomplete'>('all');

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedPubgId, setCopiedPubgId] = useState(false);
  const [copiedSenderPhone, setCopiedSenderPhone] = useState(false);

  // Order Processing Action State
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [processError, setProcessError] = useState('');
  const [processSuccess, setProcessSuccess] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [staffNoteInput, setStaffNoteInput] = useState('');

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Photo Upload State
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');

  // WhatsApp-style Photo Viewer
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null);

  // Screenshot Lightbox
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  // Fetch orders and customers from employee endpoints
  const fetchEmployeeData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoadingOrders(true);
    else setIsRefreshing(true);

    try {
      const [ordersRes, statsRes, custRes] = await Promise.all([
        authFetch('/api/employee/orders'),
        authFetch('/api/employee/stats'),
        authFetch('/api/employee/customers'),
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData.customers || []);
      }
    } catch (err) {
      console.error('Failed to load employee data:', err);
    } finally {
      setIsLoadingOrders(false);
      setIsRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // Select order and reset action inputs
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setStaffNoteInput(order.adminNote || '');
    setRejectionReasonInput(order.rejectionReason || '');
    setShowRejectForm(false);
    setProcessError('');
    setProcessSuccess('');
    setCopiedOrderId(false);
    setCopiedPubgId(false);
    setCopiedSenderPhone(false);
  };

  // Copy helper with feedback
  const handleCopyText = (text: string, type: 'orderId' | 'pubgId' | 'senderPhone') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'orderId') {
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } else if (type === 'pubgId') {
      setCopiedPubgId(true);
      setTimeout(() => setCopiedPubgId(false), 2000);
    } else if (type === 'senderPhone') {
      setCopiedSenderPhone(true);
      setTimeout(() => setCopiedSenderPhone(false), 2000);
    }
  };

  // Order processing actions: Complete / Reject / Update Note
  const handleProcessOrderStatus = async (newStatus: 'completed' | 'failed' | 'pending') => {
    if (!selectedOrder) return;

    if (newStatus === 'failed' && !rejectionReasonInput.trim()) {
      setProcessError('A rejection reason is required to reject an order.');
      return;
    }

    setIsProcessingOrder(true);
    setProcessError('');
    setProcessSuccess('');

    try {
      const body: any = {
        status: newStatus,
        adminNote: staffNoteInput.trim() || undefined,
      };
      if (newStatus === 'failed') {
        body.rejectionReason = rejectionReasonInput.trim();
      }

      const res = await authFetch(`/api/employee/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order status');
      }

      setSelectedOrder(data.order);
      setProcessSuccess(
        newStatus === 'completed'
          ? 'Order marked as Completed & PEP points awarded!'
          : newStatus === 'failed'
          ? 'Order marked as Rejected with reason saved.'
          : 'Order updated successfully.'
      );
      setShowRejectForm(false);

      // Update in local orders array
      setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      // Quietly refresh stats
      fetchEmployeeData(true);
    } catch (err: any) {
      setProcessError(err.message || 'Error processing order');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  // Save Staff Note only
  const handleSaveStaffNote = async () => {
    if (!selectedOrder) return;
    setIsProcessingOrder(true);
    setProcessError('');
    setProcessSuccess('');

    try {
      const res = await authFetch(`/api/employee/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedOrder.status,
          adminNote: staffNoteInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save staff note');
      }

      setSelectedOrder(data.order);
      setProcessSuccess('Staff note saved successfully.');
      setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
    } catch (err: any) {
      setProcessError(err.message || 'Error saving note');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setIsUpdatingName(true);
    setNameError('');
    setNameSuccess(false);

    const res = await updateProfile({ name: displayName.trim() });
    setIsUpdatingName(false);
    if (res.success) {
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } else {
      setNameError(res.error || 'Failed to update name');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (res.success) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } else {
      setPasswordError(res.error || 'Failed to update password');
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setPhotoMessage('');

    const res = await uploadProfilePhoto(file);
    setIsUploadingPhoto(false);

    if (res.success) {
      setPhotoMessage(t('photoUpdatedSuccess'));
      setTimeout(() => setPhotoMessage(''), 3000);
    } else {
      setPhotoMessage(res.error || 'Failed to upload photo');
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setIsUploadingPhoto(true);
    const res = await removeProfilePhoto();
    setIsUploadingPhoto(false);
    if (res.success) {
      setPhotoMessage('Profile photo removed.');
      setTimeout(() => setPhotoMessage(''), 3000);
    }
  };

  // Filtered orders for Gmail-style inbox
  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        o.id.toLowerCase().includes(q) ||
        o.pubgId.toLowerCase().includes(q) ||
        (o.pubgNickname && o.pubgNickname.toLowerCase().includes(q)) ||
        o.userEmail.toLowerCase().includes(q) ||
        o.userName.toLowerCase().includes(q) ||
        (o.senderPhone && o.senderPhone.toLowerCase().includes(q)) ||
        o.packageName.toLowerCase().includes(q)
      );
    }
    return true;
  });

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

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="space-y-5 pb-12">
      {/* Employee Top Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <UserAvatar
            profilePhotoUrl={user?.profilePhotoUrl}
            name={user?.name || 'Staff Member'}
            email={user?.email}
            size="lg"
            interactive
            onClick={() => {
              if (user?.profilePhotoUrl) {
                setPreviewPhoto({ url: user.profilePhotoUrl, name: user.name });
              }
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg font-display">
                {user?.name || 'Staff Member'}
              </h2>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-500/40 uppercase">
                Employee Workstation
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-500/40 uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {user?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab(activeTab === 'station' ? 'settings' : 'station')}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            {activeTab === 'station' ? t('settingsProfileTitle') : 'Workstation'}
          </button>
          <button
            onClick={onBackToApp}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Storefront
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('station')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'station'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Staff Workstation & Order Inbox</span>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'customers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customers ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>{t('settingsProfileTitle')}</span>
        </button>
      </div>

      {/* ================= TAB 1: WORKSTATION & GMAIL-STYLE INBOX ================= */}
      {activeTab === 'station' && (
        <div className="space-y-4">
          {/* Real Statistics Overview Grid (Strictly no registered user counts or sales revenue) */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Orders (Past 1h / 24h)
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  {stats.orderCounts.lastHour} <span className="text-xs text-slate-400 font-normal">/ {stats.orderCounts.lastDay} today</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  7d: {stats.orderCounts.lastWeek} · 30d: {stats.orderCounts.lastMonth}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  Pending Verification
                </span>
                <div className="text-base sm:text-lg font-black text-amber-600 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>{stats.orderCounts.pending} Orders</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Awaiting staff confirmation
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Store Visitors (24h)
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  {stats.visitorCounts.lastDay}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  1h: {stats.visitorCounts.lastHour} · 7d: {stats.visitorCounts.lastWeek}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Visitors (30 Days)
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>{stats.visitorCounts.lastMonth}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Total store traffic
                </div>
              </div>
            </div>
          )}

          {/* Professional Gmail-Style Employee Order Inbox */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Inbox Top Bar: Search, Filters, and Refresh */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 font-display flex items-center gap-2">
                  <span>Order Processing Inbox</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                    {filteredOrders.length}
                  </span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search UID, Order ID, Phone..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  {(['all', 'pending', 'completed', 'failed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setOrderFilter(status)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                        orderFilter === status
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  ))}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => fetchEmployeeData(true)}
                  disabled={isRefreshing}
                  title="Refresh order inbox"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl border border-slate-200 bg-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Gmail-Style Vertically Stacked Order Rows */}
            {isLoadingOrders ? (
              <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                <span>Loading real-time order records...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">No orders found</p>
                <p className="text-xs text-slate-400">
                  {searchQuery || orderFilter !== 'all'
                    ? 'Try clearing the search query or changing the filter.'
                    : 'Customer orders will appear here in real time as they are placed.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => {
                  const isPending = ord.status === 'pending';
                  const isSelected = selectedOrder?.id === ord.id;

                  return (
                    <div
                      key={ord.id}
                      onClick={() => handleSelectOrder(ord)}
                      className={`group p-3 sm:px-4 sm:py-3.5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 ${
                        isSelected
                          ? 'bg-red-50/50 border-l-4 border-l-red-600'
                          : isPending
                          ? 'bg-amber-50/40 border-l-4 border-l-amber-500 font-medium'
                          : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Left Side: Order ID, Player UID, Status */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        {/* Status Icon */}
                        <div className="mt-0.5 sm:mt-0 flex-shrink-0">
                          {ord.status === 'completed' ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" title="Completed" />
                          ) : ord.status === 'pending' ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" title="Pending Verification" />
                          ) : ord.status === 'failed' ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" title="Failed / Rejected" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" title="Incomplete" />
                          )}
                        </div>

                        {/* Order & Customer Identity */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-red-600 transition-colors">
                              {ord.id}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                ord.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'pending'
                                  ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                                  : ord.status === 'failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {ord.status}
                            </span>
                            {ord.senderPhone && (
                              <span className="text-[11px] font-mono font-extrabold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                📞 {ord.senderPhone}
                              </span>
                            )}
                          </div>

                          {/* Preview snippet: PUBG ID, package name, user */}
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate">
                            <span className="text-slate-800 font-semibold">
                              UID: <strong className="font-mono text-slate-900">{ord.pubgId}</strong>
                              {ord.pubgNickname ? ` (${ord.pubgNickname})` : ''}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span>
                              {ord.packageName} ({ord.totalUc} {ord.currencyType === 'wow_coin' || ord.packageName.toLowerCase().includes('wow') ? 'WOW Coin' : 'UC'})
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-600">{ord.walletName}</span>
                            {(ord.isPepRedemption || ord.walletId === 'pep_rewards') && (
                              <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                                PEP Reward Order
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Price, Time, and Action Prompt */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 text-right flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div>
                          <div className="text-sm font-black text-slate-900 font-display">
                            {ord.isPepRedemption || ord.walletId === 'pep_rewards' ? (
                              <span className="text-amber-600">{ord.pepSpent || Math.round(ord.priceUsd * 100)} PEP</span>
                            ) : (
                              `$${ord.priceUsd.toFixed(2)}`
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatOrderTime(ord.createdAt)}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 group-hover:text-red-600 bg-slate-100 group-hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB: FULFILLED CUSTOMERS (CUSTOMER SUPPORT VIEW) ================= */}
      {/* STRICT PRIVACY RULE: Support view only. Absolutely NO financial metrics, revenue, or total spent exposed! */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Top Bar: Search and Summary */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers by name, email, phone, or PUBG UID..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white shadow-xs"
              />
              {customerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCustomerSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => fetchEmployeeData(true)}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                title="Refresh customer records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Support Metrics Bar (Strictly non-financial) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Fulfilled Customers
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 font-display">
                {customers.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Verified game top-up accounts
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Completed Top-Ups
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-600 font-display">
                {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Total delivered orders
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Support Registry
              </span>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Care & Lookup</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                PUBG UID & order verification
              </div>
            </div>
          </div>

          {/* Customers Cards Grid or States */}
          {isLoadingOrders ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-red-600 mx-auto" />
              <p className="font-semibold text-slate-700">Loading fulfilled customer records...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">
                {customerSearchQuery ? 'No matching customers found' : 'No Fulfilled Customers Yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {customerSearchQuery
                  ? `No customer matches "${customerSearchQuery}". Try searching with a different name, email, phone number, or PUBG Player UID.`
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

                      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono truncate mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </div>

                      {cust.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono truncate mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{cust.phone}</span>
                        </div>
                      )}

                      <div className="mt-1.5 flex items-center gap-1.5 text-amber-800 font-bold text-[11px]">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>{cust.pepPoints || 0} PEP Points</span>
                      </div>
                    </div>
                  </div>

                  {/* PUBG Game Identifier Details for Staff Verification */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3 text-slate-400" />
                        <span>Saved PUBG UID:</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900">
                          {cust.savedPubgId || 'Not set'}
                        </span>
                        {cust.savedPubgId && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cust.savedPubgId);
                              setCopiedCustPubgId(cust.savedPubgId);
                              setTimeout(() => setCopiedCustPubgId(null), 2000);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                            title="Copy PUBG UID for game client fulfillment"
                          >
                            {copiedCustPubgId === cust.savedPubgId ? (
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
                        <span className="text-slate-500">PUBG Nickname:</span>
                        <span className="font-semibold text-slate-800">{cust.savedPubgNickname}</span>
                      </div>
                    )}
                  </div>

                  {/* Fulfillment History Dates & Order Lookup */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      <span>First: {new Date(cust.firstOrderAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="mx-1.5">·</span>
                      <span>Last: {new Date(cust.lastOrderAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(cust.email);
                        setActiveTab('station');
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer flex items-center gap-0.5"
                      title="View all orders from this customer in the Workstation Inbox"
                    >
                      <span>Orders</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: MY PROFILE & SETTINGS ================= */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          {/* Profile Photo Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 font-display pb-2 border-b border-slate-100">
              Profile Photo
            </h3>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative group">
                <UserAvatar
                  profilePhotoUrl={user?.profilePhotoUrl}
                  name={user?.name}
                  email={user?.email}
                  size="2xl"
                  interactive
                  onClick={() => {
                    if (user?.profilePhotoUrl) {
                      setPreviewPhoto({ url: user.profilePhotoUrl, name: user.name });
                    }
                  }}
                />
                {user?.profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto({ url: user.profilePhotoUrl || '', name: user.name })}
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h4 className="font-bold text-xs text-slate-800">Circular Avatar</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a clean JPG, PNG, WEBP, or GIF (max 5MB). Tap your avatar to preview in full-screen WhatsApp mode. Photos are saved persistently in Supabase Storage.
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{user?.profilePhotoUrl ? t('replacePhotoBtn') : t('uploadPhotoBtn')}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handlePhotoFileChange}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>

                  {user?.profilePhotoUrl && (
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={handleRemovePhoto}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('removePhotoBtn')}</span>
                    </button>
                  )}
                </div>

                {photoMessage && (
                  <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg inline-block">
                    {photoMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Display Name & Email Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 font-display pb-2 border-b border-slate-100">
              Personal Information
            </h3>

            <form onSubmit={handleSaveDisplayName} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name or handle"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Employee Email Address
                  </label>
                  <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Non-editable
                  </span>
                </div>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono text-xs cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Official employee emails (including Mpabpestore1@gmail.com) are permanent and cannot be modified.
                </p>
              </div>

              {nameError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {nameError}
                </div>
              )}

              {nameSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Display name saved successfully.</span>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingName}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isUpdatingName ? 'Saving...' : t('save')}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 font-display pb-2 border-b border-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-red-600" />
              <span>{t('changePasswordTitle')}</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('currentPasswordLabel')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('newPasswordLabel')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('confirmNewPasswordLabel')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{t('passwordChangedSuccess')}</span>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isChangingPassword ? 'Updating...' : t('changePasswordTitle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ORDER DETAILS INSPECTION MODAL ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-black text-sm sm:text-base truncate">
                      {selectedOrder.id}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedOrder.id, 'orderId')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedOrderId ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-300" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Created: {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 text-xs">
              {/* Status & Alerts Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-600">Current Order Status:</span>
                <span
                  className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wide ${
                    selectedOrder.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                      : selectedOrder.status === 'pending'
                      ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300 animate-pulse'
                      : selectedOrder.status === 'failed'
                      ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {selectedOrder.status}
                </span>
              </div>

              {processSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{processSuccess}</span>
                </div>
              )}

              {processError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{processError}</span>
                </div>
              )}

              {/* CRITICAL REQUIREMENT: SENDER'S PAYMENT PHONE NUMBER IN LARGE, BOLD, RED TEXT */}
              <div className="bg-red-50/60 border-2 border-red-300 rounded-2xl p-4 text-center space-y-1.5 shadow-xs">
                <span className="text-[11px] font-black text-red-700 uppercase tracking-widest block">
                  Sender&apos;s Payment Phone Number
                </span>
                <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-wider py-1">
                  {selectedOrder.senderPhone ? selectedOrder.senderPhone : 'Not Submitted Yet'}
                </div>
                {selectedOrder.senderPhone && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedOrder.senderPhone || '', 'senderPhone')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedSenderPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Phone Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Phone Number</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Distinct Game & Player Details Card */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-blue-950 text-xs">PUBG Mobile Player UID</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-700 uppercase bg-blue-100 px-2 py-0.5 rounded">
                    Direct UID Top-Up
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-wider">
                      {selectedOrder.pubgId}
                    </div>
                    {selectedOrder.pubgNickname && (
                      <div className="text-xs text-slate-600 mt-0.5">
                        In-Game Nickname: <strong className="text-slate-900">{selectedOrder.pubgNickname}</strong>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedOrder.pubgId, 'pubgId')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    {copiedPubgId ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>UID Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy PUBG Player ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Package & Payment Ledger Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Package Info */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Package Ordered
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedOrder.packageName}
                  </div>
                  <div className="text-xs text-slate-600">
                    Base: {selectedOrder.ucAmount} {selectedOrder.currencyType === 'wow_coin' || selectedOrder.packageName.toLowerCase().includes('wow') ? 'WOW Coin' : 'UC'}
                    {selectedOrder.bonusUc > 0 && ` + ${selectedOrder.bonusUc} Bonus`}
                  </div>
                  <div className="text-xs font-extrabold text-red-600 pt-1">
                    Total: {selectedOrder.totalUc} {selectedOrder.currencyType === 'wow_coin' || selectedOrder.packageName.toLowerCase().includes('wow') ? 'WOW Coin' : 'UC'}
                  </div>
                </div>

                {/* Wallet & Amount */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Payment Method
                  </span>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{selectedOrder.walletName}</span>
                    {(selectedOrder.isPepRedemption || selectedOrder.walletId === 'pep_rewards') && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                        PEP Points
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    Merchant Number: <span className="font-mono">{selectedOrder.merchantNumber || 'N/A'}</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 pt-1 font-display">
                    {(selectedOrder.isPepRedemption || selectedOrder.walletId === 'pep_rewards') ? (
                      <span className="text-amber-600 font-mono">
                        Redeemed with {selectedOrder.pepSpent || Math.round(selectedOrder.priceUsd * 100)} PEP ($0.00 cash expected)
                      </span>
                    ) : (
                      `$${selectedOrder.priceUsd.toFixed(2)} USD`
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Account Details */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Information
                </span>
                <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1">
                  <div>
                    <span className="text-slate-500">Name:</span> <strong className="text-slate-900">{selectedOrder.userName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span> <span className="font-mono text-slate-700">{selectedOrder.userEmail}</span>
                  </div>
                  {selectedOrder.userPhone && (
                    <div>
                      <span className="text-slate-500">Registered Phone:</span> <span className="font-mono text-slate-700">{selectedOrder.userPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Screenshot Preview (if provided) */}
              {selectedOrder.receiptScreenshot && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Payment Receipt Proof
                  </span>
                  <div className="relative group inline-block">
                    <img
                      src={selectedOrder.receiptScreenshot}
                      alt="Payment Receipt"
                      className="max-h-48 rounded-lg border border-slate-200 object-contain bg-white cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setViewScreenshotUrl(selectedOrder.receiptScreenshot || null)}
                    />
                    <button
                      type="button"
                      onClick={() => setViewScreenshotUrl(selectedOrder.receiptScreenshot || null)}
                      className="mt-1 text-xs text-red-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Click to enlarge screenshot</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Rejection Reason Display */}
              {selectedOrder.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1">
                  <span className="font-bold text-xs uppercase tracking-wide text-rose-800">
                    Rejection Reason
                  </span>
                  <p className="text-xs leading-relaxed">{selectedOrder.rejectionReason}</p>
                </div>
              )}

              {/* Staff Notes Form */}
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-slate-700">
                  Staff Processing Notes
                </label>
                <textarea
                  value={staffNoteInput}
                  onChange={(e) => setStaffNoteInput(e.target.value)}
                  placeholder="Internal notes regarding payment confirmation, USSD reference, or verification details..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 text-xs"
                  rows={2}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isProcessingOrder}
                    onClick={handleSaveStaffNote}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Order Status Action Buttons */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Process Order Status:
                </span>

                {showRejectForm ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
                    <label className="block font-bold text-xs text-rose-950">
                      Rejection Reason (Required) <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      placeholder="e.g. Payment not received in Zaad wallet, invalid sender phone, or insufficient amount..."
                      className="w-full p-2.5 rounded-lg border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-xs"
                      rows={2}
                      required
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingOrder || !rejectionReasonInput.trim()}
                        onClick={() => handleProcessOrderStatus('failed')}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedOrder.status !== 'completed' && (
                      <button
                        type="button"
                        disabled={isProcessingOrder}
                        onClick={() => handleProcessOrderStatus('completed')}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Confirm Payment & Complete Top-Up</span>
                      </button>
                    )}

                    {selectedOrder.status !== 'failed' && (
                      <button
                        type="button"
                        disabled={isProcessingOrder}
                        onClick={() => setShowRejectForm(true)}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Reject Order</span>
                      </button>
                    )}

                    {selectedOrder.status !== 'pending' && (
                      <button
                        type="button"
                        disabled={isProcessingOrder}
                        onClick={() => handleProcessOrderStatus('pending')}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                      >
                        Re-open as Pending
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Screenshot Lightbox */}
      {viewScreenshotUrl && (
        <div
          onClick={() => setViewScreenshotUrl(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={viewScreenshotUrl}
              alt="Payment receipt enlarged"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setViewScreenshotUrl(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-900 rounded-full shadow-lg font-bold hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Profile Photo Viewer Modal */}
      <ProfilePhotoViewerModal
        isOpen={Boolean(previewPhoto?.url)}
        photoUrl={previewPhoto?.url || null}
        name={previewPhoto?.name || 'Photo'}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  );
};
