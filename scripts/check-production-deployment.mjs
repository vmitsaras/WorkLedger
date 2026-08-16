#!/usr/bin/env node
import { createConnection } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const CHECK_TIMEOUT_MS = 7_000;
const DEFAULT_COMPOSE_FILE = 'infra/compose/production.yml';
const DEFAULT_CADDYFILE = 'infra/docker/caddy/Caddyfile';
const DEFAULT_ENV_FILE = '.env.production.example';

const options = parseOptions(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

let failed = false;

if (!options.runtimeOnly) {
  failed =
    !(await runStaticChecks({
      composeFile: options.composeFile,
      caddyFile: options.caddyFile,
      envFile: options.envFile,
    })) || failed;
}

if (options.runtime) {
  failed =
    !(await runRuntimeChecks(
      options.baseUrl,
      options.runtimeTimeout,
      options.rejectUnauthorized,
    )) || failed;
}

if (failed) {
  process.exit(1);
}

console.log('WL-1003 deployment evidence checks passed.');

function parseOptions(argv) {
  const options = {
    help: false,
    runtime: false,
    runtimeOnly: false,
    composeConfigOnly: false,
    composeFile: DEFAULT_COMPOSE_FILE,
    caddyFile: DEFAULT_CADDYFILE,
    envFile: DEFAULT_ENV_FILE,
    baseUrl: process.env.WORKLEDGER_PRODUCTION_BASE_URL?.trim() || 'https://localhost',
    runtimeTimeout: CHECK_TIMEOUT_MS,
    rejectUnauthorized: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return options;
    }
    if (arg === '--runtime') {
      options.runtime = true;
      continue;
    }
    if (arg === '--compose-config-only') {
      options.composeConfigOnly = true;
      options.runtime = false;
      continue;
    }
    if (arg === '--runtime-only') {
      options.runtimeOnly = true;
      options.runtime = true;
      continue;
    }
    if (arg === '--base-url') {
      options.baseUrl = argv[index + 1] ?? options.baseUrl;
      index += 1;
      continue;
    }
    if (arg === '--env-file') {
      options.envFile = argv[index + 1] ?? options.envFile;
      index += 1;
      continue;
    }
    if (arg === '--compose-file') {
      options.composeFile = argv[index + 1] ?? options.composeFile;
      index += 1;
      continue;
    }
    if (arg === '--caddy-file') {
      options.caddyFile = argv[index + 1] ?? options.caddyFile;
      index += 1;
      continue;
    }
    if (arg === '--timeout') {
      const value = Number.parseInt(argv[index + 1] ?? '', 10);
      if (!Number.isNaN(value) && value > 0) {
        options.runtimeTimeout = value;
      }
      index += 1;
      continue;
    }
    if (arg === '--allow-self-signed') {
      options.rejectUnauthorized = false;
      continue;
    }
    if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      options.help = true;
      return options;
    }
  }

  if (options.runtimeOnly && options.composeConfigOnly) {
    console.error('Cannot combine --runtime-only with --compose-config-only.');
    options.help = true;
    return options;
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/check-production-deployment.mjs [options]

Options:
  --help, -h                        Show this help.
  --runtime                         Run runtime checks against a running deployment.
  --compose-config-only             Run compose/Caddy static checks only.
  --runtime-only                    Run runtime checks only (skip compose/Caddy checks).
  --compose-file <path>             Compose file to validate (default: ${DEFAULT_COMPOSE_FILE}).
  --caddy-file <path>               Caddyfile to validate (default: ${DEFAULT_CADDYFILE}).
  --env-file <path>                 Deployment environment file (default: ${DEFAULT_ENV_FILE}).
  --base-url <url>                  Public base URL for runtime checks (default: https://localhost).
  --timeout <ms>                    Runtime request/connect timeout (default: ${CHECK_TIMEOUT_MS}).
  --allow-self-signed               Skip TLS certificate verification for local HTTPS probes.

Examples:
  node scripts/check-production-deployment.mjs --compose-config-only
  node scripts/check-production-deployment.mjs --runtime --base-url https://ledger.example.org
`);
}

async function runStaticChecks({ composeFile, caddyFile, envFile }) {
  const checks = [
    checkTextFiles({ composeFile, caddyFile, envFile }),
    checkComposeConfig({ composeFile, envFile }),
    checkComposeNetworkPorts(composeFile),
    checkProxyHardening(caddyFile),
  ];

  return checks.every((result) => result);
}

async function runRuntimeChecks(baseUrl, runtimeTimeoutMs, rejectUnauthorized) {
  let allPassed = true;
  const previousRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (!rejectUnauthorized) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  try {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const requestTimeout = Math.max(runtimeTimeoutMs, 1_000);

    allPassed =
      (await requestCheck(
        `${normalizedBase}/health`,
        { expectStatus: 200, expectBody: '{"status":"ok"}', timeoutMs: requestTimeout },
        'health',
      )) && allPassed;
    allPassed =
      (await requestCheck(
        `${normalizedBase}/ready`,
        { expectStatus: 200, expectBody: '{"status":"ready"}', timeoutMs: requestTimeout },
        'readiness',
      )) && allPassed;
    allPassed =
      (await requestHeaderCheck(
        `${normalizedBase}/health`,
        'http-header-policy',
        requestTimeout,
      )) && allPassed;
    allPassed =
      (await requestHeaderCheck(`${normalizedBase}/`, 'security-headers', requestTimeout)) &&
      allPassed;
    allPassed =
      (await requestForgedHeaderCheck(`${normalizedBase}/ready`, requestTimeout)) && allPassed;

    allPassed = (await checkHostPortBlocked('127.0.0.1', 3000, 'API process port')) && allPassed;
    allPassed =
      (await checkHostPortBlocked('127.0.0.1', 5432, 'PostgreSQL database port')) && allPassed;

    if (!allPassed) {
      console.error('Runtime deployment checks failed.');
    }
  } finally {
    if (previousRejectUnauthorized === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousRejectUnauthorized;
    }
  }

  return allPassed;
}

function checkTextFiles({ composeFile, caddyFile, envFile }) {
  const checks = [
    {
      path: composeFile,
      name: 'compose file',
      required: [
        'name: workledger-production',
        'services:',
        'postgres:',
        'api:',
        'caddy:',
        'postgres_password',
        'database_url',
        'auth_secret',
        'edge:',
        'data:',
      ],
    },
    {
      path: caddyFile,
      name: 'Caddyfile',
      required: [
        'admin off',
        'log {',
        'output discard',
        '@api_paths path /v1/* /api/* /health /ready',
        '@http_to_https',
        'protocol http',
        'redir @http_to_https',
        'header_up -Forwarded',
        'header_up -X-Forwarded-For',
        'header_up -X-Forwarded-Proto',
        'header_up -X-Forwarded-Host',
        'header_up -X-Forwarded-Port',
        'header_up Host {host}',
        'header_up X-Forwarded-For {remote_host}',
        'header_up X-Real-IP {remote_host}',
        'header_up X-Forwarded-Proto {scheme}',
        'header_up X-Forwarded-Host {host}',
        'header_up X-Forwarded-Port {server_port}',
      ],
    },
    {
      path: envFile,
      name: 'production env template',
      required: [
        'WORKLEDGER_ORIGIN_HOST=',
        'WORKLEDGER_ORIGIN=',
        'WORKLEDGER_AUTH_SECRET_FILE=',
        'WORKLEDGER_DATABASE_URL_FILE=',
        'WORKLEDGER_POSTGRES_PASSWORD_FILE=',
        'POSTGRES_DB=',
        'POSTGRES_USER=',
      ],
    },
  ];

  let passed = true;

  for (const check of checks) {
    if (!existsSync(check.path)) {
      console.error(`${check.name} not found: ${check.path}`);
      passed = false;
      continue;
    }

    const contents = readFileSync(check.path, 'utf8');

    for (const fragment of check.required) {
      if (!contents.includes(fragment)) {
        console.error(`${check.name} does not contain required text: ${fragment}`);
        passed = false;
      }
    }

    if (check.path === envFile) {
      if (hasDirectAssignment(contents, 'WORKLEDGER_AUTH_SECRET')) {
        console.error(
          'Environment file must use WORKLEDGER_AUTH_SECRET_FILE, not direct WORKLEDGER_AUTH_SECRET.',
        );
        passed = false;
      }
      if (hasDirectAssignment(contents, 'WORKLEDGER_DATABASE_URL')) {
        console.error(
          'Environment file must use WORKLEDGER_DATABASE_URL_FILE, not direct WORKLEDGER_DATABASE_URL.',
        );
        passed = false;
      }
      if (hasDirectAssignment(contents, 'WORKLEDGER_POSTGRES_PASSWORD')) {
        console.error(
          'Environment file must use WORKLEDGER_POSTGRES_PASSWORD_FILE, not direct WORKLEDGER_POSTGRES_PASSWORD.',
        );
        passed = false;
      }
      if (/(workledger_owner_password|workledger_test_password)/u.test(contents)) {
        console.error('Environment file references local placeholder password values.');
        passed = false;
      }
    }
  }

  if (passed) {
    console.log('Static file checks passed.');
  }

  return passed;
}

function hasDirectAssignment(contents, variableName) {
  return contents.split(/\r?\n/u).some((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return false;
    }
    if (!trimmed.startsWith(`${variableName}=`)) {
      return false;
    }
    const value = trimmed.slice(variableName.length + 1).trim();
    return value.length > 0;
  });
}

function checkComposeConfig({ composeFile, envFile }) {
  if (!existsSync(envFile)) {
    console.error(`Environment file not found for compose config test: ${envFile}`);
    return false;
  }
  if (!existsSync(composeFile)) {
    console.error(`Compose file not found: ${composeFile}`);
    return false;
  }

  const composeResult = spawnSync(
    'docker',
    ['compose', '--env-file', envFile, '-f', composeFile, 'config'],
    {
      encoding: 'utf8',
      timeout: 20_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (composeResult.status !== 0) {
    console.error('docker compose config failed:');
    console.error(composeResult.stderr ?? composeResult.stdout);
    return false;
  }

  const configText = composeResult.stdout ?? '';
  if (configText.length === 0) {
    console.error('docker compose config produced empty output.');
    return false;
  }

  const containsInlineSecrets =
    /(WORKLEDGER_AUTH_SECRET|WORKLEDGER_DATABASE_URL|WORKLEDGER_POSTGRES_PASSWORD)=/u.test(
      configText,
    );
  if (containsInlineSecrets) {
    console.error('compose config output appears to include direct secret values.');
    return false;
  }

  if (hasServicePorts(configText, 'api')) {
    console.error('API service should not expose host ports in compose config.');
    return false;
  }
  if (hasServicePorts(configText, 'postgres')) {
    console.error('PostgreSQL service should not expose host ports in compose config.');
    return false;
  }
  if (!hasServicePorts(configText, 'caddy')) {
    console.error('Caddy service should expose public ports in compose config.');
    return false;
  }

  const serviceBlock = extractServiceBlock(configText, 'api');
  if (!serviceBlock.includes('image:') && !serviceBlock.includes('build:')) {
    console.error('compose config output did not include an executable api service block.');
    return false;
  }

  console.log('Compose config check passed.');
  return true;
}

function checkComposeNetworkPorts(composeFile) {
  if (!existsSync(composeFile)) {
    console.error(`Compose file not found: ${composeFile}`);
    return false;
  }

  const composeText = readFileSync(composeFile, 'utf8');
  if (hasServicePorts(composeText, 'api')) {
    console.error('API service should not expose host ports in production compose.');
    return false;
  }
  if (hasServicePorts(composeText, 'postgres')) {
    console.error('PostgreSQL service should not expose host ports in production compose.');
    return false;
  }
  if (!hasServicePorts(composeText, 'caddy')) {
    console.error('Caddy service should publish public ports in production compose.');
    return false;
  }

  const dataNetworkPrivate = /^\s*internal:\s*true/mu.test(
    extractServiceBlock(composeText, 'data'),
  );
  if (!dataNetworkPrivate) {
    console.error('Compose model does not mark data network as internal/private.');
    return false;
  }

  const edgeServiceBlock = extractServiceBlock(composeText, 'edge');
  if (!/subnet:\s*172\.30\.40\.0\/24/u.test(edgeServiceBlock)) {
    console.error('Compose edge network is not pinned to the expected fixed CIDR.');
    return false;
  }

  console.log('Compose private-network checks passed.');
  return true;
}

function checkProxyHardening(caddyFile) {
  if (!existsSync(caddyFile)) {
    console.error(`Caddyfile not found: ${caddyFile}`);
    return false;
  }

  const caddyText = readFileSync(caddyFile, 'utf8');
  const requiredHeaders = [
    'output discard',
    'redir @http_to_https',
    'header_up -Forwarded',
    'header_up -X-Forwarded-For',
    'header_up -X-Forwarded-Proto',
    'header_up -X-Forwarded-Host',
    'header_up -X-Forwarded-Port',
    'header_up Host {host}',
    'header_up X-Forwarded-For {remote_host}',
    'header_up X-Real-IP {remote_host}',
    'header_up X-Forwarded-Proto {scheme}',
    'header_up X-Forwarded-Host {host}',
    'header_up X-Forwarded-Port {server_port}',
  ];

  for (const header of requiredHeaders) {
    if (!caddyText.includes(header)) {
      console.error(`Caddyfile is missing proxy-header hardening line: ${header}`);
      return false;
    }
  }

  console.log('Caddy header hardening checks passed.');
  return true;
}

async function requestCheck(url, options, checkName) {
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      signal: AbortSignal.timeout(options.timeoutMs),
      cache: 'no-store',
    });

    const status = response.status;

    if (
      Array.isArray(options.expectStatus)
        ? !options.expectStatus.includes(status)
        : status !== options.expectStatus
    ) {
      console.error(
        `Runtime check failed [${checkName}]: expected status ${options.expectStatus} from ${url}, got ${status}.`,
      );
      return false;
    }

    if (options.expectBody) {
      const body = await response.text();
      if (!body.includes(options.expectBody)) {
        console.error(
          `Runtime check failed [${checkName}]: expected body containing "${options.expectBody}" from ${url}.`,
        );
        return false;
      }
    }

    console.log(`Runtime check passed: ${checkName}`);
    return true;
  } catch (error) {
    console.error(`Runtime check failed [${checkName}]: ${error.message}`);
    return false;
  }
}

async function requestHeaderCheck(url, checkName, timeoutMs) {
  const response = await fetch(url, {
    method: 'HEAD',
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((error) => {
    console.error(`Runtime check failed [${checkName}]: ${error.message}`);
    return null;
  });

  if (!response) {
    return false;
  }

  if (response.status !== 200 && response.status !== 503) {
    console.error(
      `Runtime check failed [${checkName}]: expected status 200 or 503, got ${response.status}.`,
    );
    return false;
  }

  const requiredHeaders = [
    'strict-transport-security',
    'x-content-type-options',
    'content-security-policy',
    'permissions-policy',
    'referrer-policy',
  ];

  const headers = response.headers;
  for (const header of requiredHeaders) {
    if (!headers.has(header)) {
      console.error(`Runtime check failed [${checkName}]: missing ${header}.`);
      return false;
    }
  }

  if (headers.get('access-control-allow-origin')) {
    console.error(`Runtime check failed [${checkName}]: unexpected CORS allow-origin header.`);
    return false;
  }

  console.log(`Runtime header check passed: ${checkName}`);
  return true;
}

async function requestForgedHeaderCheck(url, timeoutMs) {
  const normal = await requestCheck(
    url,
    { expectStatus: 200, expectBody: '{"status":"ready"}', timeoutMs },
    'forged-headers-base',
  );
  if (!normal) {
    return false;
  }

  const forged = await requestCheck(
    url,
    {
      expectStatus: 200,
      expectBody: '{"status":"ready"}',
      timeoutMs,
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'attacker.example.test',
        'x-forwarded-for': '198.51.100.7',
        'x-forwarded-port': '65533',
      },
    },
    'forged-headers-probe',
  );
  if (!forged) {
    return false;
  }

  console.log('Forged forwarded-header probe passed.');
  return true;
}

async function checkHostPortBlocked(host, port, name) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(CHECK_TIMEOUT_MS);

    socket.on('error', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('connect', () => {
      socket.destroy();
      resolve(false);
    });
  }).then((isBlocked) => {
    if (!isBlocked) {
      console.error(`Runtime check failed: ${name} unexpectedly reachable on ${host}:${port}.`);
    } else {
      console.log(`Runtime host-port check passed: ${name} on ${host}:${port} blocked.`);
    }
    return isBlocked;
  });
}

function extractServiceBlock(text, serviceName) {
  const serviceHeader = new RegExp(`^\\s{2}${escapeRegExp(serviceName)}:\\s*$`, 'm');
  const match = text.match(serviceHeader);
  if (!match || match.index === undefined) {
    return '';
  }

  const afterHeader = text.slice(match.index + match[0].length);
  const nextMatch = afterHeader.match(/^\s{2}[A-Za-z0-9_-]+:\s*$/m);
  if (!nextMatch || nextMatch.index === undefined) {
    return afterHeader;
  }

  return afterHeader.slice(0, nextMatch.index);
}

function hasServicePorts(text, serviceName) {
  const block = extractServiceBlock(text, serviceName);
  return /^\s{4}ports:\s*$/m.test(block);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
