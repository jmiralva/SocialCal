import type { EventPatch } from '../../shared/types';
import type { FieldErrors } from '../../shared/validate';
import { LIMITS } from '../../shared/validate';
import { copy } from '../copy';

// Ties an input to its inline error so screen readers announce it.
const invalid = (key: keyof FieldErrors, errors: FieldErrors) =>
  errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `field-${key}-error` } : {};

export function EventFields({
  form,
  errors,
  onField,
}: {
  form: EventPatch;
  errors: FieldErrors;
  onField: (key: keyof EventPatch, value: string) => void;
}) {
  return (
    <>
      <label class="field">
        <span>{copy.eventFields.plan}</span>
        <input
          value={form.name}
          maxLength={LIMITS.eventName}
          placeholder={copy.eventFields.planPlaceholder}
          onInput={(e) => onField('name', e.currentTarget.value)}
          {...invalid('name', errors)}
        />
        {errors.name && <span class="field-error" id="field-name-error">{errors.name}</span>}
      </label>
      <label class="field">
        <span>{copy.eventFields.description}</span>
        <textarea
          value={form.description}
          maxLength={LIMITS.description}
          placeholder={copy.eventFields.descriptionPlaceholder}
          onInput={(e) => onField('description', e.currentTarget.value)}
          {...invalid('description', errors)}
        />
        {errors.description && <span class="field-error" id="field-description-error">{errors.description}</span>}
      </label>
      <div class="field-row">
        <label class="field">
          <span>{copy.eventFields.from}</span>
          <input
            type="date"
            value={form.startDate}
            onInput={(e) => onField('startDate', e.currentTarget.value)}
            {...invalid('startDate', errors)}
          />
          {errors.startDate && <span class="field-error" id="field-startDate-error">{errors.startDate}</span>}
        </label>
        <label class="field">
          <span>{copy.eventFields.to}</span>
          <input
            type="date"
            value={form.endDate}
            onInput={(e) => onField('endDate', e.currentTarget.value)}
            {...invalid('endDate', errors)}
          />
          {errors.endDate && <span class="field-error" id="field-endDate-error">{errors.endDate}</span>}
        </label>
      </div>
    </>
  );
}
