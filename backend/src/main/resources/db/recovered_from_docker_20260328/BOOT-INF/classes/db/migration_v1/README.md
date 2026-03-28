# migration_v1 (Sequential Reorganization Track)

This folder is the new sequential migration track based on the approved blueprint.

## Current status
- `V1__foundation_full_schema.sql`: created from consolidated baseline and adjusted for current role model.
- `V2__providers_and_allowed_employers.sql`: temporary no-op (execution-safe while V1 is full baseline).
- `V3__users_auth_tokens_and_login_audit.sql`: temporary no-op (execution-safe while V1 is full baseline).
- `V4..V14`: sequential scaffold files created for domain-based consolidation.

## Draft extraction files
- `drafts/V2__providers_and_allowed_employers.draft.sql`
- `drafts/V3__users_auth_tokens_and_login_audit.draft.sql`

These hold the extracted domain SQL and will be promoted back to executable migrations
only after corresponding sections are removed from `V1__foundation_full_schema.sql`.

## Why this folder exists
To implement and validate the new clean migration flow safely before replacing legacy `db/migration`.

## Numbering rule
Strict sequential versions:
- `V1`, `V2`, `V3`, ...

No gaps like `V010`, `V020`, `V200`.

## How to test this track locally (without touching legacy)
Override Flyway locations in local profile/environment:
- `spring.flyway.locations=classpath:db/migration_v1`

Then reset local DB and run backend startup.

## Next steps
1. Split V1 into domain files (`V1..V14`) per blueprint.
2. Validate clean startup from empty DB.
3. Replace active migration path when validated.
