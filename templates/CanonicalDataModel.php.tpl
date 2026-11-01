<?php
/**
 * CanonicalDataModel: Enforces strict canonical GA4 ecommerce schemas across all events.
 * Guarantees zero line_total in items[] while calculating exact monetary event values.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class CanonicalDataModel
{
    /**
     * Formats a canonical item for the GA4 items[] array.
     * Strictly allows only official GA4 parameters.
     */
    public static function formatItem(array $raw)
    {
        $itemId = isset($raw['item_id']) ? trim((string)$raw['item_id']) : '';
        $rawVariantId = isset($raw['variant_id']) ? trim((string)$raw['variant_id']) : '';

        // Only genuine positive combinations receive variant_id
        $variantId = ($rawVariantId !== '' && $rawVariantId !== '0' && (int)$rawVariantId > 0) 
            ? $rawVariantId 
            : '';

        $price = isset($raw['price']) ? (float)$raw['price'] : 0.0;
        $quantity = isset($raw['quantity']) ? (int)$raw['quantity'] : 1;
        if ($quantity <= 0) {
            $quantity = 1;
        }

        $item = [
            'item_id' => $itemId,
            'variant_id' => $variantId,
            'sku_id' => isset($raw['sku_id']) ? trim((string)$raw['sku_id']) : '',
            'item_name' => isset($raw['item_name']) ? trim((string)$raw['item_name']) : 'Product',
            'item_brand' => isset($raw['item_brand']) ? trim((string)$raw['item_brand']) : '',
            'item_category' => isset($raw['item_category']) ? trim((string)$raw['item_category']) : '',
            'item_variant' => isset($raw['item_variant']) ? trim((string)$raw['item_variant']) : '',
            'price' => $price,
            'quantity' => $quantity,
        ];

        if (isset($raw['index']) && is_numeric($raw['index'])) {
            $item['index'] = (int)$raw['index'];
        }
        if (!empty($raw['item_list_id'])) {
            $item['item_list_id'] = (string)$raw['item_list_id'];
        }
        if (!empty($raw['item_list_name'])) {
            $item['item_list_name'] = (string)$raw['item_list_name'];
        }
        if (!empty($raw['coupon'])) {
            $item['coupon'] = (string)$raw['coupon'];
        }
        if (isset($raw['discount']) && is_numeric($raw['discount'])) {
            $item['discount'] = (float)$raw['discount'];
        }

        return $item;
    }

    /**
     * Calculates the exact monetary value of an array of items.
     * Prioritizes internal _line_value and _raw_price * quantity.
     */
    public static function calculateItemsValue(array $items, $precision = 2)
    {
        $total = 0.0;
        foreach ($items as $item) {
            if (isset($item['_line_value']) && is_numeric($item['_line_value']) && (float)$item['_line_value'] > 0) {
                $total += (float)$item['_line_value'];
            } elseif (isset($item['line_total']) && is_numeric($item['line_total']) && (float)$item['line_total'] > 0) {
                $total += (float)$item['line_total'];
            } elseif (isset($item['_raw_price']) && is_numeric($item['_raw_price']) && (float)$item['_raw_price'] > 0) {
                $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
                $total += PricingEngine::roundHalfUp((float)$item['_raw_price'] * $qty, (int)$precision);
            } else {
                $price = isset($item['price']) ? (float)$item['price'] : 0.0;
                $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
                $total += $price * $qty;
            }
        }

        return PricingEngine::roundHalfUp($total, (int)$precision);
    }
}
