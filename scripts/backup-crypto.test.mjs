import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { decryptBackup, encryptBackup, readSecretFile } from './lib/backup-crypto.mjs';

test('authenticated backup encryption round trips and rejects tampering', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'workledger-backup-'));
  const input = join(directory, 'input.dump');
  const encrypted = join(directory, 'backup.dump.enc');
  const restored = join(directory, 'restored.dump');
  const secret = 'correct horse battery staple for backups';
  await writeFile(input, Buffer.from('private PostgreSQL dump fixture'));
  await encryptBackup(input, encrypted, secret);
  assert.notDeepEqual(await readFile(encrypted), await readFile(input));
  await decryptBackup(encrypted, restored, secret);
  assert.deepEqual(await readFile(restored), await readFile(input));

  const bytes = await readFile(encrypted);
  bytes[Math.floor(bytes.length / 2)] ^= 1;
  await writeFile(encrypted, bytes);
  await assert.rejects(decryptBackup(encrypted, join(directory, 'tampered.dump'), secret));
});

test('backup secrets fail closed below 32 bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'workledger-secret-'));
  const secretPath = join(directory, 'secret');
  await writeFile(secretPath, 'too-short');
  await assert.rejects(readSecretFile(secretPath), /at least 32 bytes/);
});
