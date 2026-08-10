import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const databasePackageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDeclaration = resolve(databasePackageDirectory, 'dist/index.d.ts');
const forbiddenPersistenceTypes =
  /(?:drizzle-orm|node-postgres|pg-core|from ['"]pg['"]|\bNodePg\w*|\bPgTable\w*|\bSQL(?:<|\b)|\bQueryBuilder\w*)/u;

describe('database public boundary', () => {
  it('exports one package root whose declaration closure contains no SQL implementation types', async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(databasePackageDirectory, 'package.json'), 'utf8'),
    ) as { exports?: unknown };

    expect(packageJson.exports).toEqual({
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    });

    const declarations = await readPublicDeclarationClosure(publicDeclaration);
    expect(declarations.size).toBeGreaterThan(1);

    for (const [file, source] of declarations) {
      expect(source, `${file} exposes a persistence implementation type`).not.toMatch(
        forbiddenPersistenceTypes,
      );
    }
  });
});

async function readPublicDeclarationClosure(entry: string): Promise<ReadonlyMap<string, string>> {
  const declarations = new Map<string, string>();
  const pending = [entry];

  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || declarations.has(file)) continue;

    const source = await readFile(file, 'utf8');
    declarations.set(file, source);

    for (const match of source.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/gu)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      pending.push(resolve(dirname(file), specifier.replace(/\.js$/u, '.d.ts')));
    }
  }

  return declarations;
}
