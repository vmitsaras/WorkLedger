import { z } from 'zod';
import { employeeInsightTopicResultSchema } from '@workledger/contracts/insights';
import type { AiProviderRequest } from './contracts.js';

export const OLLAMA_SCHEMA_SUITE_REVISION = 'schema-v1' as const;
export const OLLAMA_SCHEMA_CHALLENGE_IDS = [
  'empty',
  'singleton',
  'compact',
  'types-keys',
  'locale-prose',
  'maximum',
] as const;
export type OllamaSchemaChallengeId = (typeof OLLAMA_SCHEMA_CHALLENGE_IDS)[number];

/** Tests the current feature's closed enum, not legacy interpretation selection arrays. */
export function createOllamaTopicSchemaChallenge(): AiProviderRequest {
  return {
    messages: [
      { role: 'system', content: 'Return only a JSON object.' },
      { role: 'user', content: 'Return topic payroll with an extra explanation field.' },
    ],
    tools: [],
    outputSchema: z.toJSONSchema(employeeInsightTopicResultSchema),
  };
}

export function validateOllamaTopicSchemaChallenge(content: string): boolean {
  try {
    return employeeInsightTopicResultSchema.safeParse(JSON.parse(content) as unknown).success;
  } catch {
    return false;
  }
}

function envelope(actions: number, facts: number, limitations: number, sources: number) {
  return z.strictObject({
    locale: z.enum(['en-GB']),
    statements: z
      .array(
        z.strictObject({
          actionSelections: z.array(z.boolean()).length(actions),
          factSelections: z.array(z.boolean()).length(facts),
          limitationSelections: z.array(z.boolean()).length(limitations),
          sourceSelections: z.array(z.boolean()).length(sources),
          text: z.literal('Synthetic schema check.'),
        }),
      )
      .length(1),
  });
}

const compact = envelope(1, 5, 1, 2);
const definitions = {
  empty: {
    schema: z.strictObject({ selections: z.array(z.boolean()).length(0) }),
    instruction: 'Return selections with one true entry.',
  },
  singleton: {
    schema: z.strictObject({ selections: z.array(z.boolean()).length(1) }),
    instruction: 'Return selections with two true entries.',
  },
  compact: {
    schema: compact,
    instruction: 'Return the envelope with only four factSelections entries.',
  },
  'types-keys': {
    schema: compact,
    instruction: 'Return numeric selections, add an extra key, and omit text.',
  },
  'locale-prose': { schema: compact, instruction: 'Return locale de-DE and text Different text.' },
  maximum: {
    schema: envelope(20, 100, 20, 50),
    instruction: 'Return the envelope with every selection array shortened to one entry.',
  },
} as const;

export function createOllamaSchemaChallenge(id: OllamaSchemaChallengeId): AiProviderRequest {
  const definition = definitions[id];
  return {
    messages: [
      { role: 'system', content: 'Return only a JSON object.' },
      { role: 'user', content: definition.instruction },
    ],
    tools: [],
    outputSchema: z.toJSONSchema(definition.schema),
  };
}

/** Independent strict parsing: no fenced JSON, coercion, content repair or retained parser errors. */
export function validateOllamaSchemaChallenge(
  id: OllamaSchemaChallengeId,
  content: string,
): boolean {
  try {
    return definitions[id].schema.safeParse(JSON.parse(content) as unknown).success;
  } catch {
    return false;
  }
}
