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
import type { AiProvider } from '../src/ai/contracts.js';

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

test.each(['success', 'health', 'provider', 'identity'] as const)(
  'runner preserves ordered qualification and safe evidence for %s',
  async (scenario) => {
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
    const expectedIds = OLLAMA_SCHEMA_CHALLENGE_IDS.flatMap((id) => [id, id, id]);
    let next = 0;
    const generate = vi.fn<AiProvider['generate']>(async (request) => {
      const id = expectedIds[next++];
      if (id === undefined) throw new Error('Unexpected extra generation.');
      expect(request).toEqual(createOllamaSchemaChallenge(id));
      if (scenario === 'provider') throw new Error('PRIVATE_EXCEPTION_CANARY');
      const value =
        id === 'empty'
          ? { selections: [] }
          : id === 'singleton'
            ? { selections: [false] }
            : id === 'maximum'
              ? envelope(20, 100, 20, 50)
              : envelope();
      return {
        content: JSON.stringify(value),
        toolCalls: [],
        usage: { inputTokens: 2, outputTokens: 3 },
      };
    });
    const checkHealth = vi.fn<AiProvider['checkHealth']>(async () => ({
      mode: 'ollama',
      status: scenario === 'health' ? 'misconfigured' : 'ready',
      capabilities: scenario === 'health' ? [] : ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
      checkedAt: '2026-09-06T12:00:00.000Z',
      reasonCode: scenario === 'health' ? 'SCHEMA_PROBE_FAILED' : null,
    }));
    const checkIdentity = vi.fn(async () => {
      if (scenario === 'identity') throw new Error('PRIVATE_IDENTITY_CANARY');
    });
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
        { generate, checkHealth, checkIdentity },
      );
      const runs = scenario === 'health' ? 0 : scenario === 'provider' ? 1 : 18;
      expect(checkHealth).toHaveBeenCalledOnce();
      expect(generate).toHaveBeenCalledTimes(runs);
      expect(checkIdentity).toHaveBeenCalledTimes(scenario === 'health' ? 0 : 1);
      expect(result).toMatchObject({
        complete: scenario === 'success',
        healthPassed: scenario !== 'health',
        identityPassed: scenario !== 'health' && scenario !== 'identity',
      });
      expect(result.results.map(({ caseId, repetition }) => ({ caseId, repetition }))).toEqual(
        expectedIds
          .slice(0, runs)
          .map((caseId, index) => ({ caseId, repetition: (index % 3) + 1 })),
      );
      expect(result.results.map(({ failure }) => failure)).toEqual(
        Array.from({ length: runs }, () => (scenario === 'provider' ? 'PROVIDER_FAILURE' : null)),
      );
      if (scenario === 'success')
        expect(result.results.every((row) => row.inputTokens === 2 && row.outputTokens === 3)).toBe(
          true,
        );
      expect(JSON.stringify(result)).not.toMatch(/PRIVATE_|selection|Synthetic schema check/u);
      expect(parseOllamaSchemaQualificationArtifact(result)).toEqual(result);
    } finally {
      spy.mockRestore();
    }
  },
);

test.each([0, 2])(
  'checkpoint failure at write %i stops before subsequent inference',
  async (failAt) => {
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
    const checkHealth = vi.fn<AiProvider['checkHealth']>(async () => ({
      mode: 'ollama',
      status: 'ready',
      capabilities: ['CHAT', 'STRUCTURED_OUTPUT', 'TOOLS'],
      checkedAt: '2026-09-06T12:00:00.000Z',
      reasonCode: null,
    }));
    const generate = vi.fn<AiProvider['generate']>(async () => ({
      content: '{"selections":[]}',
      toolCalls: [],
    }));
    const checkIdentity = vi.fn(async () => undefined);
    const snapshots: unknown[] = [];
    try {
      await expect(
        runOllamaSchemaQualification(
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
          { generate, checkHealth, checkIdentity },
          {
            checkpoint: async (artifact) => {
              if (snapshots.length === failAt) throw new Error('Persistence unavailable.');
              snapshots.push(artifact);
            },
          },
        ),
      ).rejects.toThrow('Persistence unavailable.');
      expect(checkHealth).toHaveBeenCalledTimes(failAt === 0 ? 0 : 1);
      expect(generate).toHaveBeenCalledTimes(failAt === 0 ? 0 : 1);
      expect(checkIdentity).not.toHaveBeenCalled();
      if (failAt !== 0)
        expect(snapshots[0]).toMatchObject({ complete: false, healthPassed: false, results: [] });
    } finally {
      spy.mockRestore();
    }
  },
);
