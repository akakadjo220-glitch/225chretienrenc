/**
 * Anti-XSS and File Security Utilities for 225 Chrétien
 */

export const sanitizeInput = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateImageFile = (file: File, maxMb: number = 10): { valid: boolean; error?: string } => {
  if (!file) return { valid: false, error: 'Aucun fichier sélectionné.' };

  // 1. Taille maximale
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `Le fichier dépasse la taille maximale autorisée de ${maxMb}MB.` };
  }

  // 2. Type MIME et extension
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'];
  
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Format de fichier non autorisé. Formats acceptés: JPG, PNG, WEBP, GIF.' };
  }

  return { valid: true };
};
