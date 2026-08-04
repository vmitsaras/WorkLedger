# Review Checklists

## Domain review

- Does the implementation use the schedule/policy valid on the target date?
- Are durations integer minutes?
- Are elapsed times derived from instants?
- Are local dates derived through explicit timezone?
- Are overnight and DST cases tested?
- Are breaks excluded exactly once?
- Are raw events preserved?
- Does every balance change have a source ledger entry?
- Are incomplete and conflict states structured?
- Are locked periods protected?

## API review

- Is input validated?
- Is output serialized through a schema/contract?
- Is authentication required?
- Is resource authorization checked?
- Is self-approval blocked?
- Is the transaction boundary correct?
- Is idempotency required and implemented?
- Are stale versions handled?
- Is the error code stable and safe?
- Is audit behavior present?

## Database review

- Is there a generated migration?
- Are nullability and defaults intentional?
- Are unique/check/foreign-key constraints useful here?
- Are common filters indexed?
- Can cascade behavior destroy history?
- Are effective-date overlaps prevented or validated transactionally?
- Does the query apply organization and permission scope before pagination?
- Is test cleanup isolated?

## React/UI review

- Is the component using the correct semantic element?
- Is a link still a link and an action still a button?
- Is accessible name/description correct?
- Can keyboard users complete the flow?
- Is focus moved only when necessary?
- Are validation errors linked and summarized?
- Is dynamic feedback announced without noise?
- Is status more than color?
- Are loading, empty, error, permission, and stale states present?
- Does narrow layout remain understandable?
- Is motion reduced appropriately?
- Has React Aria behavior been preserved?

## Security/privacy review

- Could an actor change the target identifier to access another record?
- Does a former manager retain access accidentally?
- Could a system admin see HR data unnecessarily?
- Could logs/errors/audit include sickness details or secrets?
- Could CSV content execute as a formula?
- Could a mutation replay or race create duplicates?
- Could a privileged adjustment occur without reason?
- Could an attachment become public?
- Does deactivation revoke sessions?

## Documentation review

- Does the README explain the user problem, not only packages?
- Are commands current and verified?
- Are architecture decisions consistent with code?
- Are accessibility notes specific?
- Are known limitations honest?
- Are migration/config changes documented?
- Are task status and next task updated?
