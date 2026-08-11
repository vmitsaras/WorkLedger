# API and Error Conventions

## 1. Versioning

- Prefix API routes with `/v1`.
- Backward-incompatible contract changes require a deliberate versioning decision.
- Internal implementation refactors do not create new API versions.

## 2. Success envelope

Use a consistent envelope where it adds metadata and contract clarity:

```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "idempotentReplay": false
  }
}
```

`idempotentReplay` is included for retry-sensitive mutation responses. It is `true` only when the server returned a previously committed terminal outcome. A replay uses a fresh `requestId`; status and semantic `data` or `error` remain the original operation snapshot.

Collections may include:

- page/cursor,
- page size,
- total where affordable,
- applied filters,
- result version or updated instant.

Do not wrap simple health responses unnecessarily.

## 3. Error envelope

```json
{
  "error": {
    "code": "ATTENDANCE_ALREADY_WORKING",
    "message": "You are already clocked in.",
    "requestId": "...",
    "fields": {},
    "context": {
      "currentState": "WORKING"
    }
  },
  "meta": {
    "idempotentReplay": false
  }
}
```

Rules:

- `code` is stable and machine-readable.
- `message` is safe and may be replaced/localized by the web app.
- `fields` maps field paths to one or more safe error codes/messages.
- `context` contains only safe recovery data.
- `meta.idempotentReplay` is present for retry-sensitive mutations and follows the success-envelope rule.
- No stack, SQL, internal path, environment/config value, raw URL/query, password, cookie, session/reset/invitation/CSRF/idempotency token, or unrelated record data.

## 4. Error classes and HTTP mapping

| Class | Example code | Typical status |
|---|---|---:|
| Authentication | `AUTH_REQUIRED` | 401 |
| Authorization | `ACCESS_DENIED` | 403 |
| Malformed JSON | `MALFORMED_REQUEST` | 400 |
| Validation | `VALIDATION_FAILED` | 422 |
| Not found | `EMPLOYEE_NOT_FOUND` | 404 |
| Domain conflict | `ATTENDANCE_ALREADY_WORKING` | 409 |
| Concurrency conflict | `RECORD_VERSION_CONFLICT` | 409 |
| Idempotency conflict | `IDEMPOTENCY_KEY_CONFLICT` | 409 |
| Rate limit | `RATE_LIMITED` | 429 |
| Dependency unavailable | `DATABASE_UNAVAILABLE` | 503 |
| Internal | `INTERNAL_ERROR` | 500 |

Do not use `404` to disguise every authorization failure unless an explicit threat-model decision requires it for a resource.

For the MVP, a request explicitly naming an unauthorized employee or resource returns `403 ACCESS_DENIED`. Scoped collections do not fail merely because unrelated records exist; they apply organization and manager scope before filters, totals, sorting, and pagination.

## 5. Initial domain error codes

### Authentication and request security

- `AUTH_REQUIRED`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_SESSION_EXPIRED`
- `AUTH_SESSION_NOT_FRESH`
- `AUTH_RESET_INVALID_OR_EXPIRED`
- `AUTH_INVITATION_INVALID_OR_EXPIRED`
- `AUTH_CSRF_INVALID`
- `AUTH_ORIGIN_INVALID`
- `RATE_LIMITED`
- `MALFORMED_REQUEST`
- `REQUEST_TOO_LARGE`
- `UNSUPPORTED_MEDIA_TYPE`
- `VALIDATION_FAILED`
- `ROUTE_NOT_FOUND`

`AUTH_INVALID_CREDENTIALS` is the only normal sign-in failure code for an unknown, inactive, deactivated, or incorrectly authenticated account. Reset/invitation errors do not distinguish malformed, expired, consumed, superseded, or wrong-purpose grants and never echo the submitted identifier or grant. `RATE_LIMITED` may provide safe retry timing but no account-existence signal.

### Attendance

- `ATTENDANCE_ALREADY_WORKING`
- `ATTENDANCE_ALREADY_OFF_WORK`
- `ATTENDANCE_NOT_WORKING`
- `ATTENDANCE_NOT_ON_BREAK`
- `ATTENDANCE_ALREADY_ON_BREAK`
- `ATTENDANCE_BREAK_CONFIRMATION_REQUIRED`
- `ATTENDANCE_STATE_CHANGED`
- `ATTENDANCE_INCOMPLETE`
- `ATTENDANCE_OVERLAP`
- `ATTENDANCE_INVALID_EVENT_ORDER`
- `ATTENDANCE_INVALID_EVENT_PRECISION`
- `ATTENDANCE_FUTURE_EVENT`
- `ATTENDANCE_AMBIGUOUS_LOCAL_TIME`
- `ATTENDANCE_NONEXISTENT_LOCAL_TIME`

### Idempotency

- `IDEMPOTENCY_KEY_REQUIRED`
- `IDEMPOTENCY_KEY_INVALID`
- `IDEMPOTENCY_KEY_CONFLICT`

### Schedule/policy

- `SCHEDULE_NOT_ASSIGNED`
- `SCHEDULE_ASSIGNMENT_OVERLAP`
- `POLICY_NOT_ASSIGNED`
- `POLICY_CONFIGURATION_INVALID`
- `ORGANIZATION_TIMEZONE_LOCKED`

### Absence

- `ABSENCE_OVERLAP`
- `ABSENCE_INSUFFICIENT_BALANCE`
- `ABSENCE_COVERAGE_INVALID`
- `ABSENCE_AMBIGUOUS_LOCAL_TIME`
- `ABSENCE_NONEXISTENT_LOCAL_TIME`
- `ABSENCE_DURATION_NOT_ALLOWED`
- `ABSENCE_RETROACTIVE_LIMIT`
- `ABSENCE_POLICY_INACTIVE`
- `ABSENCE_REQUEST_NOTE_NOT_ALLOWED`
- `ABSENCE_CANNOT_CANCEL`
- `ABSENCE_ALREADY_DECIDED`
- `ABSENCE_STATE_CHANGED`
- `ABSENCE_REPORT_CANNOT_REJECT`
- `ABSENCE_OVERRIDE_REASON_REQUIRED`

### Time-account ledger

- `TIME_ACCOUNT_LEDGER_DUPLICATE_ENTRY`
- `TIME_ACCOUNT_LEDGER_DUPLICATE_SOURCE`
- `TIME_ACCOUNT_LEDGER_SCOPE_MISMATCH`
- `TIME_ACCOUNT_LEDGER_TOTAL_INVALID`

### Approval

- `APPROVAL_SELF_NOT_ALLOWED`
- `APPROVAL_OUT_OF_SCOPE`
- `APPROVAL_STATE_CONFLICT`
- `APPROVAL_REASON_REQUIRED`

### Period

- `PERIOD_NOT_READY`
- `PERIOD_ALREADY_SUBMITTED`
- `PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED`
- `PERIOD_REOPEN_REQUIRED`
- `PERIOD_STATE_CONFLICT`
- `PERIOD_SOURCE_CHANGED`
- `PERIOD_LEDGER_MISMATCH`
- `PERIOD_LOCKED`
- `PERIOD_ADJUSTMENT_REQUIRED`
- `PERIOD_VERSION_CONFLICT`

## 6. Warning and blocker codes

Warnings are stable machine-readable values returned with calculation data; they are not inferred from localized prose and do not become HTTP errors merely because they exist.

- `WORK_ON_ZERO_EXPECTED_DAY`
- `WORK_ON_HOLIDAY`
- `WORK_DURING_ABSENCE`
- `FLEX_POSITIVE_THRESHOLD_EXCEEDED`
- `FLEX_NEGATIVE_THRESHOLD_EXCEEDED`

`WORK_ON_HOLIDAY` supersedes the generic `WORK_ON_ZERO_EXPECTED_DAY` for the same date so one source condition does not produce duplicate warnings. Configured flexible-time threshold warnings are independent and never cap the calculated value.

Blocking calculation failures use their specific existing codes, including
`ATTENDANCE_INCOMPLETE`, `ATTENDANCE_OVERLAP`, `ATTENDANCE_INVALID_EVENT_ORDER`,
`ATTENDANCE_INVALID_EVENT_PRECISION`, `SCHEDULE_NOT_ASSIGNED`,
`SCHEDULE_ASSIGNMENT_OVERLAP`, `POLICY_NOT_ASSIGNED`, `POLICY_ASSIGNMENT_OVERLAP`, and
`POLICY_CONFIGURATION_INVALID`. A blocked daily result has `calculationStatus: INCOMPLETE` and
cannot expose final credited/balance values or post a ledger effect.

Additional source-state blockers are `CORRECTION_UNRESOLVED`, `ABSENCE_APPROVAL_PENDING`, and
`LEDGER_SOURCE_MISMATCH`. They identify the unresolved source category without exposing sensitive
request, decision, or ledger detail.

## 7. Validation ownership

- Client validation improves immediacy.
- API validation is authoritative.
- Domain validation protects invariants even when transport validation passed.
- Database constraints provide final integrity support.
- Do not rely on one layer alone.

## 8. Attendance idempotency convention

Every attendance mutation requires exactly one `Idempotency-Key` HTTP header. Do not accept the key in a body, query parameter, or URL path.

### Header contract

- The value is an opaque, client-generated string matching `[A-Za-z0-9._~-]{16,128}`; a UUID is valid.
- A missing header returns `IDEMPOTENCY_KEY_REQUIRED`; a duplicated, malformed, too-short, or too-long value returns `IDEMPOTENCY_KEY_INVALID`.
- Malformed/invalid key failures use the accepted `422` validation status and are not stored as
  terminal idempotency outcomes.
- Raw keys and fingerprints are not written to URLs, analytics, audit events, or normal application logs.

### Scope and fingerprint

The unique claim is scoped by organization, authenticated actor account, and key. It is intentionally not scoped by route, so reusing one key for another command is detected.

The canonical fingerprint contains:

- organization ID;
- authenticated actor account ID;
- resolved employee ID;
- HTTP method and attendance command;
- normalized request-body fields, including the non-negative integer `expectedAttendanceRevision`; and
- `confirmActiveBreak` for `CLOCK_OUT`, normalized to `false` when omitted.

Object-key order is irrelevant. Unknown request fields are rejected by the contract schema rather than ignored during fingerprinting. `CLOCK_IN`, `START_BREAK`, and `RESUME` accept no command-specific field beyond `expectedAttendanceRevision`; `CLOCK_OUT` additionally accepts only `confirmActiveBreak`.

It excludes authentication/session material, the idempotency key, request/correlation IDs, transport time, and server-generated occurrence time.

### Stored terminal outcome and replay

Store the key or a collision-safe protected representation, fingerprint, actor/organization/employee scope, command, original HTTP status, semantic success/error snapshot or stable result reference, creation time, and terminal state. Attendance-command records have no MVP expiry.

- Same scope, key, and fingerprint returns the stored terminal HTTP status and semantic outcome with a fresh `requestId` and `meta.idempotentReplay: true`.
- Same scope and key with a different fingerprint returns `IDEMPOTENCY_KEY_CONFLICT` and no domain effect. Its safe context may identify the attempted command, but never reveals the original body or key.
- Concurrent matching requests serialize on the unique claim. One processes; followers replay the committed outcome.
- Authentication, current employee capability, authorization, and CSRF checks precede lookup/replay. A key conveys no permission.
- Deterministic stale-state and domain conflicts reached after a valid claim are terminal for that key. Authentication/authorization/schema failures and retryable dependency/internal failures are not terminal, unless a transaction actually committed.

The exact application and database design must preserve the processing order and transaction rules in `docs/03-domain-rules.md` section 9.

## 9. Optimistic concurrency

Editable/decidable resources include a version or updated token.

- Client submits expected version.
- Server rejects stale mutation with `RECORD_VERSION_CONFLICT` or resource-specific equivalent.
- Response includes safe current state needed for recovery.

Attendance uses the required non-negative integer `expectedAttendanceRevision` read from the authoritative attendance view. A successful attendance command increments the revision once; a rejected request or idempotent replay does not. A stale request returns `409 ATTENDANCE_STATE_CHANGED` with safe context:

```json
{
  "currentState": "WORKING",
  "attendanceRevision": 7,
  "validActions": ["START_BREAK", "CLOCK_OUT"]
}
```

Idempotent replay precedes attendance-revision comparison, so retrying a committed request returns its original operation snapshot even if the employee has since performed another action. Clients must refetch the authoritative view and must not let an older revision overwrite a newer cache entry.

### Absence workflow concurrency and safe recovery

Every absence request, decision, resubmission, and cancellation mutation carries a non-negative expected resource version. `ABSENCE_STATE_CHANGED` returns only the actor-authorized current workflow status, version, and safe valid actions. Unique semantic source constraints ensure one winning transition can append each reservation, release, deduction, restoration, and calculation-source effect at most once.

- Unknown fields are rejected. A sickness-report schema has no note, diagnosis, medical-detail, clinician, or attachment field; an attempted note returns `ABSENCE_REQUEST_NOTE_NOT_ALLOWED` without echoing its value.
- `ABSENCE_OVERLAP` may identify authorized conflicting local dates/coverage portions, but never the conflicting absence type, sickness classification, note, reason, entitlement, or unrelated employee data.
- `ABSENCE_INSUFFICIENT_BALANCE` returns requested, available, reserved, and projected integer minutes only to the owner, an eligible reviewer whose decision requires them, or HR. Team DTOs never receive the error or amounts.
- `ABSENCE_OVERRIDE_REASON_REQUIRED` and `APPROVAL_REASON_REQUIRED` do not echo an invalid submitted reason.
- A report-and-acknowledge request rejects an attempted rejection with `ABSENCE_REPORT_CANNOT_REJECT`; coverage removal uses cancellation.
- An ordinary cancellation touching a locked date returns `PERIOD_ADJUSTMENT_REQUIRED` with safe affected dates and no partial effect.
- Absence type, sickness classification, request/decision text, entitlement, and person-identifying search values are not accepted as URL state. Opaque record IDs and non-sensitive pagination/sort/generic status/date-range filters may appear in URLs.

## 10. Daily calculation result union

Daily calculation responses are a discriminated union on `calculationStatus`:

- `COMPLETE` requires final `scheduledMinutes`, holiday/absence expected-reduction minutes, `expectedMinutes`, `workedMinutes`, `breakMinutes`, `absenceCreditMinutes`, `adjustmentMinutes`, `creditedMinutes`, and signed `dailyBalanceMinutes` plus the identified calculation/source version.
- `PROVISIONAL` omits final credited/balance fields and may include a separately nested `provisional` breakdown calculated with a returned `calculationAsOf` instant.
- `INCOMPLETE` omits final credited/balance fields, returns one or more structured blockers, and may include a separately nested safe estimate.

Posting state is separate from calculation status. Responses label the ledger-derived `postedBalanceMinutes` separately from any `projectedBalanceMinutes`; an incomplete date is never silently included in the projection.

## 11. Pagination and filtering

- Large collections are paginated server-side.
- Sort fields are allowlisted.
- Filters are validated.
- Manager/HR scope is applied before pagination/result calculation.
- Web filters use URL search params.

## 12. Date/time serialization

- Instants serialize as ISO strings with offset/UTC form.
- Date-only values serialize as ISO dates.
- Timezone IDs are explicit IANA strings.
- Punch occurrence instants are minute-aligned; ordinary command bodies never accept them. A non-minute-aligned interpreted attendance source fails domain validation rather than being rounded later.
- Manual attendance input sends date-only value, minute-precision local time, and the applicable timezone context. If the local time is ambiguous, one valid explicit UTC offset is required; if nonexistent, no offset can make it valid.
- Durations serialize as integer minutes in API DTOs unless a documented richer type is required.
- UI formatting is locale-aware; API values are not localized strings.
