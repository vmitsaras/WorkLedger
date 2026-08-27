import { Link } from 'react-router';

import type { SupportedLocale } from '@workledger/contracts';
import type {
  InsightFact,
  InsightNativeResult,
  InsightSource,
} from '@workledger/contracts/insights';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  formatList,
  formatNumber,
  type I18nRuntime,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Panel, StatusBadge, buttonVariants, type StatusBadgeProps } from '@workledger/ui';

import {
  insightDestinationLabel,
  insightDestinationPath,
  insightFactLabel,
  formatInsightPeriod,
  insightKindPresentation,
  insightLimitationLabel,
  insightQualifierLabel,
  insightSourceKindLabel,
  insightStateLabel,
} from '../app/insight-presentation.js';

type InsightFactQualifier = InsightFact['qualifiers'][number];

const SIGNED_MINUTE_FACTS: ReadonlySet<string> = new Set([
  'BALANCE_CHANGE_MINUTES',
  'BALANCE_CLOSING_MINUTES',
  'BALANCE_OPENING_MINUTES',
  'POSTED_BALANCE_MINUTES',
  'TODAY_APPROVED_CORRECTION_MINUTES',
  'TODAY_DIFFERENCE_MINUTES',
  'TODAY_OTHER_APPROVED_ADJUSTMENT_MINUTES',
]);

export function InsightNativeResult({ result }: Readonly<{ result: InsightNativeResult }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const kind = insightKindPresentation(result.kind, t);
  const sources = new Map(result.sources.map((source) => [source.reference, source]));

  return (
    <section aria-labelledby="insight-result-heading" className="grid gap-6">
      <Panel className="grid gap-5" density="comfortable">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
              {t('employee.insights.result.nativeLabel')}
            </p>
            <h2 id="insight-result-heading" className="m-0 mt-1 text-2xl font-bold">
              {kind.title}
            </h2>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]">
              {kind.description}
            </p>
          </div>
          <StatusBadge tone="success">{t('employee.insights.result.authoritative')}</StatusBadge>
        </div>
        <dl className="m-0 grid gap-4 sm:grid-cols-3">
          <ResultMetadata
            label={t('employee.insights.result.period')}
            value={formatInsightPeriod(result.period, runtime.locale, t)}
          />
          <ResultMetadata
            label={t('employee.insights.result.capturedAt')}
            value={formatInstant(runtime.locale, result.freshness.capturedAt, result.timeZone)}
          />
          <ResultMetadata
            label={t('employee.insights.result.scope')}
            value={t('employee.insights.result.scopeSelf')}
          />
        </dl>
      </Panel>

      <section aria-labelledby="insight-facts-heading" className="grid gap-4">
        <div>
          <h3 id="insight-facts-heading" className="m-0 text-xl font-bold">
            {t('employee.insights.result.facts.heading')}
          </h3>
          <p className="m-0 mt-1 text-sm leading-6 text-[var(--wl-text-muted)]">
            {t('employee.insights.result.facts.description')}
          </p>
        </div>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2" role="list">
          {result.facts.map((fact) => (
            <li key={fact.reference}>
              <FactCard fact={fact} result={result} sources={sources} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="insight-freshness-heading" className="grid gap-4">
        <div>
          <h3 id="insight-freshness-heading" className="m-0 text-xl font-bold">
            {t('employee.insights.result.freshness.heading')}
          </h3>
          <p className="m-0 mt-1 text-sm leading-6 text-[var(--wl-text-muted)]">
            {t('employee.insights.result.freshness.description')}
          </p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0" role="list">
          {result.freshness.boundaries.map((boundary) => (
            <li key={boundary.kind}>
              <Panel as="article" density="compact">
                <p className="m-0 font-semibold">
                  {boundary.kind === 'POSTED_THROUGH'
                    ? t('employee.insights.result.freshness.postedThrough', {
                        date: formatDateOnly(runtime.locale, boundary.localDate),
                      })
                    : t('employee.insights.result.freshness.calculatedThrough', {
                        date: formatDateOnly(runtime.locale, boundary.localDate),
                      })}
                </p>
                <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                  {sourceNames(boundary.sourceReferences, sources, t, runtime.locale)}
                </p>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      {result.limitations.length === 0 ? null : (
        <section aria-labelledby="insight-limitations-heading" className="grid gap-3">
          <h3 id="insight-limitations-heading" className="m-0 text-xl font-bold">
            {t('employee.insights.result.limitations.heading')}
          </h3>
          <Alert
            announce={false}
            title={t('employee.insights.result.limitations.title')}
            tone="warning"
          >
            <ul className="m-0 grid gap-2 pl-5">
              {result.limitations.map((item) => (
                <li key={item.reference}>{insightLimitationLabel(item.code, t)}</li>
              ))}
            </ul>
          </Alert>
        </section>
      )}

      <section aria-labelledby="insight-sources-heading" className="grid gap-4">
        <div>
          <h3 id="insight-sources-heading" className="m-0 text-xl font-bold">
            {t('employee.insights.result.sources.heading')}
          </h3>
          <p className="m-0 mt-1 text-sm leading-6 text-[var(--wl-text-muted)]">
            {t('employee.insights.result.sources.description')}
          </p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2" role="list">
          {result.sources.map((source) => (
            <li key={source.reference}>
              <Panel as="article" className="h-full content-between" density="compact">
                <div>
                  <h4 className="m-0 text-base font-bold">{sourceName(source, t)}</h4>
                  <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
                    {formatInsightPeriod(source.period, runtime.locale, t)}
                  </p>
                </div>
                <Link
                  className={`${buttonVariants({ variant: 'secondary' })} mt-3 w-fit`}
                  to={insightDestinationPath(source.destination, source.period)}
                >
                  {t('employee.insights.source.open', { source: sourceName(source, t) })}
                </Link>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      {result.actions.length === 0 ? null : (
        <section aria-labelledby="insight-actions-heading" className="grid gap-3">
          <h3 id="insight-actions-heading" className="m-0 text-xl font-bold">
            {t('employee.insights.result.actions.heading')}
          </h3>
          <div className="flex flex-wrap gap-3">
            {result.actions.map((action) => (
              <Link
                key={action.reference}
                className={buttonVariants({ variant: 'secondary' })}
                to={insightDestinationPath(action.destination, action.period)}
              >
                {insightDestinationLabel(action.destination, t)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function FactCard({
  fact,
  result,
  sources,
}: Readonly<{
  fact: InsightFact;
  result: InsightNativeResult;
  sources: ReadonlyMap<string, InsightSource>;
}>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <Panel as="article" className="h-full content-start" density="balanced">
      <dl className="m-0 grid gap-2">
        <div>
          <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
            {insightFactLabel(fact.code, t)}
          </dt>
          <dd className="m-0 mt-1 text-xl font-bold">
            {formatFactValue(fact, result, runtime, t)}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {fact.qualifiers.map((qualifier) => (
          <StatusBadge key={qualifier} tone={qualifierTone(qualifier)}>
            {insightQualifierLabel(qualifier, t)}
          </StatusBadge>
        ))}
      </div>
      <p className="m-0 text-sm text-[var(--wl-text-muted)]">
        {sourceNames(fact.sourceReferences, sources, t, runtime.locale)}
      </p>
    </Panel>
  );
}

function ResultMetadata({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 mt-1 font-bold">{value}</dd>
    </div>
  );
}

function formatFactValue(
  fact: InsightFact,
  result: InsightNativeResult,
  runtime: I18nRuntime,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (fact.value === null) return t('employee.insights.value.unavailable');
  switch (fact.value.kind) {
    case 'BOOLEAN':
      return fact.value.value ? t('employee.insights.value.yes') : t('employee.insights.value.no');
    case 'COUNT':
      return formatNumber(runtime.locale, fact.value.value);
    case 'DATE':
      return formatDateOnly(runtime.locale, fact.value.value);
    case 'INSTANT':
      return formatInstant(runtime.locale, fact.value.value, result.timeZone);
    case 'MINUTES':
      return formatCompactDuration(runtime, fact.value.value, SIGNED_MINUTE_FACTS.has(fact.code));
    case 'STATE':
      return insightStateLabel(fact, t);
  }
}

function sourceNames(
  references: readonly string[],
  sources: ReadonlyMap<string, InsightSource>,
  t: ReturnType<typeof useWorkLedgerMessage>,
  locale: SupportedLocale,
): string {
  const names = references.flatMap((reference) => {
    const source = sources.get(reference);
    return source === undefined ? [] : [sourceName(source, t)];
  });
  return t('employee.insights.result.sourceEvidence', {
    sources: formatList(locale, names),
  });
}

function sourceName(source: InsightSource, t: ReturnType<typeof useWorkLedgerMessage>): string {
  return source.label ?? insightSourceKindLabel(source.kind, t);
}

function qualifierTone(qualifier: InsightFactQualifier): StatusBadgeProps['tone'] {
  switch (qualifier) {
    case 'POSTED':
      return 'success';
    case 'CURRENT':
    case 'PROJECTED':
    case 'RESERVED':
      return 'info';
    case 'PROVISIONAL':
      return 'warning';
    case 'INCOMPLETE':
    case 'SUPPRESSED':
    case 'UNAVAILABLE':
      return 'danger';
  }
}
