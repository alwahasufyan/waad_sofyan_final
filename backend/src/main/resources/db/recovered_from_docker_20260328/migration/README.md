# migration (Sequential Reorganization Track)

This folder is the new sequential migration track based on the approved blueprint.

## Current status
- `V1__foundation_full_schema.sql`: foundation-only (sequences + employers).
- `V2__providers_and_allowed_employers.sql`: executable providers domain.
- `V3__users_auth_tokens_and_login_audit.sql`: executable users/auth domain.
- `V4__system_config_feature_flags_module_access.sql`: executable system config domain.
- `V5__medical_taxonomy_and_catalog.sql`: executable medical taxonomy domain.
- `V6__provider_contracts_and_pricing.sql`: executable provider operations/pricing domain.
- `V7__benefit_policies_and_rules.sql`: executable benefit policies/contracts domain.
- `V8__members_coverage_and_import.sql`: executable members/import domain.
- `V9__visits_and_eligibility_checks.sql`: executable visits/eligibility domain.
- `V10__preauthorizations.sql`: executable preauthorization domain.
- `V11__claims_and_claim_lines.sql`: executable claims domain.
- `V12__financial_accounts_and_settlement.sql`: executable financial ledger domain.
- `V13__indexes_and_performance.sql`: executable performance index domain.
- `V14__seed_initial_reference_data.sql`: executable consolidated seed/reference data (feature flags, system settings, taxonomy roots/subcategories, claim rejection reasons, email default).

## Notes
- Legacy migrations were archived under timestamped archive folders.
- Active Flyway path remains `classpath:db/migration`.

## Why this folder exists
To implement and validate the new clean migration flow safely before replacing legacy `db/migration`.

## Numbering rule
Strict sequential versions:
- `V1`, `V2`, `V3`, ...

No gaps like `V010`, `V020`, `V200`.

## Next steps
1. Run full Flyway bootstrap test on empty DB.
2. Resolve any ordering or FK issues discovered during bootstrap.
3. Add seed data into V14 only when business requires reference inserts.
