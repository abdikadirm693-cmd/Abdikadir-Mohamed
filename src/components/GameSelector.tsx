import React from 'react';
import { Flame, Lock, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface GameSelectorProps {
  onSelectGame: (gameId: string) => void;
}

export const GameSelector: React.FC<GameSelectorProps> = ({ onSelectGame }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">
            {t('gamesTitle')}
          </h2>
          <p className="text-xs text-slate-500">{t('gamesSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ACTIVE: PUBG Mobile */}
        <div
          onClick={() => onSelectGame('pubg')}
          className="relative bg-white border-2 border-red-500 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-red-600 transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectGame('pubg');
            }
          }}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-slate-900 flex-shrink-0 overflow-hidden relative border border-slate-700">
                <img
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=150&q=80"
                  alt="PUBG Mobile"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-red-600" />
                  <span>{t('availableNow')}</span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 group-hover:text-red-600 transition-colors">
                  PUBG Mobile
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instant Unknown Cash (UC)
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100">
            {t('pubgDescription')}
          </p>

          <div className="mt-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>EVC Plus</span>
              <span aria-hidden="true">·</span>
              <span>Zaad</span>
              <span aria-hidden="true">·</span>
              <span>Sahal</span>
              <span aria-hidden="true">·</span>
              <span>eDahab</span>
            </div>
            <span className="text-red-600 font-bold">From $0.99</span>
          </div>
        </div>

        {/* DISABLED: eFootball Mobile */}
        <div
          className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-75 cursor-not-allowed select-none"
          aria-disabled="true"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden relative grayscale">
                <img
                  src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=150&q=80"
                  alt="eFootball"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('comingSoon')}</span>
                </div>
                <h3 className="font-bold text-base text-slate-700">
                  eFootball 2026
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Coins & Points
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded text-center">
              {t('comingSoon')}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200">
            {t('efootballDescription')}
          </p>
        </div>

        {/* DISABLED: Free Fire */}
        <div
          className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-75 cursor-not-allowed select-none"
          aria-disabled="true"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden relative grayscale">
                <img
                  src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=150&q=80"
                  alt="Free Fire"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('comingSoon')}</span>
                </div>
                <h3 className="font-bold text-base text-slate-700">
                  Garena Free Fire
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Diamonds Top-Up
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded text-center">
              {t('comingSoon')}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200">
            {t('freefireDescription')}
          </p>
        </div>

        {/* DISABLED: Call of Duty Mobile */}
        <div
          className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-75 cursor-not-allowed select-none"
          aria-disabled="true"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden relative grayscale">
                <img
                  src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=150&q=80"
                  alt="Call of Duty"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('comingSoon')}</span>
                </div>
                <h3 className="font-bold text-base text-slate-700">
                  Call of Duty: Mobile
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  CP Points
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded text-center">
              {t('comingSoon')}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200">
            {t('codmDescription')}
          </p>
        </div>
      </div>
    </div>
  );
};
