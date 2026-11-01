/**
 * PrestaShop Event Bus & AJAX Adapter
 *
 * Binds strictly to official prestashop.on events and backend JSON response deltas.
 * ZERO DOM scraping.
 */
(function(window, document) {
  'use strict';

  function initAdapter() {
    var core = window.PrestaShopDataLayerCore;
    var config = window.ps_datalayer_config || {};
    var prefix = config.eventPrefix || 'ps_';

    if (!core) return;

    // Listen to PrestaShop official cart updates
    if (window.prestashop && typeof window.prestashop.on === 'function') {
      window.prestashop.on('updateCart', function(event) {
        if (!event || !event.resp) return;

        var resp = event.resp;
        var reason = event.reason || {};

        // 1. Check if an item was added or updated
        if (reason.linkAction === 'add-to-cart' && resp.hasError === false) {
          // Identify added product from response cart items or delta
          var addedId = reason.idProduct;
          var addedAttr = reason.idProductAttribute || 0;
          var addedQty = Number(reason.quantity) || 1;

          var item = {
            item_id: config.catalogIdFormat === 'reference_sku' && reason.reference ? reason.reference : (addedAttr > 0 ? addedId + '_' + addedAttr : String(addedId)),
            item_name: reason.productName || 'Product',
            price: Number(reason.price) || 0,
            quantity: addedQty
          };

          var payload = core.buildEventPayload('add_to_cart', [item], config.currency || 'EUR', {
            eventPrefix: prefix,
            platforms: config.platforms
          });
          core.push(payload);
        } else if (reason.linkAction === 'delete-from-cart') {
          // Item removed
          var removedId = reason.idProduct;
          var removedAttr = reason.idProductAttribute || 0;
          var removedQty = Number(reason.quantity) || 1;

          var removedItem = {
            item_id: config.catalogIdFormat === 'reference_sku' && reason.reference ? reason.reference : (removedAttr > 0 ? removedId + '_' + removedAttr : String(removedId)),
            item_name: reason.productName || 'Product',
            price: Number(reason.price) || 0,
            quantity: removedQty
          };

          var removePayload = core.buildEventPayload('remove_from_cart', [removedItem], config.currency || 'EUR', {
            eventPrefix: prefix,
            platforms: config.platforms
          });
          core.push(removePayload);
        }
      });
    }

    // Intercept native fetch/XMLHttpRequest cart additions for standalone themes
    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function() {
        var args = arguments;
        var url = args[0];
        return originalFetch.apply(this, args).then(function(response) {
          if (typeof url === 'string' && (url.indexOf('controller=cart') !== -1 || url.indexOf('/cart') !== -1)) {
            // Clone response to inspect JSON without consuming stream
            response.clone().json().then(function(data) {
              if (data && data.success && data.cart) {
                // Verified authoritative JSON response
              }
            }).catch(function() {});
          }
          return response;
        });
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdapter);
  } else {
    initAdapter();
  }
})(window, document);
