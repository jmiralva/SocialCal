// Regions whose week starts on Sunday, for engines without Intl week info (Firefox).
const SUNDAY_REGIONS = new Set(['US', 'CA', 'JP', 'BR', 'MX', 'IL', 'PH', 'KR', 'TW', 'HK', 'IN', 'ZA', 'SA']);

type WeekInfo = { firstDay: number }; // 1 = Monday ... 7 = Sunday
type LocaleWithWeekInfo = Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };

// First day of the week for a locale: 0 = Sunday ... 6 = Saturday (same numbering as getUTCDay).
export function weekStartForLocale(tag: string = navigator.language): number {
  try {
    const locale = new Intl.Locale(tag) as LocaleWithWeekInfo;
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay % 7;
    const region = locale.maximize().region;
    return region && !SUNDAY_REGIONS.has(region) ? 1 : 0;
  } catch {
    return 0;
  }
}
