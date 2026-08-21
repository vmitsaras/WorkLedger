import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkCssContract,
  TOKEN_OWNER_FILE,
  validateCssContractSources,
} from './check-css-contract.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPLETE_TOKEN_OWNER = `
  @layer workledger-tokens {
    :root {
      color-scheme: light;
      --wl-color-neutral-0: white;
      --wl-surface: var(--wl-color-neutral-0);
      --wl-control-min-block-size: 2.75rem;
      --wl-state-success-text: green;
      --wl-state-warning-text: brown;
      --wl-state-danger-text: red;
      --wl-motion-duration-fast: 120ms;
      --wl-density-comfortable-section-gap: 2.5rem;
      --wl-density-compact-section-gap: 1.5rem;
    }
  }
`;

test('accepts the current WorkLedger CSS contract', async () => {
  const result = await checkCssContract(repositoryRoot);
  assert.deepEqual(result.errors, []);
  assert.ok(result.classCount > 0);
  assert.ok(result.tokenCount > 0);
  assert.ok(result.tokenUseCount > 0);
});

test('accepts owned tokens and defined WorkLedger classes', () => {
  const result = validateCssContractSources([
    { file: TOKEN_OWNER_FILE, source: COMPLETE_TOKEN_OWNER },
    {
      file: 'apps/web/src/styles.css',
      source: '.wl-panel { color: var(--wl-surface); }',
    },
    {
      file: 'apps/web/src/example.tsx',
      source: 'export const example = <div className="wl-panel">Example</div>;',
    },
  ]);

  assert.deepEqual(result.errors, []);
});

test('rejects unknown classes and tokens plus styling-owner drift', () => {
  const result = validateCssContractSources([
    { file: TOKEN_OWNER_FILE, source: COMPLETE_TOKEN_OWNER },
    {
      file: 'apps/web/src/styles.css',
      source: `
        @layer workledger-tokens { :root { --wl-route-color: #f00; } }
        .example { color: oklch(0.5 0.1 20); background: linear-gradient(white, black); }
      `,
    },
    {
      file: 'apps/web/src/example.tsx',
      source: `
        export const example = (
          <div className="wl-missing wl-card text-secondary bg-red-500 dark:bg-red-900">
            <span style={{ color: 'var(--wl-unknown)' }}>Example</span>
          </div>
        );
      `,
    },
  ]);

  assert.deepEqual(
    new Set(result.errors.map(({ code }) => code)),
    new Set([
      'ambient-gradient',
      'inert-dark-branch',
      'legacy-style-contract',
      'one-off-palette-utility',
      'raw-color-outside-token-owner',
      'token-layer-owner-violation',
      'token-owner-violation',
      'undefined-token',
      'undefined-workledger-class',
    ]),
  );
});

test('rejects an incomplete semantic token tier inventory', () => {
  const result = validateCssContractSources([
    {
      file: TOKEN_OWNER_FILE,
      source: ':root { color-scheme: light; --wl-surface: white; }',
    },
  ]);

  assert.ok(result.errors.some(({ code }) => code === 'missing-token-tier'));
});
