import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { expectNoAxeViolations } from '@workledger/test-utils';

import {
  Alert,
  buttonVariants,
  DataTable,
  Drawer,
  FilterBar,
  FoundationPreview,
  Pagination,
  RouteState,
  StatusBadge,
} from '../src/index.js';

test('keeps button styling focus-visible on native buttons and links', () => {
  expect(buttonVariants()).toContain('focus-visible:outline-solid');
  expect(buttonVariants()).toContain('data-[focus-visible]:outline-solid');
});

test('renders semantic button, link, and described field examples', async () => {
  const { container } = render(<FoundationPreview />);

  expect(screen.getByRole('button', { name: 'Save preference' })).toHaveAttribute('type', 'button');
  expect(screen.getByRole('link', { name: 'Review field guidance' })).toHaveAttribute(
    'href',
    '#field-example',
  );
  expect(screen.getByRole('textbox', { name: 'Display name' })).toHaveAccessibleDescription(
    'Used only to demonstrate a visible label and connected description.',
  );
  await expectNoAxeViolations(container);
});

test('opens and closes the dialog from the keyboard', async () => {
  const user = userEvent.setup();
  render(<FoundationPreview />);

  const trigger = screen.getByRole('button', { name: 'Open dialog' });
  await user.tab();
  await user.tab();
  await user.tab();
  expect(trigger).toHaveFocus();
  await user.keyboard('{Enter}');

  expect(screen.getByRole('dialog', { name: 'Review before continuing' })).toHaveFocus();

  await user.keyboard('{Escape}');
  expect(
    screen.queryByRole('dialog', { name: 'Review before continuing' }),
  ).not.toBeInTheDocument();
  await waitFor(() => expect(trigger).toHaveFocus());
});

test('moves focus into the navigation drawer and restores it to the trigger', async () => {
  const user = userEvent.setup();
  const { container } = render(
    <Drawer title="Navigation" triggerLabel="Menu">
      <a href="/today">Today</a>
    </Drawer>,
  );

  const trigger = screen.getByRole('button', { name: 'Menu' });
  trigger.focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('dialog', { name: 'Navigation' })).toHaveFocus();
  await expectNoAxeViolations(container);

  await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
});

test('renders shared operational patterns with textual state and native semantics', async () => {
  const { container } = render(
    <>
      <StatusBadge tone="warning">Needs review</StatusBadge>
      <Alert title="Submission blocked" tone="danger">
        Correct the listed time record before submitting.
      </Alert>
      <FilterBar title="Filter records" description="Filters can be cleared.">
        <button type="submit">Apply</button>
      </FilterBar>
      <DataTable caption="Daily records">
        <thead>
          <tr>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Monday</td>
          </tr>
        </tbody>
      </DataTable>
      <Pagination currentPage={2} onPageChange={() => undefined} pageCount={3} />
      <RouteState
        actionHref="/today"
        actionLabel="Return to Today"
        actions={<button type="button">Try again</button>}
        headingLevel="h1"
        headingProps={{ tabIndex: -1 }}
        kind="permission-denied"
      >
        Your current role does not grant access to this record.
      </RouteState>
    </>,
  );

  expect(screen.getByText('Needs review')).toBeVisible();
  expect(screen.getByRole('alert', { name: 'Submission blocked' })).toBeVisible();
  expect(screen.getByRole('form', { name: 'Filter records' })).toBeVisible();
  expect(screen.getByRole('table', { name: 'Daily records' })).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Page 2 of 3');
  expect(screen.getByRole('heading', { level: 1, name: /do not have access/u })).toHaveClass(
    'wl-route-state__title--route',
  );
  expect(screen.getByRole('link', { name: 'Return to Today' })).toHaveAttribute('href', '/today');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('maps every shared alert tone to its semantic root modifier', () => {
  render(
    <>
      <Alert title="Information" tone="info">
        Informational state.
      </Alert>
      <Alert title="Success" tone="success">
        Successful state.
      </Alert>
      <Alert title="Warning" tone="warning">
        Warning state.
      </Alert>
      <Alert title="Danger" tone="danger">
        Danger state.
      </Alert>
    </>,
  );

  expect(screen.getByRole('status', { name: 'Information' })).toHaveClass('wl-alert--info');
  expect(screen.getByRole('status', { name: 'Success' })).toHaveClass('wl-alert--success');
  expect(screen.getByRole('alert', { name: 'Warning' })).toHaveClass('wl-alert--warning');
  expect(screen.getByRole('alert', { name: 'Danger' })).toHaveClass('wl-alert--danger');
});
