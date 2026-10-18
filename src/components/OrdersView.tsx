import React, { useState } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PlayCircle,
  Coins,
  ChevronRight,
  Eye,
  X,
  Phone,
  User as UserIcon,
  Copy,
  Check,
  Briefcase,
  AlertTriangle,
  Gamepad2,
  FileText,
} from 'lucide-react';
import { Order, OrderStatus } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface OrdersViewProps {
  orders: Order[];
  isLoading: boolean;
  onResumeOrder: (order: Order) => void;
  onRefresh: () => void;
  onNavigateToTopUp: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  isLoading,
  onResumeOrder,
  onRefresh,
  onNavigateToTopUp,
}) => {
  const { t } = useLanguage();
  const { user, authFetch } = useAuth();
  const isStaff = user?.role === 'employee' || user?.role === 'admin';

  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Copy helper state
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedPubgId, setCopiedPubgId] = useState(false);
  const [copiedSenderPhone, setCopiedSenderPhone] = useState(false);

  // Staff processing state inside modal
  const [isProcessing, setIsProcessing] = useState(false);
  const [staffNoteInput, setStaffNoteInput] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [processMessage, setProcessMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Strictly filter out incomplete / abandoned drafts from employee queues
  const visibleOrders = isStaff
    ? orders.filter((o) => o.status !== 'incomplete')
    : orders;

  const filteredOrders = visibleOrders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

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

  const handleOpenOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setStaffNoteInput(order.adminNote || '');
    setRejectionReasonInput(order.rejectionReason || '');
    setShowRejectForm(false);
    setProcessMessage(null);
    setCopiedOrderId(false);
    setCopiedPubgId(false);
    setCopiedSenderPhone(false);
  };

  const handleStaffProcessOrder = async (newStatus: 'completed' | 'failed') => {
    if (!selectedOrder) return;
    if (newStatus === 'failed' && !rejectionReasonInput.trim()) {
      setProcessMessage({ type: 'error', text: 'Rejection reason is required.' });
      return;
    }

    setIsProcessing(true);
    setProcessMessage(null);

    try {
      const endpoint = user?.role === 'admin'
        ? `/api/admin/orders/${selectedOrder.id}`
        : `/api/employee/orders/${selectedOrder.id}`;

      const res = await authFetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminNote: staffNoteInput.trim() || undefined,
          rejectionReason: newStatus === 'failed' ? rejectionReasonInput.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      setSelectedOrder(data.order);
      setProcessMessage({
        type: 'success',
        text: newStatus === 'completed' ? 'Order verified and completed successfully!' : 'Order rejected.',
      });
      onRefresh();
    } catch (err: any) {
      setProcessMessage({ type: 'error', text: err.message || 'Error processing order' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('statusCompletedText')}</span>
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('statusPendingText')}</span>
          </span>
        );
      case 'incomplete':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('statusIncompleteText')}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>{t('statusFailedText')}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">
              {isStaff ? 'Employee Customer Orders Queue' : t('myOrdersTitle')}
            </h2>
            {user?.role === 'employee' && (
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 uppercase">
                Staff View
              </span>
            )}
            {user?.role === 'admin' && (
              <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase">
                Admin View
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isStaff
              ? 'Customer-submitted orders awaiting verification and processing (Drafts excluded)'
              : t('myOrdersSubtitle')}
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Filter Tabs (Interactive Segmented Control) */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('filterAll')} ({visibleOrders.length})
        </button>

        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'pending'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('filterPending')} ({visibleOrders.filter((o) => o.status === 'pending').length})
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'completed'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('filterCompleted')} ({visibleOrders.filter((o) => o.status === 'completed').length})
        </button>

        {/* Incomplete drafts are only shown to customers for checkout resuming */}
        {!isStaff && (
          <button
            onClick={() => setFilter('incomplete')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'incomplete'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('filterIncomplete')} ({visibleOrders.filter((o) => o.status === 'incomplete').length})
          </button>
        )}

        <button
          onClick={() => setFilter('failed')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'failed'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('filterFailed')} ({visibleOrders.filter((o) => o.status === 'failed').length})
        </button>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          {t('loading')}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            {isStaff ? 'No customer submitted orders found in this filter.' : t('noOrders')}
          </p>
          {!isStaff && (
            <button
              onClick={onNavigateToTopUp}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Top-Up PUBG Now</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-white border rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all text-left ${
                order.status === 'pending' ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              {/* Order Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {order.id}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isStaff && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span>{order.userName}</span>
                        <span className="text-slate-400 font-mono text-[10px]">({order.userEmail})</span>
                      </span>
                    </>
                  )}
                </div>

                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Order Body */}
              <div className="py-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-extrabold text-base text-slate-900 font-display">
                      {order.totalUc} {order.currencyType === 'wow_coin' || order.packageName.toLowerCase().includes('wow') ? 'WOW Coin' : 'UC'}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({order.packageName})
                    </span>
                    {(order.isPepRedemption || order.walletId === 'pep_rewards') && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded">
                        PEP Reward
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>
                      UID: <strong className="font-mono text-slate-800">{order.pubgId}</strong>
                    </span>
                    {order.pubgNickname && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{order.pubgNickname}</span>
                      </>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{order.walletName}</span>
                  </div>

                  {/* Prominent Payment Sender Phone (Critical for Staff verification) */}
                  {order.senderPhone && (
                    <div className="pt-1 flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">Sender Phone:</span>
                      <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {order.senderPhone}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-black text-base text-slate-900 font-display">
                    ${order.priceUsd.toFixed(2)}
                  </span>
                  {order.pepAwarded && (
                    <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-amber-600 mt-0.5">
                      <Coins className="w-3 h-3" />
                      <span>+{order.pepPointsAmount} PEP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Footer Actions */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenOrderModal(order)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isStaff ? 'Inspect Order Details' : t('orderDetailsTitle')}</span>
                </button>

                {/* For Customers: Allow resuming incomplete order */}
                {!isStaff && order.status === 'incomplete' && (
                  <button
                    onClick={() => onResumeOrder(order)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{t('resumePayment')}</span>
                  </button>
                )}

                {/* Staff Quick Action Button */}
                {isStaff && order.status === 'pending' && (
                  <button
                    onClick={() => handleOpenOrderModal(order)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Verify & Process</span>
                  </button>
                )}

                {order.status === 'completed' && order.adminNote && (
                  <span className="text-[11px] text-emerald-700 font-medium truncate max-w-[200px]">
                    ✓ {order.adminNote}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details & Staff Verification Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm font-display flex items-center gap-2">
                  <span>{isStaff ? 'Staff Order Verification' : t('orderDetailsTitle')}</span>
                  {selectedOrder.status === 'pending' && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      Action Required
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-300 font-mono">{selectedOrder.id}</span>
                  <button
                    onClick={() => handleCopyText(selectedOrder.id, 'orderId')}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Order ID"
                  >
                    {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Process Feedback Message */}
              {processMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    processMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}
                >
                  {processMessage.text}
                </div>
              )}

              {/* Status Header */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">{t('statusLabel')}</span>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>

              {/* Customer Information (Staff View) */}
              {isStaff && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Customer Account Information</span>
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name:</span>
                      <span className="font-bold text-slate-900">{selectedOrder.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-mono text-slate-900">{selectedOrder.userEmail}</span>
                    </div>
                    {selectedOrder.userPhone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account Phone:</span>
                        <span className="font-mono text-slate-900">{selectedOrder.userPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Package Details */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  {t('packagesTitle')}
                </h4>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Package:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.packageName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Units Delivered:</span>
                    <span className="font-bold text-red-600">
                      {selectedOrder.totalUc} {selectedOrder.currencyType === 'wow_coin' || selectedOrder.packageName.toLowerCase().includes('wow') ? 'WOW Coin' : 'UC'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount / Method:</span>
                    <span className="font-extrabold text-slate-900">
                      {selectedOrder.isPepRedemption || selectedOrder.walletId === 'pep_rewards'
                        ? `${selectedOrder.pepSpent || Math.round(selectedOrder.priceUsd * 100)} PEP (Paid with Points)`
                        : `$${selectedOrder.priceUsd.toFixed(2)} USD`}
                    </span>
                  </div>
                </div>
              </div>

              {/* PUBG Player Details */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>{t('pubgDetailsLabel')}</span>
                  <button
                    onClick={() => handleCopyText(selectedOrder.pubgId, 'pubgId')}
                    className="text-red-600 hover:text-red-700 font-bold inline-flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    {copiedPubgId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPubgId ? 'UID Copied!' : 'Copy UID'}</span>
                  </button>
                </h4>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Player UID:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedOrder.pubgId}
                    </span>
                  </div>
                  {selectedOrder.pubgNickname && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nickname:</span>
                      <span className="font-bold text-slate-900">{selectedOrder.pubgNickname}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>{t('paymentDetailsLabel')}</span>
                  {selectedOrder.senderPhone && (
                    <button
                      onClick={() => handleCopyText(selectedOrder.senderPhone || '', 'senderPhone')}
                      className="text-red-600 hover:text-red-700 font-bold inline-flex items-center gap-1 cursor-pointer text-[10px]"
                    >
                      {copiedSenderPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSenderPhone ? 'Phone Copied!' : 'Copy Phone'}</span>
                    </button>
                  )}
                </h4>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Wallet:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.walletName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Merchant Number:</span>
                    <span className="font-mono text-slate-900">{selectedOrder.merchantNumber}</span>
                  </div>
                  {selectedOrder.senderPhone ? (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-slate-700 font-semibold">Payment Sender Phone:</span>
                      <span className="font-mono font-black text-red-600 bg-red-100/70 px-2 py-0.5 rounded border border-red-300 text-xs">
                        {selectedOrder.senderPhone}
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">No sender phone submitted yet (Draft).</div>
                  )}
                </div>
              </div>

              {/* Optional Receipt Screenshot Preview */}
              {selectedOrder.receiptScreenshot && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                    {t('receiptPreviewLabel')}
                  </span>
                  <div className="bg-slate-100 rounded-xl p-2 border border-slate-200 text-center">
                    <img
                      src={selectedOrder.receiptScreenshot}
                      alt="Payment Receipt"
                      className="max-h-52 rounded-lg object-contain mx-auto border border-slate-300 shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Staff / Admin Notes & Rejection Reason */}
              {selectedOrder.adminNote && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="font-bold text-emerald-900 block mb-1">
                    {t('adminNotesLabel')}:
                  </span>
                  <p className="text-emerald-800">{selectedOrder.adminNote}</p>
                </div>
              )}

              {selectedOrder.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="font-bold text-red-900 block mb-1">
                    Rejection Reason:
                  </span>
                  <p className="text-red-800">{selectedOrder.rejectionReason}</p>
                </div>
              )}

              {/* ================= STAFF PROCESSING CONTROLS ================= */}
              {isStaff && selectedOrder.status === 'pending' && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <h5 className="font-bold text-amber-900 text-xs flex items-center gap-1 mb-1">
                      <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                      <span>Employee Order Verification Actions</span>
                    </h5>
                    <p className="text-[11px] text-amber-800">
                      Check your mobile merchant statement for {selectedOrder.senderPhone} and ${selectedOrder.priceUsd.toFixed(2)}.
                      Once verified, transfer UC in PUBG Mobile UID {selectedOrder.pubgId} and click Verify & Complete.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Staff Note / Delivery Confirmation (Optional)
                    </label>
                    <input
                      type="text"
                      value={staffNoteInput}
                      onChange={(e) => setStaffNoteInput(e.target.value)}
                      placeholder="e.g. Midasbuy Voucher #948210 - UC delivered."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  {!showRejectForm ? (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleStaffProcessOrder('completed')}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isProcessing ? 'Processing...' : 'Verify & Complete Top-Up'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRejectForm(true)}
                        disabled={isProcessing}
                        className="py-2.5 px-3.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                      <label className="block font-bold text-red-900 text-xs">
                        Rejection Reason (Required) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        placeholder="e.g. Payment not received in merchant statement / Invalid UID"
                        className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none bg-white"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleStaffProcessOrder('failed')}
                          disabled={isProcessing}
                          className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? 'Rejecting...' : 'Confirm Order Rejection'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRejectForm(false)}
                          disabled={isProcessing}
                          className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Action: Resume Incomplete Order */}
              {!isStaff && selectedOrder.status === 'incomplete' && (
                <button
                  onClick={() => {
                    const ord = selectedOrder;
                    setSelectedOrder(null);
                    onResumeOrder(ord);
                  }}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>{t('resumePayment')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
