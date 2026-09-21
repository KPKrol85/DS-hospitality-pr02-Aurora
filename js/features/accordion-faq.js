export function initAccordionFaq() {
  const accordions = document.querySelectorAll('[data-accordion]');
  if (!accordions.length) return;

  accordions.forEach(accordion => {
    accordion.addEventListener('click', event => {
      if (!(event.target instanceof HTMLButtonElement)) return;
      const button = event.target;
      const panelId = button.getAttribute('aria-controls');
      if (!panelId) return;
      const panel = document.getElementById(panelId);
      if (!panel) return;

      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      panel.hidden = isOpen;
    });
  });
}
