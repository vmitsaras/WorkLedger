import { builtinModules } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { init, parse } from 'es-module-lexer';

import { EXPECTED_PROJECTS } from './check-workspace.mjs';

const INTERNAL_SCOPE = '@workledger/';
const SOURCE_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const NODE_BUILTINS = new Set(
  builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
);
const NODE_CAPABLE_PROJECTS = new Set([
  'apps/api',
  'packages/config',
  'packages/database',
  'packages/test-utils',
]);
const PROJECT_BY_DIRECTORY = new Map(
  EXPECTED_PROJECTS.map((project) => [project.directory, project]),
);
const PROJECT_BY_NAME = new Map(EXPECTED_PROJECTS.map((project) => [project.name, project]));
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usesTestContext(relativeFile) {
  const normalizedFile = relativeFile.split(path.sep).join('/');
  return (
    /(?:^|\/)(?:__tests__|tests?)\//.test(normalizedFile) ||
    /\.(?:spec|test)\.[^.]+$/.test(normalizedFile)
  );
}

function isWithin(parentDirectory, targetPath) {
  const relativePath = path.relative(parentDirectory, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== '..' &&
      !path.isAbsolute(relativePath))
  );
}

function lineAtOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}

function createError(code, relativeFile, line, specifier, message) {
  return { code, file: relativeFile, line, message, specifier };
}

function validateRelativeImport({
  projectDirectory,
  relativeFile,
  repositoryDirectory,
  specifier,
  line,
}) {
  const importerPath = path.resolve(repositoryDirectory, projectDirectory, relativeFile);
  const targetPath = path.resolve(path.dirname(importerPath), specifier);

  for (const candidate of EXPECTED_PROJECTS) {
    if (candidate.directory === projectDirectory) continue;

    const candidateRoot = path.resolve(repositoryDirectory, candidate.directory);
    if (isWithin(candidateRoot, targetPath)) {
      return createError(
        'sibling-source-import',
        relativeFile,
        line,
        specifier,
        `${projectDirectory} must import ${candidate.name} through its package export, not relative traversal.`,
      );
    }
  }

  return null;
}

function validateInternalImport({ project, relativeFile, specifier, line }) {
  const segments = specifier.split('/');
  const packageName = segments.length >= 2 ? segments.slice(0, 2).join('/') : specifier;
  const importedProject = PROJECT_BY_NAME.get(packageName);

  if (!importedProject) {
    return createError(
      'unknown-internal-import',
      relativeFile,
      line,
      specifier,
      `${project.directory} imports unknown internal package ${packageName}.`,
    );
  }
  if (importedProject.kind === 'application') {
    return createError(
      'application-import',
      relativeFile,
      line,
      specifier,
      `${project.directory} must not import application ${packageName}.`,
    );
  }
  if (packageName === project.name) {
    return createError(
      'self-package-import',
      relativeFile,
      line,
      specifier,
      `${project.directory} must use a local relative import instead of importing itself as ${packageName}.`,
    );
  }
  if (segments.length > 2) {
    return createError(
      'deep-import',
      relativeFile,
      line,
      specifier,
      `${project.directory} must import only the explicit ${packageName} package root.`,
    );
  }

  const isTestFile = usesTestContext(relativeFile);
  if (packageName === '@workledger/config' && !isTestFile) {
    return createError(
      'production-config-import',
      relativeFile,
      line,
      specifier,
      `${project.directory} production source must not import development configuration.`,
    );
  }
  if (packageName === '@workledger/test-utils' && !isTestFile) {
    return createError(
      'production-test-utils-import',
      relativeFile,
      line,
      specifier,
      `${project.directory} production source must not import test utilities.`,
    );
  }

  const allowedDependencies = new Set(project.runtimeDependencies);
  if (isTestFile) {
    for (const dependencyName of project.developmentDependencies) {
      allowedDependencies.add(dependencyName);
    }
  }

  if (!allowedDependencies.has(packageName)) {
    return createError(
      'forbidden-edge',
      relativeFile,
      line,
      specifier,
      `${project.directory} is not allowed to import ${packageName}.`,
    );
  }

  return null;
}

function validateSpecifier({ project, relativeFile, repositoryDirectory, specifier, line }) {
  if (specifier.startsWith('.')) {
    return validateRelativeImport({
      projectDirectory: project.directory,
      relativeFile,
      repositoryDirectory,
      specifier,
      line,
    });
  }
  if (specifier.startsWith(INTERNAL_SCOPE)) {
    return validateInternalImport({ project, relativeFile, specifier, line });
  }
  if (specifier.startsWith('#') || specifier.startsWith('@/') || specifier.startsWith('~/')) {
    return createError(
      'undeclared-path-alias',
      relativeFile,
      line,
      specifier,
      `${project.directory} must not bypass package exports with path alias ${specifier}.`,
    );
  }
  if (
    NODE_BUILTINS.has(specifier) &&
    !usesTestContext(relativeFile) &&
    !NODE_CAPABLE_PROJECTS.has(project.directory)
  ) {
    return createError(
      'forbidden-node-import',
      relativeFile,
      line,
      specifier,
      `${project.directory} production source must remain browser-safe or runtime-neutral.`,
    );
  }

  return null;
}

export async function validateSourceImports({
  projectDirectory,
  relativeFile,
  source,
  repositoryDirectory = repositoryRoot,
}) {
  const project = PROJECT_BY_DIRECTORY.get(projectDirectory);
  if (!project) throw new Error(`Unknown workspace project ${projectDirectory}.`);

  await init;
  const [imports] = parse(source);
  const errors = [];
  let importCount = 0;

  for (const importRecord of imports) {
    if (importRecord.d === -2) continue;
    importCount += 1;

    const line = lineAtOffset(source, importRecord.s);
    if (typeof importRecord.n !== 'string') {
      errors.push(
        createError(
          'nonliteral-dynamic-import',
          relativeFile,
          line,
          '<dynamic>',
          `${projectDirectory} must use a statically analyzable module specifier.`,
        ),
      );
      continue;
    }

    const error = validateSpecifier({
      project,
      relativeFile,
      repositoryDirectory,
      specifier: importRecord.n,
      line,
    });
    if (error) errors.push(error);
  }

  return { errors, importCount };
}

async function collectSourceFiles(directory) {
  const sourceFiles = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (['coverage', 'dist', 'node_modules'].includes(entry.name)) continue;
      sourceFiles.push(...(await collectSourceFiles(entryPath)));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      sourceFiles.push(entryPath);
    }
  }
  return sourceFiles.sort();
}

export async function checkWorkspaceBoundaries(repositoryDirectory = repositoryRoot) {
  const errors = [];
  let fileCount = 0;
  let importCount = 0;

  for (const project of EXPECTED_PROJECTS) {
    const projectDirectory = path.join(repositoryDirectory, project.directory);
    const sourceFiles = await collectSourceFiles(projectDirectory);

    for (const sourceFile of sourceFiles) {
      const relativeFile = path.relative(projectDirectory, sourceFile);
      const result = await validateSourceImports({
        projectDirectory: project.directory,
        relativeFile,
        repositoryDirectory,
        source: await readFile(sourceFile, 'utf8'),
      });
      fileCount += 1;
      importCount += result.importCount;
      errors.push(...result.errors);
    }
  }

  return { errors, fileCount, importCount };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const result = await checkWorkspaceBoundaries();
    if (result.errors.length > 0) {
      const details = result.errors
        .map(
          (error) =>
            `${error.file}:${error.line} [${error.code}] ${error.message} Received ${error.specifier}.`,
        )
        .join('\n- ');
      throw new Error(`Source boundary check failed:\n- ${details}`);
    }

    console.log(
      `Source boundaries valid: ${result.fileCount} files, ${result.importCount} imports, no forbidden/deep/app/test/config/browser-server edge.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
