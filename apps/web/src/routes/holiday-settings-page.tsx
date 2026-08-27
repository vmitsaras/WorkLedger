import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { HolidayImpactPreviewAdmin } from '@workledger/contracts';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, TextField } from '@workledger/ui';

import {
  ApiClientError,
  createHolidayForAdministration,
  previewHolidayImpactForAdministration,
} from '../app/api-client.js';
import { formatLocalDate } from '../app/date-time-format.js';
import { holidaySettingsAdminDetailQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function HolidaySettingsPage() {
  const t = useWorkLedgerMessage();
  const query = useQuery(holidaySettingsAdminDetailQuery());
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [preview, setPreview] = useState<HolidayImpactPreviewAdmin>();
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const messageRef = useRef<HTMLElement>(null);
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
      showError(t('admin.holidaySettings.validation.required'));
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
        text: t('admin.holidaySettings.feedback.created'),
      });
    } catch (error) {
      showError(errorMessage(error, t));
    }
  }

  function showError(text: string) {
    setMessage({ kind: 'error', text });
    requestAnimationFrame(() => messageRef.current?.focus());
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('admin.holidaySettings.page.eyebrow')}
        title={t('shared.route.title.settingsHolidays')}
        description={t('admin.holidaySettings.page.description')}
      />
      {message === undefined ? null : (
        <Alert
          {...(message.kind === 'error' ? { className: 'outline-none', tabIndex: -1 } : {})}
          ref={messageRef}
          title={
            message.kind === 'error'
              ? t('admin.holidaySettings.feedback.errorTitle')
              : t('admin.holidaySettings.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      <form className="wl-panel grid gap-5" onSubmit={submit} noValidate>
        <div>
          <h2 className="m-0 text-2xl font-bold">{t('admin.holidaySettings.form.heading')}</h2>
          <p className="mb-0 text-sm text-[var(--wl-text-muted)]">
            {t('admin.holidaySettings.form.description')}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="holiday-name"
            label={t('admin.holidaySettings.form.name')}
            value={name}
            onChange={changeName}
          />
          <label className="grid gap-2 text-sm font-semibold" htmlFor="holiday-date">
            {t('admin.holidaySettings.form.date')}
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
            {...(preview?.mutationAllowed === false
              ? { 'aria-describedby': 'holiday-impact-blocked' }
              : {})}
            isDisabled={
              previewMutation.isPending ||
              createMutation.isPending ||
              preview?.mutationAllowed === false
            }
          >
            {previewMutation.isPending
              ? t('admin.holidaySettings.form.previewPending')
              : createMutation.isPending
                ? t('admin.holidaySettings.form.createPending')
                : preview === undefined
                  ? t('admin.holidaySettings.form.preview')
                  : t('admin.holidaySettings.form.submit')}
          </Button>
        </div>
      </form>
      <Panel className="grid gap-4" aria-labelledby="configured-holidays">
        <h2 id="configured-holidays" className="m-0 text-2xl font-bold">
          {t('admin.holidaySettings.list.heading')}
        </h2>
        {query.isPending ? (
          <RouteState kind="loading" title={t('admin.holidaySettings.loading.title')}>
            {t('admin.holidaySettings.loading.description')}
          </RouteState>
        ) : query.data.holidays.length === 0 ? (
          <RouteState kind="empty" title={t('admin.holidaySettings.empty.title')}>
            {t('admin.holidaySettings.empty.description')}
          </RouteState>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {query.data.holidays.map((holiday) => (
              <li key={holiday.id} className="rounded-xl border p-4">
                <strong>{holiday.name}</strong>
                <span className="block text-sm text-[var(--wl-text-muted)]">
                  {formatLocalDate(holiday.holidayDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
  );
}

function ImpactPreview({ preview }: Readonly<{ preview: HolidayImpactPreviewAdmin }>) {
  const t = useWorkLedgerMessage();
  return (
    <Panel density="compact" aria-labelledby="holiday-impact" role="status">
      <h3 id="holiday-impact" className="mt-0">
        {t('admin.holidaySettings.preview.heading')}
      </h3>
      <p>
        {t('admin.holidaySettings.preview.summary', {
          employees: preview.affectedEmployeeCount,
          projections: preview.affectedProjectionCount,
        })}
      </p>
      {preview.mutationAllowed ? (
        <p className="mb-0">{t('admin.holidaySettings.preview.allowed')}</p>
      ) : (
        <p id="holiday-impact-blocked" className="wl-text-danger mb-0">
          {t('admin.holidaySettings.preview.blocked', {
            periods: preview.blockedPeriodCount,
          })}
        </p>
      )}
    </Panel>
  );
}

function errorMessage(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (!(error instanceof ApiClientError)) return t('admin.holidaySettings.error.generic');
  if (error.code === 'HOLIDAY_CHANGE_BLOCKED') return t('admin.holidaySettings.error.blocked');
  if (error.code === 'HOLIDAY_DATE_CONFLICT') return t('admin.holidaySettings.error.conflict');
  if (error.code === 'ACCESS_DENIED') return t('admin.holidaySettings.error.accessDenied');
  return t('admin.holidaySettings.error.generic');
}
