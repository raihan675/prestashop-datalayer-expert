# 02. Authoritative Store Pricing & Financial Calculations Guide

## 1. The PrestaShop Core Pricing Engine & Unrounded Floating-Point Math

In PrestaShop, base catalog prices, catalog price rules, and percentage discounts are evaluated with **6 decimal places of precision** in the database:

$$\text{Product Base Price} = 25.99\text{ €}$$
$$\text{Discount} = 50\% \implies \text{Raw Unit Price} = 25.99 \times 0.5 = \mathbf{12.995000\text{ €}}$$

### The Display Rounding vs Cart Line Total Paradox:
- **Product Display**: On the storefront product detail page (PDP), PrestaShop rounds the raw price to currency precision (2 decimals):
  $$\text{Display Price} = \text{round}(12.995, 2) = \mathbf{13.00\text{ €}}$$
- **Cart Line Subtotal Calculation**: In the Back Office and cart engine, PrestaShop multiplies the **unrounded raw unit price** by the quantity before final rounding:
  - **1 unit**: $12.995 \times 1 = 12.995 \rightarrow \mathbf{13.00\text{ €}}$
  - **2 units**: $12.995 \times 2 = 25.990 \rightarrow \mathbf{25.99\text{ €}}$ *(NOT $13.00 \times 2 = 26.00\text{ €}$)*
  - **3 units**: $12.995 \times 3 = 38.985 \rightarrow \mathbf{38.99\text{ €}}$ *(NOT $13.00 \times 3 = 39.00\text{ €}$)*
  - **4 units**: $12.995 \times 4 = 51.980 \rightarrow \mathbf{51.98\text{ €}}$ *(NOT $13.00 \times 4 = 52.00\text{ €}$)*
  - **5 units**: $12.995 \times 5 = 64.975 \rightarrow \mathbf{64.98\text{ €}}$ *(NOT $13.00 \times 5 = 65.00\text{ €}$)*

Any dataLayer module that naively computes `ecommerce.value = item.price * quantity` using the displayed unit price will create **revenue discrepancies** between analytics platforms and the actual bank deposits / PrestaShop order totals.

---

## 2. Server-Side PHP Unrounded Pricing Resolution

To obtain both the display unit price and the unrounded calculation base directly from PrestaShop's ObjectModel:

```php
class PricingEngine
{
    /**
     * Resolves the unrounded 6-decimal customer unit price directly from PrestaShop.
     */
    public static function getRawCustomerPrice(Product $product, $idAttribute = 0, $quantity = 1, Context $context = null)
    {
        if ($context === null) {
            $context = Context::getContext();
        }
        $isTaxIncl = PlatformAdapter::isTaxIncluded($context);

        $specificPriceOutput = null;
        $price = Product::getPriceStatic(
            (int)$product->id,
            $isTaxIncl,
            $idAttribute ? (int)$idAttribute : null,
            6, // 6 decimals calculation precision
            null,
            false,
            true,
            $quantity,
            false,
            (int)$context->customer->id,
            (int)$context->cart->id,
            (int)$context->cart->id_address_delivery,
            $specificPriceOutput,
            true,
            true,
            $context
        );

        return (float)$price;
    }

    /**
     * Resolves the display unit price rounded to store currency precision.
     */
    public static function getCustomerPrice(Product $product, $idAttribute = 0, $quantity = 1, Context $context = null)
    {
        $raw = self::getRawCustomerPrice($product, $idAttribute, $quantity, $context);
        $precision = PlatformAdapter::getCurrencyPrecision($context);
        return self::roundHalfUp($raw, $precision);
    }
}
```

---

## 3. Client-Side IEEE 754 Floating-Point Mitigation

In JavaScript, standard binary floating-point arithmetic introduces microscopic precision errors:
$$12.995 \times 5 = 64.97499999999999$$
If passed to `Math.round(val * 100) / 100`, JavaScript rounds this down to **`64.97`**, failing to match PrestaShop's true **`64.98 €`**.

### The Solution: MDN Exponential Decimal Rounding
Always use exponential notation in JavaScript to shift decimals before rounding:

```javascript
function roundHalfUp(num, decimals) {
  var d = (decimals !== undefined && decimals !== null) ? parseInt(decimals, 10) : 2;
  if (isNaN(d) || d < 0) d = 2;
  var n = Number(num);
  if (isNaN(n)) return 0.0;
  // Shifts decimal point using exponential representation to avoid IEEE 754 precision artifacts
  return Number(Math.round(Number(n + 'e' + d)) + 'e-' + d);
}
```

---

## 4. Strict Separation of Monetary Dimensions

Never combine or conflate distinct monetary components:

| Parameter | Semantics | Source of Truth |
| :--- | :--- | :--- |
| **`price`** | Applicable unit price for 1 item | `PricingEngine::getCustomerPrice()` |
| **`quantity`** | Number of units added/purchased | Positive integer |
| **`value`** (Item-level) | *Internal line total ($unit \times qty$)* | PrestaShop `total_wt` or raw price $\times$ qty |
| **`value`** (Event-level) | Total monetary value of the event action | `cart.getOrderTotal()` or `deltaResult.value` |
| **`shipping`** | Standalone delivery charge | `$order->total_shipping_tax_incl` |
| **`tax`** | Total tax portion | `$order->total_paid_tax_incl - $order->total_paid_tax_excl` |
| **`coupon`** | Comma-separated discount/voucher codes | `$cart->getCartRules()` / `$order->getCartRules()` |

---

## 5. Strict Canonical GA4 Item Schema Compliance

> [!CRITICAL]
> **Zero `line_total` in GA4 `items[]`**:
> Google Analytics 4 strictly specifies canonical parameters for items. Non-standard properties like `line_total`, `_line_value`, or `_raw_price` must **never** be emitted into the final dataLayer `ecommerce.items[]` array.
> Internal properties must be used strictly during calculation to determine `ecommerce.value`, and then stripped by `normalizeItems()` before dispatch.

### Correct Payload Example:
```json
{
  "event": "ps_add_to_cart",
  "original_event": "add_to_cart",
  "ecommerce": {
    "currency": "EUR",
    "value": 25.99,
    "items": [
      {
        "item_id": "68",
        "variant_id": "299",
        "sku_id": "BHK125-B",
        "item_name": "Trink und Snack Tasse",
        "item_brand": "Haakaa",
        "item_category": "baby-geschirr",
        "item_variant": "Farbe: Stahlblau",
        "price": 13,
        "quantity": 2
      }
    ]
  }
}
```
*Note that `ecommerce.value` is accurately `25.99`, while `items[0]` contains only standard parameters.*
