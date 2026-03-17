export interface DbOrder {
  id: string;
  seller_id: string;
  aggregator_id: string | null;
  order_number?: number;
  status: string;
  pickup_address: string | null;
  pickup_locality: string | null;
  phone_hash?: string;
  clerk_user_id?: string;
  seller_name?: string;
  seller_display_phone?: string | null;  // SP1: populated from users.display_phone
  aggregator_name?: string;              // SP1: populated from joining users as agg
  aggregator_display_phone?: string | null; // SP1
  material_codes?: string[];
  estimated_weights?: Record<string, number>;
  estimated_value?: number | null;
  confirmed_value?: number | null;
  line_items?: Array<{
    material_code: string;
    weight_kg: number;
    rate_per_kg: number;
    amount: number;
  }>;
  order_items?: Array<{
    id: string;
    material_code: string;
    material_label: string;
    estimated_weight_kg: number | null;
    confirmed_weight_kg: number | null;
    rate_per_kg: number | null;
    amount: number | null;
  }>;
  estimated_total?: number | null;
  confirmed_total?: number | null;
  seller_has_rated?: boolean;
  [key: string]: any;
}

import { getChannelHmacPrefix } from './channelHelper';

export function buildOrderDto(order: DbOrder, requestingUserId: string, requestingUserClerkId?: string) {
  const canSeeAddress =
    order.seller_id === requestingUserId ||
    order.aggregator_id === requestingUserId;

  // SP1: phone visible to BOTH seller and aggregator, but only post-acceptance.
  const postAccepted = !['created', 'cancelled'].includes(order.status);
  const canSeeOtherPartyPhone =
    postAccepted &&
    (order.seller_id === requestingUserId ||
     order.aggregator_id === requestingUserId);

  const canSeeOrderOtp =
    requestingUserId === order.seller_id &&
    ['accepted', 'en_route', 'arrived', 'weighing_in_progress'].includes(order.status);

  const orderDisplayId =
    typeof order.order_number === 'number' && Number.isFinite(order.order_number)
      ? `#${order.order_number.toString().padStart(6, '0')}`
      : `#${order.id.slice(0, 8).toUpperCase()}`;

  const channelPrefix = requestingUserClerkId ? getChannelHmacPrefix(requestingUserClerkId) : null;
  const chat_channel = channelPrefix ? `${channelPrefix}:chat:${order.id}` : undefined;
  const order_channel = channelPrefix ? `${channelPrefix}:order:${order.id}` : undefined;
  const chatChannelToken = chat_channel || null;  // camelCase alias for mobile store
  const orderChannelToken = order_channel || null; // camelCase alias for mobile store
  const estimatedTotal =
    typeof order.estimated_total === 'number'
      ? order.estimated_total
      : (typeof order.estimated_value === 'number' ? order.estimated_value : 0);
  const confirmedTotal =
    typeof order.confirmed_total === 'number'
      ? order.confirmed_total
      : (typeof order.confirmed_value === 'number' ? order.confirmed_value : 0);
  const estimatedValue = estimatedTotal;
  const confirmedValue = confirmedTotal > 0 ? confirmedTotal : (typeof order.confirmed_value === 'number' ? order.confirmed_value : null);
  const displayAmount = confirmedValue ?? estimatedValue ?? 0;
  const isFinalAmount = confirmedValue !== null;

  const normalizedOrderItems = Array.isArray(order.order_items)
    ? order.order_items
    : (Array.isArray(order.line_items)
      ? order.line_items.map((item: any, idx: number) => ({
          id: String(item.id ?? `${order.id}-${idx}`),
          material_code: String(item.material_code ?? ''),
          material_label: String(item.material_label ?? item.material_code ?? ''),
          estimated_weight_kg: typeof item.estimated_weight_kg === 'number' ? item.estimated_weight_kg : null,
          confirmed_weight_kg: typeof item.confirmed_weight_kg === 'number' ? item.confirmed_weight_kg : null,
          rate_per_kg: typeof item.rate_per_kg === 'number' ? item.rate_per_kg : null,
          amount: typeof item.amount === 'number' ? item.amount : null,
        }))
      : []);

  const normalizedLineItems = Array.isArray(order.line_items)
    ? order.line_items
    : normalizedOrderItems.map((item) => ({
        material_code: item.material_code,
        weight_kg: item.confirmed_weight_kg ?? item.estimated_weight_kg ?? 0,
        rate_per_kg: item.rate_per_kg ?? 0,
        amount: item.amount ?? 0,
      }));

  return {
    ...order,
    order_display_id: orderDisplayId,
    chat_channel,
    order_channel,
    chatChannelToken,
    orderChannelToken,
    estimated_value: estimatedValue,
    confirmed_value: confirmedValue,
    estimated_total: estimatedTotal,
    confirmed_total: confirmedTotal,
    display_amount: displayAmount,
    is_final_amount: isFinalAmount,
    pickup_address: canSeeAddress ? order.pickup_address : null,
    seller_name: order.seller_name,
    seller_phone: (requestingUserId === order.aggregator_id) && canSeeOtherPartyPhone ? (order.seller_display_phone ?? null) : null,
    aggregator_name: order.aggregator_name,
    aggregator_phone: (requestingUserId === order.seller_id) && canSeeOtherPartyPhone ? (order.aggregator_display_phone ?? null) : null,
    material_codes: order.material_codes || [],
    estimated_weights: order.estimated_weights || {},
    order_items: normalizedOrderItems,
    line_items: normalizedLineItems,
    history: order.history || [],
    seller_has_rated: Boolean(order.seller_has_rated),
    otp: canSeeOrderOtp ? (order.otp ?? '') : '',
    order_number: undefined,
    phone_hash: undefined,
    clerk_user_id: undefined,
    seller_display_phone: undefined,
    aggregator_display_phone: undefined,
  };
}
