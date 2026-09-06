import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import {
  employeeInsightTopicRequestSchema,
  MAX_INSIGHT_QUESTION_CODE_POINTS,
  type EmployeeInsightKind,
  type EmployeeInsightTopicResult,
} from '@workledger/contracts/insights';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button, Panel } from '@workledger/ui';

import {
  ApiClientError,
  clearSessionMemory,
  suggestEmployeeInsightTopic,
} from '../app/api-client.js';
import { setPendingSignInNotice } from '../app/session-notice.js';

const TOPIC_TITLE_KEYS = {
  'balance-change': 'employee.insights.topics.balanceChange',
  'submission-blockers': 'employee.insights.topics.submissionBlockers',
  'leave-projection': 'employee.insights.topics.leaveProjection',
  'today-explanation': 'employee.insights.topics.todayExplanation',
} as const;

/** This optional interaction is intentionally English-only, independently of the account locale. */
export function InsightTopicSuggestion({
  onConfirm,
  onPermissionLoss,
}: Readonly<{
  onConfirm: (topic: EmployeeInsightKind) => void;
  onPermissionLoss: () => void;
}>) {
  const t = useWorkLedgerMessage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<EmployeeInsightTopicResult>();
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'running' | 'ready' | 'unknown' | 'cancelled' | 'unavailable' | 'rateLimited'
  >('idle');
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (invalid) inputRef.current?.focus();
  }, [invalid]);

  function clear() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPending(false);
    setQuestion('');
    setResult(undefined);
    setInvalid(false);
    setStatus('idle');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controllerRef.current !== null) return;
    const parsed = employeeInsightTopicRequestSchema.safeParse({ language: 'en', question });
    if (!parsed.success) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    setResult(undefined);
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    setStatus('running');
    try {
      const next = await suggestEmployeeInsightTopic(parsed.data.question, controller.signal);
      if (controllerRef.current !== controller || controller.signal.aborted) return;
      setResult(next);
      setStatus(next.topic === 'UNKNOWN' ? 'unknown' : 'ready');
    } catch (error) {
      if (controllerRef.current !== controller || controller.signal.aborted) return;
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        clear();
        onPermissionLoss();
        if (error.status === 401) {
          clearSessionMemory();
          queryClient.clear();
          setPendingSignInNotice('SESSION_EXPIRED');
          await navigate('/sign-in', { replace: true });
        }
      } else {
        setStatus(
          error instanceof ApiClientError && error.status === 429 ? 'rateLimited' : 'unavailable',
        );
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setPending(false);
      }
    }
  }

  const topic = result?.topic;
  return (
    <Panel
      aria-labelledby="insight-topic-heading"
      className="grid gap-4"
      density="balanced"
      lang="en"
    >
      <div>
        <h2 className="m-0 text-lg font-bold" id="insight-topic-heading">
          {t('employee.insights.topics.heading')}
        </h2>
        <p
          className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]"
          id="insight-topic-description"
        >
          {t('employee.insights.topics.description')}
        </p>
      </div>
      <form className="grid gap-3" noValidate onSubmit={(event) => void submit(event)}>
        <label className="font-semibold" htmlFor="insight-topic-question">
          {t('employee.insights.topics.question')}
        </label>
        <textarea
          aria-describedby={`insight-topic-description insight-topic-count${invalid ? ' insight-topic-error' : ''}`}
          aria-invalid={invalid || undefined}
          className="wl-text-field min-h-24 resize-y"
          id="insight-topic-question"
          maxLength={MAX_INSIGHT_QUESTION_CODE_POINTS * 2}
          onChange={(event) => {
            setQuestion(event.target.value);
            setResult(undefined);
            setInvalid(false);
            setStatus('idle');
          }}
          readOnly={pending}
          ref={inputRef}
          rows={3}
          value={question}
        />
        <p className="m-0 text-sm text-[var(--wl-text-muted)]" id="insight-topic-count">
          {Array.from(question).length} / {MAX_INSIGHT_QUESTION_CODE_POINTS}
        </p>
        {invalid ? (
          <p className="m-0 font-semibold text-[var(--wl-danger)]" id="insight-topic-error">
            {t('employee.insights.topics.invalid')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button isDisabled={pending} type="submit">
            {t('employee.insights.topics.submit')}
          </Button>
          {pending ? (
            <Button
              onPress={() => {
                controllerRef.current?.abort();
                controllerRef.current = null;
                setPending(false);
                setStatus('cancelled');
                inputRef.current?.focus();
              }}
              variant="secondary"
            >
              {t('employee.insights.topics.cancel')}
            </Button>
          ) : null}
          {!pending && question !== '' ? (
            <Button
              onPress={() => {
                clear();
                inputRef.current?.focus();
              }}
              variant="quiet"
            >
              {t('employee.insights.topics.clear')}
            </Button>
          ) : null}
        </div>
      </form>
      <p aria-atomic="true" aria-live="polite" className="m-0 text-sm">
        {status === 'idle' ? '' : t(`employee.insights.topics.${status}`)}
      </p>
      {topic === undefined || topic === 'UNKNOWN' ? null : (
        <div className="grid gap-3">
          <p className="m-0 font-semibold">{t(TOPIC_TITLE_KEYS[topic])}</p>
          <p className="m-0 text-sm">{t('employee.insights.topics.confirmDescription')}</p>
          <Button
            className="w-fit"
            onPress={() => {
              clear();
              onConfirm(topic);
            }}
            variant="secondary"
          >
            {t('employee.insights.topics.confirm')}
          </Button>
        </div>
      )}
    </Panel>
  );
}
