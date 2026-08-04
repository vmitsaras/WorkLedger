# Roles and Permission Matrix

## Authorization model

WorkLedger uses authenticated identity, application role, resource scope, and record state together. A role name alone never authorizes an action.

- Deny by default.
- Every protected API operation checks the current account, active employee link when employee capability is required, organization, application role, target employee/resource, current effective relationship, record state, and prohibited self-action rules.
- Scope is evaluated when the request is handled, not when the resource was created. A former manager cannot retain access because they once managed or approved a record.
- Approval delegation is not an MVP capability and grants no access.
- Organization identity remains part of authorization even though one organization per installation is the MVP deployment model.
- Collection scope is applied before filtering totals, sorting, and pagination.
- Response contracts minimize fields for the actor's purpose; access to one field or summary does not imply access to the complete record.
- Navigation visibility and client-side route guards are convenience only. The API remains authoritative.
- Unauthenticated password-reset completion is authorized by a valid expiring single-use token, not by an application role; token validity does not grant access to any other resource.

## Scope vocabulary

| Scope | Meaning |
|---|---|
| `Self` | The target employee ID equals the actor's active employee link. |
| `Reports` | The actor is the target employee's current effective direct manager when the request is handled. |
| `Org HR` | The actor has the HR administrator role and the target belongs to the installation organization. |
| `Technical` | The operation concerns authentication, sessions, service configuration, health, backup, restore, or upgrade rather than HR/domain data. |
| `Limited` | A purpose-specific DTO exposes fewer fields than the underlying record; the matrix row defines the permitted purpose. |
| `No` | The role alone does not grant the action. A separately assigned role may still grant it, subject to all self-action and scope restrictions. |

Team membership is not an authorization scope for attendance, balances, requests, periods, reports, or audit records. It may only determine which privacy-safe availability entries are relevant in a dedicated team view.

## Role definitions

### Employee

- Requires an active account linked to an active employee record.
- Uses attendance actions and views their own attendance, balances, requests, profile summary, notifications, and monthly periods.
- May request corrections, absence, cancellation, and post-lock changes but cannot directly rewrite approved history.
- Cannot approve or privileged-adjust their own record.

### Manager

- Adds manager capability to employee capability; it does not replace the manager's own employee identity.
- May view and decide supported requests only for current direct reports.
- May view privacy-safe availability for current direct reports.
- Loses report access as soon as the effective manager assignment ends.
- Cannot approve their own request or period, including when another role would otherwise allow organization-wide approval.

### HR administrator

- May manage organization-wide employment, team, manager, schedule, policy, holiday, entitlement, reporting, approval, and exceptional adjustment data.
- Uses data-minimized contracts for sensitive records and must give a reason for privileged adjustments.
- Cannot use HR capability to approve, adjust, lock, or otherwise make a privileged decision about their own linked employee record.
- Does not gain technical server, backup, secret, or authentication-operations access from the HR role.

### System administrator

- Manages authentication operations, sessions, technical configuration, backups, updates, service health, and recovery.
- Has no application-level attendance, balance, absence, report, sickness, or HR-audit access from the system-administrator role.
- May access only security/technical audit metadata needed to operate the service; domain payloads remain excluded.
- Does not gain HR capability unless the account is separately and explicitly assigned the HR administrator role.

## Role composition and separation

- Application roles are additive, but every grant still requires the corresponding resource scope.
- Employee and manager capabilities require an active employee link. A technical-only account need not have one.
- Self-approval and privileged self-adjustment prohibitions override the union of roles.
- HR and system-administrator roles are logically separate. Assigning both to one account is an explicit privileged choice that produces an audit event; it does not weaken field minimization or self-action prohibitions.
- HR administrators assign employee, manager, or HR roles to other accounts. System administrators assign the system-administrator role to other technical accounts. Neither may change their own privileged roles.
- Initial privileged accounts and recovery when no eligible administrator remains use an explicit deployment bootstrap procedure with audit evidence; bootstrap is not a normal application authorization bypass.
- Infrastructure operators may have out-of-band access to hosts or encrypted backups, but that operational reality is not an application permission. Deployment controls, audit, and backup protection apply separately.

## Resource-action matrix

The cells describe what each role alone grants. Managers and HR administrators may also use `Self` employee actions when they have an active employee link.

| Resource / action | Employee | Manager | HR administrator | System administrator |
|---|---|---|---|---|
| View employee profile summary | `Self` | `Self`, `Reports` limited | `Org HR` | `No` |
| Create or update employee/employment record | `No` | `No` | `Org HR`, not self | `No` |
| Invite, activate, or deactivate employee-linked account | `No` | `No` | `Org HR`, not self | `Technical` account operation only; no HR-field mutation |
| View or revoke sessions | `Self` | `Self` | `Self`; employee deactivation revokes target sessions | `Technical` |
| Recover an account or reset credentials | `Self` reset flow | `Self` reset flow | `Self` reset flow | `Technical` recovery without HR-data access |
| Assign employee, manager, or HR application role | `No` | `No` | `Org HR`, not self | `No` |
| Assign system-administrator role | `No` | `No` | `No` | `Technical`, not self |
| Assign team or current manager | `No` | `No` | `Org HR`, not self | `No` |
| View attendance timeline or daily record | `Self` | `Self`, `Reports` | `Org HR` | `No` |
| Execute clock in, break, resume, or clock out | `Self` | `Self` | `Self` | `No` |
| Submit or view correction request | `Self` | `Self`, `Reports` view | `Org HR` view | `No` |
| Approve, reject, or request changes to correction | `No` | `Reports`, not self | `Org HR`, not self | `No` |
| Apply privileged attendance correction/adjustment | `No` | `No` | `Org HR`, not self; reason required | `No` |
| View flexible-time balance or ledger | `Self` | `Self`, `Reports` | `Org HR` | `No` |
| View leave balance or entitlement ledger | `Self` | `Self`, `Reports` limited to approval need | `Org HR` | `No` |
| Apply manual time/leave ledger adjustment | `No` | `No` | `Org HR`, not self; reason required | `No` |
| Create or view absence request | `Self` | `Self`, `Reports` view | `Org HR` view | `No` |
| Report or view sickness | `Self` | `Reports` limited review DTO | `Org HR` limited sensitive DTO | `No` |
| Approve, acknowledge, reject, or request changes to absence | `No` | `Reports`, not self | `Org HR`, not self | `No` |
| Request absence cancellation | `Self` | `Self` | `Self` | `No` |
| Decide absence cancellation | `No` | `Reports`, not self | `Org HR`, not self | `No` |
| View personal absence/holiday calendar | `Self` | `Self` | `Self` | `No` |
| View privacy-safe team availability | `No` | `Reports` limited availability DTO | `Org HR` limited availability DTO | `No` |
| View privacy-safe team calendar/agenda | `No` | `Reports` limited availability DTO | `Org HR` limited availability DTO | `No` |
| View monthly period and blockers | `Self` | `Self`, `Reports` | `Org HR` | `No` |
| Submit monthly period | `Self` | `Self` | `Self` | `No` |
| Approve or request changes to monthly period | `No` | `Reports`, not self | `Org HR`, not self | `No` |
| Lock monthly period | `No` | `Reports`, not self, when workflow permits | `Org HR`, not self, when workflow permits | `No` |
| Request post-lock correction | `Self` | `Self` | `Self`; exceptional adjustment uses the separate privileged path | `No` |
| Apply post-lock adjustment | `No` | `No` | `Org HR`, not self; reason and linked source required | `No` |
| Read assigned schedule, policy, timezone, and holidays | `Self` | `Self`, `Reports` | `Org HR` | `No` |
| Correct primary organization timezone before time-dependent employee facts exist | `No` | `No` | `Org HR`; audit required; later changes blocked | `No` |
| Manage organization schedule/policy definitions, absence types, or holidays | `No` | `No` | `Org HR`; audit required | `No` |
| Assign employee schedule/policy or entitlement | `No` | `No` | `Org HR`, not self | `No` |
| Run monthly-time, flexible-time, or leave report | `Self` | `Self`, `Reports` | `Org HR` | `No` |
| Run missing-record report | `Self` | `Self`, `Reports` | `Org HR` | `No` |
| Run pending-approval report | `No` | `Reports` | `Org HR` | `No` |
| Export or print monthly-time, balance, or leave records | `Self` | `Reports` | `Org HR` | `No` |
| View record history/domain audit information | `Self` embedded history | `Reports` embedded history | `Org HR` audit explorer | `No` |
| View security/technical audit information | `No` | `No` | `No` unless separately system administrator | `Technical` limited metadata |
| View in-app notifications | `Self` | `Self` | `Self` | `Technical` delivery status only, never message content |
| Append audit or notification record | `No` | `No` | `No` | `No`; trusted application process only |
| Manage server configuration, health, backup, restore, or upgrade | `No` | `No` | `No` | `Technical` |

## Sensitive-data boundaries

- A team availability response contains employee display identity, coverage needed to show availability, and neutral `UNAVAILABLE` state only. It does not expose request ID, sickness classification, absence reason/type, comments, entitlement, reviewer history, or attachments.
- A manager's limited sickness-review DTO may contain the employee identity, `SICKNESS` classification, affected date/duration, workflow status, version, and decision context required for acknowledgement, changes requested, or cancellation review. It contains no diagnosis, request note, medical attachment, or unrestricted employee comment, and it does not offer rejection for a report-and-acknowledge workflow.
- HR sickness access is limited to the fields required to administer the workflow. WorkLedger has no diagnosis field in the MVP.
- A manager reviewing an entitlement-backed request may see requested, available, reserved, and projected integer minutes needed to decide it, but receives no unrelated entitlement ledger or adjustment history.
- Employee profile summaries do not make HR-owned fields editable.
- System administrators may see account identifiers, session/security state, delivery status, and technical audit metadata only when needed for a technical action; these DTOs do not include HR/domain payloads.
- Generic exports and printable records use the same scope and field minimization as their source query and omit sickness classification, request/decision notes, and reviewer comments. A sickness-specific export is excluded from the MVP.

## Scope lifecycle and reassignment

- Manager scope is resolved from the current effective direct-manager assignment on every request.
- When an assignment ends, the former manager immediately loses read and decision access, including to requests created while they were the manager.
- A newly assigned current manager may review an existing pending request for their report.
- Historical decisions retain the original actor ID and role-at-decision metadata but create no continuing access grant.
- When no valid manager exists, the request remains pending until authorized HR decides it or HR assigns a new current manager. The requester never becomes their own fallback approver.
- Deactivating an account revokes authentication. Deactivating an employee preserves records and removes employee/manager capability according to effective employment state.
- Role and manager-assignment changes create audit events and invalidate or refresh authorization context immediately.
- Delegation records, if introduced later, have no MVP authorization effect.

## Self-action rules

- No actor may approve, acknowledge, reject, request changes to, approve cancellation of, or lock their own absence, correction, or monthly period.
- No HR administrator may use HR capability to change their own employment status, employee-linked account state, team, manager, role, schedule/policy assignment, entitlement, attendance, time ledger, leave ledger, or post-lock result.
- Organization-wide configuration may affect the HR administrator along with other employees, but it requires normal validation and audit and cannot target that actor as a disguised self-adjustment.
- Creating, submitting, or withdrawing one's own request is not approval.
- A privileged adjustment is not ordinary approval, but it still requires an eligible non-self HR actor, an explicit reason, a source link, and an audit event.
- If no eligible non-self actor exists, the operation remains unavailable until another authorized actor is assigned. The system-administrator role cannot bypass this rule.

## Explicit target and collection behavior

- A request naming one unauthorized employee or resource returns `403 ACCESS_DENIED`. It does not return an empty success response.
- A scoped collection or report returns only authorized rows and applies organization/manager scope before filters, counts, totals, sorting, and pagination.
- A mixed list of requested employee IDs containing any unauthorized target is rejected with `403 ACCESS_DENIED`; it is not partially fulfilled unless a contract explicitly defines a privacy-safe aggregate.
- Error context never reveals whether an unrelated sensitive record exists beyond the safe information already authorized for the actor.

## Permission-test requirement

Every protected endpoint must cover the applicable cases:

1. unauthenticated request denied,
2. inactive or revoked account denied,
3. missing/inactive employee link denied when employee capability is required,
4. correct owner allowed,
5. unrelated employee denied,
6. current direct manager allowed where the matrix grants `Reports`,
7. unrelated and former managers denied,
8. HR allowed only for `Org HR` actions and minimized fields,
9. system administrator denied HR/domain data and allowed only technical actions,
10. combined-role account still denied self-approval and privileged self-adjustment,
11. cross-organization target denied,
12. explicit unauthorized target returns `403 ACCESS_DENIED`,
13. collection scope is applied before pagination, counts, and totals,
14. response omits fields outside the actor's purpose-specific DTO,
15. role/scope change takes effect without relying on stale client navigation state.
