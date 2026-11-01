# 07. Troubleshooting & Failure Catalog

This catalog documents real-world bugs, edge cases, root causes, and verified resolutions discovered during enterprise PrestaShop tracking implementations.

---

### Failure 1: Multi-Quantity Cart Value Inconsistency ($26.00\text{ €}$ vs $25.99\text{ €}$)
- **Symptom**: A product with a 50% discount on $25.99\text{ €}$ displays $13.00\text{ €}$ unit price. When 2 units are added, `ps_add_to_cart` emits `value: 26` while `ps_view_cart` emits `value: 25.99`. When 4 units are removed, `ps_remove_from_cart` emits `value: 52` while cart subtotal is `51.98`.
- **Root Cause**: The catalog price in PrestaShop is stored unrounded as $12.995\text{ €}$. PrestaShop rounds unit display to $13.00\text{ €}$, but computes cart totals by multiplying $12.995 \times \text{qty}$ before rounding. Client-side JavaScript lacked the unrounded base and naively multiplied the displayed rounded unit price ($13 \times 2 = 26$).
- **Verified Solution**:
  1. Expose `PricingEngine::getRawCustomerPrice()` returning the 6-decimal unrounded customer price (`12.995`).
  2. Hydrate internal properties `_raw_price` and `_line_value` on combinations and in-memory cart models.
  3. Compute event values using unrounded prices and MDN exponential decimal rounding, while stripping internal fields from the output `items[]` array.

---

### Failure 2: `line_total` Leaking into GA4 `items[]` Array
- **Symptom**: Google Tag Assistant flags schema warnings or extraneous properties on `items[0].line_total: 25.99`.
- **Root Cause**: To solve line-value calculations, developers attached `line_total` directly to item data objects, which then serialized into the canonical GA4 items payload.
- **Verified Solution**:
  1. Enforce strict parameter whitelisting in `CanonicalDataModel::formatItem()` (PHP) and `normalizeItem()` (JS).
  2. Calculate `ecommerce.value` from internal properties (`_line_value` or raw price $\times$ qty) **before** passing items through `normalizeItems()`.

---

### Failure 3: 1-Click Update Banner Missing in Back Office
- **Symptom**: A new release tag is pushed to GitHub, but PrestaShop Back Office shows no "New Version Available" update banner.
- **Root Cause**: The module's `UpdateManager` compared `$manifest['latest_version']`, but the release script only updated the secondary `"version"` key in `update-manifest.json`.
- **Verified Solution**:
  1. Ensure both `"latest_version"` and `"version"` are updated in `update-manifest.json`.
  2. Implement defensive fallback in `UpdateManager.php`:
     ```php
     $latestVersion = !empty($manifest['latest_version']) ? $manifest['latest_version'] : (!empty($manifest['version']) ? $manifest['version'] : null);
     ```

---

### Failure 4: Class Not Found Crash After Module Upload on Linux Servers
- **Symptom**: Storefront or Back Office throws `Fatal error: Class 'PricingEngine' not found` immediately after installing a zip archive created on Windows.
- **Root Cause**: Windows ZIP archivers generated directory entries with backslashes (`ps_gtm_datalayer\classes\PricingEngine.php`). Linux zip unpackers treat backslashes as valid filename characters rather than directory delimiters, extracting a flat file named `classes\PricingEngine.php` in the root.
- **Verified Solution**: Always enforce forward slashes (`/`) in packaging scripts and verify zero backslashes in the zip file table.

---

### Failure 5: Duplicate `purchase` Events on Page Reload
- **Symptom**: Refreshing the order confirmation page fires a second `purchase` event, inflating conversions and ROAS metrics.
- **Root Cause**: Event firing tied strictly to page view without transaction persistence.
- **Verified Solution**: Check `DeduplicationManager::isTransactionTracked($order->id)` on `displayOrderConfirmation`. If already recorded, suppress dataLayer push and log a comment.

---

### Failure 6: JavaScript IEEE 754 Floating-Point Drift ($12.995 \times 5 = 64.97$)
- **Symptom**: 5 units of a $12.995\text{ €}$ item compute as $64.97\text{ €}$ in dataLayer instead of the store's $64.98\text{ €}$.
- **Root Cause**: Binary floating point multiplication evaluates $12.995 \times 5 = 64.97499999999999$, which `Math.round(val * 100) / 100` rounds down to $64.97$.
- **Verified Solution**: Use MDN exponential decimal rounding:
  ```javascript
  Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
  ```

---

### Failure 7: Corrupted or Empty `PS_GTM_ACTIVE_EVENTS` Disabling All Tracking
- **Symptom**: All storefront events suddenly stop pushing to dataLayer without errors.
- **Root Cause**: Database configuration record `PS_GTM_ACTIVE_EVENTS` was saved as an empty JSON array `[]` or corrupted string, causing `isEventEnabled()` checks to return `false` for every event.
- **Verified Solution**: Implement self-healing in module initialization:
  ```php
  $rawActive = Configuration::get('PS_GTM_ACTIVE_EVENTS');
  if ($rawActive === '[]' || (is_string($rawActive) && empty(json_decode($rawActive, true)))) {
      Configuration::deleteByName('PS_GTM_ACTIVE_EVENTS');
  }
  ```
  And default `isEventEnabled()` to `true` whenever configuration is absent or empty.

---

### Failure 8: Trash Bin on Checkout Triggering False `select_item`
- **Symptom**: Clicking the delete trash bin icon in checkout or cart overview pushes `select_item` before `remove_from_cart`.
- **Root Cause**: Generic listing click listeners matched all `<a>` tags inside product wrappers without excluding cart removal buttons (`.remove-from-cart`, `[data-link-action="delete-from-cart"]`).
- **Verified Solution**: Explicitly filter out cart action selectors and trash icons in listing click handlers.
