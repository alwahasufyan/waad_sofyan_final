import { forwardRef } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Settlement Print Report (matches the exact paper provided by Waad TPA)
 * Designed for Financial Settlements (Accountants)
 */
const SettlementPrintReport = forwardRef(({ batch, items }, ref) => {
    if (!batch || !items || items.length === 0) return null;

    // Calculate Global Stats
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    items.forEach(item => {
        // Use what's available in the settlement items
        const gross = Number(item.grossAmountSnapshot ?? item.claimAmount ?? item.approvedAmount ?? 0);
        const net = Number(item.netAmountSnapshot ?? item.approvedAmount ?? item.claimAmount ?? 0);

        // Anything not paid (deductions / adjustments applied during settlement)
        const deductions = gross - net >= 0 ? gross - net : 0;

        totalGross += gross;
        totalNet += net;
        totalDeductions += deductions;
    });

    const formatLYD = (val) => `${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ل`;

    const printDate = new Date().toISOString().split('T')[0];
    const batchCode = batch?.batchNumber || `SETTLEMENT-${batch?.id || ''}`;
    const providerName = batch?.providerName || '________________';

    return (
        <div ref={ref} style={{ display: 'none' }} className="print-content-wrapper">
            <style type="text/css" media="print">
                {`
                    @page { size: A4 portrait; margin: 15mm; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; direction: rtl; }
                    .print-content-wrapper { display: block !important; padding: 0; margin: 0; background: #fff !important; }
                    .page-break { page-break-after: always; }
                    .print-header { text-align: center; margin-bottom: 30px; }
                    .print-title { font-size: 18px; font-weight: bold; color: #000; }
                    .meta-info { display: flex; justify-content: space-between; font-size: 11px; color: #000; margin-bottom: 40px; }
                    .summary-section { margin-top: 40px; font-size: 13px; line-height: 2; margin-right: 20px; }
                    .summary-line { margin-bottom: 8px; }
                    .summary-line strong { margin-left: 10px; }
                    
                    table.print-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; margin-top: 20px; }
                    table.print-table th { padding: 8px; border: 1px solid #000; font-weight: bold; background: #fff !important; color: #000 !important; }
                    table.print-table td { padding: 6px; border: 1px solid #000; color: #000 !important; }
                    
                    .global-total { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; font-weight: bold; }
                    .gt-col { flex: 1; padding: 12px; text-align: center; border: 1px solid #000; }
                    .gt-col.gross { background: #fff !important; border-right: none; }
                    .gt-col.net { background: #fff !important; border-right: none; border-left: none; }
                    .gt-col.deductions { background: #fff !important; color: #000 !important; border-left: none; }
                    
                    /* Hide everything else on the page during print */
                    @media print {
                        body * { visibility: hidden; }
                        .print-content-wrapper, .print-content-wrapper * { visibility: visible; }
                        .print-content-wrapper { position: absolute; left: 0; top: 0; width: 100%; }
                    }
                `}
            </style>

            {/* PAGE 1: COVER / SUMMARY */}
            <div className="page-break">
                <div className="print-header">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                        <div style={{ width: 60, height: 40, border: '3px solid #000', borderRadius: '50%', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 10, left: 10, width: 20, height: 10, background: '#000', borderRadius: '10px' }}></div>
                        </div>
                    </div>
                    <div className="print-title">شركة وعد لإدارة النفقات الطبية</div>
                    <div style={{ fontSize: '14px', marginTop: '5px' }}>تقرير التسوية المالية الموحد</div>
                </div>

                <div className="meta-info">
                    <div>
                        التاريخ: {printDate} <br />
                        الصفحة 1
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        {batchCode}
                    </div>
                </div>

                <Box sx={{ mt: 6, mb: 4, fontWeight: 'bold', fontSize: '15px' }}>
                    السادة مقدمي الخدمة: {providerName}
                </Box>

                <Typography variant="body2" sx={{ lineHeight: 2, fontSize: '13px' }}>
                    نود إفادتكم بأنه تم إعداد بيان التسوية المالية الخاص بكم بموجب دفعة رقم <strong>{batchCode}</strong>، حيث تم احتساب مستحقاتكم بناءً على المطالبات المقدمة والمعتمدة. وفيما يلي ملخص حسابات التسوية:
                </Typography>

                <div className="summary-section">
                    <div className="summary-line">
                        • عدد المطالبات المُجَمّعة: <strong>[{items.length}]</strong> مطالبة
                    </div>
                    <div className="summary-line">
                        • إجمالي المبالغ الأصلية (له): <strong>{formatLYD(totalGross)}</strong>
                    </div>
                    <div className="summary-line">
                        • إجمالي الخصومات / الاقتطاعات (عليه): <strong>{formatLYD(totalDeductions)}</strong>
                    </div>
                    <div className="summary-line">
                        • نسبة الخصم الإجمالية: <strong>{totalGross > 0 ? ((totalDeductions / totalGross) * 100).toFixed(2) : 0}%</strong>
                    </div>
                    <div className="summary-line" style={{ marginTop: '15px', fontSize: '15px' }}>
                        • صافي المستحق للدفع: <strong style={{ textDecoration: 'underline' }}>{formatLYD(totalNet)}</strong>
                    </div>
                    {batch?.paymentReference && (
                        <div className="summary-line" style={{ marginTop: '10px' }}>
                            • مرجع الدفع: <strong>{batch.paymentReference}</strong>
                        </div>
                    )}
                </div>

                <Box sx={{ mt: 10, fontSize: '13px', textAlign: 'center' }}>
                    اعتماد قسم الإدارة المالية <br /><br />
                    ______________________
                </Box>
            </div>

            {/* PAGE 2+: DETAILED LISTING */}
            <div>
                <div className="print-header" style={{ marginBottom: '15px' }}>
                    <div className="print-title" style={{ fontSize: '15px' }}>كشف تفصيلي بمطالبات دفعة التسوية</div>
                </div>

                <div className="meta-info" style={{ marginBottom: '15px' }}>
                    <div>
                        التاريخ: {printDate} <br />
                        الصفحة 2
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {batchCode}
                    </div>
                </div>

                <table className="print-table">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>م</th>
                            <th style={{ width: '15%' }}>رقم المطالبة</th>
                            <th style={{ width: '25%' }}>المستفيد</th>
                            <th style={{ width: '15%' }}>تاريخ الخدمة</th>
                            <th style={{ width: '15%' }}>المبلغ الأصلي (له)</th>
                            <th style={{ width: '10%' }}>الاستقطاع (عليه)</th>
                            <th style={{ width: '15%' }}>صافي الدفع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const gross = Number(item.grossAmountSnapshot ?? item.claimAmount ?? item.approvedAmount ?? 0);
                            const net = Number(item.netAmountSnapshot ?? item.approvedAmount ?? item.claimAmount ?? 0);
                            const deductions = gross - net >= 0 ? gross - net : 0;

                            return (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.claimNumber || '-'}</td>
                                    <td style={{ textAlign: 'right' }}>{item.memberName || '-'}</td>
                                    <td>{new Date(item.serviceDate || new Date()).toLocaleDateString('en-GB')}</td>
                                    <td>{formatLYD(gross)}</td>
                                    <td>{formatLYD(deductions)}</td>
                                    <td>{formatLYD(net)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="global-total">
                    <div style={{ flex: 1, padding: '12px', textAlign: 'center', border: '1px solid #000', borderRight: 'none' }}>الإجماليات (TOTAL)</div>
                    <div className="gt-col gross" style={{ padding: '12px', minWidth: '15%' }}>{formatLYD(totalGross)}</div>
                    <div className="gt-col deductions" style={{ padding: '12px', minWidth: '10%' }}>{formatLYD(totalDeductions)}</div>
                    <div className="gt-col net" style={{ padding: '12px', minWidth: '15%' }}>{formatLYD(totalNet)}</div>
                </div>
            </div>
        </div>
    );
});

export default SettlementPrintReport;
