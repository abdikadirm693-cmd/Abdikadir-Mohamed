import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Flame,
  Sparkles,
  Gamepad2,
  Lock,
} from 'lucide-react';
import { PubgPackage, Order, CurrencyType } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface PepRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: PubgPackage[];
  onRedemptionSuccess: (order: Order, newBalance: number) => void;
}

export const PepRedemptionModal: React.FC<PepRedemptionModalProps> = ({
  isOpen,
  onClose,
  packages,
  onRedemptionSuccess,
}) => {
  const { user, refreshUser, authFetch } = useAuth();
  const { t, lang } = useLanguage();

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('uc');
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [pubgId, setPubgId] = useState<string>('');
  const [pubgNickname, setPubgNickname] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Auto-fill PUBG Player ID from user profile
  useEffect(() => {
    if (user?.savedPubgId && !pubgId) {
      setPubgId(user.savedPubgId);
      if (user.savedPubgNickname) setPubgNickname(user.savedPubgNickname);
    }
  }, [user, pubgId]);

  if (!isOpen) return null;

  const currentPepBalance = Math.min(1500, user?.pepPoints || 0);

  // Filter packages for selected currency that customer can currently afford
  // Because balance cap is 1,500 PEP, only packages requiring <= currentPepBalance are shown
  const availablePackages = packages
    .filter((p) => p.active)
    .filter((p) => {
      const isMatch = selectedCurrency === 'wow_coin'
        ? p.currencyType === 'wow_coin' || p.id.includes('wow') || p.name.toLowerCase().includes('wow')
        : p.currencyType === 'uc' || (!p.currencyType && !p.id.includes('wow') && !p.name.toLowerCase().includes('wow'));
      return isMatch;
    })
    .filter((p) => {
      const cost = p.redemptionPep ?? Math.round(p.priceUsd * 100);
      return cost <= currentPepBalance;
    })
    .sort((a, b) => (a.redemptionPep || a.priceUsd * 100) - (b.redemptionPep || b.priceUsd * 100));

  // Automatically select the first affordable package if none selected or invalid
  const selectedPkg = availablePackages.find((p) => p.id === selectedPkgId) || availablePackages[0];
  const requiredPep = selectedPkg ? (selectedPkg.redemptionPep ?? Math.round(selectedPkg.priceUsd * 100)) : 0;
  const remainingBalance = Math.max(0, currentPepBalance - requiredPep);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      setErrorMessage('Please log in to redeem PEP points');
      return;
    }

    if (user.role !== 'customer') {
      setErrorMessage('Only customer accounts can redeem PEP points');
      return;
    }

    if (!selectedPkg) {
      setErrorMessage('Please select an eligible redemption package');
      return;
    }

    const cleanPubgId = pubgId.trim();
    if (!cleanPubgId) {
      setErrorMessage('PUBG Player ID (UID) is required');
      return;
    }

    if (!/^\d{5,15}$/.test(cleanPubgId)) {
      setErrorMessage('PUBG Player ID must be between 5 and 15 digits');
      return;
    }

    if (currentPepBalance < requiredPep) {
      setErrorMessage(`Insufficient PEP balance. Required: ${requiredPep} PEP, Current: ${currentPepBalance} PEP`);
      return;
    }

    const idempotencyKey = `pep_idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/pep/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          pubgId: cleanPubgId,
          pubgNickname: pubgNickname.trim(),
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit PEP redemption order');
        setIsSubmitting(false);
        return;
      }

      await refreshUser();
      setSuccessOrder(data.order);
      onRedemptionSuccess(data.order, data.newBalance);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error processing redemption');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessOrder(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Coins className="w-5 h-5 text-yellow-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base font-display">
                Top Up with PEP Points
              </h3>
              <p className="text-xs text-amber-100">
                100 PEP = $1.00 USD Free Game Currency
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Success View */}
          {successOrder ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 font-display">
                  PEP Redemption Submitted!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  Your redemption order has been created. Authorized staff will verify and fulfill your top-up into PUBG UID <strong className="font-mono text-slate-900">{successOrder.pubgId}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-xs mx-auto text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{successOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Package:</span>
                  <span className="font-bold text-slate-900">{successOrder.packageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PEP Spent:</span>
                  <span className="font-bold text-amber-600">{successOrder.pepSpent || requiredPep} PEP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-blue-600 uppercase">Pending Staff Fulfillment</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full max-w-xs py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer mx-auto block"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleRedeem} className="space-y-4">
              {/* PEP Balance Bar Indicator */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>Your PEP Balance</span>
                  </span>
                  <span className="font-black text-sm text-amber-700 font-display">
                    {currentPepBalance} / 1,500 PEP
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-amber-200/60 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentPepBalance / 1500) * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-amber-800">
                  <span>Balance Cap: 1,500 PEP ($15.00 Value)</span>
                  <span>{Math.round((currentPepBalance / 1500) * 100)}% of cap</span>
                </div>
              </div>

              {/* Currency Selector (UC vs WOW Coin) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  1. Choose Currency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCurrency('uc');
                      setSelectedPkgId('');
                    }}
                    className={`py-2 px-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedCurrency === 'uc'
                        ? 'border-red-600 bg-red-50/60 text-red-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-red-600" />
                    <span>PUBG Mobile UC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCurrency('wow_coin');
                      setSelectedPkgId('');
                    }}
                    className={`py-2 px-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedCurrency === 'wow_coin'
                        ? 'border-amber-600 bg-amber-50/60 text-amber-800 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>WOW Coin</span>
                  </button>
                </div>
              </div>

              {/* Affordable Packages List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">
                    2. Select Package (Showing what you can currently afford)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {availablePackages.length} eligible
                  </span>
                </div>

                {availablePackages.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-1.5">
                    <p className="font-bold text-slate-800 text-xs">
                      Not enough PEP points yet
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Minimum required is 150 PEP (for 60 {selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'UC'}). You currently have {currentPepBalance} PEP. Complete top-ups to earn 10% profit rewards!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {availablePackages.map((pkg) => {
                      const isSelected = selectedPkg?.id === pkg.id;
                      const cost = pkg.redemptionPep ?? Math.round(pkg.priceUsd * 100);
                      const totalUnits = pkg.ucAmount + pkg.bonusUc;
                      const unitLabel = selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'UC';

                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPkgId(pkg.id)}
                          role="button"
                          tabIndex={0}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                            isSelected
                              ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-500'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            {pkg.badge && (
                              <span className="text-[9px] font-extrabold uppercase text-amber-700 block mb-0.5">
                                {pkg.badge}
                              </span>
                            )}
                            <div className="font-extrabold text-sm text-slate-900 font-display">
                              {totalUnits} {unitLabel}
                            </div>
                            {pkg.bonusUc > 0 && (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                +{pkg.bonusUc} Bonus
                              </div>
                            )}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="font-black text-amber-600 text-xs font-display">
                              {cost} PEP
                            </span>
                            {isSelected ? (
                              <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <span className="text-[10px] text-slate-400">Select</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PUBG Player UID Input */}
              {availablePackages.length > 0 && (
                <>
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        3. PUBG Player ID (UID) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pubgId}
                        onChange={(e) => setPubgId(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 512345678"
                        maxLength={15}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        PUBG In-Game Nickname <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={pubgNickname}
                        onChange={(e) => setPubgNickname(e.target.value)}
                        placeholder="e.g. SomaliSniper"
                        maxLength={30}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Pre-Confirmation Summary */}
                  {selectedPkg && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-slate-700">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span>Redemption Review</span>
                        <span className="text-emerald-700 text-[11px] font-semibold">100% Free with PEP</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Currency:</span>
                        <span className="font-bold text-slate-900">
                          {selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'PUBG Mobile UC'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Package:</span>
                        <span className="font-bold text-slate-900">{selectedPkg.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Required PEP:</span>
                        <span className="font-bold text-amber-600 font-mono">-{requiredPep} PEP</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-900 font-bold">
                        <span>Remaining Balance:</span>
                        <span className="font-mono text-amber-700">{remainingBalance} PEP</span>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                      {errorMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedPkg || !pubgId.trim()}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <span>{isSubmitting ? 'Processing...' : `Redeem with ${requiredPep} PEP Points`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Safe deduction · Manual staff fulfillment · Points refunded if rejected</span>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
