import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import type { TodayAttentionItem } from '@workledger/contracts';
import { initializeI18n, type I18nRuntime } from '@workledger/i18n';
import { WorkLedgerI18nProvider } from '@workledger/i18n/react';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { TodayAttention } from '../src/components/today-attention.js';

let englishRuntime: I18nRuntime | undefined;

beforeAll(async () => {
  englishRuntime = await initializeI18n('en-GB');
});

const thresholdWarning: TodayAttentionItem = {
  affectedDate: '2026-08-10',
  blocksSubmission: false,
  message: { code: 'FLEX_NEGATIVE_THRESHOLD_EXCEEDED', parameters: {} },
  recovery: {
    action: 'REVIEW_BALANCE_HISTORY',
    destination: 'MY_BALANCES',
  },
  severity: 'WARNING',
  source: 'POSTED_FLEX_BALANCE',
};

const incompleteRecord: TodayAttentionItem = {
  affectedDate: '2026-08-11',
  blocksSubmission: true,
  message: { code: 'ATTENDANCE_INCOMPLETE', parameters: {} },
  recovery: {
    action: 'FIX_ENTRY',
    destination: 'MY_TIME',
  },
  severity: 'BLOCKER',
  source: 'CURRENT_DAY_CALCULATION',
};

test('renders server-owned attention with explicit blocking status and real destinations', async () => {
  const { container } = renderAttention([incompleteRecord, thresholdWarning]);

  expect(screen.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  expect(screen.getByText('Attendance record incomplete')).toBeVisible();
  expect(screen.getByText('Blocks month submission')).toBeVisible();
  expect(screen.getByText('Does not block submission')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Fix entry' })).toHaveAttribute(
    'href',
    '/my-time?date=2026-08-11&view=WEEK',
  );
  expect(screen.getByRole('link', { name: 'View balance history' })).toHaveAttribute(
    'href',
    '/my-balances#ledger-heading',
  );
  expect(
    screen.getByText(/Original events remain unchanged while the request is reviewed/u),
  ).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(container).not.toHaveTextContent(/sickness|diagnosis|medical|absence subtype/iu);
  await expectNoAxeViolations(container);
});

test('hides empty attention and announces only a newly appearing blocker', async () => {
  const view = renderAttention([]);
  expect(screen.queryByRole('heading', { name: 'Needs attention' })).not.toBeInTheDocument();

  view.rerender(
    <WorkLedgerI18nProvider runtime={requireEnglishRuntime()}>
      <MemoryRouter>
        <TodayAttention items={[thresholdWarning]} />
      </MemoryRouter>
    </WorkLedgerI18nProvider>,
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  view.rerender(
    <WorkLedgerI18nProvider runtime={requireEnglishRuntime()}>
      <MemoryRouter>
        <TodayAttention items={[thresholdWarning, incompleteRecord]} />
      </MemoryRouter>
    </WorkLedgerI18nProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'New urgent issue: Attendance record incomplete.',
    ),
  );
});

function renderAttention(items: readonly TodayAttentionItem[]) {
  return render(
    <WorkLedgerI18nProvider runtime={requireEnglishRuntime()}>
      <MemoryRouter>
        <TodayAttention items={items} />
      </MemoryRouter>
    </WorkLedgerI18nProvider>,
  );
}

function requireEnglishRuntime(): I18nRuntime {
  if (englishRuntime === undefined) throw new Error('English i18n runtime was not initialized.');
  return englishRuntime;
}
