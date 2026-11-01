const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. README.md
const readme = `# PrestaShop DataLayer & Conversion Tracking Expert

[![Test Suite](https://img.shields.io/badge/tests-12%20passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PrestaShop](https://img.shields.io/badge/PrestaShop-1.7%20--%208.2%2B-blue.svg)](https://www.prestashop-project.org/)
[![GA4 Compliant](https://img.shields.io/badge/GA4-Schema%20Compliant-orange.svg)](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

An enterprise-grade custom AI skill and architectural framework for building, auditing, debugging, and maintaining **PrestaShop DataLayer & Conversion Tracking Modules**.

Engineered for precision web analytics, server-side Google Tag Manager (sGTM), and multi-platform advertising conversion tracking (Meta, TikTok, Google Ads, Pinterest, Microsoft UET, OpenAI Ads, and Snapchat).

---

## Key Features & Architectural Highlights

- **Backend-Authoritative Data Models (Zero DOM Scraping)**:
  Extracts all ecommerce data directly from native PrestaShop ObjectModels (\`Product\`, \`Combination\`, \`Cart\`, \`Order\`, \`Customer\`, \`Carrier\`) and official JSON response deltas. Completely immune to frontend layout changes, CSS redesigns, and DOM mutations.
- **Authoritative Unrounded Pricing Engine**:
  Solves the PrestaShop "display price vs cart line total paradox". Preserves 6-decimal unrounded base catalog prices (\`12.995000 €\`) and calculates line totals as \`raw_price * qty\` before rounding, matching Back Office cart totals to the exact cent across any quantity (1, 2, 3, 5, etc.).
- **Strict GA4 Item Schema Compliance**:
  Enforces zero \`line_total\` or non-standard custom fields inside \`ecommerce.items[]\`. Eliminates Tag Assistant warnings and attribution discrepancies.
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
  Tracks full lifecycle from \`view_item\`, \`add_to_cart\`, \`view_cart\`, \`begin_checkout\` to \`purchase\` and partial/full refunds. Built-in SHA-256 idempotency cache prevents duplicate conversion firing.
- **Autonomous Release & Upgrade Pipeline**:
  Includes automated packaging scripts with strict Linux forward-slash path validation, 1-Click Update manifest sync, and version consistency verification.

---

## Repository Structure

\`\`\`
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
\`\`\`

---

## Installation & Usage

### Installing as an Antigravity AI Skill
Clone or copy this directory into your Antigravity skills repository:
\`\`\`bash
# Global Antigravity configuration directory
cp -r prestashop-datalayer-expert ~/.gemini/config/skills/
\`\`\`

Once installed, the AI assistant will automatically recognize and activate the skill whenever a PrestaShop tracking, dataLayer, GA4, or conversion API task is requested.

### Running the Validation Test Suite
\`\`\`bash
node tests/skill_validation_scenarios.js
\`\`\`

---

## License
MIT License. See [LICENSE](LICENSE) for full details.
`;

// 2. LICENSE (MIT)
const license = `MIT License

Copyright (c) 2026 Webanalytics Pro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

// 3. CHANGELOG.md
const changelog = `# Changelog

All notable changes to the **PrestaShop DataLayer & Conversion Tracking Expert** skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-02

### Added
- Complete 20-domain technical reference architecture across 7 comprehensive guides (\`references/\`).
- Authoritative \`PricingEngine\` template with unrounded 6-decimal catalog math and MDN exponential decimal rounding.
- \`CanonicalDataModel\` template with strict GA4 schema formatting and zero \`line_total\` inside \`items[]\`.
- \`ProductIdentityResolver\` template supporting composite, SKU, and product ID catalog strategies.
- Drop-in \`module_core.php.tpl\`, \`datalayer_core.js.tpl\`, and \`prestashop_adapter.js.tpl\`.
- 5 operational runbooks (\`workflows/\`) covering greenfield module building, auditing, pricing debugging, ad platform integration, and release pipelines.
- Comprehensive 12-scenario test harness (\`tests/skill_validation_scenarios.js\`) achieving 100% pass rate.
- Dual-installation and public GitHub release readiness.
`;

// 4. CONTRIBUTING.md
const contributing = `# Contributing to PrestaShop DataLayer Expert

We welcome contributions, bug reports, and enhancements to help maintain the gold standard for PrestaShop conversion tracking.

## Guiding Principles
1. **Backend-Authoritative Only**: No pull request introducing DOM scraping or HTML parsing will be accepted.
2. **Strict GA4 Compliance**: The \`items[]\` array must never include custom or deprecated fields like \`line_total\`.
3. **Delimiter & BOM Safety**: Zero UTF-8 BOM; all delimiters must be balanced.
4. **All Tests Must Pass**: Run \`node tests/skill_validation_scenarios.js\` before opening a PR.

## Submission Workflow
1. Fork the repository.
2. Create your feature branch (\`git checkout -b feature/new-adapter\`).
3. Commit your changes with descriptive commit messages.
4. Run the test suite: \`node tests/skill_validation_scenarios.js\`.
5. Push to the branch (\`git push origin feature/new-adapter\`).
6. Open a Pull Request.
`;

// 5. .gitignore
const gitignore = `node_modules/
.DS_Store
Thumbs.db
*.log
*.tmp
scratch/
`;

fs.writeFileSync(path.join(rootDir, 'README.md'), readme, 'utf8');
fs.writeFileSync(path.join(rootDir, 'LICENSE'), license, 'utf8');
fs.writeFileSync(path.join(rootDir, 'CHANGELOG.md'), changelog, 'utf8');
fs.writeFileSync(path.join(rootDir, 'CONTRIBUTING.md'), contributing, 'utf8');
fs.writeFileSync(path.join(rootDir, '.gitignore'), gitignore, 'utf8');

console.log('Successfully generated README, LICENSE, CHANGELOG, CONTRIBUTING, .gitignore in ' + rootDir);
