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
  'employee.insights.destination.monthlyReview': undefined;
  'employee.insights.destination.myBalances': undefined;
  'employee.insights.destination.myRequests': undefined;
  'employee.insights.destination.myTime': undefined;
  'employee.insights.destination.reports': undefined;
  'employee.insights.destination.today': undefined;
  'employee.insights.context.description': undefined;
  'employee.insights.context.heading': undefined;
  'employee.insights.context.noPeriod': undefined;
  'employee.insights.context.period': undefined;
  'employee.insights.context.remove': undefined;
  'employee.insights.context.removed': undefined;
  'employee.insights.context.source': undefined;
  'employee.insights.entry.action': undefined;
  'employee.insights.entry.description': undefined;
  'employee.insights.entry.heading': undefined;
  'employee.insights.interpretation.description': undefined;
  'employee.insights.interpretation.error.offline': undefined;
  'employee.insights.interpretation.error.rateLimited': undefined;
  'employee.insights.interpretation.error.unavailable': undefined;
  'employee.insights.interpretation.form.cancel': undefined;
  'employee.insights.interpretation.form.clear': undefined;
  'employee.insights.interpretation.form.count': Readonly<{ count: number; maximum: number }>;
  'employee.insights.interpretation.form.description': undefined;
  'employee.insights.interpretation.form.heading': undefined;
  'employee.insights.interpretation.form.question': undefined;
  'employee.insights.interpretation.form.running': undefined;
  'employee.insights.interpretation.form.submit': undefined;
  'employee.insights.interpretation.heading': undefined;
  'employee.insights.interpretation.limitations': undefined;
  'employee.insights.interpretation.optionalLabel': undefined;
  'employee.insights.interpretation.question': undefined;
  'employee.insights.interpretation.sources': undefined;
  'employee.insights.interpretation.status.cancelled': undefined;
  'employee.insights.interpretation.status.ready': undefined;
  'employee.insights.interpretation.status.running': undefined;
  'employee.insights.interpretation.status.viewResult': undefined;
  'employee.insights.interpretation.validation.correct': undefined;
  'employee.insights.interpretation.validation.required': undefined;
  'employee.insights.interpretation.validation.scopeChanged': undefined;
  'employee.insights.interpretation.validation.tooLong': undefined;
  'employee.insights.error.denied': undefined;
  'employee.insights.error.offline': undefined;
  'employee.insights.error.returnToday': undefined;
  'employee.insights.error.unavailable': undefined;
  'employee.insights.fact.balanceChange': undefined;
  'employee.insights.fact.balanceClosing': undefined;
  'employee.insights.fact.balanceIncompleteDates': undefined;
  'employee.insights.fact.balanceOpening': undefined;
  'employee.insights.fact.leaveAccountCount': undefined;
  'employee.insights.fact.leaveAvailable': undefined;
  'employee.insights.fact.leaveProjectedRemaining': undefined;
  'employee.insights.fact.leaveProjectionAvailable': undefined;
  'employee.insights.fact.leaveReserved': undefined;
  'employee.insights.fact.monthEnded': undefined;
  'employee.insights.fact.monthlyCompleteDates': undefined;
  'employee.insights.fact.monthlyCoveredDates': undefined;
  'employee.insights.fact.monthlyReadiness': undefined;
  'employee.insights.fact.monthlyWorkflow': undefined;
  'employee.insights.fact.postedBalance': undefined;
  'employee.insights.fact.submissionBlocker': undefined;
  'employee.insights.fact.submissionBlockerCount': undefined;
  'employee.insights.fact.submissionBlockersAvailable': undefined;
  'employee.insights.fact.todayAbsenceCredit': undefined;
  'employee.insights.fact.todayAbsenceExpectedReduction': undefined;
  'employee.insights.fact.todayActiveElapsed': undefined;
  'employee.insights.fact.todayApprovedCorrection': undefined;
  'employee.insights.fact.todayAttendanceState': undefined;
  'employee.insights.fact.todayAttention': undefined;
  'employee.insights.fact.todayBreak': undefined;
  'employee.insights.fact.todayCalculationStatus': undefined;
  'employee.insights.fact.todayCredited': undefined;
  'employee.insights.fact.todayDifference': undefined;
  'employee.insights.fact.todayEstimatedFinish': undefined;
  'employee.insights.fact.todayExpected': undefined;
  'employee.insights.fact.todayExplanationAvailable': undefined;
  'employee.insights.fact.todayHolidayExpectedReduction': undefined;
  'employee.insights.fact.todayOtherApprovedAdjustment': undefined;
  'employee.insights.fact.todayRemainingExpected': undefined;
  'employee.insights.fact.todayScheduled': undefined;
  'employee.insights.fact.todayWorked': undefined;
  'employee.insights.fact.unrecognized': undefined;
  'employee.insights.form.date': undefined;
  'employee.insights.form.description': undefined;
  'employee.insights.form.from': undefined;
  'employee.insights.form.heading': undefined;
  'employee.insights.form.kind': undefined;
  'employee.insights.form.kindPlaceholder': undefined;
  'employee.insights.form.month': undefined;
  'employee.insights.form.run': undefined;
  'employee.insights.form.running': undefined;
  'employee.insights.form.to': undefined;
  'employee.insights.kind.balanceChange.description': undefined;
  'employee.insights.kind.balanceChange.title': undefined;
  'employee.insights.kind.leaveProjection.description': undefined;
  'employee.insights.kind.leaveProjection.title': undefined;
  'employee.insights.kind.submissionBlockers.description': undefined;
  'employee.insights.kind.submissionBlockers.title': undefined;
  'employee.insights.kind.todayExplanation.description': undefined;
  'employee.insights.kind.todayExplanation.title': undefined;
  'employee.insights.limitation.incompleteDatesExcluded': undefined;
  'employee.insights.limitation.leaveAccountDetailsLimited': undefined;
  'employee.insights.limitation.leaveEntitlementNotAvailable': undefined;
  'employee.insights.limitation.monthNotEnded': undefined;
  'employee.insights.limitation.monthlyPeriodNotAvailable': undefined;
  'employee.insights.limitation.requestedDateNotToday': undefined;
  'employee.insights.limitation.submissionBlockerDetailsLimited': undefined;
  'employee.insights.limitation.submissionNotAvailable': undefined;
  'employee.insights.limitation.todayCalculationIncomplete': undefined;
  'employee.insights.limitation.todayTimelineTruncated': undefined;
  'employee.insights.limitation.todayValuesProvisional': undefined;
  'employee.insights.limitation.unrecognized': undefined;
  'employee.insights.page.description': undefined;
  'employee.insights.page.eyebrow': undefined;
  'employee.insights.period.range': Readonly<{ end: string; start: string }>;
  'employee.insights.provider.awaitingNative': undefined;
  'employee.insights.provider.disabled': undefined;
  'employee.insights.provider.heading': undefined;
  'employee.insights.provider.unavailable': undefined;
  'employee.insights.qualifier.current': undefined;
  'employee.insights.qualifier.incomplete': undefined;
  'employee.insights.qualifier.posted': undefined;
  'employee.insights.qualifier.projected': undefined;
  'employee.insights.qualifier.provisional': undefined;
  'employee.insights.qualifier.reserved': undefined;
  'employee.insights.qualifier.suppressed': undefined;
  'employee.insights.qualifier.unavailable': undefined;
  'employee.insights.result.actions.heading': undefined;
  'employee.insights.result.authoritative': undefined;
  'employee.insights.result.capturedAt': undefined;
  'employee.insights.result.facts.description': undefined;
  'employee.insights.result.facts.heading': undefined;
  'employee.insights.result.freshness.calculatedThrough': Readonly<{ date: string }>;
  'employee.insights.result.freshness.description': undefined;
  'employee.insights.result.freshness.heading': undefined;
  'employee.insights.result.freshness.postedThrough': Readonly<{ date: string }>;
  'employee.insights.result.limitations.heading': undefined;
  'employee.insights.result.limitations.title': undefined;
  'employee.insights.result.nativeLabel': undefined;
  'employee.insights.result.period': undefined;
  'employee.insights.result.scope': undefined;
  'employee.insights.result.scopeSelf': undefined;
  'employee.insights.result.sourceEvidence': Readonly<{ sources: string }>;
  'employee.insights.result.sources.description': undefined;
  'employee.insights.result.sources.heading': undefined;
  'employee.insights.source.dailyTimeRecord': undefined;
  'employee.insights.source.leaveEntitlementLedger': undefined;
  'employee.insights.source.monthlyPeriod': undefined;
  'employee.insights.source.open': Readonly<{ source: string }>;
  'employee.insights.source.personalRequest': undefined;
  'employee.insights.source.report': undefined;
  'employee.insights.source.timeAccountLedger': undefined;
  'employee.insights.source.todayAttendance': undefined;
  'employee.insights.state.complete': undefined;
  'employee.insights.state.incomplete': undefined;
  'employee.insights.state.provisional': undefined;
  'employee.insights.status.ready': undefined;
  'employee.insights.status.running': undefined;
  'employee.insights.status.viewResult': undefined;
  'employee.insights.trust.description': undefined;
  'employee.insights.trust.heading': undefined;
  'employee.insights.trust.privacy': undefined;
  'employee.insights.validation.correct': undefined;
  'employee.insights.validation.date': undefined;
  'employee.insights.validation.from': undefined;
  'employee.insights.validation.kind': undefined;
  'employee.insights.validation.month': undefined;
  'employee.insights.validation.range': undefined;
  'employee.insights.validation.to': undefined;
  'employee.insights.value.no': undefined;
  'employee.insights.value.unavailable': undefined;
  'employee.insights.value.unrecognizedState': undefined;
  'employee.insights.value.yes': undefined;
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
  'employee.monthly.print.opened': undefined;
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
  'admin.absenceSettings.coverage.fullDay': undefined;
  'admin.absenceSettings.coverage.halfDay': undefined;
  'admin.absenceSettings.coverage.heading': undefined;
  'admin.absenceSettings.coverage.minutes': undefined;
  'admin.absenceSettings.empty.description': undefined;
  'admin.absenceSettings.empty.title': undefined;
  'admin.absenceSettings.entitlement.description': undefined;
  'admin.absenceSettings.entitlement.label': undefined;
  'admin.absenceSettings.entitlement.reservePending': undefined;
  'admin.absenceSettings.entitlement.reservePendingSickness': undefined;
  'admin.absenceSettings.entitlement.sicknessReason': undefined;
  'admin.absenceSettings.error.configuration': undefined;
  'admin.absenceSettings.error.conflict': undefined;
  'admin.absenceSettings.error.effectiveDate': undefined;
  'admin.absenceSettings.error.generic': undefined;
  'admin.absenceSettings.feedback.created': undefined;
  'admin.absenceSettings.feedback.errorTitle': undefined;
  'admin.absenceSettings.feedback.successTitle': undefined;
  'admin.absenceSettings.form.active': undefined;
  'admin.absenceSettings.form.description': undefined;
  'admin.absenceSettings.form.displayName': undefined;
  'admin.absenceSettings.form.effectiveFrom': undefined;
  'admin.absenceSettings.form.heading': undefined;
  'admin.absenceSettings.form.pending': undefined;
  'admin.absenceSettings.form.submit': undefined;
  'admin.absenceSettings.form.typeCode': undefined;
  'admin.absenceSettings.history.available': undefined;
  'admin.absenceSettings.history.coverageOptions': Readonly<{ count: number }>;
  'admin.absenceSettings.history.entitlement': Readonly<{ account: string }>;
  'admin.absenceSettings.history.heading': undefined;
  'admin.absenceSettings.history.historical': undefined;
  'admin.absenceSettings.history.inactive': undefined;
  'admin.absenceSettings.history.latest': undefined;
  'admin.absenceSettings.history.noEntitlement': undefined;
  'admin.absenceSettings.history.ongoing': undefined;
  'admin.absenceSettings.history.range': Readonly<{ from: string; to: string }>;
  'admin.absenceSettings.history.versionLabel': Readonly<{ name: string; version: number }>;
  'admin.absenceSettings.loading.description': undefined;
  'admin.absenceSettings.loading.title': undefined;
  'admin.absenceSettings.page.description': undefined;
  'admin.absenceSettings.page.eyebrow': undefined;
  'admin.absenceSettings.requestNote.disabled': undefined;
  'admin.absenceSettings.requestNote.label': undefined;
  'admin.absenceSettings.requestNote.optional': undefined;
  'admin.absenceSettings.requestNote.required': undefined;
  'admin.absenceSettings.requestNote.sicknessReason': undefined;
  'admin.absenceSettings.timeTreatment.creditCovered': undefined;
  'admin.absenceSettings.timeTreatment.label': undefined;
  'admin.absenceSettings.timeTreatment.none': undefined;
  'admin.absenceSettings.timeTreatment.reduceCovered': undefined;
  'admin.absenceSettings.timing.maximumRetrospectiveDays': undefined;
  'admin.absenceSettings.timing.maximumRetrospectiveDescription': undefined;
  'admin.absenceSettings.timing.minimumLeadDays': undefined;
  'admin.absenceSettings.type.other': undefined;
  'admin.absenceSettings.type.sickness': undefined;
  'admin.absenceSettings.type.unpaid': undefined;
  'admin.absenceSettings.type.vacation': undefined;
  'admin.absenceSettings.validation.required': undefined;
  'admin.absenceSettings.workflow.approvalRequired': undefined;
  'admin.absenceSettings.workflow.label': undefined;
  'admin.absenceSettings.workflow.reportAndAcknowledge': undefined;
  'admin.absenceSettings.workflow.sicknessReason': undefined;
  'admin.employee.assignment.changeManager': undefined;
  'admin.employee.assignment.changeTeam': undefined;
  'admin.employee.assignment.chooseChange': undefined;
  'admin.employee.assignment.current': Readonly<{ current: string }>;
  'admin.employee.assignment.description': Readonly<{ date: string }>;
  'admin.employee.assignment.feedback.errorTitle': undefined;
  'admin.employee.assignment.feedback.managerUpdated': undefined;
  'admin.employee.assignment.feedback.successTitle': undefined;
  'admin.employee.assignment.feedback.teamUpdated': undefined;
  'admin.employee.assignment.heading': undefined;
  'admin.employee.assignment.historyItem': Readonly<{ from: string; label: string; to: string }>;
  'admin.employee.assignment.inactiveTeam': Readonly<{ team: string }>;
  'admin.employee.assignment.managerChange': undefined;
  'admin.employee.assignment.managerHistory': undefined;
  'admin.employee.assignment.noCurrentManager': undefined;
  'admin.employee.assignment.noCurrentTeam': undefined;
  'admin.employee.assignment.noHistory': undefined;
  'admin.employee.assignment.noManager': undefined;
  'admin.employee.assignment.noTeam': undefined;
  'admin.employee.assignment.saveManager': undefined;
  'admin.employee.assignment.saveTeam': undefined;
  'admin.employee.assignment.teamChange': undefined;
  'admin.employee.assignment.teamHistory': undefined;
  'admin.employee.assignment.validation.manager': undefined;
  'admin.employee.assignment.validation.team': undefined;
  'admin.employee.common.effectiveFrom': undefined;
  'admin.employee.common.historical': undefined;
  'admin.employee.common.latest': undefined;
  'admin.employee.common.none': undefined;
  'admin.employee.common.ongoing': undefined;
  'admin.employee.create.feedback.created': undefined;
  'admin.employee.create.form.accountEmail': undefined;
  'admin.employee.create.form.accountEmailDescription': undefined;
  'admin.employee.create.form.cancel': undefined;
  'admin.employee.create.form.displayName': undefined;
  'admin.employee.create.form.employeeNumber': undefined;
  'admin.employee.create.form.employmentStartsOn': undefined;
  'admin.employee.create.form.invitationDescription': undefined;
  'admin.employee.create.form.invitationLanguage': undefined;
  'admin.employee.create.form.pending': undefined;
  'admin.employee.create.form.rolesDescription': undefined;
  'admin.employee.create.form.rolesHeading': undefined;
  'admin.employee.create.form.submit': undefined;
  'admin.employee.create.page.description': undefined;
  'admin.employee.create.page.eyebrow': undefined;
  'admin.employee.create.page.title': undefined;
  'admin.employee.create.validation.accountEmail': undefined;
  'admin.employee.create.validation.displayName': undefined;
  'admin.employee.create.validation.employeeNumber': undefined;
  'admin.employee.create.validation.employmentStartsOn': undefined;
  'admin.employee.detail.account.email': undefined;
  'admin.employee.detail.account.heading': undefined;
  'admin.employee.detail.account.invitation': undefined;
  'admin.employee.detail.account.invitationPending': undefined;
  'admin.employee.detail.account.noInvitation': undefined;
  'admin.employee.detail.account.none': undefined;
  'admin.employee.detail.account.state': undefined;
  'admin.employee.detail.employment.description': undefined;
  'admin.employee.detail.employment.heading': undefined;
  'admin.employee.detail.feedback.errorTitle': undefined;
  'admin.employee.detail.feedback.invitationReissued': undefined;
  'admin.employee.detail.feedback.successTitle': undefined;
  'admin.employee.detail.feedback.updated': undefined;
  'admin.employee.detail.lifecycle.activate': undefined;
  'admin.employee.detail.lifecycle.deactivate': undefined;
  'admin.employee.detail.lifecycle.endsOn': undefined;
  'admin.employee.detail.lifecycle.heading': undefined;
  'admin.employee.detail.lifecycle.reinvite': undefined;
  'admin.employee.detail.lifecycle.startsOn': undefined;
  'admin.employee.detail.loading.description': undefined;
  'admin.employee.detail.loading.heading': undefined;
  'admin.employee.detail.loading.pageDescription': undefined;
  'admin.employee.detail.loading.title': undefined;
  'admin.employee.detail.page.active': undefined;
  'admin.employee.detail.page.back': undefined;
  'admin.employee.detail.page.description': Readonly<{ employeeNumber: string; status: string }>;
  'admin.employee.detail.page.eyebrow': undefined;
  'admin.employee.detail.page.inactive': undefined;
  'admin.employee.detail.range': Readonly<{ from: string; to: string }>;
  'admin.employee.detail.reviewOnly.description': undefined;
  'admin.employee.detail.reviewOnly.title': undefined;
  'admin.employee.detail.roles.description': undefined;
  'admin.employee.detail.roles.heading': undefined;
  'admin.employee.detail.roles.submit': undefined;
  'admin.employee.detail.validation.effectiveDate': undefined;
  'admin.employee.directory.account.active': undefined;
  'admin.employee.directory.account.inactive': undefined;
  'admin.employee.directory.account.invitationPending': undefined;
  'admin.employee.directory.account.none': undefined;
  'admin.employee.directory.column.account': undefined;
  'admin.employee.directory.column.action': undefined;
  'admin.employee.directory.column.employee': undefined;
  'admin.employee.directory.column.employment': undefined;
  'admin.employee.directory.column.number': undefined;
  'admin.employee.directory.column.roles': undefined;
  'admin.employee.directory.employment.noCurrent': Readonly<{ status: string }>;
  'admin.employee.directory.employment.since': Readonly<{ date: string; status: string }>;
  'admin.employee.directory.empty.description': undefined;
  'admin.employee.directory.empty.searchDescription': undefined;
  'admin.employee.directory.empty.searchTitle': undefined;
  'admin.employee.directory.empty.title': undefined;
  'admin.employee.directory.loading.description': undefined;
  'admin.employee.directory.loading.title': undefined;
  'admin.employee.directory.openRecord': undefined;
  'admin.employee.directory.openRecordLabel': Readonly<{ employee: string }>;
  'admin.employee.directory.page.addEmployee': undefined;
  'admin.employee.directory.page.description': undefined;
  'admin.employee.directory.page.eyebrow': undefined;
  'admin.employee.directory.page.manageTeams': undefined;
  'admin.employee.directory.pagination.label': undefined;
  'admin.employee.directory.pagination.summary': Readonly<{
    count: number;
    current: number;
    total: number;
  }>;
  'admin.employee.directory.results.caption': undefined;
  'admin.employee.directory.results.count': Readonly<{ count: number }>;
  'admin.employee.directory.results.scrollHint': undefined;
  'admin.employee.directory.results.scrollLabel': undefined;
  'admin.employee.directory.search.all': undefined;
  'admin.employee.directory.search.clear': undefined;
  'admin.employee.directory.search.description': undefined;
  'admin.employee.directory.search.label': undefined;
  'admin.employee.directory.search.status': undefined;
  'admin.employee.directory.search.submit': undefined;
  'admin.employee.directory.search.title': undefined;
  'admin.employee.directory.validation.search': undefined;
  'admin.employee.entitlement.description': undefined;
  'admin.employee.entitlement.empty.description': undefined;
  'admin.employee.entitlement.empty.entries': undefined;
  'admin.employee.entitlement.empty.title': undefined;
  'admin.employee.entitlement.entry.effective': Readonly<{ date: string }>;
  'admin.employee.entitlement.entry.reason': Readonly<{ reason: string }>;
  'admin.employee.entitlement.entryType.allocation': undefined;
  'admin.employee.entitlement.entryType.approvedDeduction': undefined;
  'admin.employee.entitlement.entryType.cancellationRestoration': undefined;
  'admin.employee.entitlement.entryType.carryover': undefined;
  'admin.employee.entitlement.entryType.expiry': undefined;
  'admin.employee.entitlement.entryType.manualAdjustment': undefined;
  'admin.employee.entitlement.entryType.pendingReservation': undefined;
  'admin.employee.entitlement.entryType.reservationRelease': undefined;
  'admin.employee.entitlement.error.conflict': undefined;
  'admin.employee.entitlement.error.effectiveDate': undefined;
  'admin.employee.entitlement.error.generic': undefined;
  'admin.employee.entitlement.feedback.added': undefined;
  'admin.employee.entitlement.feedback.errorTitle': undefined;
  'admin.employee.entitlement.feedback.successTitle': undefined;
  'admin.employee.entitlement.form.account': undefined;
  'admin.employee.entitlement.form.chooseAccount': undefined;
  'admin.employee.entitlement.form.description': undefined;
  'admin.employee.entitlement.form.effectiveOn': undefined;
  'admin.employee.entitlement.form.heading': undefined;
  'admin.employee.entitlement.form.minutes': undefined;
  'admin.employee.entitlement.form.minutesDescription': undefined;
  'admin.employee.entitlement.form.pending': undefined;
  'admin.employee.entitlement.form.reason': undefined;
  'admin.employee.entitlement.form.reasonDescription': undefined;
  'admin.employee.entitlement.form.submit': undefined;
  'admin.employee.entitlement.form.unavailable': undefined;
  'admin.employee.entitlement.heading': undefined;
  'admin.employee.entitlement.validation.required': undefined;
  'admin.employee.entitlement.value.available': undefined;
  'admin.employee.entitlement.value.projected': undefined;
  'admin.employee.entitlement.value.reserved': undefined;
  'admin.employee.error.accessDenied': undefined;
  'admin.employee.error.assignmentConflict': undefined;
  'admin.employee.error.assignmentDateInvalid': undefined;
  'admin.employee.error.emailExists': undefined;
  'admin.employee.error.employeeNumberExists': undefined;
  'admin.employee.error.employeeStateConflict': undefined;
  'admin.employee.error.employmentOverlap': undefined;
  'admin.employee.error.freshSession': undefined;
  'admin.employee.error.generic': undefined;
  'admin.employee.error.managerCycle': undefined;
  'admin.employee.error.managerNotEligible': undefined;
  'admin.employee.error.teamNameExists': undefined;
  'admin.employee.error.teamStateConflict': undefined;
  'admin.employee.policy.current.covered': undefined;
  'admin.employee.policy.current.gapsTitle': undefined;
  'admin.employee.policy.current.heading': undefined;
  'admin.employee.policy.current.none': undefined;
  'admin.employee.policy.description': Readonly<{ date: string }>;
  'admin.employee.policy.error.effectiveDate': undefined;
  'admin.employee.policy.error.employeeState': undefined;
  'admin.employee.policy.error.generic': undefined;
  'admin.employee.policy.error.notAssigned': undefined;
  'admin.employee.policy.error.stateConflict': undefined;
  'admin.employee.policy.error.versionConflict': undefined;
  'admin.employee.policy.feedback.errorTitle': undefined;
  'admin.employee.policy.feedback.successTitle': undefined;
  'admin.employee.policy.feedback.updated': undefined;
  'admin.employee.policy.form.chooseVersion': undefined;
  'admin.employee.policy.form.description': undefined;
  'admin.employee.policy.form.heading': undefined;
  'admin.employee.policy.form.pending': undefined;
  'admin.employee.policy.form.submit': undefined;
  'admin.employee.policy.form.unavailable': undefined;
  'admin.employee.policy.form.version': undefined;
  'admin.employee.policy.heading': undefined;
  'admin.employee.policy.history.heading': undefined;
  'admin.employee.policy.history.none': undefined;
  'admin.employee.policy.option': Readonly<{ name: string; status: string; version: number }>;
  'admin.employee.policy.preview.description': Readonly<{ date: string; threshold: string }>;
  'admin.employee.policy.preview.empty': undefined;
  'admin.employee.policy.preview.heading': undefined;
  'admin.employee.policy.range': Readonly<{ from: string; to: string }>;
  'admin.employee.policy.summary': Readonly<{ from: string; threshold: string; to: string }>;
  'admin.employee.policy.validation.effectiveFrom': undefined;
  'admin.employee.policy.validation.version': undefined;
  'admin.employee.policy.versionLabel': Readonly<{ name: string; version: number }>;
  'admin.employee.schedule.current.covered': undefined;
  'admin.employee.schedule.current.detail': Readonly<{
    effectiveFrom: string;
    weeklyTotal: string;
  }>;
  'admin.employee.schedule.current.gapsTitle': undefined;
  'admin.employee.schedule.current.heading': undefined;
  'admin.employee.schedule.current.none': undefined;
  'admin.employee.schedule.description': Readonly<{ date: string }>;
  'admin.employee.schedule.error.effectiveDate': undefined;
  'admin.employee.schedule.error.employeeState': undefined;
  'admin.employee.schedule.error.generic': undefined;
  'admin.employee.schedule.error.notAssigned': undefined;
  'admin.employee.schedule.error.stateConflict': undefined;
  'admin.employee.schedule.error.versionConflict': undefined;
  'admin.employee.schedule.feedback.errorTitle': undefined;
  'admin.employee.schedule.feedback.successTitle': undefined;
  'admin.employee.schedule.feedback.updated': undefined;
  'admin.employee.schedule.form.chooseVersion': undefined;
  'admin.employee.schedule.form.description': undefined;
  'admin.employee.schedule.form.heading': undefined;
  'admin.employee.schedule.form.pending': undefined;
  'admin.employee.schedule.form.submit': undefined;
  'admin.employee.schedule.form.unavailable': undefined;
  'admin.employee.schedule.form.version': undefined;
  'admin.employee.schedule.heading': undefined;
  'admin.employee.schedule.history.heading': undefined;
  'admin.employee.schedule.history.item': Readonly<{
    from: string;
    to: string;
    weeklyTotal: string;
  }>;
  'admin.employee.schedule.history.none': undefined;
  'admin.employee.schedule.option': Readonly<{ name: string; status: string; version: number }>;
  'admin.employee.schedule.range': Readonly<{ from: string; to: string }>;
  'admin.employee.schedule.validation.effectiveFrom': undefined;
  'admin.employee.schedule.validation.version': undefined;
  'admin.employee.schedule.versionLabel': Readonly<{ name: string; version: number }>;
  'admin.holidaySettings.empty.description': undefined;
  'admin.holidaySettings.empty.title': undefined;
  'admin.holidaySettings.error.accessDenied': undefined;
  'admin.holidaySettings.error.blocked': undefined;
  'admin.holidaySettings.error.conflict': undefined;
  'admin.holidaySettings.error.generic': undefined;
  'admin.holidaySettings.feedback.created': undefined;
  'admin.holidaySettings.feedback.errorTitle': undefined;
  'admin.holidaySettings.feedback.successTitle': undefined;
  'admin.holidaySettings.form.createPending': undefined;
  'admin.holidaySettings.form.date': undefined;
  'admin.holidaySettings.form.description': undefined;
  'admin.holidaySettings.form.heading': undefined;
  'admin.holidaySettings.form.name': undefined;
  'admin.holidaySettings.form.preview': undefined;
  'admin.holidaySettings.form.previewPending': undefined;
  'admin.holidaySettings.form.submit': undefined;
  'admin.holidaySettings.list.heading': undefined;
  'admin.holidaySettings.loading.description': undefined;
  'admin.holidaySettings.loading.title': undefined;
  'admin.holidaySettings.page.description': undefined;
  'admin.holidaySettings.page.eyebrow': undefined;
  'admin.holidaySettings.preview.allowed': undefined;
  'admin.holidaySettings.preview.blocked': Readonly<{ periods: number }>;
  'admin.holidaySettings.preview.heading': undefined;
  'admin.holidaySettings.preview.summary': Readonly<{ employees: number; projections: number }>;
  'admin.holidaySettings.validation.required': undefined;
  'admin.insights.destination.monthlyTimeReport': undefined;
  'admin.insights.error.denied': undefined;
  'admin.insights.error.invalidMonth': undefined;
  'admin.insights.fact.approvedEmployees': undefined;
  'admin.insights.fact.changesRequestedEmployees': undefined;
  'admin.insights.fact.coverageCases': undefined;
  'admin.insights.fact.coveredEmployeeDays': undefined;
  'admin.insights.fact.coveredEmployees': undefined;
  'admin.insights.fact.coveredScheduledMinutes': undefined;
  'admin.insights.fact.eligibleEmployees': undefined;
  'admin.insights.fact.incompleteEmployeeDays': undefined;
  'admin.insights.fact.lockedEmployees': undefined;
  'admin.insights.fact.openEmployees': undefined;
  'admin.insights.fact.submittedEmployees': undefined;
  'admin.insights.form.description': undefined;
  'admin.insights.form.heading': undefined;
  'admin.insights.kind.absenceCoverage.description': undefined;
  'admin.insights.kind.absenceCoverage.title': undefined;
  'admin.insights.kind.closureReadiness.description': undefined;
  'admin.insights.kind.closureReadiness.title': undefined;
  'admin.insights.page.description': undefined;
  'admin.insights.page.eyebrow': undefined;
  'admin.insights.privacy.description': undefined;
  'admin.insights.privacy.heading': undefined;
  'admin.insights.scope.organizationAggregate': undefined;
  'admin.insights.source.monthlyTimeReport': undefined;
  'admin.insights.status.suppressed': undefined;
  'admin.insights.suppressed.description': undefined;
  'admin.insights.suppressed.heading': undefined;
  'admin.insights.validation.correct': undefined;
  'admin.insights.validation.month': undefined;
  'admin.team.action.activate': Readonly<{ team: string }>;
  'admin.team.action.blocked': undefined;
  'admin.team.action.deactivate': Readonly<{ team: string }>;
  'admin.team.column.action': undefined;
  'admin.team.column.members': undefined;
  'admin.team.column.status': undefined;
  'admin.team.column.team': undefined;
  'admin.team.empty.description': undefined;
  'admin.team.empty.title': undefined;
  'admin.team.error.accessDenied': undefined;
  'admin.team.error.generic': undefined;
  'admin.team.error.nameExists': undefined;
  'admin.team.error.stateConflict': undefined;
  'admin.team.feedback.errorTitle': undefined;
  'admin.team.feedback.successTitle': undefined;
  'admin.team.feedback.updated': undefined;
  'admin.team.filter.all': undefined;
  'admin.team.filter.apply': undefined;
  'admin.team.filter.description': undefined;
  'admin.team.filter.status': undefined;
  'admin.team.filter.title': undefined;
  'admin.team.form.description': undefined;
  'admin.team.form.heading': undefined;
  'admin.team.form.name': undefined;
  'admin.team.form.nameDescription': undefined;
  'admin.team.form.pending': undefined;
  'admin.team.form.submit': undefined;
  'admin.team.loading.description': undefined;
  'admin.team.loading.title': undefined;
  'admin.team.page.create': undefined;
  'admin.team.page.description': undefined;
  'admin.team.page.employeeDirectory': undefined;
  'admin.team.page.eyebrow': undefined;
  'admin.team.pagination.label': undefined;
  'admin.team.pagination.summary': Readonly<{ count: number; current: number; total: number }>;
  'admin.team.results.caption': undefined;
  'admin.team.results.count': Readonly<{ count: number }>;
  'admin.team.results.members': Readonly<{ count: number }>;
  'admin.team.results.scrollHint': undefined;
  'admin.team.results.scrollLabel': undefined;
  'admin.team.status.active': undefined;
  'admin.team.status.inactive': undefined;
  'admin.team.validation.name': undefined;
  'admin.timeSettings.common.historical': undefined;
  'admin.timeSettings.common.latest': undefined;
  'admin.timeSettings.loading.title': undefined;
  'admin.timeSettings.page.description': undefined;
  'admin.timeSettings.page.eyebrow': undefined;
  'admin.timeSettings.policy.description': undefined;
  'admin.timeSettings.policy.empty.description': undefined;
  'admin.timeSettings.policy.empty.title': undefined;
  'admin.timeSettings.policy.error.conflict': undefined;
  'admin.timeSettings.policy.error.generic': undefined;
  'admin.timeSettings.policy.error.noChange': undefined;
  'admin.timeSettings.policy.feedback.created': undefined;
  'admin.timeSettings.policy.feedback.errorTitle': undefined;
  'admin.timeSettings.policy.feedback.successTitle': undefined;
  'admin.timeSettings.policy.heading': undefined;
  'admin.timeSettings.policy.name': undefined;
  'admin.timeSettings.policy.pending': undefined;
  'admin.timeSettings.policy.preview': Readonly<{ duration: string }>;
  'admin.timeSettings.policy.submit': undefined;
  'admin.timeSettings.policy.summary': undefined;
  'admin.timeSettings.policy.threshold': undefined;
  'admin.timeSettings.policy.thresholdDescription': undefined;
  'admin.timeSettings.policy.thresholdValue': Readonly<{ duration: string }>;
  'admin.timeSettings.policy.validation.name': undefined;
  'admin.timeSettings.policy.validation.threshold': undefined;
  'admin.timeSettings.policy.versionLabel': Readonly<{ name: string; version: number }>;
  'admin.timeSettings.schedule.description': undefined;
  'admin.timeSettings.schedule.empty.description': undefined;
  'admin.timeSettings.schedule.empty.title': undefined;
  'admin.timeSettings.schedule.error.conflict': undefined;
  'admin.timeSettings.schedule.error.generic': undefined;
  'admin.timeSettings.schedule.error.noChange': undefined;
  'admin.timeSettings.schedule.feedback.created': undefined;
  'admin.timeSettings.schedule.feedback.successTitle': undefined;
  'admin.timeSettings.schedule.heading': undefined;
  'admin.timeSettings.schedule.history.description': undefined;
  'admin.timeSettings.schedule.history.heading': undefined;
  'admin.timeSettings.schedule.loadingDescription': undefined;
  'admin.timeSettings.schedule.name': undefined;
  'admin.timeSettings.schedule.nameDescription': undefined;
  'admin.timeSettings.schedule.pending': undefined;
  'admin.timeSettings.schedule.perWeek': Readonly<{ duration: string }>;
  'admin.timeSettings.schedule.submit': undefined;
  'admin.timeSettings.schedule.total': Readonly<{ duration: string }>;
  'admin.timeSettings.schedule.validation.name': undefined;
  'admin.timeSettings.schedule.validation.weekdayMinutes': Readonly<{ day: string }>;
  'admin.timeSettings.schedule.versionLabel': Readonly<{ name: string; version: number }>;
  'admin.timeSettings.schedule.weekdayHeading': undefined;
  'admin.timeSettings.schedule.weekdayLabel': Readonly<{ day: string }>;
  'admin.timeSettings.weekday.friday': undefined;
  'admin.timeSettings.weekday.monday': undefined;
  'admin.timeSettings.weekday.saturday': undefined;
  'admin.timeSettings.weekday.sunday': undefined;
  'admin.timeSettings.weekday.thursday': undefined;
  'admin.timeSettings.weekday.tuesday': undefined;
  'admin.timeSettings.weekday.wednesday': undefined;
  'manager.insights.error.denied': undefined;
  'manager.insights.fact.actionRequired': undefined;
  'manager.insights.fact.available': undefined;
  'manager.insights.fact.offWork': undefined;
  'manager.insights.fact.onBreak': undefined;
  'manager.insights.fact.teamMembers': undefined;
  'manager.insights.fact.unavailable': undefined;
  'manager.insights.fact.unresolvedRecords': undefined;
  'manager.insights.fact.working': undefined;
  'manager.insights.form.description': undefined;
  'manager.insights.form.heading': undefined;
  'manager.insights.kind.actionSummary.description': undefined;
  'manager.insights.kind.actionSummary.title': undefined;
  'manager.insights.kind.teamCoverage.description': undefined;
  'manager.insights.kind.teamCoverage.title': undefined;
  'manager.insights.limitation.currentDateOnly': undefined;
  'manager.insights.page.description': undefined;
  'manager.insights.page.eyebrow': undefined;
  'manager.insights.scope.currentReports': undefined;
  'manager.approval.common.status.actionRequired': undefined;
  'manager.approval.common.status.allRecords': undefined;
  'manager.approval.common.status.completed': undefined;
  'manager.approval.common.status.waitingOnEmployee': undefined;
  'manager.approval.common.workflow.absenceCancellation': undefined;
  'manager.approval.common.workflow.absenceRequest': undefined;
  'manager.approval.common.workflow.correction': undefined;
  'manager.approval.common.workflow.monthlyPeriod': undefined;
  'manager.approval.detail.action.acknowledge': undefined;
  'manager.approval.detail.action.approve': undefined;
  'manager.approval.detail.action.approveCorrection': undefined;
  'manager.approval.detail.action.backToInbox': undefined;
  'manager.approval.detail.action.reject': undefined;
  'manager.approval.detail.action.requestChanges': undefined;
  'manager.approval.detail.apply.action': undefined;
  'manager.approval.detail.apply.description.postLock': undefined;
  'manager.approval.detail.apply.description.unlocked': undefined;
  'manager.approval.detail.apply.heading': undefined;
  'manager.approval.detail.apply.pending': undefined;
  'manager.approval.detail.decision.description': undefined;
  'manager.approval.detail.decision.heading': undefined;
  'manager.approval.detail.decision.overrideDescription': undefined;
  'manager.approval.detail.decision.overrideTitle': undefined;
  'manager.approval.detail.decision.pending': undefined;
  'manager.approval.detail.decision.reasonHelp': undefined;
  'manager.approval.detail.decision.reasonLabel': undefined;
  'manager.approval.detail.empty.description': undefined;
  'manager.approval.detail.empty.title': undefined;
  'manager.approval.detail.error.accessDenied': undefined;
  'manager.approval.detail.error.adjustmentRequired': undefined;
  'manager.approval.detail.error.deniedDescription': undefined;
  'manager.approval.detail.error.deniedStateDescription': undefined;
  'manager.approval.detail.error.deniedStateTitle': undefined;
  'manager.approval.detail.error.description': undefined;
  'manager.approval.detail.error.insufficientBalance': undefined;
  'manager.approval.detail.error.recording': undefined;
  'manager.approval.detail.error.stateConflict': undefined;
  'manager.approval.detail.error.stateDescription': undefined;
  'manager.approval.detail.error.title': undefined;
  'manager.approval.detail.evidence.description': undefined;
  'manager.approval.detail.evidence.empty': undefined;
  'manager.approval.detail.evidence.eyebrow': undefined;
  'manager.approval.detail.evidence.heading': undefined;
  'manager.approval.detail.feedback.correctionApplied': Readonly<{
    balance: string;
    worked: string;
  }>;
  'manager.approval.detail.feedback.decisionRecorded': Readonly<{ action: string; status: string }>;
  'manager.approval.detail.feedback.errorTitle': undefined;
  'manager.approval.detail.feedback.postLockApproved': undefined;
  'manager.approval.detail.feedback.successTitle': undefined;
  'manager.approval.detail.loading.description': undefined;
  'manager.approval.detail.loading.pageDescription': undefined;
  'manager.approval.detail.loading.pageTitle': undefined;
  'manager.approval.detail.loading.title': undefined;
  'manager.approval.detail.page.description': undefined;
  'manager.approval.detail.page.eyebrow': undefined;
  'manager.approval.detail.page.title': Readonly<{ workflow: string }>;
  'manager.approval.detail.summary.absenceType': undefined;
  'manager.approval.detail.summary.coverage.caption': undefined;
  'manager.approval.detail.summary.coverage.date': undefined;
  'manager.approval.detail.summary.coverage.kind': undefined;
  'manager.approval.detail.summary.coverage.minutes': undefined;
  'manager.approval.detail.summary.coverage.scrollHint': undefined;
  'manager.approval.detail.summary.coverage.scrollLabel': undefined;
  'manager.approval.detail.summary.dateRange': Readonly<{ from: string; to: string }>;
  'manager.approval.detail.summary.effect': undefined;
  'manager.approval.detail.summary.effectPostLock': undefined;
  'manager.approval.detail.summary.effectUnlocked': undefined;
  'manager.approval.detail.summary.employeeReason': undefined;
  'manager.approval.detail.summary.entitlement': undefined;
  'manager.approval.detail.summary.entitlementValue': Readonly<{
    projected: string;
    requested: string;
  }>;
  'manager.approval.detail.summary.originalBalance': Readonly<{ value: string }>;
  'manager.approval.detail.summary.originalCalculation': undefined;
  'manager.approval.detail.summary.originalCredited': Readonly<{ value: string }>;
  'manager.approval.detail.summary.originalWorked': Readonly<{ value: string }>;
  'manager.approval.detail.summary.proposedInterval': undefined;
  'manager.approval.detail.summary.submitted': undefined;
  'manager.approval.detail.summary.workflow': undefined;
  'manager.approval.detail.validation.confirmOverride': undefined;
  'manager.approval.detail.validation.hrOverrideOnly': undefined;
  'manager.approval.detail.validation.reason': undefined;
  'manager.approval.detail.workflow.absenceCancellation': undefined;
  'manager.approval.detail.workflow.absenceRequest': undefined;
  'manager.approval.detail.workflow.correctionRequest': undefined;
  'manager.approval.inbox.action.ariaLabel': Readonly<{ employee: string; workflow: string }>;
  'manager.approval.inbox.action.review': undefined;
  'manager.approval.inbox.action.reviewAndDecide': undefined;
  'manager.approval.inbox.action.reviewRecord': undefined;
  'manager.approval.inbox.action.wait': undefined;
  'manager.approval.inbox.applied.dateRange': Readonly<{ from: string; to: string }>;
  'manager.approval.inbox.applied.label': undefined;
  'manager.approval.inbox.applied.reset': undefined;
  'manager.approval.inbox.column.action': undefined;
  'manager.approval.inbox.column.affectedDates': undefined;
  'manager.approval.inbox.column.employee': undefined;
  'manager.approval.inbox.column.status': undefined;
  'manager.approval.inbox.column.submitted': undefined;
  'manager.approval.inbox.column.workflow': undefined;
  'manager.approval.inbox.empty.defaultDescription': undefined;
  'manager.approval.inbox.empty.defaultTitle': undefined;
  'manager.approval.inbox.empty.filteredDescription': undefined;
  'manager.approval.inbox.empty.filteredTitle': undefined;
  'manager.approval.inbox.error.deniedDescription': undefined;
  'manager.approval.inbox.error.deniedTitle': undefined;
  'manager.approval.inbox.error.requestReference': Readonly<{ requestId: string }>;
  'manager.approval.inbox.error.unavailableDescription': undefined;
  'manager.approval.inbox.error.unavailableTitle': undefined;
  'manager.approval.inbox.filter.anyAffectedDate': undefined;
  'manager.approval.inbox.filter.apply': undefined;
  'manager.approval.inbox.filter.ariaLabel': undefined;
  'manager.approval.inbox.filter.category.all': undefined;
  'manager.approval.inbox.filter.category.label': undefined;
  'manager.approval.inbox.filter.error': undefined;
  'manager.approval.inbox.filter.errorTitle': undefined;
  'manager.approval.inbox.filter.from': undefined;
  'manager.approval.inbox.filter.hide': undefined;
  'manager.approval.inbox.filter.order.earliestAffected': undefined;
  'manager.approval.inbox.filter.order.employeeAscending': undefined;
  'manager.approval.inbox.filter.order.employeeDescending': undefined;
  'manager.approval.inbox.filter.order.label': undefined;
  'manager.approval.inbox.filter.order.latestAffected': undefined;
  'manager.approval.inbox.filter.order.newestSubmitted': undefined;
  'manager.approval.inbox.filter.order.oldestSubmitted': undefined;
  'manager.approval.inbox.filter.show': undefined;
  'manager.approval.inbox.filter.team.all': undefined;
  'manager.approval.inbox.filter.team.allCurrent': undefined;
  'manager.approval.inbox.filter.team.label': undefined;
  'manager.approval.inbox.filter.team.selected': undefined;
  'manager.approval.inbox.filter.to': undefined;
  'manager.approval.inbox.loading.description': undefined;
  'manager.approval.inbox.loading.title': undefined;
  'manager.approval.inbox.page.description': undefined;
  'manager.approval.inbox.page.eyebrow': undefined;
  'manager.approval.inbox.pagination.label': undefined;
  'manager.approval.inbox.pagination.none': undefined;
  'manager.approval.inbox.pagination.summary': Readonly<{
    first: number;
    last: number;
    total: number;
  }>;
  'manager.approval.inbox.permission.description': undefined;
  'manager.approval.inbox.permission.eyebrow': undefined;
  'manager.approval.inbox.queue.label': undefined;
  'manager.approval.inbox.queue.needsReview': undefined;
  'manager.approval.inbox.queue.viewLabel': undefined;
  'manager.approval.inbox.results.caption': undefined;
  'manager.approval.inbox.results.clearFilters': undefined;
  'manager.approval.inbox.results.listLabel': undefined;
  'manager.approval.inbox.results.refreshing': undefined;
  'manager.approval.inbox.results.statusLabel': undefined;
  'manager.approval.inbox.results.tableLabel': undefined;
  'manager.approval.inbox.team.none': undefined;
  'manager.report.catalog.flexibleTime.description': undefined;
  'manager.report.catalog.flexibleTime.title': undefined;
  'manager.report.catalog.leave.description': undefined;
  'manager.report.catalog.leave.title': undefined;
  'manager.report.catalog.missingRecords.description': undefined;
  'manager.report.catalog.missingRecords.title': undefined;
  'manager.report.catalog.monthlyTime.description': undefined;
  'manager.report.catalog.monthlyTime.title': undefined;
  'manager.report.catalog.pendingApprovals.description': undefined;
  'manager.report.catalog.pendingApprovals.title': undefined;
  'manager.report.common.scope.currentDirectReports': undefined;
  'manager.report.common.scope.organization': undefined;
  'manager.report.common.scope.self': undefined;
  'manager.report.common.scope.selfAndDirectReports': undefined;
  'manager.report.common.sort.date': undefined;
  'manager.report.common.sort.employee': undefined;
  'manager.report.common.sort.status': undefined;
  'manager.report.common.sort.value': undefined;
  'manager.report.detail.action.back': undefined;
  'manager.report.detail.action.return': undefined;
  'manager.report.detail.action.review': undefined;
  'manager.report.detail.column.action': undefined;
  'manager.report.detail.column.affectedDates': undefined;
  'manager.report.detail.column.closing': undefined;
  'manager.report.detail.column.employee': undefined;
  'manager.report.detail.column.incomplete': undefined;
  'manager.report.detail.column.leaveAccount': undefined;
  'manager.report.detail.column.month': undefined;
  'manager.report.detail.column.opening': undefined;
  'manager.report.detail.column.projected': undefined;
  'manager.report.detail.column.status': undefined;
  'manager.report.detail.column.submitted': undefined;
  'manager.report.detail.column.warnings': undefined;
  'manager.report.detail.column.workflow': undefined;
  'manager.report.detail.empty.description': undefined;
  'manager.report.detail.empty.title': undefined;
  'manager.report.detail.error.deniedDescription': undefined;
  'manager.report.detail.error.deniedTitle': undefined;
  'manager.report.detail.error.refreshNoData': undefined;
  'manager.report.detail.error.unavailableDescription': undefined;
  'manager.report.detail.error.unavailableTitle': undefined;
  'manager.report.detail.filter.applied.employee': undefined;
  'manager.report.detail.filter.applied.summary': Readonly<{
    direction: string;
    from: string;
    sort: string;
    to: string;
  }>;
  'manager.report.detail.filter.applied.through': undefined;
  'manager.report.detail.filter.apply': undefined;
  'manager.report.detail.filter.direction.ascending': undefined;
  'manager.report.detail.filter.direction.descending': undefined;
  'manager.report.detail.filter.direction.label': undefined;
  'manager.report.detail.filter.error': undefined;
  'manager.report.detail.filter.from': undefined;
  'manager.report.detail.filter.heading': undefined;
  'manager.report.detail.filter.reset': undefined;
  'manager.report.detail.filter.sort': undefined;
  'manager.report.detail.filter.to': undefined;
  'manager.report.detail.loading.description': undefined;
  'manager.report.detail.loading.title': undefined;
  'manager.report.detail.missingRecords.noWarningCode': undefined;
  'manager.report.detail.page.eyebrow': undefined;
  'manager.report.detail.pagination.label': undefined;
  'manager.report.detail.pagination.summary': Readonly<{
    count: number;
    current: number;
    total: number;
  }>;
  'manager.report.detail.partial.description': undefined;
  'manager.report.detail.partial.title': undefined;
  'manager.report.detail.results.generated': Readonly<{ value: string }>;
  'manager.report.detail.results.heading': undefined;
  'manager.report.detail.results.refreshing': undefined;
  'manager.report.detail.results.summary': Readonly<{ count: number; scope: string }>;
  'manager.report.detail.summary.actionableApprovals': undefined;
  'manager.report.detail.summary.availableChange': undefined;
  'manager.report.detail.summary.balance': undefined;
  'manager.report.detail.summary.closingAvailable': undefined;
  'manager.report.detail.summary.closingBalance': undefined;
  'manager.report.detail.summary.credited': undefined;
  'manager.report.detail.summary.expected': undefined;
  'manager.report.detail.summary.incompleteRecords': undefined;
  'manager.report.detail.summary.openingAvailable': undefined;
  'manager.report.detail.summary.openingBalance': undefined;
  'manager.report.detail.summary.postLockChange': undefined;
  'manager.report.detail.summary.projectedRemaining': undefined;
  'manager.report.detail.summary.rangeChange': undefined;
  'manager.report.detail.summary.reserved': undefined;
  'manager.report.detail.summary.worked': undefined;
  'manager.report.detail.table.caption': Readonly<{ from: string; report: string; to: string }>;
  'manager.report.detail.table.scrollHint': undefined;
  'manager.report.detail.table.scrollLabel': Readonly<{ report: string }>;
  'manager.report.page.available.description': undefined;
  'manager.report.page.available.heading': undefined;
  'manager.report.page.description': undefined;
  'manager.report.page.error.title': undefined;
  'manager.report.page.eyebrow': undefined;
  'manager.report.page.loading.description': undefined;
  'manager.report.page.loading.title': undefined;
  'manager.report.page.open': Readonly<{ report: string }>;
  'manager.report.portability.action.copy': undefined;
  'manager.report.portability.action.copyPending': undefined;
  'manager.report.portability.action.csvLabel': undefined;
  'manager.report.portability.action.export': undefined;
  'manager.report.portability.action.exportPending': undefined;
  'manager.report.portability.action.summaryCopyLabel': undefined;
  'manager.report.portability.description.copy': undefined;
  'manager.report.portability.description.csv': Readonly<{ fields: string }>;
  'manager.report.portability.error.accessDenied': Readonly<{ action: string }>;
  'manager.report.portability.error.clipboardUnavailable': undefined;
  'manager.report.portability.error.failed': Readonly<{ action: string }>;
  'manager.report.portability.error.sessionEnded': Readonly<{ action: string }>;
  'manager.report.portability.error.tooLarge': undefined;
  'manager.report.portability.fields.flexibleTime': undefined;
  'manager.report.portability.fields.leave': undefined;
  'manager.report.portability.fields.missingRecords': undefined;
  'manager.report.portability.fields.monthlyTime': undefined;
  'manager.report.portability.fields.pendingApprovals': undefined;
  'manager.report.portability.heading': undefined;
  'manager.report.portability.status.copySuccess': undefined;
  'manager.report.portability.status.exportSuccess': undefined;
  'manager.report.portability.status.label': undefined;
  'manager.team.calendar.agenda.label': Readonly<{ month: string }>;
  'manager.team.calendar.agenda.selectDate': undefined;
  'manager.team.calendar.byDate': undefined;
  'manager.team.calendar.coverage.firstHalf': undefined;
  'manager.team.calendar.coverage.fullDay': undefined;
  'manager.team.calendar.coverage.secondHalf': undefined;
  'manager.team.calendar.empty.dateDescription': undefined;
  'manager.team.calendar.empty.monthDescription': undefined;
  'manager.team.calendar.empty.monthTitle': undefined;
  'manager.team.calendar.entry.summary': Readonly<{ coverage: string }>;
  'manager.team.calendar.entry.team': Readonly<{ team: string }>;
  'manager.team.calendar.entry.teamMissing': undefined;
  'manager.team.calendar.error.description': undefined;
  'manager.team.calendar.error.title': undefined;
  'manager.team.calendar.grid.caption': Readonly<{ month: string }>;
  'manager.team.calendar.grid.scrollHint': undefined;
  'manager.team.calendar.grid.scrollLabel': undefined;
  'manager.team.calendar.grid.selectDate': Readonly<{ date: string }>;
  'manager.team.calendar.loading.description': undefined;
  'manager.team.calendar.loading.title': undefined;
  'manager.team.calendar.marker.selected': undefined;
  'manager.team.calendar.marker.today': undefined;
  'manager.team.calendar.missingTeam.description': Readonly<{ count: number }>;
  'manager.team.calendar.missingTeam.title': undefined;
  'manager.team.calendar.navigation.label': undefined;
  'manager.team.calendar.navigation.next': undefined;
  'manager.team.calendar.navigation.previous': undefined;
  'manager.team.calendar.page.description': undefined;
  'manager.team.calendar.page.eyebrow': undefined;
  'manager.team.calendar.permission.description': undefined;
  'manager.team.calendar.permission.eyebrow': undefined;
  'manager.team.calendar.scopeAsOf': Readonly<{ date: string; timeZone: string }>;
  'manager.team.calendar.selectedDate': undefined;
  'manager.team.calendar.selectedMonth': undefined;
  'manager.team.calendar.todaySuffix': undefined;
  'manager.team.calendar.unavailableCount': Readonly<{ count: number }>;
  'manager.team.calendar.view.agenda': undefined;
  'manager.team.calendar.view.label': undefined;
  'manager.team.calendar.view.month': undefined;
  'manager.team.calendar.weekday.friday': undefined;
  'manager.team.calendar.weekday.monday': undefined;
  'manager.team.calendar.weekday.saturday': undefined;
  'manager.team.calendar.weekday.sunday': undefined;
  'manager.team.calendar.weekday.thursday': undefined;
  'manager.team.calendar.weekday.tuesday': undefined;
  'manager.team.calendar.weekday.wednesday': undefined;
  'manager.team.status.action.none': undefined;
  'manager.team.status.action.openInbox': undefined;
  'manager.team.status.action.openInboxLabel': Readonly<{ employee: string }>;
  'manager.team.status.action.viewCalendar': undefined;
  'manager.team.status.action.viewCalendarLabel': Readonly<{ employee: string }>;
  'manager.team.status.availability.offWork': undefined;
  'manager.team.status.availability.onBreak': undefined;
  'manager.team.status.availability.unavailable': undefined;
  'manager.team.status.availability.working': undefined;
  'manager.team.status.column.availability': undefined;
  'manager.team.status.column.currentTeam': undefined;
  'manager.team.status.column.employee': undefined;
  'manager.team.status.column.nextStep': undefined;
  'manager.team.status.column.recordState': undefined;
  'manager.team.status.empty.filteredDescription': undefined;
  'manager.team.status.empty.filteredTitle': undefined;
  'manager.team.status.empty.noReportsDescription': undefined;
  'manager.team.status.empty.noReportsTitle': undefined;
  'manager.team.status.error.description': undefined;
  'manager.team.status.error.title': undefined;
  'manager.team.status.filter.allAvailability': undefined;
  'manager.team.status.filter.allDirectReports': undefined;
  'manager.team.status.filter.description': undefined;
  'manager.team.status.filter.heading': undefined;
  'manager.team.status.filter.openRecords': undefined;
  'manager.team.status.filter.option': Readonly<{ count: number; label: string }>;
  'manager.team.status.filter.recordLabel': undefined;
  'manager.team.status.filter.withOpenRecords': undefined;
  'manager.team.status.loading.description': undefined;
  'manager.team.status.loading.title': undefined;
  'manager.team.status.members.currentCount': Readonly<{ count: number }>;
  'manager.team.status.members.filteredCount': Readonly<{
    availability: string;
    records: string;
    total: number;
    visible: number;
  }>;
  'manager.team.status.members.heading': undefined;
  'manager.team.status.members.showAll': undefined;
  'manager.team.status.page.description': undefined;
  'manager.team.status.page.eyebrow': undefined;
  'manager.team.status.page.shortcuts': undefined;
  'manager.team.status.permission.description': undefined;
  'manager.team.status.permission.eyebrow': undefined;
  'manager.team.status.results.caption': undefined;
  'manager.team.status.results.currentTeam': undefined;
  'manager.team.status.results.listLabel': undefined;
  'manager.team.status.results.noOpenRecords': undefined;
  'manager.team.status.results.noTeam': undefined;
  'manager.team.status.results.openRecords': undefined;
  'manager.team.status.results.records': undefined;
  'manager.team.status.results.tableLabel': undefined;
  'manager.team.status.summary.asOf': Readonly<{
    date: string;
    time: string;
    timeZone: string;
  }>;
  'manager.team.status.summary.current': Readonly<{ count: number }>;
  'manager.team.status.summary.heading': undefined;
  'manager.team.status.summary.refreshLabel': undefined;
  'manager.team.status.summary.refreshing': undefined;
  'system.accounts.action.activateAccount': undefined;
  'system.accounts.action.assignSystemRole': undefined;
  'system.accounts.action.deactivateAccount': undefined;
  'system.accounts.action.revokeSystemRole': undefined;
  'system.accounts.create.accountEmail': undefined;
  'system.accounts.create.accountName': undefined;
  'system.accounts.create.action': undefined;
  'system.accounts.create.description': undefined;
  'system.accounts.create.heading': undefined;
  'system.accounts.create.invitationDescription': undefined;
  'system.accounts.create.invitationLanguage': undefined;
  'system.accounts.create.pending': undefined;
  'system.accounts.directory.activeAccount': undefined;
  'system.accounts.directory.activeSessions': undefined;
  'system.accounts.directory.currentAccount': undefined;
  'system.accounts.directory.description': undefined;
  'system.accounts.directory.employeeLinked': undefined;
  'system.accounts.directory.heading': undefined;
  'system.accounts.directory.inactiveAccount': undefined;
  'system.accounts.directory.invitationPending': undefined;
  'system.accounts.directory.lastActive': Readonly<{ value: string }>;
  'system.accounts.directory.noActiveSessions': undefined;
  'system.accounts.directory.noSystemRole': undefined;
  'system.accounts.directory.stateAndAuthority': undefined;
  'system.accounts.directory.technicalOnly': undefined;
  'system.accounts.empty.description': undefined;
  'system.accounts.empty.title': undefined;
  'system.accounts.error.accessDenied': undefined;
  'system.accounts.error.emailExists': undefined;
  'system.accounts.error.freshSession': undefined;
  'system.accounts.error.generic': undefined;
  'system.accounts.error.stateConflict': undefined;
  'system.accounts.feedback.created': undefined;
  'system.accounts.feedback.title': undefined;
  'system.accounts.feedback.updated': undefined;
  'system.accounts.loading.description': undefined;
  'system.accounts.loading.title': undefined;
  'system.accounts.page.description': undefined;
  'system.accounts.page.eyebrow': undefined;
  'system.accounts.validation.accountEmail': undefined;
  'system.accounts.validation.accountName': undefined;
  'system.audit.domain.page.caption': undefined;
  'system.audit.domain.page.description': undefined;
  'system.audit.domain.page.eyebrow': undefined;
  'system.audit.domain.page.filterDescription': undefined;
  'system.audit.domain.page.filterTitle': undefined;
  'system.audit.domain.page.resultsTitle': undefined;
  'system.audit.domain.page.scrollLabel': undefined;
  'system.audit.explorer.actor.account': undefined;
  'system.audit.explorer.actor.systemProcess': Readonly<{ process: string }>;
  'system.audit.explorer.actor.unknown': undefined;
  'system.audit.explorer.boolean.no': undefined;
  'system.audit.explorer.boolean.yes': undefined;
  'system.audit.explorer.detail.actor': undefined;
  'system.audit.explorer.detail.privileged': undefined;
  'system.audit.explorer.detail.reasonCode': undefined;
  'system.audit.explorer.detail.safeFacts': undefined;
  'system.audit.explorer.detail.summary': undefined;
  'system.audit.explorer.detail.targetReference': undefined;
  'system.audit.explorer.empty.description': undefined;
  'system.audit.explorer.empty.title': undefined;
  'system.audit.explorer.fact.attendanceRevision': undefined;
  'system.audit.explorer.fact.authenticationMethod': undefined;
  'system.audit.explorer.fact.changedRole': undefined;
  'system.audit.explorer.fact.effectiveDate': undefined;
  'system.audit.explorer.fact.eventCount': undefined;
  'system.audit.explorer.fact.failureCategory': undefined;
  'system.audit.explorer.fact.httpStatus': undefined;
  'system.audit.explorer.fact.minutes': undefined;
  'system.audit.explorer.fact.nextStatus': undefined;
  'system.audit.explorer.fact.previousStatus': undefined;
  'system.audit.explorer.fact.scope': undefined;
  'system.audit.explorer.fact.sessionReference': undefined;
  'system.audit.explorer.fact.sourceCount': undefined;
  'system.audit.explorer.fact.version': undefined;
  'system.audit.explorer.filter.action': undefined;
  'system.audit.explorer.filter.from': undefined;
  'system.audit.explorer.filter.outcome': undefined;
  'system.audit.explorer.filter.outcomeAll': undefined;
  'system.audit.explorer.filter.target': undefined;
  'system.audit.explorer.filter.targetAll': undefined;
  'system.audit.explorer.filter.to': undefined;
  'system.audit.explorer.loading.description': undefined;
  'system.audit.explorer.loading.inline': undefined;
  'system.audit.explorer.loading.title': undefined;
  'system.audit.explorer.outcome.denied': undefined;
  'system.audit.explorer.outcome.failure': undefined;
  'system.audit.explorer.outcome.success': undefined;
  'system.audit.explorer.pagination.label': undefined;
  'system.audit.explorer.pagination.summary': Readonly<{ current: number; total: number }>;
  'system.audit.explorer.results.count': Readonly<{ count: number }>;
  'system.audit.explorer.table.column.action': undefined;
  'system.audit.explorer.table.column.detail': undefined;
  'system.audit.explorer.table.column.occurred': undefined;
  'system.audit.explorer.table.column.outcome': undefined;
  'system.audit.explorer.table.column.target': undefined;
  'system.audit.explorer.table.scrollHint': undefined;
  'system.audit.explorer.target.absenceRequest': undefined;
  'system.audit.explorer.target.account': undefined;
  'system.audit.explorer.target.assignment': undefined;
  'system.audit.explorer.target.attendance': undefined;
  'system.audit.explorer.target.authentication': undefined;
  'system.audit.explorer.target.authorization': undefined;
  'system.audit.explorer.target.backup': undefined;
  'system.audit.explorer.target.configuration': undefined;
  'system.audit.explorer.target.correctionRequest': undefined;
  'system.audit.explorer.target.employee': undefined;
  'system.audit.explorer.target.export': undefined;
  'system.audit.explorer.target.invitation': undefined;
  'system.audit.explorer.target.leaveEntitlement': undefined;
  'system.audit.explorer.target.monthlyPeriod': undefined;
  'system.audit.explorer.target.notificationDelivery': undefined;
  'system.audit.explorer.target.operations': undefined;
  'system.audit.explorer.target.recovery': undefined;
  'system.audit.explorer.target.secret': undefined;
  'system.audit.explorer.target.session': undefined;
  'system.audit.explorer.target.team': undefined;
  'system.audit.explorer.target.timeAccount': undefined;
  'system.audit.technical.page.caption': undefined;
  'system.audit.technical.page.description': undefined;
  'system.audit.technical.page.eyebrow': undefined;
  'system.audit.technical.page.filterDescription': undefined;
  'system.audit.technical.page.filterTitle': undefined;
  'system.audit.technical.page.resultsTitle': undefined;
  'system.audit.technical.page.scrollLabel': undefined;
  'system.insights.action.openOperations': undefined;
  'system.insights.error.denied': undefined;
  'system.insights.error.heading': undefined;
  'system.insights.error.unavailable': undefined;
  'system.insights.fact.applicationVersion': undefined;
  'system.insights.fact.backupManagement': undefined;
  'system.insights.fact.databaseHealth': undefined;
  'system.insights.fact.expectedSchemaStatus': undefined;
  'system.insights.fact.mailDeliveryConfiguration': undefined;
  'system.insights.fact.persistentRememberMe': undefined;
  'system.insights.fact.serviceHealth': undefined;
  'system.insights.fact.sessionAbsoluteTimeout': undefined;
  'system.insights.fact.sessionFreshWindow': undefined;
  'system.insights.fact.sessionIdleTimeout': undefined;
  'system.insights.form.description': undefined;
  'system.insights.form.heading': undefined;
  'system.insights.form.run': undefined;
  'system.insights.form.running': undefined;
  'system.insights.group.operations': undefined;
  'system.insights.group.readiness': undefined;
  'system.insights.group.service': undefined;
  'system.insights.group.sessionPolicy': undefined;
  'system.insights.limitation.backup.description': undefined;
  'system.insights.limitation.backup.heading': undefined;
  'system.insights.page.description': undefined;
  'system.insights.page.eyebrow': undefined;
  'system.insights.result.capturedAt': Readonly<{ value: string }>;
  'system.insights.result.heading': undefined;
  'system.insights.source.applicationManifest': undefined;
  'system.insights.source.authenticationProfile': undefined;
  'system.insights.source.databaseReadiness': undefined;
  'system.insights.source.hostOperatorProcedures': undefined;
  'system.insights.source.mailAdapterConfiguration': undefined;
  'system.insights.sources.description': undefined;
  'system.insights.sources.heading': undefined;
  'system.insights.status.ready': undefined;
  'system.insights.status.running': undefined;
  'system.insights.value.configured': undefined;
  'system.insights.value.disabled': undefined;
  'system.insights.value.hostOperatorManaged': undefined;
  'system.insights.value.minutes': Readonly<{ count: number }>;
  'system.insights.value.notConfigured': undefined;
  'system.insights.value.notReady': undefined;
  'system.insights.value.ready': undefined;
  'system.operations.alert.criticalTitle': undefined;
  'system.operations.alert.degradedTitle': undefined;
  'system.operations.alert.description': undefined;
  'system.operations.dependencies.authentication.heading': undefined;
  'system.operations.dependencies.database.heading': undefined;
  'system.operations.dependencies.error': undefined;
  'system.operations.dependencies.heading': undefined;
  'system.operations.dependencies.latency': undefined;
  'system.operations.dependencies.latencyValue': Readonly<{ milliseconds: number }>;
  'system.operations.dependencies.status': undefined;
  'system.operations.deployment.description': undefined;
  'system.operations.deployment.documentation': undefined;
  'system.operations.deployment.heading': undefined;
  'system.operations.health.critical': undefined;
  'system.operations.health.degraded': undefined;
  'system.operations.health.healthy': undefined;
  'system.operations.health.unavailable': undefined;
  'system.operations.loading.description': undefined;
  'system.operations.loading.title': undefined;
  'system.operations.page.description': undefined;
  'system.operations.page.eyebrow': undefined;
  'system.operations.status.environment': undefined;
  'system.operations.status.heading': undefined;
  'system.operations.status.overallHealth': undefined;
  'system.operations.status.service': undefined;
  'system.operations.status.timestamp': undefined;
  'system.operations.status.version': undefined;
  'output.clipboard.report.line.actionableApprovals': Readonly<{ value: string }>;
  'output.clipboard.report.line.availableChange': Readonly<{ value: string }>;
  'output.clipboard.report.line.balance': Readonly<{ value: string }>;
  'output.clipboard.report.line.closingAvailable': Readonly<{ value: string }>;
  'output.clipboard.report.line.closingBalance': Readonly<{ value: string }>;
  'output.clipboard.report.line.credited': Readonly<{ value: string }>;
  'output.clipboard.report.line.dateRange': Readonly<{ from: string; to: string }>;
  'output.clipboard.report.line.expected': Readonly<{ value: string }>;
  'output.clipboard.report.line.incompleteRecords': Readonly<{ value: string }>;
  'output.clipboard.report.line.matchingRows': Readonly<{ value: string }>;
  'output.clipboard.report.line.openingAvailable': Readonly<{ value: string }>;
  'output.clipboard.report.line.openingBalance': Readonly<{ value: string }>;
  'output.clipboard.report.line.postLockChange': Readonly<{ value: string }>;
  'output.clipboard.report.line.projectedRemaining': Readonly<{ value: string }>;
  'output.clipboard.report.line.rangeChange': Readonly<{ value: string }>;
  'output.clipboard.report.line.reserved': Readonly<{ value: string }>;
  'output.clipboard.report.line.scope': Readonly<{ value: string }>;
  'output.clipboard.report.line.worked': Readonly<{ value: string }>;
  'output.clipboard.report.scope.currentDirectReports': undefined;
  'output.clipboard.report.scope.organisation': undefined;
  'output.clipboard.report.scope.self': undefined;
  'output.clipboard.report.scope.selfAndDirectReports': undefined;
  'output.clipboard.report.title.flexibleTime': undefined;
  'output.clipboard.report.title.leave': undefined;
  'output.clipboard.report.title.missingRecords': undefined;
  'output.clipboard.report.title.monthlyTime': undefined;
  'output.clipboard.report.title.pendingApprovals': undefined;
  'output.communication.invitation.body': Readonly<{ activationUrl: string; name: string }>;
  'output.communication.invitation.subject': undefined;
  'output.communication.notification.acknowledged.body': undefined;
  'output.communication.notification.acknowledged.subject': undefined;
  'output.communication.notification.approved.body': undefined;
  'output.communication.notification.approved.subject': undefined;
  'output.communication.notification.changesRequested.body': undefined;
  'output.communication.notification.changesRequested.subject': undefined;
  'output.communication.notification.rejected.body': undefined;
  'output.communication.notification.rejected.subject': undefined;
  'output.communication.passwordReset.body': Readonly<{ resetUrl: string }>;
  'output.communication.passwordReset.subject': undefined;
  'output.csv.column.affectedEndDate': undefined;
  'output.csv.column.affectedStartDate': undefined;
  'output.csv.column.availableChangeMinutes': undefined;
  'output.csv.column.balanceMinutes': undefined;
  'output.csv.column.closingAvailableMinutes': undefined;
  'output.csv.column.closingBalanceMinutes': undefined;
  'output.csv.column.creditedMinutes': undefined;
  'output.csv.column.date': undefined;
  'output.csv.column.employeeName': undefined;
  'output.csv.column.expectedMinutes': undefined;
  'output.csv.column.incompleteRecordCount': undefined;
  'output.csv.column.leaveAccount': undefined;
  'output.csv.column.month': undefined;
  'output.csv.column.openingAvailableMinutes': undefined;
  'output.csv.column.openingBalanceMinutes': undefined;
  'output.csv.column.postLockDeltaMinutes': undefined;
  'output.csv.column.projectedRemainingMinutes': undefined;
  'output.csv.column.rangeChangeMinutes': undefined;
  'output.csv.column.reservedMinutes': undefined;
  'output.csv.column.status': undefined;
  'output.csv.column.submittedAt': undefined;
  'output.csv.column.warningCodes': undefined;
  'output.csv.column.workedMinutes': undefined;
  'output.csv.column.workflowCategory': undefined;
  'output.csv.column.workflowStatus': undefined;
  'output.csv.issue.absenceApprovalPending': undefined;
  'output.csv.issue.attendanceIncomplete': undefined;
  'output.csv.issue.attendanceInvalidEventOrder': undefined;
  'output.csv.issue.attendanceInvalidEventPrecision': undefined;
  'output.csv.issue.attendanceOverlap': undefined;
  'output.csv.issue.correctionUnresolved': undefined;
  'output.csv.issue.flexNegativeThresholdExceeded': undefined;
  'output.csv.issue.flexPositiveThresholdExceeded': undefined;
  'output.csv.issue.ledgerSourceMismatch': undefined;
  'output.csv.issue.policyAssignmentOverlap': undefined;
  'output.csv.issue.policyConfigurationInvalid': undefined;
  'output.csv.issue.policyNotAssigned': undefined;
  'output.csv.issue.scheduleAssignmentOverlap': undefined;
  'output.csv.issue.scheduleNotAssigned': undefined;
  'output.csv.issue.workDuringAbsence': undefined;
  'output.csv.issue.workOnHoliday': undefined;
  'output.csv.issue.workOnZeroExpectedDay': undefined;
  'output.csv.status.approvalKind.absence': undefined;
  'output.csv.status.approvalKind.cancellation': undefined;
  'output.csv.status.approvalKind.correction': undefined;
  'output.csv.status.approvalKind.monthlyPeriod': undefined;
  'output.csv.status.record.incomplete': undefined;
  'output.csv.status.workflow.approved': undefined;
  'output.csv.status.workflow.changesRequested': undefined;
  'output.csv.status.workflow.locked': undefined;
  'output.csv.status.workflow.open': undefined;
  'output.csv.status.workflow.submitted': undefined;
  'output.monthlyPrint.adjustedHeading': undefined;
  'output.monthlyPrint.adjustedTotals': Readonly<{
    adjusted: string;
    closing: string;
    delta: string;
  }>;
  'output.monthlyPrint.adjustmentCaption': undefined;
  'output.monthlyPrint.approvedMetadata': Readonly<{ cycle: number; date: string }>;
  'output.monthlyPrint.approvedTotals': Readonly<{
    balance: string;
    closing: string;
    credited: string;
    expected: string;
  }>;
  'output.monthlyPrint.dailyCaption': Readonly<{ employee: string }>;
  'output.monthlyPrint.dateRange': Readonly<{
    employee: string;
    end: string;
    start: string;
    timeZone: string;
  }>;
  'output.monthlyPrint.footer': undefined;
  'output.monthlyPrint.readiness.notReady': undefined;
  'output.monthlyPrint.readiness.ready': undefined;
  'output.monthlyPrint.readiness.workflow': undefined;
  'output.monthlyPrint.statusLine': Readonly<{ readiness: string; status: string }>;
  'output.monthlyPrint.title': undefined;
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
  'shared.route.title.insights': undefined;
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
  'employee.insights.destination.monthlyReview',
  'employee.insights.destination.myBalances',
  'employee.insights.destination.myRequests',
  'employee.insights.destination.myTime',
  'employee.insights.destination.reports',
  'employee.insights.destination.today',
  'employee.insights.context.description',
  'employee.insights.context.heading',
  'employee.insights.context.noPeriod',
  'employee.insights.context.period',
  'employee.insights.context.remove',
  'employee.insights.context.removed',
  'employee.insights.context.source',
  'employee.insights.entry.action',
  'employee.insights.entry.description',
  'employee.insights.entry.heading',
  'employee.insights.interpretation.description',
  'employee.insights.interpretation.error.offline',
  'employee.insights.interpretation.error.rateLimited',
  'employee.insights.interpretation.error.unavailable',
  'employee.insights.interpretation.form.cancel',
  'employee.insights.interpretation.form.clear',
  'employee.insights.interpretation.form.count',
  'employee.insights.interpretation.form.description',
  'employee.insights.interpretation.form.heading',
  'employee.insights.interpretation.form.question',
  'employee.insights.interpretation.form.running',
  'employee.insights.interpretation.form.submit',
  'employee.insights.interpretation.heading',
  'employee.insights.interpretation.limitations',
  'employee.insights.interpretation.optionalLabel',
  'employee.insights.interpretation.question',
  'employee.insights.interpretation.sources',
  'employee.insights.interpretation.status.cancelled',
  'employee.insights.interpretation.status.ready',
  'employee.insights.interpretation.status.running',
  'employee.insights.interpretation.status.viewResult',
  'employee.insights.interpretation.validation.correct',
  'employee.insights.interpretation.validation.required',
  'employee.insights.interpretation.validation.scopeChanged',
  'employee.insights.interpretation.validation.tooLong',
  'employee.insights.error.denied',
  'employee.insights.error.offline',
  'employee.insights.error.returnToday',
  'employee.insights.error.unavailable',
  'employee.insights.fact.balanceChange',
  'employee.insights.fact.balanceClosing',
  'employee.insights.fact.balanceIncompleteDates',
  'employee.insights.fact.balanceOpening',
  'employee.insights.fact.leaveAccountCount',
  'employee.insights.fact.leaveAvailable',
  'employee.insights.fact.leaveProjectedRemaining',
  'employee.insights.fact.leaveProjectionAvailable',
  'employee.insights.fact.leaveReserved',
  'employee.insights.fact.monthEnded',
  'employee.insights.fact.monthlyCompleteDates',
  'employee.insights.fact.monthlyCoveredDates',
  'employee.insights.fact.monthlyReadiness',
  'employee.insights.fact.monthlyWorkflow',
  'employee.insights.fact.postedBalance',
  'employee.insights.fact.submissionBlocker',
  'employee.insights.fact.submissionBlockerCount',
  'employee.insights.fact.submissionBlockersAvailable',
  'employee.insights.fact.todayAbsenceCredit',
  'employee.insights.fact.todayAbsenceExpectedReduction',
  'employee.insights.fact.todayActiveElapsed',
  'employee.insights.fact.todayApprovedCorrection',
  'employee.insights.fact.todayAttendanceState',
  'employee.insights.fact.todayAttention',
  'employee.insights.fact.todayBreak',
  'employee.insights.fact.todayCalculationStatus',
  'employee.insights.fact.todayCredited',
  'employee.insights.fact.todayDifference',
  'employee.insights.fact.todayEstimatedFinish',
  'employee.insights.fact.todayExpected',
  'employee.insights.fact.todayExplanationAvailable',
  'employee.insights.fact.todayHolidayExpectedReduction',
  'employee.insights.fact.todayOtherApprovedAdjustment',
  'employee.insights.fact.todayRemainingExpected',
  'employee.insights.fact.todayScheduled',
  'employee.insights.fact.todayWorked',
  'employee.insights.fact.unrecognized',
  'employee.insights.form.date',
  'employee.insights.form.description',
  'employee.insights.form.from',
  'employee.insights.form.heading',
  'employee.insights.form.kind',
  'employee.insights.form.kindPlaceholder',
  'employee.insights.form.month',
  'employee.insights.form.run',
  'employee.insights.form.running',
  'employee.insights.form.to',
  'employee.insights.kind.balanceChange.description',
  'employee.insights.kind.balanceChange.title',
  'employee.insights.kind.leaveProjection.description',
  'employee.insights.kind.leaveProjection.title',
  'employee.insights.kind.submissionBlockers.description',
  'employee.insights.kind.submissionBlockers.title',
  'employee.insights.kind.todayExplanation.description',
  'employee.insights.kind.todayExplanation.title',
  'employee.insights.limitation.incompleteDatesExcluded',
  'employee.insights.limitation.leaveAccountDetailsLimited',
  'employee.insights.limitation.leaveEntitlementNotAvailable',
  'employee.insights.limitation.monthNotEnded',
  'employee.insights.limitation.monthlyPeriodNotAvailable',
  'employee.insights.limitation.requestedDateNotToday',
  'employee.insights.limitation.submissionBlockerDetailsLimited',
  'employee.insights.limitation.submissionNotAvailable',
  'employee.insights.limitation.todayCalculationIncomplete',
  'employee.insights.limitation.todayTimelineTruncated',
  'employee.insights.limitation.todayValuesProvisional',
  'employee.insights.limitation.unrecognized',
  'employee.insights.page.description',
  'employee.insights.page.eyebrow',
  'employee.insights.period.range',
  'employee.insights.provider.awaitingNative',
  'employee.insights.provider.disabled',
  'employee.insights.provider.heading',
  'employee.insights.provider.unavailable',
  'employee.insights.qualifier.current',
  'employee.insights.qualifier.incomplete',
  'employee.insights.qualifier.posted',
  'employee.insights.qualifier.projected',
  'employee.insights.qualifier.provisional',
  'employee.insights.qualifier.reserved',
  'employee.insights.qualifier.suppressed',
  'employee.insights.qualifier.unavailable',
  'employee.insights.result.actions.heading',
  'employee.insights.result.authoritative',
  'employee.insights.result.capturedAt',
  'employee.insights.result.facts.description',
  'employee.insights.result.facts.heading',
  'employee.insights.result.freshness.calculatedThrough',
  'employee.insights.result.freshness.description',
  'employee.insights.result.freshness.heading',
  'employee.insights.result.freshness.postedThrough',
  'employee.insights.result.limitations.heading',
  'employee.insights.result.limitations.title',
  'employee.insights.result.nativeLabel',
  'employee.insights.result.period',
  'employee.insights.result.scope',
  'employee.insights.result.scopeSelf',
  'employee.insights.result.sourceEvidence',
  'employee.insights.result.sources.description',
  'employee.insights.result.sources.heading',
  'employee.insights.source.dailyTimeRecord',
  'employee.insights.source.leaveEntitlementLedger',
  'employee.insights.source.monthlyPeriod',
  'employee.insights.source.open',
  'employee.insights.source.personalRequest',
  'employee.insights.source.report',
  'employee.insights.source.timeAccountLedger',
  'employee.insights.source.todayAttendance',
  'employee.insights.state.complete',
  'employee.insights.state.incomplete',
  'employee.insights.state.provisional',
  'employee.insights.status.ready',
  'employee.insights.status.running',
  'employee.insights.status.viewResult',
  'employee.insights.trust.description',
  'employee.insights.trust.heading',
  'employee.insights.trust.privacy',
  'employee.insights.validation.correct',
  'employee.insights.validation.date',
  'employee.insights.validation.from',
  'employee.insights.validation.kind',
  'employee.insights.validation.month',
  'employee.insights.validation.range',
  'employee.insights.validation.to',
  'employee.insights.value.no',
  'employee.insights.value.unavailable',
  'employee.insights.value.unrecognizedState',
  'employee.insights.value.yes',
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
  'employee.monthly.print.opened',
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
  'admin.absenceSettings.coverage.fullDay',
  'admin.absenceSettings.coverage.halfDay',
  'admin.absenceSettings.coverage.heading',
  'admin.absenceSettings.coverage.minutes',
  'admin.absenceSettings.empty.description',
  'admin.absenceSettings.empty.title',
  'admin.absenceSettings.entitlement.description',
  'admin.absenceSettings.entitlement.label',
  'admin.absenceSettings.entitlement.reservePending',
  'admin.absenceSettings.entitlement.reservePendingSickness',
  'admin.absenceSettings.entitlement.sicknessReason',
  'admin.absenceSettings.error.configuration',
  'admin.absenceSettings.error.conflict',
  'admin.absenceSettings.error.effectiveDate',
  'admin.absenceSettings.error.generic',
  'admin.absenceSettings.feedback.created',
  'admin.absenceSettings.feedback.errorTitle',
  'admin.absenceSettings.feedback.successTitle',
  'admin.absenceSettings.form.active',
  'admin.absenceSettings.form.description',
  'admin.absenceSettings.form.displayName',
  'admin.absenceSettings.form.effectiveFrom',
  'admin.absenceSettings.form.heading',
  'admin.absenceSettings.form.pending',
  'admin.absenceSettings.form.submit',
  'admin.absenceSettings.form.typeCode',
  'admin.absenceSettings.history.available',
  'admin.absenceSettings.history.coverageOptions',
  'admin.absenceSettings.history.entitlement',
  'admin.absenceSettings.history.heading',
  'admin.absenceSettings.history.historical',
  'admin.absenceSettings.history.inactive',
  'admin.absenceSettings.history.latest',
  'admin.absenceSettings.history.noEntitlement',
  'admin.absenceSettings.history.ongoing',
  'admin.absenceSettings.history.range',
  'admin.absenceSettings.history.versionLabel',
  'admin.absenceSettings.loading.description',
  'admin.absenceSettings.loading.title',
  'admin.absenceSettings.page.description',
  'admin.absenceSettings.page.eyebrow',
  'admin.absenceSettings.requestNote.disabled',
  'admin.absenceSettings.requestNote.label',
  'admin.absenceSettings.requestNote.optional',
  'admin.absenceSettings.requestNote.required',
  'admin.absenceSettings.requestNote.sicknessReason',
  'admin.absenceSettings.timeTreatment.creditCovered',
  'admin.absenceSettings.timeTreatment.label',
  'admin.absenceSettings.timeTreatment.none',
  'admin.absenceSettings.timeTreatment.reduceCovered',
  'admin.absenceSettings.timing.maximumRetrospectiveDays',
  'admin.absenceSettings.timing.maximumRetrospectiveDescription',
  'admin.absenceSettings.timing.minimumLeadDays',
  'admin.absenceSettings.type.other',
  'admin.absenceSettings.type.sickness',
  'admin.absenceSettings.type.unpaid',
  'admin.absenceSettings.type.vacation',
  'admin.absenceSettings.validation.required',
  'admin.absenceSettings.workflow.approvalRequired',
  'admin.absenceSettings.workflow.label',
  'admin.absenceSettings.workflow.reportAndAcknowledge',
  'admin.absenceSettings.workflow.sicknessReason',
  'admin.employee.assignment.changeManager',
  'admin.employee.assignment.changeTeam',
  'admin.employee.assignment.chooseChange',
  'admin.employee.assignment.current',
  'admin.employee.assignment.description',
  'admin.employee.assignment.feedback.errorTitle',
  'admin.employee.assignment.feedback.managerUpdated',
  'admin.employee.assignment.feedback.successTitle',
  'admin.employee.assignment.feedback.teamUpdated',
  'admin.employee.assignment.heading',
  'admin.employee.assignment.historyItem',
  'admin.employee.assignment.inactiveTeam',
  'admin.employee.assignment.managerChange',
  'admin.employee.assignment.managerHistory',
  'admin.employee.assignment.noCurrentManager',
  'admin.employee.assignment.noCurrentTeam',
  'admin.employee.assignment.noHistory',
  'admin.employee.assignment.noManager',
  'admin.employee.assignment.noTeam',
  'admin.employee.assignment.saveManager',
  'admin.employee.assignment.saveTeam',
  'admin.employee.assignment.teamChange',
  'admin.employee.assignment.teamHistory',
  'admin.employee.assignment.validation.manager',
  'admin.employee.assignment.validation.team',
  'admin.employee.common.effectiveFrom',
  'admin.employee.common.historical',
  'admin.employee.common.latest',
  'admin.employee.common.none',
  'admin.employee.common.ongoing',
  'admin.employee.create.feedback.created',
  'admin.employee.create.form.accountEmail',
  'admin.employee.create.form.accountEmailDescription',
  'admin.employee.create.form.cancel',
  'admin.employee.create.form.displayName',
  'admin.employee.create.form.employeeNumber',
  'admin.employee.create.form.employmentStartsOn',
  'admin.employee.create.form.invitationDescription',
  'admin.employee.create.form.invitationLanguage',
  'admin.employee.create.form.pending',
  'admin.employee.create.form.rolesDescription',
  'admin.employee.create.form.rolesHeading',
  'admin.employee.create.form.submit',
  'admin.employee.create.page.description',
  'admin.employee.create.page.eyebrow',
  'admin.employee.create.page.title',
  'admin.employee.create.validation.accountEmail',
  'admin.employee.create.validation.displayName',
  'admin.employee.create.validation.employeeNumber',
  'admin.employee.create.validation.employmentStartsOn',
  'admin.employee.detail.account.email',
  'admin.employee.detail.account.heading',
  'admin.employee.detail.account.invitation',
  'admin.employee.detail.account.invitationPending',
  'admin.employee.detail.account.noInvitation',
  'admin.employee.detail.account.none',
  'admin.employee.detail.account.state',
  'admin.employee.detail.employment.description',
  'admin.employee.detail.employment.heading',
  'admin.employee.detail.feedback.errorTitle',
  'admin.employee.detail.feedback.invitationReissued',
  'admin.employee.detail.feedback.successTitle',
  'admin.employee.detail.feedback.updated',
  'admin.employee.detail.lifecycle.activate',
  'admin.employee.detail.lifecycle.deactivate',
  'admin.employee.detail.lifecycle.endsOn',
  'admin.employee.detail.lifecycle.heading',
  'admin.employee.detail.lifecycle.reinvite',
  'admin.employee.detail.lifecycle.startsOn',
  'admin.employee.detail.loading.description',
  'admin.employee.detail.loading.heading',
  'admin.employee.detail.loading.pageDescription',
  'admin.employee.detail.loading.title',
  'admin.employee.detail.page.active',
  'admin.employee.detail.page.back',
  'admin.employee.detail.page.description',
  'admin.employee.detail.page.eyebrow',
  'admin.employee.detail.page.inactive',
  'admin.employee.detail.range',
  'admin.employee.detail.reviewOnly.description',
  'admin.employee.detail.reviewOnly.title',
  'admin.employee.detail.roles.description',
  'admin.employee.detail.roles.heading',
  'admin.employee.detail.roles.submit',
  'admin.employee.detail.validation.effectiveDate',
  'admin.employee.directory.account.active',
  'admin.employee.directory.account.inactive',
  'admin.employee.directory.account.invitationPending',
  'admin.employee.directory.account.none',
  'admin.employee.directory.column.account',
  'admin.employee.directory.column.action',
  'admin.employee.directory.column.employee',
  'admin.employee.directory.column.employment',
  'admin.employee.directory.column.number',
  'admin.employee.directory.column.roles',
  'admin.employee.directory.employment.noCurrent',
  'admin.employee.directory.employment.since',
  'admin.employee.directory.empty.description',
  'admin.employee.directory.empty.searchDescription',
  'admin.employee.directory.empty.searchTitle',
  'admin.employee.directory.empty.title',
  'admin.employee.directory.loading.description',
  'admin.employee.directory.loading.title',
  'admin.employee.directory.openRecord',
  'admin.employee.directory.openRecordLabel',
  'admin.employee.directory.page.addEmployee',
  'admin.employee.directory.page.description',
  'admin.employee.directory.page.eyebrow',
  'admin.employee.directory.page.manageTeams',
  'admin.employee.directory.pagination.label',
  'admin.employee.directory.pagination.summary',
  'admin.employee.directory.results.caption',
  'admin.employee.directory.results.count',
  'admin.employee.directory.results.scrollHint',
  'admin.employee.directory.results.scrollLabel',
  'admin.employee.directory.search.all',
  'admin.employee.directory.search.clear',
  'admin.employee.directory.search.description',
  'admin.employee.directory.search.label',
  'admin.employee.directory.search.status',
  'admin.employee.directory.search.submit',
  'admin.employee.directory.search.title',
  'admin.employee.directory.validation.search',
  'admin.employee.entitlement.description',
  'admin.employee.entitlement.empty.description',
  'admin.employee.entitlement.empty.entries',
  'admin.employee.entitlement.empty.title',
  'admin.employee.entitlement.entry.effective',
  'admin.employee.entitlement.entry.reason',
  'admin.employee.entitlement.entryType.allocation',
  'admin.employee.entitlement.entryType.approvedDeduction',
  'admin.employee.entitlement.entryType.cancellationRestoration',
  'admin.employee.entitlement.entryType.carryover',
  'admin.employee.entitlement.entryType.expiry',
  'admin.employee.entitlement.entryType.manualAdjustment',
  'admin.employee.entitlement.entryType.pendingReservation',
  'admin.employee.entitlement.entryType.reservationRelease',
  'admin.employee.entitlement.error.conflict',
  'admin.employee.entitlement.error.effectiveDate',
  'admin.employee.entitlement.error.generic',
  'admin.employee.entitlement.feedback.added',
  'admin.employee.entitlement.feedback.errorTitle',
  'admin.employee.entitlement.feedback.successTitle',
  'admin.employee.entitlement.form.account',
  'admin.employee.entitlement.form.chooseAccount',
  'admin.employee.entitlement.form.description',
  'admin.employee.entitlement.form.effectiveOn',
  'admin.employee.entitlement.form.heading',
  'admin.employee.entitlement.form.minutes',
  'admin.employee.entitlement.form.minutesDescription',
  'admin.employee.entitlement.form.pending',
  'admin.employee.entitlement.form.reason',
  'admin.employee.entitlement.form.reasonDescription',
  'admin.employee.entitlement.form.submit',
  'admin.employee.entitlement.form.unavailable',
  'admin.employee.entitlement.heading',
  'admin.employee.entitlement.validation.required',
  'admin.employee.entitlement.value.available',
  'admin.employee.entitlement.value.projected',
  'admin.employee.entitlement.value.reserved',
  'admin.employee.error.accessDenied',
  'admin.employee.error.assignmentConflict',
  'admin.employee.error.assignmentDateInvalid',
  'admin.employee.error.emailExists',
  'admin.employee.error.employeeNumberExists',
  'admin.employee.error.employeeStateConflict',
  'admin.employee.error.employmentOverlap',
  'admin.employee.error.freshSession',
  'admin.employee.error.generic',
  'admin.employee.error.managerCycle',
  'admin.employee.error.managerNotEligible',
  'admin.employee.error.teamNameExists',
  'admin.employee.error.teamStateConflict',
  'admin.employee.policy.current.covered',
  'admin.employee.policy.current.gapsTitle',
  'admin.employee.policy.current.heading',
  'admin.employee.policy.current.none',
  'admin.employee.policy.description',
  'admin.employee.policy.error.effectiveDate',
  'admin.employee.policy.error.employeeState',
  'admin.employee.policy.error.generic',
  'admin.employee.policy.error.notAssigned',
  'admin.employee.policy.error.stateConflict',
  'admin.employee.policy.error.versionConflict',
  'admin.employee.policy.feedback.errorTitle',
  'admin.employee.policy.feedback.successTitle',
  'admin.employee.policy.feedback.updated',
  'admin.employee.policy.form.chooseVersion',
  'admin.employee.policy.form.description',
  'admin.employee.policy.form.heading',
  'admin.employee.policy.form.pending',
  'admin.employee.policy.form.submit',
  'admin.employee.policy.form.unavailable',
  'admin.employee.policy.form.version',
  'admin.employee.policy.heading',
  'admin.employee.policy.history.heading',
  'admin.employee.policy.history.none',
  'admin.employee.policy.option',
  'admin.employee.policy.preview.description',
  'admin.employee.policy.preview.empty',
  'admin.employee.policy.preview.heading',
  'admin.employee.policy.range',
  'admin.employee.policy.summary',
  'admin.employee.policy.validation.effectiveFrom',
  'admin.employee.policy.validation.version',
  'admin.employee.policy.versionLabel',
  'admin.employee.schedule.current.covered',
  'admin.employee.schedule.current.detail',
  'admin.employee.schedule.current.gapsTitle',
  'admin.employee.schedule.current.heading',
  'admin.employee.schedule.current.none',
  'admin.employee.schedule.description',
  'admin.employee.schedule.error.effectiveDate',
  'admin.employee.schedule.error.employeeState',
  'admin.employee.schedule.error.generic',
  'admin.employee.schedule.error.notAssigned',
  'admin.employee.schedule.error.stateConflict',
  'admin.employee.schedule.error.versionConflict',
  'admin.employee.schedule.feedback.errorTitle',
  'admin.employee.schedule.feedback.successTitle',
  'admin.employee.schedule.feedback.updated',
  'admin.employee.schedule.form.chooseVersion',
  'admin.employee.schedule.form.description',
  'admin.employee.schedule.form.heading',
  'admin.employee.schedule.form.pending',
  'admin.employee.schedule.form.submit',
  'admin.employee.schedule.form.unavailable',
  'admin.employee.schedule.form.version',
  'admin.employee.schedule.heading',
  'admin.employee.schedule.history.heading',
  'admin.employee.schedule.history.item',
  'admin.employee.schedule.history.none',
  'admin.employee.schedule.option',
  'admin.employee.schedule.range',
  'admin.employee.schedule.validation.effectiveFrom',
  'admin.employee.schedule.validation.version',
  'admin.employee.schedule.versionLabel',
  'admin.holidaySettings.empty.description',
  'admin.holidaySettings.empty.title',
  'admin.holidaySettings.error.accessDenied',
  'admin.holidaySettings.error.blocked',
  'admin.holidaySettings.error.conflict',
  'admin.holidaySettings.error.generic',
  'admin.holidaySettings.feedback.created',
  'admin.holidaySettings.feedback.errorTitle',
  'admin.holidaySettings.feedback.successTitle',
  'admin.holidaySettings.form.createPending',
  'admin.holidaySettings.form.date',
  'admin.holidaySettings.form.description',
  'admin.holidaySettings.form.heading',
  'admin.holidaySettings.form.name',
  'admin.holidaySettings.form.preview',
  'admin.holidaySettings.form.previewPending',
  'admin.holidaySettings.form.submit',
  'admin.holidaySettings.list.heading',
  'admin.holidaySettings.loading.description',
  'admin.holidaySettings.loading.title',
  'admin.holidaySettings.page.description',
  'admin.holidaySettings.page.eyebrow',
  'admin.holidaySettings.preview.allowed',
  'admin.holidaySettings.preview.blocked',
  'admin.holidaySettings.preview.heading',
  'admin.holidaySettings.preview.summary',
  'admin.holidaySettings.validation.required',
  'admin.insights.destination.monthlyTimeReport',
  'admin.insights.error.denied',
  'admin.insights.error.invalidMonth',
  'admin.insights.fact.approvedEmployees',
  'admin.insights.fact.changesRequestedEmployees',
  'admin.insights.fact.coverageCases',
  'admin.insights.fact.coveredEmployeeDays',
  'admin.insights.fact.coveredEmployees',
  'admin.insights.fact.coveredScheduledMinutes',
  'admin.insights.fact.eligibleEmployees',
  'admin.insights.fact.incompleteEmployeeDays',
  'admin.insights.fact.lockedEmployees',
  'admin.insights.fact.openEmployees',
  'admin.insights.fact.submittedEmployees',
  'admin.insights.form.description',
  'admin.insights.form.heading',
  'admin.insights.kind.absenceCoverage.description',
  'admin.insights.kind.absenceCoverage.title',
  'admin.insights.kind.closureReadiness.description',
  'admin.insights.kind.closureReadiness.title',
  'admin.insights.page.description',
  'admin.insights.page.eyebrow',
  'admin.insights.privacy.description',
  'admin.insights.privacy.heading',
  'admin.insights.scope.organizationAggregate',
  'admin.insights.source.monthlyTimeReport',
  'admin.insights.status.suppressed',
  'admin.insights.suppressed.description',
  'admin.insights.suppressed.heading',
  'admin.insights.validation.correct',
  'admin.insights.validation.month',
  'admin.team.action.activate',
  'admin.team.action.blocked',
  'admin.team.action.deactivate',
  'admin.team.column.action',
  'admin.team.column.members',
  'admin.team.column.status',
  'admin.team.column.team',
  'admin.team.empty.description',
  'admin.team.empty.title',
  'admin.team.error.accessDenied',
  'admin.team.error.generic',
  'admin.team.error.nameExists',
  'admin.team.error.stateConflict',
  'admin.team.feedback.errorTitle',
  'admin.team.feedback.successTitle',
  'admin.team.feedback.updated',
  'admin.team.filter.all',
  'admin.team.filter.apply',
  'admin.team.filter.description',
  'admin.team.filter.status',
  'admin.team.filter.title',
  'admin.team.form.description',
  'admin.team.form.heading',
  'admin.team.form.name',
  'admin.team.form.nameDescription',
  'admin.team.form.pending',
  'admin.team.form.submit',
  'admin.team.loading.description',
  'admin.team.loading.title',
  'admin.team.page.create',
  'admin.team.page.description',
  'admin.team.page.employeeDirectory',
  'admin.team.page.eyebrow',
  'admin.team.pagination.label',
  'admin.team.pagination.summary',
  'admin.team.results.caption',
  'admin.team.results.count',
  'admin.team.results.members',
  'admin.team.results.scrollHint',
  'admin.team.results.scrollLabel',
  'admin.team.status.active',
  'admin.team.status.inactive',
  'admin.team.validation.name',
  'admin.timeSettings.common.historical',
  'admin.timeSettings.common.latest',
  'admin.timeSettings.loading.title',
  'admin.timeSettings.page.description',
  'admin.timeSettings.page.eyebrow',
  'admin.timeSettings.policy.description',
  'admin.timeSettings.policy.empty.description',
  'admin.timeSettings.policy.empty.title',
  'admin.timeSettings.policy.error.conflict',
  'admin.timeSettings.policy.error.generic',
  'admin.timeSettings.policy.error.noChange',
  'admin.timeSettings.policy.feedback.created',
  'admin.timeSettings.policy.feedback.errorTitle',
  'admin.timeSettings.policy.feedback.successTitle',
  'admin.timeSettings.policy.heading',
  'admin.timeSettings.policy.name',
  'admin.timeSettings.policy.pending',
  'admin.timeSettings.policy.preview',
  'admin.timeSettings.policy.submit',
  'admin.timeSettings.policy.summary',
  'admin.timeSettings.policy.threshold',
  'admin.timeSettings.policy.thresholdDescription',
  'admin.timeSettings.policy.thresholdValue',
  'admin.timeSettings.policy.validation.name',
  'admin.timeSettings.policy.validation.threshold',
  'admin.timeSettings.policy.versionLabel',
  'admin.timeSettings.schedule.description',
  'admin.timeSettings.schedule.empty.description',
  'admin.timeSettings.schedule.empty.title',
  'admin.timeSettings.schedule.error.conflict',
  'admin.timeSettings.schedule.error.generic',
  'admin.timeSettings.schedule.error.noChange',
  'admin.timeSettings.schedule.feedback.created',
  'admin.timeSettings.schedule.feedback.successTitle',
  'admin.timeSettings.schedule.heading',
  'admin.timeSettings.schedule.history.description',
  'admin.timeSettings.schedule.history.heading',
  'admin.timeSettings.schedule.loadingDescription',
  'admin.timeSettings.schedule.name',
  'admin.timeSettings.schedule.nameDescription',
  'admin.timeSettings.schedule.pending',
  'admin.timeSettings.schedule.perWeek',
  'admin.timeSettings.schedule.submit',
  'admin.timeSettings.schedule.total',
  'admin.timeSettings.schedule.validation.name',
  'admin.timeSettings.schedule.validation.weekdayMinutes',
  'admin.timeSettings.schedule.versionLabel',
  'admin.timeSettings.schedule.weekdayHeading',
  'admin.timeSettings.schedule.weekdayLabel',
  'admin.timeSettings.weekday.friday',
  'admin.timeSettings.weekday.monday',
  'admin.timeSettings.weekday.saturday',
  'admin.timeSettings.weekday.sunday',
  'admin.timeSettings.weekday.thursday',
  'admin.timeSettings.weekday.tuesday',
  'admin.timeSettings.weekday.wednesday',
  'manager.insights.error.denied',
  'manager.insights.fact.actionRequired',
  'manager.insights.fact.available',
  'manager.insights.fact.offWork',
  'manager.insights.fact.onBreak',
  'manager.insights.fact.teamMembers',
  'manager.insights.fact.unavailable',
  'manager.insights.fact.unresolvedRecords',
  'manager.insights.fact.working',
  'manager.insights.form.description',
  'manager.insights.form.heading',
  'manager.insights.kind.actionSummary.description',
  'manager.insights.kind.actionSummary.title',
  'manager.insights.kind.teamCoverage.description',
  'manager.insights.kind.teamCoverage.title',
  'manager.insights.limitation.currentDateOnly',
  'manager.insights.page.description',
  'manager.insights.page.eyebrow',
  'manager.insights.scope.currentReports',
  'manager.approval.common.status.actionRequired',
  'manager.approval.common.status.allRecords',
  'manager.approval.common.status.completed',
  'manager.approval.common.status.waitingOnEmployee',
  'manager.approval.common.workflow.absenceCancellation',
  'manager.approval.common.workflow.absenceRequest',
  'manager.approval.common.workflow.correction',
  'manager.approval.common.workflow.monthlyPeriod',
  'manager.approval.detail.action.acknowledge',
  'manager.approval.detail.action.approve',
  'manager.approval.detail.action.approveCorrection',
  'manager.approval.detail.action.backToInbox',
  'manager.approval.detail.action.reject',
  'manager.approval.detail.action.requestChanges',
  'manager.approval.detail.apply.action',
  'manager.approval.detail.apply.description.postLock',
  'manager.approval.detail.apply.description.unlocked',
  'manager.approval.detail.apply.heading',
  'manager.approval.detail.apply.pending',
  'manager.approval.detail.decision.description',
  'manager.approval.detail.decision.heading',
  'manager.approval.detail.decision.overrideDescription',
  'manager.approval.detail.decision.overrideTitle',
  'manager.approval.detail.decision.pending',
  'manager.approval.detail.decision.reasonHelp',
  'manager.approval.detail.decision.reasonLabel',
  'manager.approval.detail.empty.description',
  'manager.approval.detail.empty.title',
  'manager.approval.detail.error.accessDenied',
  'manager.approval.detail.error.adjustmentRequired',
  'manager.approval.detail.error.deniedDescription',
  'manager.approval.detail.error.deniedStateDescription',
  'manager.approval.detail.error.deniedStateTitle',
  'manager.approval.detail.error.description',
  'manager.approval.detail.error.insufficientBalance',
  'manager.approval.detail.error.recording',
  'manager.approval.detail.error.stateConflict',
  'manager.approval.detail.error.stateDescription',
  'manager.approval.detail.error.title',
  'manager.approval.detail.evidence.description',
  'manager.approval.detail.evidence.empty',
  'manager.approval.detail.evidence.eyebrow',
  'manager.approval.detail.evidence.heading',
  'manager.approval.detail.feedback.correctionApplied',
  'manager.approval.detail.feedback.decisionRecorded',
  'manager.approval.detail.feedback.errorTitle',
  'manager.approval.detail.feedback.postLockApproved',
  'manager.approval.detail.feedback.successTitle',
  'manager.approval.detail.loading.description',
  'manager.approval.detail.loading.pageDescription',
  'manager.approval.detail.loading.pageTitle',
  'manager.approval.detail.loading.title',
  'manager.approval.detail.page.description',
  'manager.approval.detail.page.eyebrow',
  'manager.approval.detail.page.title',
  'manager.approval.detail.summary.absenceType',
  'manager.approval.detail.summary.coverage.caption',
  'manager.approval.detail.summary.coverage.date',
  'manager.approval.detail.summary.coverage.kind',
  'manager.approval.detail.summary.coverage.minutes',
  'manager.approval.detail.summary.coverage.scrollHint',
  'manager.approval.detail.summary.coverage.scrollLabel',
  'manager.approval.detail.summary.dateRange',
  'manager.approval.detail.summary.effect',
  'manager.approval.detail.summary.effectPostLock',
  'manager.approval.detail.summary.effectUnlocked',
  'manager.approval.detail.summary.employeeReason',
  'manager.approval.detail.summary.entitlement',
  'manager.approval.detail.summary.entitlementValue',
  'manager.approval.detail.summary.originalBalance',
  'manager.approval.detail.summary.originalCalculation',
  'manager.approval.detail.summary.originalCredited',
  'manager.approval.detail.summary.originalWorked',
  'manager.approval.detail.summary.proposedInterval',
  'manager.approval.detail.summary.submitted',
  'manager.approval.detail.summary.workflow',
  'manager.approval.detail.validation.confirmOverride',
  'manager.approval.detail.validation.hrOverrideOnly',
  'manager.approval.detail.validation.reason',
  'manager.approval.detail.workflow.absenceCancellation',
  'manager.approval.detail.workflow.absenceRequest',
  'manager.approval.detail.workflow.correctionRequest',
  'manager.approval.inbox.action.ariaLabel',
  'manager.approval.inbox.action.review',
  'manager.approval.inbox.action.reviewAndDecide',
  'manager.approval.inbox.action.reviewRecord',
  'manager.approval.inbox.action.wait',
  'manager.approval.inbox.applied.dateRange',
  'manager.approval.inbox.applied.label',
  'manager.approval.inbox.applied.reset',
  'manager.approval.inbox.column.action',
  'manager.approval.inbox.column.affectedDates',
  'manager.approval.inbox.column.employee',
  'manager.approval.inbox.column.status',
  'manager.approval.inbox.column.submitted',
  'manager.approval.inbox.column.workflow',
  'manager.approval.inbox.empty.defaultDescription',
  'manager.approval.inbox.empty.defaultTitle',
  'manager.approval.inbox.empty.filteredDescription',
  'manager.approval.inbox.empty.filteredTitle',
  'manager.approval.inbox.error.deniedDescription',
  'manager.approval.inbox.error.deniedTitle',
  'manager.approval.inbox.error.requestReference',
  'manager.approval.inbox.error.unavailableDescription',
  'manager.approval.inbox.error.unavailableTitle',
  'manager.approval.inbox.filter.anyAffectedDate',
  'manager.approval.inbox.filter.apply',
  'manager.approval.inbox.filter.ariaLabel',
  'manager.approval.inbox.filter.category.all',
  'manager.approval.inbox.filter.category.label',
  'manager.approval.inbox.filter.error',
  'manager.approval.inbox.filter.errorTitle',
  'manager.approval.inbox.filter.from',
  'manager.approval.inbox.filter.hide',
  'manager.approval.inbox.filter.order.earliestAffected',
  'manager.approval.inbox.filter.order.employeeAscending',
  'manager.approval.inbox.filter.order.employeeDescending',
  'manager.approval.inbox.filter.order.label',
  'manager.approval.inbox.filter.order.latestAffected',
  'manager.approval.inbox.filter.order.newestSubmitted',
  'manager.approval.inbox.filter.order.oldestSubmitted',
  'manager.approval.inbox.filter.show',
  'manager.approval.inbox.filter.team.all',
  'manager.approval.inbox.filter.team.allCurrent',
  'manager.approval.inbox.filter.team.label',
  'manager.approval.inbox.filter.team.selected',
  'manager.approval.inbox.filter.to',
  'manager.approval.inbox.loading.description',
  'manager.approval.inbox.loading.title',
  'manager.approval.inbox.page.description',
  'manager.approval.inbox.page.eyebrow',
  'manager.approval.inbox.pagination.label',
  'manager.approval.inbox.pagination.none',
  'manager.approval.inbox.pagination.summary',
  'manager.approval.inbox.permission.description',
  'manager.approval.inbox.permission.eyebrow',
  'manager.approval.inbox.queue.label',
  'manager.approval.inbox.queue.needsReview',
  'manager.approval.inbox.queue.viewLabel',
  'manager.approval.inbox.results.caption',
  'manager.approval.inbox.results.clearFilters',
  'manager.approval.inbox.results.listLabel',
  'manager.approval.inbox.results.refreshing',
  'manager.approval.inbox.results.statusLabel',
  'manager.approval.inbox.results.tableLabel',
  'manager.approval.inbox.team.none',
  'manager.report.catalog.flexibleTime.description',
  'manager.report.catalog.flexibleTime.title',
  'manager.report.catalog.leave.description',
  'manager.report.catalog.leave.title',
  'manager.report.catalog.missingRecords.description',
  'manager.report.catalog.missingRecords.title',
  'manager.report.catalog.monthlyTime.description',
  'manager.report.catalog.monthlyTime.title',
  'manager.report.catalog.pendingApprovals.description',
  'manager.report.catalog.pendingApprovals.title',
  'manager.report.common.scope.currentDirectReports',
  'manager.report.common.scope.organization',
  'manager.report.common.scope.self',
  'manager.report.common.scope.selfAndDirectReports',
  'manager.report.common.sort.date',
  'manager.report.common.sort.employee',
  'manager.report.common.sort.status',
  'manager.report.common.sort.value',
  'manager.report.detail.action.back',
  'manager.report.detail.action.return',
  'manager.report.detail.action.review',
  'manager.report.detail.column.action',
  'manager.report.detail.column.affectedDates',
  'manager.report.detail.column.closing',
  'manager.report.detail.column.employee',
  'manager.report.detail.column.incomplete',
  'manager.report.detail.column.leaveAccount',
  'manager.report.detail.column.month',
  'manager.report.detail.column.opening',
  'manager.report.detail.column.projected',
  'manager.report.detail.column.status',
  'manager.report.detail.column.submitted',
  'manager.report.detail.column.warnings',
  'manager.report.detail.column.workflow',
  'manager.report.detail.empty.description',
  'manager.report.detail.empty.title',
  'manager.report.detail.error.deniedDescription',
  'manager.report.detail.error.deniedTitle',
  'manager.report.detail.error.refreshNoData',
  'manager.report.detail.error.unavailableDescription',
  'manager.report.detail.error.unavailableTitle',
  'manager.report.detail.filter.applied.employee',
  'manager.report.detail.filter.applied.summary',
  'manager.report.detail.filter.applied.through',
  'manager.report.detail.filter.apply',
  'manager.report.detail.filter.direction.ascending',
  'manager.report.detail.filter.direction.descending',
  'manager.report.detail.filter.direction.label',
  'manager.report.detail.filter.error',
  'manager.report.detail.filter.from',
  'manager.report.detail.filter.heading',
  'manager.report.detail.filter.reset',
  'manager.report.detail.filter.sort',
  'manager.report.detail.filter.to',
  'manager.report.detail.loading.description',
  'manager.report.detail.loading.title',
  'manager.report.detail.missingRecords.noWarningCode',
  'manager.report.detail.page.eyebrow',
  'manager.report.detail.pagination.label',
  'manager.report.detail.pagination.summary',
  'manager.report.detail.partial.description',
  'manager.report.detail.partial.title',
  'manager.report.detail.results.generated',
  'manager.report.detail.results.heading',
  'manager.report.detail.results.refreshing',
  'manager.report.detail.results.summary',
  'manager.report.detail.summary.actionableApprovals',
  'manager.report.detail.summary.availableChange',
  'manager.report.detail.summary.balance',
  'manager.report.detail.summary.closingAvailable',
  'manager.report.detail.summary.closingBalance',
  'manager.report.detail.summary.credited',
  'manager.report.detail.summary.expected',
  'manager.report.detail.summary.incompleteRecords',
  'manager.report.detail.summary.openingAvailable',
  'manager.report.detail.summary.openingBalance',
  'manager.report.detail.summary.postLockChange',
  'manager.report.detail.summary.projectedRemaining',
  'manager.report.detail.summary.rangeChange',
  'manager.report.detail.summary.reserved',
  'manager.report.detail.summary.worked',
  'manager.report.detail.table.caption',
  'manager.report.detail.table.scrollHint',
  'manager.report.detail.table.scrollLabel',
  'manager.report.page.available.description',
  'manager.report.page.available.heading',
  'manager.report.page.description',
  'manager.report.page.error.title',
  'manager.report.page.eyebrow',
  'manager.report.page.loading.description',
  'manager.report.page.loading.title',
  'manager.report.page.open',
  'manager.report.portability.action.copy',
  'manager.report.portability.action.copyPending',
  'manager.report.portability.action.csvLabel',
  'manager.report.portability.action.export',
  'manager.report.portability.action.exportPending',
  'manager.report.portability.action.summaryCopyLabel',
  'manager.report.portability.description.copy',
  'manager.report.portability.description.csv',
  'manager.report.portability.error.accessDenied',
  'manager.report.portability.error.clipboardUnavailable',
  'manager.report.portability.error.failed',
  'manager.report.portability.error.sessionEnded',
  'manager.report.portability.error.tooLarge',
  'manager.report.portability.fields.flexibleTime',
  'manager.report.portability.fields.leave',
  'manager.report.portability.fields.missingRecords',
  'manager.report.portability.fields.monthlyTime',
  'manager.report.portability.fields.pendingApprovals',
  'manager.report.portability.heading',
  'manager.report.portability.status.copySuccess',
  'manager.report.portability.status.exportSuccess',
  'manager.report.portability.status.label',
  'manager.team.calendar.agenda.label',
  'manager.team.calendar.agenda.selectDate',
  'manager.team.calendar.byDate',
  'manager.team.calendar.coverage.firstHalf',
  'manager.team.calendar.coverage.fullDay',
  'manager.team.calendar.coverage.secondHalf',
  'manager.team.calendar.empty.dateDescription',
  'manager.team.calendar.empty.monthDescription',
  'manager.team.calendar.empty.monthTitle',
  'manager.team.calendar.entry.summary',
  'manager.team.calendar.entry.team',
  'manager.team.calendar.entry.teamMissing',
  'manager.team.calendar.error.description',
  'manager.team.calendar.error.title',
  'manager.team.calendar.grid.caption',
  'manager.team.calendar.grid.scrollHint',
  'manager.team.calendar.grid.scrollLabel',
  'manager.team.calendar.grid.selectDate',
  'manager.team.calendar.loading.description',
  'manager.team.calendar.loading.title',
  'manager.team.calendar.marker.selected',
  'manager.team.calendar.marker.today',
  'manager.team.calendar.missingTeam.description',
  'manager.team.calendar.missingTeam.title',
  'manager.team.calendar.navigation.label',
  'manager.team.calendar.navigation.next',
  'manager.team.calendar.navigation.previous',
  'manager.team.calendar.page.description',
  'manager.team.calendar.page.eyebrow',
  'manager.team.calendar.permission.description',
  'manager.team.calendar.permission.eyebrow',
  'manager.team.calendar.scopeAsOf',
  'manager.team.calendar.selectedDate',
  'manager.team.calendar.selectedMonth',
  'manager.team.calendar.todaySuffix',
  'manager.team.calendar.unavailableCount',
  'manager.team.calendar.view.agenda',
  'manager.team.calendar.view.label',
  'manager.team.calendar.view.month',
  'manager.team.calendar.weekday.friday',
  'manager.team.calendar.weekday.monday',
  'manager.team.calendar.weekday.saturday',
  'manager.team.calendar.weekday.sunday',
  'manager.team.calendar.weekday.thursday',
  'manager.team.calendar.weekday.tuesday',
  'manager.team.calendar.weekday.wednesday',
  'manager.team.status.action.none',
  'manager.team.status.action.openInbox',
  'manager.team.status.action.openInboxLabel',
  'manager.team.status.action.viewCalendar',
  'manager.team.status.action.viewCalendarLabel',
  'manager.team.status.availability.offWork',
  'manager.team.status.availability.onBreak',
  'manager.team.status.availability.unavailable',
  'manager.team.status.availability.working',
  'manager.team.status.column.availability',
  'manager.team.status.column.currentTeam',
  'manager.team.status.column.employee',
  'manager.team.status.column.nextStep',
  'manager.team.status.column.recordState',
  'manager.team.status.empty.filteredDescription',
  'manager.team.status.empty.filteredTitle',
  'manager.team.status.empty.noReportsDescription',
  'manager.team.status.empty.noReportsTitle',
  'manager.team.status.error.description',
  'manager.team.status.error.title',
  'manager.team.status.filter.allAvailability',
  'manager.team.status.filter.allDirectReports',
  'manager.team.status.filter.description',
  'manager.team.status.filter.heading',
  'manager.team.status.filter.openRecords',
  'manager.team.status.filter.option',
  'manager.team.status.filter.recordLabel',
  'manager.team.status.filter.withOpenRecords',
  'manager.team.status.loading.description',
  'manager.team.status.loading.title',
  'manager.team.status.members.currentCount',
  'manager.team.status.members.filteredCount',
  'manager.team.status.members.heading',
  'manager.team.status.members.showAll',
  'manager.team.status.page.description',
  'manager.team.status.page.eyebrow',
  'manager.team.status.page.shortcuts',
  'manager.team.status.permission.description',
  'manager.team.status.permission.eyebrow',
  'manager.team.status.results.caption',
  'manager.team.status.results.currentTeam',
  'manager.team.status.results.listLabel',
  'manager.team.status.results.noOpenRecords',
  'manager.team.status.results.noTeam',
  'manager.team.status.results.openRecords',
  'manager.team.status.results.records',
  'manager.team.status.results.tableLabel',
  'manager.team.status.summary.asOf',
  'manager.team.status.summary.current',
  'manager.team.status.summary.heading',
  'manager.team.status.summary.refreshLabel',
  'manager.team.status.summary.refreshing',
  'system.accounts.action.activateAccount',
  'system.accounts.action.assignSystemRole',
  'system.accounts.action.deactivateAccount',
  'system.accounts.action.revokeSystemRole',
  'system.accounts.create.accountEmail',
  'system.accounts.create.accountName',
  'system.accounts.create.action',
  'system.accounts.create.description',
  'system.accounts.create.heading',
  'system.accounts.create.invitationDescription',
  'system.accounts.create.invitationLanguage',
  'system.accounts.create.pending',
  'system.accounts.directory.activeAccount',
  'system.accounts.directory.activeSessions',
  'system.accounts.directory.currentAccount',
  'system.accounts.directory.description',
  'system.accounts.directory.employeeLinked',
  'system.accounts.directory.heading',
  'system.accounts.directory.inactiveAccount',
  'system.accounts.directory.invitationPending',
  'system.accounts.directory.lastActive',
  'system.accounts.directory.noActiveSessions',
  'system.accounts.directory.noSystemRole',
  'system.accounts.directory.stateAndAuthority',
  'system.accounts.directory.technicalOnly',
  'system.accounts.empty.description',
  'system.accounts.empty.title',
  'system.accounts.error.accessDenied',
  'system.accounts.error.emailExists',
  'system.accounts.error.freshSession',
  'system.accounts.error.generic',
  'system.accounts.error.stateConflict',
  'system.accounts.feedback.created',
  'system.accounts.feedback.title',
  'system.accounts.feedback.updated',
  'system.accounts.loading.description',
  'system.accounts.loading.title',
  'system.accounts.page.description',
  'system.accounts.page.eyebrow',
  'system.accounts.validation.accountEmail',
  'system.accounts.validation.accountName',
  'system.audit.domain.page.caption',
  'system.audit.domain.page.description',
  'system.audit.domain.page.eyebrow',
  'system.audit.domain.page.filterDescription',
  'system.audit.domain.page.filterTitle',
  'system.audit.domain.page.resultsTitle',
  'system.audit.domain.page.scrollLabel',
  'system.audit.explorer.actor.account',
  'system.audit.explorer.actor.systemProcess',
  'system.audit.explorer.actor.unknown',
  'system.audit.explorer.boolean.no',
  'system.audit.explorer.boolean.yes',
  'system.audit.explorer.detail.actor',
  'system.audit.explorer.detail.privileged',
  'system.audit.explorer.detail.reasonCode',
  'system.audit.explorer.detail.safeFacts',
  'system.audit.explorer.detail.summary',
  'system.audit.explorer.detail.targetReference',
  'system.audit.explorer.empty.description',
  'system.audit.explorer.empty.title',
  'system.audit.explorer.fact.attendanceRevision',
  'system.audit.explorer.fact.authenticationMethod',
  'system.audit.explorer.fact.changedRole',
  'system.audit.explorer.fact.effectiveDate',
  'system.audit.explorer.fact.eventCount',
  'system.audit.explorer.fact.failureCategory',
  'system.audit.explorer.fact.httpStatus',
  'system.audit.explorer.fact.minutes',
  'system.audit.explorer.fact.nextStatus',
  'system.audit.explorer.fact.previousStatus',
  'system.audit.explorer.fact.scope',
  'system.audit.explorer.fact.sessionReference',
  'system.audit.explorer.fact.sourceCount',
  'system.audit.explorer.fact.version',
  'system.audit.explorer.filter.action',
  'system.audit.explorer.filter.from',
  'system.audit.explorer.filter.outcome',
  'system.audit.explorer.filter.outcomeAll',
  'system.audit.explorer.filter.target',
  'system.audit.explorer.filter.targetAll',
  'system.audit.explorer.filter.to',
  'system.audit.explorer.loading.description',
  'system.audit.explorer.loading.inline',
  'system.audit.explorer.loading.title',
  'system.audit.explorer.outcome.denied',
  'system.audit.explorer.outcome.failure',
  'system.audit.explorer.outcome.success',
  'system.audit.explorer.pagination.label',
  'system.audit.explorer.pagination.summary',
  'system.audit.explorer.results.count',
  'system.audit.explorer.table.column.action',
  'system.audit.explorer.table.column.detail',
  'system.audit.explorer.table.column.occurred',
  'system.audit.explorer.table.column.outcome',
  'system.audit.explorer.table.column.target',
  'system.audit.explorer.table.scrollHint',
  'system.audit.explorer.target.absenceRequest',
  'system.audit.explorer.target.account',
  'system.audit.explorer.target.assignment',
  'system.audit.explorer.target.attendance',
  'system.audit.explorer.target.authentication',
  'system.audit.explorer.target.authorization',
  'system.audit.explorer.target.backup',
  'system.audit.explorer.target.configuration',
  'system.audit.explorer.target.correctionRequest',
  'system.audit.explorer.target.employee',
  'system.audit.explorer.target.export',
  'system.audit.explorer.target.invitation',
  'system.audit.explorer.target.leaveEntitlement',
  'system.audit.explorer.target.monthlyPeriod',
  'system.audit.explorer.target.notificationDelivery',
  'system.audit.explorer.target.operations',
  'system.audit.explorer.target.recovery',
  'system.audit.explorer.target.secret',
  'system.audit.explorer.target.session',
  'system.audit.explorer.target.team',
  'system.audit.explorer.target.timeAccount',
  'system.audit.technical.page.caption',
  'system.audit.technical.page.description',
  'system.audit.technical.page.eyebrow',
  'system.audit.technical.page.filterDescription',
  'system.audit.technical.page.filterTitle',
  'system.audit.technical.page.resultsTitle',
  'system.audit.technical.page.scrollLabel',
  'system.insights.action.openOperations',
  'system.insights.error.denied',
  'system.insights.error.heading',
  'system.insights.error.unavailable',
  'system.insights.fact.applicationVersion',
  'system.insights.fact.backupManagement',
  'system.insights.fact.databaseHealth',
  'system.insights.fact.expectedSchemaStatus',
  'system.insights.fact.mailDeliveryConfiguration',
  'system.insights.fact.persistentRememberMe',
  'system.insights.fact.serviceHealth',
  'system.insights.fact.sessionAbsoluteTimeout',
  'system.insights.fact.sessionFreshWindow',
  'system.insights.fact.sessionIdleTimeout',
  'system.insights.form.description',
  'system.insights.form.heading',
  'system.insights.form.run',
  'system.insights.form.running',
  'system.insights.group.operations',
  'system.insights.group.readiness',
  'system.insights.group.service',
  'system.insights.group.sessionPolicy',
  'system.insights.limitation.backup.description',
  'system.insights.limitation.backup.heading',
  'system.insights.page.description',
  'system.insights.page.eyebrow',
  'system.insights.result.capturedAt',
  'system.insights.result.heading',
  'system.insights.source.applicationManifest',
  'system.insights.source.authenticationProfile',
  'system.insights.source.databaseReadiness',
  'system.insights.source.hostOperatorProcedures',
  'system.insights.source.mailAdapterConfiguration',
  'system.insights.sources.description',
  'system.insights.sources.heading',
  'system.insights.status.ready',
  'system.insights.status.running',
  'system.insights.value.configured',
  'system.insights.value.disabled',
  'system.insights.value.hostOperatorManaged',
  'system.insights.value.minutes',
  'system.insights.value.notConfigured',
  'system.insights.value.notReady',
  'system.insights.value.ready',
  'system.operations.alert.criticalTitle',
  'system.operations.alert.degradedTitle',
  'system.operations.alert.description',
  'system.operations.dependencies.authentication.heading',
  'system.operations.dependencies.database.heading',
  'system.operations.dependencies.error',
  'system.operations.dependencies.heading',
  'system.operations.dependencies.latency',
  'system.operations.dependencies.latencyValue',
  'system.operations.dependencies.status',
  'system.operations.deployment.description',
  'system.operations.deployment.documentation',
  'system.operations.deployment.heading',
  'system.operations.health.critical',
  'system.operations.health.degraded',
  'system.operations.health.healthy',
  'system.operations.health.unavailable',
  'system.operations.loading.description',
  'system.operations.loading.title',
  'system.operations.page.description',
  'system.operations.page.eyebrow',
  'system.operations.status.environment',
  'system.operations.status.heading',
  'system.operations.status.overallHealth',
  'system.operations.status.service',
  'system.operations.status.timestamp',
  'system.operations.status.version',
  'output.clipboard.report.line.actionableApprovals',
  'output.clipboard.report.line.availableChange',
  'output.clipboard.report.line.balance',
  'output.clipboard.report.line.closingAvailable',
  'output.clipboard.report.line.closingBalance',
  'output.clipboard.report.line.credited',
  'output.clipboard.report.line.dateRange',
  'output.clipboard.report.line.expected',
  'output.clipboard.report.line.incompleteRecords',
  'output.clipboard.report.line.matchingRows',
  'output.clipboard.report.line.openingAvailable',
  'output.clipboard.report.line.openingBalance',
  'output.clipboard.report.line.postLockChange',
  'output.clipboard.report.line.projectedRemaining',
  'output.clipboard.report.line.rangeChange',
  'output.clipboard.report.line.reserved',
  'output.clipboard.report.line.scope',
  'output.clipboard.report.line.worked',
  'output.clipboard.report.scope.currentDirectReports',
  'output.clipboard.report.scope.organisation',
  'output.clipboard.report.scope.self',
  'output.clipboard.report.scope.selfAndDirectReports',
  'output.clipboard.report.title.flexibleTime',
  'output.clipboard.report.title.leave',
  'output.clipboard.report.title.missingRecords',
  'output.clipboard.report.title.monthlyTime',
  'output.clipboard.report.title.pendingApprovals',
  'output.communication.invitation.body',
  'output.communication.invitation.subject',
  'output.communication.notification.acknowledged.body',
  'output.communication.notification.acknowledged.subject',
  'output.communication.notification.approved.body',
  'output.communication.notification.approved.subject',
  'output.communication.notification.changesRequested.body',
  'output.communication.notification.changesRequested.subject',
  'output.communication.notification.rejected.body',
  'output.communication.notification.rejected.subject',
  'output.communication.passwordReset.body',
  'output.communication.passwordReset.subject',
  'output.csv.column.affectedEndDate',
  'output.csv.column.affectedStartDate',
  'output.csv.column.availableChangeMinutes',
  'output.csv.column.balanceMinutes',
  'output.csv.column.closingAvailableMinutes',
  'output.csv.column.closingBalanceMinutes',
  'output.csv.column.creditedMinutes',
  'output.csv.column.date',
  'output.csv.column.employeeName',
  'output.csv.column.expectedMinutes',
  'output.csv.column.incompleteRecordCount',
  'output.csv.column.leaveAccount',
  'output.csv.column.month',
  'output.csv.column.openingAvailableMinutes',
  'output.csv.column.openingBalanceMinutes',
  'output.csv.column.postLockDeltaMinutes',
  'output.csv.column.projectedRemainingMinutes',
  'output.csv.column.rangeChangeMinutes',
  'output.csv.column.reservedMinutes',
  'output.csv.column.status',
  'output.csv.column.submittedAt',
  'output.csv.column.warningCodes',
  'output.csv.column.workedMinutes',
  'output.csv.column.workflowCategory',
  'output.csv.column.workflowStatus',
  'output.csv.issue.absenceApprovalPending',
  'output.csv.issue.attendanceIncomplete',
  'output.csv.issue.attendanceInvalidEventOrder',
  'output.csv.issue.attendanceInvalidEventPrecision',
  'output.csv.issue.attendanceOverlap',
  'output.csv.issue.correctionUnresolved',
  'output.csv.issue.flexNegativeThresholdExceeded',
  'output.csv.issue.flexPositiveThresholdExceeded',
  'output.csv.issue.ledgerSourceMismatch',
  'output.csv.issue.policyAssignmentOverlap',
  'output.csv.issue.policyConfigurationInvalid',
  'output.csv.issue.policyNotAssigned',
  'output.csv.issue.scheduleAssignmentOverlap',
  'output.csv.issue.scheduleNotAssigned',
  'output.csv.issue.workDuringAbsence',
  'output.csv.issue.workOnHoliday',
  'output.csv.issue.workOnZeroExpectedDay',
  'output.csv.status.approvalKind.absence',
  'output.csv.status.approvalKind.cancellation',
  'output.csv.status.approvalKind.correction',
  'output.csv.status.approvalKind.monthlyPeriod',
  'output.csv.status.record.incomplete',
  'output.csv.status.workflow.approved',
  'output.csv.status.workflow.changesRequested',
  'output.csv.status.workflow.locked',
  'output.csv.status.workflow.open',
  'output.csv.status.workflow.submitted',
  'output.monthlyPrint.adjustedHeading',
  'output.monthlyPrint.adjustedTotals',
  'output.monthlyPrint.adjustmentCaption',
  'output.monthlyPrint.approvedMetadata',
  'output.monthlyPrint.approvedTotals',
  'output.monthlyPrint.dailyCaption',
  'output.monthlyPrint.dateRange',
  'output.monthlyPrint.footer',
  'output.monthlyPrint.readiness.notReady',
  'output.monthlyPrint.readiness.ready',
  'output.monthlyPrint.readiness.workflow',
  'output.monthlyPrint.statusLine',
  'output.monthlyPrint.title',
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
  'shared.route.title.insights',
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
