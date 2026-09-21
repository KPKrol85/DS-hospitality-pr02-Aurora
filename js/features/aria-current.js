export function initAriaCurrent() {
  const links = document.querySelectorAll('a[href]');
  if (!links.length) return;
  const current = getCurrentPath();

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.endsWith(current)) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('is-active');
    }
  });
}

function getCurrentPath() {
  const path = window.location.pathname.split('/').pop();
  return path || 'index.html';
}
