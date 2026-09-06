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

// A profile is evaluation eligibility, never deployment approval.
// Source review and installation provenance: docs/178-wl-1508k-schema-qualification.md.
const profiles: readonly OllamaCompatibilityProfile[] = Object.freeze([
  Object.freeze({
    id: 'ollama-0333-qwen36-schema-v1',
    serverVersion: '0.33.3',
    model: 'qwen3.6:latest',
    modelDigest: '07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522',
    modelConfigDigest: '5d1c86a949f7f3b5e75370e129765af7526f0cc1812a9de21a541da042596faa',
    parser: 'qwen3.5',
    schemaSuiteRevision: 'schema-v1',
    sourceReviewReferences: Object.freeze([
      'https://github.com/ollama/ollama/releases/tag/v0.33.3',
      'https://github.com/ollama/ollama/blob/v0.33.3/server/routes.go',
      'https://github.com/ollama/ollama/blob/v0.33.3/model/parsers/qwen35.go',
      'https://github.com/ollama/ollama/blob/v0.33.3/model/renderers/qwen35.go',
      'https://github.com/ollama/ollama/blob/v0.33.3/llm/llama_server.go',
      'https://github.com/ollama/ollama/blob/v0.33.3/LLAMA_CPP_VERSION',
      'https://github.com/ollama/ollama/blob/v0.33.3/llama/server/CMakeLists.txt',
      'https://github.com/ggml-org/llama.cpp/blob/b10760/common/json-schema-to-grammar.cpp',
    ]),
  }),
]);

export function findOllamaCompatibilityProfile(id: string): OllamaCompatibilityProfile | undefined {
  return profiles.find((profile) => profile.id === id);
}
