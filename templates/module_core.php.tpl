<?php
/**
 * PrestaShop DataLayer & Conversion Tracking Core Module Template
 *
 * @author    Webanalytics Pro <support@webanalyticspro.com>
 * @copyright Enterprise Ecommerce Analytics Architecture
 * @license   MIT
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . '{{MODULE_NAME}}/classes/PricingEngine.php';
require_once _PS_MODULE_DIR_ . '{{MODULE_NAME}}/classes/ProductIdentityResolver.php';
require_once _PS_MODULE_DIR_ . '{{MODULE_NAME}}/classes/CanonicalDataModel.php';

class {{MODULE_CLASS}} extends Module
{
    public function __construct()
    {
        $this->name = '{{MODULE_NAME}}';
        $this->tab = 'analytics_stats';
        $this->version = '{{MODULE_VERSION}}';
        $this->author = 'Webanalytics Pro';
        $this->need_instance = 0;
        $this->bootstrap = true;
        $this->ps_versions_compliancy = ['min' => '1.7.0.0', 'max' => _PS_VERSION_];

        parent::__construct();

        $this->displayName = $this->l('Enterprise Ecommerce DataLayer & Server-Side Tracking');
        $this->description = $this->l('Authoritative backend ecommerce dataLayer with multi-platform ad conversion schemas and real-time AJAX event synchronization.');
    }

    public function install()
    {
        if (Shop::isFeatureActive()) {
            Shop::setContext(Shop::CONTEXT_ALL);
        }

        return parent::install()
            && $this->registerHook('displayHeader')
            && $this->registerHook('displayFooter')
            && $this->registerHook('displayOrderConfirmation')
            && $this->registerHook('actionCartSave')
            && $this->registerHook('actionCartUpdateQuantityBefore')
            && $this->registerHook('actionOrderStatusPostUpdate')
            && $this->registerHook('actionObjectOrderSlipAddAfter')
            && $this->initDefaultConfig();
    }

    public function uninstall()
    {
        return $this->deleteConfig() && parent::uninstall();
    }

    private function initDefaultConfig()
    {
        Configuration::updateValue('PS_GTM_CONTAINER_ID', '');
        Configuration::updateValue('PS_GTM_EVENT_PREFIX', 'ps_');
        Configuration::updateValue('PS_GTM_CATALOG_ID_FORMAT', 'composite');
        Configuration::updateValue('PS_GTM_USE_SKU_FALLBACK', '1');
        Configuration::updateValue('PS_GTM_ENABLE_GA4', '1');
        Configuration::updateValue('PS_GTM_ENABLE_META', '1');
        Configuration::updateValue('PS_GTM_ENABLE_TIKTOK', '1');
        Configuration::updateValue('PS_GTM_ENABLE_GOOGLE_ADS', '1');
        Configuration::updateValue('PS_GTM_ENABLE_PINTEREST', '0');
        Configuration::updateValue('PS_GTM_ENABLE_MICROSOFT', '0');
        Configuration::updateValue('PS_GTM_ENABLE_OPENAI', '0');
        Configuration::updateValue('PS_GTM_ENABLE_SNAPCHAT', '0');
        Configuration::updateValue('PS_GTM_PRICE_ROUNDING_MODE', 'unrounded_raw');
        return true;
    }

    private function deleteConfig()
    {
        $keys = [
            'PS_GTM_CONTAINER_ID', 'PS_GTM_EVENT_PREFIX', 'PS_GTM_CATALOG_ID_FORMAT',
            'PS_GTM_USE_SKU_FALLBACK', 'PS_GTM_ENABLE_GA4', 'PS_GTM_ENABLE_META',
            'PS_GTM_ENABLE_TIKTOK', 'PS_GTM_ENABLE_GOOGLE_ADS', 'PS_GTM_ENABLE_PINTEREST',
            'PS_GTM_ENABLE_MICROSOFT', 'PS_GTM_ENABLE_OPENAI', 'PS_GTM_ENABLE_SNAPCHAT',
            'PS_GTM_PRICE_ROUNDING_MODE'
        ];
        foreach ($keys as $k) {
            Configuration::deleteByName($k);
        }
        return true;
    }

    /**
     * Hook: displayHeader
     * Injects base GTM snippet and initializes window.dataLayer and page-level variables
     */
    public function hookDisplayHeader($params)
    {
        try {
            $gtmId = trim((string)Configuration::get('PS_GTM_CONTAINER_ID'));
            $jsConfig = [
                'eventPrefix' => (string)Configuration::get('PS_GTM_EVENT_PREFIX'),
                'catalogIdFormat' => (string)Configuration::get('PS_GTM_CATALOG_ID_FORMAT'),
                'platforms' => [
                    'ga4' => (bool)Configuration::get('PS_GTM_ENABLE_GA4'),
                    'meta' => (bool)Configuration::get('PS_GTM_ENABLE_META'),
                    'tiktok' => (bool)Configuration::get('PS_GTM_ENABLE_TIKTOK'),
                    'googleAds' => (bool)Configuration::get('PS_GTM_ENABLE_GOOGLE_ADS'),
                    'pinterest' => (bool)Configuration::get('PS_GTM_ENABLE_PINTEREST'),
                    'microsoft' => (bool)Configuration::get('PS_GTM_ENABLE_MICROSOFT'),
                    'openai' => (bool)Configuration::get('PS_GTM_ENABLE_OPENAI'),
                    'snapchat' => (bool)Configuration::get('PS_GTM_ENABLE_SNAPCHAT')
                ],
                'currency' => $this->context->currency ? $this->context->currency->iso_code : 'EUR'
            ];

            $this->context->smarty->assign([
                'gtm_container_id' => $gtmId,
                'ps_datalayer_config' => $jsConfig
            ]);

            $this->context->controller->registerJavascript(
                'modules-' . $this->name . '-core',
                'modules/' . $this->name . '/views/js/datalayer_core.js',
                ['position' => 'head', 'priority' => 150]
            );
            $this->context->controller->registerJavascript(
                'modules-' . $this->name . '-adapter',
                'modules/' . $this->name . '/views/js/prestashop_adapter.js',
                ['position' => 'bottom', 'priority' => 200]
            );

            return $this->display(__FILE__, 'views/templates/hook/header_gtm.tpl');
        } catch (\Throwable $e) {
            PrestaShopLogger::addLog('[' . $this->name . '] Error in hookDisplayHeader: ' . $e->getMessage(), 3);
            return '';
        }
    }

    /**
     * Hook: displayFooter
     * Injects page-specific events: view_item, view_item_list, view_cart
     */
    public function hookDisplayFooter($params)
    {
        try {
            $controller = $this->context->controller;
            $controllerName = isset($controller->php_self) ? $controller->php_self : '';
            $currency = $this->context->currency ? $this->context->currency->iso_code : 'EUR';

            $pageEvent = null;

            if ($controllerName === 'product' && Validate::isLoadedObject($controller->getProduct())) {
                $product = $controller->getProduct();
                $idProductAttribute = (int)Product::getDefaultAttribute($product->id);
                if (Tools::getValue('id_product_attribute')) {
                    $idProductAttribute = (int)Tools::getValue('id_product_attribute');
                }

                $resolved = ProductIdentityResolver::resolve(
                    $product->id,
                    $idProductAttribute,
                    $product->reference,
                    (string)Configuration::get('PS_GTM_CATALOG_ID_FORMAT'),
                    (bool)Configuration::get('PS_GTM_USE_SKU_FALLBACK')
                );

                $priceBreakdown = PricingEngine::calculateProductPrices($product->id, $idProductAttribute, $this->context, 1);
                $categoryName = $product->category ? (is_object($product->category) ? $product->category->name : (string)$product->category) : '';
                $manufacturerName = Manufacturer::getNameById((int)$product->id_manufacturer);

                $item = CanonicalDataModel::buildItem(
                    $resolved['item_id'],
                    is_array($product->name) ? $product->name[$this->context->language->id] : $product->name,
                    $priceBreakdown['display_price_tax_incl'],
                    1,
                    [
                        'item_brand' => $manufacturerName,
                        'item_category' => $categoryName,
                        'item_variant' => $resolved['combination_name'],
                        'sku_id' => $resolved['sku'],
                        'variant_id' => $resolved['id_product_attribute'] > 0 ? (string)$resolved['id_product_attribute'] : null
                    ]
                );

                $pageEvent = CanonicalDataModel::buildEvent(
                    'view_item',
                    [$item],
                    $currency,
                    $priceBreakdown['display_price_tax_incl'],
                    [],
                    [
                        'eventPrefix' => (string)Configuration::get('PS_GTM_EVENT_PREFIX'),
                        'platforms' => [
                            'ga4' => (bool)Configuration::get('PS_GTM_ENABLE_GA4'),
                            'meta' => (bool)Configuration::get('PS_GTM_ENABLE_META'),
                            'tiktok' => (bool)Configuration::get('PS_GTM_ENABLE_TIKTOK'),
                            'googleAds' => (bool)Configuration::get('PS_GTM_ENABLE_GOOGLE_ADS'),
                            'pinterest' => (bool)Configuration::get('PS_GTM_ENABLE_PINTEREST'),
                            'microsoft' => (bool)Configuration::get('PS_GTM_ENABLE_MICROSOFT'),
                            'openai' => (bool)Configuration::get('PS_GTM_ENABLE_OPENAI'),
                            'snapchat' => (bool)Configuration::get('PS_GTM_ENABLE_SNAPCHAT')
                        ]
                    ]
                );
            } elseif ($controllerName === 'cart' || $controllerName === 'order') {
                $cart = $this->context->cart;
                if (Validate::isLoadedObject($cart) && $cart->nbProducts() > 0) {
                    $cartSummary = PricingEngine::resolveCartOrderTotals($cart, $this->context);
                    $pageEvent = CanonicalDataModel::buildEvent(
                        $controllerName === 'order' ? 'begin_checkout' : 'view_cart',
                        $cartSummary['items'],
                        $currency,
                        $cartSummary['value'],
                        [
                            'tax' => $cartSummary['tax'],
                            'shipping' => $cartSummary['shipping']
                        ],
                        [
                            'eventPrefix' => (string)Configuration::get('PS_GTM_EVENT_PREFIX'),
                            'platforms' => [
                                'ga4' => (bool)Configuration::get('PS_GTM_ENABLE_GA4'),
                                'meta' => (bool)Configuration::get('PS_GTM_ENABLE_META'),
                                'tiktok' => (bool)Configuration::get('PS_GTM_ENABLE_TIKTOK'),
                                'googleAds' => (bool)Configuration::get('PS_GTM_ENABLE_GOOGLE_ADS'),
                                'pinterest' => (bool)Configuration::get('PS_GTM_ENABLE_PINTEREST'),
                                'microsoft' => (bool)Configuration::get('PS_GTM_ENABLE_MICROSOFT'),
                                'openai' => (bool)Configuration::get('PS_GTM_ENABLE_OPENAI'),
                                'snapchat' => (bool)Configuration::get('PS_GTM_ENABLE_SNAPCHAT')
                            ]
                        ]
                    );
                }
            }

            if ($pageEvent) {
                return '<script type="text/javascript">window.dataLayer = window.dataLayer || []; window.dataLayer.push(' . json_encode($pageEvent, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ');</script>';
            }

            return '';
        } catch (\Throwable $e) {
            PrestaShopLogger::addLog('[' . $this->name . '] Error in hookDisplayFooter: ' . $e->getMessage(), 3);
            return '';
        }
    }

    /**
     * Hook: displayOrderConfirmation
     * Injects purchase event with authoritative historical order details
     */
    public function hookDisplayOrderConfirmation($params)
    {
        try {
            $order = isset($params['order']) ? $params['order'] : null;
            if (!Validate::isLoadedObject($order)) {
                $idOrder = (int)Tools::getValue('id_order');
                if ($idOrder) {
                    $order = new Order($idOrder);
                }
            }

            if (!Validate::isLoadedObject($order)) {
                return '';
            }

            $currency = Currency::getIsoCodeById((int)$order->id_currency);
            $orderDetails = $order->getOrderDetailList();
            $items = [];

            foreach ($orderDetails as $detail) {
                $resolved = ProductIdentityResolver::resolve(
                    (int)$detail['product_id'],
                    (int)$detail['product_attribute_id'],
                    $detail['product_reference'],
                    (string)Configuration::get('PS_GTM_CATALOG_ID_FORMAT'),
                    (bool)Configuration::get('PS_GTM_USE_SKU_FALLBACK')
                );

                $unitPrice = (float)$detail['unit_price_tax_incl'];
                $qty = (int)$detail['product_quantity'];

                $items[] = CanonicalDataModel::buildItem(
                    $resolved['item_id'],
                    $detail['product_name'],
                    PricingEngine::roundStandard($unitPrice, 2),
                    $qty,
                    [
                        'sku_id' => $resolved['sku'],
                        'variant_id' => $resolved['id_product_attribute'] > 0 ? (string)$resolved['id_product_attribute'] : null
                    ]
                );
            }

            $purchaseEvent = CanonicalDataModel::buildEvent(
                'purchase',
                $items,
                $currency,
                PricingEngine::roundStandard((float)$order->total_paid_tax_incl, 2),
                [
                    'transaction_id' => (string)$order->reference,
                    'shipping' => PricingEngine::roundStandard((float)$order->total_shipping_tax_incl, 2),
                    'tax' => PricingEngine::roundStandard((float)($order->total_paid_tax_incl - $order->total_paid_tax_excl), 2),
                    'coupon' => $order->total_discounts_tax_incl > 0 ? 'DISCOUNT' : null
                ],
                [
                    'eventPrefix' => (string)Configuration::get('PS_GTM_EVENT_PREFIX'),
                    'platforms' => [
                        'ga4' => (bool)Configuration::get('PS_GTM_ENABLE_GA4'),
                        'meta' => (bool)Configuration::get('PS_GTM_ENABLE_META'),
                        'tiktok' => (bool)Configuration::get('PS_GTM_ENABLE_TIKTOK'),
                        'googleAds' => (bool)Configuration::get('PS_GTM_ENABLE_GOOGLE_ADS'),
                        'pinterest' => (bool)Configuration::get('PS_GTM_ENABLE_PINTEREST'),
                        'microsoft' => (bool)Configuration::get('PS_GTM_ENABLE_MICROSOFT'),
                        'openai' => (bool)Configuration::get('PS_GTM_ENABLE_OPENAI'),
                        'snapchat' => (bool)Configuration::get('PS_GTM_ENABLE_SNAPCHAT')
                    ]
                ]
            );

            return '<script type="text/javascript">window.dataLayer = window.dataLayer || []; window.dataLayer.push(' . json_encode($purchaseEvent, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ');</script>';
        } catch (\Throwable $e) {
            PrestaShopLogger::addLog('[' . $this->name . '] Error in hookDisplayOrderConfirmation: ' . $e->getMessage(), 3);
            return '';
        }
    }
}
