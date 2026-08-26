import { readFile } from 'node:fs/promises';

const stylesUrl = new URL('../src/styles.css', import.meta.url);

test('defines visible focus, reduced-motion, and forced-colors foundations', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  expect(styles).toContain('@layer workledger-tokens, workledger-base');
  expect(styles).toContain('--wl-focus-ring:');
  expect(styles).toContain(':where(.wl-control, .wl-link, .wl-field input)[data-focus-visible]');
  expect(styles).toContain('--wl-state-warning-text:');
  expect(styles).toContain('--wl-density-compact-section-gap:');
  expect(styles).toContain('.wl-panel--comfortable {');
  expect(styles).toContain('var(--wl-density-comfortable-container-padding)');
  expect(styles).toContain(
    'padding: clamp(var(--wl-space-4), 2.5vw, var(--wl-density-balanced-container-padding));',
  );
  expect(styles).toContain('padding: var(--wl-density-compact-container-padding);');
  expect(styles).toContain('outline-style: solid;');
  expect(styles).toContain('@keyframes wl-dialog-in');
  expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  expect(styles).toContain('transform: none !important;');
  expect(styles).toContain('@media (forced-colors: active)');
  expect(styles).toContain('--wl-focus-ring: Highlight;');
});
