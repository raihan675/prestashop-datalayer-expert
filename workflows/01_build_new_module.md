# Runbook 01: Building a New PrestaShop DataLayer Module

This runbook guides the engineer through the disciplined architecture and construction of a greenfield PrestaShop DataLayer & Conversion Tracking module.

---

## Step 1: Requirements & Platform Inventory
1. Determine required target platforms:
   - Google Tag Manager (Web & Server-Side)
   - Google Analytics 4 (GA4)
   - Google Ads Enhanced Conversions & Cart Data
   - Meta Pixel & Conversions API (CAPI)
   - TikTok Pixel & Events API
   - Pinterest, Microsoft UET, Snapchat, OpenAI Ads
2. Determine PrestaShop version compatibility requirements:
   - PrestaShop 1.7.0.0 – 1.7.8.x (Legacy Controller / Smarty hook pipeline)
   - PrestaShop 8.0.0 – 8.2.x+ (Modern Symfony Container + PrestaShop Event Bus)
3. Determine Product Catalog Identifier Strategy:
   - `composite` (`id_product_id_attribute` e.g. `68_299`)
   - `reference_sku` (SKU reference e.g. `BHK125-B`)
   - `id_product` (Base ID only)

---

## Step 2: Directory Scaffolding
Create the standard enterprise module tree:
```
ps_gtm_datalayer/
├── classes/
│   ├── PricingEngine.php
│   ├── ProductIdentityResolver.php
│   ├── CanonicalDataModel.php
│   ├── DeduplicationManager.php
│   └── UpdateManager.php
├── controllers/
│   ├── admin/
│   │   └── AdminPsGtmDatalayerSettingController.php
│   └── front/
│       └── sse.php
├── upgrade/
│   └── upgrade-1.0.0.php
├── views/
│   ├── css/
│   ├── js/
│   │   ├── datalayer_core.js
│   │   └── prestashop_adapter.js
│   └── templates/
│       ├── admin/
│       └── hook/
│           └── header_gtm.tpl
├── config.xml
├── ps_gtm_datalayer.php
├── update-manifest.json
└── README.md
```

---

## Step 3: Core Implementation Checklist
1. **Module Header & Safety**:
   - Verify `if (!defined('_PS_VERSION_')) exit;` on all PHP files.
   - Set compliant `ps_versions_compliancy = ['min' => '1.7.0.0', 'max' => _PS_VERSION_]`.
   - Implement defensive `try ... catch (\Throwable $e)` inside all hook methods.
2. **Authoritative Pricing**:
   - Include `PricingEngine.php` to calculate unrounded base catalog prices.
   - Never round unit price before multiplying quantity for cart line totals.
   - Enforce strict GA4 item schema: **ZERO `line_total`** inside `items[]`.
3. **AJAX Synchronization**:
   - Bind to `prestashop.on('updateCart')` in `prestashop_adapter.js`.
   - Parse authoritative JSON payloads directly from PrestaShop core; reject DOM queries.
4. **Order Confirmation & Purchase Integrity**:
   - In `hookDisplayOrderConfirmation`, instantiate `Order` object and read from `getOrderDetailList()`.
   - Never recalculate historical purchases using live product catalog prices.

---

## Step 4: Verification & Automated Audits
1. Run static delimiter audit: `node tests/systemSafetyCrosscheck.js`.
2. Check UTF-8 encoding without BOM across all files.
3. Validate cart addition, quantity step (2, 3, 5), and item removal values against Back Office.
