import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import {
  INSIGHT_KINDS,
  MAX_INSIGHT_PRIOR_TURNS,
  MAX_INSIGHT_QUESTION_CODE_POINTS,
  insightInterpretationRequestSchema,
  insightRequestSchema,
  type InsightInterpretationRequest,
  type InsightKind,
  type InsightRequest,
  type InsightVisibleContext,
} from '@workledger/contracts/insights';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button, FilterBar, Panel, RouteState } from '@workledger/ui';

import {
  ApiClientCancellationError,
  ApiClientError,
  clearSessionMemory,
  interpretEmployeeInsight,
  runEmployeeInsight,
} from '../app/api-client.js';
import {
  formatInsightPeriod,
  insightContextLabel,
  insightKindPresentation,
} from '../app/insight-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import {
  InsightInterpretation,
  type InsightInterpretationTurn,
} from '../components/insight-interpretation.js';
import { InsightNativeResult } from '../components/insight-native-result.js';
import { PageHeader } from '../components/page-header.js';

type FormValues = Readonly<{
  date: string;
  endDate: string;
  kind: InsightKind | '';
  month: string;
  startDate: string;
}>;

const EMPTY_VALUES: FormValues = Object.freeze({
  date: '',
  endDate: '',
  kind: '',
  month: '',
  startDate: '',
});

const SAFE_SEARCH_KEYS = new Set(['date', 'from', 'kind', 'month', 'to']);

export function InsightsPage() {
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loaderContext = useLoaderData() as InsightVisibleContext | null;
  const [search, setSearch] = useSearchParams();
  const initial = parseInsightSearch(search);
  const [values, setValues] = useState<FormValues>(initial.values);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [visibleContext, setVisibleContext] = useState(loaderContext ?? undefined);
  const [contextStatus, setContextStatus] = useState<string>();
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState<string>();
  const [interpretationFormError, setInterpretationFormError] = useState<string>();
  const [interpretationRequestError, setInterpretationRequestError] = useState<Error>();
  const [interpretationFeedback, setInterpretationFeedback] = useState<
    'CANCELLED' | 'READY' | undefined
  >();
  const [turns, setTurns] = useState<readonly InsightInterpretationTurn[]>([]);
  const summaryRef = useRef<HTMLElement>(null);
  const interpretationSummaryRef = useRef<HTMLElement>(null);
  const kindRef = useRef<HTMLSelectElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const interpretationControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: runEmployeeInsight,
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 403) {
        setVisibleContext(undefined);
        setContextStatus(undefined);
      }
    },
  });
  const interpretationMutation = useMutation({
    gcTime: 0,
    mutationFn: ({
      controller,
      input,
    }: Readonly<{ controller: AbortController; input: InsightInterpretationRequest }>) =>
      interpretEmployeeInsight(input, controller.signal),
    onError: (error) => {
      if (error instanceof ApiClientCancellationError) {
        setInterpretationFeedback('CANCELLED');
        queueMicrotask(() => questionRef.current?.focus());
      } else {
        setInterpretationRequestError(error);
      }
      if (error instanceof ApiClientError && error.status === 403) {
        setVisibleContext(undefined);
        setContextStatus(undefined);
        setTurns([]);
        mutation.reset();
      }
    },
    onSettled: () => {
      interpretationControllerRef.current = null;
      queueMicrotask(() => interpretationMutation.reset());
    },
    onSuccess: (result, variables) => {
      setTurns((current) =>
        [
          ...current,
          Object.freeze({
            interpretation: result.interpretation,
            nativeResult: result.nativeResult,
            question: variables.input.question,
          }),
        ].slice(-MAX_INSIGHT_PRIOR_TURNS),
      );
      setQuestion('');
      setInterpretationRequestError(undefined);
      setInterpretationFeedback('READY');
    },
  });

  useEffect(() => {
    if (!initial.valid) setSearch({}, { replace: true });
  }, [initial.valid, setSearch]);

  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0 || formError !== undefined) {
      summaryRef.current?.focus();
    }
  }, [fieldErrors, formError]);

  useEffect(() => {
    if (questionError !== undefined || interpretationFormError !== undefined) {
      interpretationSummaryRef.current?.focus();
    }
  }, [interpretationFormError, questionError]);

  useEffect(
    () => () => {
      interpretationControllerRef.current?.abort();
    },
    [],
  );

  function clearInterpretationState() {
    interpretationControllerRef.current?.abort();
    interpretationControllerRef.current = null;
    interpretationMutation.reset();
    setInterpretationFeedback(undefined);
    setInterpretationFormError(undefined);
    setInterpretationRequestError(undefined);
    setQuestion('');
    setQuestionError(undefined);
    setTurns([]);
  }

  function updateValue<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors({});
    setFormError(undefined);
    setContextStatus(undefined);
    clearInterpretationState();
    mutation.reset();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = toInsightRequest(values, visibleContext);
    const parsed = insightRequestSchema.safeParse(request);
    if (!parsed.success) {
      setFieldErrors(validateForm(values, t));
      setFormError(t('employee.insights.validation.correct'));
      return;
    }

    setFieldErrors({});
    setFormError(undefined);
    setContextStatus(undefined);
    clearInterpretationState();
    setSearch(toInsightSearch(values), { replace: true });
    try {
      await mutation.mutateAsync(parsed.data);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearSessionMemory();
        queryClient.clear();
        setPendingSignInNotice('SESSION_EXPIRED');
        await navigate('/sign-in', { replace: true });
      }
    }
  }

  async function submitInterpretation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (interpretationMutation.isPending || mutation.data === undefined) return;
    const trimmedQuestion = question.trim();
    const codePoints = Array.from(trimmedQuestion).length;
    if (codePoints === 0 || codePoints > MAX_INSIGHT_QUESTION_CODE_POINTS) {
      setQuestionError(
        codePoints === 0
          ? t('employee.insights.interpretation.validation.required')
          : t('employee.insights.interpretation.validation.tooLong'),
      );
      setInterpretationFormError(t('employee.insights.interpretation.validation.correct'));
      return;
    }

    const nativeRequest = insightRequestSchema.safeParse(toInsightRequest(values, visibleContext));
    if (!nativeRequest.success) {
      setInterpretationFormError(t('employee.insights.interpretation.validation.scopeChanged'));
      return;
    }
    const input = insightInterpretationRequestSchema.safeParse({
      insight: nativeRequest.data,
      priorTurns: turns.map((turn) => ({
        answer: turn.interpretation.statements.map((statement) => statement.text).join(' '),
        question: turn.question,
      })),
      question: trimmedQuestion,
    });
    if (!input.success) {
      setInterpretationFormError(t('employee.insights.interpretation.validation.correct'));
      return;
    }

    setQuestionError(undefined);
    setInterpretationFormError(undefined);
    setInterpretationRequestError(undefined);
    setInterpretationFeedback(undefined);
    const controller = new AbortController();
    interpretationControllerRef.current = controller;
    try {
      await interpretationMutation.mutateAsync({ controller, input: input.data });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearSessionMemory();
        queryClient.clear();
        setTurns([]);
        setPendingSignInNotice('SESSION_EXPIRED');
        await navigate('/sign-in', { replace: true });
      }
    }
  }

  const selected = values.kind === '' ? null : insightKindPresentation(values.kind, t);
  const latestTurn = turns.at(-1);
  const nativeResult = latestTurn?.nativeResult ?? mutation.data?.nativeResult;
  const interpretationPermissionError =
    interpretationRequestError instanceof ApiClientError &&
    interpretationRequestError.status === 403
      ? interpretationRequestError
      : undefined;
  const interpretationFailure =
    interpretationRequestError !== undefined &&
    interpretationPermissionError === undefined &&
    !(
      interpretationRequestError instanceof ApiClientError &&
      interpretationRequestError.status === 401
    );

  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        description={t('employee.insights.page.description')}
        eyebrow={t('employee.insights.page.eyebrow')}
        title={t('shared.route.title.insights')}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="grid gap-4">
          {visibleContext === undefined ? null : (
            <InsightContextPanel
              context={visibleContext}
              onRemove={() => {
                kindRef.current?.focus();
                setVisibleContext(undefined);
                setContextStatus(t('employee.insights.context.removed'));
                clearInterpretationState();
                mutation.reset();
              }}
            />
          )}
          <FormErrorSummary
            fieldErrors={fieldErrors}
            formError={formError}
            summaryRef={summaryRef}
          />
          <FilterBar
            description={t('employee.insights.form.description')}
            noValidate
            onSubmit={(event) => void submit(event)}
            title={t('employee.insights.form.heading')}
          >
            <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <label className="font-semibold" htmlFor="insight-kind">
                  {t('employee.insights.form.kind')}
                </label>
                <select
                  aria-describedby={selected === null ? undefined : 'insight-kind-description'}
                  aria-invalid={fieldErrors['insight-kind'] === undefined ? undefined : true}
                  className="wl-text-field"
                  id="insight-kind"
                  onChange={(event) => updateValue('kind', toInsightKind(event.target.value))}
                  ref={kindRef}
                  value={values.kind}
                >
                  <option value="">{t('employee.insights.form.kindPlaceholder')}</option>
                  {INSIGHT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {insightKindPresentation(kind, t).title}
                    </option>
                  ))}
                </select>
                {selected === null ? null : (
                  <p
                    className="m-0 max-w-xl text-sm leading-6 text-[var(--wl-text-muted)]"
                    id="insight-kind-description"
                  >
                    {selected.description}
                  </p>
                )}
              </div>

              {values.kind === 'balance-change' ? (
                <div className="grid min-w-0 gap-4 sm:col-span-2 sm:grid-cols-2">
                  <DateField
                    error={fieldErrors['insight-from']}
                    id="insight-from"
                    label={t('employee.insights.form.from')}
                    onChange={(value) => updateValue('startDate', value)}
                    value={values.startDate}
                  />
                  <DateField
                    error={fieldErrors['insight-to']}
                    id="insight-to"
                    label={t('employee.insights.form.to')}
                    onChange={(value) => updateValue('endDate', value)}
                    value={values.endDate}
                  />
                </div>
              ) : null}

              {values.kind === 'submission-blockers' ? (
                <DateField
                  error={fieldErrors['insight-month']}
                  id="insight-month"
                  label={t('employee.insights.form.month')}
                  onChange={(value) => updateValue('month', value)}
                  type="month"
                  value={values.month}
                />
              ) : null}

              {values.kind === 'leave-projection' || values.kind === 'today-explanation' ? (
                <DateField
                  error={fieldErrors['insight-date']}
                  id="insight-date"
                  label={t('employee.insights.form.date')}
                  onChange={(value) => updateValue('date', value)}
                  value={values.date}
                />
              ) : null}

              <div className="self-end">
                <Button isDisabled={mutation.isPending} type="submit">
                  {mutation.isPending
                    ? t('employee.insights.form.running')
                    : t('employee.insights.form.run')}
                </Button>
              </div>
            </div>
          </FilterBar>
        </div>

        <aside aria-labelledby="insight-trust-heading">
          <Panel className="grid gap-3" density="balanced">
            <h2 className="m-0 text-lg font-bold" id="insight-trust-heading">
              {t('employee.insights.trust.heading')}
            </h2>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {t('employee.insights.trust.description')}
            </p>
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {t('employee.insights.trust.privacy')}
            </p>
          </Panel>
        </aside>
      </div>

      <div aria-atomic="true" aria-live="polite" className="min-h-6" role="status">
        {contextStatus ??
          (mutation.isPending
            ? t('employee.insights.status.running')
            : interpretationMutation.isPending
              ? t('employee.insights.interpretation.status.running')
              : interpretationFeedback === 'CANCELLED'
                ? t('employee.insights.interpretation.status.cancelled')
                : null)}
        {contextStatus === undefined &&
        !interpretationMutation.isPending &&
        interpretationFeedback === 'READY' ? (
          <p className="m-0">
            {t('employee.insights.interpretation.status.ready')}{' '}
            <a href="#insight-interpretation-heading">
              {t('employee.insights.interpretation.status.viewResult')}
            </a>
          </p>
        ) : null}
        {contextStatus === undefined &&
        interpretationFeedback === undefined &&
        mutation.isSuccess ? (
          <p className="m-0">
            {t('employee.insights.status.ready')}{' '}
            <a href="#insight-result-heading">{t('employee.insights.status.viewResult')}</a>
          </p>
        ) : null}
      </div>

      {mutation.isError ? (
        <InsightError
          error={mutation.error}
          retry={() => {
            const request = insightRequestSchema.safeParse(
              toInsightRequest(values, visibleContext),
            );
            if (request.success) mutation.mutate(request.data);
          }}
        />
      ) : null}
      {interpretationPermissionError === undefined ? null : (
        <InsightError error={interpretationPermissionError} retry={() => undefined} />
      )}
      {nativeResult === undefined ? null : <InsightNativeResult result={nativeResult} />}

      {mutation.data === undefined || nativeResult === undefined ? (
        mutation.isError || interpretationPermissionError !== undefined ? null : (
          <ProviderState message={t('employee.insights.provider.awaitingNative')} />
        )
      ) : mutation.data.interpretationAvailability === 'READY' ? (
        <InsightQuestionForm
          formError={interpretationFormError}
          onCancel={() => interpretationControllerRef.current?.abort()}
          onChange={(value) => {
            setQuestion(value);
            setQuestionError(undefined);
            setInterpretationFormError(undefined);
            setInterpretationRequestError(undefined);
            setInterpretationFeedback(undefined);
            interpretationMutation.reset();
          }}
          onClear={() => {
            clearInterpretationState();
            queueMicrotask(() => questionRef.current?.focus());
          }}
          onSubmit={(event) => void submitInterpretation(event)}
          pending={interpretationMutation.isPending}
          question={question}
          questionError={questionError}
          questionRef={questionRef}
          showClear={turns.length > 0}
          summaryRef={interpretationSummaryRef}
        />
      ) : (
        <ProviderState
          message={
            mutation.data.interpretationAvailability === 'DISABLED'
              ? t('employee.insights.provider.disabled')
              : t('employee.insights.provider.unavailable')
          }
        />
      )}

      {interpretationFailure ? (
        <InsightInterpretationError
          error={interpretationRequestError}
          retry={() => {
            const form = questionRef.current?.form;
            form?.requestSubmit();
          }}
        />
      ) : null}
      {turns.length === 0 ? null : <InsightInterpretation turns={turns} />}
    </section>
  );
}

function InsightContextPanel({
  context,
  onRemove,
}: Readonly<{ context: InsightVisibleContext; onRemove: () => void }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <Panel aria-labelledby="insight-context-heading" className="grid gap-4" density="compact">
      <div>
        <h2 className="m-0 text-lg font-bold" id="insight-context-heading">
          {t('employee.insights.context.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm leading-6 text-[var(--wl-text-muted)]">
          {t('employee.insights.context.description')}
        </p>
      </div>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
            {t('employee.insights.context.source')}
          </dt>
          <dd className="m-0 mt-1 font-bold">{insightContextLabel(context.kind, t)}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
            {t('employee.insights.context.period')}
          </dt>
          <dd className="m-0 mt-1 font-bold">
            {context.period === undefined
              ? t('employee.insights.context.noPeriod')
              : formatInsightPeriod(context.period, runtime.locale, t)}
          </dd>
        </div>
      </dl>
      <Button className="w-fit" onPress={onRemove} variant="quiet">
        {t('employee.insights.context.remove')}
      </Button>
    </Panel>
  );
}

function InsightError({ error, retry }: Readonly<{ error: Error; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const denied = error instanceof ApiClientError && error.status === 403;
  const offline = error instanceof ApiClientError && error.status === 0;
  return (
    <RouteState
      actions={
        denied ? (
          <Link to="/today">{t('employee.insights.error.returnToday')}</Link>
        ) : (
          <Button onPress={retry} variant="secondary">
            {t('shared.action.tryAgain')}
          </Button>
        )
      }
      kind={denied ? 'permission-denied' : 'error'}
      title={
        denied
          ? t('employee.insights.error.denied')
          : offline
            ? t('employee.insights.error.offline')
            : t('employee.insights.error.unavailable')
      }
    />
  );
}

function ProviderState({ message }: Readonly<{ message: string }>) {
  const t = useWorkLedgerMessage();
  return (
    <Panel className="grid gap-2" density="compact">
      <h2 className="m-0 text-lg font-bold">{t('employee.insights.provider.heading')}</h2>
      <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]">{message}</p>
    </Panel>
  );
}

function InsightQuestionForm({
  formError,
  onCancel,
  onChange,
  onClear,
  onSubmit,
  pending,
  question,
  questionError,
  questionRef,
  showClear,
  summaryRef,
}: Readonly<{
  formError: string | undefined;
  onCancel: () => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  question: string;
  questionError: string | undefined;
  questionRef: React.RefObject<HTMLTextAreaElement | null>;
  showClear: boolean;
  summaryRef: React.RefObject<HTMLElement | null>;
}>) {
  const t = useWorkLedgerMessage();
  const codePointCount = Array.from(question).length;
  const descriptionId = 'insight-question-description';
  const errorId = 'insight-question-error';
  const countId = 'insight-question-count';

  return (
    <Panel aria-labelledby="insight-question-heading" className="grid gap-5" density="comfortable">
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
          {t('employee.insights.interpretation.optionalLabel')}
        </p>
        <h2 className="m-0 mt-1 text-2xl font-bold" id="insight-question-heading">
          {t('employee.insights.interpretation.form.heading')}
        </h2>
        <p
          className="m-0 mt-2 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]"
          id={descriptionId}
        >
          {t('employee.insights.interpretation.form.description')}
        </p>
      </div>
      <FormErrorSummary
        fieldErrors={questionError === undefined ? {} : { 'insight-question': questionError }}
        formError={formError}
        summaryRef={summaryRef}
      />
      <form className="grid gap-4" noValidate onSubmit={onSubmit}>
        <div className="grid gap-2">
          <label className="font-semibold" htmlFor="insight-question">
            {t('employee.insights.interpretation.form.question')}
          </label>
          <textarea
            aria-describedby={`${descriptionId} ${countId}${questionError === undefined ? '' : ` ${errorId}`}`}
            aria-invalid={questionError === undefined ? undefined : true}
            className="wl-text-field min-h-32 resize-y"
            id="insight-question"
            maxLength={MAX_INSIGHT_QUESTION_CODE_POINTS * 2}
            onChange={(event) => onChange(event.target.value)}
            readOnly={pending}
            ref={questionRef}
            rows={5}
            value={question}
          />
          <p className="m-0 text-sm text-[var(--wl-text-muted)]" id={countId}>
            {t('employee.insights.interpretation.form.count', {
              count: codePointCount,
              maximum: MAX_INSIGHT_QUESTION_CODE_POINTS,
            })}
          </p>
          {questionError === undefined ? null : (
            <p className="m-0 text-sm font-semibold text-[var(--wl-danger)]" id={errorId}>
              {questionError}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button isDisabled={pending} type="submit">
            {pending
              ? t('employee.insights.interpretation.form.running')
              : t('employee.insights.interpretation.form.submit')}
          </Button>
          {pending ? (
            <Button onPress={onCancel} type="button" variant="secondary">
              {t('employee.insights.interpretation.form.cancel')}
            </Button>
          ) : null}
          {showClear && !pending ? (
            <Button onPress={onClear} type="button" variant="quiet">
              {t('employee.insights.interpretation.form.clear')}
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

function InsightInterpretationError({
  error,
  retry,
}: Readonly<{ error: Error; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const offline = error instanceof ApiClientError && error.status === 0;
  const rateLimited = error instanceof ApiClientError && error.status === 429;
  return (
    <RouteState
      actions={
        <Button onPress={retry} variant="secondary">
          {t('shared.action.tryAgain')}
        </Button>
      }
      kind="error"
      title={
        offline
          ? t('employee.insights.interpretation.error.offline')
          : rateLimited
            ? t('employee.insights.interpretation.error.rateLimited')
            : t('employee.insights.interpretation.error.unavailable')
      }
    />
  );
}

function DateField({
  error,
  id,
  label,
  onChange,
  type = 'date',
  value,
}: Readonly<{
  error: string | undefined;
  id: string;
  label: string;
  onChange: (value: string) => void;
  type?: 'date' | 'month';
  value: string;
}>) {
  const errorId = `${id}-error`;
  return (
    <div className="grid min-w-0 gap-2">
      <label className="font-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error === undefined ? undefined : errorId}
        aria-invalid={error === undefined ? undefined : true}
        className="wl-text-field"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error === undefined ? null : (
        <p className="m-0 text-sm font-semibold text-[var(--wl-danger)]" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

function toInsightRequest(
  values: FormValues,
  context?: InsightVisibleContext,
): InsightRequest | Readonly<Record<string, never>> {
  const contextInput = context === undefined ? {} : { context };
  if (values.kind === 'balance-change') {
    return {
      ...contextInput,
      kind: values.kind,
      period: { endDate: values.endDate, kind: 'DATE_RANGE', startDate: values.startDate },
      workspace: 'EMPLOYEE',
    };
  }
  if (values.kind === 'submission-blockers') {
    return {
      ...contextInput,
      kind: values.kind,
      period: { kind: 'MONTH', monthStart: `${values.month}-01` },
      workspace: 'EMPLOYEE',
    };
  }
  if (values.kind === 'leave-projection' || values.kind === 'today-explanation') {
    return {
      ...contextInput,
      kind: values.kind,
      period: { date: values.date, kind: 'DATE' },
      workspace: 'EMPLOYEE',
    };
  }
  return {};
}

function validateForm(
  values: FormValues,
  t: ReturnType<typeof useWorkLedgerMessage>,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (values.kind === '') errors['insight-kind'] = t('employee.insights.validation.kind');
  if (values.kind === 'balance-change') {
    if (values.startDate === '') errors['insight-from'] = t('employee.insights.validation.from');
    if (values.endDate === '') errors['insight-to'] = t('employee.insights.validation.to');
    if (values.startDate !== '' && values.endDate !== '' && values.startDate > values.endDate) {
      errors['insight-to'] = t('employee.insights.validation.range');
    }
  }
  if (values.kind === 'submission-blockers' && values.month === '') {
    errors['insight-month'] = t('employee.insights.validation.month');
  }
  if (
    (values.kind === 'leave-projection' || values.kind === 'today-explanation') &&
    values.date === ''
  ) {
    errors['insight-date'] = t('employee.insights.validation.date');
  }
  return errors;
}

function toInsightKind(value: string): InsightKind | '' {
  return INSIGHT_KINDS.find((kind) => kind === value) ?? '';
}

function parseInsightSearch(
  search: URLSearchParams,
): Readonly<{ valid: boolean; values: FormValues }> {
  const keys = [...search.keys()];
  const uniqueKeys = new Set(keys);
  const kind = toInsightKind(search.get('kind') ?? '');
  const values: FormValues = {
    date: search.get('date') ?? '',
    endDate: search.get('to') ?? '',
    kind,
    month: search.get('month') ?? '',
    startDate: search.get('from') ?? '',
  };
  if (keys.length === 0) return { valid: true, values };
  const valid =
    keys.length === uniqueKeys.size &&
    keys.every((key) => SAFE_SEARCH_KEYS.has(key)) &&
    kind !== '' &&
    insightRequestSchema.safeParse(toInsightRequest(values)).success;
  return { valid, values: valid ? values : EMPTY_VALUES };
}

function toInsightSearch(values: FormValues): URLSearchParams {
  const search = new URLSearchParams({ kind: values.kind });
  if (values.kind === 'balance-change') {
    search.set('from', values.startDate);
    search.set('to', values.endDate);
  } else if (values.kind === 'submission-blockers') {
    search.set('month', values.month);
  } else {
    search.set('date', values.date);
  }
  return search;
}
