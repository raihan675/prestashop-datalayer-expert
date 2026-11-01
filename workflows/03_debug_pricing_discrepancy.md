# Runbook 03: Debugging Pricing & Value Discrepancies

This runbook resolves the classic discrepancy where cart or event values differ from PrestaShop Back Office calculations across quantities.

---

## The Root Cause: Display Price vs Cart Line Total Paradox
In PrestaShop:
1. Catalog product base prices can have up to 6 decimal places (e.g. 25.99 € with 50% discount = `12.995000 €`).
2. When displayed on the product page or in item rows, PrestaShop rounds to 2 decimals: `13.00 €`.
3. In the cart and checkout, PrestaShop multiplies the **unrounded raw price** by quantity before rounding:
   - Qty 1: `round(12.995 * 1) = 13.00 €`
   - Qty 2: `round(12.995 * 2) = round(25.99) = 25.99 €` (NOT `13.00 * 2 = 26.00 €`)
   - Qty 3: `round(12.995 * 3) = round(38.985) = 38.99 €` (NOT `13.00 * 3 = 39.00 €`)
   - Qty 5: `round(12.995 * 5) = round(64.975) = 64.98 €`

---

## Systematic Debugging Steps

### Step 1: Inspect the Raw Catalog Price
Run a quick query or helper dump in PrestaShop:
```php
$priceTaxIncl = Product::getPriceStatic(
    $id_product,
    true, // tax incl
    $id_product_attribute,
    6,    // 6 decimals precision
    null, false, true, 1
);
`
If the 6-decimal value has fractional cents (e.g. `.995`), you are in fractional discount territory.

### Step 2: Inspect Event Payload Construction
1. Check `ecommerce.value` vs `ecommerce.items[0].price * items[0].quantity`.
2. Confirm that `ecommerce.value` matches:
   ```php
   $eventValue = round($rawUnitPrice * $quantity, 2);
   ```
3. Confirm that `items[0].price` remains the individual unit price (`13.00`).
4. **CRITICAL**: Confirm `line_total` has been completely deleted from `items[0]`.

### Step 3: Check JavaScript IEEE 754 Floating-Point Truncation
In frontend JavaScript:
```javascript
// BROKEN: Math.round(12.995 * 5 * 100) / 100 -> 12.995 * 5 is 64.97499999999999 -> rounds to 64.97!
// FIXED: Exponential decimal rounding
function roundExact(num, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
}
`

### Step 4: Verify Cart Deletion and Update Events
When a user clicks "Remove from cart" (e.g. 3 items removed):
1. Compute the removed value as `roundExact(rawUnitPrice * removedQty, 2)` = `38.99 €`.
2. Ensure it does NOT report `39.00 €` from naive integer multiplication.
