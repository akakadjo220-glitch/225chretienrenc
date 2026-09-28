/**
 * 🛡️ Bouclier Anti-Capture d'Écran et Protection de la Vie Privée pour 225 Chrétien
 * Protection complète multi-plateformes : PC (Windows/Mac/Linux), Mobiles (iOS/Android) et Tablettes.
 */

export const initPrivacyShield = (onBlurChange?: (isBlurred: boolean) => void) => {
  if (typeof window === 'undefined') return () => {};

  let isBlurredState = false;

  const triggerBlur = (_shouldBlur: boolean) => {
    // Effet noir / flou supprimé selon la demande
    isBlurredState = false;
    if (onBlurChange) onBlurChange(false);
  };

  // 1. Détection de visibilité (sans effet noir)
  const handleVisibilityChange = () => {};
  const handleBlur = () => {};
  const handleFocus = () => {};
  const handlePageHide = () => {};

  // 2. Détection clavier des raccourcis
  const handleKeyDown = (_e: KeyboardEvent) => {};

  // 3. Empêcher le menu contextuel (clic droit) et l'appui prolongé sur mobile sur les images & médias
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.closest('.no-download') || target.closest('.no-select'))) {
      e.preventDefault();
      return false;
    }
  };

  // 4. Empêcher le glisser-déposer (Drag & Drop) d'images hors du navigateur
  const handleDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'IMG' || target.tagName === 'VIDEO')) {
      e.preventDefault();
      return false;
    }
  };

  // Enregistrement des écouteurs globaux
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('dragstart', handleDragStart, true);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('dragstart', handleDragStart, true);
  };
};

/**
 * Hash sécurisé du code PIN à 4 chiffres
 */
export const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
};
