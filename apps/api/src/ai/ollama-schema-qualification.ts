import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import type { AiProvider, AiProviderRequestOptions, OllamaAiProviderConfig } from './contracts.js';
import { findOllamaCompatibilityProfile } from './ollama-compatibility.js';
import {
  OLLAMA_SCHEMA_CHALLENGE_IDS,
  OLLAMA_SCHEMA_SUITE_REVISION,
  createOllamaSchemaChallenge,
  validateOllamaSchemaChallenge,
} from './ollama-schema-challenges.js';

const count = z.number().int().nonnegative();
const digest = z.string().regex(/^[a-f0-9]{64}$/u);
const resultSchema = z.strictObject({
  caseId: z.enum(OLLAMA_SCHEMA_CHALLENGE_IDS),
  repetition: z.number().int().min(1).max(3),
  latencyMs: count,
  inputTokens: count.nullable(),
  outputTokens: count.nullable(),
  failure: z.enum(['SCHEMA_INVALID', 'PROVIDER_FAILURE']).nullable(),
});
const artifactSchema = z
  .strictObject({
    artifactVersion: z.literal(1),
    suiteRevision: z.literal(OLLAMA_SCHEMA_SUITE_REVISION),
    profileId: z.string().regex(/^[a-z0-9-]{1,80}$/u),
    serverVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
    modelDigest: digest,
    modelConfigDigest: digest,
    evaluatedAt: z.iso.datetime(),
    inference: z.strictObject({
      timeoutMs: z.literal(120000),
      concurrencyLimit: z.literal(1),
      maximumGeneratedTokens: z.literal(1024),
      think: z.literal(false),
      temperature: z.literal(0),
    }),
    healthPassed: z.boolean(),
    identityPassed: z.boolean(),
    complete: z.boolean(),
    results: z.array(resultSchema).max(18),
  })
  .superRefine((artifact, context) => {
    const invalid = () =>
      context.addIssue({ code: 'custom', message: 'Invalid qualification evidence.' });
    if (!artifact.healthPassed && (artifact.results.length !== 0 || artifact.identityPassed))
      invalid();
    artifact.results.forEach((result, index) => {
      if (
        result.caseId !== OLLAMA_SCHEMA_CHALLENGE_IDS[Math.floor(index / 3)] ||
        result.repetition !== (index % 3) + 1
      )
        invalid();
      if (result.failure !== null && index !== artifact.results.length - 1) invalid();
    });
    const passed =
      artifact.healthPassed &&
      artifact.identityPassed &&
      artifact.results.length === 18 &&
      artifact.results.every((result) => result.failure === null);
    if (artifact.complete !== passed) invalid();
  });

export type OllamaSchemaQualificationArtifact = z.infer<typeof artifactSchema>;

export function parseOllamaSchemaQualificationArtifact(
  value: unknown,
): OllamaSchemaQualificationArtifact {
  const parsed = artifactSchema.safeParse(value);
  if (!parsed.success) throw new Error('Invalid schema qualification artifact.');
  return parsed.data;
}

/** Explicit runner only: never invoked from application startup or ordinary employee requests. */
export async function runOllamaSchemaQualification(
  config: OllamaAiProviderConfig,
  provider: Pick<AiProvider, 'checkHealth' | 'generate'> & {
    checkIdentity(options?: AiProviderRequestOptions): Promise<void>;
  },
  options: AiProviderRequestOptions & {
    checkpoint?: (artifact: OllamaSchemaQualificationArtifact) => Promise<void>;
  } = {},
): Promise<OllamaSchemaQualificationArtifact> {
  const profile = findOllamaCompatibilityProfile(config.compatibilityProfile);
  if (
    profile === undefined ||
    config.model !== profile.model ||
    config.modelDigest !== profile.modelDigest ||
    config.timeoutMs !== 120000 ||
    config.concurrencyLimit !== 1
  ) {
    throw new Error('Schema qualification requires a reviewed profile and pinned controls.');
  }
  const results: OllamaSchemaQualificationArtifact['results'] = [];
  let healthPassed = false;
  let identityPassed = false;
  const snapshot = (): OllamaSchemaQualificationArtifact => {
    return parseOllamaSchemaQualificationArtifact({
      artifactVersion: 1,
      suiteRevision: OLLAMA_SCHEMA_SUITE_REVISION,
      profileId: profile.id,
      serverVersion: profile.serverVersion,
      modelDigest: profile.modelDigest,
      modelConfigDigest: profile.modelConfigDigest,
      evaluatedAt: new Date().toISOString(),
      inference: {
        timeoutMs: 120000,
        concurrencyLimit: 1,
        maximumGeneratedTokens: 1024,
        think: false,
        temperature: 0,
      },
      healthPassed,
      identityPassed,
      complete:
        healthPassed &&
        identityPassed &&
        results.length === 18 &&
        results.every((result) => result.failure === null),
      results,
    });
  };
  async function checkpoint(): Promise<void> {
    await options.checkpoint?.(snapshot());
  }
  const requestOptions = options.signal === undefined ? {} : { signal: options.signal };
  // Persistence must succeed before any health or model operation.
  await checkpoint();
  healthPassed = (await provider.checkHealth(requestOptions)).status === 'ready';
  await checkpoint();
  if (healthPassed) {
    challengeLoop: for (const caseId of OLLAMA_SCHEMA_CHALLENGE_IDS) {
      for (let repetition = 1; repetition <= 3; repetition += 1) {
        const start = performance.now();
        let inputTokens: number | null = null;
        let outputTokens: number | null = null;
        let failure: 'SCHEMA_INVALID' | 'PROVIDER_FAILURE' | null = null;
        try {
          const response = await provider.generate(
            createOllamaSchemaChallenge(caseId),
            requestOptions,
          );
          inputTokens = response.usage?.inputTokens ?? null;
          outputTokens = response.usage?.outputTokens ?? null;
          if (
            response.toolCalls.length !== 0 ||
            !validateOllamaSchemaChallenge(caseId, response.content)
          )
            failure = 'SCHEMA_INVALID';
        } catch {
          failure = 'PROVIDER_FAILURE';
        }
        results.push({
          caseId,
          repetition,
          latencyMs: Math.round(performance.now() - start),
          inputTokens,
          outputTokens,
          failure,
        });
        await checkpoint();
        if (failure !== null) break challengeLoop;
      }
    }
  }
  if (healthPassed) {
    try {
      await provider.checkIdentity(requestOptions);
      identityPassed = true;
    } catch {
      // The boolean records failure; provider error contents are never retained.
      identityPassed = false;
    }
  }
  await checkpoint();
  return snapshot();
}
