import { Link } from 'react-router';

import type {
  InsightInterpretation as InsightInterpretationData,
  InsightNativeResult,
} from '@workledger/contracts/insights';
import { formatList } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Panel, buttonVariants } from '@workledger/ui';

import {
  insightDestinationLabel,
  insightDestinationPath,
  insightFactLabel,
  insightLimitationLabel,
  insightQualifierLabel,
} from '../app/insight-presentation.js';
import { formatInsightFactValue, insightSourceName } from './insight-native-result.js';

export type InsightInterpretationTurn = Readonly<{
  interpretation: InsightInterpretationData;
  nativeResult: InsightNativeResult;
  question: string;
}>;

export function InsightInterpretation({
  turns,
}: Readonly<{ turns: readonly InsightInterpretationTurn[] }>) {
  const t = useWorkLedgerMessage();

  return (
    <section aria-labelledby="insight-interpretation-heading" className="grid gap-5">
      <div>
        <h2 className="m-0 text-2xl font-bold" id="insight-interpretation-heading">
          {t('employee.insights.interpretation.heading')}
        </h2>
        <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {t('employee.insights.interpretation.description')}
        </p>
      </div>
      <ol className="m-0 grid list-none gap-5 p-0">
        {turns.map((turn, turnIndex) => (
          <li key={`${turnIndex}:${turn.question}`}>
            <InterpretationTurn turn={turn} turnIndex={turnIndex} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function InterpretationTurn({
  turn,
  turnIndex,
}: Readonly<{ turn: InsightInterpretationTurn; turnIndex: number }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const facts = new Map(turn.nativeResult.facts.map((fact) => [fact.reference, fact]));
  const sources = new Map(turn.nativeResult.sources.map((source) => [source.reference, source]));
  const limitations = new Map(
    turn.nativeResult.limitations.map((limitation) => [limitation.reference, limitation]),
  );
  const actions = new Map(turn.nativeResult.actions.map((action) => [action.reference, action]));
  const questionId = `insight-interpretation-question-${turnIndex}`;

  return (
    <Panel aria-labelledby={questionId} as="article" className="grid gap-5" density="comfortable">
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
          {t('employee.insights.interpretation.question')}
        </p>
        <h3 className="m-0 mt-1 text-xl font-bold" id={questionId}>
          {turn.question}
        </h3>
      </div>

      <ol className="m-0 grid gap-5 pl-5">
        {turn.interpretation.statements.map((statement, statementIndex) => {
          const referencedFacts = statement.factReferences.flatMap((reference) => {
            const fact = facts.get(reference);
            return fact === undefined ? [] : [fact];
          });
          const referencedSources = statement.sourceReferences.flatMap((reference) => {
            const source = sources.get(reference);
            return source === undefined ? [] : [source];
          });
          const referencedLimitations = statement.limitationReferences.flatMap((reference) => {
            const limitation = limitations.get(reference);
            return limitation === undefined ? [] : [limitation];
          });
          const referencedActions = statement.actionReferences.flatMap((reference) => {
            const action = actions.get(reference);
            return action === undefined ? [] : [action];
          });

          return (
            <li className="grid gap-4" key={`${turnIndex}:${statementIndex}`}>
              <p className="m-0 max-w-3xl leading-7">{statement.text}</p>
              <dl className="m-0 grid gap-3 sm:grid-cols-2">
                {referencedFacts.map((fact) => (
                  <div
                    className="rounded-[var(--wl-radius-control)] bg-[var(--wl-surface-subtle)] p-3"
                    key={fact.reference}
                  >
                    <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
                      {insightFactLabel(fact.code, t)}
                    </dt>
                    <dd className="m-0 mt-1 font-bold">
                      {formatInsightFactValue(fact, turn.nativeResult, runtime, t)}
                    </dd>
                    <dd className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
                      {formatList(
                        runtime.locale,
                        fact.qualifiers.map((qualifier) => insightQualifierLabel(qualifier, t)),
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <div>
                <h4 className="m-0 text-base font-bold">
                  {t('employee.insights.interpretation.sources')}
                </h4>
                <ul className="m-0 mt-2 grid gap-2 pl-5">
                  {referencedSources.map((source) => (
                    <li key={source.reference}>
                      <Link to={insightDestinationPath(source.destination, source.period)}>
                        {t('employee.insights.source.open', {
                          source: insightSourceName(source, t),
                        })}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {referencedLimitations.length === 0 ? null : (
                <Alert
                  announce={false}
                  title={t('employee.insights.interpretation.limitations')}
                  tone="warning"
                >
                  <ul className="m-0 grid gap-2 pl-5">
                    {referencedLimitations.map((limitation) => (
                      <li key={limitation.reference}>
                        {insightLimitationLabel(limitation.code, t)}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {referencedActions.length === 0 ? null : (
                <div className="flex flex-wrap gap-3">
                  {referencedActions.map((action) => (
                    <Link
                      className={buttonVariants({ variant: 'secondary' })}
                      key={action.reference}
                      to={insightDestinationPath(action.destination, action.period)}
                    >
                      {insightDestinationLabel(action.destination, t)}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
