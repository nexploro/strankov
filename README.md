# Stránkov Promotional Badge - Internal Use Only

A dynamic, centrally-managed promotional badge for websites built by Nexploro/Stránkov.

⚠️ **PRIVATE REPOSITORY** - For internal use only. Not for public distribution.

## 🚀 Quick Start (Internal Sites Only)

Add this script before the closing `</body>` tag on approved websites:

```html
<script>
  (function () {
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/gh/nexploro/strankov@main/dist/badge.js";
    s.async = true;
    document.head.appendChild(s);
  })();
</script>
```
