import { useRef, useState } from 'preact/hooks';
import { Sheet } from './Sheet';
import { HelpLink } from './HelpLink';
import { LIMITS, validatePersonName } from '../../shared/validate';
import { copy } from '../copy';

export function NameSheet({
  title,
  subtitle,
  submitLabel,
  initialName = '',
  onSubmit,
  secondary,
  onHelp,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  initialName?: string;
  onSubmit: (name: string) => Promise<string | null>;
  secondary: { label: string; onClick: () => void };
  onHelp?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  // True only for a bad name, not for a failed save, so a server error doesn't flag a valid name.
  const [nameInvalid, setNameInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  const submit = async (e: Event) => {
    e.preventDefault();
    const trimmed = name.trim();
    const invalid = validatePersonName(trimmed);
    if (invalid) {
      setError(invalid);
      setNameInvalid(true);
      return;
    }
    setNameInvalid(false);
    setBusy(true);
    const result = await onSubmit(trimmed);
    setBusy(false);
    setError(result);
  };

  return (
    <Sheet label={title} onEscape={secondary.onClick} initialFocus={field}>
      <form onSubmit={submit} noValidate>
        <h2>{title}</h2>
        <p class="sheet-sub">{subtitle}</p>
        {onHelp && <HelpLink onClick={onHelp} />}
        <label class="field">
          <span>{copy.create.yourName}</span>
          <input
            value={name}
            maxLength={LIMITS.personName}
            ref={field}
            autoComplete="given-name"
            onInput={(e) => setName(e.currentTarget.value)}
            aria-invalid={nameInvalid ? true : undefined}
            aria-describedby={error ? 'name-error' : undefined}
          />
        </label>
        {error && <p class="form-error" id="name-error">{error}</p>}
        <div class="sheet-actions">
          <button type="button" class="btn btn-quiet" onClick={secondary.onClick}>
            {secondary.label}
          </button>
          <button type="submit" class="btn" disabled={busy}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
