// The markup ships every answer open (aria-expanded="true"), so the answers stay readable without
// JavaScript or when this fails. They collapse only once the click handler is attached, and
// data-accordion-ready then gives the questions their expand indicator and hover state in CSS.
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

    accordion.querySelectorAll('button[aria-controls]').forEach(button => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;

      button.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    });

    accordion.setAttribute('data-accordion-ready', '');
  });
}
