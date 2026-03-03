package com.waad.tba.services.pdf.config;

import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * PDF Font Configuration with Arabic RTL Support
 * 
 * Loads custom Arabic fonts (Amiri) from classpath resources.
 * Lazy initialization - fonts loaded only when first PDF is generated.
 * 
 * OpenPDF supports RTL using BaseFont.IDENTITY_H encoding.
 * 
 * @since 2026-01-07
 */
@Slf4j
@Component
@Getter
public class PdfFontConfig {
    
    private BaseFont arabicBaseFont;
    private BaseFont arabicBoldBaseFont;
    private BaseFont latinBaseFont;
    private BaseFont latinBoldBaseFont;
    
    private Font arabicNormalFont;
    private Font arabicBoldFont;
    private Font arabicSmallFont;
    private Font latinNormalFont;
    private Font latinBoldFont;
    private Font latinSmallFont;
    
    private static final int NORMAL_SIZE = 11;
    private static final int TITLE_SIZE = 16;
    private static final int SMALL_SIZE = 9;
    
    private volatile boolean initialized = false;
    
    /**
     * Lazy initialization - called on first PDF generation
     */
    private synchronized void ensureInitialized() {
        if (initialized) {
            return;
        }
        
        try {
            loadFonts();
            createFontVariants();
            initialized = true;
            log.info("✅ PDF fonts loaded from classpath");
        } catch (Exception e) {
            log.error("❌ Failed to load fonts", e);
            fallbackToDefaults();
            initialized = true;
        }
    }
    
    private void loadFonts() throws Exception {
        // Load Arabic fonts from classpath
        arabicBaseFont = loadFontFromClasspath("fonts/Amiri-Regular.ttf", "Amiri-Regular");
        arabicBoldBaseFont = loadFontFromClasspath("fonts/Amiri-Bold.ttf", "Amiri-Bold");
        
        // Load Latin fonts (built-in)
        latinBaseFont = BaseFont.createFont(
            BaseFont.HELVETICA,
            BaseFont.CP1252,
            BaseFont.NOT_EMBEDDED
        );
        
        latinBoldBaseFont = BaseFont.createFont(
            BaseFont.HELVETICA_BOLD,
            BaseFont.CP1252,
            BaseFont.NOT_EMBEDDED
        );
    }
    
    private BaseFont loadFontFromClasspath(String path, String fontName) throws Exception {
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new Exception("Font not found: " + path);
        }
        
        try (InputStream is = resource.getInputStream()) {
            byte[] fontBytes = is.readAllBytes();
            return BaseFont.createFont(
                fontName + ".ttf",
                BaseFont.IDENTITY_H,  // Unicode RTL support
                BaseFont.EMBEDDED,
                true,
                fontBytes,
                null
            );
        }
    }
    
    private void createFontVariants() {
        // Arabic font variants
        arabicNormalFont = new Font(arabicBaseFont, NORMAL_SIZE);
        arabicBoldFont = new Font(arabicBoldBaseFont, NORMAL_SIZE, Font.BOLD);
        arabicSmallFont = new Font(arabicBaseFont, SMALL_SIZE);
        
        // Latin font variants
        latinNormalFont = new Font(latinBaseFont, NORMAL_SIZE);
        latinBoldFont = new Font(latinBoldBaseFont, NORMAL_SIZE, Font.BOLD);
        latinSmallFont = new Font(latinBaseFont, SMALL_SIZE);
    }
    
    private void fallbackToDefaults() {
        try {
            latinBaseFont = BaseFont.createFont(
                BaseFont.HELVETICA,
                BaseFont.CP1252,
                BaseFont.NOT_EMBEDDED
            );
            
            arabicBaseFont = latinBaseFont;
            arabicBoldBaseFont = latinBaseFont;
            latinBoldBaseFont = latinBaseFont;
            
            arabicNormalFont = new Font(arabicBaseFont, NORMAL_SIZE);
            arabicBoldFont = new Font(arabicBoldBaseFont, NORMAL_SIZE, Font.BOLD);
            arabicSmallFont = new Font(arabicBaseFont, SMALL_SIZE);
            latinNormalFont = new Font(latinBaseFont, NORMAL_SIZE);
            latinBoldFont = new Font(latinBoldBaseFont, NORMAL_SIZE, Font.BOLD);
            latinSmallFont = new Font(latinBaseFont, SMALL_SIZE);
            
            log.warn("⚠️ Using fallback fonts (Helvetica only)");
        } catch (Exception e) {
            log.error("❌ Critical: Cannot load default fonts", e);
        }
    }
    
    /**
     * Get appropriate font based on text content
     * Auto-detects Arabic vs Latin text
     */
    public Font getFont(String text, boolean bold) {
        ensureInitialized();
        
        if (text == null || text.isEmpty()) {
            return latinNormalFont;
        }
        
        // Check if text contains Arabic characters
        boolean hasArabic = text.chars().anyMatch(c -> 
            (c >= 0x0600 && c <= 0x06FF) ||  // Arabic
            (c >= 0x0750 && c <= 0x077F) ||  // Arabic Supplement
            (c >= 0xFB50 && c <= 0xFDFF) ||  // Arabic Presentation Forms A
            (c >= 0xFE70 && c <= 0xFEFF)     // Arabic Presentation Forms B
        );
        
        if (hasArabic) {
            return bold ? arabicBoldFont : arabicNormalFont;
        } else {
            return bold ? latinBoldFont : latinNormalFont;
        }
    }
    
    /**
     * Get font by size and style
     */
    public Font getFont(int size, boolean bold, boolean isArabic) {
        ensureInitialized();
        
        BaseFont baseFont = isArabic ? arabicBaseFont : latinBaseFont;
        return new Font(baseFont, size, bold ? Font.BOLD : Font.NORMAL);
    }
    
    // Getters that ensure initialization
    public Font getArabicNormalFont() {
        ensureInitialized();
        return arabicNormalFont;
    }
    
    public Font getArabicBoldFont() {
        ensureInitialized();
        return arabicBoldFont;
    }
    
    public Font getArabicSmallFont() {
        ensureInitialized();
        return arabicSmallFont;
    }
    
    public Font getLatinNormalFont() {
        ensureInitialized();
        return latinNormalFont;
    }
    
    public Font getLatinBoldFont() {
        ensureInitialized();
        return latinBoldFont;
    }
    
    public Font getLatinSmallFont() {
        ensureInitialized();
        return latinSmallFont;
    }
}
