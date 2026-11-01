# Runbook 02: Auditing an Existing PrestaShop DataLayer Module

Use this runbook to conduct a thorough architectural, accuracy, and compliance audit on any existing PrestaShop tracking module.

---

## Phase 1: Security & Syntax Pre-Flight Check
1. **UTF-8 BOM Check**:
   - Ensure zero files start with the 3-byte EF BB BF BOM marker.
2. **Balanced PHP & Smarty Delimiters**:
   - Check all `{...}`, `[...]`, and `(...)` delimiters for balanced pairs.
   - Confirm `_PS_VERSION_` gate is present at line 1 of every executable PHP file.
3. **Exception Safety**:
   - Verify every hook implementation and controller action is wrapped in a defensive `try { ... } catch (\Throwable $e)` block with `PrestaShopLogger::addLog()`.

---

## Phase 2: Data Source Integrity (Zero DOM Scraping Audit)
1. **Grep Frontend Scripts**:
   - Search for `document.querySelector`, `$('.price')`, `textContent`, `innerText`, `window.location.search`.
   - Flag any instance where price, SKU, product ID, or currency is extracted from HTML nodes.
2. **Event Bus Binding**:
   - Verify frontend listeners attach to official `prestashop.on` events or intercept JSON responses.
3. **Smarty Payload Hydration**:
   - Confirm server-rendered templates pass structured JSON variables via `window.ps_datalayer_config` rather than rendering HTML attributes for scraping.

---

## Phase 3: Financial & Schema Compliance Audit
1. **Strict GA4 Ecommerce Item Schema**:
   - Verify that `items[]` contains only official fields (`item_id`, `item_name`, `price`, `quantity`, `item_brand`, `item_category`, `item_variant`, etc.).
   - Reject any presence of `line_total` or custom non-standard fields inside `items[]`.
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
