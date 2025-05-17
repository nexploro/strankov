// strankov-badge.js
(function () {
  // --- Configuration ---
  const badgeId = "strankov-promo-badge-instance"; // ID for the main badge container
  const styleId = "strankov-promo-badge-styles"; // ID for the injected style tag
  let badgeContainer; // Will hold the badge's main div element
  const LUMINANCE_THRESHOLD = 0.4; // Threshold to determine if a background is "dark". Adjust as needed. (0 = black, 1 = white)
  const MAX_PARENT_CHECK_DEPTH = 5; // How many parent elements to check for a background color.
  const DEBUG_MODE = true; // Set to true to enable console logs

  function logDebug(...args) {
    if (DEBUG_MODE) {
      console.log("Strankov badge:", ...args);
    }
  }

  logDebug("Initializing...");

  // --- Prevent Multiple Injections ---
  if (document.getElementById(badgeId)) {
    logDebug("Script: Badge already exists on the page. Exiting.");
    return;
  }

  // --- Helper: Parse CSS Color String to RGBA Object ---
  function parseColor(colorStr) {
    if (
      !colorStr ||
      colorStr.toLowerCase() === "transparent" ||
      colorStr.toLowerCase() === "none"
    ) {
      logDebug(`parseColor: Input '${colorStr}' is transparent or none.`);
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      logDebug("parseColor: Failed to get 2D context from canvas.");
      return null;
    }

    ctx.fillStyle = "rgba(0,0,0,0)"; // Default to fully transparent
    try {
      ctx.fillStyle = colorStr;
    } catch (e) {
      logDebug(`parseColor: Error setting fillStyle with '${colorStr}'.`, e);
      return null;
    }

    const computedColor = ctx.fillStyle; // Read the computed color (often in rgba() or #RRGGBB format)
    logDebug(
      `parseColor: Input '${colorStr}', Canvas computed fillStyle: '${computedColor}'`
    );

    let match;
    // Check for hex format (e.g., #rgb, #rrggbb, #rrggbbaa)
    if (computedColor.startsWith("#")) {
      let hex = computedColor.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        // Expand shorthand hex
        hex = hex
          .split("")
          .map((char) => char + char)
          .join("");
      }
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b, a };
      }
    } else if (
      (match = computedColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i
      ))
    ) {
      // rgb() or rgba()
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
    }
    logDebug(
      `parseColor: Could not parse computed color '${computedColor}' from input '${colorStr}'.`
    );
    return null;
  }

  // --- Helper: Calculate Relative Luminance from RGBA Object ---
  function getLuminance(rgba) {
    if (!rgba) {
      logDebug("getLuminance: Input rgba is null.");
      return null;
    }
    if (rgba.a === 0) {
      logDebug("getLuminance: Color is transparent (alpha is 0).");
      return null;
    }

    const sRGB = [rgba.r, rgba.g, rgba.b].map((val) => {
      const s = val / 255.0;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    const lum = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    logDebug(
      `getLuminance: r=${rgba.r}, g=${rgba.g}, b=${rgba.b}, a=${rgba.a} -> Luminance=${lum}`
    );
    return lum;
  }

  // --- CSS Styles (Includes Dark Mode Adaptation and Forced Themes) ---
  const styles = `
        :root {
             --strankov-badge-font-family-global: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        }
        #${badgeId} {
            --actual-badge-bg: rgba(255, 255, 255, 0.7);
            --actual-badge-border-color: rgba(255, 255, 255, 0.3);
            --actual-badge-shadow: 0 2px 10px rgba(0,0,0,0.1);
            --actual-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.12);
            --actual-badge-text-color: #64748B;
            --actual-badge-icon-stroke: #64748B;
            position: fixed; bottom: 12px; left: 12px; z-index: 9999;
            font-family: var(--strankov-badge-font-family-global);
            visibility: hidden; pointer-events: none;
        }
        #${badgeId} > * { pointer-events: auto; }
        @media (prefers-color-scheme: dark) {
            #${badgeId}:not(.force-light-theme-override):not(.force-dark-theme-override) {
                --actual-badge-bg: rgba(30, 41, 59, 0.75);
                --actual-badge-border-color: rgba(55, 65, 81, 0.6);
                --actual-badge-shadow: 0 2px 10px rgba(0,0,0,0.3);
                --actual-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.4);
                --actual-badge-text-color: #E2E8F0;
                --actual-badge-icon-stroke: #CBD5E1;
            }
        }
        #${badgeId}.force-light-theme-override {
            --actual-badge-bg: rgba(255, 255, 255, 0.7);
            --actual-badge-border-color: rgba(255, 255, 255, 0.3);
            --actual-badge-shadow: 0 2px 10px rgba(0,0,0,0.1);
            --actual-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.12);
            --actual-badge-text-color: #64748B;
            --actual-badge-icon-stroke: #64748B;
        }
        #${badgeId}.force-dark-theme-override {
            --actual-badge-bg: rgba(30, 41, 59, 0.75);
            --actual-badge-border-color: rgba(55, 65, 81, 0.6);
            --actual-badge-shadow: 0 2px 10px rgba(0,0,0,0.3);
            --actual-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.4);
            --actual-badge-text-color: #E2E8F0;
            --actual-badge-icon-stroke: #CBD5E1;
        }
        #${badgeId} .strankov-badge-content {
            background: var(--actual-badge-bg);
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            border-radius: 5px; box-shadow: var(--actual-badge-shadow);
            transition: transform 0.2s, box-shadow 0.2s, background 0.3s ease, border-color 0.3s ease;
            border: 1px solid var(--actual-badge-border-color);
        }
        #${badgeId} .strankov-badge-content:hover {
            transform: translateY(-2px); box-shadow: var(--actual-badge-hover-shadow);
        }
        #${badgeId} .strankov-badge-link {
            display: flex; align-items: center; padding: 5px 8px; text-decoration: none;
        }
        #${badgeId} .strankov-badge-icon {
            width: 12px; height: 12px; stroke: var(--actual-badge-icon-stroke);
            fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
            margin-right: 5px; transition: stroke 0.3s ease;
        }
        #${badgeId} .strankov-badge-text {
            font-size: 11px; font-weight: 500; color: var(--actual-badge-text-color);
            transition: color 0.3s ease;
        }
    `;

  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    logDebug("Styles injected.");
  }

  badgeContainer = document.createElement("div");
  badgeContainer.id = badgeId;
  const badgeContent = document.createElement("div");
  badgeContent.className = "strankov-badge-content";
  const link = document.createElement("a");
  link.href = "https://strankov.cz";
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "strankov-badge-link";
  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  icon.setAttribute("class", "strankov-badge-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute(
    "d",
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
  );
  icon.appendChild(path);
  const text = document.createElement("span");
  text.className = "strankov-badge-text";
  text.textContent = "Vytvořeno ve Stránkově";
  link.appendChild(icon);
  link.appendChild(text);
  badgeContent.appendChild(link);
  badgeContainer.appendChild(badgeContent);

  function updateBadgeTheme() {
    if (
      !badgeContainer ||
      typeof badgeContainer.getBoundingClientRect !== "function"
    ) {
      logDebug(
        "updateBadgeTheme: Badge container not ready or no getBoundingClientRect."
      );
      return;
    }

    const badgeRect = badgeContainer.getBoundingClientRect();
    if (
      badgeRect.width === 0 &&
      badgeRect.height === 0 &&
      badgeContainer.style.visibility === "hidden"
    ) {
      logDebug("updateBadgeTheme: Badge not visible or no dimensions.");
      return;
    }

    const centerX = badgeRect.left + badgeRect.width / 2;
    const centerY = badgeRect.top + badgeRect.height / 2;
    logDebug(
      `updateBadgeTheme: Checking theme. Badge center at X=${centerX.toFixed(
        0
      )}, Y=${centerY.toFixed(0)}`
    );

    let detectedLuminance = null;
    let underlyingElement = document.elementFromPoint(centerX, centerY);
    logDebug(
      "updateBadgeTheme: Initial element under center:",
      underlyingElement
    );

    let currentElementToCheck = underlyingElement;
    let depth = 0;

    while (currentElementToCheck && depth < MAX_PARENT_CHECK_DEPTH) {
      logDebug(
        `updateBadgeTheme: Checking element (depth ${depth}):`,
        currentElementToCheck.tagName,
        currentElementToCheck.id ? "#" + currentElementToCheck.id : "",
        currentElementToCheck.className
          ? "." + currentElementToCheck.className.split(" ").join(".")
          : ""
      );

      const style = window.getComputedStyle(currentElementToCheck);
      const bgColor = style.backgroundColor;
      logDebug(
        `updateBadgeTheme: Computed bgColor for current element: '${bgColor}'`
      );

      const rgbaColor = parseColor(bgColor);

      if (rgbaColor && rgbaColor.a > 0.05) {
        // Consider nearly transparent as transparent
        detectedLuminance = getLuminance(rgbaColor);
        logDebug(
          `updateBadgeTheme: Found significant background color '${bgColor}' (L: ${
            detectedLuminance !== null ? detectedLuminance.toFixed(3) : "N/A"
          }) on`,
          currentElementToCheck
        );
        break;
      } else {
        logDebug(
          `updateBadgeTheme: Background '${bgColor}' is transparent or alpha too low.`
        );
      }

      currentElementToCheck = currentElementToCheck.parentElement;
      depth++;
    }

    badgeContainer.classList.remove(
      "force-light-theme-override",
      "force-dark-theme-override"
    );

    if (detectedLuminance !== null) {
      if (detectedLuminance < LUMINANCE_THRESHOLD) {
        badgeContainer.classList.add("force-dark-theme-override");
        logDebug(
          `updateBadgeTheme: Forcing dark theme (L: ${detectedLuminance.toFixed(
            3
          )} < ${LUMINANCE_THRESHOLD}).`
        );
      } else {
        badgeContainer.classList.add("force-light-theme-override");
        logDebug(
          `updateBadgeTheme: Forcing light theme (L: ${detectedLuminance.toFixed(
            3
          )} >= ${LUMINANCE_THRESHOLD}).`
        );
      }
    } else {
      logDebug(
        "updateBadgeTheme: Using device theme (no significant background detected or luminance indeterminate)."
      );
    }

    if (badgeContainer.style.visibility === "hidden") {
      badgeContainer.style.visibility = "visible";
      logDebug("updateBadgeTheme: Badge made visible.");
    }
  }

  let eventTimeout;
  function throttledUpdate() {
    clearTimeout(eventTimeout);
    eventTimeout = setTimeout(updateBadgeTheme, 200); // Increased throttle slightly
  }
  window.addEventListener("scroll", throttledUpdate, { passive: true });
  window.addEventListener("resize", throttledUpdate, { passive: true });
  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkModeMediaQuery.addEventListener("change", updateBadgeTheme);

  function initializeBadge() {
    if (!document.getElementById(badgeId)) {
      document.body.appendChild(badgeContainer);
      logDebug("Badge appended to body.");
      setTimeout(updateBadgeTheme, 150);
    } else {
      logDebug("InitializeBadge: Badge with ID already exists, not appending.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBadge);
  } else {
    initializeBadge();
  }
})();
