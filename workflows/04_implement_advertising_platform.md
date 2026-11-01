# Runbook 04: Implementing Multi-Platform Advertising Schemas

This runbook standardizes adding and configuring ad network conversion schemas alongside GA4.

---

## Step 1: Catalog ID Matching Verification
Before writing event payloads, confirm how the external merchant catalog is synced:
- **Google Merchant Center**: Usually `id_product` or `id_product_id_attribute` (composite).
- **Meta Catalog**: Usually `composite` or `reference_sku`.
- **TikTok Catalog**: Usually `composite`.
- **Pinterest Catalog**: Usually `reference_sku` or `composite`.

Ensure `ProductIdentityResolver.php` produces matching IDs across all platforms.

---

## Step 2: Implement Platform Builder in `CanonicalDataModel.php`
For any new advertising platform, define an isolated builder method:

```php
public static function buildPlatformPayload($platform, $eventName, $items, $currency, $value, $context)
{
    switch ($platform) {
        case 'snapchat':
            return [
                'event_name' => self::mapSnapchatEvent($eventName),
                'price' => $value,
                'currency' => $currency,
                'item_ids' => array_column($items, 'item_id'),
                'number_items' => array_sum(array_column($items, 'quantity'))
            ];
        case 'openai':
            return [
                'event_name' => $eventName,
                'currency' => $currency,
                'value_in_cents' => (int)round($value * 100),
                'items' => array_map(function($i) {
                    return [
                        'id' => $i['item_id'],
                        'quantity' => $i['quantity'],
                        'unit_price_in_cents' => (int)round($i['price'] * 100)
                    ];
                }, $items)
            ];
    }
}
```

---

## Step 3: Frontend Transport in `datalayer_core.js`
Ensure the client-side compiler builds the corresponding platform object under the event root:
- `dataLayer.push({ event: 'ps_purchase', ecommerce: {...}, meta: {...}, tiktok: {...}, google_ads: {...} });`

---

## Step 4: User Data & Consent Normalization
For enhanced conversions and CAPI:
1. Normalize email: `trim(strtolower($email))` -> SHA-256.
2. Normalize phone: E.164 format (e.g. `+491701234567`) -> SHA-256.
3. Enforce consent state check before dispatching payload.
