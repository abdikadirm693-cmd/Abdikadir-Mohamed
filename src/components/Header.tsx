import React from 'react';
import { Gamepad2, Globe, Shield, Briefcase, User as UserIcon, Coins, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, onOpenAuth }) => {
  const { lang, setLang, t } = useLanguage();
  const { user, isAdmin, isEmployee, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 group text-left cursor-pointer focus-visible:outline-none"
        >
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:bg-red-700 transition-colors">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-display">
                SOM<span className="text-red-600">PLAY</span>
              </span>
            </div>
            <p className="text-[10px] tracking-wider text-slate-500 font-medium uppercase hidden sm:block">
              Somalia Game Top-Up
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setLang('so')}
              className={`px-2 py-1 rounded transition-colors ${
                lang === 'so'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Soomaali"
            >
              SO
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded transition-colors ${
                lang === 'en'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="English"
            >
              EN
            </button>
          </div>

          {/* User Account / Login */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* PEP Points Badge */}
              <button
                onClick={() => onNavigate('account')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                title="Your PEP Reward Points"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>{user.pepPoints || 0} PEP</span>
              </button>

              {/* Admin quick indicator */}
              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    currentTab === 'admin'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  }`}
                  title="Admin Dashboard"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}

              {/* Employee quick indicator */}
              {isEmployee && (
                <button
                  onClick={() => onNavigate('employee')}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    currentTab === 'employee'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                  title="Staff Portal"
                >
                  <Briefcase className="w-4 h-4" />
                </button>
              )}

              {/* Account button with circular avatar */}
              <button
                onClick={() => onNavigate('account')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  currentTab === 'account'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <UserAvatar
                  size="xs"
                  profilePhotoUrl={user.profilePhotoUrl}
                  name={user.name}
                  email={user.email}
                />
                <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {t('login')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
