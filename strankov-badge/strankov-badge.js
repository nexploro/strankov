// strankov-badge.js
(function () {
  // --- Configuration ---
  const badgeId = "strankov-promo-badge-instance"; // ID for the main badge container
  const styleId = "strankov-promo-badge-styles"; // ID for the injected style tag
  let badgeContainer; // Will hold the badge's main div element
  const LUMINANCE_THRESHOLD = 0.4; // Threshold to determine if a background is "dark". (0 = black, 1 = white)
  const MAX_PARENT_CHECK_DEPTH = 5; // How many parent elements to check for a background color.
  const DEBUG_MODE = false; // Set to true to enable console logs

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

    const computedColor = ctx.fillStyle;
    logDebug(
      `parseColor: Input '${colorStr}', Canvas computed fillStyle: '${computedColor}'`
    );

    let match;
    if (computedColor.startsWith("#")) {
      let hex = computedColor.slice(1);
      if (hex.length === 3 || hex.length === 4) {
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
    if (rgba.a < 0.1) {
      // Consider colors with very low alpha as transparent for luminance purposes
      logDebug("getLuminance: Color is too transparent (alpha is < 0.1).");
      return null;
    }

    // Blend with white if partially transparent, assuming a light underlying page for worst-case scenario (or average grey)
    // This helps avoid a dark badge on a light background if the detected color is a semi-transparent dark overlay.
    // For simplicity, we'll treat the color as opaque if alpha > 0.1 for luminance calculation,
    // but a more complex blending might be needed for extreme cases.
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

  // --- CSS Styles ---
  const styles = `
    :root {
      --strankov-badge-font-family-global: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";

      /* Light Theme Defaults */
      --strankov-badge-bg-light: rgba(255, 255, 255, 0.75);
      --strankov-badge-border-light: rgba(229, 231, 235, 0.7); /* Light grey border */
      --strankov-badge-shadow-light: 0 2px 8px rgba(0,0,0,0.08);
      --strankov-badge-hover-shadow-light: 0 4px 12px rgba(0,0,0,0.1);
      --strankov-badge-text-light: #4B5563; /* Darker grey text */
      --strankov-badge-icon-light: #6B7280; /* Medium grey icon */

      /* Dark Theme Defaults */
      --strankov-badge-bg-dark: rgba(31, 41, 55, 0.75); /* Dark blue-grey */
      --strankov-badge-border-dark: rgba(55, 65, 81, 0.7); /* Slightly lighter dark border */
      --strankov-badge-shadow-dark: 0 2px 8px rgba(0,0,0,0.25);
      --strankov-badge-hover-shadow-dark: 0 4px 12px rgba(0,0,0,0.35);
      --strankov-badge-text-dark: #E5E7EB; /* Light grey text */
      --strankov-badge-icon-dark: #D1D5DB; /* Lighter grey icon */
    }

    #${badgeId} {
      /* Default to light theme variables initially */
      --current-badge-bg: var(--strankov-badge-bg-light);
      --current-badge-border-color: var(--strankov-badge-border-light);
      --current-badge-shadow: var(--strankov-badge-shadow-light);
      --current-badge-hover-shadow: var(--strankov-badge-hover-shadow-light);
      --current-badge-text-color: var(--strankov-badge-text-light);
      --current-badge-icon-stroke: var(--strankov-badge-icon-light);

      position: fixed; bottom: 12px; left: 12px; z-index: 99999; /* Increased z-index */
      font-family: var(--strankov-badge-font-family-global);
      visibility: hidden; pointer-events: none;
      border-radius: 6px; /* Apply border radius to the container for shadow clipping */
    }

    #${badgeId} > * { pointer-events: auto; }

    /* System Dark Mode Preference (no override class) */
    @media (prefers-color-scheme: dark) {
      #${badgeId}:not(.force-light-theme-override):not(.force-dark-theme-override) {
        --current-badge-bg: var(--strankov-badge-bg-dark);
        --current-badge-border-color: var(--strankov-badge-border-dark);
        --current-badge-shadow: var(--strankov-badge-shadow-dark);
        --current-badge-hover-shadow: var(--strankov-badge-hover-shadow-dark);
        --current-badge-text-color: var(--strankov-badge-text-dark);
        --current-badge-icon-stroke: var(--strankov-badge-icon-dark);
      }
    }

    /* Forced Light Theme (via JS based on background) */
    #${badgeId}.force-light-theme-override {
      --current-badge-bg: var(--strankov-badge-bg-light);
      --current-badge-border-color: var(--strankov-badge-border-light);
      --current-badge-shadow: var(--strankov-badge-shadow-light);
      --current-badge-hover-shadow: var(--strankov-badge-hover-shadow-light);
      --current-badge-text-color: var(--strankov-badge-text-light);
      --current-badge-icon-stroke: var(--strankov-badge-icon-light);
    }

    /* Forced Dark Theme (via JS based on background) */
    #${badgeId}.force-dark-theme-override {
      --current-badge-bg: var(--strankov-badge-bg-dark);
      --current-badge-border-color: var(--strankov-badge-border-dark);
      --current-badge-shadow: var(--strankov-badge-shadow-dark);
      --current-badge-hover-shadow: var(--strankov-badge-hover-shadow-dark);
      --current-badge-text-color: var(--strankov-badge-text-dark);
      --current-badge-icon-stroke: var(--strankov-badge-icon-dark);
    }

    #${badgeId} .strankov-badge-content {
      background: var(--current-badge-bg);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); /* Slightly increased blur */
      border-radius: 6px; /* Consistent border radius */
      box-shadow: var(--current-badge-shadow);
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, border-color 0.3s ease;
      border: 1px solid var(--current-badge-border-color);
      overflow: hidden; /* Ensures content respects border radius */
    }

    #${badgeId} .strankov-badge-content:hover {
      transform: translateY(-3px) scale(1.02); /* Slightly more noticeable hover */
      box-shadow: var(--current-badge-hover-shadow);
    }

    #${badgeId} .strankov-badge-link {
      display: flex; align-items: center; padding: 6px 10px; /* Slightly increased padding */
      text-decoration: none;
    }

    #${badgeId} .strankov-badge-icon {
      width: 13px; height: 13px; /* Slightly larger icon */
      stroke: var(--current-badge-icon-stroke);
      fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
      margin-right: 6px; /* Adjusted margin */
      transition: stroke 0.3s ease;
    }

    #${badgeId} .strankov-badge-text {
      font-size: 11.5px; /* Slightly adjusted font size */
      font-weight: 500;
      color: var(--current-badge-text-color);
      transition: color 0.3s ease;
      line-height: 1; /* Ensure consistent line height */
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
  link.rel = "noopener noreferrer"; // Added noreferrer for security
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
    // Only proceed if the badge is actually on screen and has dimensions
    if (badgeRect.width === 0 && badgeRect.height === 0) {
      // If it's also hidden, it's fine, it will be checked when made visible.
      // If it's not hidden but has no dimensions, it might be an issue, but we can't sample.
      if (badgeContainer.style.visibility === "hidden") {
        logDebug("updateBadgeTheme: Badge not yet visible or no dimensions.");
      } else {
        logDebug(
          "updateBadgeTheme: Badge has no dimensions but is not hidden. Cannot sample background."
        );
      }
      return;
    }
    // Check if badge is off-screen (common during initial load or extreme scroll)
    if (
      badgeRect.bottom < 0 ||
      badgeRect.top > window.innerHeight ||
      badgeRect.right < 0 ||
      badgeRect.left > window.innerWidth
    ) {
      logDebug("updateBadgeTheme: Badge is off-screen. Skipping theme update.");
      return;
    }

    const centerX = Math.max(
      0,
      Math.min(window.innerWidth, badgeRect.left + badgeRect.width / 2)
    );
    const centerY = Math.max(
      0,
      Math.min(window.innerHeight, badgeRect.top + badgeRect.height / 2)
    );

    logDebug(
      `updateBadgeTheme: Checking theme. Badge center for sampling at X=${centerX.toFixed(
        0
      )}, Y=${centerY.toFixed(0)}`
    );

    let detectedLuminance = null;
    let underlyingElement = null;
    try {
      // Temporarily hide the badge to accurately get the element underneath
      badgeContainer.style.pointerEvents = "none"; // Allow clicking through
      // A very slight delay might be needed if the pointer-events change isn't immediate enough for elementFromPoint
      // For robust solution, one might hide, then requestAnimationFrame, then elementFromPoint, then show.
      // However, for most cases, direct call works.
      underlyingElement = document.elementFromPoint(centerX, centerY);
      badgeContainer.style.pointerEvents = ""; // Restore
    } catch (e) {
      logDebug("updateBadgeTheme: Error during elementFromPoint.", e);
      if (badgeContainer) badgeContainer.style.pointerEvents = ""; // Ensure pointer events are restored
      return; // Cannot proceed
    }

    logDebug(
      "updateBadgeTheme: Initial element under center:",
      underlyingElement
    );

    let currentElementToCheck = underlyingElement;
    let depth = 0;

    while (currentElementToCheck && depth < MAX_PARENT_CHECK_DEPTH) {
      // Skip the badge itself or its children if accidentally picked
      if (
        currentElementToCheck === badgeContainer ||
        badgeContainer.contains(currentElementToCheck)
      ) {
        currentElementToCheck = currentElementToCheck.parentElement;
        depth++; // Still count it as a level checked
        continue;
      }

      logDebug(
        `updateBadgeTheme: Checking element (depth ${depth}):`,
        currentElementToCheck.tagName,
        currentElementToCheck.id ? "#" + currentElementToCheck.id : "",
        currentElementToCheck.className
          ? "." +
              currentElementToCheck.className.toString().split(" ").join(".") // Ensure className is string
          : ""
      );

      const style = window.getComputedStyle(currentElementToCheck);
      const bgColor = style.backgroundColor;
      logDebug(
        `updateBadgeTheme: Computed bgColor for current element: '${bgColor}'`
      );

      const rgbaColor = parseColor(bgColor);

      if (rgbaColor && rgbaColor.a > 0.1) {
        // Consider alpha > 0.1 as significant
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
        // Background is dark
        badgeContainer.classList.add("force-dark-theme-override"); // We want a light badge on dark bg
        logDebug(
          `updateBadgeTheme: Background is dark (L: ${detectedLuminance.toFixed(
            3
          )}). Forcing LIGHT badge theme.`
        );
      } else {
        // Background is light
        badgeContainer.classList.add("force-light-theme-override"); // We want a dark badge on light bg
        logDebug(
          `updateBadgeTheme: Background is light (L: ${detectedLuminance.toFixed(
            3
          )}). Forcing DARK badge theme.`
        );
      }
    } else {
      logDebug(
        "updateBadgeTheme: Using device theme (no significant background detected or luminance indeterminate)."
      );
      // If no luminance detected, it will default to prefers-color-scheme or the initial light theme variables.
    }

    if (badgeContainer.style.visibility === "hidden") {
      badgeContainer.style.visibility = "visible";
      logDebug("updateBadgeTheme: Badge made visible.");
    }
  }

  let eventTimeout;
  function throttledUpdate() {
    clearTimeout(eventTimeout);
    eventTimeout = setTimeout(updateBadgeTheme, 150); // Slightly reduced throttle
  }

  // Observer for more fine-grained updates if elements change background dynamically
  let mutationObserver;
  function observeDOMChanges() {
    if ("MutationObserver" in window) {
      mutationObserver = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
          if (
            (mutation.type === "attributes" &&
              mutation.attributeName === "style") ||
            mutation.attributeName === "class"
          ) {
            // Check if the mutated element or its parent could affect the badge's background
            let targetNode = mutation.target;
            // A simple check: if the mutation is anywhere near the badge.
            // More sophisticated checks could involve checking if targetNode is an ancestor of elementFromPoint.
            const badgeRect = badgeContainer.getBoundingClientRect();
            const targetRect = targetNode.getBoundingClientRect();
            // A basic proximity/overlap check or simply re-evaluating if any style/class changes on body
            if (
              targetNode === document.body ||
              document.body.contains(targetNode)
            ) {
              logDebug(
                "DOM mutation detected, potentially affecting background. Updating theme."
              );
              throttledUpdate();
              return; // Update once per batch of mutations
            }
          }
        }
      });
      // Observe attributes changes on the body and its subtree.
      // This can be performance-intensive if not handled carefully.
      // Consider observing a more specific container if possible.
      mutationObserver.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["style", "class"],
      });
      logDebug("MutationObserver started for body style/class changes.");
    }
  }

  window.addEventListener("scroll", throttledUpdate, { passive: true });
  window.addEventListener("resize", throttledUpdate, { passive: true });
  // Use mousemove for more responsive hover detection over different sections, but be mindful of performance.
  // Throttling mousemove is crucial.
  let mouseMoveTimeout;
  window.addEventListener(
    "mousemove",
    () => {
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(updateBadgeTheme, 300); // Higher throttle for mousemove
    },
    { passive: true }
  );

  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  if (darkModeMediaQuery.addEventListener) {
    darkModeMediaQuery.addEventListener("change", updateBadgeTheme);
  } else if (darkModeMediaQuery.addListener) {
    // For older browsers
    darkModeMediaQuery.addListener(updateBadgeTheme);
  }

  function initializeBadge() {
    if (!document.getElementById(badgeId)) {
      document.body.appendChild(badgeContainer);
      logDebug("Badge appended to body.");
      // Initial theme update. A slight delay can help ensure the page layout is stable.
      setTimeout(() => {
        updateBadgeTheme();
        // Start observing DOM changes after the badge is initialized and first theme is set
        if (!DEBUG_MODE) {
          // Optionally disable mutation observer for debugging to reduce console noise
          observeDOMChanges();
        }
      }, 250);
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
