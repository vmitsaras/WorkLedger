import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { expectNoAxeViolations } from '@workledger/test-utils';

function TestAction() {
  return createElement(
    'section',
    { 'aria-labelledby': 'test-action-title' },
    createElement('h1', { id: 'test-action-title' }, 'Today'),
    createElement('button', { type: 'button' }, 'Clock in'),
  );
}

test('renders an accessible interaction surface with React Testing Library', async () => {
  const user = userEvent.setup();
  const { container } = render(createElement(TestAction));

  await user.click(screen.getByRole('button', { name: 'Clock in' }));

  expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
  await expectNoAxeViolations(container);
});
