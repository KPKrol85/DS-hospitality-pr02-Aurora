const SELECTOR = '[data-form]';

export function initForm() {
  const form = document.querySelector(SELECTOR);
  if (!form) return;

  form.setAttribute('novalidate', '');

  form.addEventListener(
    'blur',
    event => {
      const target = event.target;
      if (isFormField(target)) {
        validateField(target, form);
      }
    },
    true
  );

  // A field that already shows an error is checked again while it is edited, so the error clears
  // as soon as the value meets its constraints; a field without an error waits for blur or submit.
  const revalidateEditedField = event => {
    const target = event.target;
    if (!isFormField(target)) return;

    if (target.getAttribute('aria-invalid') === 'true') {
      validateField(target, form);
    }
  };

  form.addEventListener('input', revalidateEditedField);
  form.addEventListener('change', revalidateEditedField);

  form.addEventListener('submit', event => {
    clearErrors(form);

    let firstInvalidField = null;
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      const isValid = validateField(field, form);
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

function isFormField(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function clearErrors(form) {
  form.querySelectorAll('.form__error').forEach(error => {
    error.textContent = '';
  });

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.removeAttribute('aria-invalid');
  });
}

function validateField(field, form) {
  const errorEl = getErrorElement(field, form);
  if (!errorEl) return true;

  // The constraints in contact.html define what is valid; this function only picks the message
  // for the native validity state.
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

  // An unchanged message is not written again, so a field that stays invalid while it is edited
  // does not make its live region announce the same error on every keystroke.
  if (errorEl.textContent !== message) {
    errorEl.textContent = message;
  }

  if (message) {
    field.setAttribute('aria-invalid', 'true');
    return false;
  }

  field.removeAttribute('aria-invalid');
  return true;
}

function getErrorElement(field, form) {
  const errorId = field.getAttribute('aria-describedby');
  if (errorId) {
    return form.querySelector(`#${errorId}`);
  }
  return field.closest('.form__field')?.querySelector('.form__error') || null;
}
