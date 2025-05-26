(function () {
  "use strict";
  if (window.strankovBadgeLoaded) {
    return;
  }
  window.strankovBadgeLoaded = true;
  const CONFIG = {
    targetUrl: "https://strankov.cz",
    badgeId: "strankov-promo-badge",
    position: { bottom: "12px", left: "12px" },
  };
  function getCurrentDomain() {
    try {
      return window.location.hostname;
    } catch (e) {
      return "unknown";
    }
  }
  function generateUTMUrl(){
    const domain=getCurrentDomain();
    
    // If we're on strankov.cz, return URL without UTM parameters
    if(domain === 'strankov.cz' || domain === 'www.strankov.cz'){
        return CONFIG.targetUrl;
    }
    
    const params=new URLSearchParams({
        utm_source:domain,
        utm_medium:'badge',
        utm_campaign:'strankov-promo'
    });
    return `${CONFIG.targetUrl}/?${params.toString()}`;
}
  function createBadgeHTML() {
    const utmUrl = generateUTMUrl();
    return `<div id="${CONFIG.badgeId}" style="position:fixed;bottom:${CONFIG.position.bottom};left:${CONFIG.position.left};z-index:9999;font-family:ui-sans-serif,system-ui,sans-serif;"><div class="strankov-badge-container" style="background:rgba(255, 255, 255, 0.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:5px;box-shadow:0 2px 10px rgba(0,0,0,0.1);transition:transform 0.2s,box-shadow 0.2s;border:1px solid rgba(255, 255, 255, 0.3);"><a href="${utmUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;padding:5px 8px;text-decoration:none;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span style="font-size:11px;font-weight:500;color:#64748B;">Vytvořeno ve Stránkově</span></a></div></div>`;
  }
  function addHoverEffects() {
    const container = document.querySelector(
      `#${CONFIG.badgeId} .strankov-badge-container`
    );
    if (!container) return;
    container.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)";
      this.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
    });
    container.addEventListener("mouseleave", function () {
      this.style.transform = "";
      this.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    });
  }
  function insertBadge() {
    if (document.getElementById(CONFIG.badgeId)) {
      return;
    }
    const badgeHTML = createBadgeHTML();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = badgeHTML;
    const badgeElement = tempDiv.firstElementChild;
    document.body.appendChild(badgeElement);
    addHoverEffects();
  }
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", insertBadge);
    } else {
      insertBadge();
    }
  }
  try {
    init();
  } catch (error) {
    console.warn("Strankov badge failed to load:", error);
  }
  window.removeStrankovBadge = function () {
    const badge = document.getElementById(CONFIG.badgeId);
    if (badge) {
      badge.remove();
      window.strankovBadgeLoaded = false;
    }
  };
})();
