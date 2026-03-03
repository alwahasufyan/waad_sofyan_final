package com.waad.tba.modules.preauthorization.service;

import com.waad.tba.modules.preauthorization.entity.PreAuthorizationAttachment;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationAttachmentRepository;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing PreAuthorization Attachments
 * Handles file upload, download, and deletion
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PreAuthorizationAttachmentService {

    private final PreAuthorizationAttachmentRepository attachmentRepository;
    private final PreAuthorizationRepository preAuthorizationRepository;

    @Value("${app.upload.path:uploads}")
    private String uploadPath;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    /**
     * Upload attachment to a pre-authorization
     */
    @Transactional
    public PreAuthorizationAttachment uploadAttachment(Long preAuthorizationId, MultipartFile file, String attachmentType, String uploadedBy) {
        // Validate pre-authorization exists
        if (!preAuthorizationRepository.existsById(preAuthorizationId)) {
            throw new IllegalArgumentException("Pre-authorization not found: " + preAuthorizationId);
        }

        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed (10MB)");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File type not allowed: " + contentType);
        }

        try {
            // Create directory structure
            String directoryPath = uploadPath + "/pre-authorizations/" + preAuthorizationId;
            Path directory = Paths.get(directoryPath);
            Files.createDirectories(directory);

            // Generate unique filename
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName != null && originalFileName.contains(".") 
                    ? originalFileName.substring(originalFileName.lastIndexOf("."))
                    : "";
            String storedFileName = UUID.randomUUID().toString() + extension;
            
            // Save file
            Path filePath = directory.resolve(storedFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Create attachment record
            PreAuthorizationAttachment attachment = PreAuthorizationAttachment.builder()
                    .preAuthorizationId(preAuthorizationId)
                    .originalFileName(originalFileName)
                    .storedFileName(storedFileName)
                    .filePath(filePath.toString())
                    .fileType(contentType)
                    .fileSize(file.getSize())
                    .attachmentType(attachmentType)
                    .createdBy(uploadedBy)
                    .build();

            PreAuthorizationAttachment saved = attachmentRepository.save(attachment);
            log.info("✅ Uploaded attachment {} for pre-authorization {} by {}", saved.getId(), preAuthorizationId, uploadedBy);
            
            return saved;

        } catch (IOException e) {
            log.error("Failed to upload attachment: {}", e.getMessage());
            throw new RuntimeException("Failed to save file: " + e.getMessage());
        }
    }

    /**
     * Get all attachments for a pre-authorization
     */
    public List<PreAuthorizationAttachment> getAttachments(Long preAuthorizationId) {
        return attachmentRepository.findByPreAuthorizationId(preAuthorizationId);
    }

    /**
     * Get single attachment by ID
     */
    public PreAuthorizationAttachment getAttachment(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found: " + attachmentId));
    }

    /**
     * Download attachment content
     */
    public byte[] downloadAttachment(Long attachmentId) {
        PreAuthorizationAttachment attachment = getAttachment(attachmentId);
        
        try {
            Path filePath = Paths.get(attachment.getFilePath());
            if (!Files.exists(filePath)) {
                throw new RuntimeException("File not found on disk: " + attachment.getOriginalFileName());
            }
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            log.error("Failed to read attachment {}: {}", attachmentId, e.getMessage());
            throw new RuntimeException("Failed to read file: " + e.getMessage());
        }
    }

    /**
     * Delete attachment
     */
    @Transactional
    public void deleteAttachment(Long attachmentId) {
        PreAuthorizationAttachment attachment = getAttachment(attachmentId);
        
        try {
            // Delete physical file
            Path filePath = Paths.get(attachment.getFilePath());
            Files.deleteIfExists(filePath);
            
            // Delete record
            attachmentRepository.delete(attachment);
            log.info("✅ Deleted attachment {} from pre-authorization {}", 
                    attachmentId, attachment.getPreAuthorizationId());
            
        } catch (IOException e) {
            log.error("Failed to delete attachment file: {}", e.getMessage());
            // Still delete the record even if file deletion fails
            attachmentRepository.delete(attachment);
        }
    }

    /**
     * Count attachments for a pre-authorization
     */
    public long countAttachments(Long preAuthorizationId) {
        return attachmentRepository.countByPreAuthorizationId(preAuthorizationId);
    }
}
