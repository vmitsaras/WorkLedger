import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

export const EXPECTED_NODE_VERSION = '24.18.0';
export const EXPECTED_PACKAGE_MANAGER = 'pnpm@11.20.0';
export const EXPECTED_WORKSPACE_CONFIG = `packages:
  - apps/*
  - packages/*

sharedWorkspaceLockfile: true
linkWorkspacePackages: false
saveWorkspaceProtocol: rolling
savePrefix: ''
disallowWorkspaceCycles: true
engineStrict: true
nodeVersion: ${EXPECTED_NODE_VERSION}
pmOnFail: download
allowBuilds:
  esbuild: true`;

export const EXPECTED_PROJECTS = [
  {
    directory: 'apps/api',
    name: '@workledger/api',
    kind: 'application',
    runtimeDependencies: ['@workledger/contracts', '@workledger/database', '@workledger/domain'],
    developmentDependencies: ['@workledger/config', '@workledger/test-utils'],
  },
  {
    directory: 'apps/web',
    name: '@workledger/web',
    kind: 'application',
    runtimeDependencies: ['@workledger/contracts', '@workledger/ui'],
    developmentDependencies: ['@workledger/config', '@workledger/test-utils'],
  },
  {
    directory: 'packages/config',
    name: '@workledger/config',
    kind: 'package',
    runtimeDependencies: [],
    developmentDependencies: [],
  },
  {
    directory: 'packages/contracts',
    name: '@workledger/contracts',
    kind: 'package',
    runtimeDependencies: [],
    developmentDependencies: ['@workledger/config'],
  },
  {
    directory: 'packages/database',
    name: '@workledger/database',
    kind: 'package',
    runtimeDependencies: ['@workledger/domain'],
    developmentDependencies: ['@workledger/config', '@workledger/test-utils'],
  },
  {
    directory: 'packages/domain',
    name: '@workledger/domain',
    kind: 'package',
    runtimeDependencies: [],
    developmentDependencies: ['@workledger/config'],
  },
  {
    directory: 'packages/test-utils',
    name: '@workledger/test-utils',
    kind: 'package',
    runtimeDependencies: ['@workledger/contracts', '@workledger/domain'],
    developmentDependencies: ['@workledger/config'],
  },
  {
    directory: 'packages/ui',
    name: '@workledger/ui',
    kind: 'package',
    runtimeDependencies: [],
    developmentDependencies: ['@workledger/config', '@workledger/test-utils'],
  },
];

export const EXPECTED_PACKAGE_EXPORTS = {
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
  },
};

export const EXPECTED_CONFIG_EXPORTS = {
  ...EXPECTED_PACKAGE_EXPORTS,
  './eslint': './eslint/index.js',
  './prettier': './prettier/index.js',
  './typescript/base.json': './typescript/tsconfig.base.json',
  './vitest': './vitest/index.js',
};

export const EXPECTED_UI_EXPORTS = {
  ...EXPECTED_PACKAGE_EXPORTS,
  './styles.css': './src/styles.css',
};

const EXPECTED_PROJECT_SCRIPTS = {
  build: 'tsc --build tsconfig.json --pretty false',
  typecheck: 'tsc --build tsconfig.json --pretty false',
};
export const EXPECTED_WEB_BUILD_SCRIPT = 'tsc --build tsconfig.json --pretty false && vite build';
const INTERNAL_SCOPE = '@workledger/';
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const REQUIRED_SCRIPTS = [
  'toolchain:check',
  'workspace:check',
  'phase:check',
  'config:check',
  'db:up',
  'db:down',
  'db:reset',
  'db:check',
  'db:test',
  'db:verify',
  'db:seed:development',
  'openapi:generate',
  'openapi:check',
  'format',
  'format:check',
  'lint',
  'typecheck',
  'test',
  'test:integration',
  'test:e2e',
  'build',
];
const SEMANTIC_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const REQUIRED_CONFIGURATION_FILES = [
  '.env.example',
  '.editorconfig',
  '.prettierignore',
  'eslint.config.js',
  'prettier.config.js',
  'tsconfig.json',
  ...EXPECTED_PROJECTS.map(({ directory }) => `${directory}/tsconfig.json`),
  'packages/config/eslint/index.js',
  'packages/config/prettier/index.js',
  'packages/config/typescript/tsconfig.base.json',
  'packages/config/vitest/index.js',
  'playwright.config.ts',
  'apps/api/src/config.ts',
  'apps/api/src/runtime-environment.ts',
  'apps/api/src/server.ts',
  '.env.production.example',
  'Dockerfile',
  'infra/compose/production.yml',
  'infra/docker/caddy/Caddyfile',
  'infra/compose/postgres.dev.yml',
  'infra/docker/postgres/init/001-workledger-local.sql',
  'packages/database/drizzle.config.ts',
  'packages/database/migrations/0000_initial_schema.sql',
  'packages/database/migrations/0001_integrity_constraints.sql',
  'packages/database/migrations/meta/_journal.json',
  'scripts/check-postgres-dev.mjs',
  'scripts/check-api-runtime-config.mjs',
  'scripts/check-web-bundle-budget.mjs',
  'scripts/generate-openapi.mjs',
  'openapi/workledger.openapi.json',
  'scripts/run-postgres-integration.mjs',
  'test/setup/vitest-dom.ts',
  'vitest.config.ts',
  'components.json',
  'apps/web/index.html',
  'apps/web/vite.config.ts',
];
const ALTERNATE_LOCKFILES = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
];

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read valid JSON from ${filePath}: ${error.message}`, { cause: error });
  }
}

function discoverProjects(rootDirectory) {
  const projects = [];

  for (const parentName of ['apps', 'packages']) {
    const parentPath = path.join(rootDirectory, parentName);
    if (!existsSync(parentPath)) continue;

    for (const entry of readdirSync(parentPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const relativeDirectory = `${parentName}/${entry.name}`;
      const manifestPath = path.join(parentPath, entry.name, 'package.json');
      const typeScriptConfigPath = path.join(parentPath, entry.name, 'tsconfig.json');
      if (!existsSync(manifestPath)) {
        projects.push({ directory: relativeDirectory, manifest: null, typeScriptConfig: null });
        continue;
      }

      projects.push({
        directory: relativeDirectory,
        manifest: readJson(manifestPath),
        typeScriptConfig: existsSync(typeScriptConfigPath) ? readJson(typeScriptConfigPath) : null,
      });
    }
  }

  return projects.sort((left, right) => left.directory.localeCompare(right.directory));
}

export function readWorkspaceState(rootDirectory = process.cwd()) {
  const rootManifestPath = path.join(rootDirectory, 'package.json');
  const workspaceConfigPath = path.join(rootDirectory, 'pnpm-workspace.yaml');
  const nodeVersionPath = path.join(rootDirectory, '.node-version');
  const projects = discoverProjects(rootDirectory);

  return {
    rootManifest: readJson(rootManifestPath),
    rootTypeScriptConfig: readJson(path.join(rootDirectory, 'tsconfig.json')),
    workspaceConfig: readFileSync(workspaceConfigPath, 'utf8').trimEnd(),
    nodeVersion: readFileSync(nodeVersionPath, 'utf8').trim(),
    hasRootLockfile: existsSync(path.join(rootDirectory, 'pnpm-lock.yaml')),
    alternateLockfiles: ALTERNATE_LOCKFILES.filter((fileName) =>
      existsSync(path.join(rootDirectory, fileName)),
    ),
    nestedLockfiles: projects
      .filter(({ directory }) => existsSync(path.join(rootDirectory, directory, 'pnpm-lock.yaml')))
      .map(({ directory }) => `${directory}/pnpm-lock.yaml`),
    missingConfigurationFiles: REQUIRED_CONFIGURATION_FILES.filter(
      (fileName) => !existsSync(path.join(rootDirectory, fileName)),
    ),
    projects,
  };
}

function addPublicationErrors(errors, label, manifest) {
  if ('publishConfig' in manifest) {
    errors.push(`${label} must not define publishConfig.`);
  }

  for (const [scriptName, command] of Object.entries(manifest.scripts ?? {})) {
    if (/^(?:prepublish|prepublishOnly|publish|postpublish)$/.test(scriptName)) {
      errors.push(`${label} must not define the npm publication lifecycle script ${scriptName}.`);
    }
    if (/\b(?:npm|pnpm|yarn)\s+publish\b/.test(command) || /\bchangeset\b/.test(command)) {
      errors.push(`${label} script ${scriptName} must not create a package-publication path.`);
    }
  }
}

function addDependencyErrors(errors, project, projectNames) {
  const { directory, manifest } = project;
  const expectedProject = EXPECTED_PROJECTS.find((candidate) => candidate.directory === directory);
  const expectedDependenciesByField = new Map([
    ['dependencies', new Set(expectedProject?.runtimeDependencies ?? [])],
    ['devDependencies', new Set(expectedProject?.developmentDependencies ?? [])],
    ['optionalDependencies', new Set()],
    ['peerDependencies', new Set()],
  ]);

  for (const field of DEPENDENCY_FIELDS) {
    const expectedDependencies = expectedDependenciesByField.get(field);
    const declaredDependencies = new Set(
      Object.keys(manifest[field] ?? {}).filter((dependencyName) =>
        dependencyName.startsWith(INTERNAL_SCOPE),
      ),
    );

    for (const expectedDependency of expectedDependencies) {
      if (!declaredDependencies.has(expectedDependency)) {
        errors.push(`${directory} must depend on ${expectedDependency} in ${field}.`);
      }
    }
  }

  for (const field of DEPENDENCY_FIELDS) {
    const expectedDependencies = expectedDependenciesByField.get(field);
    for (const [dependencyName, specifier] of Object.entries(manifest[field] ?? {})) {
      if (!dependencyName.startsWith(INTERNAL_SCOPE)) continue;

      if (!projectNames.has(dependencyName)) {
        errors.push(`${directory} declares unknown internal dependency ${dependencyName}.`);
      }
      if (specifier !== 'workspace:*') {
        errors.push(
          `${directory} must declare ${dependencyName} as workspace:* in ${field}; received ${specifier}.`,
        );
      }
      if (!expectedDependencies.has(dependencyName)) {
        errors.push(`${directory} must not depend on ${dependencyName} in ${field}.`);
      }
    }
  }
}

function findCycle(projects) {
  const graph = new Map(projects.map(({ manifest }) => [manifest.name, new Set()]));

  for (const { manifest } of projects) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const dependencyName of Object.keys(manifest[field] ?? {})) {
        if (graph.has(dependencyName)) graph.get(manifest.name).add(dependencyName);
      }
    }
  }

  const visited = new Set();
  const active = new Set();
  const stack = [];

  function visit(projectName) {
    if (active.has(projectName)) {
      const cycleStart = stack.indexOf(projectName);
      return [...stack.slice(cycleStart), projectName];
    }
    if (visited.has(projectName)) return null;

    visited.add(projectName);
    active.add(projectName);
    stack.push(projectName);

    for (const dependencyName of graph.get(projectName)) {
      const cycle = visit(dependencyName);
      if (cycle) return cycle;
    }

    stack.pop();
    active.delete(projectName);
    return null;
  }

  for (const projectName of graph.keys()) {
    const cycle = visit(projectName);
    if (cycle) return cycle;
  }

  return null;
}

function addTypeScriptProjectErrors(errors, project) {
  const { directory, typeScriptConfig } = project;
  const expectedProject = EXPECTED_PROJECTS.find((candidate) => candidate.directory === directory);
  if (!expectedProject) return;

  if (typeScriptConfig === null) {
    errors.push(`${directory} must define tsconfig.json.`);
    return;
  }

  const expectedExtends =
    directory === 'packages/config'
      ? './typescript/tsconfig.base.json'
      : '@workledger/config/typescript/base.json';
  if (typeScriptConfig.extends !== expectedExtends) {
    errors.push(`${directory} must extend ${expectedExtends}.`);
  }
  if ('paths' in (typeScriptConfig.compilerOptions ?? {})) {
    errors.push(`${directory} must not define TypeScript path aliases.`);
  }

  const expectedReferences = expectedProject.runtimeDependencies
    .map((dependencyName) => {
      const dependencyProject = EXPECTED_PROJECTS.find(
        (candidate) => candidate.name === dependencyName,
      );
      return path.posix.relative(directory, dependencyProject.directory);
    })
    .sort();
  const actualReferences = (typeScriptConfig.references ?? [])
    .map((reference) => reference.path)
    .sort();
  if (!isDeepStrictEqual(actualReferences, expectedReferences)) {
    errors.push(
      `${directory} TypeScript references must match its runtime dependency graph exactly.`,
    );
  }
}

export function validateWorkspace(state) {
  const errors = [];
  const { rootManifest } = state;

  if (rootManifest.name !== 'workledger') errors.push('The root package name must be workledger.');
  if (
    typeof rootManifest.version !== 'string' ||
    !SEMANTIC_VERSION_PATTERN.test(rootManifest.version)
  ) {
    errors.push('The root package must use a complete semantic version.');
  }
  if (rootManifest.private !== true) errors.push('The root package must be private.');
  if (rootManifest.license !== 'MIT') errors.push('The root package license must be MIT.');
  if (rootManifest.type !== 'module') errors.push('The root package must use ESM.');
  if (rootManifest.packageManager !== EXPECTED_PACKAGE_MANAGER) {
    errors.push(`The root packageManager must be ${EXPECTED_PACKAGE_MANAGER}.`);
  }
  if (rootManifest.engines?.node !== '24.18.x') {
    errors.push('The root Node engine must be 24.18.x.');
  }
  if (rootManifest.engines?.pnpm !== '>=11.0.0 <12.0.0') {
    errors.push('The root pnpm compatibility engine must be >=11.0.0 <12.0.0.');
  }
  if (
    rootManifest.devEngines?.runtime?.name !== 'node' ||
    rootManifest.devEngines?.runtime?.version !== EXPECTED_NODE_VERSION ||
    rootManifest.devEngines?.runtime?.onFail !== 'download'
  ) {
    errors.push(
      `The development runtime must pin Node ${EXPECTED_NODE_VERSION} with onFail=download.`,
    );
  }
  if ('workspaces' in rootManifest) {
    errors.push('Workspace discovery must be owned only by pnpm-workspace.yaml.');
  }
  for (const scriptName of REQUIRED_SCRIPTS) {
    if (typeof rootManifest.scripts?.[scriptName] !== 'string') {
      errors.push(`The root package must define the ${scriptName} script.`);
    }
  }

  addPublicationErrors(errors, 'Root manifest', rootManifest);

  if (state.workspaceConfig !== EXPECTED_WORKSPACE_CONFIG) {
    errors.push('pnpm-workspace.yaml does not match the accepted WL-100 workspace contract.');
  }
  if (state.nodeVersion !== EXPECTED_NODE_VERSION) {
    errors.push(`.node-version must contain ${EXPECTED_NODE_VERSION}.`);
  }
  if (!state.hasRootLockfile) errors.push('The workspace must have one root pnpm-lock.yaml.');
  if (state.alternateLockfiles.length > 0) {
    errors.push(`Alternate lockfiles are prohibited: ${state.alternateLockfiles.join(', ')}.`);
  }
  if (state.nestedLockfiles.length > 0) {
    errors.push(`Nested pnpm lockfiles are prohibited: ${state.nestedLockfiles.join(', ')}.`);
  }
  if (state.missingConfigurationFiles.length > 0) {
    errors.push(
      `Required workspace configuration files are missing: ${state.missingConfigurationFiles.join(', ')}.`,
    );
  }

  const expectedRootReferences = EXPECTED_PROJECTS.map(({ directory }) => directory).sort();
  const actualRootReferences = (state.rootTypeScriptConfig.references ?? [])
    .map((reference) => reference.path)
    .sort();
  if (
    !isDeepStrictEqual(state.rootTypeScriptConfig.files, []) ||
    !isDeepStrictEqual(actualRootReferences, expectedRootReferences)
  ) {
    errors.push('The root tsconfig.json must be a solution containing exactly the eight projects.');
  }
  if ('paths' in (state.rootTypeScriptConfig.compilerOptions ?? {})) {
    errors.push('The root tsconfig.json must not define path aliases.');
  }

  const expectedDirectories = new Set(EXPECTED_PROJECTS.map(({ directory }) => directory));
  const discoveredDirectories = new Set(state.projects.map(({ directory }) => directory));
  for (const directory of expectedDirectories) {
    if (!discoveredDirectories.has(directory)) {
      errors.push(`Required workspace project ${directory} is missing.`);
    }
  }
  for (const directory of discoveredDirectories) {
    if (!expectedDirectories.has(directory)) {
      errors.push(`Unexpected workspace project ${directory} is outside the accepted workspace.`);
    }
  }

  const projectsWithManifests = state.projects.filter(({ manifest }) => manifest !== null);
  const projectNames = new Set();

  for (const { directory, manifest, typeScriptConfig } of state.projects) {
    if (manifest === null) {
      errors.push(`${directory} is matched by the workspace but has no package.json.`);
      continue;
    }

    const expectedProject = EXPECTED_PROJECTS.find(
      (candidate) => candidate.directory === directory,
    );
    const expectedName = expectedProject?.name ?? `${INTERNAL_SCOPE}${path.basename(directory)}`;
    if (manifest.name !== expectedName) {
      errors.push(`${directory} must use the package name ${expectedName}.`);
    }
    if (projectNames.has(manifest.name)) {
      errors.push(`Workspace package name ${manifest.name} is duplicated.`);
    }
    projectNames.add(manifest.name);
    if (manifest.version !== rootManifest.version) {
      errors.push(`${directory} must use the root package version ${rootManifest.version}.`);
    }
    if (manifest.private !== true) errors.push(`${directory} must be private.`);
    if (manifest.license !== 'MIT') errors.push(`${directory} must use the MIT license.`);
    if (manifest.type !== 'module') errors.push(`${directory} must use ESM.`);
    const expectedProjectScripts = {
      ...EXPECTED_PROJECT_SCRIPTS,
      ...(directory === 'apps/web' ? { build: EXPECTED_WEB_BUILD_SCRIPT } : {}),
    };
    for (const [scriptName, command] of Object.entries(expectedProjectScripts)) {
      if (manifest.scripts?.[scriptName] !== command) {
        errors.push(`${directory} must define the standard ${scriptName} script.`);
      }
    }
    if ('packageManager' in manifest) {
      errors.push(`${directory} must inherit the root packageManager declaration.`);
    }
    if ('workspaces' in manifest) errors.push(`${directory} must not define a nested workspace.`);

    if (expectedProject?.kind === 'application') {
      if (!isDeepStrictEqual(manifest.exports, {})) {
        errors.push(
          `${directory} must use an empty exports map because applications are not importable.`,
        );
      }
    } else if (expectedProject?.kind === 'package') {
      const expectedExports =
        directory === 'packages/config'
          ? EXPECTED_CONFIG_EXPORTS
          : directory === 'packages/ui'
            ? EXPECTED_UI_EXPORTS
            : EXPECTED_PACKAGE_EXPORTS;
      if (!isDeepStrictEqual(manifest.exports, expectedExports)) {
        errors.push(`${directory} must expose only its accepted explicit public surfaces.`);
      }
    }

    addPublicationErrors(errors, directory, manifest);
    addTypeScriptProjectErrors(errors, { directory, manifest, typeScriptConfig });
  }

  const rootInternalDependencies = DEPENDENCY_FIELDS.flatMap((field) =>
    Object.entries(rootManifest[field] ?? {})
      .filter(([dependencyName]) => dependencyName.startsWith(INTERNAL_SCOPE))
      .map(([dependencyName, specifier]) => ({ dependencyName, field, specifier })),
  );
  for (const { dependencyName, field, specifier } of rootInternalDependencies) {
    if (!projectNames.has(dependencyName)) {
      errors.push(`Root manifest declares unknown internal dependency ${dependencyName}.`);
    }
    if (specifier !== 'workspace:*') {
      errors.push(
        `Root manifest must declare ${dependencyName} as workspace:* in ${field}; received ${specifier}.`,
      );
    }
    errors.push(`Root manifest must not depend on ${dependencyName} in ${field}.`);
  }

  for (const project of projectsWithManifests) {
    addDependencyErrors(errors, project, projectNames);
  }

  const cycle = findCycle(projectsWithManifests);
  if (cycle) errors.push(`Workspace dependency cycle detected: ${cycle.join(' -> ')}.`);

  if (errors.length > 0) {
    throw new Error(`Workspace contract failed:\n- ${errors.join('\n- ')}`);
  }

  const countInternalEdges = (field) =>
    projectsWithManifests.reduce(
      (count, { manifest }) =>
        count +
        Object.keys(manifest[field] ?? {}).filter((dependencyName) =>
          dependencyName.startsWith(INTERNAL_SCOPE),
        ).length,
      0,
    );

  return {
    projectCount: projectsWithManifests.length,
    runtimeEdgeCount: countInternalEdges('dependencies'),
    developmentEdgeCount: countInternalEdges('devDependencies'),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const result = validateWorkspace(readWorkspaceState());
    console.log(
      `Workspace contract valid: root + ${result.projectCount} projects, ${result.runtimeEdgeCount} runtime edges, ${result.developmentEdgeCount} development edges, one lockfile, no cycles or publication path.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
