// strankov-badge.js
(function () {
  // --- Configuration ---
  const badgeId = "strankov-promo-badge-instance"; // ID for the main badge container
  const styleId = "strankov-promo-badge-styles"; // ID for the injected style tag
  let badgeContainer; // Will hold the badge's main div element
  const LUMINANCE_THRESHOLD = 0.4; // Threshold to determine if a background is "dark". Adjust as needed. (0 = black, 1 = white)
  const MAX_PARENT_CHECK_DEPTH = 5; // How many parent elements to check for a background color.

  // --- Prevent Multiple Injections ---
  if (document.getElementById(badgeId)) {
    // console.log('Strankov badge script: Badge already exists on the page.');
    return;
  }

  // --- Helper: Parse CSS Color String to RGBA Object ---
  function parseColor(colorStr) {
    if (!colorStr || colorStr.toLowerCase() === "transparent") return null;

    // Use a temporary canvas to normalize the color string
    // This is a robust way to handle various formats (hex, rgb, hsl, named colors)
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null; // Should not happen in a browser environment

    ctx.fillStyle = "rgba(0,0,0,0)"; // Default to transparent
    ctx.fillStyle = colorStr; // Assign the color string
    const computedColor = ctx.fillStyle; // Read the computed color (often in rgba() or #RRGGBB format)

    // Now parse the computed color (which is more consistent)
    let match;
    if (computedColor.startsWith("#")) {
      // Hex format
      const r = parseInt(computedColor.slice(1, 3), 16);
      const g = parseInt(computedColor.slice(3, 5), 16);
      const b = parseInt(computedColor.slice(5, 7), 16);
      return { r, g, b, a: 1 };
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
    // console.warn('Strankov badge: Could not parse color:', colorStr, 'Computed as:', computedColor);
    return null; // Unknown or unparsable format
  }

  // --- Helper: Calculate Relative Luminance from RGBA Object ---
  // Formula from WCAG guidelines: https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-procedure
  function getLuminance(rgba) {
    if (!rgba || rgba.a === 0) {
      // If transparent or unparsable
      return null; // Indeterminate, or could default to a value (e.g., 1 for light)
    }

    const sRGB = [rgba.r, rgba.g, rgba.b].map((val) => {
      const s = val / 255.0;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  // --- CSS Styles (Includes Dark Mode Adaptation and Forced Themes) ---
  const styles = `
        /* Global font family variable */
        :root {
             --strankov-badge-font-family-global: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        }

        #${badgeId} {
            /* CSS Variables for badge appearance - Light mode defaults */
            --actual-badge-bg: rgba(255, 255, 255, 0.7);
            --actual-badge-border-color: rgba(255, 255, 255, 0.3);
            --actual-badge-shadow: 0 2px 10px rgba(0,0,0,0.1);
            --actual-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.12);
            --actual-badge-text-color: #64748B; /* Slate 500 */
            --actual-badge-icon-stroke: #64748B; /* Slate 500 */

            position: fixed;
            bottom: 12px;
            left: 12px;
            z-index: 9999;
            font-family: var(--strankov-badge-font-family-global);
            visibility: hidden; /* Initially hidden */
            pointer-events: none; /* Badge itself should not intercept pointer events for elementFromPoint */
        }
        #${badgeId} > * {
            pointer-events: auto; /* Children of the badge (link) should be interactive */
        }

        /* System Dark Mode Preference (Applied if no forced theme is active) */
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

        /* Forced Light Theme (Applied by JS when light background is detected) */
        #${badgeId}.force-light-theme-override {
            --actual-badge-bg: rgba(255, 255, 255, 0.7);
            --actual-badge-border-color: rgba(255, 255, 255, 0.3);
            --actual-badge-shadow: 0 2px 10px rgba(0,0,0,0.1);
            --actual-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.12);
            --actual-badge-text-color: #64748B;
            --actual-badge-icon-stroke: #64748B;
        }

        /* Forced Dark Theme (Applied by JS when dark background is detected) */
        #${badgeId}.force-dark-theme-override {
            --actual-badge-bg: rgba(30, 41, 59, 0.75);
            --actual-badge-border-color: rgba(55, 65, 81, 0.6);
            --actual-badge-shadow: 0 2px 10px rgba(0,0,0,0.3);
            --actual-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.4);
            --actual-badge-text-color: #E2E8F0;
            --actual-badge-icon-stroke: #CBD5E1;
        }

        /* Badge Content Styling */
        #${badgeId} .strankov-badge-content {
            background: var(--actual-badge-bg);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 5px;
            box-shadow: var(--actual-badge-shadow);
            transition: transform 0.2s, box-shadow 0.2s, background 0.3s ease, border-color 0.3s ease;
            border: 1px solid var(--actual-badge-border-color);
        }
        #${badgeId} .strankov-badge-content:hover {
            transform: translateY(-2px);
            box-shadow: var(--actual-badge-hover-shadow);
        }
        #${badgeId} .strankov-badge-link {
            display: flex;
            align-items: center;
            padding: 5px 8px;
            text-decoration: none;
        }
        #${badgeId} .strankov-badge-icon {
            width: 12px;
            height: 12px;
            stroke: var(--actual-badge-icon-stroke);
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            margin-right: 5px;
            transition: stroke 0.3s ease;
        }
        #${badgeId} .strankov-badge-text {
            font-size: 11px;
            font-weight: 500;
            color: var(--actual-badge-text-color);
            transition: color 0.3s ease;
        }
    `;

  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
  }

  badgeContainer = document.createElement("div");
  badgeContainer.id = badgeId;
  // ... (rest of badge HTML element creation remains the same as previous version) ...
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

  // --- Theme Detection & Application Logic ---
  function updateBadgeTheme() {
    if (
      !badgeContainer ||
      typeof badgeContainer.getBoundingClientRect !== "function"
    )
      return;

    const badgeRect = badgeContainer.getBoundingClientRect();
    if (
      badgeRect.width === 0 &&
      badgeRect.height === 0 &&
      badgeContainer.style.visibility === "hidden"
    )
      return;

    const centerX = badgeRect.left + badgeRect.width / 2;
    const centerY = badgeRect.top + badgeRect.height / 2;

    let detectedLuminance = null;
    let currentElement = document.elementFromPoint(centerX, centerY);
    let depth = 0;

    while (currentElement && depth < MAX_PARENT_CHECK_DEPTH) {
      if (
        currentElement === badgeContainer ||
        badgeContainer.contains(currentElement)
      ) {
        // We've hit the badge itself or one of its children, try the element below if possible
        // This requires temporarily hiding the badge to get the true underlying element
        const originalPointerEvents = badgeContainer.style.pointerEvents;
        badgeContainer.style.pointerEvents = "none"; // Make badge non-interactive for this check
        currentElement = document.elementFromPoint(centerX, centerY);
        badgeContainer.style.pointerEvents = originalPointerEvents; // Restore
        if (
          currentElement === badgeContainer ||
          badgeContainer.contains(currentElement)
        ) {
          // Still hitting the badge, cannot determine underlying element this way easily
          // This can happen if the badge is the topmost element at its center
          // Or if there's an issue with pointer-events none not taking effect fast enough
          break;
        }
        if (!currentElement) break; // No element found under
      }

      const style = window.getComputedStyle(currentElement);
      const bgColor = style.backgroundColor;
      const rgbaColor = parseColor(bgColor);

      if (rgbaColor && rgbaColor.a > 0) {
        // Found a non-transparent background
        detectedLuminance = getLuminance(rgbaColor);
        // console.log(`Strankov badge: Detected bg color ${bgColor} (L: ${detectedLuminance}) on`, currentElement);
        break; // Use the first significant background found
      }
      currentElement = currentElement.parentElement;
      depth++;
    }

    badgeContainer.classList.remove(
      "force-light-theme-override",
      "force-dark-theme-override"
    );

    if (detectedLuminance !== null) {
      if (detectedLuminance < LUMINANCE_THRESHOLD) {
        badgeContainer.classList.add("force-dark-theme-override"); // Background is dark, so badge needs dark theme (light text)
        // console.log('Strankov badge: Forcing dark theme due to detected background.');
      } else {
        badgeContainer.classList.add("force-light-theme-override"); // Background is light, badge needs light theme (dark text)
        // console.log('Strankov badge: Forcing light theme due to detected background.');
      }
    } else {
      // No specific background detected, rely on prefers-color-scheme (handled by CSS media query)
      // console.log('Strankov badge: Using device theme (no specific background detected).');
    }

    if (badgeContainer.style.visibility === "hidden") {
      badgeContainer.style.visibility = "visible";
    }
  }

  // Throttled listeners
  let eventTimeout;
  function throttledUpdate() {
    clearTimeout(eventTimeout);
    eventTimeout = setTimeout(updateBadgeTheme, 150); // Throttle to 150ms
  }
  window.addEventListener("scroll", throttledUpdate, { passive: true });
  window.addEventListener("resize", throttledUpdate, { passive: true });
  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkModeMediaQuery.addEventListener("change", updateBadgeTheme); // Update immediately on system theme change

  // --- Append to Page & Initial Theme Update ---
  function initializeBadge() {
    if (!document.getElementById(badgeId)) {
      document.body.appendChild(badgeContainer);
      setTimeout(updateBadgeTheme, 100); // Initial check after a brief moment for layout
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBadge);
  } else {
    initializeBadge();
  }
})();
