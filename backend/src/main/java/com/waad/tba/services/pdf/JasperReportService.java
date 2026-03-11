package com.waad.tba.services.pdf;

import lombok.extern.slf4j.Slf4j;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.engine.util.JRLoader;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimplePdfExporterConfiguration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * JasperReports Service — Complex Financial PDF Reports
 *
 * Usage:
 * 1. Design the report in Jaspersoft Studio → save as .jrxml in
 * resources/reports/
 * 2. Call generatePdf("reports/my-report.jrxml", params, dataList)
 * 3. Returns PDF bytes ready to stream to the client
 */
@Slf4j
@Service
public class JasperReportService {

    /**
     * Generate PDF from a .jrxml template file.
     *
     * @param jrxmlPath  Classpath path to the .jrxml file (e.g.
     *                   "reports/settlement-report.jrxml")
     * @param parameters Parameters passed to the report (headers, totals, dates,
     *                   etc.)
     * @param dataSource Collection of row beans for the main table (can be empty
     *                   list for param-only reports)
     * @return PDF as byte array
     */
    public byte[] generatePdf(String jrxmlPath, Map<String, Object> parameters, Collection<?> dataSource) {
        log.info("[JasperReportService] Generating report: {}", jrxmlPath);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            // 1. Load and compile the .jrxml template
            InputStream jrxmlStream = new ClassPathResource(jrxmlPath).getInputStream();
            JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlStream);

            // 2. Prepare parameters (merge provided params with defaults)
            Map<String, Object> reportParams = buildParams(parameters);

            // 3. Fill the report with data
            JRBeanCollectionDataSource jrDataSource = new JRBeanCollectionDataSource(
                    dataSource != null ? dataSource : java.util.List.of());
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, reportParams, jrDataSource);

            // 4. Export to PDF
            JRPdfExporter exporter = new JRPdfExporter();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));

            SimplePdfExporterConfiguration config = new SimplePdfExporterConfiguration();
            config.setCreatingBatchModeBookmarks(false);
            exporter.setConfiguration(config);

            exporter.exportReport();

            byte[] pdfBytes = outputStream.toByteArray();
            log.info("[JasperReportService] Report generated: {} bytes", pdfBytes.length);
            return pdfBytes;

        } catch (Exception e) {
            log.error("[JasperReportService] Failed to generate report: {}", jrxmlPath, e);
            throw new RuntimeException("Failed to generate Jasper report: " + e.getMessage(), e);
        }
    }

    /**
     * Generate PDF from a pre-compiled .jasper file (faster — skip compile step).
     * Use this in production after compiling the .jrxml once.
     *
     * @param jasperPath Classpath path to the compiled .jasper file
     */
    public byte[] generatePdfFromCompiled(String jasperPath, Map<String, Object> parameters, Collection<?> dataSource) {
        log.info("[JasperReportService] Generating from compiled report: {}", jasperPath);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            InputStream jasperStream = new ClassPathResource(jasperPath).getInputStream();
            JasperReport jasperReport = (JasperReport) JRLoader.loadObject(jasperStream);

            Map<String, Object> reportParams = buildParams(parameters);

            JRBeanCollectionDataSource jrDataSource = new JRBeanCollectionDataSource(
                    dataSource != null ? dataSource : java.util.List.of());

            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, reportParams, jrDataSource);

            JRPdfExporter exporter = new JRPdfExporter();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));
            exporter.exportReport();

            return outputStream.toByteArray();

        } catch (Exception e) {
            log.error("[JasperReportService] Failed to generate compiled report: {}", jasperPath, e);
            throw new RuntimeException("Failed to generate Jasper report: " + e.getMessage(), e);
        }
    }

    // ─── Private Helpers ────────────────────────────────────────────────────────

    private Map<String, Object> buildParams(Map<String, Object> provided) {
        Map<String, Object> params = new HashMap<>();
        // Inject SUBREPORT_DIR so sub-reports can reference each other
        params.put("SUBREPORT_DIR", "reports/");
        if (provided != null) {
            params.putAll(provided);
        }
        return params;
    }
}
