// Accessible name of a thumbnail button marked with data-lightbox-trigger. Uses the first
// description that contains text, so a placeholder alt such as "..." falls back to the caption.
export function getLightboxTriggerLabel(...descriptions) {
  const description = descriptions.map((text) => (text || "").trim()).find((text) => /[\p{L}\p{N}]/u.test(text));
  return description ? `Otwórz zdjęcie: ${description}` : "Otwórz zdjęcie";
}

export function initLightbox() {
  const overlay = document.querySelector("[data-lightbox]");
  if (!overlay) return;

  const preview = overlay.querySelector("[data-lightbox-image]");
  const caption = overlay.querySelector("[data-lightbox-caption]");
  const closeBtn = overlay.querySelector("[data-lightbox-close]");
  const prevBtn = overlay.querySelector("[data-lightbox-prev]");
  const nextBtn = overlay.querySelector("[data-lightbox-next]");

  if (!preview || !caption || !closeBtn || !prevBtn || !nextBtn) return;

  let images = [];
  let current = null;
  let lastFocus = null;
  let previousBodyOverflow = "";

  const focusable = [closeBtn, prevBtn, nextBtn];

  // Only the images currently shown: the gallery filter hides excluded figures with .is-hidden.
  function collectImages() {
    images = Array.from(document.querySelectorAll("[data-gallery] img[data-lightbox-src]")).filter((img) => !img.closest(".is-hidden"));
  }

  function lockScroll() {
    previousBodyOverflow = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    document.body.style.overflow = previousBodyOverflow;
  }

  function open(img, trigger) {
    collectImages();
    if (!images.includes(img)) return;

    current = img;
    lastFocus = trigger;
    overlay.hidden = false;
    updateContent(img);
    closeBtn.focus();
    lockScroll();
  }

  function close() {
    overlay.hidden = true;
    unlockScroll();

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    if (lastFocus instanceof HTMLElement && lastFocus.isConnected) {
      lastFocus.focus();
    }
  }

  // Steps from the displayed image through the images visible now, so a filter change
  // while the lightbox is open cannot leave it on a stale index.
  function navigate(step) {
    collectImages();
    const position = images.indexOf(current);
    if (position === -1) {
      close();
      return;
    }

    current = images[(position + step + images.length) % images.length];
    updateContent(current);
  }

  function updateContent(img) {
    preview.src = img.dataset.lightboxSrc || img.src;
    preview.alt = img.alt;
    caption.textContent = img.dataset.caption || "";
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Thumbnails are native buttons, so Enter and Space arrive here as a click as well.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("button[data-lightbox-trigger]");
    if (!trigger) return;

    const img = trigger.querySelector("img[data-lightbox-src]");
    if (!img) return;
    if (!img.closest("[data-gallery]")) return;

    open(img, trigger);
  });

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", () => navigate(-1));
  nextBtn.addEventListener("click", () => navigate(1));

  overlay.addEventListener("keydown", trapFocus);

  document.addEventListener("keydown", (event) => {
    if (overlay.hidden) return;

    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowLeft") {
      navigate(-1);
    } else if (event.key === "ArrowRight") {
      navigate(1);
    }
  });

  function toggleFullscreen() {
    if (!overlay.requestFullscreen && !overlay.webkitRequestFullscreen) return;

    const isFs = document.fullscreenElement || document.webkitFullscreenElement;

    if (!isFs) {
      if (overlay.requestFullscreen) {
        overlay.requestFullscreen().catch(() => {});
      } else if (overlay.webkitRequestFullscreen) {
        overlay.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  preview.addEventListener("dblclick", () => {
    toggleFullscreen();
  });

  let touchStartX = 0;
  let lastTapTime = 0;

  preview.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  });

  preview.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    const threshold = 50;

    const now = Date.now();

    if (Math.abs(diff) > threshold) {
      if (diff < 0) {
        navigate(1);
      } else {
        navigate(-1);
      }
      return;
    }

    if (now - lastTapTime < 300) {
      e.preventDefault();
      toggleFullscreen();
    }
    lastTapTime = now;
  });
}
