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
  [key: string]: any;
}

export function buildOrderDto(order: DbOrder, requestingUserId: string) {
  const canSeeAddress =
    order.seller_id === requestingUserId ||
    order.aggregator_id === requestingUserId;

  // SP1: phone visible to BOTH seller and aggregator, but only post-acceptance.
  const postAccepted = !['created', 'cancelled'].includes(order.status);
  const canSeeOtherPartyPhone =
    postAccepted &&
    (order.seller_id === requestingUserId ||
     order.aggregator_id === requestingUserId);

  const orderDisplayId =
    typeof order.order_number === 'number' && Number.isFinite(order.order_number)
      ? `#${order.order_number.toString().padStart(6, '0')}`
      : `#${order.id.slice(0, 8).toUpperCase()}`;

  return {
    ...order,
    order_display_id: orderDisplayId,
    pickup_address: canSeeAddress ? order.pickup_address : null,
    seller_name: order.seller_name,
    seller_phone: (requestingUserId === order.aggregator_id) && canSeeOtherPartyPhone ? (order.seller_display_phone ?? null) : null,
    aggregator_name: order.aggregator_name,
    aggregator_phone: (requestingUserId === order.seller_id) && canSeeOtherPartyPhone ? (order.aggregator_display_phone ?? null) : null,
    material_codes: order.material_codes || [],
    estimated_weights: order.estimated_weights || {},
    history: order.history || [],
    order_number: undefined,
    phone_hash: undefined,
    clerk_user_id: undefined,
    seller_display_phone: undefined,
    aggregator_display_phone: undefined,
  };
}
