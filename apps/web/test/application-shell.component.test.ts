import { createElement } from 'react';
import { render, screen } from '@testing-library/react';

import { createFixedInstantClock, expectNoAxeViolations } from '@workledger/test-utils';

function TestApplicationShell() {
  const clock = createFixedInstantClock('2026-08-07T08:00:00Z');

  return createElement(
    'main',
    {},
    createElement('h1', {}, 'WorkLedger'),
    createElement('p', {}, `Harness instant: ${clock.now()}`),
    createElement('a', { href: '/today' }, 'Today'),
  );
}

test('renders the baseline web shell semantics under jsdom', async () => {
  const { container } = render(createElement(TestApplicationShell));

  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'WorkLedger' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
  await expectNoAxeViolations(container);
});
