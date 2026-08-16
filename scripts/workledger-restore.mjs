#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { decryptBackup, readSecretFile } from './lib/backup-crypto.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(
    'Usage: node scripts/workledger-restore.mjs --manifest FILE --encryption-key-file FILE --env-file FILE',
  );
  process.exit(0);
}
for (const key of ['manifest', 'encryptionKeyFile', 'envFile']) {
  if (!args[key]) throw new Error(`Missing required option: ${key}.`);
}

const manifestPath = resolve(args.manifest);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.format !== 'workledger-backup-manifest-v1') throw new Error('Unsupported manifest.');
if (Date.parse(manifest.expiresAt) <= Date.now()) throw new Error('Backup has expired.');
if (manifest.encryption?.status !== 'ENCRYPTED') throw new Error('Manifest is not encrypted.');
if (
  typeof manifest.artifact?.file !== 'string' ||
  basename(manifest.artifact.file) !== manifest.artifact.file ||
  !/^workledger-[A-Za-z0-9]+\.dump\.enc$/.test(manifest.artifact.file)
) {
  throw new Error('Manifest artifact path is unsafe.');
}
const rootPackage = JSON.parse(await readFile('package.json', 'utf8'));
const migrationJournal = JSON.parse(
  await readFile('packages/database/migrations/meta/_journal.json', 'utf8'),
);
if (
  manifest.applicationVersion !== rootPackage.version ||
  manifest.schemaMigration !== migrationJournal.entries.at(-1)?.tag
) {
  throw new Error('Restore requires the matching application and schema version.');
}
const encryptedPath = join(dirname(manifestPath), manifest.artifact.file);
const encrypted = await readFile(encryptedPath);
if (createHash('sha256').update(encrypted).digest('hex') !== manifest.artifact.sha256) {
  throw new Error('Encrypted backup checksum mismatch.');
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'workledger-restore-'));
const dumpPath = join(temporaryDirectory, 'restore.dump');
const compose = ['compose', '--env-file', args.envFile, '-f', args.composeFile];
try {
  await decryptBackup(encryptedPath, dumpPath, await readSecretFile(args.encryptionKeyFile));
  run('docker', [...compose, 'up', '-d', '--wait']);
  const container = output('docker', [...compose, 'ps', '-q', 'postgres-restore']);
  run('docker', ['cp', dumpPath, `${container}:/tmp/restore.dump`]);
  run('docker', ['cp', 'scripts/sql/verify-restored-database.sql', `${container}:/tmp/verify.sql`]);
  run('docker', [
    ...compose,
    'exec',
    '-T',
    'postgres-restore',
    'sh',
    '-ceu',
    'pg_restore --exit-on-error --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" /tmp/restore.dump',
  ]);
  run('docker', [
    ...compose,
    'exec',
    '-T',
    'postgres-restore',
    'sh',
    '-ceu',
    'psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --file=/tmp/verify.sql',
  ]);
  console.log(
    `Isolated restore verified from ${basename(encryptedPath)}. Sessions/grants: revoked; outbound mail/public ports: absent.`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} operation failed.`);
}
function output(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout.trim()) throw new Error(`${command} lookup failed.`);
  return result.stdout.trim();
}
function parseArgs(argv) {
  const parsed = { composeFile: 'infra/compose/restore.yml' };
  const names = {
    '--manifest': 'manifest',
    '--encryption-key-file': 'encryptionKeyFile',
    '--env-file': 'envFile',
    '--compose-file': 'composeFile',
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--help') return { help: true };
    const name = names[argv[index]];
    if (!name || !argv[index + 1]) throw new Error(`Unknown or incomplete option: ${argv[index]}`);
    parsed[name] = argv[++index];
  }
  return parsed;
}
