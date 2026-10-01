import { useState } from 'preact/hooks';
import { Sheet } from './Sheet';
import { HelpLink } from './HelpLink';
import { LIMITS, validatePersonName } from '../../shared/validate';

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
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    const trimmed = name.trim();
    const invalid = validatePersonName(trimmed);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    const result = await onSubmit(trimmed);
    setBusy(false);
    setError(result);
  };

  return (
    <Sheet label={title}>
      <form onSubmit={submit} noValidate>
        <h2>{title}</h2>
        <p class="sheet-sub">{subtitle}</p>
        {onHelp && <HelpLink onClick={onHelp} />}
        <label class="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={LIMITS.personName}
            autoFocus
            autoComplete="given-name"
            onInput={(e) => setName(e.currentTarget.value)}
          />
        </label>
        {error && <p class="form-error">{error}</p>}
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" onClick={secondary.onClick}>
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
