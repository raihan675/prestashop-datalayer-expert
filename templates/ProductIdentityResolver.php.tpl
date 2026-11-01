<?php
/**
 * ProductIdentityResolver: Database-driven product & variant identity resolution.
 * Strictly sources base IDs, combinations, references, and unrounded prices.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class ProductIdentityResolver
{
    public static function resolveProductIdentifiers(Product $product, $idProductAttribute = 0, $idLanguage = null)
    {
        $idProduct = (string)$product->id;
        $idAttr = (int)$idProductAttribute;

        $sku = self::resolveVariantReference($product, $idAttr);
        $variantName = self::resolveVariantName($product, $idAttr, $idLanguage);

        return [
            'item_id' => $idProduct,
            'variant_id' => $idAttr > 0 ? (string)$idAttr : '',
            'sku_id' => $sku,
            'item_variant' => $variantName,
        ];
    }

    public static function resolveVariantReference(Product $product, $idProductAttribute = 0)
    {
        $idAttr = (int)$idProductAttribute;
        if ($idAttr > 0) {
            $combination = new Combination($idAttr);
            if (Validate::isLoadedObject($combination) && !empty($combination->reference)) {
                return trim((string)$combination->reference);
            }
        }
        return !empty($product->reference) ? trim((string)$product->reference) : '';
    }

    public static function resolveVariantName(Product $product, $idProductAttribute = 0, $idLanguage = null)
    {
        $idAttr = (int)$idProductAttribute;
        if ($idAttr <= 0) return '';

        if (!$idLanguage) {
            $idLanguage = (Context::getContext() && Context::getContext()->language) 
                ? (int)Context::getContext()->language->id 
                : 1;
        }

        if (method_exists($product, 'getAttributeCombinationsById')) {
            $combos = $product->getAttributeCombinationsById($idAttr, $idLanguage);
            if (!empty($combos)) {
                $parts = [];
                foreach ($combos as $c) {
                    $group = !empty($c['group_name']) ? trim($c['group_name']) : '';
                    $attr = !empty($c['attribute_name']) ? trim($c['attribute_name']) : '';
                    if ($group && $attr) {
                        $parts[] = "{$group}: {$attr}";
                    } elseif ($attr) {
                        $parts[] = $attr;
                    }
                }
                return implode(' / ', $parts);
            }
        }
        return '';
    }

    public static function getProductCombinationsMap(Product $product, $idLanguage = null)
    {
        if (!$idLanguage) {
            $idLanguage = (Context::getContext() && Context::getContext()->language) 
                ? (int)Context::getContext()->language->id 
                : 1;
        }

        $map = [];
        if (method_exists($product, 'getAttributeCombinations')) {
            $combos = $product->getAttributeCombinations($idLanguage);
            if (!empty($combos)) {
                foreach ($combos as $c) {
                    $idAttr = (string)$c['id_product_attribute'];
                    $groupName = !empty($c['group_name']) ? $c['group_name'] : '';
                    $attrName = !empty($c['attribute_name']) ? $c['attribute_name'] : '';
                    $label = ($groupName && $attrName) ? "{$groupName}: {$attrName}" : $attrName;
                    $ref = !empty($c['reference']) ? trim($c['reference']) : trim((string)$product->reference);

                    if (!isset($map[$idAttr])) {
                        $price = PricingEngine::getCustomerPrice($product, (int)$idAttr, 1);
                        $rawPrice = PricingEngine::getRawCustomerPrice($product, (int)$idAttr, 1);
                        $map[$idAttr] = [
                            'item_id' => (string)$product->id,
                            'variant_id' => $idAttr,
                            'sku_id' => $ref,
                            'item_name' => (string)$product->name,
                            'item_variant' => $label,
                            'price' => (float)$price,
                            '_raw_price' => (float)$rawPrice,
                            '_line_value' => (float)$price,
                        ];
                    } else {
                        if ($label) {
                            $map[$idAttr]['item_variant'] .= ' / ' . $label;
                        }
                    }
                }
            }
        }
        return $map;
    }
}
