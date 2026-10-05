const SELECTOR = '[data-form]';

export function initForm() {
  const form = document.querySelector(SELECTOR);
  if (!form) return;

  form.setAttribute('novalidate', '');

  const tourSelect = form.querySelector('select[name="tour"]');
  const dateStart = form.querySelector('#date-start');
  const dateEnd = form.querySelector('#date-end');
  const today = formatDateForInput();

  prefillFromQuery(tourSelect);

  if (dateStart instanceof HTMLInputElement) {
    dateStart.min = today;
  }

  syncEndDateMin(dateStart, dateEnd, today);

  if (dateStart instanceof HTMLInputElement) {
    dateStart.addEventListener('change', () => {
      syncEndDateMin(dateStart, dateEnd, today);
    });
  }

  form.addEventListener(
    'blur',
    event => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        validateField(target, form, today);
      }
    },
    true
  );

  form.addEventListener('submit', event => {
    clearErrors(form);

    let firstInvalidField = null;
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      const isValid = validateField(field, form, today);
      if (!isValid && !firstInvalidField) {
        firstInvalidField = field;
      }
    });

    if (firstInvalidField) {
      event.preventDefault();
      firstInvalidField.focus();
    }
  });
}

function clearErrors(form) {
  form.querySelectorAll('.form__error').forEach(error => {
    error.textContent = '';
  });

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.removeAttribute('aria-invalid');
  });
}

function validateField(field, form, today) {
  const errorEl = getErrorElement(field, form);
  if (!errorEl) return true;

  errorEl.textContent = '';
  field.removeAttribute('aria-invalid');

  // The constraints in contact.html and the runtime date minimums define what is valid; this
  // function only picks the message for the native validity state. A start date set without a
  // change event would leave the end-date minimum stale, so it is synchronized first.
  const dateStart = form.querySelector('#date-start');
  if (field.id === 'date-end') {
    syncEndDateMin(dateStart, field, today);
  }

  let message = '';

  if (field.validity.valueMissing || (field instanceof HTMLInputElement && field.type === 'checkbox' && !field.checked)) {
    message = 'To pole jest wymagane.';
  }

  if (!message && field.type === 'email' && field.value && field.validity.typeMismatch) {
    message = 'Podaj poprawny adres e-mail w formacie nazwa@domena.';
  }

  if (!message && field.validity.tooShort) {
    message = `Wprowadź co najmniej ${field.minLength} znaki.`;
  }

  if (!message && field.id === 'phone' && field.value && field.validity.patternMismatch) {
    message = 'Podaj numer telefonu: cyfry, opcjonalnie znak + na początku, spacje i myślniki (min. 7 znaków, nie licząc spacji i myślników).';
  }

  if (!message && field.id === 'date-start' && field.validity.rangeUnderflow) {
    message = 'Podaj datę nie wcześniejszą niż dzisiaj.';
  }

  // The end-date minimum is the start date once one is chosen, and today until then.
  if (!message && field.id === 'date-end' && field.validity.rangeUnderflow) {
    message =
      dateStart instanceof HTMLInputElement && dateStart.value
        ? 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.'
        : 'Podaj datę nie wcześniejszą niż dzisiaj.';
  }

  if (!message && field.id === 'people' && (field.validity.rangeUnderflow || field.validity.rangeOverflow)) {
    message = `Liczba osób musi mieścić się w zakresie od ${field.min} do ${field.max}.`;
  }

  if (message) {
    errorEl.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    return false;
  }

  return true;
}

// The end date may not precede the chosen start date, or today while no start date is chosen.
function syncEndDateMin(dateStart, dateEnd, today) {
  if (dateEnd instanceof HTMLInputElement) {
    dateEnd.min = (dateStart instanceof HTMLInputElement && dateStart.value) || today;
  }
}

function getErrorElement(field, form) {
  const errorId = field.getAttribute('aria-describedby');
  if (errorId) {
    return form.querySelector(`#${errorId}`);
  }
  return field.closest('.form__field')?.querySelector('.form__error') || null;
}

function formatDateForInput() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Selects the offer linked from tours.html as contact.html?tour=<catalogue id>. Only a value
// that matches an option is applied; any other would leave the select with no option selected.
function prefillFromQuery(select) {
  if (!select) return;
  const params = new URLSearchParams(window.location.search);
  const tour = params.get('tour');
  if (tour && Array.from(select.options).some(option => option.value === tour)) {
    select.value = tour;
  }
}
