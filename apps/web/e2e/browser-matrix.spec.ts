import { expect, test } from '@playwright/test';

import { expectPageToHaveNoAxeViolations } from '@workledger/test-utils';

test('@browser-matrix sign-in route has semantic, responsive baseline', async ({ page }) => {
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({
      json: {
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Sign in to continue.',
          requestId: '123e4567-e89b-42d3-a456-426614174000',
        },
      },
      status: 401,
    });
  });
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
  await expectPageToHaveNoAxeViolations(page);
});
