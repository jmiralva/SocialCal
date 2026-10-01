import { daysInclusive } from './dates';

export const LIMITS = {
  eventName: 80,
  description: 500,
  personName: 40,
  rangeDays: 366,
  participants: 50,
  dates: 400,
} as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export type FieldErrors = Partial<Record<'name' | 'description' | 'startDate' | 'endDate' | 'creatorName', string>>;

const FIELD_ORDER = ['name', 'description', 'startDate', 'endDate', 'creatorName'] as const;

export function validateEventFields(input: {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name) errors.name = 'Give the plan a name.';
  else if (input.name.length > LIMITS.eventName) errors.name = 'Keep the name to 80 characters or fewer.';
  if (input.description.length > LIMITS.description) {
    errors.description = 'Keep the description to 500 characters or fewer.';
  }
  const startOk = isIsoDate(input.startDate);
  const endOk = isIsoDate(input.endDate);
  if (!startOk) errors.startDate = 'Pick a start date.';
  if (!endOk) errors.endDate = 'Pick an end date.';
  if (startOk && endOk) {
    if (input.endDate < input.startDate) errors.endDate = 'End date must be on or after the start date.';
    else if (daysInclusive(input.startDate, input.endDate) > LIMITS.rangeDays) {
      errors.endDate = 'Date range can be at most 12 months.';
    }
  }
  return errors;
}

export function validatePersonName(name: string): string | null {
  if (!name) return 'Enter your name.';
  if (name.length > LIMITS.personName) return 'Keep your name to 40 characters or fewer.';
  return null;
}

export function validateDates(dates: unknown): string | null {
  if (!Array.isArray(dates)) return 'Dates must be a list.';
  if (dates.length > LIMITS.dates) return 'Too many dates.';
  for (const d of dates) if (!isIsoDate(d)) return `Invalid date: ${String(d)}`;
  return null;
}

export function firstError(errors: FieldErrors): string | undefined {
  for (const key of FIELD_ORDER) if (errors[key]) return errors[key];
  return undefined;
}

export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}
