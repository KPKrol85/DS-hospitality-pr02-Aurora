const SELECTOR = '[data-form]';

export function initForm() {
  const form = document.querySelector(SELECTOR);
  if (!form) return;

  form.setAttribute('novalidate', '');

  const successMessage = form.querySelector('.form__success');
  const tourSelect = form.querySelector('select[name="tour"]');
  const dateStart = form.querySelector('#date-start');
  const dateEnd = form.querySelector('#date-end');
  const today = formatDateForInput();

  prefillFromQuery(tourSelect);

  if (dateStart instanceof HTMLInputElement) {
    dateStart.min = today;
  }

  if (dateEnd instanceof HTMLInputElement) {
    const minForEnd = dateStart instanceof HTMLInputElement && dateStart.value ? dateStart.value : today;
    dateEnd.min = minForEnd;
  }

  if (dateStart instanceof HTMLInputElement) {
    dateStart.addEventListener('change', () => {
      if (dateEnd instanceof HTMLInputElement) {
        const minDate = dateStart.value || today;
        dateEnd.min = minDate;
      }
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
    if (successMessage) {
      successMessage.hidden = true;
    }

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

  if (!message && field.id === 'phone' && field.value) {
    if (field.validity.patternMismatch || field.value.replace(/[\\s-]/g, '').length < 7) {
      message = 'Podaj numer telefonu (min. 7 znaków, mogą być spacje i myślniki).';
    }
  }

  if (!message && field.id === 'date-start' && field.value) {
    if (field.value < today) {
      message = 'Podaj datę nie wcześniejszą niż dzisiaj.';
    }
  }

  if (!message && field.id === 'date-end' && field.value) {
    const start = form.querySelector('#date-start');
    if (start instanceof HTMLInputElement && start.value && field.value < start.value) {
      message = 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.';
    }
  }

  if (!message && field.id === 'people' && field.value) {
    const value = Number(field.value);
    if (!Number.isNaN(value) && (value < 1 || value > 12)) {
      message = 'Liczba osób musi mieścić się w zakresie od 1 do 12.';
    }
  }

  if (message) {
    errorEl.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    return false;
  }

  return true;
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

function prefillFromQuery(select) {
  if (!select) return;
  const params = new URLSearchParams(window.location.search);
  const tour = params.get('tour');
  if (tour) {
    select.value = tour;
  }
}
