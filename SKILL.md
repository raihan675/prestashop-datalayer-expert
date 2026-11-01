---
name: prestashop-datalayer-expert
description: Specialized PrestaShop DataLayer & Conversion Tracking Engineer for building, auditing, debugging, and maintaining enterprise PrestaShop tracking modules with zero DOM scraping and authoritative pricing.
---

# PrestaShop DataLayer & Conversion Tracking Expert

An enterprise AI skill encapsulating full-spectrum architecture, authoritative data engineering, pricing precision, multi-platform advertising schemas, and release operations for PrestaShop dataLayer and conversion tracking modules.

---

## 1. Mission & Engineering Principles

When developing, auditing, or modifying PrestaShop tracking modules, this skill strictly enforces the following non-negotiable principles:

1. **Backend-Authoritative Data (Zero DOM Scraping)**:
   - Sourcing strictly from PrestaShop backend ObjectModels (`Product`, `Combination`, `Cart`, `Order`, `Customer`, `Carrier`) and official JSON response deltas.
   - Never inspect HTML markup, text nodes, CSS selectors, or DOM attributes to extract prices, IDs, or cart changes.
2. **Authoritative Pricing Math & Unrounded Base Precision**:
   - PrestaShop stores base catalog prices with up to 6 decimals (e.g., `12.995000 €`).
   - Line totals are computed as `round(raw_unit_price * quantity, 2)`. Naive rounding of display prices (`13.00 * 2 = 26.00 €` vs `12.995 * 2 = 25.99 €`) produces accounting drift.
   - Use MDN exponential decimal rounding (`Number(Math.round(Number(num + 'e' + d)) + 'e-' + d)`) to eliminate JavaScript IEEE 754 floating-point truncation.
3. **Strict GA4 Item Schema Compliance**:
   - `ecommerce.items[]` MUST strictly adhere to the GA4 schema.
   - **ZERO `line_total`** or unofficial custom parameters inside `items[]`. Event values are represented by top-level `ecommerce.value`.
4. **Product Identity Consistency**:
   - Support uniform catalog identity strategies (`composite`, `reference_sku`, `id_product`) across GA4 and all advertising platforms to guarantee 1:1 dynamic remarketing catalog matches.
5. **Payment Verification & Historical Integrity**:
   - Conversion tracking must qualify payment status (distinguishing direct gateway payments from pending offline transfers like bankwire or cheque).
   - Past orders must retain their historical `ps_order_detail` unit prices and tax rates rather than recalculating from mutating product catalogs.

---

## 2. Directory Structure & Resources

```
prestashop-datalayer-expert/
├── SKILL.md                                 # Skill entry point and operational manifest
├── references/                              # Deep technical knowledge base (20 domains)
│   ├── 01_prestashop_architecture_and_lifecycle.md
│   ├── 02_authoritative_pricing_and_financials.md
│   ├── 03_multi_platform_advertising_schemas.md
│   ├── 04_order_lifecycle_and_conversion_integrity.md
│   ├── 05_server_side_transport_and_webhooks.md
│   ├── 06_testing_verification_and_safety_gates.md
│   └── 07_troubleshooting_and_failure_catalog.md
├── templates/                               # Production-ready drop-in code templates
│   ├── PricingEngine.php.tpl
│   ├── CanonicalDataModel.php.tpl
│   ├── ProductIdentityResolver.php.tpl
│   ├── module_core.php.tpl
│   ├── datalayer_core.js.tpl
│   ├── prestashop_adapter.js.tpl
│   └── update_manifest.json.tpl
├── workflows/                               # Step-by-step operational runbooks
│   ├── 01_build_new_module.md
│   ├── 02_audit_existing_module.md
│   ├── 03_debug_pricing_discrepancy.md
│   ├── 04_implement_advertising_platform.md
│   └── 05_release_and_upgrade_pipeline.md
└── tests/                                   # Verification test suite
    └── skill_validation_scenarios.js
```

---

## 3. Quick Reference Matrix

| Platform | Event Mapping (Add to Cart / Purchase) | Value Currency Requirement | Catalog Identifier | Reference Doc |
| :--- | :--- | :--- | :--- | :--- |
| **GA4** | `add_to_cart` / `purchase` | Standard 2-decimal ISO | Composite / SKU / ID | [02_pricing.md](references/02_authoritative_pricing_and_financials.md) |
| **Meta** | `AddToCart` / `Purchase` | Standard 2-decimal ISO | Composite or SKU | [03_ad_schemas.md](references/03_multi_platform_advertising_schemas.md) |
| **TikTok** | `AddToCart` / `CompletePayment` | Standard 2-decimal ISO | Composite or SKU | [03_ad_schemas.md](references/03_multi_platform_advertising_schemas.md) |
| **Google Ads** | `ecomm_pagetype: cart/purchase` | Standard 2-decimal ISO | Composite or SKU | [03_ad_schemas.md](references/03_multi_platform_advertising_schemas.md) |
| **Pinterest** | `add_to_cart` / `checkout` | Standard 2-decimal ISO | Composite or SKU | [03_ad_schemas.md](references/03_multi_platform_advertising_schemas.md) |
| **Microsoft** | `ecomm_prodid` / `gv` | Standard 2-decimal ISO | Composite or SKU | [03_ad_schemas.md](references/03_multi_platform_advertising_schemas.md) |
| **OpenAI Ads** | `add_to_cart` / `purchase` | **Minor units (cents, integer)** | Composite or SKU | [03_ad_schemas.md](references/03_multi_platform_advertising_schemas.md) |
| **Snapchat** | `ADD_CART` / `PURCHASE` | Standard 2-decimal ISO | Composite or SKU | [03_ad_schemas.md](references/03_multi_platform_advertising_schemas.md) |

---

## 4. Operating Protocols for AI Agents

Whenever this skill is triggered for a PrestaShop tracking task:

1. **Classify the Operation**:
   - Greenfield module development $\rightarrow$ Runbook [workflows/01_build_new_module.md](workflows/01_build_new_module.md)
   - Codebase audit or QA review $\rightarrow$ Runbook [workflows/02_audit_existing_module.md](workflows/02_audit_existing_module.md)
   - Pricing or cart discrepancy report $\rightarrow$ Runbook [workflows/03_debug_pricing_discrepancy.md](workflows/03_debug_pricing_discrepancy.md)
   - Advertising platform expansion $\rightarrow$ Runbook [workflows/04_implement_advertising_platform.md](workflows/04_implement_advertising_platform.md)
   - Release or version upgrade $\rightarrow$ Runbook [workflows/05_release_and_upgrade_pipeline.md](workflows/05_release_and_upgrade_pipeline.md)
2. **Execute Safety Cross-Check**:
   - Zero UTF-8 BOM.
   - Balanced braces/brackets/parentheses.
   - Strict `_PS_VERSION_` check on all PHP entrypoints.
   - Wrapping hooks in `try { ... } catch (\Throwable $e)`.
3. **Verify Pricing Calculations**:
   - Calculate values for quantities 1, 2, 3, 5 with fractional discounts to ensure zero rounding drift.
   - Ensure `line_total` is never placed inside `items[]`.
4. **Run Verification Test Suite**:
   - Execute `node tests/skill_validation_scenarios.js` and verify all 12 scenarios pass before delivering code.
