import { mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** New directory and immutable, flushed checkpoints preserve prior evidence on interruption. */
export async function createSchemaQualificationOutput(root) {
  await mkdir(root, { recursive: true });
  const directory = join(root, `schema-qualification-${randomUUID()}`);
  await mkdir(directory);
  let sequence = 0;
  async function write(name, artifact) {
    const handle = await open(join(directory, name), 'wx');
    try {
      await handle.writeFile(`${JSON.stringify(artifact, null, 2)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  // Reserve and flush the journal location before the caller can start inference.
  await write('reservation.json', {
    state: 'RESERVED',
    format: 'schema-qualification-checkpoints-v1',
  });
  return {
    directory,
    checkpoint: async (artifact) =>
      write(`checkpoint-${String(sequence++).padStart(3, '0')}.json`, artifact),
    finish: async (artifact) => write('artifact.json', artifact),
  };
}
