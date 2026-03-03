package com.waad.tba.common.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Email Service Implementation
 * 
 * Environment-aware implementation:
 * - Logs emails in development
 * - Can be configured for real sending in production
 * 
 * FROM address: support@alwahacare.com
 */
@Slf4j
@Service
public class EmailServiceImpl implements EmailService {
    
    private static final String FROM_EMAIL = "support@alwahacare.com";
    private static final String FROM_NAME = "AlwahaCareSecurity";
    
    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;
    
    @Value("${spring.profiles.active:dev}")
    private String activeProfile;
    
    @Override
    public void sendEmailVerification(EmailVerificationData data) {
        String subject = "Verify Your Email - AlwahaCare System";
        String body = buildVerificationEmail(data);
        sendEmail(data.recipientEmail(), subject, body);
    }
    
    @Override
    public void sendPasswordReset(PasswordResetData data) {
        String subject = "Password Reset Request - AlwahaCare System";
        String body = buildPasswordResetEmail(data);
        sendEmail(data.recipientEmail(), subject, body);
    }
    
    @Override
    public void sendAccountLocked(AccountLockedData data) {
        String subject = "Account Locked - AlwahaCare System";
        String body = buildAccountLockedEmail(data);
        sendEmail(data.recipientEmail(), subject, body);
    }
    
    @Override
    public void sendEmail(String to, String subject, String body) {
        if ("dev".equalsIgnoreCase(activeProfile) || "test".equalsIgnoreCase(activeProfile)) {
            // Development/Test: Log email instead of sending
            log.info("=".repeat(60));
            log.info("EMAIL (Dev Mode - Not Actually Sent)");
            log.info("=".repeat(60));
            log.info("From: {} <{}>", FROM_NAME, FROM_EMAIL);
            log.info("To: {}", to);
            log.info("Subject: {}", subject);
            log.info("-".repeat(60));
            log.info("Body:\n{}", body);
            log.info("=".repeat(60));
        } else {
            // Production: Real email sending (requires SMTP configuration)
            log.info("Sending email to {} from {}", to, FROM_EMAIL);
            // TODO: Implement real email sending via JavaMailSender
            // For now, log as well
            log.warn("Production email sending not yet configured. Email logged:");
            log.info("To: {}, Subject: {}", to, subject);
        }
    }
    
    private String buildVerificationEmail(EmailVerificationData data) {
        return """
            Dear %s,
            
            Thank you for registering with AlwahaCare System.
            
            Please verify your email address by clicking the link below:
            
            %s
            
            Or use this verification code: %s
            
            This link will expire in 24 hours.
            
            If you did not create this account, please ignore this email.
            
            Best regards,
            AlwahaCare Security Team
            
            ---
            This is an automated message from support@alwahacare.com
            Please do not reply to this email.
            """.formatted(
                data.recipientName(),
                data.verificationUrl(),
                data.verificationToken()
            );
    }
    
    private String buildPasswordResetEmail(PasswordResetData data) {
        return """
            Dear %s,
            
            We received a request to reset your password for your AlwahaCare account.
            
            Click the link below to reset your password:
            
            %s
            
            Or use this reset code: %s
            
            This link will expire in 1 hour.
            
            If you did not request a password reset, please ignore this email or contact support if you have concerns.
            
            Best regards,
            AlwahaCare Security Team
            
            ---
            This is an automated message from support@alwahacare.com
            Please do not reply to this email.
            """.formatted(
                data.recipientName(),
                data.resetUrl(),
                data.resetToken()
            );
    }
    
    private String buildAccountLockedEmail(AccountLockedData data) {
        return """
            Dear %s,
            
            Your AlwahaCare account has been locked due to %d failed login attempts.
            
            Your account will automatically unlock at: %s
            
            If you did not attempt to login, please contact support immediately at support@alwahacare.com
            
            To unlock your account sooner, please contact your system administrator.
            
            Best regards,
            AlwahaCare Security Team
            
            ---
            This is an automated message from support@alwahacare.com
            Please do not reply to this email.
            """.formatted(
                data.recipientName(),
                data.failedAttempts(),
                data.lockedUntil()
            );
    }
}
