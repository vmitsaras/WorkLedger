import { expect, test } from '@playwright/test';

import { expectPageToHaveNoAxeViolations } from '@workledger/test-utils';

test('loads a browser-rendered baseline page and runs axe', async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>WorkLedger Smoke</title>
      </head>
      <body>
        <main>
          <h1>WorkLedger</h1>
          <button type="button">Clock in</button>
        </main>
      </body>
    </html>
  `);

  await expect(page.getByRole('heading', { name: 'WorkLedger' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clock in' })).toBeEnabled();
  await expectPageToHaveNoAxeViolations(page);
});
