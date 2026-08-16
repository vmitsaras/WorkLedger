import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { HolidayImpactPreviewAdmin } from '@workledger/contracts';
import { Button, TextField } from '@workledger/ui';

import {
  ApiClientError,
  createHolidayForAdministration,
  previewHolidayImpactForAdministration,
} from '../app/api-client.js';
import { formatLocalDate } from '../app/date-time-format.js';
import { holidaySettingsAdminDetailQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function HolidaySettingsPage() {
  const query = useQuery(holidaySettingsAdminDetailQuery());
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [preview, setPreview] = useState<HolidayImpactPreviewAdmin>();
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const messageRef = useRef<HTMLDivElement>(null);
  const previewMutation = useMutation({ mutationFn: previewHolidayImpactForAdministration });
  const createMutation = useMutation({ mutationFn: createHolidayForAdministration });
  if (query.isError) throw query.error;

  function changeName(value: string) {
    setName(value);
    setPreview(undefined);
  }

  function changeDate(value: string) {
    setHolidayDate(value);
    setPreview(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (name.trim() === '' || holidayDate === '') {
      showError('Enter a holiday name and date.');
      return;
    }
    try {
      if (preview === undefined) {
        setPreview(await previewMutation.mutateAsync({ holidayDate, name: name.trim() }));
        return;
      }
      if (!preview.mutationAllowed) return;
      await createMutation.mutateAsync({
        holidayDate,
        impactAcknowledged: true,
        name: name.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['administration', 'holiday-settings'] });
      setName('');
      setHolidayDate('');
      setPreview(undefined);
      setMessage({
        kind: 'success',
        text: 'Holiday created. Existing projections on this date are now identified for recalculation.',
      });
    } catch (error) {
      showError(errorMessage(error));
    }
  }

  function showError(text: string) {
    setMessage({ kind: 'error', text });
    requestAnimationFrame(() => messageRef.current?.focus());
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="HR administration"
        title="Holiday calendars"
        description="Add organization-wide date-only holidays after reviewing their calculation impact. Submitted, approved, and locked months remain protected."
      />
      {message === undefined ? null : (
        <div
          ref={messageRef}
          tabIndex={message.kind === 'error' ? -1 : undefined}
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`wl-alert ${message.kind === 'success' ? 'wl-alert-success' : 'wl-alert-error'} rounded-xl border p-4`}
        >
          {message.text}
        </div>
      )}
      <form className="wl-panel grid gap-5" onSubmit={submit} noValidate>
        <div>
          <h2 className="m-0 text-2xl font-bold">Add public holiday</h2>
          <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
            Preview is required after every name or date change. Dates use the organization
            calendar, with no time or timezone conversion.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="holiday-name" label="Holiday name" value={name} onChange={changeName} />
          <label className="grid gap-2 text-sm font-semibold" htmlFor="holiday-date">
            Holiday date
            <input
              id="holiday-date"
              type="date"
              min={query.data?.asOfLocalDate}
              className="min-h-11 rounded-lg border px-3"
              value={holidayDate}
              onChange={(event) => changeDate(event.target.value)}
            />
          </label>
        </div>
        {preview === undefined ? null : <ImpactPreview preview={preview} />}
        <div>
          <Button
            type="submit"
            isDisabled={
              previewMutation.isPending ||
              createMutation.isPending ||
              preview?.mutationAllowed === false
            }
          >
            {previewMutation.isPending
              ? 'Checking impact…'
              : createMutation.isPending
                ? 'Creating holiday…'
                : preview === undefined
                  ? 'Preview impact'
                  : 'Confirm and create'}
          </Button>
        </div>
      </form>
      <section className="wl-panel grid gap-4" aria-labelledby="configured-holidays">
        <h2 id="configured-holidays" className="m-0 text-2xl font-bold">
          Configured holidays
        </h2>
        {query.data?.holidays.length === 0 ? (
          <p className="m-0 text-[var(--wl-text-muted)]">No holidays have been configured.</p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {query.data?.holidays.map((holiday) => (
              <li key={holiday.id} className="rounded-xl border p-4">
                <strong>{holiday.name}</strong>
                <span className="block text-sm text-[var(--wl-text-muted)]">
                  {formatLocalDate(holiday.holidayDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function ImpactPreview({ preview }: Readonly<{ preview: HolidayImpactPreviewAdmin }>) {
  return (
    <section className="rounded-xl border p-4" aria-labelledby="holiday-impact" role="status">
      <h3 id="holiday-impact" className="mt-0">
        Calculation impact
      </h3>
      <p>
        {preview.affectedEmployeeCount} scheduled employees and {preview.affectedProjectionCount}{' '}
        existing daily projections are affected.
      </p>
      {preview.mutationAllowed ? (
        <p className="mb-0">No submitted, approved, or locked monthly period blocks this change.</p>
      ) : (
        <p className="wl-text-danger mb-0">
          This change cannot be saved: the date is in the past, is already configured, or belongs to{' '}
          {preview.blockedPeriodCount} protected monthly periods.
        </p>
      )}
    </section>
  );
}

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) return 'The holiday change could not be completed.';
  if (error.code === 'HOLIDAY_CHANGE_BLOCKED')
    return 'The date became protected or is no longer eligible. Preview the impact again.';
  if (error.code === 'HOLIDAY_DATE_CONFLICT') return 'A holiday already exists on this date.';
  if (error.code === 'ACCESS_DENIED') return 'You do not have permission to manage holidays.';
  return 'The holiday change could not be completed.';
}
