import { useState } from 'preact/hooks';
import type { Navigate } from '../App';
import { TopBar } from '../components/TopBar';
import { EventFields } from '../components/EventFields';
import { HelpLink } from '../components/HelpLink';
import { HelpSheet } from '../components/HelpSheet';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, ApiRequestError } from '../lib/api';
import { markJustCreated } from '../lib/storage';
import { addDays, todayLocalISO } from '../../shared/dates';
import { LIMITS, validateEventFields, validatePersonName, type FieldErrors } from '../../shared/validate';
import type { EventPatch } from '../../shared/types';
import { copy } from '../copy';

export function CreatePage({ navigate }: { navigate: Navigate }) {
  useDocumentTitle(copy.title.create);
  const today = todayLocalISO();
  const [form, setForm] = useState<EventPatch>({
    name: '',
    description: '',
    startDate: addDays(today, 7),
    endDate: addDays(today, 37),
  });
  const [creatorName, setCreatorName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    const input = {
      name: form.name.trim(),
      description: form.description.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      creatorName: creatorName.trim(),
    };
    const errs = validateEventFields(input);
    const nameErr = validatePersonName(input.creatorName);
    if (nameErr) errs.creatorName = nameErr;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFormError(null);
    try {
      const r = await api.createEvent(input);
      markJustCreated(r.eventId, r.editKey);
      navigate(`/e/${r.eventId}`);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError && err.status === 400
          ? err.message
          : copy.create.networkError,
      );
      setBusy(false);
    }
  };

  return (
    <div class="page">
      <TopBar onNew={() => navigate('/')} showNew={false} />
      <form class="create" onSubmit={submit} noValidate>
        <h1>{copy.create.title}</h1>
        <p class="lede">{copy.create.lede}</p>
        <HelpLink onClick={() => setHelp(true)} />
        <EventFields form={form} errors={errors} onField={(key, value) => setForm((f) => ({ ...f, [key]: value }))} />
        <label class="field">
          <span>{copy.create.yourName}</span>
          <input
            value={creatorName}
            maxLength={LIMITS.personName}
            placeholder={copy.create.yourNamePlaceholder}
            autoComplete="given-name"
            onInput={(e) => setCreatorName(e.currentTarget.value)}
            aria-invalid={errors.creatorName ? true : undefined}
            aria-describedby={errors.creatorName ? 'field-creatorName-error' : undefined}
          />
          {errors.creatorName && <span class="field-error" id="field-creatorName-error">{errors.creatorName}</span>}
        </label>
        {formError && <p class="form-error">{formError}</p>}
        <button type="submit" class="btn btn-block" disabled={busy}>
          {busy ? copy.create.submitting : copy.create.submit}
        </button>
      </form>
      {help && <HelpSheet onClose={() => setHelp(false)} />}
    </div>
  );
}
