export function initTabs() {
  const tabGroups = document.querySelectorAll("[data-tabs]");
  if (!tabGroups.length) return;

  tabGroups.forEach((group) => {
    const tabs = group.querySelectorAll('[role="tab"]');
    const panels = group.querySelectorAll('[role="tabpanel"]');
    if (!tabs.length || !panels.length) return;

    const initial = group.querySelector('[role="tab"][aria-selected="true"]') || tabs[0];
    if (initial) {
      activateTab(initial, tabs, panels);
    }

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
