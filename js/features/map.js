export function initMap() {
  document.querySelectorAll("[data-map]").forEach(map => {
    const button = map.querySelector("[data-map-load]");
    const fallback = map.querySelector("[data-map-fallback]");
    if (!button || !fallback || !map.dataset.mapSrc || !map.dataset.mapTitle || map.hasAttribute("data-map-ready")) return;

    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.title = map.dataset.mapTitle;
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      iframe.src = map.dataset.mapSrc;
      map.append(iframe);
      // Retain the placeholder's dimensions while the frame takes its place.
      map.setAttribute("data-map-loaded", "");
      iframe.focus();
    }, { once: true });

    map.setAttribute("data-map-ready", "");
    fallback.hidden = true;
    button.hidden = false;
  });
}
