import React, { useState, useEffect } from 'react';
import {
  X,
  PhoneCall,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Order, PubgPackage, WalletConfig } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface PaymentModalProps {
  orderToResume?: Order | null;
  newOrderParams?: {
    pkg: PubgPackage;
    pubgId: string;
    pubgNickname: string;
    savePubgId: boolean;
  } | null;
  wallets: WalletConfig[];
  onClose: () => void;
  onOrderCompleted: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  orderToResume,
  newOrderParams,
  wallets,
  onClose,
  onOrderCompleted,
}) => {
  const { t } = useLanguage();
  const { user, authFetch } = useAuth();

  const [currentOrder, setCurrentOrder] = useState<Order | null>(orderToResume || null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('evc_plus');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [receiptScreenshot, setReceiptScreenshot] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [copiedUssd, setCopiedUssd] = useState<boolean>(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  // If orderToResume exists, pre-fill its info
  useEffect(() => {
    if (orderToResume) {
      setCurrentOrder(orderToResume);
      setSelectedWalletId(orderToResume.walletId);
      if (orderToResume.senderPhone) setSenderPhone(orderToResume.senderPhone);
    }
  }, [orderToResume]);

  const activeWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];

  const handleWalletChange = (newWalletId: string) => {
    setSelectedWalletId(newWalletId);
  };

  const orderPrice = orderToResume ? orderToResume.priceUsd : (newOrderParams?.pkg.priceUsd || 0);
  const currentUssd = activeWallet
    ? activeWallet.ussdTemplate
        .replace('{merchant}', activeWallet.merchantNumber || 'TEST_MERCHANT')
        .replace('{amount}', orderPrice.toString())
    : '';

  const handleCopyUssd = () => {
    if (!currentUssd) return;
    navigator.clipboard.writeText(currentUssd);
    setCopiedUssd(true);
    setTimeout(() => setCopiedUssd(false), 2500);
  };

  // Convert uploaded image to Base64 for persistent storage and admin review
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size should be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setReceiptScreenshot(result);
      setScreenshotPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // SUBMIT ORDER ONLY ON "I HAVE PAID" ACTION
  // Required: senderPhone (min 6 digits)
  // Optional: receiptScreenshot
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submittedSuccess) return;

    if (user?.role === 'employee' || user?.role === 'admin') {
      setErrorMsg('Staff and administrator accounts are prohibited from creating customer orders or submitting payments.');
      return;
    }

    const cleanPhone = senderPhone.trim();
    if (!cleanPhone || cleanPhone.length < 6) {
      setErrorMsg('Please enter a valid payment sending phone number (at least 6 digits).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let finalOrder: Order;

      if (orderToResume) {
        // Resuming an existing draft: transition order to 'pending'
        const res = await authFetch(`/api/orders/${orderToResume.id}/submit-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderPhone: cleanPhone,
            receiptScreenshot: receiptScreenshot || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit payment verification');
        }
        finalOrder = data.order;
      } else if (newOrderParams) {
        // Fresh checkout: create order directly as submitted ('pending' verification)
        const res = await authFetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageId: newOrderParams.pkg.id,
            pubgId: newOrderParams.pubgId,
            pubgNickname: newOrderParams.pubgNickname,
            walletId: selectedWalletId,
            savePubgId: newOrderParams.savePubgId,
            senderPhone: cleanPhone,
            receiptScreenshot: receiptScreenshot || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit order');
        }
        finalOrder = data.order;
      } else {
        throw new Error('No order details found.');
      }

      setCurrentOrder(finalOrder);
      setSubmittedSuccess(true);
      onOrderCompleted(finalOrder);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting payment verification');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base font-display">
                {t('paymentTitle')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentOrder ? `Order #${currentOrder.id}` : 'Initializing order...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Staff / Admin Restricted View */}
        {user?.role === 'employee' || user?.role === 'admin' ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 font-display">
                Checkout Restricted for Staff Accounts
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                {user?.role === 'employee'
                  ? 'Employee accounts cannot purchase packages or initiate customer checkout. Please manage customer orders through your Workstation.'
                  : 'Administrator accounts cannot place customer orders through customer checkout.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : submittedSuccess ? (
          /* Success / Pending Verification View */
          <div className="p-5 sm:p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>


            <div>
              <h4 className="text-lg font-bold text-slate-900 font-display">
                {t('statusPendingText')}
              </h4>
              <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                {t('submissionPendingNotice')}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">{currentOrder?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PUBG Player ID:</span>
                <span className="font-mono font-bold text-slate-900">{currentOrder?.pubgId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total UC:</span>
                <span className="font-bold text-red-600">{currentOrder?.totalUc} UC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">${currentOrder?.priceUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sender Phone:</span>
                <span className="font-bold text-slate-900">{currentOrder?.senderPhone}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Go to My Orders
            </button>
          </div>
        ) : (
          /* Payment Flow */
          <div className="p-4 sm:p-5 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Wallet Selection Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {t('selectWallet')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {wallets.map((wallet) => {
                  const isSelected = selectedWalletId === wallet.id;
                  return (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => handleWalletChange(wallet.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-50/50 text-slate-900 ring-1 ring-red-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{wallet.shortName}</div>
                        <div className="text-[10px] font-mono">
                          {wallet.isConfigured && wallet.merchantNumber ? (
                            <span className="text-slate-500">Merchant: {wallet.merchantNumber}</span>
                          ) : (
                            <span className="text-amber-600 font-semibold">Test Mode (Unconfigured)</span>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-red-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MANDATORY SECURITY BANNER */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex gap-2.5 items-start text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t('pinSecurityWarning')}</p>
              </div>
            </div>

            {/* STEP 1: Phone Dialer Action */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span className="font-bold text-xs text-slate-900">
                  {t('paymentStep1')}
                </span>
              </div>

              {(!activeWallet?.isConfigured || !activeWallet?.merchantNumber) && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed">
                  <strong>Test Mode Notice:</strong> This wallet has not yet been assigned an official merchant number by the store owner. Dialing will simulate the USSD flow. The administrator can set live merchant numbers in the Admin Dashboard.
                </div>
              )}

              <div className="bg-white border border-slate-300 rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    USSD Code to Dial:
                  </span>
                  <span className="font-mono font-black text-sm text-slate-900 tracking-wider">
                    {currentUssd || 'Loading USSD...'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyUssd}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedUssd ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct Phone Dialer Button: Encodes '#' as '%23' for browser tel links */}
              {currentUssd && (
                <a
                  href={`tel:${encodeURIComponent(currentUssd)}`}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{t('openDialerBtn')}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              )}
            </div>

            {/* STEP 2: Return to website & submit verification */}
            <form onSubmit={handleSubmitVerification} className="space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <span className="font-bold text-xs text-slate-900">
                  {t('paymentStep2')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('senderPhoneLabel')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder={t('senderPhonePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm font-mono"
                  required
                />
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('uploadScreenshotLabel')}
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  {t('uploadScreenshotDesc')}
                </p>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  {screenshotPreview ? (
                    <div className="space-y-2">
                      <img
                        src={screenshotPreview}
                        alt="Receipt preview"
                        className="max-h-36 mx-auto rounded-lg border border-slate-200 object-contain shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptScreenshot('');
                          setScreenshotPreview('');
                        }}
                        className="text-xs text-red-600 font-semibold hover:underline"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-600 font-medium">
                        Tap to choose receipt image or screenshot
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !currentOrder}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{t('submitting')}</span>
                ) : (
                  <>
                    <span>{t('submitVerificationBtn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400">
                Notice: Customer submission initiates verification; an admin confirms payment before completing the order.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
