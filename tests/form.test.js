import { beforeEach, describe, expect, it } from "vitest";
import { initForm } from "../js/features/form.js";
import { mountFromPage, setUrl } from "./helpers.js";

const REQUIRED = "To pole jest wymagane.";
const EMAIL_ERROR = "Podaj poprawny adres e-mail w formacie nazwa@domena.";
const PHONE_ERROR = "Podaj numer telefonu: cyfry, opcjonalnie znak + na początku, spacje i myślniki (min. 7 znaków, nie licząc spacji i myślników).";

const VALID_VALUES = {
  name: "Anna Kowalska",
  email: "anna.kowalska@example.com",
  phone: "+48 600 900 700",
  subject: "podobna-strona",
  message: "Chcę zapytać o podobną stronę dla mojego biura podróży.",
  rodo: true,
};

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
  mountFromPage("contact.html", "[data-form]");
});

describe("inquiry form contract", () => {
  it("submits the project inquiry fields through the static Netlify form", () => {
    const names = Array.from(form().elements, (element) => element.name).filter(Boolean);

    expect(names).toEqual(["form-name", "bot-field", "name", "email", "phone", "subject", "message", "rodo"]);
    expect(form().getAttribute("name")).toBe("zapytanie");
    expect(form().elements.namedItem("form-name").value).toBe("zapytanie");
    expect(form().getAttribute("method")).toBe("POST");
    expect(form().getAttribute("action")).toBe("dziekuje.html");
    expect(form().getAttribute("data-netlify")).toBe("true");
    expect(form().getAttribute("netlify-honeypot")).toBe("bot-field");
  });

  it("offers the inquiry subjects after an empty required placeholder", () => {
    const subject = control("subject");
    const options = Array.from(subject.options, (option) => [option.value, option.textContent]);

    expect(subject.required).toBe(true);
    expect(options).toEqual([
      ["", "Wybierz temat"],
      ["projekt-aurora-travel", "Projekt Aurora Travel"],
      ["podobna-strona", "Podobna strona internetowa"],
      ["inny-temat", "Inny temat"],
    ]);
  });

  it.each(["/contact.html?tour=islandia", "/contact.html?tour=custom"])("ignores the retired tour parameter in %s", (pathAndQuery) => {
    setUrl(pathAndQuery);

    initForm();

    expect(control("subject").value).toBe("");
    expect(invalidFields()).toEqual([]);
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

  it("requires an inquiry subject and accepts each listed subject", () => {
    blurWith("subject", "");
    expect(errorFor("subject")).toBe(REQUIRED);
    expect(control("subject").getAttribute("aria-invalid")).toBe("true");

    ["projekt-aurora-travel", "podobna-strona", "inny-temat"].forEach((subject) => {
      blurWith("subject", subject);
      expect(errorFor("subject")).toBe("");
      expect(control("subject").hasAttribute("aria-invalid")).toBe(false);
    });
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

    const required = ["name", "email", "subject", "message", "rodo"];
    expect(invalidFields()).toEqual(required);
    required.forEach((id) => expect(errorFor(id)).toBe(REQUIRED));
    expect(errorFor("phone")).toBe("");
    expect(document.activeElement).toBe(control("name"));
  });

  it("focuses the first invalid field in document order", () => {
    fill({ ...VALID_VALUES, email: "anna@", subject: "" });

    expect(submit()).toBe("prevented");

    expect(invalidFields()).toEqual(["email", "subject"]);
    expect(errorFor("email")).toBe(EMAIL_ERROR);
    expect(errorFor("subject")).toBe(REQUIRED);
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

  it("does not validate the hidden honeypot field", () => {
    fill({ ...VALID_VALUES, "bot-field": "" });

    expect(submit()).toBe("submitted");
    expect(control("bot-field").hasAttribute("aria-invalid")).toBe(false);
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
    { id: "message", invalid: "", message: REQUIRED, valid: "Pytanie o projekt.", event: "input" },
    { id: "subject", invalid: "", message: REQUIRED, valid: "projekt-aurora-travel", event: "change" },
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
      subject: "",
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
    expect(invalidFields()).toEqual(["email", "subject", "message", "rodo"]);
    expect(document.activeElement).toBe(control("name"));

    expect(submit()).toBe("prevented");
    expect(errorFor("email")).toBe(REQUIRED);
    expect(document.activeElement).toBe(control("email"));
  });
});
