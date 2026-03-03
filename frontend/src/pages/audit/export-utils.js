/**
 * Export Utilities for Audit Log
 * تصدير سجلات التدقيق إلى PDF و Excel
 */

import jsPDF from 'jspdf';
import { exportToExcel as exportToExcelUnified } from 'utils/exportUtils';

/**
 * Get action label in Arabic
 */
const getActionLabel = (action) => {
  const labels = {
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    APPROVE: 'موافقة',
    REJECT: 'رفض',
    CANCEL: 'إلغاء',
    DELETE: 'حذف',
    STATUS_CHANGE: 'تغيير الحالة'
  };
  return labels[action] || action;
};

/**
 * Format date to Arabic
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Export audit data to PDF
 * تصدير سجلات التدقيق إلى PDF
 */
export const exportToPDF = (auditData) => {
  const doc = new jsPDF();

  // Set font (Note: jsPDF default doesn't support Arabic well, but we'll do our best)
  doc.setFontSize(16);
  doc.text('Audit Log / سجل التدقيق', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 105, 30, { align: 'center' });
  doc.text(`Total Records: ${auditData.length}`, 105, 35, { align: 'center' });

  let yPosition = 50;

  auditData.forEach((audit, index) => {
    // Action and Reference
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${index + 1}. ${getActionLabel(audit.action)}`, 20, yPosition);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Reference Number
    yPosition += 6;
    doc.text(`Reference: ${audit.referenceNumber || audit.preAuthorizationId || '-'}`, 30, yPosition);

    // User
    yPosition += 5;
    doc.text(`User: ${audit.changedBy || '-'}`, 30, yPosition);

    // Date
    yPosition += 5;
    doc.text(`Date: ${formatDate(audit.changeDate)}`, 30, yPosition);

    // Notes
    if (audit.notes) {
      yPosition += 5;
      const splitNotes = doc.splitTextToSize(`Notes: ${audit.notes}`, 170);
      doc.text(splitNotes, 30, yPosition);
      yPosition += splitNotes.length * 5;
    }

    // Field Changes
    if (audit.fieldName) {
      yPosition += 5;
      doc.text(`Field: ${audit.fieldName}`, 30, yPosition);
      yPosition += 5;
      doc.text(`Old: ${audit.oldValue || '-'} → New: ${audit.newValue || '-'}`, 40, yPosition);
    }

    yPosition += 10;

    // Add new page if needed
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
  });

  // Save PDF
  doc.save(`audit-log-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export audit data to Excel
 * تصدير سجلات التدقيق إلى Excel
 */
export const exportToExcel = async (auditData) => {
  const normalizedData = (auditData || []).map((audit, index) => ({
    index: index + 1,
    action: getActionLabel(audit.action),
    reference: audit.referenceNumber || audit.preAuthorizationId || '-',
    user: audit.changedBy || '-',
    date: formatDate(audit.changeDate),
    notes: audit.notes || '-',
    field: audit.fieldName || '-',
    oldValue: audit.oldValue || '-',
    newValue: audit.newValue || '-'
  }));

  return exportToExcelUnified(normalizedData, `audit-log-${new Date().toISOString().split('T')[0]}`, {
    reportTitle: 'سجل التدقيق',
    columns: [
      { key: 'index', header: '#', width: 8, type: 'number' },
      { key: 'action', header: 'الإجراء / Action', width: 18, type: 'string' },
      { key: 'reference', header: 'رقم المرجع / Reference', width: 24, type: 'string' },
      { key: 'user', header: 'المستخدم / User', width: 20, type: 'string' },
      { key: 'date', header: 'التاريخ / Date', width: 20, type: 'string' },
      { key: 'notes', header: 'الملاحظات / Notes', width: 36, type: 'string' },
      { key: 'field', header: 'الحقل / Field', width: 18, type: 'string' },
      { key: 'oldValue', header: 'القيمة القديمة / Old Value', width: 24, type: 'string' },
      { key: 'newValue', header: 'القيمة الجديدة / New Value', width: 24, type: 'string' }
    ]
  });
};
