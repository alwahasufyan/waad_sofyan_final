import { openWaadPrintWindow } from './printLayout';

/**
 * Export data to PDF file
 * Simple implementation using browser print
 * @param {Array<string>} columns - Column headers
 * @param {Array<Array>} rows - Row data
 * @param {string} title - Document title
 * @param {string} filename - Filename without extension
 * @param {Object} options - Export options
 * @param {string} options.companyName - Company name for header (from CompanySettingsContext)
 * @param {string} options.primaryColor - Brand color for styling
 * @param {string} options.logoBase64 - Base64 encoded logo image
 */
export const exportToPDF = (columns, rows, title = 'Export', filename = 'export', options = {}) => {
  if (!rows || rows.length === 0) {
    console.warn('No data to export');
    return;
  }

  const { companyName, primaryColor = '#4a4a4a', logoBase64 } = options;

  const tableBody = `
    <table>
      <thead>
        <tr>${columns.map((col) => `<th>${col}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? '-'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;

  const printed = openWaadPrintWindow({
    title,
    subtitle: `تقرير مُصدَّر: ${filename}`,
    contentHtml: tableBody,
    companyName,
    logoUrl: logoBase64,
    primaryColor,
    footerNote: `${companyName ? `${companyName} - ` : ''}تم الإنشاء: ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US')}`
  });

  if (!printed) {
    console.error('Could not open print window. Please check popup blocker settings.');
  }
};

export default exportToPDF;
