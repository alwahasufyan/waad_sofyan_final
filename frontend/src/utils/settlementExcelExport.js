import ExcelJS from 'exceljs';

const applyCellBorder = (cell, color) => {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } }
  };
};

const styleTitleRow = (worksheet, range, value, font = {}) => {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(':')[0]);
  cell.value = value;
  cell.font = font;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
};

const styleHeaderRow = (row, fillColor) => {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(cell, 'FFCBD5E1');
  });
};

const styleDataRow = (row, numericColumns = [], wrapColumns = []) => {
  row.eachCell((cell, colNumber) => {
    applyCellBorder(cell, 'FFE2E8F0');

    if (numericColumns.includes(colNumber)) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      return;
    }

    cell.alignment = {
      horizontal: wrapColumns.includes(colNumber) ? 'right' : 'center',
      vertical: 'middle',
      wrapText: wrapColumns.includes(colNumber)
    };
  });
};

const styleTotalsRow = (row, numericColumns = []) => {
  row.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    applyCellBorder(cell, 'FF94A3B8');

    if (numericColumns.includes(colNumber)) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      return;
    }

    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
};

const downloadWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const exportProviderAccountTransactionsToExcel = async ({ providerName, transactions, exportDate }) => {
  const rows = Array.isArray(transactions) ? transactions : [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TBA WAAD System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('حركات الحساب', {
    views: [{ rightToLeft: true }],
    properties: { defaultRowHeight: 22 }
  });

  worksheet.columns = [
    { key: 'createdAt', width: 20 },
    { key: 'transactionTypeLabel', width: 18 },
    { key: 'creditAmount', width: 14 },
    { key: 'debitAmount', width: 14 },
    { key: 'runningBalanceAfter', width: 16 },
    { key: 'reference', width: 18 },
    { key: 'description', width: 44 }
  ];

  styleTitleRow(worksheet, 'A1:G1', `حركات حساب مقدم الخدمة - ${providerName || '-'}`, { bold: true, size: 14 });
  styleTitleRow(worksheet, 'A2:G2', `تاريخ التصدير: ${exportDate || new Date().toLocaleString('ar-LY')}`, {
    size: 10,
    color: { argb: 'FF666666' }
  });

  const headerRowNumber = 4;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.values = ['التاريخ', 'نوع الحركة', 'الدائن', 'المدين', 'رصيد الحركة', 'المرجع', 'الوصف'];
  styleHeaderRow(headerRow, 'FF0D9488');

  rows.forEach((tx) => {
    const row = worksheet.addRow({
      createdAt: tx.createdAt,
      transactionTypeLabel: tx.transactionTypeLabel,
      creditAmount: tx.creditAmount,
      debitAmount: tx.debitAmount,
      runningBalanceAfter: tx.runningBalanceAfter,
      reference: tx.reference,
      description: tx.description
    });
    styleDataRow(row, [3, 4, 5], [7]);
  });

  const totals = rows.reduce(
    (acc, tx) => {
      acc.credit += Number(tx.creditAmount) || 0;
      acc.debit += Number(tx.debitAmount) || 0;
      return acc;
    },
    { credit: 0, debit: 0 }
  );

  const totalsRow = worksheet.addRow({
    createdAt: '',
    transactionTypeLabel: 'الإجماليات',
    creditAmount: totals.credit,
    debitAmount: totals.debit,
    runningBalanceAfter: totals.credit - totals.debit,
    reference: '',
    description: ''
  });
  styleTotalsRow(totalsRow, [3, 4, 5]);

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowNumber }];

  const datePart = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `حركات_${providerName || 'provider'}_${datePart}`);
};

export const exportAccountsListToExcel = async ({ accounts = [] }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TBA WAAD System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('قائمة الحسابات', {
    views: [{ rightToLeft: true }],
    properties: { defaultRowHeight: 22 }
  });

  worksheet.columns = [
    { key: 'providerName', width: 28 },
    { key: 'providerType', width: 16 },
    { key: 'runningBalance', width: 16 },
    { key: 'totalApproved', width: 16 },
    { key: 'totalPaid', width: 16 },
    { key: 'gapAmount', width: 16 },
    { key: 'coveragePercent', width: 14 },
    { key: 'lastActivityAt', width: 20 },
    { key: 'pendingClaimsCount', width: 14 }
  ];

  styleTitleRow(worksheet, 'A1:I1', 'الدفعات المالية لمقدمي الخدمة', { bold: true, size: 14 });
  styleTitleRow(worksheet, 'A2:I2', `تاريخ التصدير: ${new Date().toLocaleString('ar-LY')}`, {
    size: 10,
    color: { argb: 'FF666666' }
  });

  const headerRowNumber = 4;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.values = ['مقدم الخدمة', 'النوع', 'الرصيد الحالي', 'إجمالي المعتمد', 'إجمالي المدفوع', 'فجوة السداد', 'نسبة السداد %', 'آخر حركة', 'مطالبات معلقة'];
  styleHeaderRow(headerRow, 'FF0A4D8C');

  accounts.forEach((acc) => {
    const row = worksheet.addRow({
      providerName: acc.providerName || `مقدم خدمة #${acc.providerId}`,
      providerType: acc.providerType || '-',
      runningBalance: Number(acc.runningBalance) || 0,
      totalApproved: Number(acc.totalApproved) || 0,
      totalPaid: Number(acc.totalPaid) || 0,
      gapAmount: Number(acc.gapAmount) || Math.max((Number(acc.totalApproved) || 0) - (Number(acc.totalPaid) || 0), 0),
      coveragePercent:
        Number(acc.coveragePercent) ||
        ((Number(acc.totalApproved) || 0) > 0 ? ((Number(acc.totalPaid) || 0) / (Number(acc.totalApproved) || 0)) * 100 : 0),
      lastActivityAt: acc.lastActivityAt || acc.updatedAt || acc.createdAt || '-',
      pendingClaimsCount: acc.pendingClaimsCount ?? acc.transactionCount ?? 0
    });
    styleDataRow(row, [3, 4, 5, 6], []);
    row.getCell(7).numFmt = '0.0';
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowNumber }];

  const datePart = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `الدفعات_المالية_${datePart}`);
};

export default {
  exportProviderAccountTransactionsToExcel,
  exportAccountsListToExcel
};
