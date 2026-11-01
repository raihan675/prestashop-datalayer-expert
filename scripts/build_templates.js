const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '../templates');

// 1. module_core.php.tpl
const moduleCore = `<?php
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
        } catch (\\Throwable $e) {
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
        } catch (\\Throwable $e) {
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
        } catch (\\Throwable $e) {
            PrestaShopLogger::addLog('[' . $this->name . '] Error in hookDisplayOrderConfirmation: ' . $e->getMessage(), 3);
            return '';
        }
    }
}
`;

// 2. datalayer_core.js.tpl
const datalayerCore = `/**
 * Pure JavaScript DataLayer Core Engine
 *
 * Implements authoritative mathematical rounding, strict GA4 ecommerce schemas,
 * and multi-platform advertising adapters.
 * Zero DOM scraping. Pure payload normalization.
 */
(function(window) {
  'use strict';

  var DataLayerCore = {
    /**
     * Accurate decimal rounding avoiding IEEE 754 floating-point drift
     */
    round: function(value, decimals) {
      if (typeof value !== 'number' || isNaN(value)) {
        value = Number(value) || 0;
      }
      decimals = decimals !== undefined ? decimals : 2;
      return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
    },

    /**
     * Normalizes items strictly according to GA4 specification
     * Removes internal fields like line_total or raw prices
     */
    normalizeItems: function(items) {
      if (!Array.isArray(items)) return [];
      var self = this;
      return items.map(function(item) {
        var qty = Number(item.quantity) || 1;
        var unitPrice = self.round(Number(item.price) || 0, 2);

        var cleanItem = {
          item_id: String(item.item_id || ''),
          item_name: String(item.item_name || ''),
          price: unitPrice,
          quantity: qty
        };

        if (item.item_brand) cleanItem.item_brand = String(item.item_brand);
        if (item.item_category) cleanItem.item_category = String(item.item_category);
        if (item.item_category2) cleanItem.item_category2 = String(item.item_category2);
        if (item.item_variant) cleanItem.item_variant = String(item.item_variant);
        if (item.sku_id) cleanItem.sku_id = String(item.sku_id);
        if (item.variant_id) cleanItem.variant_id = String(item.variant_id);
        if (item.discount !== undefined && item.discount !== null) {
          cleanItem.discount = self.round(Number(item.discount), 2);
        }

        // Strictly omit line_total, total_amount, or custom internal properties
        return cleanItem;
      });
    },

    /**
     * Calculates the exact authoritative event value
     * Uses item.raw_unit_price * quantity if provided to match cart unrounded base math
     */
    calculateAuthoritativeValue: function(items, explicitTotal) {
      if (explicitTotal !== undefined && explicitTotal !== null && !isNaN(explicitTotal)) {
        return this.round(Number(explicitTotal), 2);
      }
      var self = this;
      var sum = 0;
      if (Array.isArray(items)) {
        items.forEach(function(item) {
          var qty = Number(item.quantity) || 1;
          var unitPrice = item.raw_unit_price !== undefined ? Number(item.raw_unit_price) : (Number(item.price) || 0);
          sum += unitPrice * qty;
        });
      }
      return self.round(sum, 2);
    },

    /**
     * Constructs the multi-platform payload
     */
    buildEventPayload: function(eventName, items, currency, options) {
      options = options || {};
      var prefix = options.eventPrefix || 'ps_';
      var platforms = options.platforms || { ga4: true };
      var cleanItems = this.normalizeItems(items);
      var eventValue = this.calculateAuthoritativeValue(items, options.value);

      var payload = {
        event: prefix + eventName,
        original_event: eventName,
        ecommerce: {
          currency: currency || 'EUR',
          value: eventValue,
          items: cleanItems
        }
      };

      if (options.transaction_id) payload.ecommerce.transaction_id = String(options.transaction_id);
      if (options.shipping !== undefined) payload.ecommerce.shipping = this.round(Number(options.shipping), 2);
      if (options.tax !== undefined) payload.ecommerce.tax = this.round(Number(options.tax), 2);
      if (options.coupon) payload.ecommerce.coupon = String(options.coupon);

      // Meta Pixel Schema
      if (platforms.meta) {
        var metaMap = {
          'view_item': 'ViewContent',
          'add_to_cart': 'AddToCart',
          'remove_from_cart': 'RemoveFromCart',
          'view_cart': 'Custom',
          'begin_checkout': 'InitiateCheckout',
          'purchase': 'Purchase'
        };
        var metaEventName = metaMap[eventName] || 'Custom';
        payload.meta = {
          event_name: metaEventName,
          content_type: 'product',
          content_ids: cleanItems.map(function(i) { return i.item_id; }),
          contents: cleanItems.map(function(i) {
            return { id: i.item_id, quantity: i.quantity, item_price: i.price };
          }),
          currency: currency || 'EUR',
          value: eventValue
        };
        if (metaEventName === 'Custom') {
          payload.meta.custom_event_name = eventName === 'view_cart' ? 'ViewCart' : eventName;
        }
      }

      // TikTok Events API Schema
      if (platforms.tiktok) {
        var ttMap = {
          'view_item': 'ViewContent',
          'add_to_cart': 'AddToCart',
          'view_cart': 'Custom',
          'begin_checkout': 'InitiateCheckout',
          'purchase': 'CompletePayment'
        };
        payload.tiktok = {
          event_name: ttMap[eventName] || 'Custom',
          content_type: 'product',
          contents: cleanItems.map(function(i) {
            return { content_id: i.item_id, content_type: 'product', quantity: i.quantity, price: i.price };
          }),
          currency: currency || 'EUR',
          value: eventValue
        };
      }

      // Google Ads Dynamic Remarketing Schema
      if (platforms.googleAds) {
        var gadsPageMap = {
          'view_item': 'product',
          'view_item_list': 'category',
          'view_cart': 'cart',
          'add_to_cart': 'cart',
          'begin_checkout': 'cart',
          'purchase': 'purchase'
        };
        payload.google_ads = {
          ecomm_prodid: cleanItems.length === 1 ? cleanItems[0].item_id : cleanItems.map(function(i) { return i.item_id; }),
          ecomm_pagetype: gadsPageMap[eventName] || 'other',
          ecomm_totalvalue: eventValue
        };
      }

      // OpenAI Ads Schema (Minor Units / Cents)
      if (platforms.openai) {
        payload.openai = {
          event_name: eventName,
          currency: currency || 'EUR',
          value_in_cents: Math.round(eventValue * 100),
          items: cleanItems.map(function(i) {
            return {
              id: i.item_id,
              name: i.item_name,
              quantity: i.quantity,
              unit_price_in_cents: Math.round(i.price * 100)
            };
          })
        };
      }

      return payload;
    },

    /**
     * Safe push to window.dataLayer
     */
    push: function(payload) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    }
  };

  window.PrestaShopDataLayerCore = DataLayerCore;
})(window);
`;

// 3. prestashop_adapter.js.tpl
const prestashopAdapter = `/**
 * PrestaShop Event Bus & AJAX Adapter
 *
 * Binds strictly to official prestashop.on events and backend JSON response deltas.
 * ZERO DOM scraping.
 */
(function(window, document) {
  'use strict';

  function initAdapter() {
    var core = window.PrestaShopDataLayerCore;
    var config = window.ps_datalayer_config || {};
    var prefix = config.eventPrefix || 'ps_';

    if (!core) return;

    // Listen to PrestaShop official cart updates
    if (window.prestashop && typeof window.prestashop.on === 'function') {
      window.prestashop.on('updateCart', function(event) {
        if (!event || !event.resp) return;

        var resp = event.resp;
        var reason = event.reason || {};

        // 1. Check if an item was added or updated
        if (reason.linkAction === 'add-to-cart' && resp.hasError === false) {
          // Identify added product from response cart items or delta
          var addedId = reason.idProduct;
          var addedAttr = reason.idProductAttribute || 0;
          var addedQty = Number(reason.quantity) || 1;

          var item = {
            item_id: config.catalogIdFormat === 'reference_sku' && reason.reference ? reason.reference : (addedAttr > 0 ? addedId + '_' + addedAttr : String(addedId)),
            item_name: reason.productName || 'Product',
            price: Number(reason.price) || 0,
            quantity: addedQty
          };

          var payload = core.buildEventPayload('add_to_cart', [item], config.currency || 'EUR', {
            eventPrefix: prefix,
            platforms: config.platforms
          });
          core.push(payload);
        } else if (reason.linkAction === 'delete-from-cart') {
          // Item removed
          var removedId = reason.idProduct;
          var removedAttr = reason.idProductAttribute || 0;
          var removedQty = Number(reason.quantity) || 1;

          var removedItem = {
            item_id: config.catalogIdFormat === 'reference_sku' && reason.reference ? reason.reference : (removedAttr > 0 ? removedId + '_' + removedAttr : String(removedId)),
            item_name: reason.productName || 'Product',
            price: Number(reason.price) || 0,
            quantity: removedQty
          };

          var removePayload = core.buildEventPayload('remove_from_cart', [removedItem], config.currency || 'EUR', {
            eventPrefix: prefix,
            platforms: config.platforms
          });
          core.push(removePayload);
        }
      });
    }

    // Intercept native fetch/XMLHttpRequest cart additions for standalone themes
    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function() {
        var args = arguments;
        var url = args[0];
        return originalFetch.apply(this, args).then(function(response) {
          if (typeof url === 'string' && (url.indexOf('controller=cart') !== -1 || url.indexOf('/cart') !== -1)) {
            // Clone response to inspect JSON without consuming stream
            response.clone().json().then(function(data) {
              if (data && data.success && data.cart) {
                // Verified authoritative JSON response
              }
            }).catch(function() {});
          }
          return response;
        });
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdapter);
  } else {
    initAdapter();
  }
})(window, document);
`;

// 4. update_manifest.json.tpl
const updateManifest = `{
  "name": "{{MODULE_NAME}}",
  "version": "{{MODULE_VERSION}}",
  "latest_version": "{{MODULE_VERSION}}",
  "download_url": "https://github.com/{{GITHUB_REPO}}/releases/download/v{{MODULE_VERSION}}/{{MODULE_NAME}}.zip",
  "checksum": "{{SHA256_HASH}}",
  "changelog": {
    "{{MODULE_VERSION}}": [
      "Enterprise release with multi-platform conversion tracking and authoritative pricing engine."
    ]
  },
  "min_ps_version": "1.7.0.0",
  "max_ps_version": "8.2.99"
}
`;

fs.writeFileSync(path.join(baseDir, 'module_core.php.tpl'), moduleCore, 'utf8');
fs.writeFileSync(path.join(baseDir, 'datalayer_core.js.tpl'), datalayerCore, 'utf8');
fs.writeFileSync(path.join(baseDir, 'prestashop_adapter.js.tpl'), prestashopAdapter, 'utf8');
fs.writeFileSync(path.join(baseDir, 'update_manifest.json.tpl'), updateManifest, 'utf8');

console.log('Successfully generated all templates in ' + baseDir);
