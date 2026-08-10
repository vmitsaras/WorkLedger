# Application authorization foundation

**Task:** `WL-303`  
**Outcome:** Complete locally.

## Persistence and ownership

Migration `0003_authorization_foundation.sql` adds two WorkLedger-owned tables without adding roles
to Better Auth records:

- `account_employee_links` preserves link/unlink history and uses partial unique indexes to permit
  at most one active employee per account and one active account per employee;
- `account_role_assignments` preserves assignment/revocation history for `EMPLOYEE`, `MANAGER`,
  `HR_ADMINISTRATOR`, and `SYSTEM_ADMINISTRATOR`, with one active row per organization, account,
  and role.

The link includes organization identity and a composite foreign key to the employee's organization.
Interval checks reject unlink/revoke instants that do not follow their corresponding link/assignment
instant. Neither table stores a role or employee claim in a Better Auth session.

## Authoritative actor and scope resolution

The transaction-scoped authorization repository resolves, for the requested organization and local
date:

- current account activation from `auth_users`;
- the one active employee link, if present;
- employee activation plus a current half-open employment period;
- current, non-revoked application roles; and
- current direct-manager scope from the effective-dated manager assignment and target employment.

Manager scope is evaluated when the request is handled. A historical assignment produces no grant,
and a technical-only account does not acquire employee identity. Employee collection queries apply
`SELF`, `REPORTS`, `SELF_AND_REPORTS`, or `ORGANIZATION` scope in SQL before deterministic ordering,
offset, and limit.

## Deny-by-default policy

`apps/api/src/authorization/policy.ts` maps the accepted role matrix to explicit employee-target,
account-target, and installation-level actions. A decision is either a grant with `SELF`,
`REPORTS_LIMITED`, `ORGANIZATION_HR`, or `TECHNICAL` purpose, or the stable internal
`ACCESS_DENIED` result.

Key rules are structural rather than route conventions:

- employee self actions require an active account, active employee capability, and an eligible
  employee/manager/HR role;
- report actions require the `MANAGER` role, active employee capability, and an authoritative
  current direct-manager relationship;
- HR actions remain organization-scoped and do not grant technical operations;
- system-administrator actions remain technical and do not grant employee, HR, attendance,
  absence, balance, report, or domain-history access;
- privileged self-decisions, adjustments, employee-role changes, and assignment changes remain
  denied even for combined-role accounts; and
- employee account/role administration, system-role changes, technical account changes, and
  other-session revocation require a session inside the 15-minute freshness boundary; and
- an explicitly different target organization is always denied.

`createAuthorizationService` composes actor resolution, manager lookup, and the pure policy inside
one database transaction. Route/application code cannot provide a trusted `isCurrentManager` flag.
The service also performs scoped collection selection before repository pagination.

## Change invalidation

Role replacement writes revocation rows and new assignment rows rather than rewriting history.
Employee unlink writes an end instant rather than deleting the relationship. Link, unlink, and any
role-set change delete the affected account's PostgreSQL sessions in the same transaction. A no-op
role replacement preserves sessions. Manager-assignment scope is queried on every authorization
decision, so current relationship changes do not depend on session or browser-cache expiry.

Audit events for these changes remain owned by `WL-305`; account/employee lifecycle command routes
and eligible non-self actor checks remain owned by `WL-900`. The repository mutation methods are
not public HTTP authorization bypasses: application services must obtain the corresponding policy
grant before invoking them.

## Verification evidence

Policy unit tests cover owner, unrelated employee, current/former manager, inactive employee
capability, HR/system separation, combined-role self-prohibition, cross-organization denial,
account self-role denial, and collection-scope derivation.

PostgreSQL integration evidence applies all four migrations and proves:

- active link uniqueness and the 35-table migrated schema;
- active/inactive account and employee-capability resolution;
- current manager access and former-manager denial;
- unrelated and cross-organization denial;
- HR non-self grant plus combined-role self-adjustment denial;
- technical-only system access without domain access;
- scope-before-pagination for a manager report collection; and
- immediate role/unlink visibility, preserved history, and transactional session revocation.

The shared migration fixture now installs `btree_gist` explicitly in `public`. This keeps the
database-level extension independent from disposable per-test schemas and prevents one concurrent
fixture cleanup from invalidating another fixture's cached extension functions.

## Remaining work

`WL-304` owns public request schemas, stable API error envelopes, request IDs, and transport mapping
of `ACCESS_DENIED` to explicit `403` responses. `WL-305` owns audience-separated audit records and
atomic security/domain audit writes. `WL-400` owns accessible permission-denied route behavior;
`WL-900` owns audited account, employee-link, role, and manager-assignment administration flows.
