import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const expectedPackageManager = manifest.packageManager.replace('@', '/');
const actualPackageManager = process.env.npm_config_user_agent?.split(' ')[0];
const expectedNode = `v${manifest.devEngines.runtime.version}`;
const errors = [];

if (actualPackageManager !== expectedPackageManager) {
  errors.push(
    `WorkLedger requires ${manifest.packageManager}; received ${actualPackageManager ?? 'an unknown package manager'}.`,
  );
}

if (process.version !== expectedNode) {
  errors.push(`WorkLedger requires Node ${expectedNode}; received ${process.version}.`);
}

if (errors.length > 0) {
  console.error(`Toolchain check failed:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Toolchain valid: ${actualPackageManager}, Node ${process.version}.`);
}
