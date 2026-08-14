# Employee and Account Administration

**Task:** `WL-900`

**Status:** Complete

## Scope

`WL-900` implements two deliberately separate administration surfaces. Organization HR manages
stable employee records, effective employment history, employee-linked invitations, and the
`EMPLOYEE`, `MANAGER`, and `HR_ADMINISTRATOR` roles. System administrators manage purpose-minimized
account state, the `SYSTEM_ADMINISTRATOR` role, and active sessions without receiving employment,
absence, schedule, balance, or other HR fields.

The slice adds `/employees`, `/employees/new`, `/employees/:employeeId`, `/system/accounts`, and the
public `/activate-account` route. It does not add teams, manager assignments, schedules, policies,
absence-type configuration, holidays, or the audit explorer; those remain `WL-901`–`WL-906`.

## Employee lifecycle

The HR API provides bounded status-filtered employee listing, employee detail, create/invite,
activate, deactivate, HR-role replacement, and invitation reissue routes under `/v1/hr/employees`.
Creation commits the stable employee, initial half-open employment period, inactive Better Auth
account, active account/employee link, HR-managed role assignments, protected invitation record,
and minimized domain/security audit evidence in one serializable transaction.

Deactivation ends the open employment period, changes the stable employee and linked account to
inactive, revokes every account session, and invalidates an unconsumed invitation without deleting
history. Reactivation creates a new non-overlapping employment period and re-enables the linked
account; it does not reopen or rewrite an earlier period. Database exclusion and unique constraints
map to stable conflict responses.
Raw attendance, approved periods, ledger entries, prior employment periods, account links, and
role-assignment history remain unchanged.

All HR mutations require an active fresh session, same-origin request, session-bound CSRF token,
current organization-HR authority, and a non-self target for privileged lifecycle/account/role
actions. HR role replacement cannot add, remove, or imply the system-administrator role.

## Invitation and activation

Employee and technical-account creation issue a random 24-hour invitation through an injected
delivery boundary. The raw grant is passed only to the sender; it is absent from API responses,
audit facts, and ordinary application state, and only the protected verification identifier is
stored. Reissue supersedes earlier pending grants and is rejected for an already-active account.

`POST /v1/account-invitations/activate` is same-origin, rate-limited by protected client and grant
keys, validates the existing 15–128 character credential policy, consumes the grant once, writes a
memory-hard password verifier, activates the account, clears invitation/session state, and appends
security audit evidence in one transaction. Invalid, expired, consumed, and replayed grants share
one non-enumerating response. Activation does not create a session: the person returns to normal
sign-in.

The web route captures the grant into module memory, immediately replaces the visible URL and
history entry, uses no browser persistence, requests no third-party resource, and applies
`no-store`/`no-referrer` protections. Delivery remains an optional, non-transactional deployment
adapter; the default local adapter intentionally sends nothing. A delivery-adapter failure is
reported through a generic server diagnostic without exposing the recipient or grant and does not
misrepresent the already-committed employee transaction as rolled back; HR can reissue after the
delivery configuration is repaired.

## Technical account and session administration

The system API under `/v1/system/accounts` lists only account name/email, active and invitation
state, whether the account is employee-linked, system-role state, and minimized session summaries.
Session tokens, IP addresses, raw user agents, employee numbers, employment history, team,
attendance, absence, balance, and HR-role data are excluded.

System administrators can create a technical account without fabricating an employee, change
another account's technical active state, assign or revoke another account's system role, and
revoke another account's session. Every mutation requires a fresh session, same-origin and CSRF
validation, prohibits privileged self-targeting, revokes affected sessions where applicable, and
records purpose-minimized security audit evidence. Technical account-state changes never alter
employee or employment data. An employee-linked account may be technically re-enabled only while
its employee remains active, and no account with a pending invitation can be technically activated,
so system administration cannot override HR deactivation or bypass credential activation.

## Accessibility and interaction

The employee directory uses URL-owned status and page state, semantic headings, a captioned data
table, textual account/employment/invitation states, named pagination, and narrow-screen scroll
containment. Employee creation is a labelled complex form with descriptions, inline errors, a
focusable linked error summary, pending-state duplicate-submit protection, and a persistent result.
Employee detail exposes preserved history as a semantic list and omits privileged controls for the
current actor's own record.

The system page uses labelled technical-account creation and textual account, role, and session
states. Session revoke buttons retain accessible account/device context, and self-target controls
are absent rather than merely disabled. Loading, empty, success, permission-loss, validation, and
dependency-error states remain explicit. Route headings receive deliberate focus after navigation
and after asynchronous employee detail resolves.

## Evidence

- Contract tests and generated OpenAPI cover strict bounded inputs, normalized email addresses,
  HR/system DTO separation, stable actions, and public activation errors.
- PostgreSQL/API integration covers HR/system access separation, transactional employee creation,
  protected grants, activation and replay denial, sign-in, self-role denial, deactivation/session
  revocation, a second preserved employment period, technical state changes without employee
  mutation, HR-deactivation override denial, technical-account invitation, and audit evidence.
- Component tests cover employee/system field minimization, textual states, table accessibility,
  self-control omission, and complex-form error-summary focus.
- Chromium tests cover keyboard employee creation/invitation plus activation-grant URL cleanup,
  credential establishment, and the required return to normal sign-in.

## Remaining work

`WL-901` owns teams, effective direct-manager assignments, and immediate scope changes. Production
email configuration and operational delivery diagnostics remain part of Phase 10 hardening. The
full cross-browser, assistive-technology, proxy/rate-limit, and production security matrix remains
owned by `WL-1000`–`WL-1002`; automated accessibility checks do not establish WCAG conformance.
