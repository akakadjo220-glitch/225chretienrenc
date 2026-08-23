import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface SocialProofTickerProps {
  userLocation?: string;
  userDenomination?: string;
  onNavigateTab?: (tab: string) => void;
}

interface StatItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  highlight: string;
  badge: string;
  badgeColor: string;
  targetTab?: string;
}

export const SocialProofTicker: React.FC<SocialProofTickerProps> = ({
  userLocation,
  userDenomination,
  onNavigateTab
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Algorithme de variation dynamique quotidienne basé sur le jour de l'année et le jour de la semaine
  const getDailyStats = (): StatItem[] => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const dayOfWeek = now.getDay(); // 0 = Dimanche, 6 = Samedi

    // Facteurs de variation selon le jour (ex: Dimanche & Mercredi plus de prières/foi, Samedi plus de speed dates)
    const weekendBonus = (dayOfWeek === 0 || dayOfWeek === 6) ? 85 : 0;
    const wednesdayBonus = dayOfWeek === 3 ? 45 : 0;

    // Calculs pseudo-aléatoires déterministes pour chaque jour
    const seed = dayOfYear * 17;
    const activeCount = 390 + (seed % 95) + weekendBonus + wednesdayBonus;
    const couplesCount = 18 + ((dayOfYear * 3) % 8);
    const prayersCount = 1220 + (seed % 280) + (dayOfWeek === 0 ? 120 : 0);
    const matchesToday = 48 + (seed % 38) + (dayOfWeek === 6 ? 25 : 0);
    const newMembersWeek = 85 + (seed % 42);

    // Villes et communes mises en avant dynamiquement selon le jour
    const POPULAR_COMMUNES = [
      'Cocody (Angré & Riviera)',
      'Yopougon & Songon',
      'Marcory & Zone 4',
      'Plateau & Cocody Danga',
      'Yamoussoukro & Bouaké',
      'San-Pédro & Daloa',
      'France, Paris (Diaspora)'
    ];
    const highlightedCommune = userLocation 
      ? userLocation.split(',')[0] 
      : POPULAR_COMMUNES[dayOfYear % POPULAR_COMMUNES.length];

    const todayDenomination = userDenomination || (dayOfWeek === 0 ? 'Catholiques & Évangéliques' : 'Chrétiens engagés');

    return [
      {
        id: 'active_singles',
        icon: '🟢',
        value: `${activeCount}+ Frères & Sœurs`,
        label: `actifs aujourd'hui`,
        highlight: `📍 ${highlightedCommune}`,
        badge: 'En Direct',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        targetTab: 'MATCHES'
      },
      {
        id: 'couples_blessed',
        icon: '💍',
        value: `${couplesCount} Couples Bénis`,
        label: `fiancés dans la prière`,
        highlight: `Témoignages récents`,
        badge: 'Fiançailles',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
        targetTab: 'FORUM'
      },
      {
        id: 'prayers_circle',
        icon: '🕯️',
        value: `${prayersCount.toLocaleString('fr-FR')} Prières`,
        label: `portées dans le Cercle`,
        highlight: `Intercession continue`,
        badge: 'Foi & Soutien',
        badgeColor: 'bg-teal-100 text-teal-900 border-teal-200',
        targetTab: 'PRAYERS'
      },
      {
        id: 'matches_today',
        icon: '⚡',
        value: `${matchesToday} Nouveaux Échanges`,
        label: `initiés dans la bienveillance`,
        highlight: `Spiritualité & Valeurs`,
        badge: 'Rencontres Saines',
        badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-200',
        targetTab: 'MATCHES'
      },
      {
        id: 'new_members',
        icon: '🕊️',
        value: `+${newMembersWeek} Inscriptions`,
        label: `cette semaine`,
        highlight: `Communauté ${todayDenomination}`,
        badge: 'Croissance',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        targetTab: 'MATCHES'
      }
    ];
  };

  const stats = getDailyStats();

  // Défilement automatique toutes les 4,5 secondes avec pause au survol
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stats.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, stats.length]);

  const currentStat = stats[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % stats.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + stats.length) % stats.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={() => {
        if (currentStat.targetTab && onNavigateTab) {
          onNavigateTab(currentStat.targetTab);
        }
      }}
      className="relative overflow-hidden bg-gradient-to-r from-white via-emerald-50/40 to-white hover:to-emerald-50/60 border border-emerald-200/90 hover:border-emerald-400 p-2 sm:p-2.5 px-3 sm:px-4 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer group select-none"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Contenu Principal avec animation de transition fluide */}
        <div
          key={currentStat.id}
          className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 animate-in fade-in slide-in-from-right-4 duration-300"
        >
          {/* Icône avec effet de pulsation */}
          <div className="text-base sm:text-lg shrink-0 flex items-center justify-center">
            {currentStat.icon === '🟢' ? (
              <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 my-1 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-600" />
              </span>
            ) : (
              <span className="group-hover:scale-110 transition-transform inline-block">
                {currentStat.icon}
              </span>
            )}
          </div>

          {/* Valeur & Libellé */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-[13px] leading-tight min-w-0">
            <span className="font-black text-slate-900 tracking-tight whitespace-nowrap">
              {currentStat.value}
            </span>
            <span className="text-slate-600 font-medium whitespace-nowrap hidden xs:inline">
              {currentStat.label}
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded-md border border-emerald-200/60 truncate">
              {currentStat.highlight}
            </span>
          </div>
        </div>

        {/* Côté Droit : Badge dynamique + Indicateurs de points + Micro-Flèches */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Indicateurs de dots */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            {stats.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx ? 'w-4 bg-emerald-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Statistique ${idx + 1}`}
              />
            ))}
          </div>

          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs ${currentStat.badgeColor}`}>
            {currentStat.badge}
          </span>

          {/* Navigation manuelle discrète */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 text-slate-400 hover:text-emerald-800 hover:bg-emerald-100/60 rounded-full transition cursor-pointer"
              title="Précédent"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 text-slate-400 hover:text-emerald-800 hover:bg-emerald-100/60 rounded-full transition cursor-pointer"
              title="Suivant"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
