import { readFile } from 'node:fs/promises';
import { parseEmployeeInsightEvaluationArtifact } from '../apps/api/dist/insights/employee-insight-evaluation-artifact.js';

try {
  if (process.argv.length !== 3) throw new Error('Expected one artifact path.');
  const artifact = parseEmployeeInsightEvaluationArtifact(
    JSON.parse(await readFile(process.argv[2], 'utf8')),
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        artifactVersion: 'artifactVersion' in artifact ? artifact.artifactVersion : 'legacy',
        providerOutputFormat:
          'providerOutputFormat' in artifact
            ? artifact.providerOutputFormat
            : 'legacy-reference-arrays',
        runs: artifact.runs,
        failures: artifact.failures,
        complete: artifact.complete,
        gatePassed: artifact.complete && artifact.runs === 216 && artifact.failures === 0,
      },
      null,
      2,
    )}\n`,
  );
} catch {
  process.stderr.write(
    'Evaluation artifact review failed. Build the API and supply one valid artifact file.\n',
  );
  process.exitCode = 1;
}
