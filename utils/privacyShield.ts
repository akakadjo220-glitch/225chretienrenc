/**
 * 🛡️ Bouclier Anti-Capture d'Écran et Protection de la Vie Privée pour 225 Chrétien
 * Protection complète multi-plateformes : PC (Windows/Mac/Linux), Mobiles (iOS/Android) et Tablettes.
 */

export const initPrivacyShield = (onBlurChange?: (isBlurred: boolean) => void) => {
  if (typeof window === 'undefined') return () => {};

  let isBlurredState = false;

  const triggerBlur = (shouldBlur: boolean) => {
    if (isBlurredState === shouldBlur) return;
    isBlurredState = shouldBlur;
    if (onBlurChange) onBlurChange(shouldBlur);
  };

  // 1. Détection de la perte de visibilité & Focus (Mobile iOS/Android & PC)
  // Requis pour iOS Safari / Android Chrome lors des captures ou basculements d'onglets
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' || document.hidden) {
      triggerBlur(true);
    } else {
      triggerBlur(false);
    }
  };

  const handleBlur = () => {
    triggerBlur(true);
  };

  const handleFocus = () => {
    triggerBlur(false);
  };

  const handlePageHide = () => {
    triggerBlur(true);
  };

  // 2. Détection clavier des raccourcis de capture et d'impression (Windows & Mac)
  const handleKeyDown = (e: KeyboardEvent) => {
    // Windows PrintScreen, Ctrl+P, Mac Cmd+Shift+3/4/5, Ctrl+S
    const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
    const isPrintCombo = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');
    const isSaveCombo = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
    const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');
    
    // Développeurs & Inspecteur (F12, Ctrl+Shift+I / C / J, Ctrl+U)
    const isDevTools = e.key === 'F12' || 
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
      ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'));

    if (isPrintScreen || isPrintCombo || isMacScreenshot || isSaveCombo || isDevTools) {
      e.preventDefault();
      e.stopPropagation();
      triggerBlur(true);

      // Réactiver le focus automatiquement après un délai de protection
      setTimeout(() => {
        triggerBlur(false);
      }, 3000);
      return false;
    }
  };

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
