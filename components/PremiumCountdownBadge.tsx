import React, { useState, useEffect } from 'react';
import { Crown, Clock, Zap, Calendar } from 'lucide-react';

export interface PremiumCountdownBadgeProps {
  isPremium?: boolean | null;
  expirationDate?: string | Date | null;
  onUpgradeClick: () => void;
  variant?: 'header' | 'badge' | 'card' | 'compact';
  userName?: string;
}

export const PremiumCountdownBadge: React.FC<PremiumCountdownBadgeProps> = ({
  isPremium,
  expirationDate,
  onUpgradeClick,
  variant = 'header',
  userName
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalRemainingMs: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalRemainingMs: 0,
    isExpired: !isPremium
  });

  useEffect(() => {
    if (!isPremium || !expirationDate) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalRemainingMs: 0,
        isExpired: true
      });
      return;
    }

    const calculateTimeLeft = () => {
      const target = new Date(expirationDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalRemainingMs: 0,
          isExpired: true
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalRemainingMs: diff,
        isExpired: false
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [isPremium, expirationDate]);

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  // Détection de la formule selon la durée
  const getPlanInfo = (days: number, hours: number) => {
    if (days >= 200) {
      return { name: 'Formule Annuelle (1 An)', totalDays: 365 };
    } else if (days >= 100) {
      return { name: 'Formule Semestrielle (6 Mois)', totalDays: 180 };
    } else if (days >= 35) {
      return { name: 'Formule Trimestrielle (3 Mois)', totalDays: 90 };
    } else if (days >= 2) {
      return { name: 'Formule 1 Mois (30 Jours)', totalDays: 30 };
    } else {
      return { name: 'Pass 24 Heures (1 Jour)', totalDays: 1 };
    }
  };

  const planInfo = getPlanInfo(timeLeft.days, timeLeft.hours);
  const totalPlanMs = planInfo.totalDays * 24 * 60 * 60 * 1000;
  const progressPercent = Math.min(100, Math.max(3, Math.round((timeLeft.totalRemainingMs / totalPlanMs) * 100)));

  const formattedExpiration = expirationDate ? new Date(expirationDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  // -------------------------------------------------------------
  // 1. VARIANT CARD : Design sobre, épuré et moderne (UX Pro Max)
  // -------------------------------------------------------------
  if (variant === 'card') {
    // ÉTAT : COMPTE STANDARD / NON ABONNÉ OU EXPIRÉ
    if (!isPremium || timeLeft.isExpired) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs mb-6 text-left transition hover:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                <Crown size={20} className="text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Compte Standard</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Gratuit
                  </span>
                  {timeLeft.isExpired && expirationDate && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                      Expiré
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Abonnez-vous dès 500 F pour débloquer les messages directs et voir vos likes.
                </p>
              </div>
            </div>

            <button
              onClick={onUpgradeClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Zap size={14} className="fill-current text-amber-300" />
              <span>Passer Premium</span>
            </button>
          </div>
        </div>
      );
    }

    // ÉTAT : ABONNEMENT ACTIF AVEC COMPTEUR ÉPURÉ EN TEMPS RÉEL
    return (
      <div className="bg-white rounded-2xl border border-amber-200/90 p-5 sm:p-6 shadow-xs mb-6 text-left">
        {/* Ligne d'en-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Crown size={20} className="fill-amber-400 text-amber-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Abonnement Premium</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Actif
                </span>
                <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {planInfo.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Valable jusqu'au {formattedExpiration}
              </p>
            </div>
          </div>

          <button
            onClick={onUpgradeClick}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Zap size={13} className="text-amber-600" />
            <span>Prolonger</span>
          </button>
        </div>

        {/* 🔢 Blocs du compteur (Design clair, épuré, haute lisibilité) */}
        <div className="my-4">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
            {/* Jours */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 sm:p-3">
              <span className="text-xl sm:text-3xl font-black font-mono text-slate-900 block">
                {formatTwoDigits(timeLeft.days)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">
                Jours
              </span>
            </div>

            {/* Heures */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 sm:p-3">
              <span className="text-xl sm:text-3xl font-black font-mono text-slate-900 block">
                {formatTwoDigits(timeLeft.hours)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">
                Heures
              </span>
            </div>

            {/* Minutes */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 sm:p-3">
              <span className="text-xl sm:text-3xl font-black font-mono text-slate-900 block">
                {formatTwoDigits(timeLeft.minutes)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">
                Minutes
              </span>
            </div>

            {/* Secondes */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 sm:p-3">
              <span className="text-xl sm:text-3xl font-black font-mono text-emerald-700 block">
                {formatTwoDigits(timeLeft.seconds)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 mt-0.5 block">
                Secondes
              </span>
            </div>
          </div>

          {/* Jauge fine et discrète */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-1000"
              style={{ width: `${Math.max(3, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. VARIANT HEADER / BADGE : Format compact pour barre supérieure
  // -------------------------------------------------------------
  if (!isPremium || timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 p-1.5 pl-3 pr-2 rounded-full border border-slate-200 transition shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span className="text-[11px] font-bold">Standard</span>
        <button
          onClick={onUpgradeClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <Zap size={10} className="fill-current text-amber-300" />
          <span>Activer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 bg-amber-50/90 border border-amber-200/90 p-1.5 pl-3 pr-2 rounded-2xl shadow-2xs text-left">
      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
        <Crown size={14} className="text-amber-600 fill-amber-400" />
        <span className="uppercase text-[10px] font-black text-amber-800">PREMIUM</span>
      </div>

      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-amber-200/60 shadow-2xs font-mono">
        <Clock size={11} className="text-amber-600 shrink-0" />
        {timeLeft.days > 0 && <span>{timeLeft.days}j </span>}
        <span>{formatTwoDigits(timeLeft.hours)}h </span>
        <span>{formatTwoDigits(timeLeft.minutes)}m </span>
        <span className="text-emerald-700 font-black">{formatTwoDigits(timeLeft.seconds)}s</span>
      </div>

      <button
        onClick={onUpgradeClick}
        className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-0.5 rounded-lg transition cursor-pointer"
        title="Prolonger l'abonnement"
      >
        Prolonger
      </button>
    </div>
  );
};

export default PremiumCountdownBadge;
