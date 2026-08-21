import { readFileSync } from 'node:fs';

import { z } from 'zod';

const packageManifestSchema = z.object({
  version: z.string().regex(/^0\.(?:0|[1-9]\d*)\.0$/u),
});

const manifest: unknown = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
);

export const WORKLEDGER_VERSION = packageManifestSchema.parse(manifest).version;
