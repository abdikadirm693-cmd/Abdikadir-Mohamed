import React from 'react';
import { Home, Zap, ShoppingBag, User as UserIcon, Shield, Briefcase } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate, pendingCount = 0 }) => {
  const { t } = useLanguage();
  const { isAdmin, isEmployee } = useAuth();

  const navItems = [
    { id: 'home', label: t('navHome'), icon: Home },
    { id: 'pubg', label: t('navTopUp'), icon: Zap },
    { id: 'orders', label: t('navOrders'), icon: ShoppingBag, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'account', label: t('navAccount'), icon: UserIcon },
    ...(isAdmin ? [{ id: 'admin', label: t('navAdmin'), icon: Shield }] : []),
    ...(isEmployee ? [{ id: 'employee', label: t('navEmployee'), icon: Briefcase }] : []),
  ];

  const gridColsClass =
    navItems.length >= 6
      ? 'grid-cols-6'
      : navItems.length === 5
      ? 'grid-cols-5'
      : 'grid-cols-4';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-1.5 px-2 safe-area-pb">
      <div className={`max-w-md mx-auto grid ${gridColsClass} gap-1`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-red-600 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-600 stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 truncate max-w-full leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
