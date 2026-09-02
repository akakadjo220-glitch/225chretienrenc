import React from 'react';
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
    <div className="md:hidden fixed bottom-4 left-4 right-4 max-w-[390px] mx-auto z-50 pointer-events-none select-none">
      <div className="relative w-full h-[68px] pointer-events-auto">

        {/* 1. COURBE DU FOND EN VERRE SATINÉ AVEC BERCEAU CENTRAL SCULPTÉ (À L'IDENTIQUE) */}
        <div className="absolute inset-0 w-full h-full rounded-[34px] bg-white/90 backdrop-blur-2xl border border-[#E2D6C4] shadow-[0_16px_38px_-6px_rgba(180,140,90,0.18),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Lueur d'aurore dorée intérieure */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-10 bg-gradient-to-b from-amber-200/25 to-transparent rounded-full blur-sm pointer-events-none" />
        </div>

        {/* 2. CONTENU DE LA BARRE EN 5 ÉLÉMENTS ALIGNÉS PARFAITEMENT */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-3">

          {/* ONGLETS GAUCHE : MESSAGES & PROFIL */}
          
          {/* 1. MESSAGES */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.MESSAGES)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.MESSAGES
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-[#1A4331]/75 hover:text-[#0D5C3A] font-medium'
            }`}
          >
            <div className="relative mb-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={currentView === AppView.MESSAGES ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#D4A359] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">Messages</span>
          </button>

          {/* 2. PROFIL */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.PROFILE)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.PROFILE
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-[#1A4331]/75 hover:text-[#0D5C3A] font-medium'
            }`}
          >
            <div className="relative mb-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={currentView === AppView.PROFILE ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">Profil</span>
          </button>

          {/* 3. RENCONTRES : LE BOUTON CENTRAL SURÉLEVÉ (ORBE ÉMERAUDE + CŒUR 3D OR) */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <button
              type="button"
              onClick={() => onChangeView(AppView.USER_DASHBOARD)}
              className="absolute -top-6 w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group shadow-[0_10px_24px_rgba(13,62,39,0.42),0_2px_8px_rgba(0,0,0,0.12)] border-2 border-amber-300/70"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #196641 0%, #0D3E27 65%, #072517 100%)',
                boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.35), 0 10px 24px rgba(13,62,39,0.42)'
              }}
              title="Rencontres chrétiennes"
            >
              {/* Reflet de lumière sur la sphère émeraude */}
              <div className="absolute top-1 left-3 right-3 h-3.5 bg-gradient-to-b from-white/35 to-transparent rounded-full pointer-events-none" />

              {/* CŒUR 3D MÉTALLIQUE DORÉ (À L'IDENTIQUE DE LA MAQUETTE) */}
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)] transform group-hover:scale-110 transition-transform duration-200">
                <defs>
                  <linearGradient id="goldHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF9E0" />
                    <stop offset="25%" stopColor="#F9D77E" />
                    <stop offset="65%" stopColor="#D4A359" />
                    <stop offset="100%" stopColor="#8C5E14" />
                  </linearGradient>
                  <radialGradient id="goldHeartGlow" cx="32%" cy="28%" r="65%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                    <stop offset="35%" stopColor="#FDE68A" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#D4A359" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="goldHeartStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFDF5" />
                    <stop offset="100%" stopColor="#B47F28" />
                  </linearGradient>
                </defs>
                {/* Silhouette du Cœur */}
                <path
                  d="M16 28 C15.4 28 7.5 21 4.2 15.5 C1.4 11 2.5 5 7.4 3.6 C11.2 2.6 14.8 4.7 16 7.2 C17.2 4.7 20.8 2.6 24.6 3.6 C29.5 5 30.6 11 27.8 15.5 C24.5 21 16.6 28 16 28 Z"
                  fill="url(#goldHeartGrad)"
                  stroke="url(#goldHeartStroke)"
                  strokeWidth="0.8"
                />
                {/* Reflet Spéculaire Lobe Gauche */}
                <path
                  d="M7 6.5 C9 5 12 5.5 13 7.5 C12 8.5 9 9 7 6.5 Z"
                  fill="#FFFFFF"
                  opacity="0.75"
                />
                {/* Volume 3D Lumière Ambiante */}
                <path
                  d="M16 28 C15.4 28 7.5 21 4.2 15.5 C1.4 11 2.5 5 7.4 3.6 C11.2 2.6 14.8 4.7 16 7.2 C17.2 4.7 20.8 2.6 24.6 3.6 C29.5 5 30.6 11 27.8 15.5 C24.5 21 16.6 28 16 28 Z"
                  fill="url(#goldHeartGlow)"
                />
              </svg>
            </button>

            {/* Libellé sous le berceau */}
            <span className={`text-[10px] tracking-tight mt-7 font-extrabold leading-none ${
              currentView === AppView.USER_DASHBOARD
                ? 'text-[#0D5C3A]'
                : 'text-[#1A4331]'
            }`}>
              Rencontres
            </span>
          </div>

          {/* ONGLETS DROITE : COMMUNAUTÉ & PARAMÈTRES */}

          {/* 4. COMMUNAUTÉ */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.FORUM)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.FORUM
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-[#1A4331]/75 hover:text-[#0D5C3A] font-medium'
            }`}
          >
            <div className="relative mb-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={currentView === AppView.FORUM ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">Communauté</span>
          </button>

          {/* 5. PARAMÈTRES (SETTINGS DE LA MAQUETTE / COUPS DE CŒUR & PRÉFÉRENCES) */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.LIKES_YOU)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.LIKES_YOU
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-[#1A4331]/75 hover:text-[#0D5C3A] font-medium'
            }`}
          >
            <div className="relative mb-0.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={currentView === AppView.LIKES_YOU ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {likesCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#D4A359] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                  {likesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">Paramètres</span>
          </button>

        </div>

      </div>
    </div>
  );
};
