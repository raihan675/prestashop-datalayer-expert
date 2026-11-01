# 04. Order Lifecycle, Conversion Integrity & Payment Verification

## 1. Preserving Historical Order Accuracy

> [!CRITICAL]
> **Never Recalculate Historical Orders From the Catalog**:
> When an order is completed, product catalog prices, combination impacts, tax rates, or currency exchange rates may change in the future.
> For `purchase`, `refund`, and offline conversion events, always read the **historical records** stored on the `Order` and `OrderDetail` objects.

```php
$order = new Order((int)$idOrder);
$orderProducts = $order->getProducts();

foreach ($orderProducts as $p) {
    // Read historical recorded price from ps_order_detail
    $unitPrice = (float)$p['unit_price_tax_incl'];
    $lineTotal = isset($p['total_price_tax_incl']) 
        ? (float)$p['total_price_tax_incl'] 
        : ($unitPrice * (int)$p['product_quantity']);

    $items[] = [
        'item_id' => (string)$p['product_id'],
        'variant_id' => !empty($p['product_attribute_id']) ? (string)$p['product_attribute_id'] : '',
        'sku_id' => !empty($p['product_reference']) ? (string)$p['product_reference'] : '',
        'item_name' => (string)$p['product_name'],
        'price' => PricingEngine::roundHalfUp($unitPrice, $currencyPrecision),
        'quantity' => (int)$p['product_quantity'],
    ];
}
```

---

## 2. Infallible Conversion Deduplication

When a customer reloads the order confirmation page, navigates back, or receives an order status email with a link to the order history, tracking modules must **never fire duplicate `purchase` events**.

### Deduplication Engine Implementation:
Use a dedicated database flag or lookup table in PrestaShop:

```php
class DeduplicationManager
{
    public static function isTransactionTracked($idOrder)
    {
        $idOrder = (int)$idOrder;
        if ($idOrder <= 0) return false;

        $db = Db::getInstance();
        $res = $db->getValue("
            SELECT COUNT(*) FROM `" . _DB_PREFIX_ . "ps_gtm_tracked_orders`
            WHERE `id_order` = " . (int)$idOrder
        );
        return ((int)$res > 0);
    }

    public static function markTransactionTracked($idOrder)
    {
        $idOrder = (int)$idOrder;
        if ($idOrder <= 0) return;

        Db::getInstance()->execute("
            INSERT IGNORE INTO `" . _DB_PREFIX_ . "ps_gtm_tracked_orders` (`id_order`, `date_add`)
            VALUES (" . (int)$idOrder . ", NOW())
        ");
    }
}
```

---

## 3. Payment Verification & Asynchronous Orders

In ecommerce, **placing an order is not synonymous with receiving payment**.

| Payment Type | Examples | Immediate Web Tracking? | Webhook / Server Trigger? |
| :--- | :--- | :--- | :--- |
| **Instant Payment** | Stripe, PayPal, Credit Card | Yes (Verified upon confirmation) | Secondary backup |
| **Deferred Payment** | Bankwire (Überweisung), Cheque | **No** (Payment pending) | **Yes** (Upon transition to `PS_OS_PAYMENT`) |
| **Pay on Delivery** | Cash on Delivery (COD) | **Configurable** (Usually on delivery) | **Yes** (Upon order fulfillment) |

### Hooking Order Status Changes (`actionOrderStatusPostUpdate`):
```php
public function hookActionOrderStatusPostUpdate($params)
{
    try {
        $newOrderStatus = $params['newOrderStatus'];
        $idOrder = (int)$params['id_order'];

        if ((int)$newOrderStatus->id === (int)Configuration::get('PS_OS_PAYMENT')) {
            // Check if purchase was already tracked via browser
            if (!DeduplicationManager::isTransactionTracked($idOrder)) {
                // Dispatch verified server-side conversion (CAPI, TikTok Events API, Google Offline)
                ServerSideWebhookDispatcher::dispatchOfflinePurchase($idOrder);
                DeduplicationManager::markTransactionTracked($idOrder);
            }
        } elseif ((int)$newOrderStatus->id === (int)Configuration::get('PS_OS_REFUND')) {
            // Dispatch refund event
            RefundDataResolver::dispatchFullRefund($idOrder);
        }
    } catch (\Throwable $e) {}
}
```

---

## 4. Refund Tracking (Full vs Partial)

PrestaShop allows partial returns, product exchanges, and restocking with or without shipping refunds.

### Partial Refund Resolution via Credit Slips:
```php
class RefundDataResolver
{
    public static function resolvePartialRefund($idOrder, $idOrderSlip)
    {
        $order = new Order((int)$idOrder);
        $orderSlip = new OrderSlip((int)$idOrderSlip);
        
        $slipDetails = $orderSlip->getOrdersSlipProducts((int)$idOrderSlip, $order);
        $refundItems = [];

        foreach ($slipDetails as $d) {
            $refundItems[] = [
                'item_id' => (string)$d['product_id'],
                'variant_id' => !empty($d['product_attribute_id']) ? (string)$d['product_attribute_id'] : '',
                'quantity' => (int)$d['product_quantity'],
                'price' => (float)$d['unit_price_tax_incl'],
            ];
        }

        return [
            'event' => 'refund',
            'ecommerce' => [
                'transaction_id' => (string)$order->reference ?: (string)$order->id,
                'value' => (float)$orderSlip->total_products_tax_incl,
                'currency' => Currency::getIsoCodeById((int)$order->id_currency),
                'items' => $refundItems,
            ]
        ];
    }
}
```
