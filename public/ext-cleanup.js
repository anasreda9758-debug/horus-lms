// Strips browser-extension-injected attributes (Bitdefender: bis_skin_checked,
// bis_register, __processed_*) before React hydration so SSR/CSR trees match.
// Loaded via next/script strategy="beforeInteractive" from the root layout.
(function () {
  var PREFIXES = ["bis_", "__processed_"];
  function isExt(name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < PREFIXES.length; i++) {
      if (lower.indexOf(PREFIXES[i]) === 0) return true;
    }
    return false;
  }
  function strip(el) {
    if (!el || !el.removeAttribute) return;
    var attrs = Array.prototype.slice.call(el.attributes);
    for (var i = 0; i < attrs.length; i++) {
      if (isExt(attrs[i].name)) el.removeAttribute(attrs[i].name);
    }
  }
  function sweep(root) {
    strip(root);
    if (!root || !root.querySelectorAll) return;
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) strip(all[i]);
  }
  sweep(document.documentElement);
  if (document.body) sweep(document.body);
  try {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "attributes") {
          strip(m.target);
        } else if (m.type === "childList" && m.addedNodes) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (n.nodeType === 1) sweep(n);
          }
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 15000);
  } catch (e) {}
})();
