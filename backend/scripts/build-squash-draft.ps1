param(
    [string]$RepoRoot = "D:\waad_sofyan_final"
)

$ErrorActionPreference = 'Stop'

$src = Join-Path $RepoRoot 'backend/src/main/resources/db/migration'
$dst = Join-Path $RepoRoot 'backend/src/main/resources/db/migration_squash_draft'

if (Test-Path $dst) {
    Remove-Item -Recurse -Force $dst
}
New-Item -ItemType Directory -Path $dst | Out-Null

function New-SquashFile {
    param(
        [string]$TargetName,
        [string[]]$SourceFiles,
        [string]$Title
    )

    $target = Join-Path $dst $TargetName
    "-- Squashed migration: $TargetName`n-- $Title`n-- Generated: $(Get-Date -Format s)`n" | Set-Content -Path $target -Encoding UTF8

    foreach ($f in $SourceFiles) {
        $path = Join-Path $src $f
        if (-not (Test-Path $path)) {
            throw "Missing source migration: $f"
        }

        Add-Content -Path $target -Value "`n-- ===== BEGIN SOURCE: $f =====`n"
        Get-Content -Path $path | Add-Content -Path $target
        Add-Content -Path $target -Value "`n-- ===== END SOURCE: $f =====`n"
    }
}

# Dependency-safe order (taxonomy before contracts)
New-SquashFile 'V1__foundation_sequences_and_extensions.sql' @(
    'V001__sequences.sql'
) 'Foundation objects and sequences'

New-SquashFile 'V2__identity_users_auth_and_audit.sql' @(
    'V005__schema_employers.sql',
    'V010__schema_users.sql',
    'V011__schema_auth_tokens.sql',
    'V012__schema_login_audit.sql'
) 'Identity, users, auth tokens and login audit'

New-SquashFile 'V3__providers_network_documents.sql' @(
    'V006__schema_providers.sql',
    'V031__schema_provider_mapping.sql'
) 'Provider core, allowed employers, admin docs and mapping'

New-SquashFile 'V4__medical_taxonomy_and_catalog.sql' @(
    'V020__schema_medical_categories.sql',
    'V021__schema_medical_services.sql',
    'V022__schema_medical_specialties.sql',
    'V023__schema_medical_codes.sql',
    'V030__schema_provider_services.sql',
    'V100__medical_catalog_performance_indexes.sql',
    'V101__medical_category_coverage_percent.sql',
    'V106__seed_root_medical_categories.sql',
    'V107__allow_multiple_category_roots.sql',
    'V108__make_specialty_nullable.sql',
    'V232__reset_medical_taxonomy_foundation.sql',
    'V233__normalize_medical_category_display_names_ar.sql',
    'V235__reconcile_medical_services_schema.sql',
    'V236__reconcile_medical_service_categories_schema.sql',
    'V238__add_inpatient_operations_medical_category.sql'
) 'Medical taxonomy and catalog'

New-SquashFile 'V5__provider_contracts_and_pricing.sql' @(
    'V045__schema_provider_contracts.sql',
    'V098__employer_financial_contract_fields.sql',
    'V230__reconcile_provider_allowed_employers_schema.sql',
    'V231__reconcile_provider_contract_pricing_items_schema.sql',
    'V234__add_subcategory_and_specialty_to_provider_contract_pricing_items.sql',
    'V241__add_pricing_item_sub_category_and_specialty.sql',
    'V248__map_pricing_items_categories.sql'
) 'Provider contracts and pricing'

New-SquashFile 'V6__benefit_policies_and_rules.sql' @(
    'V040__schema_benefit_policies.sql',
    'V103__rename_policy_id_to_benefit_policy_id.sql',
    'V228__reconcile_benefit_policy_runtime_schema.sql',
    'V245__add_coverage_percent_db_constraint.sql'
) 'Benefit policies and policy rules'

New-SquashFile 'V7__members_coverage_and_import.sql' @(
    'V050__schema_members.sql',
    'V051__schema_member_import.sql',
    'V229__reconcile_member_runtime_schema.sql'
) 'Members, hierarchy and import'

New-SquashFile 'V8__visits_eligibility_and_preauth.sql' @(
    'V060__schema_visits.sql',
    'V061__schema_eligibility_checks.sql',
    'V065__schema_pre_authorization.sql'
) 'Visits, eligibility and pre-authorization'

New-SquashFile 'V9__claims_and_claim_lines.sql' @(
    'V070__schema_claims.sql',
    'V071__schema_claim_lines.sql',
    'V097__claim_lines_missing_columns.sql',
    'V102__add_complaint_to_claims.sql',
    'V104__fix_draft_claims_net_provider_amount.sql',
    'V105__add_coverage_category_context_to_claims.sql',
    'V109__drop_claims_duplicate_index.sql',
    'V110__add_pricing_item_id_to_claim_lines.sql',
    'V112__add_missing_claim_line_snapshots.sql',
    'V113__fix_claims_cascade_delete.sql',
    'V114__add_claim_batches_system.sql',
    'V210__add_claim_report_settings_columns.sql',
    'V226__schema_claim_rejection_reasons.sql',
    'V239__align_live_claims_status_check.sql',
    'V240__add_claim_soft_delete_metadata.sql',
    'V242__fix_claim_number_nullable.sql',
    'V243__add_claim_full_coverage.sql',
    'V244__add_manual_refused_amount.sql',
    'V246__add_claim_line_refused_breakdown.sql',
    'V247__add_claim_soft_delete_fields.sql'
) 'Claims and claim lines'

New-SquashFile 'V10__financial_accounts_and_settlement.sql' @(
    'V080__schema_financial.sql',
    'V081__schema_settlement.sql',
    'V115__fix_provider_account_corrections.sql',
    'V116__make_settlement_batch_id_nullable.sql',
    'V117__drop_settlement_batch_tables.sql',
    'V237__reconcile_provider_accounts_ledger_schema.sql',
    'V249__add_financial_check_constraints.sql'
) 'Financial accounts and settlement'

New-SquashFile 'V11__system_config_feature_flags_module_access.sql' @(
    'V015__schema_system_config.sql',
    'V095__seed_feature_flags.sql',
    'V220__schema_email_settings.sql',
    'V221__schema_email_preauth_requests.sql',
    'V222__add_service_to_email_request.sql',
    'V223__link_preauth_to_email_request.sql',
    'V224__add_email_filtering_settings.sql',
    'V225__add_sender_name_to_email_requests.sql',
    'V227__reconcile_legacy_runtime_schema.sql'
) 'System config and feature flags'

New-SquashFile 'V12__indexes_and_performance.sql' @(
    'V090__indexes.sql',
    'V111__drop_duplicate_provider_service_price_import_log.sql'
) 'Indexes and performance'

New-SquashFile 'V13__seed_initial_reference_data.sql' @(
    'V20260324.001__ensure_email_preauth_schema.sql'
) 'Initial reference and seed data'

Write-Host "Draft generated at: $dst"
Write-Host "Review and de-duplicate manually before activation."
