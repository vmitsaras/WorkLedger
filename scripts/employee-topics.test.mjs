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

test('topic evaluation requires exact complete coverage, accuracy, abstention and latency', () => {
  assert.equal(reviewTopicEvaluation(passing()).passed, true);
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
  const unknown = passing();
  unknown.at(-1).correct = false;
  assert.equal(reviewTopicEvaluation(unknown).passed, false);
  const failed = passing();
  failed[0].failure = 'PROVIDER_OR_VALIDATION_FAILURE';
  assert.equal(reviewTopicEvaluation(failed).passed, false);
  assert.equal(
    reviewTopicEvaluation(passing().map((r) => ({ ...r, latencyMs: 10001 }))).passed,
    false,
  );
});
