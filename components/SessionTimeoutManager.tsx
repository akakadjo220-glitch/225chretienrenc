import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { ShieldAlert, Clock, RefreshCw, LogOut } from 'lucide-react';

interface SessionTimeoutManagerProps {
  userRole: UserRole;
  onSessionExpired: (reasonMessage?: string) => void;
}

// Délais d'inactivité par rôle
const TIMEOUT_CONFIG = {
  [UserRole.ADMIN]: {
    totalDuration: 15 * 60, // 15 minutes en secondes
    warningDuration: 2 * 60 // Avertissement les 2 dernières minutes (120s)
  },
  [UserRole.USER]: {
    totalDuration: 30 * 60, // 30 minutes en secondes
    warningDuration: 2 * 60 // Avertissement les 2 dernières minutes (120s)
  },
  [UserRole.GUEST]: {
    totalDuration: 0,
    warningDuration: 0
  }
};

export const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  userRole,
  onSessionExpired
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);
  const isExpiredRef = useRef<boolean>(false);

  const config = TIMEOUT_CONFIG[userRole] || TIMEOUT_CONFIG[UserRole.GUEST];

  // Réinitialisation du minuteur lors d'une action utilisateur
  const handleUserActivity = useCallback(() => {
    if (userRole === UserRole.GUEST || isExpiredRef.current) return;

    const now = Date.now();
    // Throttle : ne mettre à jour que toutes les 5 secondes au maximum pour les performances
    if (now - lastActivityRef.current > 5000) {
      lastActivityRef.current = now;
      if (showWarningModal) {
        setShowWarningModal(false);
      }
    }
  }, [userRole, showWarningModal]);

  // Écouteurs d'évènements d'activité
  useEffect(() => {
    if (userRole === UserRole.GUEST) return;

    isExpiredRef.current = false;
    lastActivityRef.current = Date.now();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [userRole, handleUserActivity]);

  // Boucle de suivi de l'inactivité (toutes les secondes)
  useEffect(() => {
    if (userRole === UserRole.GUEST || config.totalDuration <= 0) {
      setShowWarningModal(false);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = config.totalDuration - elapsedSeconds;

      if (remaining <= 0 && !isExpiredRef.current) {
        isExpiredRef.current = true;
        setShowWarningModal(false);
        if (intervalRef.current) clearInterval(intervalRef.current);

        const reasonMsg = userRole === UserRole.ADMIN
          ? "Session Administrateur expirée après 15 minutes d'inactivité."
          : "Session expirée après 30 minutes d'inactivité.";
        
        onSessionExpired(reasonMsg);
      } else {
        setSecondsRemaining(Math.max(0, remaining));
        if (remaining <= config.warningDuration && !showWarningModal) {
          setShowWarningModal(true);
        } else if (remaining > config.warningDuration && showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userRole, config, onSessionExpired, showWarningModal]);

  // Action du bouton "Rester connecté"
  const handleExtendSession = async () => {
    setIsRefreshing(true);
    try {
      // Rafraîchir le jeton de session Supabase Auth
      await supabase.auth.getSession();
      lastActivityRef.current = Date.now();
      setShowWarningModal(false);
    } catch (e) {
      console.error("Erreur rafraîchissement session:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Action du bouton "Se déconnecter"
  const handleImmediateLogout = () => {
    setShowWarningModal(false);
    onSessionExpired("Déconnexion volontaire.");
  };

  if (userRole === UserRole.GUEST || !showWarningModal || secondsRemaining === null) {
    return null;
  }

  // Formatage des secondes en MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-200/80 relative overflow-hidden">
        {/* Glow de fond */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isAdmin ? 'bg-red-500/20' : 'bg-emerald-500/20'}`} />

        {/* Icône principale */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${
          isAdmin ? 'bg-red-100 text-red-600 shadow-red-500/20' : 'bg-amber-100 text-amber-600 shadow-amber-500/20'
        }`}>
          {isAdmin ? <ShieldAlert size={32} /> : <Clock size={32} />}
        </div>

        {/* Titre et description */}
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-2">
          {isAdmin ? "Sécurité Administrateur" : "Session Inactive"}
        </h3>
        
        <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
          {isAdmin
            ? "Pour la sécurité des données de la plateforme, votre session administrateur expirera sous peu en l'absence d'activité."
            : "Vous êtes inactif depuis un moment. Afin de protéger votre compte 225 Chrétien, vous allez être déconnecté."}
        </p>

        {/* Minuteur visuel avec décompte */}
        <div className={`py-3 px-6 rounded-2xl mb-6 font-mono text-3xl sm:text-4xl font-extrabold tracking-wider border flex items-center justify-center gap-2 ${
          isAdmin
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <Clock className="animate-pulse h-7 w-7" />
          <span>{formattedTime}</span>
        </div>

        {/* Boutons d'action */}
        <div className="space-y-3">
          <button
            onClick={handleExtendSession}
            disabled={isRefreshing}
            className={`w-full text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 ${
              isAdmin
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            {isRefreshing ? (
              <RefreshCw className="animate-spin h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Rester connecté</span>
          </button>

          <button
            onClick={handleImmediateLogout}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Se déconnecter maintenant</span>
          </button>
        </div>
      </div>
    </div>
  );
};
