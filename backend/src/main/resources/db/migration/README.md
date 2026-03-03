# Database Migration Guide - Clean Rebaseline

## Migration Structure (Post-Rebaseline)

**5 clean, logical migrations** instead of incremental patches.

| Migration | Tables | Purpose |
|-----------|--------|---------|
| **V1__core_schema.sql** | 11 | Employers, providers, users, audit, settings |
| **V2__security_schema.sql** | 5 | RBAC: roles, permissions, mappings |
| **V3__medical_catalog.sql** | 9 | Medical taxonomy, pricing |
| **V4__business_entities.sql** | 22 | Members, policies, visits, claims |
| **V5__financial_and_indexes.sql** | 0 | Performance indexes & constraints |

**Total:** 47 tables, 5 migrations, 2,403 lines

## Fresh Install

```bash
createdb tba_waad_system
cd backend
mvn flyway:migrate
```

## Architecture

✅ **Employer-only model** - Single business entity  
✅ **Financial hardening** - Optimistic locking, immutable ledger  
✅ **Performance** - 42 indexes, partial indexes  

## Archived

V2.x migrations (22 files) archived in `archive/v2_migrations/`

---
**Updated:** 2026-02-14 | **Version:** V1-V5
