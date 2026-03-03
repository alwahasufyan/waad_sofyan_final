package com.waad.tba.modules.systemadmin.service;

/**
 * Service interface for user password management
 * Self-service operations only - users change their own password
 * 
 * NOT for admin operations (no changing other users' passwords)
 */
public interface UserPasswordService {
    
    /**
     * Change password for the authenticated user
     * 
     * @param username The username of the authenticated user
     * @param currentPassword The current password for verification
     * @param newPassword The new password to set
     * @throws BusinessRuleException if current password is incorrect
     * @throws BusinessRuleException if new password is same as current
     * @throws BusinessRuleException if user not found
     */
    void changePassword(String username, String currentPassword, String newPassword);
}
