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
    "requestId": "..."
  }
}
```

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
  }
}
```

Rules:

- `code` is stable and machine-readable.
- `message` is safe and may be replaced/localized by the web app.
- `fields` maps field paths to one or more safe error codes/messages.
- `context` contains only safe recovery data.
- No stack, SQL, internal path, secret, or unrelated record data.

## 4. Error classes and HTTP mapping

| Class | Example code | Typical status |
|---|---|---:|
| Authentication | `AUTH_REQUIRED` | 401 |
| Authorization | `ACCESS_DENIED` | 403 |
| Validation | `VALIDATION_FAILED` | 400 or 422, choose one consistently |
| Not found | `EMPLOYEE_NOT_FOUND` | 404 |
| Domain conflict | `ATTENDANCE_ALREADY_WORKING` | 409 |
| Concurrency conflict | `RECORD_VERSION_CONFLICT` | 409 |
| Rate limit | `RATE_LIMITED` | 429 |
| Dependency unavailable | `DATABASE_UNAVAILABLE` | 503 |
| Internal | `INTERNAL_ERROR` | 500 |

Do not use `404` to disguise every authorization failure unless an explicit threat-model decision requires it for a resource.

## 5. Initial domain error codes

### Attendance

- `ATTENDANCE_ALREADY_WORKING`
- `ATTENDANCE_ALREADY_OFF_WORK`
- `ATTENDANCE_NOT_WORKING`
- `ATTENDANCE_NOT_ON_BREAK`
- `ATTENDANCE_ALREADY_ON_BREAK`
- `ATTENDANCE_STATE_CHANGED`
- `ATTENDANCE_INCOMPLETE`
- `ATTENDANCE_OVERLAP`
- `ATTENDANCE_INVALID_EVENT_ORDER`
- `ATTENDANCE_FUTURE_EVENT`
- `ATTENDANCE_AMBIGUOUS_LOCAL_TIME`
- `ATTENDANCE_NONEXISTENT_LOCAL_TIME`

### Schedule/policy

- `SCHEDULE_NOT_ASSIGNED`
- `SCHEDULE_ASSIGNMENT_OVERLAP`
- `POLICY_NOT_ASSIGNED`
- `POLICY_CONFIGURATION_INVALID`

### Absence

- `ABSENCE_OVERLAP`
- `ABSENCE_INSUFFICIENT_BALANCE`
- `ABSENCE_DURATION_NOT_ALLOWED`
- `ABSENCE_RETROACTIVE_LIMIT`
- `ABSENCE_CANNOT_CANCEL`
- `ABSENCE_ALREADY_DECIDED`

### Approval

- `APPROVAL_SELF_NOT_ALLOWED`
- `APPROVAL_OUT_OF_SCOPE`
- `APPROVAL_STATE_CONFLICT`
- `APPROVAL_REASON_REQUIRED`

### Period

- `PERIOD_NOT_READY`
- `PERIOD_ALREADY_SUBMITTED`
- `PERIOD_LOCKED`
- `PERIOD_ADJUSTMENT_REQUIRED`
- `PERIOD_VERSION_CONFLICT`

## 6. Validation ownership

- Client validation improves immediacy.
- API validation is authoritative.
- Domain validation protects invariants even when transport validation passed.
- Database constraints provide final integrity support.
- Do not rely on one layer alone.

## 7. Idempotency convention

Clock and other retry-sensitive commands accept an idempotency key through one documented header or body field.

Store:

- actor,
- command type,
- key,
- request fingerprint,
- result status/body reference,
- created/expiry times.

Same key plus same fingerprint returns original result. Same key plus different fingerprint returns an idempotency conflict.

## 8. Optimistic concurrency

Editable/decidable resources include a version or updated token.

- Client submits expected version.
- Server rejects stale mutation with `RECORD_VERSION_CONFLICT` or resource-specific equivalent.
- Response includes safe current state needed for recovery.

## 9. Pagination and filtering

- Large collections are paginated server-side.
- Sort fields are allowlisted.
- Filters are validated.
- Manager/HR scope is applied before pagination/result calculation.
- Web filters use URL search params.

## 10. Date/time serialization

- Instants serialize as ISO strings with offset/UTC form.
- Date-only values serialize as ISO dates.
- Timezone IDs are explicit IANA strings.
- Durations serialize as integer minutes in API DTOs unless a documented richer type is required.
- UI formatting is locale-aware; API values are not localized strings.
