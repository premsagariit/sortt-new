# Day 11 Context: Wiring Mobile to Live API

## Newly Confirmed Column Names
- `messages`: `id`, `order_id`, `sender_id`, `content`, `created_at`
- `ratings`: `id`, `order_id`, `rated_by`, `rated_user`, `score`, `comment`, `created_at`
- `disputes`: `id`, `order_id`, `raised_by`, `issue_type`, `description`, `status`, `resolved_at`, `resolution_note`, `created_at`
- `order_media`: `id`, `order_id`, `uploader_id`, `media_type`, `storage_path`, `created_at`

## Allowed Values Constraints
- **order_media media_type**: `scrap_photo`, `scale_photo`, `kyc_aadhaar_front`, `kyc_aadhaar_back`, `kyc_selfie`, `kyc_shop`, `kyc_vehicle`, `invoice`
- **disputes issue_type**: `wrong_weight`, `payment_not_made`, `no_show`, `abusive_behaviour`, `other` (Note: `weight_mismatch` is invalid).

## Confirmed Response Shapes
- `GET /api/orders/feed`: `{ orders: [...], nextCursor: string | null, hasMore: boolean }` (Orders contain `pickup_address_text: null` for pre-acceptance view).
- `POST /api/messages`: `{ message_id: string }`
- `POST /api/disputes`: `{ dispute_id: string }`

## Day 11 Files to Touch (from PLAN.md)
- Seller Side Wiring:
  - Listing Wizard: `apps/mobile/app/(seller)/listing/*.tsx`
  - Seller Orders List: `apps/mobile/app/(seller)/orders.tsx`
  - Order Detail: `apps/mobile/app/(shared)/order/[id].tsx`
  - Market Rates: `apps/mobile/app/(seller)/browse.tsx`
  - Profile: `apps/mobile/app/(seller)/profile.tsx`
- Aggregator Side Wiring:
  - Nearby Feed: `apps/mobile/app/(aggregator)/home.tsx`
  - Aggregator Order List: `apps/mobile/app/(aggregator)/orders.tsx`
  - Execution Flow: `apps/mobile/app/(aggregator)/execution/*.tsx`
  - Rates / Profile: `apps/mobile/app/(aggregator)/profile.tsx`, `edit-profile.tsx`

## Known Gotchas from Day 10 (Do Not Repeat in Day 11)
- `order_status_history.status` is actually `new_status`.
- `aggregator_availability` is missing `city_code`. Always query `city_code` via `aggregator_profiles` when needed.
- `req.user.city_code` does not exist from the standard auth middleware for aggregators. Must fetch from DB profile.
- `aggregator_material_rates` FK is `aggregator_id`, not `user_id`.
- The `Uploadthing` dev fallback URL will not expire. Do not rely on local expiry tests for security validation.
- `before_photo` and `after_photo` media types do NOT exist in the schema. Use `scrap_photo`.
