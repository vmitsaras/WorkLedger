import type { SupportedLocale } from '@workledger/contracts';

export const CATALOG_NAMESPACES = [
  'shared',
  'auth',
  'employee',
  'manager',
  'admin',
  'system',
  'output',
] as const;

export type CatalogNamespace = (typeof CATALOG_NAMESPACES)[number];
export type MessageValue = string | number;

export type MessageParameterMap = Readonly<{
  'auth.activation.action': undefined;
  'auth.activation.actionPending': undefined;
  'auth.activation.description': Readonly<{ maximum: number; minimum: number }>;
  'auth.activation.eyebrow': undefined;
  'auth.activation.invalid.description': undefined;
  'auth.activation.invalid.title': undefined;
  'auth.activation.title': undefined;
  'auth.error.activation.invalid': undefined;
  'auth.error.activation.rateLimited': undefined;
  'auth.error.passwordPolicy': undefined;
  'auth.error.recovery.generic': undefined;
  'auth.error.recovery.rateLimited': undefined;
  'auth.error.reset.invalid': undefined;
  'auth.error.reset.rateLimited': undefined;
  'auth.error.signIn.generic': undefined;
  'auth.error.signIn.invalid': undefined;
  'auth.error.signIn.rateLimited': undefined;
  'auth.field.confirmPassword': undefined;
  'auth.field.email': undefined;
  'auth.field.newPassword': undefined;
  'auth.field.password': undefined;
  'auth.layout.description': undefined;
  'auth.layout.introductionLabel': Readonly<{ organizationName: string }>;
  'auth.layout.skipToContent': undefined;
  'auth.layout.title': undefined;
  'auth.navigation.backToSignIn': undefined;
  'auth.navigation.forgotPassword': undefined;
  'auth.navigation.requestAnotherRecovery': undefined;
  'auth.navigation.returnToSignIn': undefined;
  'auth.notice.accountActivated.message': undefined;
  'auth.notice.accountActivated.title': undefined;
  'auth.notice.passwordReset.message': undefined;
  'auth.notice.passwordReset.title': undefined;
  'auth.notice.sessionExpired.message': undefined;
  'auth.notice.sessionExpired.title': undefined;
  'auth.notice.signedOut.message': undefined;
  'auth.notice.signedOut.title': undefined;
  'auth.recovery.action': undefined;
  'auth.recovery.actionPending': undefined;
  'auth.recovery.complete.description': undefined;
  'auth.recovery.complete.focus': undefined;
  'auth.recovery.complete.title': undefined;
  'auth.recovery.description': undefined;
  'auth.recovery.eyebrow': undefined;
  'auth.recovery.title': undefined;
  'auth.reset.action': undefined;
  'auth.reset.actionPending': undefined;
  'auth.reset.description': Readonly<{ maximum: number; minimum: number }>;
  'auth.reset.invalid.description': undefined;
  'auth.reset.invalid.title': undefined;
  'auth.reset.title': undefined;
  'auth.signIn.action': undefined;
  'auth.signIn.actionPending': undefined;
  'auth.signIn.description': undefined;
  'auth.signIn.eyebrow': undefined;
  'auth.signIn.title': undefined;
  'auth.validation.confirmPasswordRequired': undefined;
  'auth.validation.emailInvalid': undefined;
  'auth.validation.emailRequired': undefined;
  'auth.validation.passwordMismatch': undefined;
  'auth.validation.passwordRequired': undefined;
  'auth.validation.passwordLength': Readonly<{ maximum: number; minimum: number }>;
  'employee.absence.action.cancel': undefined;
  'employee.absence.action.viewDetails': undefined;
  'employee.absence.coverage.field.endTime': undefined;
  'employee.absence.coverage.field.firstDay': undefined;
  'employee.absence.coverage.field.lastDay': undefined;
  'employee.absence.coverage.field.localDate': undefined;
  'employee.absence.coverage.field.startTime': undefined;
  'employee.absence.coverage.help': undefined;
  'employee.absence.coverage.label': undefined;
  'employee.absence.coverage.line': Readonly<{
    coverage: string;
    date: string;
    duration: string;
    note: string;
  }>;
  'employee.absence.coverage.name.firstHalf': undefined;
  'employee.absence.coverage.name.fullDay': undefined;
  'employee.absence.coverage.name.secondHalf': undefined;
  'employee.absence.coverage.option.exact': undefined;
  'employee.absence.coverage.option.firstHalf': undefined;
  'employee.absence.coverage.option.fullDayRange': undefined;
  'employee.absence.coverage.option.secondHalf': undefined;
  'employee.absence.coverage.validation.endAfterStart': undefined;
  'employee.absence.coverage.validation.endTime': undefined;
  'employee.absence.coverage.validation.firstDay': undefined;
  'employee.absence.coverage.validation.lastDay': undefined;
  'employee.absence.coverage.validation.lastDayAfterFirst': undefined;
  'employee.absence.coverage.validation.localDate': undefined;
  'employee.absence.coverage.validation.startTime': undefined;
  'employee.absence.sickness.cancellation.cannotCancel': undefined;
  'employee.absence.sickness.cancellation.description': undefined;
  'employee.absence.sickness.cancellation.error': undefined;
  'employee.absence.sickness.cancellation.locked': undefined;
  'employee.absence.sickness.cancellation.pending': undefined;
  'employee.absence.sickness.cancellation.request': undefined;
  'employee.absence.sickness.cancellation.requested': undefined;
  'employee.absence.sickness.description': undefined;
  'employee.absence.sickness.error.correct': undefined;
  'employee.absence.sickness.error.overlap': undefined;
  'employee.absence.sickness.error.retroactive': undefined;
  'employee.absence.sickness.error.unavailable': undefined;
  'employee.absence.sickness.eyebrow': undefined;
  'employee.absence.sickness.form.legend': undefined;
  'employee.absence.sickness.form.notice': undefined;
  'employee.absence.sickness.form.submit': undefined;
  'employee.absence.sickness.form.submitting': undefined;
  'employee.absence.sickness.success.coverageLabel': undefined;
  'employee.absence.sickness.success.credited': Readonly<{ duration: string }>;
  'employee.absence.sickness.success.description': undefined;
  'employee.absence.sickness.success.holidayNote': undefined;
  'employee.absence.sickness.success.title': undefined;
  'employee.absence.sickness.title': undefined;
  'employee.absence.vacation.description': undefined;
  'employee.absence.vacation.error.correct': undefined;
  'employee.absence.vacation.error.overlap': undefined;
  'employee.absence.vacation.error.scheduleMissing': undefined;
  'employee.absence.vacation.error.unavailable': undefined;
  'employee.absence.vacation.eyebrow': undefined;
  'employee.absence.vacation.form.legend': undefined;
  'employee.absence.vacation.form.notice': undefined;
  'employee.absence.vacation.form.submit': undefined;
  'employee.absence.vacation.form.submitting': undefined;
  'employee.absence.vacation.success.coverageLabel': undefined;
  'employee.absence.vacation.success.holidayNote': undefined;
  'employee.absence.vacation.success.summary': Readonly<{
    count: number;
    projected: string;
    reserved: string;
  }>;
  'employee.absence.vacation.success.title': undefined;
  'employee.absence.vacation.success.zeroHourNote': undefined;
  'employee.absence.vacation.title': undefined;
  'employee.correction.action.backToTime': undefined;
  'employee.correction.action.cancel': undefined;
  'employee.correction.description': Readonly<{ date: string }>;
  'employee.correction.error.correct': undefined;
  'employee.correction.error.interval': undefined;
  'employee.correction.error.notFound': undefined;
  'employee.correction.error.unavailable': undefined;
  'employee.correction.eyebrow': undefined;
  'employee.correction.form.field.endOffset': undefined;
  'employee.correction.form.field.endTime': undefined;
  'employee.correction.form.field.reason': undefined;
  'employee.correction.form.field.startOffset': undefined;
  'employee.correction.form.field.startTime': undefined;
  'employee.correction.form.help': undefined;
  'employee.correction.form.legend': undefined;
  'employee.correction.form.reasonHelp': undefined;
  'employee.correction.form.submit': undefined;
  'employee.correction.form.submitting': undefined;
  'employee.correction.loading.description': undefined;
  'employee.correction.loading.heading': undefined;
  'employee.correction.loading.title': undefined;
  'employee.correction.missing.description': undefined;
  'employee.correction.missing.title': undefined;
  'employee.correction.original.currentWorked': Readonly<{ duration: string }>;
  'employee.correction.original.description': undefined;
  'employee.correction.original.empty': undefined;
  'employee.correction.original.event': Readonly<{ event: string; time: string }>;
  'employee.correction.original.heading': undefined;
  'employee.correction.success.description': Readonly<{ date: string; duration: string }>;
  'employee.correction.success.locked': undefined;
  'employee.correction.success.ordinary': undefined;
  'employee.correction.success.title': undefined;
  'employee.correction.title': undefined;
  'employee.correction.unavailable.denied.description': undefined;
  'employee.correction.unavailable.denied.title': undefined;
  'employee.correction.unavailable.record.description': undefined;
  'employee.correction.unavailable.record.title': undefined;
  'employee.correction.validation.endOffset': undefined;
  'employee.correction.validation.endTime': undefined;
  'employee.correction.validation.reason': undefined;
  'employee.correction.validation.startOffset': undefined;
  'employee.correction.validation.startTime': undefined;
  'employee.calendar.agenda.label': Readonly<{ month: string }>;
  'employee.calendar.description': undefined;
  'employee.calendar.detail.absence': Readonly<{
    coverage: string;
    status: string;
    type: string;
  }>;
  'employee.calendar.detail.holiday': Readonly<{ name: string }>;
  'employee.calendar.empty.description': undefined;
  'employee.calendar.empty.title': undefined;
  'employee.calendar.entries': Readonly<{ count: number }>;
  'employee.calendar.error.denied.description': undefined;
  'employee.calendar.error.denied.title': undefined;
  'employee.calendar.error.unavailable.description': undefined;
  'employee.calendar.error.unavailable.title': undefined;
  'employee.calendar.eyebrow': undefined;
  'employee.calendar.grid.caption': Readonly<{ month: string }>;
  'employee.calendar.grid.scrollHint': undefined;
  'employee.calendar.grid.scrollLabel': undefined;
  'employee.calendar.loading.description': undefined;
  'employee.calendar.loading.title': undefined;
  'employee.calendar.navigation.label': undefined;
  'employee.calendar.navigation.next': undefined;
  'employee.calendar.navigation.previous': undefined;
  'employee.calendar.selectedMonth': undefined;
  'employee.calendar.title': undefined;
  'employee.calendar.view.agenda': undefined;
  'employee.calendar.view.label': undefined;
  'employee.calendar.view.month': undefined;
  'employee.monthly.action.approve': undefined;
  'employee.monthly.action.cancel': undefined;
  'employee.monthly.action.lock': undefined;
  'employee.monthly.action.locking': undefined;
  'employee.monthly.action.permanentlyLock': undefined;
  'employee.monthly.action.preparePrint': undefined;
  'employee.monthly.action.print': undefined;
  'employee.monthly.action.recording': undefined;
  'employee.monthly.action.requestChanges': undefined;
  'employee.monthly.action.retry': undefined;
  'employee.monthly.action.submit': undefined;
  'employee.monthly.action.submitting': undefined;
  'employee.monthly.adjustments.absenceEffect': Readonly<{ credit: string; expected: string }>;
  'employee.monthly.adjustments.ariaLabel': undefined;
  'employee.monthly.adjustments.caption': undefined;
  'employee.monthly.adjustments.column.balanceDelta': undefined;
  'employee.monthly.adjustments.column.date': undefined;
  'employee.monthly.adjustments.column.effect': undefined;
  'employee.monthly.adjustments.column.link': undefined;
  'employee.monthly.adjustments.column.source': undefined;
  'employee.monthly.adjustments.column.version': undefined;
  'employee.monthly.adjustments.correctionEffect': Readonly<{ previous: string; proposed: string }>;
  'employee.monthly.adjustments.description': undefined;
  'employee.monthly.adjustments.empty': undefined;
  'employee.monthly.adjustments.heading': undefined;
  'employee.monthly.adjustments.link.cancellation': undefined;
  'employee.monthly.adjustments.link.correction': undefined;
  'employee.monthly.adjustments.link.reverses': Readonly<{ version: string }>;
  'employee.monthly.adjustments.link.unknownVersion': undefined;
  'employee.monthly.adjustments.link.zeroCancellation': undefined;
  'employee.monthly.adjustments.link.zeroCorrection': undefined;
  'employee.monthly.adjustments.metric.adjustedClosing': undefined;
  'employee.monthly.adjustments.metric.cumulativeDelta': undefined;
  'employee.monthly.adjustments.metric.originalClosing': undefined;
  'employee.monthly.adjustments.metric.viewVersion': undefined;
  'employee.monthly.adjustments.scrollHint': undefined;
  'employee.monthly.adjustments.scrollLabel': undefined;
  'employee.monthly.adjustments.source.absenceCancellation': undefined;
  'employee.monthly.adjustments.source.correction': undefined;
  'employee.monthly.approved.action.approve': undefined;
  'employee.monthly.approved.action.lock': undefined;
  'employee.monthly.approved.action.requestChanges': undefined;
  'employee.monthly.approved.authority.hr': undefined;
  'employee.monthly.approved.authority.manager': undefined;
  'employee.monthly.approved.description': undefined;
  'employee.monthly.approved.empty': undefined;
  'employee.monthly.approved.heading': undefined;
  'employee.monthly.approved.historyItem': Readonly<{
    action: string;
    authority: string;
    date: string;
    version: number;
  }>;
  'employee.monthly.approved.historyLabel': undefined;
  'employee.monthly.approved.metadata': Readonly<{
    cycle: number;
    engine: string;
    schemaVersion: number;
    workflowVersion: number;
  }>;
  'employee.monthly.approved.summary': Readonly<{
    approvedAt: string;
    balance: string;
    closing: string;
    credited: string;
    expected: string;
  }>;
  'employee.monthly.attention.blockers': Readonly<{ count: number }>;
  'employee.monthly.attention.description': undefined;
  'employee.monthly.attention.heading': undefined;
  'employee.monthly.attention.noBlockers.description': undefined;
  'employee.monthly.attention.noBlockers.title': undefined;
  'employee.monthly.attention.noWarnings': undefined;
  'employee.monthly.attention.reviewDaily': Readonly<{ date: string }>;
  'employee.monthly.attention.warnings': Readonly<{ count: number }>;
  'employee.monthly.attention.wholePeriod': undefined;
  'employee.monthly.daily.caption': Readonly<{ month: string }>;
  'employee.monthly.daily.column.absenceCredit': undefined;
  'employee.monthly.daily.column.adjustment': undefined;
  'employee.monthly.daily.column.balance': undefined;
  'employee.monthly.daily.column.break': undefined;
  'employee.monthly.daily.column.credited': undefined;
  'employee.monthly.daily.column.date': undefined;
  'employee.monthly.daily.column.expected': undefined;
  'employee.monthly.daily.column.status': undefined;
  'employee.monthly.daily.column.worked': undefined;
  'employee.monthly.daily.description': undefined;
  'employee.monthly.daily.heading': undefined;
  'employee.monthly.daily.scrollHint': undefined;
  'employee.monthly.daily.scrollLabel': undefined;
  'employee.monthly.daily.status.complete': undefined;
  'employee.monthly.daily.status.incomplete': undefined;
  'employee.monthly.daily.status.missing': undefined;
  'employee.monthly.daily.status.provisional': undefined;
  'employee.monthly.error.boundary.denied': undefined;
  'employee.monthly.error.boundary.missing': undefined;
  'employee.monthly.error.boundary.unavailable': undefined;
  'employee.monthly.error.description.denied': undefined;
  'employee.monthly.error.description.recovery': undefined;
  'employee.monthly.error.load.denied': undefined;
  'employee.monthly.error.load.missing': undefined;
  'employee.monthly.error.load.unavailable': undefined;
  'employee.monthly.error.print.denied': undefined;
  'employee.monthly.error.print.session': undefined;
  'employee.monthly.error.print.unavailable': undefined;
  'employee.monthly.error.state.denied': undefined;
  'employee.monthly.error.state.missing': undefined;
  'employee.monthly.error.state.unavailable': undefined;
  'employee.monthly.frame.description': undefined;
  'employee.monthly.frame.eyebrow': undefined;
  'employee.monthly.frame.periodDescription': Readonly<{
    employee: string;
    end: string;
    start: string;
    timeZone: string;
  }>;
  'employee.monthly.frame.printHelp': undefined;
  'employee.monthly.frame.printStatusLabel': undefined;
  'employee.monthly.frame.title': undefined;
  'employee.monthly.loading.description': undefined;
  'employee.monthly.loading.title': undefined;
  'employee.monthly.print.adjustedHeading': undefined;
  'employee.monthly.print.adjustedTotals': Readonly<{
    adjusted: string;
    closing: string;
    delta: string;
  }>;
  'employee.monthly.print.adjustmentCaption': undefined;
  'employee.monthly.print.approvedMetadata': Readonly<{ cycle: number; date: string }>;
  'employee.monthly.print.approvedTotals': Readonly<{
    balance: string;
    closing: string;
    credited: string;
    expected: string;
  }>;
  'employee.monthly.print.dailyCaption': Readonly<{ employee: string }>;
  'employee.monthly.print.dateRange': Readonly<{
    employee: string;
    end: string;
    start: string;
    timeZone: string;
  }>;
  'employee.monthly.print.footer': undefined;
  'employee.monthly.print.opened': undefined;
  'employee.monthly.print.readiness.notReady': undefined;
  'employee.monthly.print.readiness.ready': undefined;
  'employee.monthly.print.readiness.workflow': undefined;
  'employee.monthly.print.statusLine': Readonly<{ readiness: string; status: string }>;
  'employee.monthly.print.title': undefined;
  'employee.monthly.readiness.completeDates': Readonly<{ complete: number; covered: number }>;
  'employee.monthly.readiness.explanation.approved': undefined;
  'employee.monthly.readiness.explanation.incomplete': undefined;
  'employee.monthly.readiness.explanation.inProgress': undefined;
  'employee.monthly.readiness.explanation.locked': undefined;
  'employee.monthly.readiness.explanation.lockedAdjusted': undefined;
  'employee.monthly.readiness.explanation.readOnly': undefined;
  'employee.monthly.readiness.explanation.ready': undefined;
  'employee.monthly.readiness.explanation.submitted': undefined;
  'employee.monthly.readiness.label.notReady': undefined;
  'employee.monthly.readiness.label.ready': undefined;
  'employee.monthly.readiness.reviewVersion': Readonly<{ version: number }>;
  'employee.monthly.reviewer.availability.approved': undefined;
  'employee.monthly.reviewer.availability.changesRequested': undefined;
  'employee.monthly.reviewer.availability.locked': undefined;
  'employee.monthly.reviewer.availability.open': undefined;
  'employee.monthly.reviewer.availability.submitted': undefined;
  'employee.monthly.reviewer.description': undefined;
  'employee.monthly.reviewer.error.denied': undefined;
  'employee.monthly.reviewer.error.generic': undefined;
  'employee.monthly.reviewer.error.noAction': undefined;
  'employee.monthly.reviewer.error.notReady': undefined;
  'employee.monthly.reviewer.error.self': undefined;
  'employee.monthly.reviewer.error.sourceChanged': undefined;
  'employee.monthly.reviewer.error.stateChanged': undefined;
  'employee.monthly.reviewer.error.versionChanged': undefined;
  'employee.monthly.reviewer.heading': undefined;
  'employee.monthly.reviewer.lock.description': Readonly<{ cycle: number }>;
  'employee.monthly.reviewer.lock.title': undefined;
  'employee.monthly.reviewer.reason.error': undefined;
  'employee.monthly.reviewer.reason.goTo': undefined;
  'employee.monthly.reviewer.reason.help': undefined;
  'employee.monthly.reviewer.reason.label': undefined;
  'employee.monthly.reviewer.success.approved': undefined;
  'employee.monthly.reviewer.success.changesRequested': undefined;
  'employee.monthly.reviewer.success.locked': undefined;
  'employee.monthly.reviewer.success.title': undefined;
  'employee.monthly.submission.acknowledgement': Readonly<{ count: number }>;
  'employee.monthly.submission.availability.approved': undefined;
  'employee.monthly.submission.availability.incomplete': undefined;
  'employee.monthly.submission.availability.locked': undefined;
  'employee.monthly.submission.availability.ownerOnly': undefined;
  'employee.monthly.submission.availability.submitted': undefined;
  'employee.monthly.submission.description': undefined;
  'employee.monthly.submission.enableHint': undefined;
  'employee.monthly.submission.error.alreadySubmitted': undefined;
  'employee.monthly.submission.error.denied': undefined;
  'employee.monthly.submission.error.generic': undefined;
  'employee.monthly.submission.error.notReady': undefined;
  'employee.monthly.submission.error.stateChanged': undefined;
  'employee.monthly.submission.error.title': undefined;
  'employee.monthly.submission.error.versionChanged': undefined;
  'employee.monthly.submission.error.warningsChanged': undefined;
  'employee.monthly.submission.heading': undefined;
  'employee.monthly.submission.noAcknowledgement': undefined;
  'employee.monthly.submission.success': undefined;
  'employee.monthly.submission.successTitle': undefined;
  'employee.monthly.totals.ariaLabel': undefined;
  'employee.monthly.totals.description': undefined;
  'employee.monthly.totals.heading': undefined;
  'employee.monthly.totals.metric.calculatedBalance': undefined;
  'employee.monthly.totals.metric.postedClosing': undefined;
  'employee.monthly.totals.metric.postedOpening': undefined;
  'employee.monthly.totals.metric.postedPeriodDelta': undefined;
  'employee.monthly.totals.postedBalances': Readonly<{ closing: string; opening: string }>;
  'employee.notifications.actionStatus': undefined;
  'employee.notifications.card.dismiss': undefined;
  'employee.notifications.card.dismissed': undefined;
  'employee.notifications.card.dismissing': undefined;
  'employee.notifications.card.emailDelivery': undefined;
  'employee.notifications.card.openMonthlyPeriod': undefined;
  'employee.notifications.card.openRequests': undefined;
  'employee.notifications.card.recorded': undefined;
  'employee.notifications.delivery.delivered': undefined;
  'employee.notifications.delivery.failed': undefined;
  'employee.notifications.delivery.notConfigured': undefined;
  'employee.notifications.delivery.pending': undefined;
  'employee.notifications.dismiss.error': undefined;
  'employee.notifications.dismiss.errorTitle': undefined;
  'employee.notifications.dismiss.success': undefined;
  'employee.notifications.empty.description': undefined;
  'employee.notifications.empty.title': undefined;
  'employee.notifications.error.description': undefined;
  'employee.notifications.error.title': undefined;
  'employee.notifications.history.current': Readonly<{ count: number }>;
  'employee.notifications.history.heading': undefined;
  'employee.notifications.history.listLabel': undefined;
  'employee.notifications.history.refreshing': undefined;
  'employee.notifications.history.status': undefined;
  'employee.notifications.history.total': Readonly<{ count: number }>;
  'employee.notifications.loading.description': undefined;
  'employee.notifications.loading.title': undefined;
  'employee.notifications.page.description': undefined;
  'employee.notifications.page.eyebrow': undefined;
  'employee.notifications.pagination': Readonly<{ current: number; total: number }>;
  'employee.notifications.presentation.acknowledged.body': undefined;
  'employee.notifications.presentation.acknowledged.title': undefined;
  'employee.notifications.presentation.approved.body': undefined;
  'employee.notifications.presentation.approved.title': undefined;
  'employee.notifications.presentation.changesRequested.body': undefined;
  'employee.notifications.presentation.changesRequested.title': undefined;
  'employee.notifications.presentation.rejected.body': undefined;
  'employee.notifications.presentation.rejected.title': undefined;
  'employee.notifications.status.active': undefined;
  'employee.notifications.status.dismissed': undefined;
  'employee.records.pageTitle': undefined;
  'employee.records.attention.action.reviewPeriod': undefined;
  'employee.records.attention.blockers': undefined;
  'employee.records.attention.description.absenceApprovalPending': undefined;
  'employee.records.attention.description.attendanceIncomplete': undefined;
  'employee.records.attention.description.attendanceInvalidEventOrder': undefined;
  'employee.records.attention.description.attendanceInvalidEventPrecision': undefined;
  'employee.records.attention.description.attendanceOverlap': undefined;
  'employee.records.attention.description.correctionUnresolved': undefined;
  'employee.records.attention.description.flexNegativeDaily': undefined;
  'employee.records.attention.description.flexNegativePosted': undefined;
  'employee.records.attention.description.flexPositiveDaily': undefined;
  'employee.records.attention.description.flexPositivePosted': undefined;
  'employee.records.attention.description.ledgerSourceMismatch': undefined;
  'employee.records.attention.description.policyAssignmentOverlap': undefined;
  'employee.records.attention.description.policyConfigurationInvalid': undefined;
  'employee.records.attention.description.policyNotAssigned': undefined;
  'employee.records.attention.description.scheduleAssignmentOverlap': undefined;
  'employee.records.attention.description.scheduleNotAssigned': undefined;
  'employee.records.attention.description.workDuringAbsence': undefined;
  'employee.records.attention.description.workOnHoliday': undefined;
  'employee.records.attention.description.workOnZeroExpectedDay': undefined;
  'employee.records.backToTime': undefined;
  'employee.records.calculation.absenceCredit': undefined;
  'employee.records.calculation.balance': undefined;
  'employee.records.calculation.breakTime': undefined;
  'employee.records.calculation.creditedTime': undefined;
  'employee.records.calculation.expectedTime': undefined;
  'employee.records.calculation.heading': undefined;
  'employee.records.calculation.unavailable.description': undefined;
  'employee.records.calculation.unavailable.title': undefined;
  'employee.records.calculation.workedTime': undefined;
  'employee.records.description': undefined;
  'employee.records.error.denied.description': undefined;
  'employee.records.error.denied.message': undefined;
  'employee.records.error.notFound.description': undefined;
  'employee.records.error.notFound.message': undefined;
  'employee.records.error.notFound.title': undefined;
  'employee.records.error.unavailable.description': undefined;
  'employee.records.error.unavailable.message': undefined;
  'employee.records.error.unavailable.title': undefined;
  'employee.records.event.breakEnd': undefined;
  'employee.records.event.breakStart': undefined;
  'employee.records.event.clockIn': undefined;
  'employee.records.event.clockOut': undefined;
  'employee.records.events.empty.description': undefined;
  'employee.records.events.empty.title': undefined;
  'employee.records.events.heading': undefined;
  'employee.records.events.note': undefined;
  'employee.records.events.recordedOrder': Readonly<{ sequence: number }>;
  'employee.records.eyebrow': undefined;
  'employee.records.incomplete.description': undefined;
  'employee.records.incomplete.title': undefined;
  'employee.records.loading.description': undefined;
  'employee.records.loading.title': undefined;
  'employee.records.requestCorrection': undefined;
  'employee.records.sessions.breakIntervals': undefined;
  'employee.records.sessions.continuesNext': undefined;
  'employee.records.sessions.continuesPrevious': undefined;
  'employee.records.sessions.empty.description': undefined;
  'employee.records.sessions.empty.title': undefined;
  'employee.records.sessions.heading': undefined;
  'employee.records.sessions.none': undefined;
  'employee.records.sessions.note': undefined;
  'employee.records.sessions.range': Readonly<{
    duration: string;
    end: string;
    start: string;
  }>;
  'employee.records.sessions.session': Readonly<{ number: number }>;
  'employee.records.sessions.workIntervals': undefined;
  'employee.records.state.complete': undefined;
  'employee.records.state.completeDescription': undefined;
  'employee.records.state.current': undefined;
  'employee.records.state.needsReview': undefined;
  'employee.records.state.provisionalDescription': undefined;
  'employee.records.timeZoneDescription': Readonly<{ timeZone: string }>;
  'employee.requests.history.description': undefined;
  'employee.requests.history.empty.action': undefined;
  'employee.requests.history.empty.description': undefined;
  'employee.requests.history.empty.title': undefined;
  'employee.requests.history.error.description': undefined;
  'employee.requests.history.error.title': undefined;
  'employee.requests.history.eyebrow': undefined;
  'employee.requests.history.filter.action.apply': undefined;
  'employee.requests.history.filter.action.clear': undefined;
  'employee.requests.history.filter.description': undefined;
  'employee.requests.history.filter.status.all': undefined;
  'employee.requests.history.filter.status.completed': undefined;
  'employee.requests.history.filter.status.inProgress': undefined;
  'employee.requests.history.filter.status.label': undefined;
  'employee.requests.history.filter.title': undefined;
  'employee.requests.history.filter.workflow.absence': undefined;
  'employee.requests.history.filter.workflow.all': undefined;
  'employee.requests.history.filter.workflow.cancellation': undefined;
  'employee.requests.history.filter.workflow.correction': undefined;
  'employee.requests.history.filter.workflow.label': undefined;
  'employee.requests.history.kind.absence': undefined;
  'employee.requests.history.kind.cancellation': undefined;
  'employee.requests.history.kind.correction': undefined;
  'employee.requests.history.loading.description': undefined;
  'employee.requests.history.loading.title': undefined;
  'employee.requests.history.new': undefined;
  'employee.requests.history.results.count': Readonly<{ count: number }>;
  'employee.requests.history.results.heading': undefined;
  'employee.requests.history.results.pagination': Readonly<{
    current: number;
    pages: number;
    total: number;
  }>;
  'employee.requests.history.results.refreshing': undefined;
  'employee.requests.history.submitted': Readonly<{ date: string }>;
  'employee.requests.history.viewDetails': undefined;
  'employee.requests.history.dateRange': Readonly<{ end: string; start: string }>;
  'employee.requests.detail.absence.cancellationLink': Readonly<{
    date: string;
    status: string;
  }>;
  'employee.requests.detail.absence.cancellations': undefined;
  'employee.requests.detail.absence.description': undefined;
  'employee.requests.detail.absence.heading': undefined;
  'employee.requests.detail.absence.type': undefined;
  'employee.requests.detail.absence.workflowLabel': undefined;
  'employee.requests.detail.absence.workflow.approval': undefined;
  'employee.requests.detail.absence.workflow.report': undefined;
  'employee.requests.detail.action.available': undefined;
  'employee.requests.detail.action.effect.cancel': undefined;
  'employee.requests.detail.action.effect.withdraw': undefined;
  'employee.requests.detail.action.error.changed': undefined;
  'employee.requests.detail.action.error.generic': undefined;
  'employee.requests.detail.action.error.locked': undefined;
  'employee.requests.detail.action.errorTitle': undefined;
  'employee.requests.detail.action.label.cancel': undefined;
  'employee.requests.detail.action.label.withdraw': undefined;
  'employee.requests.detail.action.pending': undefined;
  'employee.requests.detail.action.success.cancel': undefined;
  'employee.requests.detail.action.success.withdraw': undefined;
  'employee.requests.detail.action.successTitle': undefined;
  'employee.requests.detail.back': undefined;
  'employee.requests.detail.cancellation.absenceType': Readonly<{ type: string }>;
  'employee.requests.detail.cancellation.description': undefined;
  'employee.requests.detail.cancellation.heading': undefined;
  'employee.requests.detail.cancellation.viewOriginal': undefined;
  'employee.requests.detail.correction.applicationLabel': undefined;
  'employee.requests.detail.correction.application.ordinary': undefined;
  'employee.requests.detail.correction.application.postLock': undefined;
  'employee.requests.detail.correction.description': undefined;
  'employee.requests.detail.correction.ends': undefined;
  'employee.requests.detail.correction.events.empty': undefined;
  'employee.requests.detail.correction.events.event': undefined;
  'employee.requests.detail.correction.events.heading': undefined;
  'employee.requests.detail.correction.heading': undefined;
  'employee.requests.detail.correction.original': undefined;
  'employee.requests.detail.correction.proposed': undefined;
  'employee.requests.detail.correction.reason': undefined;
  'employee.requests.detail.correction.starts': undefined;
  'employee.requests.detail.currentState': undefined;
  'employee.requests.detail.error.denied.description': undefined;
  'employee.requests.detail.error.denied.title': undefined;
  'employee.requests.detail.error.missing.description': undefined;
  'employee.requests.detail.error.missing.title': undefined;
  'employee.requests.detail.error.unavailable.description': undefined;
  'employee.requests.detail.error.unavailable.title': undefined;
  'employee.requests.detail.event': Readonly<{ event: string; time: string }>;
  'employee.requests.detail.history.action.acknowledge': undefined;
  'employee.requests.detail.history.action.apply': undefined;
  'employee.requests.detail.history.action.approve': undefined;
  'employee.requests.detail.history.action.cancel': undefined;
  'employee.requests.detail.history.action.reject': undefined;
  'employee.requests.detail.history.action.reported': undefined;
  'employee.requests.detail.history.action.requestChanges': undefined;
  'employee.requests.detail.history.action.submitted': undefined;
  'employee.requests.detail.history.action.withdraw': undefined;
  'employee.requests.detail.history.actor.reviewer': undefined;
  'employee.requests.detail.history.actor.self': undefined;
  'employee.requests.detail.history.actor.system': undefined;
  'employee.requests.detail.history.by': Readonly<{ actor: string }>;
  'employee.requests.detail.history.description': undefined;
  'employee.requests.detail.history.heading': undefined;
  'employee.requests.detail.history.reason': Readonly<{ reason: string }>;
  'employee.requests.detail.loading.description': undefined;
  'employee.requests.detail.loading.message': undefined;
  'employee.requests.detail.loading.title': undefined;
  'employee.requests.detail.metric.balance': undefined;
  'employee.requests.detail.metric.break': undefined;
  'employee.requests.detail.metric.credited': undefined;
  'employee.requests.detail.metric.expected': undefined;
  'employee.requests.detail.metric.worked': undefined;
  'employee.requests.detail.missingIdentifier.description': undefined;
  'employee.requests.detail.state.absence.approved': undefined;
  'employee.requests.detail.state.absence.cancelled': undefined;
  'employee.requests.detail.state.absence.changesRequested': undefined;
  'employee.requests.detail.state.absence.complete': undefined;
  'employee.requests.detail.state.absence.pending': undefined;
  'employee.requests.detail.state.absence.reported': undefined;
  'employee.requests.detail.state.cancellation.approved': undefined;
  'employee.requests.detail.state.cancellation.changesRequested': undefined;
  'employee.requests.detail.state.cancellation.pending': undefined;
  'employee.requests.detail.state.cancellation.rejected': undefined;
  'employee.requests.detail.state.cancellation.withdrawn': undefined;
  'employee.requests.detail.state.correction.applied': undefined;
  'employee.requests.detail.state.correction.approved': undefined;
  'employee.requests.detail.state.correction.changesRequested': undefined;
  'employee.requests.detail.state.correction.complete': undefined;
  'employee.requests.detail.state.correction.pending': undefined;
  'employee.requests.detail.submitted': Readonly<{ date: string }>;
  'employee.requests.detail.timeRange': Readonly<{ end: string; start: string }>;
  'employee.requests.detail.pageTitle': undefined;
  'employee.requests.detail.title.cancellation': undefined;
  'employee.requests.detail.title.correction': undefined;
  'employee.requests.detail.unknownTime': undefined;
  'employee.requests.new.description': undefined;
  'employee.requests.new.eyebrow': undefined;
  'employee.requests.new.selection.description': undefined;
  'employee.requests.new.selection.heading': undefined;
  'employee.requests.new.selection.selected': undefined;
  'employee.requests.new.selection.change': undefined;
  'employee.requests.new.workflow.correction.action': undefined;
  'employee.requests.new.workflow.correction.description': undefined;
  'employee.requests.new.workflow.correction.title': undefined;
  'employee.requests.new.workflow.sickness.action': undefined;
  'employee.requests.new.workflow.sickness.description': undefined;
  'employee.requests.new.workflow.sickness.title': undefined;
  'employee.requests.new.workflow.vacation.action': undefined;
  'employee.requests.new.workflow.vacation.description': undefined;
  'employee.requests.new.workflow.vacation.title': undefined;
  'employee.requests.new.workflowTitle.correction': undefined;
  'employee.requests.new.workflowTitle.sickness': undefined;
  'employee.requests.new.workflowTitle.vacation': undefined;
  'employee.time.balance.eligibleProjection': undefined;
  'employee.time.balance.excluded.description': Readonly<{ dates: string }>;
  'employee.time.balance.excluded.title': undefined;
  'employee.time.balance.heading': undefined;
  'employee.time.balance.help': undefined;
  'employee.time.balance.posted': undefined;
  'employee.time.balance.projected': undefined;
  'employee.time.balancesDescription': undefined;
  'employee.time.balancesTitle': undefined;
  'employee.time.description': undefined;
  'employee.time.entryType.allocation': undefined;
  'employee.time.entryType.approvedDeduction': undefined;
  'employee.time.entryType.cancellationRestoration': undefined;
  'employee.time.entryType.carryover': undefined;
  'employee.time.entryType.dailyDelta': undefined;
  'employee.time.entryType.dailyRecalculationDelta': undefined;
  'employee.time.entryType.expiry': undefined;
  'employee.time.entryType.manualAdjustment': undefined;
  'employee.time.entryType.manualAdministrativeAdjustment': undefined;
  'employee.time.entryType.openingBalance': undefined;
  'employee.time.entryType.pendingReservation': undefined;
  'employee.time.entryType.postLockAdjustment': undefined;
  'employee.time.entryType.reservationRelease': undefined;
  'employee.time.error.denied.description': undefined;
  'employee.time.error.denied.title': undefined;
  'employee.time.error.unavailable.description': undefined;
  'employee.time.error.unavailable.title': undefined;
  'employee.time.eyebrow': undefined;
  'employee.time.filter.date': undefined;
  'employee.time.filter.description': undefined;
  'employee.time.filter.month': undefined;
  'employee.time.filter.title': undefined;
  'employee.time.filter.view': undefined;
  'employee.time.filter.viewLabel': undefined;
  'employee.time.filter.week': undefined;
  'employee.time.leave.account': undefined;
  'employee.time.leave.available': undefined;
  'employee.time.leave.description': undefined;
  'employee.time.leave.empty.description': undefined;
  'employee.time.leave.empty.title': undefined;
  'employee.time.leave.entry': undefined;
  'employee.time.leave.heading': undefined;
  'employee.time.leave.ledger.description': undefined;
  'employee.time.leave.ledger.empty.description': undefined;
  'employee.time.leave.ledger.empty.title': undefined;
  'employee.time.leave.ledger.heading': undefined;
  'employee.time.leave.ledger.pagination': Readonly<{ current: number; total: number }>;
  'employee.time.leave.pendingReservation': undefined;
  'employee.time.leave.projectedAfter': undefined;
  'employee.time.leave.projectedRemaining': undefined;
  'employee.time.leave.availableAfter': undefined;
  'employee.time.leave.reservedAfter': undefined;
  'employee.time.ledger.balanceAfter': Readonly<{ balance: string }>;
  'employee.time.ledger.description': undefined;
  'employee.time.ledger.effective': Readonly<{ date: string }>;
  'employee.time.ledger.empty.description': undefined;
  'employee.time.ledger.empty.title': undefined;
  'employee.time.ledger.heading': undefined;
  'employee.time.ledger.pagination': Readonly<{ current: number; total: number }>;
  'employee.time.loading.description': undefined;
  'employee.time.loading.title': undefined;
  'employee.time.period.month': undefined;
  'employee.time.period.range': Readonly<{ end: string; start: string }>;
  'employee.time.period.reviewMonthly': undefined;
  'employee.time.period.summary.balance': Readonly<{ balance: string }>;
  'employee.time.period.summary.incomplete': Readonly<{ count: number }>;
  'employee.time.period.summary.recordedDays': Readonly<{ count: number }>;
  'employee.time.period.week': undefined;
  'employee.time.records.attention.incomplete': undefined;
  'employee.time.records.attention.none': undefined;
  'employee.time.records.attention.review': Readonly<{ count: number }>;
  'employee.time.records.attention.warnings': Readonly<{ count: number }>;
  'employee.time.records.caption': undefined;
  'employee.time.records.column.attention': undefined;
  'employee.time.records.column.balance': undefined;
  'employee.time.records.column.credited': undefined;
  'employee.time.records.column.date': undefined;
  'employee.time.records.column.expected': undefined;
  'employee.time.records.column.status': undefined;
  'employee.time.records.description': undefined;
  'employee.time.records.heading': undefined;
  'employee.time.records.scrollLabel': undefined;
  'employee.time.records.status.complete': undefined;
  'employee.time.records.status.incomplete': undefined;
  'employee.time.records.status.noRecord': undefined;
  'employee.time.records.status.provisional': undefined;
  'employee.time.title': undefined;
  'employee.today.attendance.action.clockIn': undefined;
  'employee.today.attendance.action.clockOut': undefined;
  'employee.today.attendance.action.resume': undefined;
  'employee.today.attendance.action.startBreak': undefined;
  'employee.today.attendance.actionsLabel': undefined;
  'employee.today.attendance.confirm.cancel': undefined;
  'employee.today.attendance.confirm.description': undefined;
  'employee.today.attendance.confirm.submit': undefined;
  'employee.today.attendance.confirm.title': undefined;
  'employee.today.attendance.currentBreak': undefined;
  'employee.today.attendance.currentStatus': undefined;
  'employee.today.attendance.currentWorkInterval': undefined;
  'employee.today.attendance.error.breakConfirmation': undefined;
  'employee.today.attendance.error.conflict': Readonly<{ outcome: string }>;
  'employee.today.attendance.error.invalidState': Readonly<{ outcome: string }>;
  'employee.today.attendance.error.rateLimited': Readonly<{ outcome: string }>;
  'employee.today.attendance.error.stateChanged': Readonly<{ outcome: string; state: string }>;
  'employee.today.attendance.error.uncertain': Readonly<{ outcome: string }>;
  'employee.today.attendance.feedback.errorTitle': undefined;
  'employee.today.attendance.feedback.infoTitle': undefined;
  'employee.today.attendance.feedback.successTitle': undefined;
  'employee.today.attendance.noActiveInterval': undefined;
  'employee.today.attendance.outcome.clockIn': undefined;
  'employee.today.attendance.outcome.clockOut': undefined;
  'employee.today.attendance.outcome.resume': undefined;
  'employee.today.attendance.outcome.startBreak': undefined;
  'employee.today.attendance.pending.clockIn': undefined;
  'employee.today.attendance.pending.clockOut': undefined;
  'employee.today.attendance.pending.resume': undefined;
  'employee.today.attendance.pending.startBreak': undefined;
  'employee.today.attendance.recovery.dependency.description': undefined;
  'employee.today.attendance.recovery.dependency.title': undefined;
  'employee.today.attendance.recovery.offline.description': undefined;
  'employee.today.attendance.recovery.offline.title': undefined;
  'employee.today.attendance.recovery.reconnecting.description': undefined;
  'employee.today.attendance.recovery.reconnecting.title': undefined;
  'employee.today.attendance.remoteChanged': Readonly<{ state: string }>;
  'employee.today.attendance.since': undefined;
  'employee.today.attendance.state.offWork': undefined;
  'employee.today.attendance.state.onBreak': undefined;
  'employee.today.attendance.state.working': undefined;
  'employee.today.attendance.success.clockIn': Readonly<{ time: string }>;
  'employee.today.attendance.success.clockOut': Readonly<{ time: string }>;
  'employee.today.attendance.success.resume': Readonly<{ time: string }>;
  'employee.today.attendance.success.startBreak': Readonly<{ time: string }>;
  'employee.today.attention.affectedDate': undefined;
  'employee.today.attention.blockingIssues': undefined;
  'employee.today.attention.blocksSubmission': undefined;
  'employee.today.attention.descriptor.absenceApprovalPending.next': undefined;
  'employee.today.attention.descriptor.absenceApprovalPending.reason': undefined;
  'employee.today.attention.descriptor.absenceApprovalPending.title': undefined;
  'employee.today.attention.descriptor.attendanceIncomplete.title': undefined;
  'employee.today.attention.descriptor.attendanceInvalidEventOrder.title': undefined;
  'employee.today.attention.descriptor.attendanceInvalidEventPrecision.title': undefined;
  'employee.today.attention.descriptor.attendanceOverlap.title': undefined;
  'employee.today.attention.descriptor.calculation.reason': undefined;
  'employee.today.attention.descriptor.calculation.next': undefined;
  'employee.today.attention.descriptor.correctionUnresolved.next': undefined;
  'employee.today.attention.descriptor.correctionUnresolved.reason': undefined;
  'employee.today.attention.descriptor.correctionUnresolved.title': undefined;
  'employee.today.attention.descriptor.flexNegative.next': undefined;
  'employee.today.attention.descriptor.flexNegative.reason': undefined;
  'employee.today.attention.descriptor.flexNegative.title': undefined;
  'employee.today.attention.descriptor.flexPositive.next': undefined;
  'employee.today.attention.descriptor.flexPositive.reason': undefined;
  'employee.today.attention.descriptor.flexPositive.title': undefined;
  'employee.today.attention.descriptor.ledgerSourceMismatch.title': undefined;
  'employee.today.attention.descriptor.policyAssignmentOverlap.title': undefined;
  'employee.today.attention.descriptor.policyConfigurationInvalid.title': undefined;
  'employee.today.attention.descriptor.policyNotAssigned.title': undefined;
  'employee.today.attention.descriptor.recovery.next': undefined;
  'employee.today.attention.descriptor.recovery.reason': undefined;
  'employee.today.attention.descriptor.scheduleAssignmentOverlap.title': undefined;
  'employee.today.attention.descriptor.scheduleNotAssigned.title': undefined;
  'employee.today.attention.descriptor.administrator.next': undefined;
  'employee.today.attention.descriptor.administrator.reason': undefined;
  'employee.today.attention.descriptor.workDuringAbsence.title': undefined;
  'employee.today.attention.descriptor.workOnHoliday.title': undefined;
  'employee.today.attention.descriptor.workOnZeroExpectedDay.title': undefined;
  'employee.today.attention.doesNotBlockSubmission': undefined;
  'employee.today.attention.newUrgent': Readonly<{ titles: string }>;
  'employee.today.attention.next': undefined;
  'employee.today.attention.postedBalanceThrough': undefined;
  'employee.today.attention.recovery.fixEntry': undefined;
  'employee.today.attention.recovery.reviewBalanceHistory': undefined;
  'employee.today.attention.recovery.reviewCalculation': undefined;
  'employee.today.attention.recovery.reviewRecord': undefined;
  'employee.today.attention.recovery.reviewRequest': undefined;
  'employee.today.attention.recovery.reviewTimeline': undefined;
  'employee.today.attention.title': undefined;
  'employee.today.attention.warnings': undefined;
  'employee.today.calculation.caption': undefined;
  'employee.today.calculation.detailsDescription': undefined;
  'employee.today.calculation.detailsTitle': undefined;
  'employee.today.calculation.footnote': undefined;
  'employee.today.calculation.group.credited': undefined;
  'employee.today.calculation.group.expected': undefined;
  'employee.today.calculation.group.result': undefined;
  'employee.today.calculation.heading': undefined;
  'employee.today.calculation.row.absenceCredit': undefined;
  'employee.today.calculation.row.absenceReduction': undefined;
  'employee.today.calculation.row.approvedCorrections': undefined;
  'employee.today.calculation.row.breaksExcluded': undefined;
  'employee.today.calculation.row.creditedToday': undefined;
  'employee.today.calculation.row.expectedToday': undefined;
  'employee.today.calculation.row.holidayReduction': undefined;
  'employee.today.calculation.row.otherAdjustments': undefined;
  'employee.today.calculation.row.provisionalDifference': undefined;
  'employee.today.calculation.row.recordedWork': undefined;
  'employee.today.calculation.row.scheduledTime': undefined;
  'employee.today.calculation.source': undefined;
  'employee.today.calculation.statusIncomplete': undefined;
  'employee.today.calculation.statusProvisional': undefined;
  'employee.today.calculation.time': undefined;
  'employee.today.calculation.zeroExpected.generic': undefined;
  'employee.today.calculation.zeroExpected.heading': undefined;
  'employee.today.calculation.zeroExpected.holiday': Readonly<{ holidayName: string }>;
  'employee.today.calculation.zeroExpected.workCredit': undefined;
  'employee.today.overview.ariaLabel': undefined;
  'employee.today.overview.estimatedFinish': undefined;
  'employee.today.overview.estimatedFinishAssumption': undefined;
  'employee.today.overview.finish.calculationIncomplete': undefined;
  'employee.today.overview.finish.calculationUnavailable': undefined;
  'employee.today.overview.finish.expectationMet': undefined;
  'employee.today.overview.finish.notAvailable': undefined;
  'employee.today.overview.finish.resumeToEstimate': undefined;
  'employee.today.overview.finish.startToEstimate': undefined;
  'employee.today.overview.flexibleTime': undefined;
  'employee.today.overview.holiday': Readonly<{ holidayName: string }>;
  'employee.today.overview.noPostedEntries': undefined;
  'employee.today.overview.postedBalance': undefined;
  'employee.today.overview.postedThrough': Readonly<{ date: string }>;
  'employee.today.overview.progressAriaLabel': undefined;
  'employee.today.overview.progressCredited': Readonly<{ credited: string }>;
  'employee.today.overview.progressDescription': Readonly<{ credited: string; expected: string }>;
  'employee.today.overview.progressUnavailable': undefined;
  'employee.today.overview.progressUnavailableDescription': undefined;
  'employee.today.overview.progressWithoutExpectation': Readonly<{ credited: string }>;
  'employee.today.overview.provisionalDifference': undefined;
  'employee.today.overview.remainingToday': undefined;
  'employee.today.overview.statusIncomplete': undefined;
  'employee.today.overview.statusProvisional': undefined;
  'employee.today.overview.todayExcludedFromPosted': undefined;
  'employee.today.overview.title': undefined;
  'employee.today.overview.workedToday': undefined;
  'employee.today.overview.breaks': undefined;
  'employee.today.page.description': undefined;
  'employee.today.page.estimateUpdated': Readonly<{ time: string }>;
  'employee.today.page.eyebrow': undefined;
  'employee.today.page.loadError.description': undefined;
  'employee.today.page.loadError.message': undefined;
  'employee.today.page.loadError.title': undefined;
  'employee.today.page.loading.description': undefined;
  'employee.today.page.loading.message': undefined;
  'employee.today.page.loading.title': undefined;
  'employee.today.page.offline.description': undefined;
  'employee.today.page.offline.message': undefined;
  'employee.today.page.permission.description': undefined;
  'employee.today.page.requestReference': Readonly<{ requestId: string }>;
  'employee.today.page.title': undefined;
  'employee.today.page.updating': undefined;
  'employee.today.timeline.approvedInterpretation': undefined;
  'employee.today.timeline.correction': Readonly<{
    after: string;
    before: string;
    difference: string;
  }>;
  'employee.today.timeline.description.empty': Readonly<{ date: string; timeZone: string }>;
  'employee.today.timeline.description.events': Readonly<{
    count: number;
    date: string;
    timeZone: string;
  }>;
  'employee.today.timeline.empty': undefined;
  'employee.today.timeline.event.breakEnd.description': undefined;
  'employee.today.timeline.event.breakEnd.label': undefined;
  'employee.today.timeline.event.breakStart.description': undefined;
  'employee.today.timeline.event.breakStart.label': undefined;
  'employee.today.timeline.event.clockIn.description': undefined;
  'employee.today.timeline.event.clockIn.label': undefined;
  'employee.today.timeline.event.clockOut.description': undefined;
  'employee.today.timeline.event.clockOut.label': undefined;
  'employee.today.timeline.incomplete.description': undefined;
  'employee.today.timeline.incomplete.title': undefined;
  'employee.today.timeline.originalEvents': undefined;
  'employee.today.timeline.title': undefined;
  'shared.duration.hours': Readonly<{ count: number }>;
  'shared.duration.minutes': Readonly<{ count: number }>;
  'shared.duration.compact': Readonly<{ hours: string; minutes: string }>;
  'shared.action.close': undefined;
  'shared.action.goHome': undefined;
  'shared.action.reload': undefined;
  'shared.action.returnHome': undefined;
  'shared.action.tryAgain': undefined;
  'shared.application.startup.description': undefined;
  'shared.application.startup.title': undefined;
  'shared.i18n.greeting': Readonly<{ name: string }>;
  'shared.i18n.initializing': undefined;
  'shared.i18n.loadError': undefined;
  'shared.locale.accountDescription': undefined;
  'shared.locale.accountSaveFailed': undefined;
  'shared.locale.accountSaved': undefined;
  'shared.locale.deviceDescription': undefined;
  'shared.locale.deviceSaveFailed': undefined;
  'shared.locale.deviceSaved': undefined;
  'shared.locale.invitationDescription': undefined;
  'shared.locale.label': undefined;
  'shared.locale.accountSaveFailedTitle': undefined;
  'shared.locale.accountSavedTitle': undefined;
  'shared.navigation.account': undefined;
  'shared.navigation.brandHome': Readonly<{ organizationName: string }>;
  'shared.navigation.current': undefined;
  'shared.navigation.destination.desktop': Readonly<{ area: string }>;
  'shared.navigation.destination.mobile': Readonly<{ area: string }>;
  'shared.navigation.drawerTitle': undefined;
  'shared.navigation.menu': undefined;
  'shared.navigation.mobileAccount': undefined;
  'shared.navigation.mobileWorkAreas': undefined;
  'shared.navigation.skipToContent': undefined;
  'shared.navigation.workAreas': undefined;
  'shared.navigation.workArea.employee': undefined;
  'shared.navigation.workArea.hr': undefined;
  'shared.navigation.workArea.manager': undefined;
  'shared.navigation.workArea.system': undefined;
  'shared.pagination.label': undefined;
  'shared.pagination.next': undefined;
  'shared.pagination.previous': undefined;
  'shared.pagination.summary': Readonly<{ current: number; total: number }>;
  'shared.route.boundary.notFound.description': undefined;
  'shared.route.boundary.notFound.title': undefined;
  'shared.route.boundary.permissionDenied.description': undefined;
  'shared.route.boundary.permissionDenied.title': undefined;
  'shared.route.boundary.unavailable.description': undefined;
  'shared.route.boundary.unavailable.title': undefined;
  'shared.route.boundary.rootUnavailable.description': undefined;
  'shared.route.boundary.rootUnavailable.title': undefined;
  'shared.route.title.approvalInbox': undefined;
  'shared.route.title.audit': undefined;
  'shared.route.title.calendar': undefined;
  'shared.route.title.employees': undefined;
  'shared.route.title.myBalances': undefined;
  'shared.route.title.myTime': undefined;
  'shared.route.title.notifications': undefined;
  'shared.route.title.profile': undefined;
  'shared.route.title.reports': undefined;
  'shared.route.title.requests': undefined;
  'shared.route.title.settingsAbsence': undefined;
  'shared.route.title.settingsHolidays': undefined;
  'shared.route.title.settingsTime': undefined;
  'shared.route.title.systemAccounts': undefined;
  'shared.route.title.systemAudit': undefined;
  'shared.route.title.systemOperations': undefined;
  'shared.route.title.teamCalendar': undefined;
  'shared.route.title.teamStatus': undefined;
  'shared.route.title.teams': undefined;
  'shared.route.title.today': undefined;
  'shared.workflow.status.acknowledged': undefined;
  'shared.workflow.status.applied': undefined;
  'shared.workflow.status.approved': undefined;
  'shared.workflow.status.cancelled': undefined;
  'shared.workflow.status.changesRequested': undefined;
  'shared.workflow.status.locked': undefined;
  'shared.workflow.status.open': undefined;
  'shared.workflow.status.partiallyCancelled': undefined;
  'shared.workflow.status.pendingDecision': undefined;
  'shared.workflow.status.rejected': undefined;
  'shared.workflow.status.reported': undefined;
  'shared.workflow.status.submitted': undefined;
  'shared.workflow.status.withdrawn': undefined;
  'shared.signOut.action': undefined;
  'shared.signOut.actionPending': undefined;
  'shared.signOut.failureDescription': undefined;
  'shared.signOut.failureTitle': undefined;
  'shared.profile.account.details': undefined;
  'shared.profile.account.readOnlyHelp': undefined;
  'shared.profile.description': undefined;
  'shared.profile.employee.details': undefined;
  'shared.profile.employee.notLinked': undefined;
  'shared.profile.employee.technicalAccount': undefined;
  'shared.profile.field.applicationRoles': undefined;
  'shared.profile.field.email': undefined;
  'shared.profile.field.employeeNumber': undefined;
  'shared.profile.field.employmentStatus': undefined;
  'shared.profile.field.organization': undefined;
  'shared.profile.loading.description': undefined;
  'shared.profile.loading.title': undefined;
  'shared.profile.noneAssigned': undefined;
  'shared.profile.preference.eyebrow': undefined;
  'shared.profile.preference.title': undefined;
  'shared.profile.role.employee': undefined;
  'shared.profile.role.hrAdministrator': undefined;
  'shared.profile.role.manager': undefined;
  'shared.profile.role.systemAdministrator': undefined;
  'shared.profile.session.current': undefined;
  'shared.profile.session.device': Readonly<{ browser: string; platform: string }>;
  'shared.profile.session.deviceLabels.browser': undefined;
  'shared.profile.session.deviceLabels.chrome': undefined;
  'shared.profile.session.deviceLabels.edge': undefined;
  'shared.profile.session.deviceLabels.firefox': undefined;
  'shared.profile.session.deviceLabels.safari': undefined;
  'shared.profile.session.deviceLabels.unrecognized': undefined;
  'shared.profile.session.expires': Readonly<{ value: string }>;
  'shared.profile.session.lastActive': Readonly<{ value: string }>;
  'shared.profile.session.platform.android': undefined;
  'shared.profile.session.platform.ios': undefined;
  'shared.profile.session.platform.linux': undefined;
  'shared.profile.session.platform.macos': undefined;
  'shared.profile.session.platform.windows': undefined;
  'shared.profile.session.revoke': undefined;
  'shared.profile.session.revoked': Readonly<{ device: string }>;
  'shared.profile.session.signOutCurrent': undefined;
  'shared.profile.session.signingOut': undefined;
  'shared.profile.sessions.description': undefined;
  'shared.profile.sessions.empty.description': undefined;
  'shared.profile.sessions.empty.title': undefined;
  'shared.profile.sessions.title': undefined;
  'shared.profile.status.active': undefined;
  'shared.profile.status.inactive': undefined;
  'shared.profile.status.sessionNotRevoked.description': undefined;
  'shared.profile.status.sessionNotRevoked.freshSession': undefined;
  'shared.profile.status.sessionNotRevoked.sessionExpired': undefined;
  'shared.profile.status.sessionNotRevoked.title': undefined;
  'shared.profile.status.sessionRevoked.title': undefined;
  'shared.profile.title': undefined;
  'shared.profile.unavailable.description': undefined;
  'shared.profile.unavailable.title': undefined;
  'shared.validation.problemTitle': undefined;
  'shared.validation.correctValue': undefined;
  'shared.validation.invalidFormat': undefined;
  'shared.validation.invalidType': undefined;
  'shared.validation.invalidValue': undefined;
  'shared.validation.required': undefined;
  'shared.validation.unknownField': undefined;
  'shared.validation.valueTooLarge': undefined;
  'shared.validation.valueTooSmall': undefined;
}>;

export const MESSAGE_KEYS = [
  'auth.activation.action',
  'auth.activation.actionPending',
  'auth.activation.description',
  'auth.activation.eyebrow',
  'auth.activation.invalid.description',
  'auth.activation.invalid.title',
  'auth.activation.title',
  'auth.error.activation.invalid',
  'auth.error.activation.rateLimited',
  'auth.error.passwordPolicy',
  'auth.error.recovery.generic',
  'auth.error.recovery.rateLimited',
  'auth.error.reset.invalid',
  'auth.error.reset.rateLimited',
  'auth.error.signIn.generic',
  'auth.error.signIn.invalid',
  'auth.error.signIn.rateLimited',
  'auth.field.confirmPassword',
  'auth.field.email',
  'auth.field.newPassword',
  'auth.field.password',
  'auth.layout.description',
  'auth.layout.introductionLabel',
  'auth.layout.skipToContent',
  'auth.layout.title',
  'auth.navigation.backToSignIn',
  'auth.navigation.forgotPassword',
  'auth.navigation.requestAnotherRecovery',
  'auth.navigation.returnToSignIn',
  'auth.notice.accountActivated.message',
  'auth.notice.accountActivated.title',
  'auth.notice.passwordReset.message',
  'auth.notice.passwordReset.title',
  'auth.notice.sessionExpired.message',
  'auth.notice.sessionExpired.title',
  'auth.notice.signedOut.message',
  'auth.notice.signedOut.title',
  'auth.recovery.action',
  'auth.recovery.actionPending',
  'auth.recovery.complete.description',
  'auth.recovery.complete.focus',
  'auth.recovery.complete.title',
  'auth.recovery.description',
  'auth.recovery.eyebrow',
  'auth.recovery.title',
  'auth.reset.action',
  'auth.reset.actionPending',
  'auth.reset.description',
  'auth.reset.invalid.description',
  'auth.reset.invalid.title',
  'auth.reset.title',
  'auth.signIn.action',
  'auth.signIn.actionPending',
  'auth.signIn.description',
  'auth.signIn.eyebrow',
  'auth.signIn.title',
  'auth.validation.confirmPasswordRequired',
  'auth.validation.emailInvalid',
  'auth.validation.emailRequired',
  'auth.validation.passwordMismatch',
  'auth.validation.passwordRequired',
  'auth.validation.passwordLength',
  'employee.absence.action.cancel',
  'employee.absence.action.viewDetails',
  'employee.absence.coverage.field.endTime',
  'employee.absence.coverage.field.firstDay',
  'employee.absence.coverage.field.lastDay',
  'employee.absence.coverage.field.localDate',
  'employee.absence.coverage.field.startTime',
  'employee.absence.coverage.help',
  'employee.absence.coverage.label',
  'employee.absence.coverage.line',
  'employee.absence.coverage.name.firstHalf',
  'employee.absence.coverage.name.fullDay',
  'employee.absence.coverage.name.secondHalf',
  'employee.absence.coverage.option.exact',
  'employee.absence.coverage.option.firstHalf',
  'employee.absence.coverage.option.fullDayRange',
  'employee.absence.coverage.option.secondHalf',
  'employee.absence.coverage.validation.endAfterStart',
  'employee.absence.coverage.validation.endTime',
  'employee.absence.coverage.validation.firstDay',
  'employee.absence.coverage.validation.lastDay',
  'employee.absence.coverage.validation.lastDayAfterFirst',
  'employee.absence.coverage.validation.localDate',
  'employee.absence.coverage.validation.startTime',
  'employee.absence.sickness.cancellation.cannotCancel',
  'employee.absence.sickness.cancellation.description',
  'employee.absence.sickness.cancellation.error',
  'employee.absence.sickness.cancellation.locked',
  'employee.absence.sickness.cancellation.pending',
  'employee.absence.sickness.cancellation.request',
  'employee.absence.sickness.cancellation.requested',
  'employee.absence.sickness.description',
  'employee.absence.sickness.error.correct',
  'employee.absence.sickness.error.overlap',
  'employee.absence.sickness.error.retroactive',
  'employee.absence.sickness.error.unavailable',
  'employee.absence.sickness.eyebrow',
  'employee.absence.sickness.form.legend',
  'employee.absence.sickness.form.notice',
  'employee.absence.sickness.form.submit',
  'employee.absence.sickness.form.submitting',
  'employee.absence.sickness.success.coverageLabel',
  'employee.absence.sickness.success.credited',
  'employee.absence.sickness.success.description',
  'employee.absence.sickness.success.holidayNote',
  'employee.absence.sickness.success.title',
  'employee.absence.sickness.title',
  'employee.absence.vacation.description',
  'employee.absence.vacation.error.correct',
  'employee.absence.vacation.error.overlap',
  'employee.absence.vacation.error.scheduleMissing',
  'employee.absence.vacation.error.unavailable',
  'employee.absence.vacation.eyebrow',
  'employee.absence.vacation.form.legend',
  'employee.absence.vacation.form.notice',
  'employee.absence.vacation.form.submit',
  'employee.absence.vacation.form.submitting',
  'employee.absence.vacation.success.coverageLabel',
  'employee.absence.vacation.success.holidayNote',
  'employee.absence.vacation.success.summary',
  'employee.absence.vacation.success.title',
  'employee.absence.vacation.success.zeroHourNote',
  'employee.absence.vacation.title',
  'employee.correction.action.backToTime',
  'employee.correction.action.cancel',
  'employee.correction.description',
  'employee.correction.error.correct',
  'employee.correction.error.interval',
  'employee.correction.error.notFound',
  'employee.correction.error.unavailable',
  'employee.correction.eyebrow',
  'employee.correction.form.field.endOffset',
  'employee.correction.form.field.endTime',
  'employee.correction.form.field.reason',
  'employee.correction.form.field.startOffset',
  'employee.correction.form.field.startTime',
  'employee.correction.form.help',
  'employee.correction.form.legend',
  'employee.correction.form.reasonHelp',
  'employee.correction.form.submit',
  'employee.correction.form.submitting',
  'employee.correction.loading.description',
  'employee.correction.loading.heading',
  'employee.correction.loading.title',
  'employee.correction.missing.description',
  'employee.correction.missing.title',
  'employee.correction.original.currentWorked',
  'employee.correction.original.description',
  'employee.correction.original.empty',
  'employee.correction.original.event',
  'employee.correction.original.heading',
  'employee.correction.success.description',
  'employee.correction.success.locked',
  'employee.correction.success.ordinary',
  'employee.correction.success.title',
  'employee.correction.title',
  'employee.correction.unavailable.denied.description',
  'employee.correction.unavailable.denied.title',
  'employee.correction.unavailable.record.description',
  'employee.correction.unavailable.record.title',
  'employee.correction.validation.endOffset',
  'employee.correction.validation.endTime',
  'employee.correction.validation.reason',
  'employee.correction.validation.startOffset',
  'employee.correction.validation.startTime',
  'employee.calendar.agenda.label',
  'employee.calendar.description',
  'employee.calendar.detail.absence',
  'employee.calendar.detail.holiday',
  'employee.calendar.empty.description',
  'employee.calendar.empty.title',
  'employee.calendar.entries',
  'employee.calendar.error.denied.description',
  'employee.calendar.error.denied.title',
  'employee.calendar.error.unavailable.description',
  'employee.calendar.error.unavailable.title',
  'employee.calendar.eyebrow',
  'employee.calendar.grid.caption',
  'employee.calendar.grid.scrollHint',
  'employee.calendar.grid.scrollLabel',
  'employee.calendar.loading.description',
  'employee.calendar.loading.title',
  'employee.calendar.navigation.label',
  'employee.calendar.navigation.next',
  'employee.calendar.navigation.previous',
  'employee.calendar.selectedMonth',
  'employee.calendar.title',
  'employee.calendar.view.agenda',
  'employee.calendar.view.label',
  'employee.calendar.view.month',
  'employee.monthly.action.approve',
  'employee.monthly.action.cancel',
  'employee.monthly.action.lock',
  'employee.monthly.action.locking',
  'employee.monthly.action.permanentlyLock',
  'employee.monthly.action.preparePrint',
  'employee.monthly.action.print',
  'employee.monthly.action.recording',
  'employee.monthly.action.requestChanges',
  'employee.monthly.action.retry',
  'employee.monthly.action.submit',
  'employee.monthly.action.submitting',
  'employee.monthly.adjustments.absenceEffect',
  'employee.monthly.adjustments.ariaLabel',
  'employee.monthly.adjustments.caption',
  'employee.monthly.adjustments.column.balanceDelta',
  'employee.monthly.adjustments.column.date',
  'employee.monthly.adjustments.column.effect',
  'employee.monthly.adjustments.column.link',
  'employee.monthly.adjustments.column.source',
  'employee.monthly.adjustments.column.version',
  'employee.monthly.adjustments.correctionEffect',
  'employee.monthly.adjustments.description',
  'employee.monthly.adjustments.empty',
  'employee.monthly.adjustments.heading',
  'employee.monthly.adjustments.link.cancellation',
  'employee.monthly.adjustments.link.correction',
  'employee.monthly.adjustments.link.reverses',
  'employee.monthly.adjustments.link.unknownVersion',
  'employee.monthly.adjustments.link.zeroCancellation',
  'employee.monthly.adjustments.link.zeroCorrection',
  'employee.monthly.adjustments.metric.adjustedClosing',
  'employee.monthly.adjustments.metric.cumulativeDelta',
  'employee.monthly.adjustments.metric.originalClosing',
  'employee.monthly.adjustments.metric.viewVersion',
  'employee.monthly.adjustments.scrollHint',
  'employee.monthly.adjustments.scrollLabel',
  'employee.monthly.adjustments.source.absenceCancellation',
  'employee.monthly.adjustments.source.correction',
  'employee.monthly.approved.action.approve',
  'employee.monthly.approved.action.lock',
  'employee.monthly.approved.action.requestChanges',
  'employee.monthly.approved.authority.hr',
  'employee.monthly.approved.authority.manager',
  'employee.monthly.approved.description',
  'employee.monthly.approved.empty',
  'employee.monthly.approved.heading',
  'employee.monthly.approved.historyItem',
  'employee.monthly.approved.historyLabel',
  'employee.monthly.approved.metadata',
  'employee.monthly.approved.summary',
  'employee.monthly.attention.blockers',
  'employee.monthly.attention.description',
  'employee.monthly.attention.heading',
  'employee.monthly.attention.noBlockers.description',
  'employee.monthly.attention.noBlockers.title',
  'employee.monthly.attention.noWarnings',
  'employee.monthly.attention.reviewDaily',
  'employee.monthly.attention.warnings',
  'employee.monthly.attention.wholePeriod',
  'employee.monthly.daily.caption',
  'employee.monthly.daily.column.absenceCredit',
  'employee.monthly.daily.column.adjustment',
  'employee.monthly.daily.column.balance',
  'employee.monthly.daily.column.break',
  'employee.monthly.daily.column.credited',
  'employee.monthly.daily.column.date',
  'employee.monthly.daily.column.expected',
  'employee.monthly.daily.column.status',
  'employee.monthly.daily.column.worked',
  'employee.monthly.daily.description',
  'employee.monthly.daily.heading',
  'employee.monthly.daily.scrollHint',
  'employee.monthly.daily.scrollLabel',
  'employee.monthly.daily.status.complete',
  'employee.monthly.daily.status.incomplete',
  'employee.monthly.daily.status.missing',
  'employee.monthly.daily.status.provisional',
  'employee.monthly.error.boundary.denied',
  'employee.monthly.error.boundary.missing',
  'employee.monthly.error.boundary.unavailable',
  'employee.monthly.error.description.denied',
  'employee.monthly.error.description.recovery',
  'employee.monthly.error.load.denied',
  'employee.monthly.error.load.missing',
  'employee.monthly.error.load.unavailable',
  'employee.monthly.error.print.denied',
  'employee.monthly.error.print.session',
  'employee.monthly.error.print.unavailable',
  'employee.monthly.error.state.denied',
  'employee.monthly.error.state.missing',
  'employee.monthly.error.state.unavailable',
  'employee.monthly.frame.description',
  'employee.monthly.frame.eyebrow',
  'employee.monthly.frame.periodDescription',
  'employee.monthly.frame.printHelp',
  'employee.monthly.frame.printStatusLabel',
  'employee.monthly.frame.title',
  'employee.monthly.loading.description',
  'employee.monthly.loading.title',
  'employee.monthly.print.adjustedHeading',
  'employee.monthly.print.adjustedTotals',
  'employee.monthly.print.adjustmentCaption',
  'employee.monthly.print.approvedMetadata',
  'employee.monthly.print.approvedTotals',
  'employee.monthly.print.dailyCaption',
  'employee.monthly.print.dateRange',
  'employee.monthly.print.footer',
  'employee.monthly.print.opened',
  'employee.monthly.print.readiness.notReady',
  'employee.monthly.print.readiness.ready',
  'employee.monthly.print.readiness.workflow',
  'employee.monthly.print.statusLine',
  'employee.monthly.print.title',
  'employee.monthly.readiness.completeDates',
  'employee.monthly.readiness.explanation.approved',
  'employee.monthly.readiness.explanation.incomplete',
  'employee.monthly.readiness.explanation.inProgress',
  'employee.monthly.readiness.explanation.locked',
  'employee.monthly.readiness.explanation.lockedAdjusted',
  'employee.monthly.readiness.explanation.readOnly',
  'employee.monthly.readiness.explanation.ready',
  'employee.monthly.readiness.explanation.submitted',
  'employee.monthly.readiness.label.notReady',
  'employee.monthly.readiness.label.ready',
  'employee.monthly.readiness.reviewVersion',
  'employee.monthly.reviewer.availability.approved',
  'employee.monthly.reviewer.availability.changesRequested',
  'employee.monthly.reviewer.availability.locked',
  'employee.monthly.reviewer.availability.open',
  'employee.monthly.reviewer.availability.submitted',
  'employee.monthly.reviewer.description',
  'employee.monthly.reviewer.error.denied',
  'employee.monthly.reviewer.error.generic',
  'employee.monthly.reviewer.error.noAction',
  'employee.monthly.reviewer.error.notReady',
  'employee.monthly.reviewer.error.self',
  'employee.monthly.reviewer.error.sourceChanged',
  'employee.monthly.reviewer.error.stateChanged',
  'employee.monthly.reviewer.error.versionChanged',
  'employee.monthly.reviewer.heading',
  'employee.monthly.reviewer.lock.description',
  'employee.monthly.reviewer.lock.title',
  'employee.monthly.reviewer.reason.error',
  'employee.monthly.reviewer.reason.goTo',
  'employee.monthly.reviewer.reason.help',
  'employee.monthly.reviewer.reason.label',
  'employee.monthly.reviewer.success.approved',
  'employee.monthly.reviewer.success.changesRequested',
  'employee.monthly.reviewer.success.locked',
  'employee.monthly.reviewer.success.title',
  'employee.monthly.submission.acknowledgement',
  'employee.monthly.submission.availability.approved',
  'employee.monthly.submission.availability.incomplete',
  'employee.monthly.submission.availability.locked',
  'employee.monthly.submission.availability.ownerOnly',
  'employee.monthly.submission.availability.submitted',
  'employee.monthly.submission.description',
  'employee.monthly.submission.enableHint',
  'employee.monthly.submission.error.alreadySubmitted',
  'employee.monthly.submission.error.denied',
  'employee.monthly.submission.error.generic',
  'employee.monthly.submission.error.notReady',
  'employee.monthly.submission.error.stateChanged',
  'employee.monthly.submission.error.title',
  'employee.monthly.submission.error.versionChanged',
  'employee.monthly.submission.error.warningsChanged',
  'employee.monthly.submission.heading',
  'employee.monthly.submission.noAcknowledgement',
  'employee.monthly.submission.success',
  'employee.monthly.submission.successTitle',
  'employee.monthly.totals.ariaLabel',
  'employee.monthly.totals.description',
  'employee.monthly.totals.heading',
  'employee.monthly.totals.metric.calculatedBalance',
  'employee.monthly.totals.metric.postedClosing',
  'employee.monthly.totals.metric.postedOpening',
  'employee.monthly.totals.metric.postedPeriodDelta',
  'employee.monthly.totals.postedBalances',
  'employee.notifications.actionStatus',
  'employee.notifications.card.dismiss',
  'employee.notifications.card.dismissed',
  'employee.notifications.card.dismissing',
  'employee.notifications.card.emailDelivery',
  'employee.notifications.card.openMonthlyPeriod',
  'employee.notifications.card.openRequests',
  'employee.notifications.card.recorded',
  'employee.notifications.delivery.delivered',
  'employee.notifications.delivery.failed',
  'employee.notifications.delivery.notConfigured',
  'employee.notifications.delivery.pending',
  'employee.notifications.dismiss.error',
  'employee.notifications.dismiss.errorTitle',
  'employee.notifications.dismiss.success',
  'employee.notifications.empty.description',
  'employee.notifications.empty.title',
  'employee.notifications.error.description',
  'employee.notifications.error.title',
  'employee.notifications.history.current',
  'employee.notifications.history.heading',
  'employee.notifications.history.listLabel',
  'employee.notifications.history.refreshing',
  'employee.notifications.history.status',
  'employee.notifications.history.total',
  'employee.notifications.loading.description',
  'employee.notifications.loading.title',
  'employee.notifications.page.description',
  'employee.notifications.page.eyebrow',
  'employee.notifications.pagination',
  'employee.notifications.presentation.acknowledged.body',
  'employee.notifications.presentation.acknowledged.title',
  'employee.notifications.presentation.approved.body',
  'employee.notifications.presentation.approved.title',
  'employee.notifications.presentation.changesRequested.body',
  'employee.notifications.presentation.changesRequested.title',
  'employee.notifications.presentation.rejected.body',
  'employee.notifications.presentation.rejected.title',
  'employee.notifications.status.active',
  'employee.notifications.status.dismissed',
  'employee.records.pageTitle',
  'employee.records.attention.action.reviewPeriod',
  'employee.records.attention.blockers',
  'employee.records.attention.description.absenceApprovalPending',
  'employee.records.attention.description.attendanceIncomplete',
  'employee.records.attention.description.attendanceInvalidEventOrder',
  'employee.records.attention.description.attendanceInvalidEventPrecision',
  'employee.records.attention.description.attendanceOverlap',
  'employee.records.attention.description.correctionUnresolved',
  'employee.records.attention.description.flexNegativeDaily',
  'employee.records.attention.description.flexNegativePosted',
  'employee.records.attention.description.flexPositiveDaily',
  'employee.records.attention.description.flexPositivePosted',
  'employee.records.attention.description.ledgerSourceMismatch',
  'employee.records.attention.description.policyAssignmentOverlap',
  'employee.records.attention.description.policyConfigurationInvalid',
  'employee.records.attention.description.policyNotAssigned',
  'employee.records.attention.description.scheduleAssignmentOverlap',
  'employee.records.attention.description.scheduleNotAssigned',
  'employee.records.attention.description.workDuringAbsence',
  'employee.records.attention.description.workOnHoliday',
  'employee.records.attention.description.workOnZeroExpectedDay',
  'employee.records.backToTime',
  'employee.records.calculation.absenceCredit',
  'employee.records.calculation.balance',
  'employee.records.calculation.breakTime',
  'employee.records.calculation.creditedTime',
  'employee.records.calculation.expectedTime',
  'employee.records.calculation.heading',
  'employee.records.calculation.unavailable.description',
  'employee.records.calculation.unavailable.title',
  'employee.records.calculation.workedTime',
  'employee.records.description',
  'employee.records.error.denied.description',
  'employee.records.error.denied.message',
  'employee.records.error.notFound.description',
  'employee.records.error.notFound.message',
  'employee.records.error.notFound.title',
  'employee.records.error.unavailable.description',
  'employee.records.error.unavailable.message',
  'employee.records.error.unavailable.title',
  'employee.records.event.breakEnd',
  'employee.records.event.breakStart',
  'employee.records.event.clockIn',
  'employee.records.event.clockOut',
  'employee.records.events.empty.description',
  'employee.records.events.empty.title',
  'employee.records.events.heading',
  'employee.records.events.note',
  'employee.records.events.recordedOrder',
  'employee.records.eyebrow',
  'employee.records.incomplete.description',
  'employee.records.incomplete.title',
  'employee.records.loading.description',
  'employee.records.loading.title',
  'employee.records.requestCorrection',
  'employee.records.sessions.breakIntervals',
  'employee.records.sessions.continuesNext',
  'employee.records.sessions.continuesPrevious',
  'employee.records.sessions.empty.description',
  'employee.records.sessions.empty.title',
  'employee.records.sessions.heading',
  'employee.records.sessions.none',
  'employee.records.sessions.note',
  'employee.records.sessions.range',
  'employee.records.sessions.session',
  'employee.records.sessions.workIntervals',
  'employee.records.state.complete',
  'employee.records.state.completeDescription',
  'employee.records.state.current',
  'employee.records.state.needsReview',
  'employee.records.state.provisionalDescription',
  'employee.records.timeZoneDescription',
  'employee.requests.history.dateRange',
  'employee.requests.history.description',
  'employee.requests.history.empty.action',
  'employee.requests.history.empty.description',
  'employee.requests.history.empty.title',
  'employee.requests.history.error.description',
  'employee.requests.history.error.title',
  'employee.requests.history.eyebrow',
  'employee.requests.history.filter.action.apply',
  'employee.requests.history.filter.action.clear',
  'employee.requests.history.filter.description',
  'employee.requests.history.filter.status.all',
  'employee.requests.history.filter.status.completed',
  'employee.requests.history.filter.status.inProgress',
  'employee.requests.history.filter.status.label',
  'employee.requests.history.filter.title',
  'employee.requests.history.filter.workflow.absence',
  'employee.requests.history.filter.workflow.all',
  'employee.requests.history.filter.workflow.cancellation',
  'employee.requests.history.filter.workflow.correction',
  'employee.requests.history.filter.workflow.label',
  'employee.requests.history.kind.absence',
  'employee.requests.history.kind.cancellation',
  'employee.requests.history.kind.correction',
  'employee.requests.history.loading.description',
  'employee.requests.history.loading.title',
  'employee.requests.history.new',
  'employee.requests.history.results.count',
  'employee.requests.history.results.heading',
  'employee.requests.history.results.pagination',
  'employee.requests.history.results.refreshing',
  'employee.requests.history.submitted',
  'employee.requests.history.viewDetails',
  'employee.requests.detail.absence.cancellationLink',
  'employee.requests.detail.absence.cancellations',
  'employee.requests.detail.absence.description',
  'employee.requests.detail.absence.heading',
  'employee.requests.detail.absence.type',
  'employee.requests.detail.absence.workflowLabel',
  'employee.requests.detail.absence.workflow.approval',
  'employee.requests.detail.absence.workflow.report',
  'employee.requests.detail.action.available',
  'employee.requests.detail.action.effect.cancel',
  'employee.requests.detail.action.effect.withdraw',
  'employee.requests.detail.action.error.changed',
  'employee.requests.detail.action.error.generic',
  'employee.requests.detail.action.error.locked',
  'employee.requests.detail.action.errorTitle',
  'employee.requests.detail.action.label.cancel',
  'employee.requests.detail.action.label.withdraw',
  'employee.requests.detail.action.pending',
  'employee.requests.detail.action.success.cancel',
  'employee.requests.detail.action.success.withdraw',
  'employee.requests.detail.action.successTitle',
  'employee.requests.detail.back',
  'employee.requests.detail.cancellation.absenceType',
  'employee.requests.detail.cancellation.description',
  'employee.requests.detail.cancellation.heading',
  'employee.requests.detail.cancellation.viewOriginal',
  'employee.requests.detail.correction.applicationLabel',
  'employee.requests.detail.correction.application.ordinary',
  'employee.requests.detail.correction.application.postLock',
  'employee.requests.detail.correction.description',
  'employee.requests.detail.correction.ends',
  'employee.requests.detail.correction.events.empty',
  'employee.requests.detail.correction.events.event',
  'employee.requests.detail.correction.events.heading',
  'employee.requests.detail.correction.heading',
  'employee.requests.detail.correction.original',
  'employee.requests.detail.correction.proposed',
  'employee.requests.detail.correction.reason',
  'employee.requests.detail.correction.starts',
  'employee.requests.detail.currentState',
  'employee.requests.detail.error.denied.description',
  'employee.requests.detail.error.denied.title',
  'employee.requests.detail.error.missing.description',
  'employee.requests.detail.error.missing.title',
  'employee.requests.detail.error.unavailable.description',
  'employee.requests.detail.error.unavailable.title',
  'employee.requests.detail.event',
  'employee.requests.detail.history.action.acknowledge',
  'employee.requests.detail.history.action.apply',
  'employee.requests.detail.history.action.approve',
  'employee.requests.detail.history.action.cancel',
  'employee.requests.detail.history.action.reject',
  'employee.requests.detail.history.action.reported',
  'employee.requests.detail.history.action.requestChanges',
  'employee.requests.detail.history.action.submitted',
  'employee.requests.detail.history.action.withdraw',
  'employee.requests.detail.history.actor.reviewer',
  'employee.requests.detail.history.actor.self',
  'employee.requests.detail.history.actor.system',
  'employee.requests.detail.history.by',
  'employee.requests.detail.history.description',
  'employee.requests.detail.history.heading',
  'employee.requests.detail.history.reason',
  'employee.requests.detail.loading.description',
  'employee.requests.detail.loading.message',
  'employee.requests.detail.loading.title',
  'employee.requests.detail.metric.balance',
  'employee.requests.detail.metric.break',
  'employee.requests.detail.metric.credited',
  'employee.requests.detail.metric.expected',
  'employee.requests.detail.metric.worked',
  'employee.requests.detail.missingIdentifier.description',
  'employee.requests.detail.state.absence.approved',
  'employee.requests.detail.state.absence.cancelled',
  'employee.requests.detail.state.absence.changesRequested',
  'employee.requests.detail.state.absence.complete',
  'employee.requests.detail.state.absence.pending',
  'employee.requests.detail.state.absence.reported',
  'employee.requests.detail.state.cancellation.approved',
  'employee.requests.detail.state.cancellation.changesRequested',
  'employee.requests.detail.state.cancellation.pending',
  'employee.requests.detail.state.cancellation.rejected',
  'employee.requests.detail.state.cancellation.withdrawn',
  'employee.requests.detail.state.correction.applied',
  'employee.requests.detail.state.correction.approved',
  'employee.requests.detail.state.correction.changesRequested',
  'employee.requests.detail.state.correction.complete',
  'employee.requests.detail.state.correction.pending',
  'employee.requests.detail.submitted',
  'employee.requests.detail.timeRange',
  'employee.requests.detail.pageTitle',
  'employee.requests.detail.title.cancellation',
  'employee.requests.detail.title.correction',
  'employee.requests.detail.unknownTime',
  'employee.requests.new.description',
  'employee.requests.new.eyebrow',
  'employee.requests.new.selection.change',
  'employee.requests.new.selection.description',
  'employee.requests.new.selection.heading',
  'employee.requests.new.selection.selected',
  'employee.requests.new.workflow.correction.action',
  'employee.requests.new.workflow.correction.description',
  'employee.requests.new.workflow.correction.title',
  'employee.requests.new.workflow.sickness.action',
  'employee.requests.new.workflow.sickness.description',
  'employee.requests.new.workflow.sickness.title',
  'employee.requests.new.workflow.vacation.action',
  'employee.requests.new.workflow.vacation.description',
  'employee.requests.new.workflow.vacation.title',
  'employee.requests.new.workflowTitle.correction',
  'employee.requests.new.workflowTitle.sickness',
  'employee.requests.new.workflowTitle.vacation',
  'employee.time.balance.eligibleProjection',
  'employee.time.balance.excluded.description',
  'employee.time.balance.excluded.title',
  'employee.time.balance.heading',
  'employee.time.balance.help',
  'employee.time.balance.posted',
  'employee.time.balance.projected',
  'employee.time.balancesDescription',
  'employee.time.balancesTitle',
  'employee.time.description',
  'employee.time.entryType.allocation',
  'employee.time.entryType.approvedDeduction',
  'employee.time.entryType.cancellationRestoration',
  'employee.time.entryType.carryover',
  'employee.time.entryType.dailyDelta',
  'employee.time.entryType.dailyRecalculationDelta',
  'employee.time.entryType.expiry',
  'employee.time.entryType.manualAdjustment',
  'employee.time.entryType.manualAdministrativeAdjustment',
  'employee.time.entryType.openingBalance',
  'employee.time.entryType.pendingReservation',
  'employee.time.entryType.postLockAdjustment',
  'employee.time.entryType.reservationRelease',
  'employee.time.error.denied.description',
  'employee.time.error.denied.title',
  'employee.time.error.unavailable.description',
  'employee.time.error.unavailable.title',
  'employee.time.eyebrow',
  'employee.time.filter.date',
  'employee.time.filter.description',
  'employee.time.filter.month',
  'employee.time.filter.title',
  'employee.time.filter.view',
  'employee.time.filter.viewLabel',
  'employee.time.filter.week',
  'employee.time.leave.account',
  'employee.time.leave.available',
  'employee.time.leave.description',
  'employee.time.leave.empty.description',
  'employee.time.leave.empty.title',
  'employee.time.leave.entry',
  'employee.time.leave.heading',
  'employee.time.leave.ledger.description',
  'employee.time.leave.ledger.empty.description',
  'employee.time.leave.ledger.empty.title',
  'employee.time.leave.ledger.heading',
  'employee.time.leave.ledger.pagination',
  'employee.time.leave.pendingReservation',
  'employee.time.leave.projectedAfter',
  'employee.time.leave.projectedRemaining',
  'employee.time.leave.availableAfter',
  'employee.time.leave.reservedAfter',
  'employee.time.ledger.balanceAfter',
  'employee.time.ledger.description',
  'employee.time.ledger.effective',
  'employee.time.ledger.empty.description',
  'employee.time.ledger.empty.title',
  'employee.time.ledger.heading',
  'employee.time.ledger.pagination',
  'employee.time.loading.description',
  'employee.time.loading.title',
  'employee.time.period.month',
  'employee.time.period.range',
  'employee.time.period.reviewMonthly',
  'employee.time.period.summary.balance',
  'employee.time.period.summary.incomplete',
  'employee.time.period.summary.recordedDays',
  'employee.time.period.week',
  'employee.time.records.attention.incomplete',
  'employee.time.records.attention.none',
  'employee.time.records.attention.review',
  'employee.time.records.attention.warnings',
  'employee.time.records.caption',
  'employee.time.records.column.attention',
  'employee.time.records.column.balance',
  'employee.time.records.column.credited',
  'employee.time.records.column.date',
  'employee.time.records.column.expected',
  'employee.time.records.column.status',
  'employee.time.records.description',
  'employee.time.records.heading',
  'employee.time.records.scrollLabel',
  'employee.time.records.status.complete',
  'employee.time.records.status.incomplete',
  'employee.time.records.status.noRecord',
  'employee.time.records.status.provisional',
  'employee.time.title',
  'employee.today.attendance.action.clockIn',
  'employee.today.attendance.action.clockOut',
  'employee.today.attendance.action.resume',
  'employee.today.attendance.action.startBreak',
  'employee.today.attendance.actionsLabel',
  'employee.today.attendance.confirm.cancel',
  'employee.today.attendance.confirm.description',
  'employee.today.attendance.confirm.submit',
  'employee.today.attendance.confirm.title',
  'employee.today.attendance.currentBreak',
  'employee.today.attendance.currentStatus',
  'employee.today.attendance.currentWorkInterval',
  'employee.today.attendance.error.breakConfirmation',
  'employee.today.attendance.error.conflict',
  'employee.today.attendance.error.invalidState',
  'employee.today.attendance.error.rateLimited',
  'employee.today.attendance.error.stateChanged',
  'employee.today.attendance.error.uncertain',
  'employee.today.attendance.feedback.errorTitle',
  'employee.today.attendance.feedback.infoTitle',
  'employee.today.attendance.feedback.successTitle',
  'employee.today.attendance.noActiveInterval',
  'employee.today.attendance.outcome.clockIn',
  'employee.today.attendance.outcome.clockOut',
  'employee.today.attendance.outcome.resume',
  'employee.today.attendance.outcome.startBreak',
  'employee.today.attendance.pending.clockIn',
  'employee.today.attendance.pending.clockOut',
  'employee.today.attendance.pending.resume',
  'employee.today.attendance.pending.startBreak',
  'employee.today.attendance.recovery.dependency.description',
  'employee.today.attendance.recovery.dependency.title',
  'employee.today.attendance.recovery.offline.description',
  'employee.today.attendance.recovery.offline.title',
  'employee.today.attendance.recovery.reconnecting.description',
  'employee.today.attendance.recovery.reconnecting.title',
  'employee.today.attendance.remoteChanged',
  'employee.today.attendance.since',
  'employee.today.attendance.state.offWork',
  'employee.today.attendance.state.onBreak',
  'employee.today.attendance.state.working',
  'employee.today.attendance.success.clockIn',
  'employee.today.attendance.success.clockOut',
  'employee.today.attendance.success.resume',
  'employee.today.attendance.success.startBreak',
  'employee.today.attention.affectedDate',
  'employee.today.attention.blockingIssues',
  'employee.today.attention.blocksSubmission',
  'employee.today.attention.descriptor.absenceApprovalPending.next',
  'employee.today.attention.descriptor.absenceApprovalPending.reason',
  'employee.today.attention.descriptor.absenceApprovalPending.title',
  'employee.today.attention.descriptor.attendanceIncomplete.title',
  'employee.today.attention.descriptor.attendanceInvalidEventOrder.title',
  'employee.today.attention.descriptor.attendanceInvalidEventPrecision.title',
  'employee.today.attention.descriptor.attendanceOverlap.title',
  'employee.today.attention.descriptor.calculation.reason',
  'employee.today.attention.descriptor.calculation.next',
  'employee.today.attention.descriptor.correctionUnresolved.next',
  'employee.today.attention.descriptor.correctionUnresolved.reason',
  'employee.today.attention.descriptor.correctionUnresolved.title',
  'employee.today.attention.descriptor.flexNegative.next',
  'employee.today.attention.descriptor.flexNegative.reason',
  'employee.today.attention.descriptor.flexNegative.title',
  'employee.today.attention.descriptor.flexPositive.next',
  'employee.today.attention.descriptor.flexPositive.reason',
  'employee.today.attention.descriptor.flexPositive.title',
  'employee.today.attention.descriptor.ledgerSourceMismatch.title',
  'employee.today.attention.descriptor.policyAssignmentOverlap.title',
  'employee.today.attention.descriptor.policyConfigurationInvalid.title',
  'employee.today.attention.descriptor.policyNotAssigned.title',
  'employee.today.attention.descriptor.recovery.next',
  'employee.today.attention.descriptor.recovery.reason',
  'employee.today.attention.descriptor.scheduleAssignmentOverlap.title',
  'employee.today.attention.descriptor.scheduleNotAssigned.title',
  'employee.today.attention.descriptor.administrator.next',
  'employee.today.attention.descriptor.administrator.reason',
  'employee.today.attention.descriptor.workDuringAbsence.title',
  'employee.today.attention.descriptor.workOnHoliday.title',
  'employee.today.attention.descriptor.workOnZeroExpectedDay.title',
  'employee.today.attention.doesNotBlockSubmission',
  'employee.today.attention.newUrgent',
  'employee.today.attention.next',
  'employee.today.attention.postedBalanceThrough',
  'employee.today.attention.recovery.fixEntry',
  'employee.today.attention.recovery.reviewBalanceHistory',
  'employee.today.attention.recovery.reviewCalculation',
  'employee.today.attention.recovery.reviewRecord',
  'employee.today.attention.recovery.reviewRequest',
  'employee.today.attention.recovery.reviewTimeline',
  'employee.today.attention.title',
  'employee.today.attention.warnings',
  'employee.today.calculation.caption',
  'employee.today.calculation.detailsDescription',
  'employee.today.calculation.detailsTitle',
  'employee.today.calculation.footnote',
  'employee.today.calculation.group.credited',
  'employee.today.calculation.group.expected',
  'employee.today.calculation.group.result',
  'employee.today.calculation.heading',
  'employee.today.calculation.row.absenceCredit',
  'employee.today.calculation.row.absenceReduction',
  'employee.today.calculation.row.approvedCorrections',
  'employee.today.calculation.row.breaksExcluded',
  'employee.today.calculation.row.creditedToday',
  'employee.today.calculation.row.expectedToday',
  'employee.today.calculation.row.holidayReduction',
  'employee.today.calculation.row.otherAdjustments',
  'employee.today.calculation.row.provisionalDifference',
  'employee.today.calculation.row.recordedWork',
  'employee.today.calculation.row.scheduledTime',
  'employee.today.calculation.source',
  'employee.today.calculation.statusIncomplete',
  'employee.today.calculation.statusProvisional',
  'employee.today.calculation.time',
  'employee.today.calculation.zeroExpected.generic',
  'employee.today.calculation.zeroExpected.heading',
  'employee.today.calculation.zeroExpected.holiday',
  'employee.today.calculation.zeroExpected.workCredit',
  'employee.today.overview.ariaLabel',
  'employee.today.overview.estimatedFinish',
  'employee.today.overview.estimatedFinishAssumption',
  'employee.today.overview.finish.calculationIncomplete',
  'employee.today.overview.finish.calculationUnavailable',
  'employee.today.overview.finish.expectationMet',
  'employee.today.overview.finish.notAvailable',
  'employee.today.overview.finish.resumeToEstimate',
  'employee.today.overview.finish.startToEstimate',
  'employee.today.overview.flexibleTime',
  'employee.today.overview.holiday',
  'employee.today.overview.noPostedEntries',
  'employee.today.overview.postedBalance',
  'employee.today.overview.postedThrough',
  'employee.today.overview.progressAriaLabel',
  'employee.today.overview.progressCredited',
  'employee.today.overview.progressDescription',
  'employee.today.overview.progressUnavailable',
  'employee.today.overview.progressUnavailableDescription',
  'employee.today.overview.progressWithoutExpectation',
  'employee.today.overview.provisionalDifference',
  'employee.today.overview.remainingToday',
  'employee.today.overview.statusIncomplete',
  'employee.today.overview.statusProvisional',
  'employee.today.overview.todayExcludedFromPosted',
  'employee.today.overview.title',
  'employee.today.overview.workedToday',
  'employee.today.overview.breaks',
  'employee.today.page.description',
  'employee.today.page.estimateUpdated',
  'employee.today.page.eyebrow',
  'employee.today.page.loadError.description',
  'employee.today.page.loadError.message',
  'employee.today.page.loadError.title',
  'employee.today.page.loading.description',
  'employee.today.page.loading.message',
  'employee.today.page.loading.title',
  'employee.today.page.offline.description',
  'employee.today.page.offline.message',
  'employee.today.page.permission.description',
  'employee.today.page.requestReference',
  'employee.today.page.title',
  'employee.today.page.updating',
  'employee.today.timeline.approvedInterpretation',
  'employee.today.timeline.correction',
  'employee.today.timeline.description.empty',
  'employee.today.timeline.description.events',
  'employee.today.timeline.empty',
  'employee.today.timeline.event.breakEnd.description',
  'employee.today.timeline.event.breakEnd.label',
  'employee.today.timeline.event.breakStart.description',
  'employee.today.timeline.event.breakStart.label',
  'employee.today.timeline.event.clockIn.description',
  'employee.today.timeline.event.clockIn.label',
  'employee.today.timeline.event.clockOut.description',
  'employee.today.timeline.event.clockOut.label',
  'employee.today.timeline.incomplete.description',
  'employee.today.timeline.incomplete.title',
  'employee.today.timeline.originalEvents',
  'employee.today.timeline.title',
  'shared.duration.hours',
  'shared.duration.minutes',
  'shared.duration.compact',
  'shared.action.close',
  'shared.action.goHome',
  'shared.action.reload',
  'shared.action.returnHome',
  'shared.action.tryAgain',
  'shared.application.startup.description',
  'shared.application.startup.title',
  'shared.i18n.greeting',
  'shared.i18n.initializing',
  'shared.i18n.loadError',
  'shared.locale.accountDescription',
  'shared.locale.accountSaveFailed',
  'shared.locale.accountSaved',
  'shared.locale.deviceDescription',
  'shared.locale.deviceSaveFailed',
  'shared.locale.deviceSaved',
  'shared.locale.invitationDescription',
  'shared.locale.label',
  'shared.locale.accountSaveFailedTitle',
  'shared.locale.accountSavedTitle',
  'shared.navigation.account',
  'shared.navigation.brandHome',
  'shared.navigation.current',
  'shared.navigation.destination.desktop',
  'shared.navigation.destination.mobile',
  'shared.navigation.drawerTitle',
  'shared.navigation.menu',
  'shared.navigation.mobileAccount',
  'shared.navigation.mobileWorkAreas',
  'shared.navigation.skipToContent',
  'shared.navigation.workAreas',
  'shared.navigation.workArea.employee',
  'shared.navigation.workArea.hr',
  'shared.navigation.workArea.manager',
  'shared.navigation.workArea.system',
  'shared.pagination.label',
  'shared.pagination.next',
  'shared.pagination.previous',
  'shared.pagination.summary',
  'shared.route.boundary.notFound.description',
  'shared.route.boundary.notFound.title',
  'shared.route.boundary.permissionDenied.description',
  'shared.route.boundary.permissionDenied.title',
  'shared.route.boundary.unavailable.description',
  'shared.route.boundary.unavailable.title',
  'shared.route.boundary.rootUnavailable.description',
  'shared.route.boundary.rootUnavailable.title',
  'shared.route.title.approvalInbox',
  'shared.route.title.audit',
  'shared.route.title.calendar',
  'shared.route.title.employees',
  'shared.route.title.myBalances',
  'shared.route.title.myTime',
  'shared.route.title.notifications',
  'shared.route.title.profile',
  'shared.route.title.reports',
  'shared.route.title.requests',
  'shared.route.title.settingsAbsence',
  'shared.route.title.settingsHolidays',
  'shared.route.title.settingsTime',
  'shared.route.title.systemAccounts',
  'shared.route.title.systemAudit',
  'shared.route.title.systemOperations',
  'shared.route.title.teamCalendar',
  'shared.route.title.teamStatus',
  'shared.route.title.teams',
  'shared.route.title.today',
  'shared.workflow.status.acknowledged',
  'shared.workflow.status.applied',
  'shared.workflow.status.approved',
  'shared.workflow.status.cancelled',
  'shared.workflow.status.changesRequested',
  'shared.workflow.status.locked',
  'shared.workflow.status.open',
  'shared.workflow.status.partiallyCancelled',
  'shared.workflow.status.pendingDecision',
  'shared.workflow.status.rejected',
  'shared.workflow.status.reported',
  'shared.workflow.status.submitted',
  'shared.workflow.status.withdrawn',
  'shared.signOut.action',
  'shared.signOut.actionPending',
  'shared.signOut.failureDescription',
  'shared.signOut.failureTitle',
  'shared.profile.account.details',
  'shared.profile.account.readOnlyHelp',
  'shared.profile.description',
  'shared.profile.employee.details',
  'shared.profile.employee.notLinked',
  'shared.profile.employee.technicalAccount',
  'shared.profile.field.applicationRoles',
  'shared.profile.field.email',
  'shared.profile.field.employeeNumber',
  'shared.profile.field.employmentStatus',
  'shared.profile.field.organization',
  'shared.profile.loading.description',
  'shared.profile.loading.title',
  'shared.profile.noneAssigned',
  'shared.profile.preference.eyebrow',
  'shared.profile.preference.title',
  'shared.profile.role.employee',
  'shared.profile.role.hrAdministrator',
  'shared.profile.role.manager',
  'shared.profile.role.systemAdministrator',
  'shared.profile.session.current',
  'shared.profile.session.device',
  'shared.profile.session.deviceLabels.browser',
  'shared.profile.session.deviceLabels.chrome',
  'shared.profile.session.deviceLabels.edge',
  'shared.profile.session.deviceLabels.firefox',
  'shared.profile.session.deviceLabels.safari',
  'shared.profile.session.deviceLabels.unrecognized',
  'shared.profile.session.expires',
  'shared.profile.session.lastActive',
  'shared.profile.session.platform.android',
  'shared.profile.session.platform.ios',
  'shared.profile.session.platform.linux',
  'shared.profile.session.platform.macos',
  'shared.profile.session.platform.windows',
  'shared.profile.session.revoke',
  'shared.profile.session.revoked',
  'shared.profile.session.signOutCurrent',
  'shared.profile.session.signingOut',
  'shared.profile.sessions.description',
  'shared.profile.sessions.empty.description',
  'shared.profile.sessions.empty.title',
  'shared.profile.sessions.title',
  'shared.profile.status.active',
  'shared.profile.status.inactive',
  'shared.profile.status.sessionNotRevoked.description',
  'shared.profile.status.sessionNotRevoked.freshSession',
  'shared.profile.status.sessionNotRevoked.sessionExpired',
  'shared.profile.status.sessionNotRevoked.title',
  'shared.profile.status.sessionRevoked.title',
  'shared.profile.title',
  'shared.profile.unavailable.description',
  'shared.profile.unavailable.title',
  'shared.validation.problemTitle',
  'shared.validation.correctValue',
  'shared.validation.invalidFormat',
  'shared.validation.invalidType',
  'shared.validation.invalidValue',
  'shared.validation.required',
  'shared.validation.unknownField',
  'shared.validation.valueTooLarge',
  'shared.validation.valueTooSmall',
] as const satisfies readonly (keyof MessageParameterMap)[];

export type MessageKey = (typeof MESSAGE_KEYS)[number];
export type MessageParameters<Key extends MessageKey> = MessageParameterMap[Key];
export type MessageArguments<Key extends MessageKey> =
  undefined extends MessageParameters<Key>
    ? readonly [parameters?: undefined]
    : readonly [parameters: MessageParameters<Key>];

export type CatalogTree = Readonly<{
  [key: string]: string | CatalogTree;
}>;

export type CatalogResource = Readonly<Record<CatalogNamespace, CatalogTree>>;

export type LoadedCatalog = Readonly<{
  locale: SupportedLocale;
  resources: CatalogResource;
}>;

export function toRuntimeMessageKey(key: MessageKey): string {
  const separatorIndex = key.indexOf('.');
  return `${key.slice(0, separatorIndex)}:${key.slice(separatorIndex + 1)}`;
}
