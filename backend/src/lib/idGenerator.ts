/**
 * backend/src/lib/idGenerator.ts
 * ─────────────────────────────────────────────────────────────
 * Generates human-readable custom IDs for users and orders.
 *
 * USER ID FORMAT  : {first_name}_{s|a}_{phone_digit_suffix}
 * ORDER ID FORMAT : s_{seller_suffix}_{per_user_order_number}
 *
 * Phone digit suffix rule (positions from RIGHT end, 1-indexed):
 *   Seller     → even positions (2,4,6,8,10) from end = reversed array indices [1,3,5,7,9]
 *                e.g. phone "9876543210", reversed = "0123456789" → idx 1,3,5,7,9 → "13579"
 *   Aggregator → odd positions  (1,3,5,7,9) from end = reversed array indices [0,2,4,6,8]
 *                e.g. phone "9876543210", reversed = "0123456789" → idx 0,2,4,6,8 → "02468"
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

/**
 * Extract the 5-digit suffix for a SELLER.
 * Uses even positions from end (2nd,4th,6th,8th,10th) = reversed indices [1,3,5,7,9].
 * e.g. phone "9876543210" → reversed "0123456789" → indices 1,3,5,7,9 → "13579"
 */
export function sellerSuffix(phone: string): string {
  const reversed = localPhone(phone).split('').reverse().join('');
  return [1, 3, 5, 7, 9].map((i) => reversed[i] ?? '0').join('');
}

/**
 * Extract the 5-digit suffix for an AGGREGATOR.
 * Uses odd positions from end (1st,3rd,5th,7th,9th) = reversed indices [0,2,4,6,8].
 * e.g. phone "9876543210" → reversed "0123456789" → indices 0,2,4,6,8 → "02468"
 */
export function aggregatorSuffix(phone: string): string {
  const reversed = localPhone(phone).split('').reverse().join('');
  return [0, 2, 4, 6, 8].map((i) => reversed[i] ?? '0').join('');
}

/**
 * Sanitize display name for use in user ID.
 * Converts full name to lowercase, replaces spaces with underscores, strips special chars.
 * e.g. "Prem Sagar" → "prem_sagar", "User 7207" → "user_7207"
 */
export function sanitizeName(rawName: string): string {
  const cleaned = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // remove special chars but keep spaces
    .replace(/\s+/g, '_')          // spaces → underscores
    .replace(/^_+|_+$/g, '');      // strip leading/trailing underscores
  return cleaned || 'user';
}

/**
 * Generate a unique user ID.
 * Format: {name}_{s|a}_{phone_digit_suffix}
 * @param name       User's display name from the `name` column (e.g. "Prem Sagar")
 * @param phone      Normalized phone e.g. "+919876543210"
 * @param userType   'seller' | 'aggregator' | 'admin'
 */
export function generateUserId(
  name: string,
  phone: string | null,
  userType: 'seller' | 'aggregator' | 'admin' | 'super_admin' | string,
  email?: string | null
): string {
  const safeName = sanitizeName(name || 'user');

  if (userType === 'super_admin') {
    return `${safeName}_super_admin`;
  }

  if (userType === 'admin') {
    let emailLocal = '';
    if (email && email.includes('@')) {
      emailLocal = sanitizeName(email.split('@')[0]);
    } else {
      emailLocal = Date.now().toString(36).slice(-6); // fallback
    }
    return `${safeName}_admin_${emailLocal}`;
  }

  if (!phone) {
    // fallback: use timestamp+random
    return `${userType === 'seller' ? 's' : 'a'}_unknown_${Date.now().toString(36).slice(-8)}`;
  }
  
  const typeChar = userType === 'seller' ? 's' : 'a';
  const suffix = userType === 'seller' ? sellerSuffix(phone) : aggregatorSuffix(phone);
  return `${safeName}_${typeChar}_${suffix}`;
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
