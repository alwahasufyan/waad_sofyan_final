package com.waad.tba.modules.report.service;

import com.lowagie.text.pdf.BaseFont;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Entities;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.xhtmlrenderer.pdf.ITextRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
public class PdfExportService {

    private static final Logger log = LoggerFactory.getLogger(PdfExportService.class);
    private static final char RTL_EMBED = '\u202B';
    private static final char POP_DIRECTIONAL = '\u202C';

    public byte[] generatePdfFromHtml(String html) throws Exception {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            ITextRenderer renderer = new ITextRenderer();

            registerFontIfExists(renderer, "fonts/Amiri-Regular.ttf");
            registerFontIfExists(renderer, "fonts/Amiri-Bold.ttf");

            String sanitizedHtml = sanitizeHtmlForPdf(html);
            renderer.setDocumentFromString(sanitizedHtml);
            renderer.layout();
            renderer.createPDF(outputStream);
            return outputStream.toByteArray();
        }
    }

    private String sanitizeHtmlForPdf(String html) {
        if (html == null) {
            return "<html><body></body></html>";
        }

        String sanitized = html;
        if (!sanitized.isEmpty() && sanitized.charAt(0) == '\uFEFF') {
            sanitized = sanitized.substring(1);
        }

        int firstTagIndex = sanitized.indexOf('<');
        if (firstTagIndex > 0) {
            sanitized = sanitized.substring(firstTagIndex);
        }

        sanitized = sanitized.stripLeading();

        Document document = Jsoup.parse(sanitized);
        applyRtlEmbedding(document);
        document.outputSettings()
            .syntax(Document.OutputSettings.Syntax.xml)
            .escapeMode(Entities.EscapeMode.xhtml)
            .charset(StandardCharsets.UTF_8)
            .prettyPrint(false);

        return document.html();
    }

    private void registerFontIfExists(ITextRenderer renderer, String resourcePath) {
        try {
            ClassPathResource fontResource = new ClassPathResource(resourcePath);
            if (!fontResource.exists()) {
                log.warn("Optional font not found: {}. Falling back to default PDF fonts.", resourcePath);
                return;
            }

            try {
                File file = fontResource.getFile();
                renderer.getFontResolver().addFont(file.getAbsolutePath(), BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
                return;
            } catch (Exception ignored) {
                // Continue with temp extraction for resources inside packaged jars.
            }

            String suffix = resourcePath.toLowerCase().endsWith(".ttf") ? ".ttf" : ".font";
            Path tempFont = Files.createTempFile("waad-font-", suffix);
            tempFont.toFile().deleteOnExit();

            try (InputStream in = fontResource.getInputStream()) {
                Files.copy(in, tempFont, StandardCopyOption.REPLACE_EXISTING);
            }

            renderer.getFontResolver().addFont(tempFont.toAbsolutePath().toString(), BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            log.info("Loaded PDF font from classpath: {}", resourcePath);
        } catch (Exception ex) {
            log.warn("Unable to load optional font '{}'. Falling back to default PDF fonts. Reason: {}", resourcePath, ex.getMessage());
        }
    }

    private void applyRtlEmbedding(Node node) {
        for (Node child : node.childNodes()) {
            if (child instanceof TextNode textNode) {
                String text = textNode.getWholeText();
                if (containsArabic(text) && !isAlreadyEmbedded(text)) {
                    textNode.text(RTL_EMBED + text + POP_DIRECTIONAL);
                }
            } else {
                applyRtlEmbedding(child);
            }
        }
    }

    private boolean containsArabic(String text) {
        if (text == null || text.isBlank()) return false;
        return text.chars().anyMatch(c ->
            (c >= 0x0600 && c <= 0x06FF) ||
            (c >= 0x0750 && c <= 0x077F) ||
            (c >= 0x08A0 && c <= 0x08FF) ||
            (c >= 0xFB50 && c <= 0xFDFF) ||
            (c >= 0xFE70 && c <= 0xFEFF)
        );
    }

    private boolean isAlreadyEmbedded(String text) {
        return text.indexOf(RTL_EMBED) >= 0 && text.indexOf(POP_DIRECTIONAL) >= 0;
    }
}
