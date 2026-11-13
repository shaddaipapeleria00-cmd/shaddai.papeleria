/**
 * Utility for WhatsApp and WhatsApp Business links and phone number normalization
 */

export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  
  // Argentine phone numbers normalization
  // If starts with 0 (e.g. 011 or 0341), strip leading 0
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // If starts with 15 (e.g. 1523456789), strip 15
  if (digits.startsWith('15')) {
    digits = digits.slice(2);
  }
  // If 10 digits (e.g. 1123456789), add international prefix 549 (Argentina mobile)
  if (digits.length === 10) {
    digits = '549' + digits;
  } else if (digits.startsWith('54') && !digits.startsWith('549') && digits.length === 12) {
    digits = '549' + digits.slice(2);
  } else if (!digits.startsWith('54') && digits.length > 6 && digits.length < 12) {
    digits = '549' + digits;
  }
  
  return digits;
}

export type WhatsAppAppType = 'business' | 'standard';

export function getWhatsAppUrl(
  phone: string,
  text: string,
  appType: WhatsAppAppType = 'business'
): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  if (appType === 'business') {
    if (isAndroid) {
      // Direct intent to open WhatsApp Business app specifically on Android
      return `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
    }
    // Meta official API URL for Business
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    // Standard WhatsApp
    if (isAndroid) {
      // Direct intent to open Standard WhatsApp app specifically on Android
      return `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
}

export function openWhatsAppDirect(
  phone: string,
  text: string,
  appType: WhatsAppAppType = 'business'
): void {
  const url = getWhatsAppUrl(phone, text, appType);
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}
