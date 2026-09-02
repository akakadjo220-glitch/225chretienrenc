import React from 'react';
import { Heart, Star, MessageCircle, Users, User } from 'lucide-react';
import { AppView } from '../types';

interface MobileBottomNavProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  unreadCount?: number;
  likesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onChangeView,
  unreadCount = 0,
  likesCount = 0
}) => {
  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 max-w-md mx-auto z-50 pointer-events-none">
      <nav className="island-bottom-nav pointer-events-auto px-2 py-1.5 flex items-center justify-between relative shadow-2xl">
        
        {/* 1. MESSAGES */}
        <button
          onClick={() => onChangeView(AppView.MESSAGES)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentView === AppView.MESSAGES
              ? 'text-[#0D5C3A] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <MessageCircle size={20} className={currentView === AppView.MESSAGES ? 'stroke-[2.5] text-[#0D5C3A]' : 'stroke-[1.8]'} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#D4A359] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Messages</span>
        </button>

        {/* 2. COUPS DE CŒUR */}
        <button
          onClick={() => onChangeView(AppView.LIKES_YOU)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentView === AppView.LIKES_YOU
              ? 'text-[#0D5C3A] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Star size={20} className={currentView === AppView.LIKES_YOU ? 'stroke-[2.5] text-[#D4A359] fill-[#D4A359]' : 'stroke-[1.8]'} />
            {likesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#D4A359] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                {likesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Coups de cœur</span>
        </button>

        {/* 3. RENCONTRES (BOUTON CENTRAL SURÉLEVÉ GOUTTE ÉMERAUDE & OR) */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-6">
          <button
            onClick={() => onChangeView(AppView.USER_DASHBOARD)}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#0D5C3A] via-[#0f6b43] to-[#128050] border-2 border-[#D4A359] shadow-lg shadow-emerald-950/25 flex items-center justify-center text-amber-200 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
            title="Rencontres chrétiennes"
          >
            <Heart size={22} className="text-amber-200 fill-amber-300 drop-shadow-xs transition-transform group-hover:scale-110" />
          </button>
          <span className={`text-[10px] tracking-tight mt-1 ${
            currentView === AppView.USER_DASHBOARD
              ? 'text-[#0D5C3A] font-extrabold'
              : 'text-slate-600 font-bold'
          }`}>
            Rencontres
          </span>
        </div>

        {/* 4. COMMUNAUTÉ (FORUM / PARVIS) */}
        <button
          onClick={() => onChangeView(AppView.FORUM)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentView === AppView.FORUM
              ? 'text-[#0D5C3A] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Users size={20} className={currentView === AppView.FORUM ? 'stroke-[2.5] text-[#0D5C3A]' : 'stroke-[1.8]'} />
          <span className="text-[10px] tracking-tight mt-0.5">Communauté</span>
        </button>

        {/* 5. PROFIL */}
        <button
          onClick={() => onChangeView(AppView.PROFILE)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentView === AppView.PROFILE
              ? 'text-[#0D5C3A] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <User size={20} className={currentView === AppView.PROFILE ? 'stroke-[2.5] text-[#0D5C3A]' : 'stroke-[1.8]'} />
          <span className="text-[10px] tracking-tight mt-0.5">Profil</span>
        </button>

      </nav>
    </div>
  );
};
