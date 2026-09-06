import { vi } from 'vitest';
import {
  OLLAMA_SCHEMA_CHALLENGE_IDS,
  createOllamaSchemaChallenge,
  validateOllamaSchemaChallenge,
} from '../src/ai/ollama-schema-challenges.js';
import {
  parseOllamaSchemaQualificationArtifact,
  runOllamaSchemaQualification,
} from '../src/ai/ollama-schema-qualification.js';
import * as compatibility from '../src/ai/ollama-compatibility.js';

function envelope(actions = 1, facts = 5, limitations = 1, sources = 2) {
  return {
    locale: 'en-GB',
    statements: [
      {
        actionSelections: Array(actions).fill(false),
        factSelections: Array(facts).fill(false),
        limitationSelections: Array(limitations).fill(false),
        sourceSelections: Array(sources).fill(false),
        text: 'Synthetic schema check.',
      },
    ],
  };
}

test('covers all six challenge cases including empty and maximum native bounds', () => {
  for (const id of OLLAMA_SCHEMA_CHALLENGE_IDS) {
    const content =
      id === 'empty'
        ? { selections: [] }
        : id === 'singleton'
          ? { selections: [false] }
          : id === 'maximum'
            ? envelope(20, 100, 20, 50)
            : envelope();
    expect(validateOllamaSchemaChallenge(id, JSON.stringify(content)), id).toBe(true);
    expect(createOllamaSchemaChallenge(id)).toMatchObject({
      tools: [],
      outputSchema: { type: 'object', additionalProperties: false },
    });
  }
});

test('rejects each conflicting instruction and malformed content without normalizing', () => {
  expect(validateOllamaSchemaChallenge('empty', '{"selections":[true]}')).toBe(false);
  expect(validateOllamaSchemaChallenge('singleton', '{"selections":[false,false]}')).toBe(false);
  expect(validateOllamaSchemaChallenge('compact', JSON.stringify(envelope(1, 4)))).toBe(false);
  expect(validateOllamaSchemaChallenge('compact', JSON.stringify(envelope(1, 6)))).toBe(false);
  expect(validateOllamaSchemaChallenge('maximum', JSON.stringify(envelope()))).toBe(false);
  expect(
    validateOllamaSchemaChallenge('compact', `\`\`\`json\n${JSON.stringify(envelope())}\n\`\`\``),
  ).toBe(false);
  for (const mutation of [
    { ...envelope(), locale: 'de-DE' },
    { ...envelope(), canary: 'SECRET' },
    { ...envelope(), statements: [{ text: 'Different text.' }] },
    {
      ...envelope(),
      statements: [{ ...envelope().statements[0], factSelections: [0, 0, 0, 0, 0] }],
    },
  ])
    expect(validateOllamaSchemaChallenge('compact', JSON.stringify(mutation))).toBe(false);
});

const artifact = {
  artifactVersion: 1,
  suiteRevision: 'schema-v1',
  profileId: 'fixture-only',
  serverVersion: '1.2.3',
  modelDigest: 'a'.repeat(64),
  modelConfigDigest: 'b'.repeat(64),
  evaluatedAt: '2026-09-06T12:00:00.000Z',
  inference: {
    timeoutMs: 120000,
    concurrencyLimit: 1,
    maximumGeneratedTokens: 1024,
    think: false,
    temperature: 0,
  },
  healthPassed: true,
  identityPassed: true,
  complete: true,
  results: OLLAMA_SCHEMA_CHALLENGE_IDS.flatMap((caseId) =>
    [1, 2, 3].map((repetition) => ({
      caseId,
      repetition,
      latencyMs: 1,
      inputTokens: 1,
      outputTokens: 1,
      failure: null,
    })),
  ),
};
test('qualification reader enforces complete ordered coverage and excludes extra retained content', () => {
  expect(parseOllamaSchemaQualificationArtifact(artifact).complete).toBe(true);
  for (const invalid of [
    { ...artifact, raw: 'SECRET' },
    { ...artifact, results: artifact.results.slice(1) },
    { ...artifact, identityPassed: false },
    { ...artifact, results: [...artifact.results].reverse() },
    {
      ...artifact,
      results: artifact.results.map((result) => ({ ...result, selectionBits: [true] })),
    },
  ])
    expect(() => parseOllamaSchemaQualificationArtifact(invalid)).toThrow(
      'Invalid schema qualification artifact.',
    );
});

test('runner stops at the first failure, performs identity review and retains no model content', async () => {
  const profile = {
    id: 'fixture-only',
    model: 'fixture',
    modelDigest: 'a'.repeat(64),
    modelConfigDigest: 'b'.repeat(64),
    serverVersion: '1.2.3',
    parser: 'fixture',
    schemaSuiteRevision: 'schema-v1' as const,
    sourceReviewReferences: [],
  };
  const spy = vi.spyOn(compatibility, 'findOllamaCompatibilityProfile').mockReturnValue(profile);
  const generate = vi.fn(async () => ({ content: 'SECRET', toolCalls: [] }));
  const checkIdentity = vi.fn(async () => undefined);
  try {
    const result = await runOllamaSchemaQualification(
      {
        mode: 'ollama',
        origin: 'http://127.0.0.1:11434',
        model: profile.model,
        modelDigest: profile.modelDigest,
        compatibilityProfile: profile.id,
        timeoutMs: 120000,
        concurrencyLimit: 1,
        requiredCapabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
      },
      {
        generate,
        checkIdentity,
        checkHealth: async () => ({
          mode: 'ollama',
          status: 'ready',
          capabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
          checkedAt: '2026-09-06T12:00:00.000Z',
          reasonCode: null,
        }),
      },
    );
    expect(result).toMatchObject({
      complete: false,
      identityPassed: true,
      results: [{ caseId: 'empty', repetition: 1, failure: 'SCHEMA_INVALID' }],
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(checkIdentity).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain('SECRET');
  } finally {
    spy.mockRestore();
  }
});
