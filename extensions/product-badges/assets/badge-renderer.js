/**
 * Storefront badge engine — loaded once by the badge-embed App Embed block.
 *
 * Fetches this shop's badge config from the App Proxy and injects badges in
 * two ways:
 *  1. Precisely, into the `[data-product-badges-target]` anchor left by the
 *     product-badge.liquid App Block (Product Detail Page only).
 *  2. Heuristically, by scanning the page for `<a href="/products/...">`
 *     links — the one DOM pattern every theme shares — and injecting into
 *     their closest reasonable card container. This is what covers
 *     Collection Cards, Featured Products/Collection, Search Results, and
 *     Homepage Product Sections without needing per-theme code.
 *
 * Anything in a "related/complementary/recently viewed" rail looks
 * identical to any other product-card grid from the DOM's point of view, so
 * those three Display Locations share one detection bucket (best effort,
 * documented in Phase 7's summary rather than overclaimed as exact).
 */
(function () {
  "use strict";

  var CONFIG_ENDPOINT = "/apps/product-badges/storefront-config";
  var RENDERED_ATTR = "data-product-badges-rendered";
  var PRODUCT_HREF_PATTERN = /\/products\/([a-z0-9-]+)/i;

  // ---- cssFromBadgeStyle.ts port (kept in sync by hand) -------------------

  function badgeContainerDeclarations(style) {
    var isCircle = style.shape === "CIRCLE";
    var circleSize = style.width || style.height || 32;

    var declarations = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: style.backgroundColor,
      border: "1px solid " + style.borderColor,
      opacity: String(style.opacity / 100),
      boxShadow: style.shadow ? "0 2px 6px rgba(0, 0, 0, 0.25)" : "",
      width: isCircle ? circleSize + "px" : style.width ? style.width + "px" : "",
      height: isCircle ? circleSize + "px" : style.height ? style.height + "px" : "",
      padding: isCircle ? "" : style.paddingY + "px " + style.paddingX + "px",
      transform: style.rotation ? "rotate(" + style.rotation + "deg)" : "",
    };

    if (style.shape === "CIRCLE") {
      declarations.borderRadius = "50%";
    } else if (style.shape === "RECTANGLE") {
      declarations.borderRadius = "0";
    } else if (style.shape === "ROUNDED") {
      declarations.borderRadius = style.borderRadius + "px";
    } else if (style.shape === "RIBBON") {
      declarations.clipPath = "polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)";
    }

    return declarations;
  }

  var ANIMATION_CLASS_NAME = {
    NONE: "",
    PULSE: "badge-anim-pulse",
    BOUNCE: "badge-anim-bounce",
    FADE: "badge-anim-fade",
    SHAKE: "badge-anim-shake",
  };

  function positionDeclarations(position, offsetX, offsetY) {
    var base = { position: "absolute" };
    if (position === "TOP_LEFT") {
      base.top = "8px";
      base.left = "8px";
    } else if (position === "TOP_RIGHT") {
      base.top = "8px";
      base.right = "8px";
    } else if (position === "BOTTOM_LEFT") {
      base.bottom = "8px";
      base.left = "8px";
    } else if (position === "BOTTOM_RIGHT") {
      base.bottom = "8px";
      base.right = "8px";
    } else if (position === "CENTER") {
      base.top = "50%";
      base.left = "50%";
      base.transform = "translate(-50%, -50%)";
    } else if (position === "CUSTOM") {
      base.top = (offsetY || 0) + "px";
      base.left = (offsetX || 0) + "px";
    }
    return base;
  }

  function applyDeclarations(el, declarations) {
    for (var property in declarations) {
      if (Object.prototype.hasOwnProperty.call(declarations, property)) {
        el.style[property] = declarations[property];
      }
    }
  }

  function buildBadgeElement(badge) {
    var style = badge.style;

    var anchor = document.createElement("div");
    applyDeclarations(anchor, positionDeclarations(style.position, style.offsetX, style.offsetY));
    anchor.setAttribute("aria-hidden", "true");

    var container = document.createElement("div");
    applyDeclarations(container, badgeContainerDeclarations(style));
    if (style.customCss) {
      container.className = style.customCss;
    }

    var text = document.createElement("span");
    text.textContent = style.text;
    text.style.color = style.textColor;
    text.style.fontSize = style.fontSize + "px";
    text.style.fontWeight = style.fontWeight;
    text.style.lineHeight = "1";
    text.style.whiteSpace = "nowrap";
    var animationClass = ANIMATION_CLASS_NAME[style.animation];
    if (animationClass) {
      text.className = animationClass;
    }

    container.appendChild(text);
    anchor.appendChild(container);
    return anchor;
  }

  // ---- Badge resolution -----------------------------------------------

  function pickBadgeForHandle(config, handle) {
    for (var i = 0; i < config.badges.length; i++) {
      var badge = config.badges[i];
      if (badge.matchesAllProducts || badge.productHandles.indexOf(handle) !== -1) {
        return badge;
      }
    }
    return null;
  }

  // ---- Page-context -> Display Location mapping (best effort) ---------

  function activeLocationKeysForCurrentPage() {
    var path = window.location.pathname;
    if (path.indexOf("/collections/") === 0) {
      return ["COLLECTION_CARDS", "COLLECTION_PAGE"];
    }
    if (path.indexOf("/search") === 0) {
      return ["SEARCH_RESULTS"];
    }
    if (path.indexOf("/products/") === 0) {
      // Anything besides the main PDP anchor is a recommendation rail of
      // some kind; we can't distinguish related/complementary/recently
      // viewed from the DOM alone, so they share one bucket.
      return ["RELATED_PRODUCTS", "COMPLEMENTARY_PRODUCTS", "RECENTLY_VIEWED_PRODUCTS"];
    }
    if (path === "/" || path === "") {
      return ["FEATURED_PRODUCTS", "FEATURED_COLLECTION", "HOMEPAGE_PRODUCT_SECTIONS"];
    }
    return ["PRODUCT_CARDS"];
  }

  function anyLocationEnabled(config, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (config.locations[keys[i]]) {
        return true;
      }
    }
    return false;
  }

  // ---- DOM injection ----------------------------------------------------

  function injectBadge(container, badge) {
    if (!container || container.hasAttribute(RENDERED_ATTR)) {
      return;
    }
    var computedPosition = window.getComputedStyle(container).position;
    if (computedPosition === "static") {
      container.style.position = "relative";
    }
    container.appendChild(buildBadgeElement(badge));
    container.setAttribute(RENDERED_ATTR, "true");
  }

  function injectIntoProductDetailAnchor(config) {
    if (!config.locations.PRODUCT_DETAIL_PAGE) {
      return;
    }
    var anchors = document.querySelectorAll('[data-product-badges-target="product-detail-page"]');
    anchors.forEach(function (anchor) {
      var handle = anchor.getAttribute("data-product-handle");
      var badge = handle ? pickBadgeForHandle(config, handle) : null;
      if (badge) {
        injectBadge(anchor, badge);
      }
    });
  }

  function injectIntoProductCards(config) {
    var contextKeys = activeLocationKeysForCurrentPage();
    if (!anyLocationEnabled(config, contextKeys)) {
      return;
    }

    var links = document.querySelectorAll('a[href*="/products/"]');
    links.forEach(function (link) {
      var match = link.getAttribute("href").match(PRODUCT_HREF_PATTERN);
      if (!match) {
        return;
      }
      var badge = pickBadgeForHandle(config, match[1]);
      if (!badge) {
        return;
      }
      // The anchor itself is usually the card (image + title wrapped in one
      // <a>); fall back to its parent when the anchor only wraps part of it.
      var container = link.querySelector("img") ? link : link.parentElement || link;
      injectBadge(container, badge);
    });
  }

  function runInjection(config) {
    injectIntoProductDetailAnchor(config);
    injectIntoProductCards(config);
  }

  // ---- Bootstrap ----------------------------------------------------------

  // Storefronts are server-rendered (each navigation is a fresh page load,
  // unlike an SPA), so without this a shopper browsing five product pages in
  // a minute triggers five identical config fetches. sessionStorage caching
  // for the same window as the proxy's Cache-Control: max-age=60 cuts that
  // down to one fetch per minute per shopper.
  var CACHE_KEY = "product-badges:config";
  var CACHE_TTL_MS = 60 * 1000;

  function readCachedConfig() {
    try {
      var raw = window.sessionStorage.getItem(CACHE_KEY);
      if (!raw) {
        return null;
      }
      var entry = JSON.parse(raw);
      if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
        return null;
      }
      return entry.config;
    } catch (error) {
      return null;
    }
  }

  function writeCachedConfig(config) {
    try {
      window.sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ fetchedAt: Date.now(), config: config }),
      );
    } catch (error) {
      // sessionStorage can be unavailable (private browsing, quota) — caching
      // is an optimization, not a requirement, so fail silently.
    }
  }

  function getConfig() {
    var cached = readCachedConfig();
    if (cached) {
      return Promise.resolve(cached);
    }
    return fetch(CONFIG_ENDPOINT, { credentials: "omit" })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (config) {
        if (config) {
          writeCachedConfig(config);
        }
        return config;
      });
  }

  function init() {
    getConfig()
      .then(function (config) {
        if (!config || !config.enabled || !config.badges.length) {
          return;
        }

        runInjection(config);

        // Many themes load recommendation rails (recently viewed, predictive
        // search) asynchronously after first paint — re-scan when new nodes
        // show up. injectBadge's RENDERED_ATTR guard keeps this idempotent.
        var debounceTimer = null;
        var observer = new MutationObserver(function () {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(function () {
            runInjection(config);
          }, 150);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      })
      .catch(function () {
        // Storefront-facing script: fail silently rather than surface errors
        // to shoppers if the proxy request fails for any reason.
      });
  }

  window.ProductBadges = window.ProductBadges || { init: init };
  window.ProductBadges.init();
})();
