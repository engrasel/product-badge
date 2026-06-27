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

  // Mirrors CLIP_PATH_BY_SHAPE in app/utils/cssFromBadgeStyle.ts — kept in
  // sync by hand, same as the rest of this file.
  var CLIP_PATH_BY_SHAPE = {
    RIBBON: "polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)",
    TAG: "polygon(15% 0%, 100% 0%, 100% 100%, 15% 100%, 0% 50%)",
    CORNER: "polygon(0% 0%, 100% 0%, 0% 100%)",
  };

  function badgeContainerDeclarations(style) {
    var isCircle = style.shape === "CIRCLE";
    var isOutline = style.shape === "OUTLINE";
    var isGradient = style.backgroundType === "GRADIENT" && style.gradientColor1 && style.gradientColor2;
    var circleSize = style.width || style.height || 32;

    var declarations = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isOutline ? "transparent" : isGradient ? "" : style.backgroundColor,
      backgroundImage: isGradient
        ? "linear-gradient(135deg, " + style.gradientColor1 + ", " + style.gradientColor2 + ")"
        : "",
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
    } else if (style.shape === "PILL") {
      declarations.borderRadius = "999px";
    } else if (style.shape === "RECTANGLE" || style.shape === "OUTLINE") {
      declarations.borderRadius = "0";
    } else if (style.shape === "ROUNDED") {
      declarations.borderRadius = style.borderRadius + "px";
    } else if (CLIP_PATH_BY_SHAPE[style.shape]) {
      declarations.clipPath = CLIP_PATH_BY_SHAPE[style.shape];
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
    } else if (position === "TOP_CENTER") {
      base.top = "8px";
      base.left = "50%";
      base.transform = "translateX(-50%)";
    } else if (position === "TOP_RIGHT") {
      base.top = "8px";
      base.right = "8px";
    } else if (position === "MIDDLE_LEFT") {
      base.top = "50%";
      base.left = "8px";
      base.transform = "translateY(-50%)";
    } else if (position === "MIDDLE_RIGHT") {
      base.top = "50%";
      base.right = "8px";
      base.transform = "translateY(-50%)";
    } else if (position === "BOTTOM_LEFT") {
      base.bottom = "8px";
      base.left = "8px";
    } else if (position === "BOTTOM_CENTER") {
      base.bottom = "8px";
      base.left = "50%";
      base.transform = "translateX(-50%)";
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

  var customCssInjected = {};

  // Injects a badge's raw custom CSS (Premium "Custom CSS" textarea) exactly
  // once per badge id, scoped to that badge's own wrapper class so one
  // badge's CSS can never leak onto another.
  function injectCustomCss(badgeId, scopeClassName, cssText) {
    if (!cssText || customCssInjected[badgeId]) {
      return;
    }
    customCssInjected[badgeId] = true;
    var styleEl = document.createElement("style");
    styleEl.setAttribute("data-product-badges-custom-css", badgeId);
    styleEl.textContent = "." + scopeClassName + " { " + cssText + " }";
    document.head.appendChild(styleEl);
  }

  function buildBadgeElement(badge) {
    var style = badge.style;
    var isOutline = style.shape === "OUTLINE";
    var scopeClassName = "product-badge-" + badge.id;

    var anchor = document.createElement("div");
    applyDeclarations(anchor, positionDeclarations(style.position, style.offsetX, style.offsetY));
    anchor.setAttribute("aria-hidden", "true");

    var container = document.createElement("div");
    applyDeclarations(container, badgeContainerDeclarations(style));
    container.className = scopeClassName + (style.customCss ? " " + style.customCss : "");
    injectCustomCss(badge.id, scopeClassName, style.customCssCode);

    var text = document.createElement("span");
    text.textContent = style.text;
    text.style.color = isOutline ? style.borderColor : style.textColor;
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

  // `badge.locations` is null when the badge allows every shop-enabled
  // location (default); otherwise it's an explicit allow-list that must
  // overlap with the location(s) relevant to the current DOM context.
  function badgeAllowsAnyLocation(badge, locationKeys) {
    if (!badge.locations) {
      return true;
    }
    for (var i = 0; i < locationKeys.length; i++) {
      if (badge.locations.indexOf(locationKeys[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  function pickBadgeForHandle(config, handle, locationKeys) {
    for (var i = 0; i < config.badges.length; i++) {
      var badge = config.badges[i];
      if (!badgeAllowsAnyLocation(badge, locationKeys)) {
        continue;
      }
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
      var badge = handle ? pickBadgeForHandle(config, handle, ["PRODUCT_DETAIL_PAGE"]) : null;
      if (badge) {
        injectBadge(anchor, badge);
      }
    });
    return anchors.length > 0;
  }

  // Covers the common case where the merchant only turned on the App Embed
  // and never dragged the "Product Badge" App Block into their product
  // template (which is what creates the precise anchor above). Best-effort
  // across themes via a list of common gallery selectors, falling back to
  // the first sufficiently large <img> in the main content area.
  var PDP_IMAGE_SELECTORS = [
    "[data-product-single-media-wrapper]",
    ".product__media-item",
    ".product__media",
    ".product-single__photo",
    ".product__photo",
    "media-gallery",
    ".product-gallery",
    ".product__image-wrapper",
  ];

  function findFallbackPdpImageContainer() {
    for (var i = 0; i < PDP_IMAGE_SELECTORS.length; i++) {
      var match = document.querySelector(PDP_IMAGE_SELECTORS[i]);
      if (match) {
        return match;
      }
    }
    var images = document.querySelectorAll("main img, [class*='product'] img");
    for (var j = 0; j < images.length; j++) {
      if (images[j].offsetWidth >= 150) {
        return images[j].parentElement || images[j];
      }
    }
    return null;
  }

  function injectIntoProductDetailFallback(config, hasPreciseAnchor) {
    if (hasPreciseAnchor || !config.locations.PRODUCT_DETAIL_PAGE) {
      return;
    }
    if (window.location.pathname.indexOf("/products/") !== 0) {
      return;
    }
    var handle = window.location.pathname.split("/products/")[1].split("/")[0].split("?")[0];
    var badge = pickBadgeForHandle(config, handle, ["PRODUCT_DETAIL_PAGE"]);
    if (!badge) {
      return;
    }
    var container = findFallbackPdpImageContainer();
    if (container) {
      injectBadge(container, badge);
    }
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
      var badge = pickBadgeForHandle(config, match[1], contextKeys);
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
    var hasPreciseAnchor = injectIntoProductDetailAnchor(config);
    injectIntoProductDetailFallback(config, hasPreciseAnchor);
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
