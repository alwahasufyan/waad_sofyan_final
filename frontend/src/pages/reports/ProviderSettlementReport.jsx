import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Skeleton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput
} from '@mui/material';
import {
  // PictureAsPdf as PdfIcon, // PDF export disabled - Excel is the official format
  TableChart as ExcelIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  LocalHospital as ProviderIcon,
  FilterList as FilterIcon,
  ClearAll as ClearAllIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon,
  Warning as PartialIcon,
  Receipt as ClaimIcon,
  MedicalServices as ServiceIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { useCompanySettings } from 'contexts/CompanySettingsContext';
import { reportsService } from 'services/api';
// PDF export disabled - Excel is the official reporting format
import { exportToExcel } from 'utils/exportUtils';
import { useAuth } from 'contexts/AuthContext';

/**
 * Provider Settlement Reports - تقارير تسوية مقدمي الخدمة
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              PROVIDER SETTLEMENT REPORTS - CANONICAL IMPLEMENTATION          ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Purpose: Detailed settlement reports for healthcare providers                ║
 * ║ Data: Claims + ClaimLines + Members + MedicalServices + PreAuths             ║
 * ║ Calculation: ALL amounts from Backend (NO client-side math)                  ║
 * ║ Matches: Paper reports (Gross, Net, Rejected, Patient Share)                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Columns (matching paper reports):
 * - رقم المطالبة (Claim Number)
 * - رقم الموافقة (Pre-Auth Number)
 * - اسم المريض (Patient Name)
 * - رقم التأمين (Insurance Number)
 * - الخدمة الطبية (Medical Service)
 * - تاريخ الخدمة (Service Date)
 * - المبلغ الإجمالي Gross
 * - المبلغ المعتمد Net
 * - المبلغ المرفوض
 * - سبب الرفض
 * - حصة المؤمن عليه
 *
 * Permissions:
 * - ADMIN/FINANCE: Can view any provider
 * - PROVIDER: Can only view their own provider (no filter selector)
 */
const ProviderSettlementReport = () => {
  const { companyName, primaryColor } = useCompanySettings();
  const { user } = useAuth();
  const printRef = useRef(null);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Expanded claims (for collapsible rows)
  const [expandedClaims, setExpandedClaims] = useState({});

  // Filters
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [claimNumberFilter, setClaimNumberFilter] = useState('');
  const [preAuthNumberFilter, setPreAuthNumberFilter] = useState('');

  const STATUS_OPTIONS = [
    { value: 'SUBMITTED', label: 'مقدم' },
    { value: 'UNDER_REVIEW', label: 'قيد المراجعة' },
    { value: 'NEEDS_CORRECTION', label: 'يحتاج تصحيح' },
    { value: 'APPROVAL_IN_PROGRESS', label: 'جاري معالجة الموافقة' },
    { value: 'APPROVED', label: 'معتمدة' },
    { value: 'BATCHED', label: 'ضمن دفعة تسوية' },
    { value: 'SETTLED', label: 'مسددة/مدفوعة' },
    { value: 'REJECTED', label: 'مرفوضة' }
  ];

  const statusLabelByValue = useMemo(
    () => STATUS_OPTIONS.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {}),
    []
  );

  const getStatusLabel = useCallback((statusValue) => statusLabelByValue[statusValue] || statusValue, [statusLabelByValue]);

  const setQuickDateRange = useCallback((preset) => {
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(now.toISOString().split('T')[0]);
      return;
    }

    if (preset === 'PREVIOUS_MONTH') {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(to.toISOString().split('T')[0]);
      return;
    }

    if (preset === 'THIS_YEAR') {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(now.toISOString().split('T')[0]);
      return;
    }

    setDateFrom('');
    setDateTo('');
  }, []);

  // Check if user is admin or provider
  const isAdmin = useMemo(() => {
    const adminRoles = ['SUPER_ADMIN', 'ACCOUNTANT', 'MEDICAL_REVIEWER'];
    return adminRoles.includes(user?.role);
  }, [user?.role]);

  // Fetch available providers
  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ['providers-for-settlement-report'],
    queryFn: async () => {
      const response = await reportsService.getProvidersForSettlementReport();
      return response || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const providers = useMemo(() => providersData || [], [providersData]);

  // Auto-select first provider if only one available (for provider users)
  useEffect(() => {
    if (providers.length === 1 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId]);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    if (!selectedProviderId) {
      setError('يرجى اختيار مقدم الخدمة');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        providerId: selectedProviderId,
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        claimNumber: claimNumberFilter || undefined,
        preAuthNumber: preAuthNumberFilter || undefined
      };

      const data = await reportsService.getProviderSettlementReport(params);
      setReportData(data);

      // Expand all claims by default
      const expanded = {};
      (data?.claims || []).forEach((claim) => {
        expanded[claim.claimId] = true;
      });
      setExpandedClaims(expanded);
    } catch (err) {
      console.error('Error fetching provider settlement report:', err);
      setError(err.userMessage || err.message || 'فشل في تحميل التقرير');
    } finally {
      setLoading(false);
    }
  }, [selectedProviderId, dateFrom, dateTo, selectedStatuses, claimNumberFilter, preAuthNumberFilter]);

  // Auto-fetch when provider changes
  useEffect(() => {
    if (selectedProviderId) {
      fetchReport();
    }
  }, [selectedProviderId]); // Only on provider change, not all filters

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `تقرير_تسوية_${reportData?.providerName || 'مقدم_الخدمة'}_${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; font-size: 10px; }
        .no-print { display: none !important; }
        table { page-break-inside: auto; font-size: 9px; }
        tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        .MuiChip-root { font-size: 8px; }
      }
    `
  });

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData?.claims) return;

    // Flatten data for Excel export
    const flatData = [];
    reportData.claims.forEach((claim) => {
      claim.lines.forEach((line) => {
        flatData.push({
          'رقم المطالبة': claim.claimNumber,
          'رقم الموافقة': claim.preAuthNumber || '-',
          'اسم المنتفع': claim.patientNameArabic || claim.patientName,
          'رقم التأمين': claim.insuranceNumber || '-',
          'الخدمة الطبية': line.serviceNameArabic || line.serviceName,
          'تاريخ الخدمة': line.serviceDate,
          الكمية: line.quantity,
          'سعر الوحدة': line.unitPrice,
          'المبلغ الإجمالي (Gross)': line.grossAmount,
          'المبلغ المعتمد (Net)': line.approvedAmount,
          'المبلغ المرفوض': line.rejectedAmount,
          'سبب الرفض': line.rejectionReason || '-',
          'حصة المؤمن': claim.patientShare || 0,
          الحالة: line.lineStatusArabic
        });
      });
      // Add subtotal row for claim
      flatData.push({
        'رقم المطالبة': `إجمالي المطالبة ${claim.claimNumber}`,
        'المبلغ الإجمالي (Gross)': claim.grossAmount,
        'المبلغ المعتمد (Net)': claim.netAmount,
        'المبلغ المرفوض': claim.rejectedAmount,
        'حصة المؤمن': claim.patientShare || 0,
        'مستحق للمرفق': (claim.netAmount || 0) - (claim.patientShare || 0),
        الحالة: claim.statusArabic
      });
    });

    // Add grand totals row
    flatData.push({
      'رقم المطالبة': '=== الإجمالي الكلي ===',
      'المبلغ الإجمالي (Gross)': reportData.totalRequestedAmount,
      'المبلغ المعتمد (Net)': reportData.totalApprovedAmount,
      'المبلغ المرفوض': reportData.totalRejectedAmount,
      'حصة المؤمن': reportData.totalPatientShare,
      'مستحق للمرفق': reportData.netProviderAmount
    });

    const fileName = `تقرير_تسوية_${reportData.providerName || 'مقدم_الخدمة'}_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(flatData, fileName, {
      companyName,
      reportTitle: 'تقرير تسوية مقدم الخدمة',
      summaryCards: [
        {
          label: 'إجمالي المطلوب (Gross)',
          value: formatCurrency(reportData.totalRequestedAmount),
          bgColor: '#E0F2FE',
          textColor: '#0369A1'
        },
        {
          label: 'إجمالي المعتمد (Net)',
          value: formatCurrency(reportData.totalApprovedAmount),
          bgColor: '#ECFDF5',
          textColor: '#047857'
        },
        {
          label: 'إجمالي المرفوض',
          value: formatCurrency(reportData.totalRejectedAmount),
          bgColor: '#FEE2E2',
          textColor: '#B91C1C'
        },
        {
          label: 'حصة المنتفع',
          value: formatCurrency(reportData.totalPatientShare),
          bgColor: '#FEF3C7',
          textColor: '#B45309'
        },
        {
          label: 'صافي المستحق للمرفق',
          value: formatCurrency(reportData.netProviderAmount),
          bgColor: '#0F766E',
          textColor: '#FFFFFF'
        }
      ],
      footerNotes: [
        'عليه، يرجى من سيادتكم تسوية الملاحظات والنواقص خلال مدة أقصاها أسبوعين من تاريخ الاستلام لتسوية القيمة المستحقة نهائياً.',
        'والسلام عليكم - قسم المراجعة والتدقيق'
      ]
    });
  };

  // PDF export disabled - Excel is the official reporting format
  // const handleExportPDF = () => {
  //   if (!reportData?.claims) return;
  //
  //   const flatData = [];
  //   reportData.claims.forEach(claim => {
  //     claim.lines.forEach(line => {
  //       flatData.push({
  //         'رقم المطالبة': claim.claimNumber,
  //         'الخدمة': line.serviceNameArabic || line.serviceName,
  //         'Gross': line.grossAmount,
  //         'Net': line.approvedAmount,
  //         'مرفوض': line.rejectedAmount
  //       });
  //     });
  //   });
  //
  //   const title = `تقرير تسوية ${reportData.providerName}`;
  //   exportToPDF(flatData, title, { companyName, primaryColor });
  // };

  // Toggle claim expansion
  const toggleClaimExpansion = (claimId) => {
    setExpandedClaims((prev) => ({
      ...prev,
      [claimId]: !prev[claimId]
    }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedStatuses([]);
    setClaimNumberFilter('');
    setPreAuthNumberFilter('');
  };

  const handleStatusesChange = (event) => {
    const value = event.target.value;
    if (value.includes('__ALL__')) {
      setSelectedStatuses([]);
      return;
    }
    setSelectedStatuses(value);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount == null) return '0.000 د.ل';
    return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ل`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US');
    } catch {
      return dateStr;
    }
  };

  // Get status chip color
  const getStatusChipProps = (status) => {
    switch (status) {
      case 'APPROVED':
        return { color: 'success', icon: <ApprovedIcon fontSize="small" /> };
      case 'PARTIAL':
        return { color: 'warning', icon: <PartialIcon fontSize="small" /> };
      case 'REJECTED':
        return { color: 'error', icon: <RejectedIcon fontSize="small" /> };
      case 'PENDING':
        return { color: 'info', icon: <PendingIcon fontSize="small" /> };
      default:
        return { color: 'default', icon: null };
    }
  };

  return (
    <MainCard>
      {/* Header */}
      <ModernPageHeader
        titleKey="تقارير تسوية مقدمي الخدمة"
        titleIcon={<ProviderIcon />}
        subtitleKey="تقرير مفصل على مستوى الخدمة/السطر يطابق التقارير الورقية"
        actions={
          <Stack direction="row" spacing={1} className="no-print">
            <Tooltip title="تحديث">
              <IconButton onClick={fetchReport} disabled={loading || !selectedProviderId}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="طباعة">
              <IconButton onClick={handlePrint} disabled={!reportData}>
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="تصدير Excel">
              <IconButton onClick={handleExportExcel} disabled={!reportData}>
                <ExcelIcon />
              </IconButton>
            </Tooltip>
            {/* PDF export disabled - Excel is the official reporting format */}
          </Stack>
        }
      />

      {/* Filters */}
      <Card sx={{ mb: 3 }} className="no-print">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Provider Selector - only for admin */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>مقدم الخدمة *</InputLabel>
                <Select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  input={<OutlinedInput label="مقدم الخدمة *" />}
                  disabled={!isAdmin && providers.length === 1}
                >
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.name || provider.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date From */}
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="من تاريخ"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Date To */}
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="إلى تاريخ"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  multiple
                  value={selectedStatuses}
                  onChange={handleStatusesChange}
                  input={<OutlinedInput label="الحالة" />}
                  renderValue={(selected) =>
                    selected.length === 0 ? 'جميع الحالات (بما فيها المدفوعة)' : selected.map((status) => getStatusLabel(status)).join('، ')
                  }
                >
                  <MenuItem value="__ALL__">جميع الحالات</MenuItem>
                  {STATUS_OPTIONS.map((statusOption) => (
                    <MenuItem key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Claim Number Filter */}
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="رقم المطالبة"
                value={claimNumberFilter}
                onChange={(e) => setClaimNumberFilter(e.target.value)}
              />
            </Grid>

            {/* PreAuth Number Filter */}
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="رقم الموافقة"
                value={preAuthNumberFilter}
                onChange={(e) => setPreAuthNumberFilter(e.target.value)}
              />
            </Grid>

            {/* Actions */}
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1}>
                <Tooltip title="بحث">
                  <IconButton color="primary" onClick={fetchReport} disabled={loading || !selectedProviderId}>
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="مسح الفلاتر">
                  <IconButton onClick={handleResetFilters}>
                    <ClearAllIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>

            {/* Quick Date Presets */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="هذا الشهر" variant="outlined" clickable onClick={() => setQuickDateRange('THIS_MONTH')} />
                <Chip label="الشهر السابق" variant="outlined" clickable onClick={() => setQuickDateRange('PREVIOUS_MONTH')} />
                <Chip label="من بداية السنة" variant="outlined" clickable onClick={() => setQuickDateRange('THIS_YEAR')} />
                <Chip label="كل الفترات" variant="outlined" clickable onClick={() => setQuickDateRange('ALL_TIME')} />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Report Content */}
      <Box ref={printRef}>
        {loading ? (
          <Box>
            <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={400} />
          </Box>
        ) : reportData ? (
          <>
            {/* Report Header */}
            <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Typography variant="h5" fontWeight="bold">
                      {companyName || 'شركة وعد لإدارة النفقات الطبية'}
                    </Typography>
                    <Typography variant="body2">رقم التقرير: {reportData.reportNumber}</Typography>
                    <Typography variant="body2">التاريخ: {formatDate(reportData.reportDate)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4} textAlign="center">
                    <Typography variant="h6">تقرير تسوية مقدم الخدمة</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {reportData.providerName}
                    </Typography>
                    <Typography variant="body2">
                      الفترة: {formatDate(reportData.fromDate)} - {formatDate(reportData.toDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">عدد المطالبات: {reportData.totalClaimsCount}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Summary KPIs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} md={2}>
                <Card sx={{ bgcolor: 'info.lighter', textAlign: 'center', p: 1 }}>
                  <Typography variant="caption" color="info.main">
                    إجمالي المطلوب (Gross)
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="info.dark">
                    {formatCurrency(reportData.totalRequestedAmount)}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card sx={{ bgcolor: 'success.lighter', textAlign: 'center', p: 1 }}>
                  <Typography variant="caption" color="success.main">
                    إجمالي المعتمد (Net)
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.dark">
                    {formatCurrency(reportData.totalApprovedAmount)}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card sx={{ bgcolor: 'error.lighter', textAlign: 'center', p: 1 }}>
                  <Typography variant="caption" color="error.main">
                    إجمالي المرفوض
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="error.dark">
                    {formatCurrency(reportData.totalRejectedAmount)}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card sx={{ bgcolor: 'warning.lighter', textAlign: 'center', p: 1 }}>
                  <Typography variant="caption" color="warning.main">
                    حصة المنتفع
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="warning.dark">
                    {formatCurrency(reportData.totalPatientShare)}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: 'primary.main', textAlign: 'center', p: 1, color: 'white' }}>
                  <Typography variant="caption">صافي المستحق للمرفق</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(reportData.netProviderAmount)}
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Claims Table with Line Details */}
            <TableContainer component={Paper}>
              <Table size="small" sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.200' }}>
                    <TableCell width={40}></TableCell>
                    <TableCell>رقم المطالبة</TableCell>
                    <TableCell>رقم الموافقة</TableCell>
                    <TableCell>اسم المنتفع</TableCell>
                    <TableCell>رقم التأمين</TableCell>
                    <TableCell>تاريخ الخدمة</TableCell>
                    <TableCell align="right">Gross</TableCell>
                    <TableCell align="right">Net</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      مرفوض
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main' }}>
                      حصة المؤمن
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      مستحق للمرفق
                    </TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.claims?.map((claim) => (
                    <React.Fragment key={`claim-${claim.claimId}`}>
                      {/* Claim Row */}
                      <TableRow
                        sx={{
                          bgcolor: 'grey.50',
                          '&:hover': { bgcolor: 'action.hover' },
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleClaimExpansion(claim.claimId)}
                      >
                        <TableCell>
                          <IconButton size="small">{expandedClaims[claim.claimId] ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <ClaimIcon fontSize="small" color="primary" />
                            <Typography fontWeight="bold">{claim.claimNumber}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{claim.preAuthNumber || '-'}</TableCell>
                        <TableCell>{claim.patientNameArabic || claim.patientName}</TableCell>
                        <TableCell>{claim.insuranceNumber || '-'}</TableCell>
                        <TableCell>{formatDate(claim.serviceDate)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(claim.grossAmount)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {formatCurrency(claim.netAmount)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                          {formatCurrency(claim.rejectedAmount)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                          {formatCurrency(claim.patientShare)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                          {formatCurrency((claim.netAmount || 0) - (claim.patientShare || 0))}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={claim.statusArabic || claim.status} {...getStatusChipProps(claim.status)} />
                        </TableCell>
                      </TableRow>

                      {/* Service Lines (Collapsible) */}
                      <TableRow>
                        <TableCell colSpan={12} sx={{ p: 0 }}>
                          <Collapse in={expandedClaims[claim.claimId]} timeout="auto" unmountOnExit>
                            <Box sx={{ pl: 6, pr: 2, py: 1, bgcolor: 'background.default' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>الخدمة الطبية</TableCell>
                                    <TableCell align="center">الكمية</TableCell>
                                    <TableCell align="right">سعر الوحدة</TableCell>
                                    <TableCell align="right">Gross</TableCell>
                                    <TableCell align="right">Net</TableCell>
                                    <TableCell align="right" sx={{ color: 'error.main' }}>
                                      مرفوض
                                    </TableCell>
                                    <TableCell>سبب الرفض</TableCell>
                                    <TableCell>الحالة</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {claim.lines?.map((line) => (
                                    <TableRow key={`line-${line.lineId}`}>
                                      <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                          <ServiceIcon fontSize="small" color="secondary" />
                                          <Typography variant="body2">{line.serviceNameArabic || line.serviceName}</Typography>
                                        </Stack>
                                      </TableCell>
                                      <TableCell align="center">{line.quantity}</TableCell>
                                      <TableCell align="right">{formatCurrency(line.unitPrice)}</TableCell>
                                      <TableCell align="right">{formatCurrency(line.grossAmount)}</TableCell>
                                      <TableCell align="right" sx={{ color: 'success.main' }}>
                                        {formatCurrency(line.approvedAmount)}
                                      </TableCell>
                                      <TableCell align="right" sx={{ color: 'error.main' }}>
                                        {formatCurrency(line.rejectedAmount)}
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" color="error.main">
                                          {line.rejectionReason || '-'}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          size="small"
                                          label={line.lineStatusArabic || line.lineStatus}
                                          {...getStatusChipProps(line.lineStatus)}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}

                  {/* Grand Total Row */}
                  {reportData.claims?.length > 0 && (
                    <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                      <TableCell colSpan={6}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          الإجمالي الكلي ({reportData.totalClaimsCount} مطالبة)
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {formatCurrency(reportData.totalRequestedAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                          {formatCurrency(reportData.totalApprovedAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                          {formatCurrency(reportData.totalRejectedAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                          {formatCurrency(reportData.totalPatientShare)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                          {formatCurrency(reportData.netProviderAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer Note */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" textAlign="center">
                عليه، يرجى من سيادتكم تسوية الملاحظات والنواقص خلال مدة أقصاها أسبوعين من تاريخ الاستلام لتسوية القيمة المستحقة نهائياً.
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" textAlign="center" display="block">
                والسلام عليكم - قسم المراجعة والتدقيق
              </Typography>
            </Box>
          </>
        ) : (
          <Alert severity="info">يرجى اختيار مقدم الخدمة والنقر على بحث لعرض التقرير</Alert>
        )}
      </Box>
    </MainCard>
  );
};

export default ProviderSettlementReport;
