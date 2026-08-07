import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { formatAxeViolations, wcagAaTags, type AxeViolation } from './accessibility.js';

export async function collectPageAxeViolations(page: Page): Promise<readonly AxeViolation[]> {
  const results = await new AxeBuilder({ page }).withTags([...wcagAaTags]).analyze();
  return results.violations;
}

export async function expectPageToHaveNoAxeViolations(page: Page): Promise<void> {
  const violations = await collectPageAxeViolations(page);
  if (violations.length > 0) {
    throw new Error(`Expected no page axe violations:\n${formatAxeViolations(violations)}`);
  }
}
