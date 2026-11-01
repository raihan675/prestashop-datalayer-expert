# PrestaShop DataLayer & Conversion Tracking Expert

[![Test Suite](https://img.shields.io/badge/tests-12%20passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PrestaShop](https://img.shields.io/badge/PrestaShop-1.7%20--%208.2%2B-blue.svg)](https://www.prestashop-project.org/)
[![GA4 Compliant](https://img.shields.io/badge/GA4-Schema%20Compliant-orange.svg)](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

An enterprise-grade custom AI skill and architectural framework for building, auditing, debugging, and maintaining **PrestaShop DataLayer & Conversion Tracking Modules**.

Engineered for precision web analytics, server-side Google Tag Manager (sGTM), and multi-platform advertising conversion tracking (Meta, TikTok, Google Ads, Pinterest, Microsoft UET, OpenAI Ads, and Snapchat).

---

## Key Features & Architectural Highlights

- **Backend-Authoritative Data Models (Zero DOM Scraping)**:
  Extracts all ecommerce data directly from native PrestaShop ObjectModels (`Product`, `Combination`, `Cart`, `Order`, `Customer`, `Carrier`) and official JSON response deltas. Completely immune to frontend layout changes, CSS redesigns, and DOM mutations.
- **Authoritative Unrounded Pricing Engine**:
  Solves the PrestaShop "display price vs cart line total paradox". Preserves 6-decimal unrounded base catalog prices (`12.995000 €`) and calculates line totals as `raw_price * qty` before rounding, matching Back Office cart totals to the exact cent across any quantity (1, 2, 3, 5, etc.).
- **Strict GA4 Item Schema Compliance**:
  Enforces zero `line_total` or non-standard custom fields inside `ecommerce.items[]`. Eliminates Tag Assistant warnings and attribution discrepancies.
- **Multi-Platform Advertising Converters**:
  Simultaneously formats and validates payloads for:
  - **Google Analytics 4 (GA4)**
  - **Google Ads Dynamic Remarketing & Enhanced Conversions**
  - **Meta Pixel & Conversions API (CAPI)**
  - **TikTok Pixel & Events API**
  - **Pinterest Conversion Tag**
  - **Microsoft Advertising UET**
  - **OpenAI Ads (Minor Units / Cents)**
  - **Snapchat Conversions API**
- **Robust Event Lifecycle & Deduplication**:
  Tracks full lifecycle from `view_item`, `add_to_cart`, `view_cart`, `begin_checkout` to `purchase` and partial/full refunds. Built-in SHA-256 idempotency cache prevents duplicate conversion firing.
- **Autonomous Release & Upgrade Pipeline**:
  Includes automated packaging scripts with strict Linux forward-slash path validation, 1-Click Update manifest sync, and version consistency verification.

---

## Repository Structure

```
prestashop-datalayer-expert/
├── SKILL.md                                 # Main skill entrypoint for Antigravity AI
├── references/                              # Deep technical knowledge base across 20 domains
│   ├── 01_prestashop_architecture_and_lifecycle.md
│   ├── 02_authoritative_pricing_and_financials.md
│   ├── 03_multi_platform_advertising_schemas.md
│   ├── 04_order_lifecycle_and_conversion_integrity.md
│   ├── 05_server_side_transport_and_webhooks.md
│   ├── 06_testing_verification_and_safety_gates.md
│   └── 07_troubleshooting_and_failure_catalog.md
├── templates/                               # Drop-in production PHP & JavaScript templates
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
└── tests/                                   # Validation test harness (12 scenarios)
    └── skill_validation_scenarios.js
```

---

## Installation & Usage

### Installing as an Antigravity AI Skill
Clone or copy this directory into your Antigravity skills repository:
```bash
# Global Antigravity configuration directory
cp -r prestashop-datalayer-expert ~/.gemini/config/skills/
```

Once installed, the AI assistant will automatically recognize and activate the skill whenever a PrestaShop tracking, dataLayer, GA4, or conversion API task is requested.

### Running the Validation Test Suite
```bash
node tests/skill_validation_scenarios.js
```

---

## License
MIT License. See [LICENSE](LICENSE) for full details.
