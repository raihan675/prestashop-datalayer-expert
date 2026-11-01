const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '../workflows');

// 1. build_new_module.md
const wf01 = `# Runbook 01: Building a New PrestaShop DataLayer Module

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
   - \`composite\` (\`id_product_id_attribute\` e.g. \`68_299\`)
   - \`reference_sku\` (SKU reference e.g. \`BHK125-B\`)
   - \`id_product\` (Base ID only)

---

## Step 2: Directory Scaffolding
Create the standard enterprise module tree:
\`\`\`
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
\`\`\`

---

## Step 3: Core Implementation Checklist
1. **Module Header & Safety**:
   - Verify \`if (!defined('_PS_VERSION_')) exit;\` on all PHP files.
   - Set compliant \`ps_versions_compliancy = ['min' => '1.7.0.0', 'max' => _PS_VERSION_]\`.
   - Implement defensive \`try ... catch (\\Throwable $e)\` inside all hook methods.
2. **Authoritative Pricing**:
   - Include \`PricingEngine.php\` to calculate unrounded base catalog prices.
   - Never round unit price before multiplying quantity for cart line totals.
   - Enforce strict GA4 item schema: **ZERO \`line_total\`** inside \`items[]\`.
3. **AJAX Synchronization**:
   - Bind to \`prestashop.on('updateCart')\` in \`prestashop_adapter.js\`.
   - Parse authoritative JSON payloads directly from PrestaShop core; reject DOM queries.
4. **Order Confirmation & Purchase Integrity**:
   - In \`hookDisplayOrderConfirmation\`, instantiate \`Order\` object and read from \`getOrderDetailList()\`.
   - Never recalculate historical purchases using live product catalog prices.

---

## Step 4: Verification & Automated Audits
1. Run static delimiter audit: \`node tests/systemSafetyCrosscheck.js\`.
2. Check UTF-8 encoding without BOM across all files.
3. Validate cart addition, quantity step (2, 3, 5), and item removal values against Back Office.
`;

// 2. audit_existing_module.md
const wf02 = `# Runbook 02: Auditing an Existing PrestaShop DataLayer Module

Use this runbook to conduct a thorough architectural, accuracy, and compliance audit on any existing PrestaShop tracking module.

---

## Phase 1: Security & Syntax Pre-Flight Check
1. **UTF-8 BOM Check**:
   - Ensure zero files start with the 3-byte EF BB BF BOM marker.
2. **Balanced PHP & Smarty Delimiters**:
   - Check all \`{...}\`, \`[...]\`, and \`(...)\` delimiters for balanced pairs.
   - Confirm \`_PS_VERSION_\` gate is present at line 1 of every executable PHP file.
3. **Exception Safety**:
   - Verify every hook implementation and controller action is wrapped in a defensive \`try { ... } catch (\\Throwable $e)\` block with \`PrestaShopLogger::addLog()\`.

---

## Phase 2: Data Source Integrity (Zero DOM Scraping Audit)
1. **Grep Frontend Scripts**:
   - Search for \`document.querySelector\`, \`$('.price')\`, \`textContent\`, \`innerText\`, \`window.location.search\`.
   - Flag any instance where price, SKU, product ID, or currency is extracted from HTML nodes.
2. **Event Bus Binding**:
   - Verify frontend listeners attach to official \`prestashop.on\` events or intercept JSON responses.
3. **Smarty Payload Hydration**:
   - Confirm server-rendered templates pass structured JSON variables via \`window.ps_datalayer_config\` rather than rendering HTML attributes for scraping.

---

## Phase 3: Financial & Schema Compliance Audit
1. **Strict GA4 Ecommerce Item Schema**:
   - Verify that \`items[]\` contains only official fields (\`item_id\`, \`item_name\`, \`price\`, \`quantity\`, \`item_brand\`, \`item_category\`, \`item_variant\`, etc.).
   - Reject any presence of \`line_total\` or custom non-standard fields inside \`items[]\`.
2. **Pricing Math Precision**:
   - Test a discounted product with odd cents (e.g., 25.99 € at 50% = 12.995 €).
   - Test quantities 1, 2, 3, 4, 5. Verify that cart value matches PrestaShop totals exactly (2 = 25.99 €, 3 = 38.99 €, 4 = 51.98 €, 5 = 64.98 €).
3. **Payment Integrity**:
   - Check if bankwire, cash-on-delivery, or cheque orders fire purchase conversions before payment validation.

---

## Phase 4: Audit Report Deliverable
Produce an audit findings table categorizing issues into:
- **Critical**: Crash risks, broken checkout hooks, DOM scraping dependencies.
- **High**: Financial value drift, unrounded math mismatch, non-standard GA4 schema fields.
- **Medium**: Missing advertising adapters, unnormalized user parameters.
- **Low**: Code formatting, missing translations.
`;

// 3. debug_pricing_discrepancy.md
const wf03 = `# Runbook 03: Debugging Pricing & Value Discrepancies

This runbook resolves the classic discrepancy where cart or event values differ from PrestaShop Back Office calculations across quantities.

---

## The Root Cause: Display Price vs Cart Line Total Paradox
In PrestaShop:
1. Catalog product base prices can have up to 6 decimal places (e.g. 25.99 € with 50% discount = \`12.995000 €\`).
2. When displayed on the product page or in item rows, PrestaShop rounds to 2 decimals: \`13.00 €\`.
3. In the cart and checkout, PrestaShop multiplies the **unrounded raw price** by quantity before rounding:
   - Qty 1: \`round(12.995 * 1) = 13.00 €\`
   - Qty 2: \`round(12.995 * 2) = round(25.99) = 25.99 €\` (NOT \`13.00 * 2 = 26.00 €\`)
   - Qty 3: \`round(12.995 * 3) = round(38.985) = 38.99 €\` (NOT \`13.00 * 3 = 39.00 €\`)
   - Qty 5: \`round(12.995 * 5) = round(64.975) = 64.98 €\`

---

## Systematic Debugging Steps

### Step 1: Inspect the Raw Catalog Price
Run a quick query or helper dump in PrestaShop:
\`\`\`php
$priceTaxIncl = Product::getPriceStatic(
    $id_product,
    true, // tax incl
    $id_product_attribute,
    6,    // 6 decimals precision
    null, false, true, 1
);
\`
If the 6-decimal value has fractional cents (e.g. \`.995\`), you are in fractional discount territory.

### Step 2: Inspect Event Payload Construction
1. Check \`ecommerce.value\` vs \`ecommerce.items[0].price * items[0].quantity\`.
2. Confirm that \`ecommerce.value\` matches:
   \`\`\`php
   $eventValue = round($rawUnitPrice * $quantity, 2);
   \`\`\`
3. Confirm that \`items[0].price\` remains the individual unit price (\`13.00\`).
4. **CRITICAL**: Confirm \`line_total\` has been completely deleted from \`items[0]\`.

### Step 3: Check JavaScript IEEE 754 Floating-Point Truncation
In frontend JavaScript:
\`\`\`javascript
// BROKEN: Math.round(12.995 * 5 * 100) / 100 -> 12.995 * 5 is 64.97499999999999 -> rounds to 64.97!
// FIXED: Exponential decimal rounding
function roundExact(num, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}
\`

### Step 4: Verify Cart Deletion and Update Events
When a user clicks "Remove from cart" (e.g. 3 items removed):
1. Compute the removed value as \`roundExact(rawUnitPrice * removedQty, 2)\` = \`38.99 €\`.
2. Ensure it does NOT report \`39.00 €\` from naive integer multiplication.
`;

// 4. implement_advertising_platform.md
const wf04 = `# Runbook 04: Implementing Multi-Platform Advertising Schemas

This runbook standardizes adding and configuring ad network conversion schemas alongside GA4.

---

## Step 1: Catalog ID Matching Verification
Before writing event payloads, confirm how the external merchant catalog is synced:
- **Google Merchant Center**: Usually \`id_product\` or \`id_product_id_attribute\` (composite).
- **Meta Catalog**: Usually \`composite\` or \`reference_sku\`.
- **TikTok Catalog**: Usually \`composite\`.
- **Pinterest Catalog**: Usually \`reference_sku\` or \`composite\`.

Ensure \`ProductIdentityResolver.php\` produces matching IDs across all platforms.

---

## Step 2: Implement Platform Builder in \`CanonicalDataModel.php\`
For any new advertising platform, define an isolated builder method:

\`\`\`php
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
\`\`\`

---

## Step 3: Frontend Transport in \`datalayer_core.js\`
Ensure the client-side compiler builds the corresponding platform object under the event root:
- \`dataLayer.push({ event: 'ps_purchase', ecommerce: {...}, meta: {...}, tiktok: {...}, google_ads: {...} });\`

---

## Step 4: User Data & Consent Normalization
For enhanced conversions and CAPI:
1. Normalize email: \`trim(strtolower($email))\` -> SHA-256.
2. Normalize phone: E.164 format (e.g. \`+491701234567\`) -> SHA-256.
3. Enforce consent state check before dispatching payload.
`;

// 5. release_and_upgrade_pipeline.md
const wf05 = `# Runbook 05: Autonomous Release & Upgrade Pipeline

Whenever a change, bugfix, or feature is applied to the module, execute this automated end-to-end pipeline.

---

## Step 1: Pre-Publication Safety Checks
Run automated test suites and static checks:
\`\`\`powershell
node tests/systemSafetyCrosscheck.js
node --test tests/advertisingCatalogMatching.test.js
node --test tests/catalogIdentity.test.js
node tests/eventPrefix.test.js
\`\`\`
All tests must pass with 0 failures before proceeding.

---

## Step 2: Synchronous Version Bumping
Bump semantic version (e.g. \`1.45.5\` -> \`1.46.0\`) across all 5 mandatory files:
1. \`ps_gtm_datalayer.php\` (\`$this->version = '1.46.0';\`)
2. \`config.xml\` (\`<version><![CDATA[1.46.0]]></version>\`)
3. \`update-manifest.json\` (\`version\` AND \`latest_version\`)
4. \`CHANGELOG.md\` (New entry with bulleted changes)
5. \`tests/systemSafetyCrosscheck.js\` (Update expected version constant)

---

## Step 3: Create Upgrade Script
Create \`upgrade/upgrade-X.Y.Z.php\`:
\`\`\`php
<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_X_Y_Z($module)
{
    // Register any new hooks
    $module->registerHook('displayHeader');
    // Clear Smarty and PrestaShop core caches
    Tools::clearAllCache();
    return true;
}
\`\`\`

---

## Step 4: Clean Packaging (Forward Slashes Only)
Run \`scripts/package-release.ps1\` to generate \`ps_gtm_datalayer.zip\`:
- Ensure 0 backslashes (\`\\\`) in the ZIP archive index.
- Calculate SHA-256 hash of the zip file.
- Update \`update-manifest.json\` with the new hash.
- Copy release zip to \`Downloads/ps_gtm_datalayer.zip\`.

---

## Step 5: Git Commit, Tag & Push
\`\`\`bash
git add -A
git commit -m "feat(core): release vX.Y.Z with authoritative pricing fixes"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags
\`\`\`

---

## Step 6: GitHub Release & Asset Verification
1. Create GitHub Release for tag \`vX.Y.Z\` via GitHub API.
2. Upload \`ps_gtm_datalayer.zip\` as binary release asset.
3. Test HTTP download endpoint (\`curl -I https://github.com/<user>/<repo>/releases/download/vX.Y.Z/ps_gtm_datalayer.zip\`).
4. Ensure HTTP 302 / 200 OK response to guarantee PrestaShop 1-Click Update succeeds.
`;

fs.writeFileSync(path.join(baseDir, '01_build_new_module.md'), wf01, 'utf8');
fs.writeFileSync(path.join(baseDir, '02_audit_existing_module.md'), wf02, 'utf8');
fs.writeFileSync(path.join(baseDir, '03_debug_pricing_discrepancy.md'), wf03, 'utf8');
fs.writeFileSync(path.join(baseDir, '04_implement_advertising_platform.md'), wf04, 'utf8');
fs.writeFileSync(path.join(baseDir, '05_release_and_upgrade_pipeline.md'), wf05, 'utf8');

console.log('Successfully generated all 5 workflows in ' + baseDir);
