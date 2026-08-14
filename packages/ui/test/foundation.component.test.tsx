import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { expectNoAxeViolations } from '@workledger/test-utils';

import { buttonVariants, Drawer, FoundationPreview } from '../src/index.js';

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
