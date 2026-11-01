# 01. PrestaShop Architecture & Module Lifecycle Guide

## 1. Module Foundation & Class Hierarchy

Every enterprise PrestaShop tracking module extends the core `Module` class (or `PaymentModule` when intercepting payments).

```php
if (!defined('_PS_VERSION_')) {
    exit;
}

class Ps_Gtm_DataLayer extends Module
{
    public function __construct()
    {
        $this->name = 'ps_gtm_datalayer';
        $this->tab = 'analytics_stats';
        $this->version = '1.0.0';
        $this->author = 'Web Analytics Pro';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = ['min' => '1.7.0.0', 'max' => _PS_VERSION_];
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = $this->l('Enterprise DataLayer & Conversion Tracking');
        $this->description = $this->l('Authoritative GA4, Meta, TikTok, Pinterest, Google, Microsoft, OpenAI & Snapchat tracking.');
    }
}
```

### Installation & Essential Hook Registrations
To capture the full customer shopping journey, register the following standard lifecycle hooks during `install()`:
- `displayHeader`: Storefront initial state hydration, asset registration (`datalayer-core.js`, `prestashop-adapter.js`).
- `displayAfterBodyOpeningTag`: GTM noscript container injection.
- `displayOrderConfirmation`: Order conversion capture and historical financial hydration.
- `actionCartUpdateQuantityBefore`: Real-time backend cart quantity delta interceptor.
- `actionOrderStatusPostUpdate`: Server-side offline conversion dispatcher and payment confirmation.
- `actionProductCancel`: Server-side refund dispatching.
- `actionAdminControllerSetMedia`: Back Office configuration UI styling and script hydration.

---

## 2. Cross-Version Compatibility Architecture (PS 1.7.0.0 – 8.2+)

### A. Defensive Error Handling: `\Throwable` vs `\Exception`
In PHP 7.0+, PHP 7.4, and PHP 8.0-8.2+, fatal type errors, argument errors, and core syntax errors throw `\Error`, which does not extend `\Exception`. To ensure a tracking module **never breaks the store or blocks checkout**, wrap every hook and Back Office execution block in `\Throwable`:

```php
public function hookDisplayHeader($params)
{
    try {
        // Hydrate data layer configuration & initial payloads
    } catch (\Throwable $e) {
        if (class_exists('PrestaShopLogger')) {
            PrestaShopLogger::addLog('[ps_gtm_datalayer] Error in displayHeader: ' . $e->getMessage(), 3);
        }
        return '';
    }
}
```

### B. JavaScript Asset Registration Compatibility
PrestaShop 1.7+ introduced `registerJavascript()` on controllers, while older methods used `addJS()`:

```php
if (is_object($this->context->controller) && method_exists($this->context->controller, 'registerJavascript')) {
    $this->context->controller->registerJavascript(
        'gtm-datalayer-core',
        'modules/' . $this->name . '/views/js/datalayer-core.js',
        ['position' => 'head', 'priority' => 10]
    );
    $this->context->controller->registerJavascript(
        'gtm-prestashop-adapter',
        'modules/' . $this->name . '/views/js/prestashop-adapter.js',
        ['position' => 'bottom', 'priority' => 50]
    );
} elseif (is_object($this->context->controller) && method_exists($this->context->controller, 'addJS')) {
    $this->context->controller->addJS($this->_path . 'views/js/datalayer-core.js');
    $this->context->controller->addJS($this->_path . 'views/js/prestashop-adapter.js');
}
```

### C. Currency Decimal Precision
PrestaShop 1.7.0–1.7.6, 1.7.7+, and PrestaShop 8 handle currency precision differently. Always use an abstraction adapter:

```php
class PlatformAdapter
{
    public static function getCurrencyPrecision(Context $context = null)
    {
        if ($context === null) {
            $context = Context::getContext();
        }
        if ($context && $context->currency) {
            if (isset($context->currency->precision)) {
                return (int)$context->currency->precision;
            }
            if (isset($context->currency->decimals) && (int)$context->currency->decimals === 0) {
                return 0;
            }
        }
        return (int)Configuration::get('PS_PRICE_DISPLAY_PRECISION') ?: 2;
    }
}
```

---

## 3. Backend-Authoritative Sourcing vs DOM Scraping

| Requirement | DOM Scraping (Prohibited) | Backend-Authoritative (Mandatory) |
| :--- | :--- | :--- |
| **Product ID** | `$('.product-id').text()` | `$product->id` (ObjectModel) or `event.resp.id_product` |
| **Combination ID** | URL hash `#299` or hidden input | `Tools::getValue('id_product_attribute')` or `Product::getDefaultAttribute()` |
| **Price** | `$('.current-price').text()` | `Product::getPriceStatic(...)` or `Cart::getProducts()` |
| **Quantity** | `$('input[name="qty"]').val()` | Verified `cart_quantity` from backend Cart ObjectModel |
| **Cart Subtotal** | `$('#cart-subtotal').text()` | `$cart->getOrderTotal($isTaxIncl, Cart::ONLY_PRODUCTS)` |
| **Customer Email** | Scraped checkout forms | `$context->customer->email` (SHA-256 hashed on server) |

### Why DOM Scraping Fails:
1. Custom themes (Warehouse, Alysum, Transformer, Leo, classic) change CSS classes, markup hierarchies, and currency symbols (`12,99 €` vs `€12.99`).
2. Live DOM mutations (e.g. currency switches, translation extensions) alter text strings unpredictably.
3. Hidden combination attributes or complex bundle logic cannot be reliably read from rendered HTML.
4. Asynchronous AJAX responses update internal PrestaShop models before or without standard DOM updates.
