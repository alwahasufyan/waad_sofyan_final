package com.waad.tba.modules.claim.entity;

/**
 * Defines the source of the claim creation.
 * Used to distinguish between normal portal claims and backlog migrations.
 */
public enum ClaimSource {
    /**
     * Normal claim submitted via provider portal or system
     */
    NORMAL("اعتيادي"),
    
    /**
     * Backlog claim entered manually via the admin dashboard
     */
    MANUAL_BACKLOG("إدخال يدوي - متراكم"),
    
    /**
     * Backlog claim imported via Excel
     */
    EXCEL_BACKLOG("استيراد إكسل - متراكم");

    private final String labelAr;

    ClaimSource(String labelAr) {
        this.labelAr = labelAr;
    }

    public String getLabelAr() {
        return labelAr;
    }
}
