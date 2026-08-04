# Roles and Permission Matrix

## Authorization model

WorkLedger uses role plus resource scope. A role alone is not sufficient.

- Employees may access their own records.
- Managers may access current direct reports or explicitly delegated scope.
- HR administrators may access organization-wide HR records required by their function.
- System administrators operate infrastructure and authentication but do not automatically receive HR-data access.
- Every API operation checks the current user, employee link, role, organization, target resource, and effective scope.

## Role definitions

### Employee

- Own attendance, balances, requests, period submissions, and profile.
- May propose corrections but cannot silently rewrite approved records.
- Cannot approve their own requests.

### Manager

- Includes employee capabilities.
- May review records and requests for authorized reports.
- May approve, reject, or request changes where policy grants authority.
- Sees privacy-safe team availability.

### HR administrator

- Manages employment, schedule, policy, holiday, entitlement, reporting, and exceptional adjustment data.
- May resolve or reassign requests according to recorded policy.
- Must provide reasons for privileged corrections.

### System administrator

- Manages technical configuration, authentication operations, backups, updates, and health.
- May revoke sessions and recover access.
- Does not read sickness details, absence reasons, or time records by default.

## Resource-action matrix

Legend: `Own`, `Scoped`, `All HR`, `Technical`, `No`.

| Resource / action | Employee | Manager | HR administrator | System administrator |
|---|---:|---:|---:|---:|
| View own attendance | Own | Own | All HR | No |
| Create own clock event through valid action | Own | Own | All HR only as explicit adjustment | No |
| Request own correction | Own | Own | All HR | No |
| Approve correction | No | Scoped | All HR | No |
| View flexible-time balance | Own | Scoped | All HR | No |
| View leave balance | Own | Scoped | All HR | No |
| Create absence request | Own | Own | All HR | No |
| Approve absence | No | Scoped | All HR | No |
| View team availability | Privacy-safe only | Scoped | All HR | No |
| View sickness details | Own | Minimum necessary | Authorized HR only | No |
| View protected attachment | Own, when allowed | Policy-dependent | Authorized HR only | No by default |
| Submit monthly period | Own | Own | Exceptional admin action | No |
| Approve monthly period | No | Scoped | All HR | No |
| Reopen or adjust locked period | No | Request only | Controlled All HR | No |
| Create/deactivate employee | No | No | All HR | Technical account only |
| Assign team/manager | No | No | All HR | No |
| Manage schedules and policies | Read assigned | Read assigned | All HR | No |
| Manage public holidays | Read | Read | All HR | No |
| Run HR reports | Own only | Scoped | All HR | No |
| Export HR data | Own where offered | Scoped where offered | All HR | No |
| View domain audit events | Own relevant | Scoped | All HR | Security-only subset |
| Manage sessions | Own sessions | Own sessions | Own sessions | Technical |
| Manage server configuration | No | No | No | Technical |

## Scope lifecycle

- A manager loses access when the employee-manager assignment ends.
- Historical approvals remain attributable to the original manager but do not grant continuing read access.
- Delegation has explicit start and end instants.
- Deactivated employees retain historical records but cannot authenticate.
- Role changes create audit events and revoke or refresh active authorization context.

## Self-approval rules

- No user may approve their own absence, correction, or monthly period.
- HR privileged adjustment is not treated as ordinary approval; it requires an explicit reason and audit event.
- When no valid approver exists, the request is escalated or reassigned rather than self-approved.

## Permission-test requirement

Every protected endpoint must include tests for:

1. unauthenticated access,
2. correct owner access,
3. unrelated employee denial,
4. authorized manager access,
5. unrelated manager denial,
6. HR access where applicable,
7. system-administrator denial where HR data is not required,
8. deactivated account denial,
9. expired delegation denial,
10. cross-organization denial even though MVP uses one organization per installation.
