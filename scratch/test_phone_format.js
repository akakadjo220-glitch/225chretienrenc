const formatPhoneNumber = (phone) => {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  // Si commence par 225 suivi de 10 chiffres (ex: 2250779604919) -> 2250779604919
  if (cleaned.startsWith('225') && cleaned.length === 13) {
    return cleaned;
  }
  // Si 10 chiffres commençant par 0 (ex: 0779604919) -> 2250779604919
  if (cleaned.length === 10) {
    return '225' + cleaned;
  }
  // Si commence par 225 et 12 chiffres (ex: 225779604919) -> 2250779604919 (réinsérer le 0)
  if (cleaned.startsWith('225') && cleaned.length === 12) {
    return '2250' + cleaned.substring(3);
  }

  return cleaned;
};

console.log("0779604919 ->", formatPhoneNumber("0779604919"));
console.log("+2250779604919 ->", formatPhoneNumber("+2250779604919"));
console.log("+225 07 79 60 49 19 ->", formatPhoneNumber("+225 07 79 60 49 19"));
console.log("2250779604919 ->", formatPhoneNumber("2250779604919"));
