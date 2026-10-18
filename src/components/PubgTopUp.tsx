import React, { useState, useEffect } from 'react';
import {
  Zap,
  HelpCircle,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  ShieldAlert,
  Briefcase,
  Coins,
  Flame,
  Sparkles,
  Award,
} from 'lucide-react';
import { PubgPackage, CurrencyType } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface PubgTopUpProps {
  packages: PubgPackage[];
  onProceedToPay: (params: {
    pkg: PubgPackage;
    pubgId: string;
    pubgNickname: string;
    savePubgId: boolean;
  }) => void;
  onOpenAuth: () => void;
  onNavigateToEmployee?: () => void;
  onOpenPepRedemption?: () => void;
}

export const PubgTopUp: React.FC<PubgTopUpProps> = ({
  packages,
  onProceedToPay,
  onOpenAuth,
  onNavigateToEmployee,
  onOpenPepRedemption,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('uc');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [pubgId, setPubgId] = useState<string>('');
  const [pubgNickname, setPubgNickname] = useState<string>('');
  const [savePubgId, setSavePubgId] = useState<boolean>(true);
  const [showIdHelp, setShowIdHelp] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Filter packages strictly by selected currency (UC vs WOW Coin)
  const filteredPackages = packages
    .filter((p) => p.active)
    .filter((p) => {
      if (selectedCurrency === 'wow_coin') {
        return (
          p.currencyType === 'wow_coin' ||
          p.id.includes('wow') ||
          p.name.toLowerCase().includes('wow')
        );
      }
      return (
        p.currencyType === 'uc' ||
        (!p.currencyType && !p.id.includes('wow') && !p.name.toLowerCase().includes('wow'))
      );
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // Auto-select first popular package or first package within selected currency
  useEffect(() => {
    if (filteredPackages.length > 0) {
      const alreadyValid = filteredPackages.some((p) => p.id === selectedPackageId);
      if (!alreadyValid) {
        const popular = filteredPackages.find((p) => p.badge?.includes('Popular')) || filteredPackages[0];
        setSelectedPackageId(popular.id);
      }
    }
  }, [filteredPackages, selectedPackageId, selectedCurrency]);

  // Auto-fill saved player ID from user account
  useEffect(() => {
    if (user?.savedPubgId && !pubgId) {
      setPubgId(user.savedPubgId);
      if (user.savedPubgNickname) {
        setPubgNickname(user.savedPubgNickname);
      }
    }
  }, [user, pubgId]);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  const handlePayClick = () => {
    setFormError('');

    if (!selectedPackage) {
      setFormError(`Please select a ${selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'PUBG UC'} package`);
      return;
    }

    const cleanId = pubgId.trim();
    if (!cleanId) {
      setFormError('PUBG Player ID is required');
      return;
    }

    if (!/^\d{5,15}$/.test(cleanId)) {
      setFormError('PUBG Player ID should be between 5 to 15 digits');
      return;
    }

    // Require authentication before purchasing
    if (!user) {
      onOpenAuth();
      return;
    }

    // Role-based restrictions: Employees and Admins cannot place customer orders
    if (user.role === 'employee') {
      setFormError('Employee accounts are prohibited from placing customer orders. Please use your Workstation to view incoming orders.');
      return;
    }

    if (user.role === 'admin') {
      setFormError('Administrator accounts cannot place customer orders through ordinary checkout to preserve accounting integrity.');
      return;
    }

    // Proceed to Somali Mobile Wallet USSD payment flow
    onProceedToPay({
      pkg: selectedPackage,
      pubgId: cleanId,
      pubgNickname: pubgNickname.trim(),
      savePubgId,
    });
  };

  return (
    <div className="space-y-5">
      {/* Employee Role Notice Banner */}
      {user?.role === 'employee' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm text-amber-950">Employee Support Account Active ({user.email})</h4>
              <p className="text-amber-800 leading-relaxed">
                Customer purchasing controls are disabled for staff members. Please switch to your Workstation to inspect and process store orders.
              </p>
            </div>
          </div>
          {onNavigateToEmployee && (
            <button
              type="button"
              onClick={onNavigateToEmployee}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Briefcase className="w-4 h-4" />
              <span>Open Workstation</span>
            </button>
          )}
        </div>
      )}

      {/* PEP Points Customer Balance & Top-Up Shortcut Banner */}
      {user?.role === 'customer' && onOpenPepRedemption && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-amber-950 font-display">
                  PEP Rewards Balance: <span className="font-extrabold text-amber-600 font-mono">{user.pepPoints || 0} PEP</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Cap: 1,500
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Earn 10% of profit as PEP points. Redeem 150+ PEP for free UC or WOW Coins!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenPepRedemption}
            disabled={(user.pepPoints || 0) < 150}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>Top Up with PEP</span>
          </button>
        </div>
      )}

      {/* Currency Selector: PUBG Mobile UC vs WOW Coin */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedCurrency('uc')}
            className={`py-3 px-4 rounded-xl font-display font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCurrency === 'uc'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Flame className={`w-4 h-4 ${selectedCurrency === 'uc' ? 'text-amber-300' : 'text-red-500'}`} />
            <span>PUBG Mobile UC</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCurrency('wow_coin')}
            className={`py-3 px-4 rounded-xl font-display font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCurrency === 'wow_coin'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${selectedCurrency === 'wow_coin' ? 'text-yellow-200' : 'text-amber-500'}`} />
            <span>WOW Coin</span>
          </button>
        </div>
      </div>

      {/* Step 1: Select Package */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="font-bold text-slate-900 text-base font-display">
              {t('selectPackage')} — {selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'PUBG UC'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredPackages.length} Packages Available
          </span>
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredPackages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const totalUnits = pkg.ucAmount + pkg.bonusUc;
            const unitLabel = selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'UC';
            // PEP reward: Authoritative 10% gross profit rounded to nearest integer
            const pepEarned = pkg.pepReward ?? 6;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPackageId(pkg.id);
                  }
                }}
                className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                  isSelected
                    ? selectedCurrency === 'wow_coin'
                      ? 'border-amber-600 bg-amber-50/40 shadow-xs ring-1 ring-amber-600'
                      : 'border-red-600 bg-red-50/40 shadow-xs ring-1 ring-red-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Badge */}
                {pkg.badge && (
                  <div className={`text-[10px] font-bold tracking-wide uppercase mb-1 ${
                    selectedCurrency === 'wow_coin' ? 'text-amber-700' : 'text-red-600'
                  }`}>
                    {pkg.badge}
                  </div>
                )}

                {/* Amount Details */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-black text-slate-900 font-display">
                      {totalUnits}
                    </span>
                    <span className={`text-xs font-bold ${
                      selectedCurrency === 'wow_coin' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {unitLabel}
                    </span>
                  </div>

                  {pkg.bonusUc > 0 && (
                    <p className="text-[11px] text-emerald-600 font-semibold">
                      +{pkg.bonusUc} Bonus {unitLabel}
                    </p>
                  )}

                  {/* "Earn X PEP" Reward Tag */}
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-[10px] font-extrabold">
                    <Coins className="w-3 h-3 text-amber-600" />
                    <span>Earn {pepEarned} PEP</span>
                  </div>
                </div>

                {/* Selling Price & Selection Indicator */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900 font-display">
                    ${pkg.priceUsd.toFixed(2)}
                  </span>
                  {isSelected ? (
                    <CheckCircle className={`w-4 h-4 ${
                      selectedCurrency === 'wow_coin' ? 'text-amber-600' : 'text-red-600'
                    }`} />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Select</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Clear Fulfillment Explanation */}
        <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
          <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>
            <strong>PEP Reward Policy:</strong> PEP points are credited automatically only after the top-up has actually been fulfilled successfully.
          </span>
        </div>
      </section>

      {/* Step 2: Enter PUBG Player Details */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-slate-900 text-base font-display">
              {t('enterPlayerDetails')}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowIdHelp(!showIdHelp)}
            className="flex items-center gap-1 text-xs text-red-600 font-semibold hover:text-red-700 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('idHelpTitle')}</span>
          </button>
        </div>

        {/* ID Help Banner */}
        {showIdHelp && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-900">{t('idHelpTitle')}</p>
            <p>{t('idHelpDesc')}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              PUBG Player ID (UID) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pubgId}
              onChange={(e) => {
                setPubgId(e.target.value.replace(/\D/g, ''));
                if (formError) setFormError('');
              }}
              placeholder={t('pubgIdPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 text-sm font-mono tracking-wider"
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              PUBG In-Game Nickname <span className="text-slate-400 font-normal">(Optional for verification)</span>
            </label>
            <input
              type="text"
              value={pubgNickname}
              onChange={(e) => setPubgNickname(e.target.value)}
              placeholder={t('pubgNicknamePlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 text-sm"
              maxLength={30}
            />
          </div>

          {user && (
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={savePubgId}
                onChange={(e) => setSavePubgId(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-600"
              />
              <span>{t('saveIdCheckbox')}</span>
            </label>
          )}

          {user?.savedPubgId && pubgId === user.savedPubgId && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Loaded from your saved profile ({user.savedPubgNickname || user.savedPubgId})</span>
            </div>
          )}
        </div>
      </section>

      {/* Step 3: Review Order & Price */}
      {selectedPackage && (
        <section className="bg-white border-2 border-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="font-bold text-slate-900 text-base font-display">
              {t('reviewOrder')}
            </h3>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Selected Currency:</span>
              <span className="font-bold text-slate-900">
                {selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'PUBG Mobile UC'}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>{t('packageSelected')}</span>
              <span className="font-bold text-slate-900">{selectedPackage.name}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>{t('totalUcCount')}</span>
              <span className={`font-bold ${
                selectedCurrency === 'wow_coin' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {selectedPackage.ucAmount + selectedPackage.bonusUc} {selectedCurrency === 'wow_coin' ? 'WOW Coin' : 'UC'}
              </span>
            </div>

            {pubgId && (
              <div className="flex justify-between items-center text-slate-600">
                <span>PUBG Player ID</span>
                <span className="font-mono font-bold text-slate-900">{pubgId}</span>
              </div>
            )}

            {pubgNickname && (
              <div className="flex justify-between items-center text-slate-600">
                <span>Nickname</span>
                <span className="font-bold text-slate-900">{pubgNickname}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-900">{t('amountDue')}</span>
              <span className="font-extrabold text-lg text-slate-900 font-display">
                ${selectedPackage.priceUsd.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Authoritative PEP Reward Notice */}
          <div className="mt-3 flex items-center justify-between text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Earn <strong>+{selectedPackage.pepReward ?? 6} PEP Points</strong> upon confirmed successful fulfillment!
              </span>
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {formError}
            </p>
          )}

          {/* Role-based Purchase Controls */}
          <div className="mt-4">
            {user?.role === 'employee' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Employee Purchasing Restricted</span>
                </div>
                <p className="text-xs text-amber-800">
                  Staff accounts are prohibited from purchasing packages or initiating customer checkout. Please manage customer orders in your Workstation.
                </p>
                {onNavigateToEmployee && (
                  <button
                    type="button"
                    onClick={onNavigateToEmployee}
                    className="mt-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Go to Employee Workstation</span>
                  </button>
                )}
              </div>
            ) : user?.role === 'admin' ? (
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-800">
                  Administrator Account Active
                </p>
                <p className="text-xs text-slate-600">
                  Customer order placement is restricted to customer accounts to preserve transaction integrity.
                </p>
              </div>
            ) : (
              <button
                onClick={handlePayClick}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-base rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('payButton')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guaranteed Direct PUBG In-Game UID Recharge</span>
          </div>
        </section>
      )}
    </div>
  );
};
