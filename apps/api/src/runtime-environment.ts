import { readFile } from 'node:fs/promises';

const FILE_VARIABLES = Object.freeze({
  WORKLEDGER_AUTH_SECRET_FILE: 'WORKLEDGER_AUTH_SECRET',
  WORKLEDGER_DATABASE_URL_FILE: 'WORKLEDGER_DATABASE_URL',
});

export async function loadRuntimeEnvironment(
  source: NodeJS.ProcessEnv,
): Promise<NodeJS.ProcessEnv> {
  const resolved = { ...source };

  for (const [fileVariable, valueVariable] of Object.entries(FILE_VARIABLES)) {
    const filePath = source[fileVariable]?.trim();
    const directValue = source[valueVariable]?.trim();
    if (filePath && directValue) {
      throw new Error(`Configure ${valueVariable} or ${fileVariable}, not both.`);
    }
    if (filePath) {
      const value = (await readFile(filePath, { encoding: 'utf8' })).trim();
      if (!value) throw new Error(`${fileVariable} points to an empty secret file.`);
      resolved[valueVariable] = value;
    }
    delete resolved[fileVariable];
  }

  return resolved;
}
