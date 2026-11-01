# Changelog

All notable changes to the **PrestaShop DataLayer & Conversion Tracking Expert** skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-02

### Added
- Complete 20-domain technical reference architecture across 7 comprehensive guides (`references/`).
- Authoritative `PricingEngine` template with unrounded 6-decimal catalog math and MDN exponential decimal rounding.
- `CanonicalDataModel` template with strict GA4 schema formatting and zero `line_total` inside `items[]`.
- `ProductIdentityResolver` template supporting composite, SKU, and product ID catalog strategies.
- Drop-in `module_core.php.tpl`, `datalayer_core.js.tpl`, and `prestashop_adapter.js.tpl`.
- 5 operational runbooks (`workflows/`) covering greenfield module building, auditing, pricing debugging, ad platform integration, and release pipelines.
- Comprehensive 12-scenario test harness (`tests/skill_validation_scenarios.js`) achieving 100% pass rate.
- Dual-installation and public GitHub release readiness.
