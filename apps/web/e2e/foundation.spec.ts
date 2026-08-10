import { expect, test } from '@playwright/test';

import { expectPageToHaveNoAxeViolations } from '@workledger/test-utils';

test('renders the semantic UI foundation and restores dialog focus', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('UI Foundation | WorkLedger');
  await expect(
    page.getByRole('heading', { name: 'Calm, clear controls for everyday work' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review field guidance' })).toHaveAttribute(
    'href',
    '#field-example',
  );
  await expect(page.getByRole('textbox', { name: 'Display name' })).toHaveAccessibleDescription(
    'Used only to demonstrate a visible label and connected description.',
  );

  const trigger = page.getByRole('button', { name: 'Open dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Review before continuing' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Review before continuing' })).toBeHidden();
  await expect(trigger).toBeFocused();
  await expectPageToHaveNoAxeViolations(page);
});

test('removes spatial dialog motion when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open dialog' }).click();

  const modal = page.locator('.wl-dialog-modal');
  await expect(modal).toBeVisible();
  await expect(modal).toHaveCSS('animation-name', 'none');
  await expect(modal).toHaveCSS('transform', 'none');
});
