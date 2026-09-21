const STORAGE_KEY = "aurora-project-notice-accepted";

export function initProjectNotice() {
  const notice = document.querySelector("[data-project-notice]");
  if (!notice) return;

  const acceptButton = notice.querySelector("[data-project-notice-accept]");
  if (!acceptButton) return;

  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "true") {
      notice.hidden = true;
      return;
    }
  } catch {

  }

  acceptButton.hidden = false;

  acceptButton.addEventListener("click", (event) => {
    event.preventDefault();

    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {

    }

    notice.hidden = true;
  });
}
