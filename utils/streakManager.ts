/**
 * 🔥 Gestionnaire de Séries de Foi (Daily Faith Streaks) pour 225 Chrétien
 * Calcule et conserve les jours consécutifs de méditation et de présence.
 */

export interface StreakInfo {
  streakCount: number;
  lastStreakDate: string;
  isNewStreakToday: boolean;
  milestoneReached: number | null; // 3, 7, 30, 90, 365
}

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const updateDailyStreak = async (userId: string): Promise<StreakInfo> => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  let streakCount = 1;
  let lastStreakDate = today;
  let isNewStreakToday = false;
  let milestoneReached: number | null = null;

  try {
    // Lecture sécurisée des métadonnées de streak dans localStorage
    const storedCount = Number(localStorage.getItem(`_225_streak_${userId}`)) || 0;
    const storedDate = localStorage.getItem(`_225_streak_date_${userId}`) || '';

    if (storedDate === today) {
      // Déjà validé aujourd'hui
      streakCount = storedCount || 1;
      lastStreakDate = today;
      isNewStreakToday = false;
    } else if (storedDate === yesterday) {
      // Se connecte le jour suivant : Incrémentation !
      streakCount = storedCount + 1;
      lastStreakDate = today;
      isNewStreakToday = true;
    } else {
      // Plus d'un jour s'est écoulé : Réinitialisation à 1
      streakCount = 1;
      lastStreakDate = today;
      isNewStreakToday = true;
    }

    // Vérification des paliers (3, 7, 14, 30, 60, 90, 180, 365 jours)
    if (isNewStreakToday && [3, 7, 14, 30, 60, 90, 180, 365].includes(streakCount)) {
      milestoneReached = streakCount;
    }

    // Sauvegarde fiable en stockage local
    localStorage.setItem(`_225_streak_${userId}`, streakCount.toString());
    localStorage.setItem(`_225_streak_date_${userId}`, today);

  } catch (e) {
    console.warn("Notice mise à jour Série de Foi:", e);
  }

  return {
    streakCount,
    lastStreakDate,
    isNewStreakToday,
    milestoneReached
  };
};
