import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { ROOT, resolveToolchain, runChild } from './workflow-process.mjs';
import { verify } from './run-verification.mjs';
import {
  LIFECYCLE,
  STAGES,
  executePilot,
  pilotEnvironment,
  readJson,
  readReference,
  reviewEmployee,
  sha256,
  sourceHashes,
} from './pilot-workflow.mjs';

async function main() {
  const [stage, configPath, ...extra] = process.argv.slice(2);
  if (!Object.hasOwn(STAGES, stage) || !configPath || extra.length)
    throw new Error('Usage: pnpm run pilot <qualify|b|c> <reviewed-config.json>');
  const config = await readJson(path.resolve(configPath));
  const allowedKeys = [
    'candidate',
    'lifecycle',
    'isolationEvidence',
    'qualificationArtifact',
    'qualificationReview',
    'previousB',
  ];
  if (
    !config ||
    Object.keys(config).some((key) => !allowedKeys.includes(key)) ||
    config.lifecycle !== LIFECYCLE
  )
    throw new Error('Invalid reviewed configuration or lifecycle.');
  const candidate = config.candidate;
  if (
    !candidate ||
    Object.keys(candidate).sort().join(',') !== 'model,modelDigest,origin,profileId' ||
    Object.values(candidate).some((value) => typeof value !== 'string')
  )
    throw new Error('Supply the exact candidate origin, model, modelDigest and profileId.');
  await readReference(config.isolationEvidence);
  if (stage !== 'qualify' && (!config.qualificationArtifact || !config.qualificationReview))
    throw new Error('Employee stages require reviewed qualification evidence.');
  if (stage === 'c' && !config.previousB) throw new Error('C requires fresh passing B evidence.');
  const toolchain = resolveToolchain();
  const built = await verify({ checks: ['test:build'], toolchain });
  if (!built.passed) {
    process.exitCode = built.exitCode;
    return;
  }
  const { createRuntimeConfig } = await import('../apps/api/dist/config.js');
  const { findOllamaCompatibilityProfile } =
    await import('../apps/api/dist/ai/ollama-compatibility.js');
  const { parseOllamaSchemaQualificationArtifact } =
    await import('../apps/api/dist/ai/ollama-schema-qualification.js');
  const { parseEmployeeInsightEvaluationArtifact } =
    await import('../apps/api/dist/insights/employee-insight-evaluation-artifact.js');
  // Configuration and evidence parsing are local; the first provider call belongs to the child.
  createRuntimeConfig(pilotEnvironment({}, candidate, STAGES[stage][0], 'output/insights'));
  const profile = findOllamaCompatibilityProfile(candidate.profileId);
  const hashes = await sourceHashes();
  if (stage !== 'qualify') {
    const artifact = parseOllamaSchemaQualificationArtifact(
      await readReference(config.qualificationArtifact),
    );
    const review = await readReference(config.qualificationReview);
    if (
      !artifact.complete ||
      artifact.profileId !== candidate.profileId ||
      artifact.modelDigest !== candidate.modelDigest ||
      artifact.modelConfigDigest !== profile.modelConfigDigest ||
      artifact.serverVersion !== profile.serverVersion ||
      !review.passed ||
      !isDeepStrictEqual(review.candidate, candidate) ||
      review.lifecycle !== LIFECYCLE ||
      !isDeepStrictEqual(review.sourceHashes?.qualification, hashes.qualification) ||
      review.qualificationArtifactSha256 !== config.qualificationArtifact.sha256
    )
      throw new Error(
        'Qualification is incomplete, mismatched or affected sources changed. Record a bounded qualification review before execution.',
      );
  }
  if (stage === 'c') {
    const previous = await readReference(config.previousB);
    if (
      !previous.passed ||
      previous.stage !== 'b' ||
      previous.lifecycle !== LIFECYCLE ||
      !isDeepStrictEqual(previous.candidate, candidate) ||
      !isDeepStrictEqual(previous.sourceHashes, hashes) ||
      previous.qualificationArtifactSha256 !== config.qualificationArtifact.sha256 ||
      previous.groups?.length !== 2 ||
      previous.groups.some(
        (group, index) =>
          group.group !== STAGES.b[index] ||
          !group.passed ||
          group.runs !== 9 ||
          group.outcome.code !== 0,
      )
    )
      throw new Error('C requires a complete B on the same frozen configuration.');
    for (const group of previous.groups) {
      const artifact = parseEmployeeInsightEvaluationArtifact(await readReference(group.artifact));
      if (
        !reviewEmployee({
          outcome: group.outcome,
          health: { healthPassed: true, identityPassed: true },
          artifact,
          group: group.group,
          candidate,
        }).passed
      )
        throw new Error('B artifact contradicts the passing summary.');
    }
  }
  const directory = path.join(ROOT, 'output/insights', `pilot-${stage}-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  console.log(`Pilot evidence: ${directory}`);
  const save = (file, value) =>
    writeFile(path.join(directory, file), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  const provenance = {
    stage,
    candidate,
    lifecycle: LIFECYCLE,
    sourceHashes: hashes,
    isolationEvidenceSha256: config.isolationEvidence.sha256,
    qualificationArtifactSha256: config.qualificationArtifact?.sha256 ?? null,
    nodeVersion: toolchain.nodeVersion,
    pnpmVersion: toolchain.pnpmVersion,
  };
  await save('reservation.json', { ...provenance, state: 'RESERVED' });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const result = await executePilot({
      stage,
      signal: controller.signal,
      unchanged: async () =>
        !controller.signal.aborted && isDeepStrictEqual(hashes, await sourceHashes()),
      record: (entry) => save(`${entry.group}-result.json`, entry),
      invoke: async (group) => {
        console.log(`Starting ${group}; no automatic retries.`);
        const output = path.join(directory, group);
        await mkdir(output);
        const env = pilotEnvironment(toolchain.env, candidate, group, output);
        const args =
          group === 'qualification'
            ? ['scripts/qualify-ollama-schema.mjs']
            : [
                'node_modules/vitest/vitest.mjs',
                'run',
                'apps/api/test/employee-insight-evaluation.integration.test.ts',
                '--project',
                'integration',
                '--maxWorkers=1',
              ];
        const outcome = await runChild(toolchain.node, args, {
          env,
          quiet: true,
          signal: controller.signal,
        });
        if (outcome.interrupted || outcome.launchError)
          return {
            passed: false,
            classification: outcome.interrupted ? 'INTERRUPTED' : 'LAUNCH_FAILED',
            outcome,
          };
        let artifactPath;
        let artifact;
        let health;
        try {
          if (group === 'qualification') {
            const directories = await readdir(output);
            if (directories.length === 0)
              return { passed: false, classification: 'ARTIFACT_MISSING', outcome };
            if (directories.length !== 1)
              return { passed: false, classification: 'ARTIFACT_INVALID', outcome };
            artifactPath = path.join(output, directories[0], 'artifact.json');
          } else artifactPath = path.join(output, 'artifact.json');
          artifact =
            group === 'qualification'
              ? parseOllamaSchemaQualificationArtifact(await readJson(artifactPath))
              : parseEmployeeInsightEvaluationArtifact(await readJson(artifactPath));
        } catch (error) {
          if (error.code !== 'ENOENT')
            return { passed: false, classification: 'ARTIFACT_INVALID', outcome };
        }
        if (group !== 'qualification') {
          try {
            health = await readJson(path.join(output, 'health.json'));
            if (health.healthPassed)
              Object.assign(health, await readJson(path.join(output, 'identity.json')));
          } catch (error) {
            if (error.code !== 'ENOENT')
              return { passed: false, classification: 'HEALTH_ARTIFACT_INVALID', outcome };
          }
        }
        let review;
        if (group === 'qualification') {
          const classification = outcome.interrupted
            ? 'INTERRUPTED'
            : outcome.launchError
              ? 'LAUNCH_FAILED'
              : !artifact
                ? 'ARTIFACT_MISSING'
                : !artifact.healthPassed
                  ? 'HEALTH_FAILED_ZERO_CASES'
                  : !artifact.complete
                    ? 'QUALIFICATION_FAILED'
                    : outcome.code !== 0
                      ? 'CHILD_FAILED'
                      : 'PASSED';
          review = {
            passed: classification === 'PASSED',
            classification,
            runs: artifact?.results.length ?? 0,
          };
        } else review = reviewEmployee({ outcome, health, artifact, group, candidate });
        const reference = artifact
          ? {
              path: path.relative(ROOT, artifactPath).replaceAll('\\', '/'),
              sha256: sha256(await readFile(artifactPath)),
            }
          : null;
        console.log(`${group}: ${review.classification}; ${review.runs} cases`);
        return { ...review, outcome, artifact: reference };
      },
    });
    await save('result.json', {
      ...provenance,
      ...result,
      qualificationArtifactSha256:
        stage === 'qualify'
          ? (result.groups[0]?.artifact?.sha256 ?? null)
          : provenance.qualificationArtifactSha256,
    });
    process.exitCode = result.exitCode;
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error(
      'Pilot preflight/execution failed. Check explicit stage, pinned tools, build and reviewed evidence. No result is a pass without a passing result.json.',
    );
    process.exitCode = 1;
  });
}
