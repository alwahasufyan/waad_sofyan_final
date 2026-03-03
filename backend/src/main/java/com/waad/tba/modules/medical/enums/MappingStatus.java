package com.waad.tba.modules.medical.enums;

/**
 * Lifecycle states for a provider service mapping.
 *
 * <ul>
 *   <li>{@code PENDING} — raw service imported, no mapping decision made yet</li>
 *   <li>{@code AUTO_MATCHED} — system found an exact match in medical_services or aliases</li>
 *   <li>{@code MANUAL_CONFIRMED} — a DATA_ENTRY / SUPER_ADMIN user confirmed the mapping</li>
 *   <li>{@code REJECTED} — mapping was explicitly rejected; service cannot be mapped</li>
 * </ul>
 */
public enum MappingStatus {
    PENDING,
    AUTO_MATCHED,
    MANUAL_CONFIRMED,
    REJECTED
}
