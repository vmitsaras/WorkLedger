export interface OllamaCompatibilityProfile {
  readonly id: string;
  readonly serverVersion: string;
  readonly model: string;
  readonly modelDigest: string;
  readonly modelConfigDigest: string;
  readonly parser: string;
  readonly schemaSuiteRevision: 'schema-v1';
  readonly sourceReviewReferences: readonly string[];
}

// WL-1508K must review upstream source before admitting any real evaluation candidate.
// A profile is evaluation eligibility, never deployment approval.
const profiles: readonly OllamaCompatibilityProfile[] = Object.freeze([]);

export function findOllamaCompatibilityProfile(id: string): OllamaCompatibilityProfile | undefined {
  return profiles.find((profile) => profile.id === id);
}
