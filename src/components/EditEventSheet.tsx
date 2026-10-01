import { useState } from 'preact/hooks';
import { Sheet } from './Sheet';
import { EventFields } from './EventFields';
import { validateEventFields, type FieldErrors } from '../../shared/validate';
import type { EventInfo, EventPatch } from '../../shared/types';

export function EditEventSheet({
  event,
  onSave,
  onClose,
}: {
  event: EventInfo;
  onSave: (patch: EventPatch) => Promise<string | null>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EventPatch>({
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    const patch = { ...form, name: form.name.trim(), description: form.description.trim() };
    const errs = validateEventFields(patch);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const err = await onSave(patch);
    setBusy(false);
    setFormError(err);
  };

  return (
    <Sheet label="Edit event" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <h2>Edit event</h2>
        <p class="sheet-sub">Only you can change these.</p>
        <EventFields form={form} errors={errors} onField={(key, value) => setForm((f) => ({ ...f, [key]: value }))} />
        {formError && <p class="form-error">{formError}</p>}
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" class="btn" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}
