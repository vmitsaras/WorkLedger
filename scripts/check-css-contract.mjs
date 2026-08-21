import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOKEN_OWNER_FILE = 'packages/ui/src/styles.css';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRECTORIES = ['apps/web/src', 'packages/ui/src'];
const SOURCE_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.ts', '.tsx']);
const REQUIRED_TOKENS = [
  '--wl-color-neutral-0',
  '--wl-surface',
  '--wl-control-min-block-size',
  '--wl-state-success-text',
  '--wl-state-warning-text',
  '--wl-state-danger-text',
  '--wl-motion-duration-fast',
  '--wl-density-comfortable-section-gap',
  '--wl-density-compact-section-gap',
];
const PALETTE_NAMES =
  'red|green|yellow|blue|orange|emerald|amber|lime|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';

function lineAtOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}

function findMatches(source, pattern) {
  return [
    ...source.matchAll(
      new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`),
    ),
  ];
}

function createError(code, file, source, match, message) {
  return {
    code,
    file,
    line: lineAtOffset(source, match.index ?? 0),
    message,
    value: match[1] ?? match[0],
  };
}

async function collectSourceFiles(directory) {
  const sourceFiles = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles.push(...(await collectSourceFiles(entryPath)));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      sourceFiles.push(entryPath);
    }
  }
  return sourceFiles.sort();
}

export function validateCssContractSources(sources, tokenOwnerFile = TOKEN_OWNER_FILE) {
  const normalizedSources = sources.map(({ file, source }) => ({
    file: file.split(path.sep).join('/'),
    source,
  }));
  const tokenOwner = normalizedSources.find(({ file }) => file === tokenOwnerFile);
  const definedClasses = new Set();
  const definedTokens = new Set();
  const errors = [];
  let tokenUseCount = 0;

  for (const { file, source } of normalizedSources) {
    if (file.endsWith('.css')) {
      for (const match of findMatches(source, /\.(wl-[a-z][a-z0-9-]*)\b/g)) {
        definedClasses.add(match[1]);
      }
    }

    for (const match of findMatches(source, /(--wl-[a-z][a-z0-9-]*)\s*:/g)) {
      if (file === tokenOwnerFile) {
        definedTokens.add(match[1]);
      } else {
        errors.push(
          createError(
            'token-owner-violation',
            file,
            source,
            match,
            `${match[1]} must be declared by ${tokenOwnerFile}.`,
          ),
        );
      }
    }
  }

  if (tokenOwner === undefined) {
    errors.push({
      code: 'missing-token-owner',
      file: tokenOwnerFile,
      line: 1,
      message: `The CSS contract requires ${tokenOwnerFile}.`,
      value: tokenOwnerFile,
    });
  } else {
    if (!/@layer\s+workledger-tokens\b/u.test(tokenOwner.source)) {
      errors.push({
        code: 'missing-token-layer',
        file: tokenOwnerFile,
        line: 1,
        message: 'The token owner must use the flat workledger-tokens cascade layer.',
        value: 'workledger-tokens',
      });
    }
    if (!/color-scheme:\s*light\s*;/u.test(tokenOwner.source)) {
      errors.push({
        code: 'missing-light-color-scheme',
        file: tokenOwnerFile,
        line: 1,
        message: 'Phase 11 requires an explicit light-only color scheme.',
        value: 'color-scheme: light',
      });
    }
    for (const token of REQUIRED_TOKENS) {
      if (!definedTokens.has(token)) {
        errors.push({
          code: 'missing-token-tier',
          file: tokenOwnerFile,
          line: 1,
          message: `The semantic token inventory is missing required contract ${token}.`,
          value: token,
        });
      }
    }
  }

  const palettePattern = new RegExp(
    `\\b(?:bg|text|border|outline|ring|fill|stroke)-(?:${PALETTE_NAMES})-[0-9]+(?:/[0-9]+)?\\b`,
    'giu',
  );
  const checks = [
    {
      code: 'inert-dark-branch',
      message: 'Phase 11 is light-only; remove inert dark: utilities.',
      pattern: /\b(dark:)/gu,
    },
    {
      code: 'one-off-palette-utility',
      message: 'Map state color utilities through the semantic WorkLedger token families.',
      pattern: palettePattern,
    },
    {
      code: 'ambient-gradient',
      message: 'Quiet Ledger prohibits ambient application/auth gradients.',
      pattern: /\b((?:linear|radial)-gradient\s*\()/giu,
    },
    {
      code: 'legacy-style-contract',
      message: 'Replace the undefined legacy style contract with an owned WorkLedger class.',
      pattern: /\b(wl-card|text-secondary)\b/gu,
    },
  ];

  for (const { file, source } of normalizedSources) {
    for (const match of findMatches(source, /var\(\s*(--wl-[a-z][a-z0-9-]*)\b/g)) {
      tokenUseCount += 1;
      if (!definedTokens.has(match[1])) {
        errors.push(
          createError(
            'undefined-token',
            file,
            source,
            match,
            `${match[1]} has no declaration in ${tokenOwnerFile}.`,
          ),
        );
      }
    }

    if (!file.endsWith('.css')) {
      for (const match of findMatches(
        source,
        /(?:^|[\s'"`])(wl-[a-z][a-z0-9-]*)(?=$|[\s'"`])/gmu,
      )) {
        if (!definedClasses.has(match[1])) {
          errors.push(
            createError(
              'undefined-workledger-class',
              file,
              source,
              match,
              `${match[1]} has no selector in the owned app or UI stylesheets.`,
            ),
          );
        }
      }
    }

    if (file !== tokenOwnerFile) {
      for (const match of findMatches(
        source,
        /(#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch)\s*\()/giu,
      )) {
        errors.push(
          createError(
            'raw-color-outside-token-owner',
            file,
            source,
            match,
            `Literal colors must be mapped through ${tokenOwnerFile}.`,
          ),
        );
      }
    }

    if (file !== tokenOwnerFile) {
      for (const match of findMatches(source, /@layer\s+(workledger(?:\.tokens|-tokens))\b/gu)) {
        errors.push(
          createError(
            'token-layer-owner-violation',
            file,
            source,
            match,
            `Only ${tokenOwnerFile} may open the flat WorkLedger token layer.`,
          ),
        );
      }
    }

    for (const check of checks) {
      for (const match of findMatches(source, check.pattern)) {
        errors.push(createError(check.code, file, source, match, check.message));
      }
    }
  }

  return {
    classCount: definedClasses.size,
    errors: errors.sort(
      (left, right) =>
        left.file.localeCompare(right.file) ||
        left.line - right.line ||
        left.code.localeCompare(right.code),
    ),
    sourceFileCount: normalizedSources.length,
    tokenCount: definedTokens.size,
    tokenUseCount,
  };
}

export async function checkCssContract(repositoryDirectory = repositoryRoot) {
  const sourceFiles = (
    await Promise.all(
      SOURCE_DIRECTORIES.map((directory) =>
        collectSourceFiles(path.join(repositoryDirectory, directory)),
      ),
    )
  ).flat();
  const sources = await Promise.all(
    sourceFiles.map(async (sourceFile) => ({
      file: path.relative(repositoryDirectory, sourceFile),
      source: await readFile(sourceFile, 'utf8'),
    })),
  );
  return validateCssContractSources(sources);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const result = await checkCssContract();
    if (result.errors.length > 0) {
      const details = result.errors
        .map(
          (error) =>
            `${error.file}:${error.line} [${error.code}] ${error.message} Received ${error.value}.`,
        )
        .join('\n- ');
      throw new Error(`CSS contract check failed:\n- ${details}`);
    }

    console.log(
      `CSS contract valid: ${result.sourceFileCount} sources, ${result.tokenCount} owned tokens, ${result.classCount} defined WorkLedger classes, ${result.tokenUseCount} token uses.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
