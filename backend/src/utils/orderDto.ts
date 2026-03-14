export interface DbOrder {
  id: string;
  seller_id: string;
  aggregator_id: string | null;
  status: string;
  pickup_address: string | null;
  pickup_locality: string | null;
  phone_hash?: string;
  clerk_user_id?: string;
  material_codes?: string[];
  estimated_weights?: Record<string, number>;
  [key: string]: any;
}

export function buildOrderDto(order: DbOrder, requestingUserId: string) {
  const canSeeAddress =
    order.seller_id === requestingUserId ||
    order.aggregator_id === requestingUserId;
  return {
    ...order,
    pickup_address: canSeeAddress ? order.pickup_address : null,
    material_codes: order.material_codes || [],
    estimated_weights: order.estimated_weights || {},
    phone_hash: undefined,
    clerk_user_id: undefined,
  };
}
