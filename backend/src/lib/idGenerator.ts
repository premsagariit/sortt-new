/**
 * backend/src/lib/idGenerator.ts
 * ─────────────────────────────────────────────────────────────
 * Generates human-readable custom IDs for users and orders.
 *
 * USER ID FORMAT  : {first_name}_{s|a}_{phone_digit_suffix}
 * ORDER ID FORMAT : s_{seller_suffix}_{per_user_order_number}
 *
 * Phone digit suffix rule (1-indexed positions from RIGHT end):
 *   Seller  → even positions (2,4,6,8,10) from end = reversed[1,3,5,7,9]
 *   Aggregator → odd positions (1,3,5,7,9) from end = reversed[0,2,4,6,8]
 *
 * Example: phone = "+919876543210" → local = "9876543210"
 *   reversed = "0123456789"
 *   seller suffix   (reversed idx 1,3,5,7,9) = "1","3","5","7","9" → "13579"
 *   aggregator suffix (reversed idx 0,2,4,6,8) = "0","2","4","6","8" → "02468"
 */

/** Strip display phone to last 10 local digits */
export function localPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/** Extract the 5-digit suffix for a seller (even positions from end) */
export function sellerSuffix(phone: string): string {
  const reversed = localPhone(phone).split('').reverse().join('');
  return [1, 3, 5, 7, 9].map((i) => reversed[i] ?? '0').join('');
}

/** Extract the 5-digit suffix for an aggregator (odd positions from end) */
export function aggregatorSuffix(phone: string): string {
  const reversed = localPhone(phone).split('').reverse().join('');
  return [0, 2, 4, 6, 8].map((i) => reversed[i] ?? '0').join('');
}

/** Sanitize display name to lowercase alphanumeric + underscore, first word only */
export function sanitizeName(rawName: string): string {
  const first = rawName.split(/\s+/)[0] ?? 'user';
  return first.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
}

/**
 * Generate a unique user ID.
 * @param name       User's display name (can be temp like "User 2745")
 * @param phone      Normalized phone e.g. "+919876543210"
 * @param userType   'seller' | 'aggregator' | 'admin'
 */
export function generateUserId(
  name: string,
  phone: string | null,
  userType: 'seller' | 'aggregator' | 'admin'
): string {
  if (userType === 'admin') {
    const safeName = sanitizeName(name || 'admin');
    return `admin_${safeName}_${Date.now().toString(36).slice(-6)}`;
  }
  if (!phone) {
    // fallback: use timestamp+random
    return `${userType === 'seller' ? 's' : 'a'}_unknown_${Date.now().toString(36).slice(-8)}`;
  }
  const namePart = sanitizeName(name);
  const typeChar = userType === 'seller' ? 's' : 'a';
  const suffix = userType === 'seller' ? sellerSuffix(phone) : aggregatorSuffix(phone);
  return `${namePart}_${typeChar}_${suffix}`;
}

/**
 * Generate a unique order ID using the seller's phone suffix + per-user order number.
 * @param sellerPhone   Normalized phone of the seller
 * @param orderNumber   Per-seller sequential order count (1-based)
 */
export function generateOrderId(sellerPhone: string, orderNumber: number): string {
  const suffix = sellerSuffix(sellerPhone);
  return `s_${suffix}_${orderNumber}`;
}
