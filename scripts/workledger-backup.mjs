#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { closeSync, openSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { encryptBackup, readSecretFile } from './lib/backup-crypto.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Usage: node scripts/workledger-backup.mjs --output-dir DIR --encryption-key-file FILE [options]

Required:
  --output-dir DIR              Protected directory outside the public application network
  --encryption-key-file FILE    Host-only file containing at least 32 bytes
  --retention-days DAYS         Explicit backup expiry interval
  --operator ID                 Non-sensitive operator/evidence identifier

Options:
  --compose-file FILE           Default: infra/compose/production.yml
  --env-file FILE               Deployment environment file passed to Compose
  --container NAME              Explicit PostgreSQL container (evidence/testing only)
  --database NAME               Database override used with --container
  --database-user NAME          Database user override used with --container
  --help                        Show this help
`);
  process.exit(0);
}

for (const key of ['outputDir', 'encryptionKeyFile', 'retentionDays', 'operator']) {
  if (!args[key]) throw new Error(`Missing required option: ${key}.`);
}
if (!/^\d+$/.test(args.retentionDays) || Number(args.retentionDays) < 1) {
  throw new Error('retention-days must be a positive integer.');
}
if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(args.operator)) {
  throw new Error('operator must be a non-sensitive 1-80 character identifier.');
}

const outputDirectory = resolve(args.outputDir);
const outputMode = (await stat(outputDirectory)).mode & 0o777;
if ((outputMode & 0o077) !== 0) {
  throw new Error('Backup output directory must not grant group or other access (expected 0700).');
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'workledger-pgdump-'));
const dumpPath = join(temporaryDirectory, 'workledger.dump');
const createdAt = new Date();
const stamp = createdAt.toISOString().replaceAll(/[-:.]/g, '').replace('Z', 'Z');
const backupName = `workledger-${stamp}.dump.enc`;
const encryptedPath = join(outputDirectory, backupName);
const manifestPath = `${encryptedPath}.manifest.json`;

try {
  const descriptor = openSync(dumpPath, 'wx', 0o600);
  const dockerArgs = args.container
    ? [
        'exec',
        args.container,
        'pg_dump',
        '--format=custom',
        '--no-owner',
        '--no-privileges',
        `--username=${args.databaseUser ?? 'workledger_owner'}`,
        `--dbname=${args.database ?? 'workledger_dev'}`,
      ]
    : [
        'compose',
        ...(args.envFile ? ['--env-file', args.envFile] : []),
        '-f',
        args.composeFile,
        'exec',
        '-T',
        'postgres',
        'sh',
        '-ceu',
        'exec pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"',
      ];
  const result = spawnSync('docker', dockerArgs, {
    stdio: ['ignore', descriptor, 'inherit'],
  });
  closeSync(descriptor);
  if (result.status !== 0) throw new Error('pg_dump failed; no backup was published.');

  await encryptBackup(dumpPath, encryptedPath, await readSecretFile(args.encryptionKeyFile));
  const encryptedBytes = await readFile(encryptedPath);
  const rootPackage = JSON.parse(await readFile('package.json', 'utf8'));
  const migrationJournal = JSON.parse(
    await readFile('packages/database/migrations/meta/_journal.json', 'utf8'),
  );
  const expiresAt = new Date(createdAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + Number(args.retentionDays));
  const manifest = {
    format: 'workledger-backup-manifest-v1',
    applicationVersion: rootPackage.version,
    schemaMigration: migrationJournal.entries.at(-1)?.tag ?? 'unknown',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    retentionClass: 'DATABASE_BACKUP',
    operator: args.operator,
    encryption: { algorithm: 'AES-256-GCM', keyDerivation: 'scrypt', status: 'ENCRYPTED' },
    artifact: {
      file: backupName,
      bytes: encryptedBytes.length,
      sha256: createHash('sha256').update(encryptedBytes).digest('hex'),
      accessMode: '0600',
    },
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  await chmod(encryptedPath, 0o600);
  console.log(`Encrypted backup and manifest created: ${basename(encryptedPath)}`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function parseArgs(argv) {
  const parsed = { composeFile: 'infra/compose/production.yml' };
  const names = {
    '--output-dir': 'outputDir',
    '--encryption-key-file': 'encryptionKeyFile',
    '--retention-days': 'retentionDays',
    '--operator': 'operator',
    '--compose-file': 'composeFile',
    '--env-file': 'envFile',
    '--container': 'container',
    '--database': 'database',
    '--database-user': 'databaseUser',
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--help') return { help: true };
    const name = names[argv[index]];
    if (!name || !argv[index + 1]) throw new Error(`Unknown or incomplete option: ${argv[index]}`);
    parsed[name] = argv[++index];
  }
  return parsed;
}
