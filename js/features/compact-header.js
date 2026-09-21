export function initCompactHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 32) {
      header.classList.add('is-compact');
    } else {
      header.classList.remove('is-compact');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
