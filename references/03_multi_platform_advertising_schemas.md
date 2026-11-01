# 03. Multi-Platform Advertising Schemas & Catalog Identity

## 1. Catalog ID Matching Strategies

When advertising platforms track events like `AddToCart` or `Purchase`, they match product identifiers against your uploaded product catalog feed (e.g., Google Merchant Center, Meta Commerce Manager, TikTok Catalog).

If the identifier in your DataLayer does not match the `<g:id>` in the feed, dynamic retargeting, smart shopping campaigns, and catalog sales fail.

### The 3 Core Feed Strategies:

Strategy Code | Pattern Example | Explanation
:--- | :--- | :---
`composite` | `68_299` | `{id_product}_{id_product_attribute}`. Standard for multi-variant feeds. For simple products without combinations: `68`.
`reference_sku` | `BHK125-B` | Uses PrestaShop reference code from combination or base product.
`id_product` | `68` | Strictly uses base product ID regardless of variant. Best for single-product catalogs.

### Implementation:
```javascript
function resolveCatalogItemId(item, strategy) {
  if (!item || typeof item !== 'object') return '';
  var strat = strategy || (window.psGtmConfig && window.psGtmConfig.catalogIdStrategy) || 'composite';
  if (strat === 'reference_sku' && item.sku_id) {
    return String(item.sku_id).trim();
  }
  if (strat === 'id_product') {
    return String(item.item_id).trim();
  }
  // Composite default
  if (item.variant_id && String(item.variant_id) !== '0' && parseInt(item.variant_id, 10) > 0) {
    return String(item.item_id).trim() + '_' + String(item.variant_id).trim();
  }
  return String(item.item_id).trim();
}
```

---

## 2. Platform-Specific Specification Matrix

### A. Google Analytics 4 (GA4)
- **Namespaces**: `ecommerce`
- **Canonical Events**: `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`, `refund`.
- **Items Array Schema**:
  ```javascript
  {
    item_id: "68",           // Base product ID
    variant_id: "299",       // Genuine combination ID (> 0)
    sku_id: "BHK125-B",      // PrestaShop reference
    item_name: "Blue Cup",
    item_brand: "Brand Name",
    item_category: "Category Name",
    item_variant: "Color: Blue",
    price: 13.00,            // Unit price
    quantity: 2
  }
  ```

---

### B. Google Ads (Conversions with Cart Data & Dynamic Remarketing)
- **Conversions with Cart Data**: Emits `cart_data.items` with `id`, `price`, `quantity`.
- **Retail Dynamic Remarketing**: Emits `ecomm_prodid`, `ecomm_pagetype`, `ecomm_totalvalue`, and `items` with `google_business_vertical: "retail"`.
- **New Customer Acquisition**: Emits `new_customer: true/false` and `customer_lifetime_value` on `purchase`.

```javascript
google_ads: {
  event_name: "purchase",
  dynamic_remarketing: {
    ecomm_pagetype: "purchase",
    ecomm_prodid: ["68_299"],
    ecomm_totalvalue: 25.99,
    items: [{ id: "68_299", google_business_vertical: "retail" }]
  },
  cart_data: {
    items: [{ id: "68_299", price: 13.00, quantity: 2 }]
  },
  new_customer: true,
  customer_lifetime_value: 145.50
}
```

---

### C. Meta Pixel & Conversions API (CAPI)
- **Event Mappings**:
  - `view_item` $\rightarrow$ `ViewContent`
  - `add_to_cart` $\rightarrow$ `AddToCart`
  - `begin_checkout` $\rightarrow$ `InitiateCheckout`
  - `purchase` $\rightarrow$ `Purchase`
  - `view_cart` $\rightarrow$ `Custom` (`custom_event_name: "ViewCart"`)
- **Advanced Matching User Data (Server Hashed SHA-256)**:
  `em` (email), `ph` (phone), `fn` (first name), `ln` (last name), `ct` (city), `st` (state), `zp` (zip), `country`.

---

### D. TikTok Pixel & Events API
- **Event Mappings**: `ViewContent`, `AddToCart`, `InitiateCheckout`, `CompletePayment`.
- **Item Contents**:
  ```javascript
  tiktok: {
    event_name: "AddToCart",
    content_type: "product",
    content_id: "68_299",
    contents: [{
      content_id: "68_299",
      content_type: "product",
      content_name: "Blue Cup",
      quantity: 2,
      price: 13.00
    }],
    value: 25.99,
    currency: "EUR"
  }
  ```

---

### E. Pinterest Ads
- **Event Mappings**: `PageVisit`, `AddToCart`, `InitiateCheckout`, `Checkout`, `Search`.
- **Line Items**: Emits `line_items` array with `product_id`, `product_price`, `product_quantity`, `product_variant_id`.

---

### F. Microsoft Advertising (UET)
- **Standard Events**: `event_action: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase'`.
- **Dynamic Remarketing**: Emits `ecomm_prodid`, `ecomm_pagetype`, `revenue_value`.

---

### G. Snapchat Ads (Dual-Object Architecture)
Snapchat requires two parallel structures:
1. `pixel`: Direct web pixel payload (`item_ids`, `price`, `number_items`).
2. `dynamic_ads`: Catalog matching payload (`content_type: "product"`, `contents: [...]`, `value`).

---

### H. OpenAI / ChatGPT Ads (Official Commerce Specification)
OpenAI commerce tracking specifies standard actions with **minor units (cents)** for monetary amounts:
- `view_item` $\rightarrow$ `contents_viewed`
- `add_to_cart` $\rightarrow$ `items_added`
- `begin_checkout` $\rightarrow$ `checkout_started`
- `purchase` $\rightarrow$ `purchase`

```javascript
openai_ads: {
  command: "measure",
  event_name: "purchase",
  data: {
    type: "purchase",
    amount: 2599, // 25.99 EUR represented in cents
    currency: "EUR",
    contents: [{
      id: "68_299",
      name: "Blue Cup",
      content_type: "product",
      quantity: 2,
      amount: 1300
    }]
  }
}
```
