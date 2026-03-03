import ExcelJS from 'exceljs';

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
    { header: 'التاريخ', key: 'createdAt', width: 24 },
    { header: 'نوع الحركة', key: 'transactionTypeLabel', width: 16 },
    { header: 'الدائن', key: 'creditAmount', width: 14 },
    { header: 'المدين', key: 'debitAmount', width: 14 },
    { header: 'رصيد الحركة', key: 'runningBalanceAfter', width: 16 },
    { header: 'المرجع', key: 'reference', width: 18 },
    { header: 'الوصف', key: 'description', width: 70 }
  ];

  worksheet.mergeCells('A1:G1');
  worksheet.getCell('A1').value = `حركات حساب مقدم الخدمة - ${providerName || '-'}`;
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:G2');
  worksheet.getCell('A2').value = `تاريخ التصدير: ${exportDate || new Date().toLocaleString('ar-LY')}`;
  worksheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  const headerRowNumber = 4;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

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

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: colNumber === 7 ? 'right' : 'center', vertical: 'middle', wrapText: colNumber === 7 };
      }
    });
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
    transactionTypeLabel: '',
    creditAmount: totals.credit,
    debitAmount: totals.debit,
    runningBalanceAfter: totals.credit - totals.debit,
    reference: '',
    description: ''
  });

  totalsRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
    if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowNumber }];

  const datePart = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(workbook, `حركات_${providerName || 'provider'}_${datePart}`);
};

export default {
  exportProviderAccountTransactionsToExcel
};
