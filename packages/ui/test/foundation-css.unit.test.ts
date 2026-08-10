import { readFile } from 'node:fs/promises';

const stylesUrl = new URL('../src/styles.css', import.meta.url);

test('defines visible focus, reduced-motion, and forced-colors foundations', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  expect(styles).toContain('--wl-focus-ring:');
  expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  expect(styles).toContain('transform: none !important;');
  expect(styles).toContain('@media (forced-colors: active)');
  expect(styles).toContain('--wl-focus-ring: Highlight;');
});
