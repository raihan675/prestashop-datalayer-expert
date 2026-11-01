<?php
/**
 * PricingEngine: Authoritative PrestaShop Store Pricing & Unrounded Precision.
 *
 * Provides exact 6-decimal unrounded customer prices and store currency rounding.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class PricingEngine
{
    /**
     * Resolves the unrounded 6-decimal customer price directly from PrestaShop.
     */
    public static function getRawCustomerPrice(Product $product, $idAttribute = 0, $quantity = 1, Context $context = null)
    {
        if ($context === null) {
            $context = Context::getContext();
        }
        $isTaxIncl = PlatformAdapter::isTaxIncluded($context);

        $specificPriceOutput = null;
        $price = Product::getPriceStatic(
            (int)$product->id,
            $isTaxIncl,
            $idAttribute ? (int)$idAttribute : null,
            6, // 6 decimals calculation precision
            null,
            false,
            true,
            $quantity,
            false,
            (int)$context->customer->id,
            (int)$context->cart->id,
            (int)$context->cart->id_address_delivery,
            $specificPriceOutput,
            true,
            true,
            $context
        );

        return (float)$price;
    }

    /**
     * Resolves customer unit price rounded to currency precision.
     */
    public static function getCustomerPrice(Product $product, $idAttribute = 0, $quantity = 1, Context $context = null)
    {
        $raw = self::getRawCustomerPrice($product, $idAttribute, $quantity, $context);
        $precision = PlatformAdapter::getCurrencyPrecision($context);
        return self::roundHalfUp($raw, $precision);
    }

    /**
     * PrestaShop standard half-up rounding.
     */
    public static function roundHalfUp($number, $decimals = 2)
    {
        return round((float)$number, (int)$decimals, PHP_ROUND_HALF_UP);
    }
}
