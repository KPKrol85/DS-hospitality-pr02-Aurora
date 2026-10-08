import { beforeEach, describe, expect, it, vi } from "vitest";
import { initForm } from "../js/features/form.js";
import { mountFromPage, readJson, setUrl } from "./helpers.js";

// form.js takes today's date from toISOString(), which is in UTC, so a fixed instant gives
// the same "today" whenever and in whatever time zone the suite runs.
const NOW = new Date("2026-06-15T12:00:00Z");
const TODAY = "2026-06-15";

const REQUIRED = "To pole jest wymagane.";
const EMAIL_ERROR = "Podaj poprawny adres e-mail w formacie nazwa@domena.";
const PHONE_ERROR = "Podaj numer telefonu: cyfry, opcjonalnie znak + na początku, spacje i myślniki (min. 7 znaków, nie licząc spacji i myślników).";
const PEOPLE_ERROR = "Liczba osób musi mieścić się w zakresie od 1 do 12.";
const START_ERROR = "Podaj datę nie wcześniejszą niż dzisiaj.";
const END_ERROR = "Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.";

const VALID_VALUES = {
  name: "Anna Kowalska",
  email: "anna.kowalska@example.com",
  phone: "+48 600 900 700",
  tour: "islandia",
  "date-start": "2026-07-01",
  "date-end": "2026-07-08",
  people: "2",
  message: "Prosimy o ofertę dla dwóch osób.",
  rodo: true,
};

const tourIds = readJson("assets/data/tours.json").map((tour) => tour.id);

function form() {
  return document.querySelector("[data-form]");
}

function control(id) {
  return document.getElementById(id);
}

function errorFor(id) {
  return document.getElementById(control(id).getAttribute("aria-describedby")).textContent;
}

function fill(values) {
  Object.entries(values).forEach(([id, value]) => {
    const element = control(id);
    if (element.type === "checkbox") {
      element.checked = value;
    } else {
      element.value = value;
    }
  });
}

// Moves focus away from a field, which runs its validation.
function blurWith(id, value) {
  fill({ [id]: value });
  control(id).focus();
  control(id).blur();
}

// Changes a field the way typing or picking a value does, without moving focus away from it.
function editWith(id, value, eventType = "input") {
  fill({ [id]: value });
  control(id).dispatchEvent(new Event(eventType, { bubbles: true }));
}

// Clicks the submit button and reports the form handler's decision. The document-level
// listener runs after that handler, then cancels the navigation, which jsdom does not implement.
function submit() {
  let outcome = "not dispatched";
  const record = (event) => {
    outcome = event.defaultPrevented ? "prevented" : "submitted";
    event.preventDefault();
  };

  document.addEventListener("submit", record);
  try {
    form().querySelector('button[type="submit"]').click();
  } finally {
    document.removeEventListener("submit", record);
  }
  return outcome;
}

function invalidFields() {
  return Array.from(form().querySelectorAll('[aria-invalid="true"]')).map((element) => element.id);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  mountFromPage("contact.html", "[data-form]");
});

describe("tour prefill", () => {
  it.each(tourIds)("selects %s from ?tour=", (id) => {
    setUrl(`/contact.html?tour=${id}`);

    initForm();

    expect(control("tour").value).toBe(id);
  });

  it("keeps the placeholder option without a tour parameter", () => {
    initForm();

    expect(control("tour").value).toBe("");
  });

  it.each(["/contact.html", "/contact.html?tour=atlantyda", "/contact.html?tour=", "/contact.html?tour=Maroko"])("leaves the current selection unchanged for %s", (pathAndQuery) => {
    setUrl(pathAndQuery);
    control("tour").value = "custom";

    initForm();

    expect(control("tour").value).toBe("custom");
  });
});

describe("date constraints", () => {
  beforeEach(() => {
    initForm();
  });

  it("sets today as the minimum start and end date", () => {
    expect(control("date-start").min).toBe(TODAY);
    expect(control("date-end").min).toBe(TODAY);
  });

  it("moves the end-date minimum with the selected start date", () => {
    const start = control("date-start");

    start.value = "2026-07-01";
    start.dispatchEvent(new Event("change", { bubbles: true }));
    expect(control("date-end").min).toBe("2026-07-01");

    start.value = "";
    start.dispatchEvent(new Event("change", { bubbles: true }));
    expect(control("date-end").min).toBe(TODAY);
  });

  it("rejects a start date before today and accepts today", () => {
    blurWith("date-start", "2026-06-14");
    expect(errorFor("date-start")).toBe(START_ERROR);
    expect(control("date-start").getAttribute("aria-invalid")).toBe("true");

    blurWith("date-start", TODAY);
    expect(errorFor("date-start")).toBe("");
    expect(control("date-start").hasAttribute("aria-invalid")).toBe(false);
  });

  it("rejects an end date before the start date and accepts the same day", () => {
    fill({ "date-start": "2026-07-10" });

    blurWith("date-end", "2026-07-09");
    expect(errorFor("date-end")).toBe(END_ERROR);
    expect(control("date-end").getAttribute("aria-invalid")).toBe("true");

    blurWith("date-end", "2026-07-10");
    expect(errorFor("date-end")).toBe("");
    expect(control("date-end").hasAttribute("aria-invalid")).toBe(false);
  });

  it("rejects an end date before today while no start date is chosen", () => {
    expect(control("date-start").value).toBe("");

    blurWith("date-end", "2026-06-14");

    expect(control("date-end").min).toBe(TODAY);
    expect(errorFor("date-end")).toBe(START_ERROR);
    expect(control("date-end").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("field validation on blur", () => {
  beforeEach(() => {
    initForm();
  });

  it("flags an empty required field and clears the error once it is filled", () => {
    blurWith("name", "");
    expect(errorFor("name")).toBe(REQUIRED);
    expect(control("name").getAttribute("aria-invalid")).toBe("true");

    blurWith("name", "Anna Kowalska");
    expect(errorFor("name")).toBe("");
    expect(control("name").hasAttribute("aria-invalid")).toBe(false);
  });

  it("flags the unchecked consent checkbox", () => {
    blurWith("rodo", false);

    expect(errorFor("rodo")).toBe(REQUIRED);
    expect(control("rodo").getAttribute("aria-invalid")).toBe("true");
  });

  it("reports the minimum name length when the browser flags the value as too short", () => {
    // Browsers report tooShort only after a user edit, which jsdom cannot emulate, so the
    // validity state is supplied here.
    const name = control("name");
    Object.defineProperty(name, "validity", {
      value: { valueMissing: false, typeMismatch: false, tooShort: true, patternMismatch: false },
    });

    blurWith("name", "An");

    expect(errorFor("name")).toBe("Wprowadź co najmniej 3 znaki.");
    expect(name.getAttribute("aria-invalid")).toBe("true");
  });

  it.each(["anna.kowalska@example.com", "a.b-c+d@poczta.example.pl"])("accepts the email address %s", (email) => {
    blurWith("email", email);

    expect(errorFor("email")).toBe("");
    expect(control("email").hasAttribute("aria-invalid")).toBe(false);
  });

  it.each(["anna.kowalska", "anna@", "@example.com", "anna kowalska@example.com"])("rejects the email address %j", (email) => {
    blurWith("email", email);

    expect(errorFor("email")).toBe(EMAIL_ERROR);
    expect(control("email").getAttribute("aria-invalid")).toBe("true");
  });

  it("requires an email address", () => {
    blurWith("email", "");

    expect(errorFor("email")).toBe(REQUIRED);
  });

  it.each(["+48 600 900 700", "600 900 700", "600-900-700", "+48-600-900-700", "600900700", "1234567", ""])("accepts the phone number %j", (phone) => {
    blurWith("phone", phone);

    expect(errorFor("phone")).toBe("");
    expect(control("phone").hasAttribute("aria-invalid")).toBe(false);
  });

  it.each(["123456", "600 90", "600 900 70a", "48+600900700", "(600) 900 700", "+48 600 900 700 wew. 12"])("rejects the phone number %j", (phone) => {
    blurWith("phone", phone);

    expect(errorFor("phone")).toBe(PHONE_ERROR);
    expect(control("phone").getAttribute("aria-invalid")).toBe("true");
  });

  it.each(["1", "2", "12"])("accepts %s participants", (people) => {
    blurWith("people", people);

    expect(errorFor("people")).toBe("");
    expect(control("people").hasAttribute("aria-invalid")).toBe(false);
  });

  it.each(["0", "13", "-1"])("rejects %s participants", (people) => {
    blurWith("people", people);

    expect(errorFor("people")).toBe(PEOPLE_ERROR);
    expect(control("people").getAttribute("aria-invalid")).toBe("true");
  });

  it("takes the participant range and its message from the field's min and max", () => {
    // contact.html owns the limits, so changing max must change both the accepted range and
    // the stated range without an edit to form.js.
    const people = control("people");
    expect(people.max).toBe("12");
    people.max = "15";

    blurWith("people", "13");
    expect(errorFor("people")).toBe("");
    expect(people.hasAttribute("aria-invalid")).toBe(false);

    blurWith("people", "16");
    expect(errorFor("people")).toBe("Liczba osób musi mieścić się w zakresie od 1 do 15.");
    expect(people.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("submission", () => {
  beforeEach(() => {
    initForm();
  });

  it("turns off native validation so the form's own messages are shown", () => {
    expect(form().hasAttribute("novalidate")).toBe(true);
  });

  it("blocks an empty form, flags every required field and focuses the first", () => {
    expect(submit()).toBe("prevented");

    const required = ["name", "email", "tour", "date-start", "date-end", "people", "message", "rodo"];
    expect(invalidFields()).toEqual(required);
    required.forEach((id) => expect(errorFor(id)).toBe(REQUIRED));
    expect(errorFor("phone")).toBe("");
    expect(document.activeElement).toBe(control("name"));
  });

  it("focuses the first invalid field in document order", () => {
    fill({ ...VALID_VALUES, email: "anna@", people: "13" });

    expect(submit()).toBe("prevented");

    expect(invalidFields()).toEqual(["email", "people"]);
    expect(errorFor("email")).toBe(EMAIL_ERROR);
    expect(errorFor("people")).toBe(PEOPLE_ERROR);
    expect(document.activeElement).toBe(control("email"));
  });

  it("clears earlier errors and lets a valid form submit natively", () => {
    blurWith("name", "");
    blurWith("email", "anna@");
    expect(invalidFields()).toEqual(["name", "email"]);

    fill(VALID_VALUES);

    expect(submit()).toBe("submitted");
    expect(invalidFields()).toEqual([]);
    Object.keys(VALID_VALUES).forEach((id) => expect(errorFor(id)).toBe(""));
    expect(form().getAttribute("method")).toBe("POST");
    expect(form().getAttribute("action")).toBe("dziekuje.html");
  });

  it("submits without the optional phone number", () => {
    fill({ ...VALID_VALUES, phone: "" });

    expect(submit()).toBe("submitted");
  });
});

describe("error recovery while editing", () => {
  beforeEach(() => {
    initForm();
  });

  it("clears the email error as soon as the address is corrected, without leaving the field", () => {
    blurWith("email", "jan@");
    expect(errorFor("email")).toBe(EMAIL_ERROR);

    control("email").focus();
    editWith("email", "jan@example.pl");

    expect(errorFor("email")).toBe("");
    expect(control("email").hasAttribute("aria-invalid")).toBe(false);
    expect(document.activeElement).toBe(control("email"));
  });

  it.each([
    { id: "name", invalid: "", message: REQUIRED, valid: "Anna Kowalska", event: "input" },
    { id: "phone", invalid: "600 90", message: PHONE_ERROR, valid: "600 900 700", event: "input" },
    { id: "people", invalid: "13", message: PEOPLE_ERROR, valid: "12", event: "input" },
    { id: "message", invalid: "", message: REQUIRED, valid: "Prosimy o ofertę.", event: "input" },
    { id: "tour", invalid: "", message: REQUIRED, valid: "islandia", event: "change" },
    { id: "date-start", invalid: "2026-06-14", message: START_ERROR, valid: TODAY, event: "change" },
    { id: "date-end", invalid: "2026-06-14", message: START_ERROR, valid: TODAY, event: "change" },
  ])("clears the $id error once a corrected value arrives through $event", ({ id, invalid, message, valid, event }) => {
    blurWith(id, invalid);
    expect(errorFor(id)).toBe(message);
    expect(control(id).getAttribute("aria-invalid")).toBe("true");

    control(id).focus();
    editWith(id, valid, event);

    expect(errorFor(id)).toBe("");
    expect(control(id).hasAttribute("aria-invalid")).toBe(false);
    expect(document.activeElement).toBe(control(id));
  });

  it("clears the consent error once the checkbox is checked", () => {
    blurWith("rodo", false);
    expect(errorFor("rodo")).toBe(REQUIRED);

    control("rodo").focus();
    control("rodo").click();

    expect(control("rodo").checked).toBe(true);
    expect(errorFor("rodo")).toBe("");
    expect(control("rodo").hasAttribute("aria-invalid")).toBe(false);
    expect(document.activeElement).toBe(control("rodo"));
  });

  it("keeps the error of a field whose edited value is still invalid", () => {
    blurWith("phone", "600 90");
    control("phone").focus();

    editWith("phone", "600 900");

    expect(errorFor("phone")).toBe(PHONE_ERROR);
    expect(control("phone").getAttribute("aria-invalid")).toBe("true");
  });

  it("shows the message for the constraint the edited value now fails", () => {
    blurWith("email", "");
    expect(errorFor("email")).toBe(REQUIRED);
    control("email").focus();

    editWith("email", "anna");

    expect(errorFor("email")).toBe(EMAIL_ERROR);
    expect(control("email").getAttribute("aria-invalid")).toBe("true");
  });

  it("does not rewrite an unchanged message while the field stays invalid", () => {
    blurWith("phone", "600 90");
    const observer = new MutationObserver(() => {});
    observer.observe(document.getElementById("error-phone"), { childList: true, characterData: true, subtree: true });

    editWith("phone", "600 900");
    editWith("phone", "600 9");

    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it("does not flag fields without an error while they are edited", () => {
    const invalidValues = {
      name: "",
      email: "anna@",
      phone: "600 90",
      tour: "",
      "date-start": "2026-06-14",
      "date-end": "2026-06-01",
      people: "13",
      message: "",
      rodo: false,
    };

    Object.entries(invalidValues).forEach(([id, value]) => {
      editWith(id, value, "input");
      editWith(id, value, "change");
    });

    expect(invalidFields()).toEqual([]);
    Object.keys(invalidValues).forEach((id) => expect(errorFor(id)).toBe(""));
  });

  it("flags a corrected field again only on blur once its value becomes invalid again", () => {
    blurWith("email", "anna@");
    control("email").focus();
    editWith("email", "anna@example.com");
    expect(errorFor("email")).toBe("");

    editWith("email", "anna@");
    expect(errorFor("email")).toBe("");
    expect(control("email").hasAttribute("aria-invalid")).toBe(false);

    control("email").blur();
    expect(errorFor("email")).toBe(EMAIL_ERROR);
    expect(control("email").getAttribute("aria-invalid")).toBe("true");
  });

  it("clears the focused field after a failed submission and still focuses the next invalid field", () => {
    expect(submit()).toBe("prevented");
    expect(document.activeElement).toBe(control("name"));

    editWith("name", "Anna Kowalska");

    expect(errorFor("name")).toBe("");
    expect(invalidFields()).toEqual(["email", "tour", "date-start", "date-end", "people", "message", "rodo"]);
    expect(document.activeElement).toBe(control("name"));

    expect(submit()).toBe("prevented");
    expect(errorFor("email")).toBe(REQUIRED);
    expect(document.activeElement).toBe(control("email"));
  });

  it("clears a flagged end date once the start date is moved before it", () => {
    fill({ "date-start": "2026-07-10" });
    blurWith("date-end", "2026-07-09");
    expect(errorFor("date-end")).toBe(END_ERROR);

    control("date-start").focus();
    editWith("date-start", "2026-07-05", "change");

    expect(control("date-end").min).toBe("2026-07-05");
    expect(errorFor("date-end")).toBe("");
    expect(control("date-end").hasAttribute("aria-invalid")).toBe(false);
  });

  it("does not rewrite the end-date minimum while a flagged end date is edited", () => {
    // Browsers rebuild the date editor when min is written, which would drop a date being typed;
    // typing the year digit by digit passes through complete dates such as 0002-07-12.
    editWith("date-start", "2026-07-10", "change");
    blurWith("date-end", "2026-07-01");
    expect(errorFor("date-end")).toBe(END_ERROR);
    const observer = new MutationObserver(() => {});
    observer.observe(control("date-end"), { attributes: true, attributeFilter: ["min"] });

    control("date-end").focus();
    editWith("date-end", "0002-07-12");
    editWith("date-end", "2026-07-12");

    expect(observer.takeRecords()).toEqual([]);
    expect(errorFor("date-end")).toBe("");
    expect(control("date-end").hasAttribute("aria-invalid")).toBe(false);
    observer.disconnect();
  });

  it("updates a flagged end date's message when a start date is chosen", () => {
    blurWith("date-end", "2026-06-14");
    expect(errorFor("date-end")).toBe(START_ERROR);

    editWith("date-start", "2026-07-01", "change");

    expect(control("date-end").min).toBe("2026-07-01");
    expect(errorFor("date-end")).toBe(END_ERROR);
    expect(control("date-end").getAttribute("aria-invalid")).toBe("true");
  });

  it("does not flag an end date without an error when the start date moves past it", () => {
    fill({ "date-end": "2026-07-08" });

    editWith("date-start", "2026-07-10", "change");

    expect(control("date-end").min).toBe("2026-07-10");
    expect(errorFor("date-end")).toBe("");
    expect(control("date-end").hasAttribute("aria-invalid")).toBe(false);

    control("date-end").focus();
    control("date-end").blur();
    expect(errorFor("date-end")).toBe(END_ERROR);
  });
});
