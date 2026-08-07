import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

type AxeNode = {
  readonly target: readonly unknown[];
};

export type AxeViolation = {
  readonly id: string;
  readonly impact?: string | null | undefined;
  readonly help: string;
  readonly nodes: readonly AxeNode[];
};

type AxeRunOptions = {
  readonly runOnly?: {
    readonly type: 'tag' | 'tags';
    readonly values: readonly string[];
  };
};

type AxeCoreApi = {
  run(
    context: Element | Document,
    options: AxeRunOptions,
  ): Promise<{
    readonly violations: readonly AxeViolation[];
  }>;
};

const axeCore = require('axe-core') as AxeCoreApi;

export const wcagAaTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

export function formatAxeViolations(violations: readonly AxeViolation[]): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.map(String).join(' ')).join(', ');
      return `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help} [${targets}]`;
    })
    .join('\n');
}

export async function collectAxeViolations(
  context: Element | Document,
): Promise<readonly AxeViolation[]> {
  const results = await axeCore.run(context, {
    runOnly: {
      type: 'tag',
      values: [...wcagAaTags],
    },
  });

  return results.violations;
}

export async function expectNoAxeViolations(context: Element | Document): Promise<void> {
  const violations = await collectAxeViolations(context);
  if (violations.length > 0) {
    throw new Error(`Expected no axe violations:\n${formatAxeViolations(violations)}`);
  }
}
