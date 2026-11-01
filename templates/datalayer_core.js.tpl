/**
 * Pure JavaScript DataLayer Core Engine
 *
 * Implements authoritative mathematical rounding, strict GA4 ecommerce schemas,
 * and multi-platform advertising adapters.
 * Zero DOM scraping. Pure payload normalization.
 */
(function(window) {
  'use strict';

  var DataLayerCore = {
    /**
     * Accurate decimal rounding avoiding IEEE 754 floating-point drift
     */
    round: function(value, decimals) {
      if (typeof value !== 'number' || isNaN(value)) {
        value = Number(value) || 0;
      }
      decimals = decimals !== undefined ? decimals : 2;
      return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
    },

    /**
     * Normalizes items strictly according to GA4 specification
     * Removes internal fields like line_total or raw prices
     */
    normalizeItems: function(items) {
      if (!Array.isArray(items)) return [];
      var self = this;
      return items.map(function(item) {
        var qty = Number(item.quantity) || 1;
        var unitPrice = self.round(Number(item.price) || 0, 2);

        var cleanItem = {
          item_id: String(item.item_id || ''),
          item_name: String(item.item_name || ''),
          price: unitPrice,
          quantity: qty
        };

        if (item.item_brand) cleanItem.item_brand = String(item.item_brand);
        if (item.item_category) cleanItem.item_category = String(item.item_category);
        if (item.item_category2) cleanItem.item_category2 = String(item.item_category2);
        if (item.item_variant) cleanItem.item_variant = String(item.item_variant);
        if (item.sku_id) cleanItem.sku_id = String(item.sku_id);
        if (item.variant_id) cleanItem.variant_id = String(item.variant_id);
        if (item.discount !== undefined && item.discount !== null) {
          cleanItem.discount = self.round(Number(item.discount), 2);
        }

        // Strictly omit line_total, total_amount, or custom internal properties
        return cleanItem;
      });
    },

    /**
     * Calculates the exact authoritative event value
     * Uses item.raw_unit_price * quantity if provided to match cart unrounded base math
     */
    calculateAuthoritativeValue: function(items, explicitTotal) {
      if (explicitTotal !== undefined && explicitTotal !== null && !isNaN(explicitTotal)) {
        return this.round(Number(explicitTotal), 2);
      }
      var self = this;
      var sum = 0;
      if (Array.isArray(items)) {
        items.forEach(function(item) {
          var qty = Number(item.quantity) || 1;
          var unitPrice = item.raw_unit_price !== undefined ? Number(item.raw_unit_price) : (Number(item.price) || 0);
          sum += unitPrice * qty;
        });
      }
      return self.round(sum, 2);
    },

    /**
     * Constructs the multi-platform payload
     */
    buildEventPayload: function(eventName, items, currency, options) {
      options = options || {};
      var prefix = options.eventPrefix || 'ps_';
      var platforms = options.platforms || { ga4: true };
      var cleanItems = this.normalizeItems(items);
      var eventValue = this.calculateAuthoritativeValue(items, options.value);

      var payload = {
        event: prefix + eventName,
        original_event: eventName,
        ecommerce: {
          currency: currency || 'EUR',
          value: eventValue,
          items: cleanItems
        }
      };

      if (options.transaction_id) payload.ecommerce.transaction_id = String(options.transaction_id);
      if (options.shipping !== undefined) payload.ecommerce.shipping = this.round(Number(options.shipping), 2);
      if (options.tax !== undefined) payload.ecommerce.tax = this.round(Number(options.tax), 2);
      if (options.coupon) payload.ecommerce.coupon = String(options.coupon);

      // Meta Pixel Schema
      if (platforms.meta) {
        var metaMap = {
          'view_item': 'ViewContent',
          'add_to_cart': 'AddToCart',
          'remove_from_cart': 'RemoveFromCart',
          'view_cart': 'Custom',
          'begin_checkout': 'InitiateCheckout',
          'purchase': 'Purchase'
        };
        var metaEventName = metaMap[eventName] || 'Custom';
        payload.meta = {
          event_name: metaEventName,
          content_type: 'product',
          content_ids: cleanItems.map(function(i) { return i.item_id; }),
          contents: cleanItems.map(function(i) {
            return { id: i.item_id, quantity: i.quantity, item_price: i.price };
          }),
          currency: currency || 'EUR',
          value: eventValue
        };
        if (metaEventName === 'Custom') {
          payload.meta.custom_event_name = eventName === 'view_cart' ? 'ViewCart' : eventName;
        }
      }

      // TikTok Events API Schema
      if (platforms.tiktok) {
        var ttMap = {
          'view_item': 'ViewContent',
          'add_to_cart': 'AddToCart',
          'view_cart': 'Custom',
          'begin_checkout': 'InitiateCheckout',
          'purchase': 'CompletePayment'
        };
        payload.tiktok = {
          event_name: ttMap[eventName] || 'Custom',
          content_type: 'product',
          contents: cleanItems.map(function(i) {
            return { content_id: i.item_id, content_type: 'product', quantity: i.quantity, price: i.price };
          }),
          currency: currency || 'EUR',
          value: eventValue
        };
      }

      // Google Ads Dynamic Remarketing Schema
      if (platforms.googleAds) {
        var gadsPageMap = {
          'view_item': 'product',
          'view_item_list': 'category',
          'view_cart': 'cart',
          'add_to_cart': 'cart',
          'begin_checkout': 'cart',
          'purchase': 'purchase'
        };
        payload.google_ads = {
          ecomm_prodid: cleanItems.length === 1 ? cleanItems[0].item_id : cleanItems.map(function(i) { return i.item_id; }),
          ecomm_pagetype: gadsPageMap[eventName] || 'other',
          ecomm_totalvalue: eventValue
        };
      }

      // OpenAI Ads Schema (Minor Units / Cents)
      if (platforms.openai) {
        payload.openai = {
          event_name: eventName,
          currency: currency || 'EUR',
          value_in_cents: Math.round(eventValue * 100),
          items: cleanItems.map(function(i) {
            return {
              id: i.item_id,
              name: i.item_name,
              quantity: i.quantity,
              unit_price_in_cents: Math.round(i.price * 100)
            };
          })
        };
      }

      return payload;
    },

    /**
     * Safe push to window.dataLayer
     */
    push: function(payload) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    }
  };

  window.PrestaShopDataLayerCore = DataLayerCore;
})(window);
