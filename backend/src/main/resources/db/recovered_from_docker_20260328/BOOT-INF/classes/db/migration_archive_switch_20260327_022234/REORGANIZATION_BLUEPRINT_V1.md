# Migration Reorganization Blueprint (Sequential Numbering)

## Goal
Adopt a clean migration structure with strictly sequential versions:
- `V1`, `V2`, `V3`, ...
- No gaps like `V10`, `V20`, `V30`
- No "fix migration for previous migration" pattern

This blueprint is designed for development environments with no real production data.

## New Naming Standard
- `V1__foundation_sequences_and_core_identity.sql`
- `V2__providers_and_allowed_employers.sql`
- `V3__users_auth_tokens_and_login_audit.sql`
- `V4__system_config_feature_flags_module_access.sql`
- `V5__medical_taxonomy_categories_services_codes.sql`
- `V6__provider_contracts_and_pricing.sql`
- `V7__benefit_policies_and_rules.sql`
- `V8__members_coverage_and_import.sql`
- `V9__visits_and_eligibility_checks.sql`
- `V10__preauthorizations.sql`
- `V11__claims_and_claim_lines.sql`
- `V12__financial_accounts_and_settlement.sql`
- `V13__indexes_and_performance.sql`
- `V14__seed_initial_reference_data.sql`

## Consolidation Rules
1. Each migration must represent a domain final shape (create-first).
2. Do not keep patch/fix migrations if the same change can be folded into the domain file.
3. Keep constraints, indexes, and defaults in final form inside the owning domain migration.
4. If a table belongs to one domain, all related junction tables should stay in that domain file.
5. Cross-domain references are allowed via FK, but table ownership stays domain-based.

## Role and User-Type Rule
Final `users.user_type` constraint must include:
- `SUPER_ADMIN`
- `INSURANCE_ADMIN`
- `EMPLOYER_ADMIN`
- `MEDICAL_REVIEWER`
- `PROVIDER_STAFF`
- `ACCOUNTANT`
- `FINANCE_VIEWER`
- `DATA_ENTRY`

## Practical Execution Plan
1. Freeze current migrations and copy them to `db/migration_archive_v1/`.
2. Build new sequential set in `db/migration/` using only `V1`..`V14`.
3. Remove legacy fix migrations from active path.
4. Reset local DB and run Flyway from empty state.
5. Start backend and validate critical modules:
   - users/rbac
   - providers/contracts
   - members
   - preauthorizations
   - claims
   - settlement
6. If clean, prepare same reset strategy for server environment.

## Acceptance Criteria
- Flyway applies all migrations from `V1` to latest without error.
- No post-create repair migration is needed for schema correctness.
- No duplicate or conflicting constraints/indexes.
- Core API smoke checks pass after migration.

## Notes
- Existing file count before consolidation: 85 migration files.
- Existing consolidated baseline (`V200`) can be used as source material, but target output must be fully renumbered sequentially (`V1..Vn`).
