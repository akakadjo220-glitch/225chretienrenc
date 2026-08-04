/**
 * 🛡️ Bouclier Anti-Capture d'Écran et Protection de la Vie Privée pour 225 Chrétien
 * Empêche les fuites d'images, le vol de contenu et floute l'écran lors du changement d'onglet ou capture.
 */

export const initPrivacyShield = (onBlurChange?: (isBlurred: boolean) => void) => {
  if (typeof window === 'undefined') return () => {};

  // 1. Détection de la perte de focus (Changement d'application ou d'onglet)
  const handleBlur = () => {
    if (onBlurChange) onBlurChange(true);
  };

  const handleFocus = () => {
    if (onBlurChange) onBlurChange(false);
  };

  // 2. Détection de la touche Impr. Écran (PrintScreen)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4'))) {
      if (onBlurChange) onBlurChange(true);
      // Réactiver le focus après 2 secondes
      setTimeout(() => {
        if (onBlurChange) onBlurChange(false);
      }, 2500);
    }
  };

  // 3. Empêcher le menu contextuel (clic droit) sur les images sensibles
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'IMG' || target.closest('.no-download'))) {
      e.preventDefault();
      return false;
    }
  };

  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('keydown', handleKeyDown);
  document.addEventListener('contextmenu', handleContextMenu);

  return () => {
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('contextmenu', handleContextMenu);
  };
};

/**
 * Hash simple pour le code PIN
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
