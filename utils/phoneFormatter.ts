/**
 * 📱 Utilitaire de Détection et de Formatage des Numéros de Téléphone
 * Convertit les emails synthétiques (ex: wa_0544246972@225chretien.ci) en numéros de téléphone lisibles.
 */

export const formatPhoneNumber = (phoneOrEmail?: string, rawPhone?: string): string => {
  // Si un numéro brut existe déjà
  if (rawPhone && rawPhone.trim()) {
    const cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `📱 ${cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
    }
    return `📱 ${rawPhone.trim()}`;
  }

  if (!phoneOrEmail) return '';

  // Détection du motif synthétique wa_NUMBER@225chretien.ci
  const waMatch = phoneOrEmail.match(/wa_(\d+)@/);
  if (waMatch && waMatch[1]) {
    const digits = waMatch[1];
    if (digits.length === 10) {
      return `📱 ${digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
    }
    return `📱 ${digits}`;
  }

  // Si c'est un véritable email
  if (phoneOrEmail.includes('@') && !phoneOrEmail.endsWith('@225chretien.ci')) {
    return phoneOrEmail;
  }

  // Fallback si c'est déjà un numéro
  const digits = phoneOrEmail.replace(/\D/g, '');
  if (digits.length >= 8) {
    if (digits.length === 10) {
      return `📱 ${digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
    }
    return `📱 ${digits}`;
  }

  return phoneOrEmail;
};

export const getCleanDisplayContact = (user: { email?: string; phone?: string; raw_user_meta_data?: any }): string => {
  if (user.phone && user.phone.trim()) {
    return formatPhoneNumber(user.phone);
  }

  const metaPhone = user.raw_user_meta_data?.phone || user.raw_user_meta_data?.full_phone;
  if (metaPhone) {
    return formatPhoneNumber(metaPhone);
  }

  if (user.email) {
    if (user.email.startsWith('wa_') && user.email.includes('@225chretien.ci')) {
      return formatPhoneNumber(user.email);
    }
    return user.email;
  }

  return '';
};
