import React from 'react';
import { Heart, Star, MessageCircle, MessageSquareText, User } from 'lucide-react';
import { AppView } from '../types';

interface MobileBottomNavProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  unreadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onChangeView,
  unreadCount = 0
}) => {
  const navItems = [
    {
      id: AppView.USER_DASHBOARD,
      label: 'Rencontres',
      icon: Heart,
    },
    {
      id: AppView.LIKES_YOU,
      label: 'Ils vous aiment',
      icon: Star,
    },
    {
      id: AppView.MESSAGES,
      label: 'Messages',
      icon: MessageCircle,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      id: AppView.FORUM,
      label: 'Forum',
      icon: MessageSquareText,
    },
    {
      id: AppView.PROFILE,
      label: 'Profil',
      icon: User,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-all duration-300">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id || item.label}
              onClick={() => onChangeView(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 min-h-[48px] min-w-[56px] ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {/* Indicateur point vert haut si actif */}
              {isActive && (
                <span className="absolute -top-1 w-1.5 h-1.5 bg-emerald-600 rounded-full shadow-sm animate-pulse" />
              )}

              <div className={`relative p-1 rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-50 text-emerald-700 scale-110' : ''}`}>
                <Icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1.5 bg-emerald-700 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-0.5 font-sans leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
