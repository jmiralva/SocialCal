import { expect, test, devices, type Page } from '@playwright/test';

const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const day = (page: Page, date: string) => page.locator(`[data-date="${date}"]`);
const savedDates = (page: Page, count: number) =>
  page.waitForResponse(
    (r) =>
      r.url().includes('/people/') &&
      r.request().method() === 'PATCH' &&
      r.ok() &&
      ((JSON.parse(r.request().postData() ?? '{}') as { dates?: string[] }).dates ?? []).length === count,
  );

test('creator and friend find the best days together', async ({ page, browser }) => {
  const start = iso(1);
  const end = iso(30);
  const [d1, d2, d3] = [iso(2), iso(3), iso(4)];

  // Creator creates the event
  await page.goto('/');
  await page.getByLabel("What's the plan?").fill('Fall camping trip');
  await page.getByLabel('Description').fill('Two nights');
  await page.getByLabel('From', { exact: true }).fill(start);
  await page.getByLabel('To', { exact: true }).fill(end);
  await page.getByLabel('Your name').fill('Jorge');
  await page.getByRole('button', { name: 'Create calendar' }).click();
  await expect(page.getByRole('dialog', { name: 'Your calendar is ready' })).toBeVisible();
  const editLink = (await page.locator('.copy-row code').nth(1).textContent())!;
  expect(editLink).toMatch(/\/e\/[A-Za-z0-9]{22}#edit=[A-Za-z0-9]{22}$/);
  await page.getByRole('button', { name: 'Done' }).click();
  const eventPath = new URL(page.url()).pathname;

  // Creator drags a three-day span
  const saved = savedDates(page, 3);
  await day(page, d1).scrollIntoViewIfNeeded();
  await day(page, d3).scrollIntoViewIfNeeded();
  const a = (await day(page, d1).boundingBox())!;
  const b = (await day(page, d3).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText('· 3 days')).toBeVisible();
  await saved;

  // Friend joins from a separate browser and marks two days
  const friendContext = await browser.newContext({ ...devices['Pixel 7'], baseURL: 'http://localhost:8788' });
  const friend = await friendContext.newPage();
  await friend.goto(eventPath);
  await friend.getByRole('button', { name: 'How it works' }).click();
  await expect(friend.getByRole('dialog', { name: 'How socialcal works' })).toBeVisible();
  await friend.getByRole('button', { name: 'Got it' }).click();
  await expect(friend.getByRole('dialog', { name: 'Fall camping trip' })).toBeVisible();
  await friend.getByLabel('Your name').fill('Maya');
  await friend.getByRole('button', { name: 'Continue' }).click();
  await expect(friend.getByText('Marking days for')).toBeVisible();
  const friendSaved = savedDates(friend, 2);
  await day(friend, d2).click();
  await day(friend, d3).click();
  await expect(friend.getByText('· 2 days')).toBeVisible();
  await friendSaved;

  // Identity lives in an HttpOnly cookie, not localStorage
  const deviceCookie = (await friendContext.cookies()).find((c) => c.name === 'sc_device');
  expect(deviceCookie).toMatchObject({ httpOnly: true, secure: false, sameSite: 'Lax' });
  await friend.evaluate(() => localStorage.clear());
  await friend.reload();
  await expect(friend.getByText('Marking days for')).toBeVisible();
  await expect(friend.getByText('· 2 days')).toBeVisible();

  // The creator opens the edit link on a second device; both devices stay creator
  const creator2Context = await browser.newContext({ ...devices['Pixel 7'], baseURL: 'http://localhost:8788' });
  const creator2 = await creator2Context.newPage();
  await creator2.goto(editLink);
  await expect(creator2.getByRole('button', { name: 'Edit event' })).toBeVisible();
  await expect(creator2.locator('b.you')).toHaveText('Jorge');
  expect(new URL(creator2.url()).hash).toBe('');
  await creator2Context.close();

  // Both see the same best days
  await friend.getByRole('tab', { name: 'Best days' }).click();
  await expect(friend.getByRole('heading', { level: 2, name: 'Best days', exact: true })).toBeVisible();
  await expect(friend.locator('.day-row.is-top')).toHaveCount(2);
  await expect(friend.locator('.grid .day .ring')).toHaveCount(2);
  await expect(friend.getByRole('button', { name: 'See 1 other day' })).toBeVisible();
  await friend.getByRole('button', { name: 'How socialcal works' }).click();
  await expect(friend.getByRole('dialog', { name: 'How socialcal works' })).toBeVisible();
  await friend.getByRole('button', { name: 'Got it' }).click();
  await expect(friend.getByRole('dialog')).toHaveCount(0);

  await page.reload();
  await page.getByRole('tab', { name: 'Best days' }).click();
  await expect(page.locator('.day-row.is-top')).toHaveCount(2);
  await expect(page.locator('.day-row.is-top').first()).toContainText('2 of 2');

  // Creator renames the event and shrinks the date range so d3 falls outside it
  await page.getByRole('button', { name: 'Edit event' }).click();
  await page.getByLabel("What's the plan?").fill('Fall camping trip v2');
  await page.getByLabel('To', { exact: true }).fill(iso(3));
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Fall camping trip v2' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Best day', exact: true })).toBeVisible();
  await expect(page.locator('.grid .day .ring')).toHaveCount(1);
  await expect(page.locator('.day-row.is-top')).toHaveCount(1);
  await expect(day(page, d3)).toHaveCount(0);

  // Friend has no edit link
  await expect(friend.getByRole('button', { name: 'Edit event' })).toHaveCount(0);
  await friendContext.close();
});

test('a keyboard-only visitor joins, marks a day, and uses help', async ({ browser, request }) => {
  const created = await request.post('/api/events', {
    data: { name: 'Keyboard picnic', description: '', startDate: iso(1), endDate: iso(14), creatorName: 'Ana' },
  });
  expect(created.ok()).toBe(true);
  const { eventId } = (await created.json()) as { eventId: string };

  // Desktop context: the Pixel 7 project device is a touch device, where the name field doesn't take focus.
  const context = await browser.newContext({ ...devices['Desktop Chrome'], baseURL: 'http://localhost:8788' });
  const page = await context.newPage();
  await page.goto(`/e/${eventId}`);

  // Join with the keyboard
  await expect(page.getByRole('dialog', { name: 'Keyboard picnic' })).toBeVisible();
  await expect(page.getByLabel('Your name')).toBeFocused();
  await page.keyboard.type('Sam');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Marking days for')).toBeVisible();

  // Tab into the calendar; it lands on the first selectable day
  for (let i = 0; i < 15; i++) {
    if (await page.evaluate(() => document.activeElement?.classList.contains('day'))) break;
    await page.keyboard.press('Tab');
  }
  await expect(day(page, iso(1))).toBeFocused();

  // Mark the next day with an arrow and Enter
  await page.keyboard.press('ArrowRight');
  await expect(day(page, iso(2))).toBeFocused();
  const saved = savedDates(page, 1);
  await page.keyboard.press('Enter');
  await expect(day(page, iso(2))).toHaveAttribute('aria-pressed', 'true');
  await expect(day(page, iso(2))).toHaveAttribute('aria-label', /1 of 2 people free/);
  await saved;

  // Help opens from the keyboard, closes on Escape, and gives focus back
  const help = page.getByRole('button', { name: 'How socialcal works' });
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'How socialcal works' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(help).toBeFocused();

  await context.close();
});
