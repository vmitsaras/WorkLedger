import assert from 'node:assert/strict';
import { test } from 'node:test';
import { topicCases, reviewTopicEvaluation } from './fixtures/employee-topic-evaluation.mjs';

const passing = () =>
  topicCases.flatMap(({ id }) =>
    [1, 2].map((repetition) => ({
      id,
      repetition,
      correct: true,
      failure: null,
      latencyMs: 100,
    })),
  );

test('best-effort topic evaluation retains complete coverage, English accuracy and latency gates', () => {
  assert.equal(reviewTopicEvaluation(passing()).passed, true);
  assert.equal(reviewTopicEvaluation(passing()).strictAcceptancePassed, true);
  assert.equal(reviewTopicEvaluation(passing()).acceptanceVersion, 'english-topics-best-effort-v2');
  assert.equal(reviewTopicEvaluation(passing().slice(1)).passed, false);
  const duplicate = passing();
  duplicate[1] = duplicate[0];
  assert.equal(reviewTopicEvaluation(duplicate).passed, false);
  const wrongTopic = passing();
  wrongTopic[0].correct = false;
  wrongTopic[1].correct = false;
  assert.equal(reviewTopicEvaluation(wrongTopic).passed, true);
  wrongTopic[2].correct = false;
  assert.equal(reviewTopicEvaluation(wrongTopic).passed, false);
  const overall = passing();
  for (const index of [0, 1, 10, 11]) overall[index].correct = false;
  assert.equal(reviewTopicEvaluation(overall).passed, true);
  overall[20].correct = false;
  assert.equal(reviewTopicEvaluation(overall).passed, false);
  const failed = passing();
  failed[0].failure = 'PROVIDER_OR_VALIDATION_FAILURE';
  assert.equal(reviewTopicEvaluation(failed).passed, false);
  assert.equal(
    reviewTopicEvaluation(passing().map((r) => ({ ...r, latencyMs: 10001 }))).passed,
    false,
  );
});

test('best-effort acceptance reports unsupported misses and preserves the strict failure', () => {
  const results = passing();
  for (const result of results) {
    if (result.id.startsWith('unknown-')) result.correct = false;
  }
  const review = reviewTopicEvaluation(results);
  assert.equal(review.passed, true);
  assert.equal(review.strictAcceptancePassed, false);
  assert.equal(review.unsupportedCorrect, 0);
  assert.equal(review.unsupportedRuns, 20);
  assert.equal(reviewTopicEvaluation(results.slice(0, 40)).passed, false);
  results.at(-1).failure = 'PROVIDER_OR_VALIDATION_FAILURE';
  assert.equal(reviewTopicEvaluation(results).passed, false);
});
