// Every panel is visible in the markup and CSS hides the tab list until data-tabs-ready, so the
// panels stay readable without JavaScript or when this fails. The initial tab is selected, hiding
// the other panels, only once every tab has its handlers.
export function initTabs() {
  const tabGroups = document.querySelectorAll("[data-tabs]");
  if (!tabGroups.length) return;

  tabGroups.forEach((group) => {
    const tabs = group.querySelectorAll('[role="tab"]');
    const panels = group.querySelectorAll('[role="tabpanel"]');
    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab, tabs, panels));
      tab.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const dir = event.key === "ArrowRight" ? 1 : -1;
          const currentIndex = Array.from(tabs).indexOf(tab);
          const nextIndex = (currentIndex + dir + tabs.length) % tabs.length;
          tabs[nextIndex].focus();
          activateTab(tabs[nextIndex], tabs, panels);
        }
      });
    });

    const initial = group.querySelector('[role="tab"][aria-selected="true"]') || tabs[0];
    activateTab(initial, tabs, panels);
    group.setAttribute("data-tabs-ready", "");
  });
}

function activateTab(selectedTab, tabs, panels) {
  tabs.forEach((tab) => {
    const isActive = tab === selectedTab;
    tab.setAttribute("aria-selected", String(isActive));
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  panels.forEach((panel) => {
    const isActive = panel.id === selectedTab.getAttribute("aria-controls");
    panel.hidden = !isActive;
  });
}
