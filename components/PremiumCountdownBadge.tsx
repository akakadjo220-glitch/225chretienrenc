import React, { useState, useEffect } from 'react';
import { Crown, Clock, Zap } from 'lucide-react';

interface PremiumCountdownBadgeProps {
  isPremium: boolean;
  expirationDate: string | Date | null | undefined;
  onUpgradeClick: () => void;
  variant?: 'header' | 'badge' | 'card';
}

export const PremiumCountdownBadge: React.FC<PremiumCountdownBadgeProps> = ({
  isPremium,
  expirationDate,
  onUpgradeClick,
  variant = 'header'
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (!isPremium || !expirationDate) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      return;
    }

    const calculateTimeLeft = () => {
      const target = new Date(expirationDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [isPremium, expirationDate]);

  if (!isPremium || timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 p-1.5 pl-3 pr-3 rounded-full border border-slate-200 transition shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span className="text-[11px] font-bold">Compte Standard (Gratuit)</span>
        <button
          onClick={onUpgradeClick}
          className="ml-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <Zap size={11} className="fill-current" />
          <span>Passer Premium</span>
        </button>
      </div>
    );
  }

  // Active Premium with Live Countdown
  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="inline-flex flex-wrap items-center gap-2 bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border border-amber-400/50 p-1.5 pl-3 pr-2 rounded-2xl shadow-sm text-left backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-amber-800 font-black text-xs">
        <Crown size={15} className="text-amber-500 fill-amber-400 animate-bounce" />
        <span className="uppercase tracking-wider text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">PREMIUM</span>
      </div>

      <div className="flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-white/80 px-2.5 py-1 rounded-xl border border-amber-200/80 shadow-2xs">
        <Clock size={12} className="text-amber-600 animate-spin-slow shrink-0" />
        <span>Expire dans :</span>
        <span className="font-mono font-black text-amber-950">
          {timeLeft.days > 0 && <span>{timeLeft.days}j </span>}
          <span>{formatTwoDigits(timeLeft.hours)}h </span>
          <span>{formatTwoDigits(timeLeft.minutes)}m </span>
          <span className="text-amber-600">{formatTwoDigits(timeLeft.seconds)}s</span>
        </span>
      </div>

      <button
        onClick={onUpgradeClick}
        className="text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-xl transition cursor-pointer shadow-2xs"
        title="Prolonger l'abonnement"
      >
        Prolonger ⚡
      </button>
    </div>
  );
};
