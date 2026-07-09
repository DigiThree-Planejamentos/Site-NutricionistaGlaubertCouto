(function () {
  function hasMetaPixel() {
    return typeof window.fbq === "function";
  }

  window.trackPaidTrafficEvent = function (eventName, params) {
    if (!hasMetaPixel()) return;
    window.fbq("track", eventName, params || {});
  };

  window.trackPaidTrafficCustomEvent = function (eventName, params) {
    if (!hasMetaPixel()) return;
    window.fbq("trackCustom", eventName, params || {});
  };
})();
