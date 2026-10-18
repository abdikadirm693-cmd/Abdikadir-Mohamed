import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  PhoneCall,
  ShieldCheck,
  Coins,
  ArrowRight,
  Flame,
  Award,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { GameSelector } from './components/GameSelector.tsx';
import { PubgTopUp } from './components/PubgTopUp.tsx';
import { PaymentModal } from './components/PaymentModal.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { AccountView } from './components/AccountView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { EmployeeDashboard } from './components/EmployeeDashboard.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { PepRedemptionModal } from './components/PepRedemptionModal.tsx';
import { Order, PubgPackage, WalletConfig, Advertisement } from './types/index.ts';

function SomplayContent() {
  const { t, lang } = useLanguage();
  const { user, isAdmin, isEmployee, authFetch } = useAuth();

  const [currentTab, setCurrentTab] = useState<'home' | 'pubg' | 'orders' | 'account' | 'admin' | 'employee'>('home');
  const [packages, setPackages] = useState<PubgPackage[]>([]);
  const [wallets, setWallets] = useState<WalletConfig[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPepRedemptionOpen, setIsPepRedemptionOpen] = useState(false);
  const [pendingPaymentParams, setPendingPaymentParams] = useState<{
    pkg: PubgPackage;
    pubgId: string;
    pubgNickname: string;
    savePubgId: boolean;
  } | null>(null);
  const [orderToResume, setOrderToResume] = useState<Order | null>(null);

  // Fetch Packages, Wallets, Ads
  const fetchPublicData = useCallback(async () => {
    try {
      const [pkgRes, walletsRes, adsRes] = await Promise.all([
        fetch('/api/packages'),
        fetch('/api/wallets'),
        fetch('/api/ads'),
      ]);

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
    } catch (e) {
      console.error('Failed to load public data:', e);
    }
  }, []);

  // Fetch User's Orders
  const fetchUserOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setIsLoadingOrders(true);
    try {
      const endpoint = user.role === 'employee' ? '/api/employee/orders' : '/api/orders';
      const res = await authFetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  useEffect(() => {
    fetchUserOrders();
  }, [fetchUserOrders]);

  // Employee guard: Redirect employees away from customer purchasing tabs to their Workstation
  useEffect(() => {
    if (user?.role === 'employee' && currentTab === 'pubg') {
      setCurrentTab('employee');
    }
  }, [user?.role, currentTab]);

  // Handle Pay from PubgTopUp
  const handleProceedToPay = (params: {
    pkg: PubgPackage;
    pubgId: string;
    pubgNickname: string;
    savePubgId: boolean;
  }) => {
    if (user?.role === 'employee') {
      setCurrentTab('employee');
      return;
    }
    setOrderToResume(null);
    setPendingPaymentParams(params);
    setIsPaymentModalOpen(true);
  };

  // Handle Resume incomplete order
  const handleResumeOrder = (order: Order) => {
    setPendingPaymentParams(null);
    setOrderToResume(order);
    setIsPaymentModalOpen(true);
  };

  const handleOrderFinished = (completedOrder: Order) => {
    setOrders((prev) => [completedOrder, ...prev.filter((o) => o.id !== completedOrder.id)]);
    fetchUserOrders();
  };

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const activeAd = ads.find((a) => a.active) || ads[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-20 md:pb-12">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab as any)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container (Mobile-first, max-w-4xl) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 space-y-6">
        {/* ===================== TAB: HOME ===================== */}
        {currentTab === 'home' && (
          <div className="space-y-6">
            {/* Som Top Up Style Hero Banner */}
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-slate-900 text-white rounded-2xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
              <div className="relative z-10 max-w-lg space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-red-100 text-[11px] font-bold tracking-wide uppercase">
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>{activeAd ? (lang === 'so' ? activeAd.badgeSo : activeAd.badgeEn) : 'SOMALIA #1 TOP-UP'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display leading-tight">
                  {activeAd ? (lang === 'so' ? activeAd.titleSo : activeAd.titleEn) : t('heroTitle')}
                </h1>

                <p className="text-xs sm:text-sm text-red-100/90 leading-relaxed">
                  {activeAd ? (lang === 'so' ? activeAd.subtitleSo : activeAd.subtitleEn) : t('heroSubtitle')}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      const el = document.getElementById('pubg-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                      else setCurrentTab('pubg');
                    }}
                    className="px-5 py-2.5 bg-white hover:bg-slate-100 text-red-600 font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>{t('heroCta')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 text-xs text-red-100 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Instant Direct UID</span>
                  </div>
                </div>
              </div>

              {/* Decorative Background Elements */}
              <div className="absolute right-[-20px] bottom-[-20px] w-56 h-56 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:block opacity-20 pointer-events-none">
                <Zap className="w-48 h-48 text-white" />
              </div>
            </div>

            {/* Quick Value Propositions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <Zap className="w-5 h-5 text-red-600 mb-1" />
                <h4 className="font-bold text-xs text-slate-900">Dhaqso Badan</h4>
                <p className="text-[11px] text-slate-500">1 - 3 daqiiqo gudahood</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <PhoneCall className="w-5 h-5 text-emerald-600 mb-1" />
                <h4 className="font-bold text-xs text-slate-900">Somali Wallets</h4>
                <p className="text-[11px] text-slate-500">EVC, Zaad, Sahal, eDahab</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-blue-600 mb-1" />
                <h4 className="font-bold text-xs text-slate-900">PIN-kaaga Sirta ah</h4>
                <p className="text-[11px] text-slate-500">Kaliya dialer-ka ku qor</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <Coins className="w-5 h-5 text-amber-500 mb-1" />
                <h4 className="font-bold text-xs text-slate-900">Dhibcaha PEP</h4>
                <p className="text-[11px] text-slate-500">Kasbo abaalmarino</p>
              </div>
            </div>

            {/* Games Section */}
            <GameSelector
              onSelectGame={(gameId) => {
                if (gameId === 'pubg') {
                  const el = document.getElementById('pubg-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

            {/* PUBG Top-Up Section on Home Page */}
            <div id="pubg-section" className="pt-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">
                    {t('packagesTitle')}
                  </h2>
                  <p className="text-xs text-slate-500">{t('packagesSubtitle')}</p>
                </div>
              </div>

              <PubgTopUp
                packages={packages}
                onProceedToPay={handleProceedToPay}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onNavigateToEmployee={() => setCurrentTab('employee')}
                onOpenPepRedemption={() => setIsPepRedemptionOpen(true)}
              />
            </div>
          </div>
        )}

        {/* ===================== TAB: PUBG TOP-UP ===================== */}
        {currentTab === 'pubg' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">
                PUBG Mobile UC & WOW Coin Top-Up
              </h2>
              <p className="text-xs text-slate-500">{t('packagesSubtitle')}</p>
            </div>

            <PubgTopUp
              packages={packages}
              onProceedToPay={handleProceedToPay}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onNavigateToEmployee={() => setCurrentTab('employee')}
              onOpenPepRedemption={() => setIsPepRedemptionOpen(true)}
            />
          </div>
        )}


        {/* ===================== TAB: MY ORDERS ===================== */}
        {currentTab === 'orders' && (
          <OrdersView
            orders={orders}
            isLoading={isLoadingOrders}
            onResumeOrder={handleResumeOrder}
            onRefresh={fetchUserOrders}
            onNavigateToTopUp={() => setCurrentTab('pubg')}
          />
        )}

        {/* ===================== TAB: ACCOUNT ===================== */}
        {currentTab === 'account' && (
          <AccountView
            onNavigateToAdmin={() => setCurrentTab('admin')}
            onNavigateToEmployee={() => setCurrentTab('employee')}
            onNavigateToOrders={() => setCurrentTab('orders')}
            onOpenPepRedemption={() => setIsPepRedemptionOpen(true)}
          />
        )}

        {/* ===================== TAB: ADMIN ===================== */}
        {currentTab === 'admin' && isAdmin && (
          <AdminDashboard onBackToApp={() => setCurrentTab('home')} />
        )}

        {/* ===================== TAB: EMPLOYEE ===================== */}
        {currentTab === 'employee' && isEmployee && (
          <EmployeeDashboard onBackToApp={() => setCurrentTab('home')} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={(tab) => {
          if ((tab === 'orders' || tab === 'account') && !user) {
            setIsAuthModalOpen(true);
            return;
          }
          setCurrentTab(tab as any);
        }}
        pendingCount={pendingOrdersCount}
      />

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedInUser) => {
          fetchUserOrders();
          if (loggedInUser?.role === 'admin') {
            setCurrentTab('admin');
          } else if (loggedInUser?.role === 'employee') {
            setCurrentTab('employee');
          } else {
            // Customers stay on their active view or top-up
            if (currentTab === 'admin' || currentTab === 'employee') {
              setCurrentTab('home');
            }
          }
        }}
      />

      {/* Payment Modal (USSD Dialing + Verification Submission) */}
      {isPaymentModalOpen && (
        <PaymentModal
          orderToResume={orderToResume}
          newOrderParams={pendingPaymentParams}
          wallets={wallets}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setOrderToResume(null);
            setPendingPaymentParams(null);
            fetchUserOrders();
          }}
          onOrderCompleted={handleOrderFinished}
        />
      )}

      {/* PEP Points Reward Redemption Modal */}
      {isPepRedemptionOpen && (
        <PepRedemptionModal
          isOpen={isPepRedemptionOpen}
          onClose={() => setIsPepRedemptionOpen(false)}
          packages={packages}
          onRedemptionSuccess={(newOrder) => {
            handleOrderFinished(newOrder);
            fetchUserOrders();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SomplayContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
