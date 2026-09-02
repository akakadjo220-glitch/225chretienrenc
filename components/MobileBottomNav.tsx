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
    <div className="md:hidden fixed bottom-4 left-3 right-3 max-w-[390px] mx-auto z-50 pointer-events-none select-none">
      <div className="relative w-full h-[72px] pointer-events-auto">

        {/* 1. COURBE DU FOND EN VERRE SATINÉ AVEC BERCEAU SCULPTÉ (DÉCOUPE À L'IDENTIQUE DE LA MAQUETTE) */}
        <svg
          viewBox="0 0 380 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full filter drop-shadow-[0_14px_34px_rgba(180,140,90,0.22)]"
          preserveAspectRatio="none"
        >
          {/* Dégradé doux pour le verre satiné albâtre */}
          <defs>
            <linearGradient id="barGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.96)" />
              <stop offset="100%" stopColor="rgba(252, 248, 242, 0.92)" />
            </linearGradient>
            <linearGradient id="barBorderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(226, 214, 196, 0.7)" />
              <stop offset="50%" stopColor="rgba(212, 163, 89, 0.5)" />
              <stop offset="100%" stopColor="rgba(226, 214, 196, 0.7)" />
            </linearGradient>
          </defs>

          {/* Tracé de la barre avec échancrure / berceau central */}
          <path
            d="M 32 0
               L 142 0
               C 152 0 158 6 163 15
               C 170 27 179 34 190 34
               C 201 34 210 27 217 15
               C 222 6 228 0 238 0
               L 348 0
               C 365.67 0 380 14.33 380 32
               L 380 40
               C 380 57.67 365.67 72 348 72
               L 32 72
               C 14.33 72 0 57.67 0 40
               L 0 32
               C 0 14.33 14.33 0 32 0 Z"
            fill="url(#barGlassGrad)"
            stroke="url(#barBorderGrad)"
            strokeWidth="1.2"
          />
        </svg>

        {/* 2. BOUTON CENTRAL SURÉLEVÉ DANS LE BERCEAU (ORBE ÉMERAUDE + CŒUR 3D PUFFY DORÉ) */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center z-20">
          <button
            type="button"
            onClick={() => onChangeView(AppView.USER_DASHBOARD)}
            className="w-[58px] h-[58px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative"
            style={{
              background: 'radial-gradient(circle at 38% 32%, #246B46 0%, #11452B 55%, #082919 100%)',
              boxShadow: '0 0 0 5px rgba(245, 235, 218, 0.65), 0 10px 24px rgba(13, 62, 39, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
            }}
            title="Rencontres chrétiennes"
          >
            {/* CŒUR 3D PUFFY MÉTALLIQUE DORÉ (COPIE CONFORME DU ZOOM) */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.45)]"
            >
              <defs>
                {/* Dégradé métallique 3D or chaud volumétrique */}
                <linearGradient id="puffyGold3D" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#FFFCE5" />
                  <stop offset="25%" stopColor="#FBD468" />
                  <stop offset="65%" stopColor="#D99B30" />
                  <stop offset="100%" stopColor="#8A5A0C" />
                </linearGradient>

                {/* Reflet spéculaire doux sur le lobe gauche */}
                <radialGradient id="puffySpecGlow" cx="30%" cy="28%" r="48%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#FFE79A" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#D99B30" stopOpacity="0" />
                </radialGradient>

                {/* Contour fin or brillant */}
                <linearGradient id="puffyStrokeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFDF0" />
                  <stop offset="50%" stopColor="#F8CE5A" />
                  <stop offset="100%" stopColor="#9C6B14" />
                </linearGradient>
              </defs>

              {/* Volume galbé du Cœur 3D */}
              <path
                d="M 16 27.2
                   C 15.3 27.2 7.6 20.6 4.3 15.5
                   C 1.5 11.2 2.6 5.3 7.4 3.9
                   C 11 2.9 14.6 4.8 16 7.2
                   C 17.4 4.8 21 2.9 24.6 3.9
                   C 29.4 5.3 30.5 11.2 27.7 15.5
                   C 24.4 20.6 16.7 27.2 16 27.2 Z"
                fill="url(#puffyGold3D)"
                stroke="url(#puffyStrokeGold)"
                strokeWidth="0.8"
              />

              {/* Reflet spéculaire volumique lobe supérieur gauche */}
              <ellipse
                cx="9.5"
                cy="8.5"
                rx="4.2"
                ry="2.8"
                transform="rotate(-28 9.5 8.5)"
                fill="url(#puffySpecGlow)"
              />

              {/* Petit point de brillance spéculaire secondaire lobe droit */}
              <ellipse
                cx="22.5"
                cy="8.5"
                rx="2.8"
                ry="1.8"
                transform="rotate(28 22.5 8.5)"
                fill="#FFFFFF"
                opacity="0.4"
              />
            </svg>
          </button>

          {/* Libellé "Rencontres" (Dating) sous l'orbe */}
          <span
            className={`text-[10px] font-extrabold tracking-tight mt-6 leading-none transition-colors ${
              currentView === AppView.USER_DASHBOARD ? 'text-[#0D5C3A]' : 'text-slate-800'
            }`}
          >
            Rencontres
          </span>
        </div>

        {/* 3. LES 4 ONGLETS CONFORMES AU MODÈLE (MESSAGES, PROFIL, COMMUNAUTÉ, PARAMÈTRES) */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-2 pt-1">

          {/* 1. MESSAGES (Bulle de dialogue + point caractéristique en haut à droite) */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.MESSAGES)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.MESSAGES
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-slate-800 hover:text-[#0D5C3A] font-semibold'
            }`}
          >
            <div className="relative mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M 4 12.5 C 4 7.2 7.6 4.2 13.5 4.2 C 18 4.2 20 6.8 20 10.8 C 20 15.2 16.5 18 12 18 C 10.3 18 8.9 17.5 7.6 16.7 L 3.5 18 L 4.6 14.9 C 4.2 14.1 4 13.3 4 12.5 Z"
                  stroke={currentView === AppView.MESSAGES ? '#0D5C3A' : '#164E35'}
                  strokeWidth={currentView === AppView.MESSAGES ? '2.1' : '1.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Point caractéristique visible sur la maquette */}
                <circle
                  cx="18.5"
                  cy="5.5"
                  r="1.6"
                  fill={currentView === AppView.MESSAGES ? '#0D5C3A' : '#164E35'}
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#D4A359] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">Messages</span>
          </button>

          {/* 2. PROFIL (Cercle tête + arche épaules conforme à la maquette) */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.PROFILE)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.PROFILE
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-slate-800 hover:text-[#0D5C3A] font-semibold'
            }`}
          >
            <div className="relative mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="7.5"
                  r="3.8"
                  stroke={currentView === AppView.PROFILE ? '#0D5C3A' : '#164E35'}
                  strokeWidth={currentView === AppView.PROFILE ? '2.1' : '1.8'}
                />
                <path
                  d="M 5.5 20.5 C 5.5 16 8.5 14.2 12 14.2 C 15.5 14.2 18.5 16 18.5 20.5"
                  stroke={currentView === AppView.PROFILE ? '#0D5C3A' : '#164E35'}
                  strokeWidth={currentView === AppView.PROFILE ? '2.1' : '1.8'}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">Profil</span>
          </button>

          {/* ESPACE DU BERCEAU CENTRAL (POUR L'ORBE SURÉLEVÉ) */}
          <div className="w-[68px] shrink-0 pointer-events-none" />

          {/* 4. COMMUNAUTÉ (Double silhouette conforme à la maquette) */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.FORUM)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.FORUM
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-slate-800 hover:text-[#0D5C3A] font-semibold'
            }`}
          >
            <div className="relative mb-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {/* Silhouette principale avant */}
                <circle
                  cx="9"
                  cy="8"
                  r="3.4"
                  stroke={currentView === AppView.FORUM ? '#0D5C3A' : '#164E35'}
                  strokeWidth={currentView === AppView.FORUM ? '2.1' : '1.8'}
                />
                <path
                  d="M 3.5 20.5 C 3.5 16.5 6 14.8 9 14.8 C 12 14.8 14.5 16.5 14.5 20.5"
                  stroke={currentView === AppView.FORUM ? '#0D5C3A' : '#164E35'}
                  strokeWidth={currentView === AppView.FORUM ? '2.1' : '1.8'}
                  strokeLinecap="round"
                />
                {/* Deuxième silhouette arrière droite */}
                <path
                  d="M 13.5 5.5 C 14.4 5.1 15.4 5.2 16.2 5.8 C 17.1 6.6 17.3 8 16.6 9"
                  stroke={currentView === AppView.FORUM ? '#0D5C3A' : '#164E35'}
                  strokeWidth={currentView === AppView.FORUM ? '2.1' : '1.8'}
                  strokeLinecap="round"
                />
                <path
                  d="M 16.2 14.8 C 18.2 15.4 19.8 17.2 19.8 20.5"
                  stroke={currentView === AppView.FORUM ? '#0D5C3A' : '#164E35'}
                  strokeWidth={currentView === AppView.FORUM ? '2.1' : '1.8'}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">Communauté</span>
          </button>

          {/* 5. PARAMÈTRES (Roue dentée à 8 lobes conforme à la maquette) */}
          <button
            type="button"
            onClick={() => onChangeView(AppView.LIKES_YOU)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 cursor-pointer ${
              currentView === AppView.LIKES_YOU
                ? 'text-[#0D5C3A] font-extrabold'
                : 'text-slate-800 hover:text-[#0D5C3A] font-semibold'
            }`}
          >
            <div className="relative mb-1">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={currentView === AppView.LIKES_YOU ? '#0D5C3A' : '#164E35'}
                strokeWidth={currentView === AppView.LIKES_YOU ? '2.1' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
