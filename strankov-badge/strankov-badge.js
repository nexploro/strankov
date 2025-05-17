// strankov-badge.js
(function () {
  // --- Configuration ---
  const badgeId = "strankov-promo-badge-instance"; // ID for the main badge container
  const styleId = "strankov-promo-badge-styles"; // ID for the injected style tag

  // --- Prevent Multiple Injections ---
  // If the badge element itself exists, exit to prevent duplicates.
  if (document.getElementById(badgeId)) {
    console.log("Strankov badge already exists on the page.");
    return;
  }

  // --- CSS Styles (Includes Dark Mode Adaptation) ---
  const styles = `
        :root { /* Default Light Mode Variables */
            --strankov-badge-font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
            --strankov-badge-bg: rgba(255, 255, 255, 0.7);
            --strankov-badge-border-color: rgba(255, 255, 255, 0.3);
            --strankov-badge-shadow: 0 2px 10px rgba(0,0,0,0.1);
            --strankov-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.12);
            --strankov-badge-text-color: #64748B; /* Slate 500 */
            --strankov-badge-icon-stroke: #64748B; /* Slate 500 */
        }

        @media (prefers-color-scheme: dark) { /* Dark Mode Variable Overrides */
            :root { /* Apply these to the root for global CSS variable scope */
                --strankov-badge-bg: rgba(30, 41, 59, 0.75);       /* Dark Slate 800, slightly more opaque */
                --strankov-badge-border-color: rgba(55, 65, 81, 0.6); /* Darker Slate border */
                --strankov-badge-shadow: 0 2px 10px rgba(0,0,0,0.3);  /* Stronger shadow for dark bg */
                --strankov-badge-hover-shadow: 0 4px 12px rgba(0,0,0,0.4); /* Adjusted hover shadow for dark */
                --strankov-badge-text-color: #E2E8F0;                /* Slate 200 - light gray */
                --strankov-badge-icon-stroke: #CBD5E1;               /* Slate 300 - light gray */
            }
        }

        /* Badge Container and Element Styling */
        #${badgeId} {
            position: fixed;
            bottom: 12px;
            left: 12px;
            z-index: 9999;
            font-family: var(--strankov-badge-font-family);
        }

        #${badgeId} .strankov-badge-content {
            background: var(--strankov-badge-bg);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px); /* For Safari */
            border-radius: 5px;
            box-shadow: var(--strankov-badge-shadow);
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid var(--strankov-badge-border-color);
        }

        #${badgeId} .strankov-badge-content:hover {
            transform: translateY(-2px);
            box-shadow: var(--strankov-badge-hover-shadow);
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
            stroke: var(--strankov-badge-icon-stroke);
            fill: none; /* Explicitly set fill to none */
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            margin-right: 5px;
        }

        #${badgeId} .strankov-badge-text {
            font-size: 11px;
            font-weight: 500;
            color: var(--strankov-badge-text-color);
        }
    `;

  // Inject CSS into the <head> only if it hasn't been injected already
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.type = "text/css";
    styleSheet.innerText = styles; // or styleSheet.textContent for wider compatibility
    document.head.appendChild(styleSheet);
    console.log("Strankov badge styles injected.");
  }

  // --- Create Badge HTML Elements ---
  const badgeContainer = document.createElement("div");
  badgeContainer.id = badgeId; // Assign the unique ID

  const badgeContent = document.createElement("div");
  badgeContent.className = "strankov-badge-content"; // Use class for styling

  const link = document.createElement("a");
  link.href = "https://strankov.cz"; // Your website URL
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "strankov-badge-link";

  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  icon.setAttribute("class", "strankov-badge-icon"); // Use class for styling
  icon.setAttribute("viewBox", "0 0 24 24"); // viewBox is important for scaling

  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute(
    "d",
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
  );
  icon.appendChild(path);

  const text = document.createElement("span");
  text.className = "strankov-badge-text";
  text.textContent = "Vytvořeno ve Stránkově"; // Your badge text

  // Assemble the badge
  link.appendChild(icon);
  link.appendChild(text);
  badgeContent.appendChild(link);
  badgeContainer.appendChild(badgeContent);

  // --- Append to Page ---
  // Wait for the DOM to be ready before appending to the body
  function appendBadge() {
    if (!document.getElementById(badgeId)) {
      // Check again before appending
      document.body.appendChild(badgeContainer);
      console.log("Strankov badge appended to body.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", appendBadge);
  } else {
    // DOM is already ready
    appendBadge();
  }
})();
