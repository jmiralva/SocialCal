import type { EventPatch } from '../../shared/types';
import type { FieldErrors } from '../../shared/validate';
import { LIMITS } from '../../shared/validate';

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
        <span>What's the plan?</span>
        <input
          value={form.name}
          maxLength={LIMITS.eventName}
          placeholder="e.g. Fall camping trip"
          onInput={(e) => onField('name', e.currentTarget.value)}
        />
        {errors.name && <span class="field-error">{errors.name}</span>}
      </label>
      <label class="field">
        <span>Description</span>
        <textarea
          value={form.description}
          maxLength={LIMITS.description}
          placeholder="Optional: where, how long, anything people should know"
          onInput={(e) => onField('description', e.currentTarget.value)}
        />
        {errors.description && <span class="field-error">{errors.description}</span>}
      </label>
      <div class="field-row">
        <label class="field">
          <span>From</span>
          <input type="date" value={form.startDate} onInput={(e) => onField('startDate', e.currentTarget.value)} />
          {errors.startDate && <span class="field-error">{errors.startDate}</span>}
        </label>
        <label class="field">
          <span>To</span>
          <input type="date" value={form.endDate} onInput={(e) => onField('endDate', e.currentTarget.value)} />
          {errors.endDate && <span class="field-error">{errors.endDate}</span>}
        </label>
      </div>
    </>
  );
}
