/**
 * Settlement Batches List Page - Phase 3B Settlement (Fixed)
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              SETTLEMENT BATCHES LIST - UNIFIED DESIGN                         ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ This page uses MUI DataGrid (same design as SettlementInbox)                  ║
 * ║ Connected to NEW Backend APIs (SettlementBatchController)                     ║
 * ║                                                                               ║
 * ║ Batch Lifecycle:                                                              ║
 * ║ DRAFT → CONFIRMED → PAID                                                     ║
 * ║                                                                               ║
 * ║ BUG FIXES:                                                                    ║
 * ║ ✅ Fixed: Objects as React children - proper string rendering                 ║
 * ║ ✅ Fixed: row.original undefined - now uses DataGrid params.row               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';

// MUI Components
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Chip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

// MUI Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import RefreshIcon from '@mui/icons-material/Refresh';
import DraftsIcon from '@mui/icons-material/Drafts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaidIcon from '@mui/icons-material/Paid';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

// MUI DataGrid - REMOVED, using UnifiedMedicalTable instead

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import PermissionGuard from 'components/PermissionGuard';
import { UnifiedMedicalTable } from 'components/common';

// Services
import { settlementBatchesService } from 'services/api/settlement.service';
import { providersService } from 'services/api';

// Utils
import { exportToExcel, exportToPDF } from 'utils/exportUtils';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Batch Status Configuration
const BATCH_STATUS_CONFIG = {
  DRAFT: {
    label: 'مسودة',
    color: 'warning',
    icon: DraftsIcon,
    description: 'قيد التحضير - يمكن التعديل'
  },
  CONFIRMED: {
    label: 'مؤكد',
    color: 'info',
    icon: CheckCircleIcon,
    description: 'تم التأكيد - جاهز للدفع'
  },
  PAID: {
    label: 'مدفوع',
    color: 'success',
    icon: PaidIcon,
    description: 'تم الدفع - مكتمل'
  }
};

// Status filter options
const STATUS_FILTERS = [
  { value: '', label: 'الكل', icon: AllInboxIcon },
  { value: 'DRAFT', label: 'مسودة', icon: DraftsIcon },
  { value: 'CONFIRMED', label: 'مؤكد', icon: CheckCircleIcon },
  { value: 'PAID', label: 'مدفوع', icon: PaidIcon }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency with LYD
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0 د.ل';
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// ============================================================================
// BATCH STATUS CHIP COMPONENT
// ============================================================================

const BatchStatusChip = ({ status }) => {
  const config = BATCH_STATUS_CONFIG[status] || {
    label: status,
    color: 'default',
    icon: null
  };
  const Icon = config.icon;

  return (
    <Tooltip title={config.description || ''}>
      <Chip
        icon={Icon ? <Icon fontSize="small" /> : null}
        label={config.label}
        color={config.color}
        variant="filled"
        size="medium"
        sx={{ fontWeight: 600, minWidth: 100 }}
      />
    </Tooltip>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SettlementBatchesList = () => {
  const navigate = useNavigate();
  const printRef = useRef(null);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  // ========================================
  // QUICK ACTION DIALOG STATES
  // ========================================
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedBatchForAction, setSelectedBatchForAction] = useState(null);

  // ========================================
  // PRINT HANDLER
  // ========================================

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `دفعات_التسوية_${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      @media print {
        body {
          direction: rtl;
          font-family: 'Tajawal', 'Arial', sans-serif;
        }
        .no-print {
          display: none !important;
        }
      }
    `
  });

  // Pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20
  });

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ========================================
  // DATA FETCHING
  // ========================================

  const {
    data: rawBatchesData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['settlement-batches', statusFilter, paginationModel.page, paginationModel.pageSize],
    queryFn: () =>
      settlementBatchesService.getAll({
        status: statusFilter || undefined,
        page: paginationModel.page,
        size: paginationModel.pageSize
      }),
    staleTime: 1000 * 60 * 2
  });

  // Fetch provider selector for the filter dropdown (independent from account balances)
  const { data: providersListData } = useQuery({
    queryKey: ['providers-with-accounts'],
    queryFn: () => providersService.getSelector(),
    staleTime: 1000 * 60 * 5
  });

  // ========================================
  // QUICK ACTION MUTATIONS
  // ========================================

  // Confirm batch mutation (DRAFT → CONFIRMED)
  const confirmMutation = useMutation({
    mutationFn: (batchId) => settlementBatchesService.confirm(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries(['settlement-batches']);
      setConfirmDialogOpen(false);
      setSelectedBatchForAction(null);
      openSnackbar({
        message: 'تم تأكيد الدفعة بنجاح ✅',
        variant: 'success'
      });
    },
    onError: (error) => {
      openSnackbar({
        message: error.message || 'فشل في تأكيد الدفعة',
        variant: 'error'
      });
    }
  });

  // ========================================
  // PROCESS DATA - Map raw data to safe format
  // ========================================

  const batchesData = useMemo(() => {
    if (!rawBatchesData) return [];

    // Handle different response formats - API v1 returns { batches: [...] }
    const rawList = Array.isArray(rawBatchesData)
      ? rawBatchesData
      : rawBatchesData?.batches || rawBatchesData?.content || rawBatchesData?.items || [];

    // Map to consistent format matching backend API contract
    return rawList.map((batch, index) => ({
      id: batch.batchId || batch.id || `batch-${index}`,
      providerId: batch.providerId || batch.provider?.id || null,
      batchNumber: batch.batchNumber || `BATCH-${batch.batchId || batch.id}`,
      providerName: batch.providerName || 'مقدم خدمة غير معروف',
      status: batch.status || 'DRAFT',
      statusArabic: batch.statusArabic || '',
      claimsCount: Number(batch.claimCount) || 0,
      totalAmount: Number(batch.totalNetAmount) || 0, // ✅ Backend sends totalNetAmount
      createdAt: batch.createdAt,
      confirmedAt: batch.confirmedAt || null,
      paidAt: batch.paidAt || null, // May not be in list view
      paymentReference: batch.paymentReference || null,
      modifiable: batch.modifiable || false,
      notes: batch.notes || ''
    }));
  }, [rawBatchesData]);

  // Total count for server-side pagination (not currently used but available)
  // eslint-disable-next-line no-unused-vars
  const totalCount = rawBatchesData?.totalElements || batchesData.length;

  // ========================================
  // PROVIDERS LIST FOR AUTOCOMPLETE
  // ========================================

  const providerOptions = useMemo(() => {
    // Use API data if available, otherwise fallback to batch data
    if (providersListData && providersListData.length > 0) {
      return providersListData.map((provider) => ({
        id: provider.id || provider.providerId,
        label: provider.label || provider.name || provider.providerName || `مقدم خدمة #${provider.id}`
      }));
    }

    // Fallback: extract from existing batches
    const uniqueProviders = new Map();
    batchesData.forEach((batch) => {
      if (batch.providerId && !uniqueProviders.has(batch.providerId)) {
        uniqueProviders.set(batch.providerId, {
          id: batch.providerId,
          label: batch.providerName
        });
      }
    });
    return Array.from(uniqueProviders.values());
  }, [providersListData, batchesData]);

  // ========================================
  // FILTERED DATA
  // ========================================

  const filteredBatches = useMemo(() => {
    return batchesData.filter((batch) => {
      // Provider filter
      if (selectedProvider) {
        if (batch.providerId !== null && batch.providerId !== undefined) {
          if (batch.providerId !== selectedProvider.id) {
            return false;
          }
        } else {
          const selectedLabel = String(selectedProvider.label || '').trim().toLowerCase();
          const batchProviderName = String(batch.providerName || '').trim().toLowerCase();
          if (!selectedLabel || batchProviderName !== selectedLabel) {
            return false;
          }
        }
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchNumber = (batch.batchNumber || '').toLowerCase().includes(searchLower);
        const matchProvider = (batch.providerName || '').toLowerCase().includes(searchLower);
        if (!matchNumber && !matchProvider) {
          return false;
        }
      }

      // Date filters
      if (dateFrom) {
        const batchDate = new Date(batch.createdAt);
        const fromDate = new Date(dateFrom);
        if (batchDate < fromDate) return false;
      }

      if (dateTo) {
        const batchDate = new Date(batch.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59);
        if (batchDate > toDate) return false;
      }

      return true;
    });
  }, [batchesData, selectedProvider, searchTerm, dateFrom, dateTo]);

  // ========================================
  // COMPUTED VALUES - Count by status + Financial KPIs
  // ========================================

  const statusCounts = useMemo(() => {
    const counts = { DRAFT: 0, CONFIRMED: 0, PAID: 0, total: 0 };
    filteredBatches.forEach((batch) => {
      if (counts[batch.status] !== undefined) {
        counts[batch.status]++;
      }
      counts.total++;
    });
    return counts;
  }, [filteredBatches]);

  // Financial KPIs - Calculated from batches data
  const financialKPIs = useMemo(() => {
    const kpis = {
      totalBatches: filteredBatches.length,
      totalPaid: 0,
      totalOutstanding: 0,
      totalClaimsCount: 0,
      avgBatchAmount: 0
    };

    filteredBatches.forEach((batch) => {
      kpis.totalClaimsCount += batch.claimsCount || 0;

      if (batch.status === 'PAID') {
        kpis.totalPaid += batch.totalAmount || 0;
      } else if (batch.status === 'CONFIRMED' || batch.status === 'DRAFT') {
        kpis.totalOutstanding += batch.totalAmount || 0;
      }
    });

    kpis.avgBatchAmount = kpis.totalBatches > 0 ? (kpis.totalPaid + kpis.totalOutstanding) / kpis.totalBatches : 0;

    return kpis;
  }, [filteredBatches]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleViewBatch = useCallback(
    (batchId) => {
      navigate(`/settlement/batches/${batchId}`);
    },
    [navigate]
  );

  const handleCreateBatch = useCallback(() => {
    navigate('/settlement/batches/create');
  }, [navigate]);

  const handleOpenPaymentCenter = useCallback(() => {
    navigate('/settlements/payments');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    refetch();
    openSnackbar({
      message: 'جاري تحديث البيانات...',
      variant: 'info'
    });
  }, [refetch]);

  // ========================================
  // QUICK ACTION HANDLERS
  // ========================================

  const handleQuickConfirm = useCallback((batch) => {
    setSelectedBatchForAction(batch);
    setConfirmDialogOpen(true);
  }, []);

  const handleConfirmBatch = useCallback(() => {
    if (selectedBatchForAction?.id) {
      confirmMutation.mutate(selectedBatchForAction.id);
    }
  }, [selectedBatchForAction, confirmMutation]);

  const handleStatusFilterChange = (_, newValue) => {
    if (newValue !== null) {
      setStatusFilter(newValue);
    }
  };

  const handleResetFilters = useCallback(() => {
    setSelectedProvider(null);
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return selectedProvider || searchTerm || dateFrom || dateTo || statusFilter;
  }, [selectedProvider, searchTerm, dateFrom, dateTo, statusFilter]);

  const handleExportExcel = useCallback(() => {
    if (!filteredBatches || filteredBatches.length === 0) {
      openSnackbar({
        message: 'لا توجد دفعات للتصدير',
        variant: 'warning'
      });
      return;
    }

    const exportData = filteredBatches.map((batch) => ({
      'رقم الدفعة': batch.batchNumber || '',
      'مقدم الخدمة': batch.providerName || '',
      الحالة: BATCH_STATUS_CONFIG[batch.status]?.label || batch.status,
      'عدد المطالبات': batch.claimsCount || 0,
      'المبلغ الصافي': Number(batch.totalAmount) || 0, // ✅ From totalNetAmount
      'تاريخ الإنشاء': formatDate(batch.createdAt),
      'تاريخ الدفع': batch.paidAt ? formatDate(batch.paidAt) : '-'
    }));
    exportToExcel(exportData, `دفعات_التسوية_${new Date().toISOString().split('T')[0]}`);
  }, [filteredBatches, openSnackbar]);

  const handleExportPDF = useCallback(() => {
    if (!batchesData || batchesData.length === 0) {
      openSnackbar({
        message: 'لا توجد دفعات للتصدير',
        variant: 'warning'
      });
      return;
    }
    exportToPDF(batchesData, `تقرير دفعات التسوية - ${new Date().toLocaleDateString('ar-LY')}`);
  }, [batchesData, openSnackbar]);

  // ========================================
  // TABLE COLUMNS (DataGrid Format)
  // ========================================

  const columns = useMemo(
    () => [
      {
        id: 'batchNumber',
        label: 'رقم الدفعة',
        minWidth: 150,
        sortable: false
      },
      {
        id: 'providerName',
        label: 'مقدم الخدمة',
        minWidth: 200,
        sortable: false
      },
      {
        id: 'status',
        label: 'الحالة',
        minWidth: 130,
        align: 'center',
        sortable: false
      },
      {
        id: 'claimsCount',
        label: 'عدد المطالبات',
        minWidth: 120,
        align: 'center',
        sortable: false
      },
      {
        id: 'totalAmount',
        label: 'إجمالي المبلغ',
        minWidth: 150,
        align: 'right',
        sortable: false
      },
      {
        id: 'createdAt',
        label: 'تاريخ الإنشاء',
        minWidth: 130,
        sortable: false
      },
      {
        id: 'paidAt',
        label: 'تاريخ الدفع',
        minWidth: 130,
        sortable: false
      },
      {
        id: 'actions',
        label: 'الإجراءات',
        minWidth: 180,
        align: 'center',
        sortable: false
      }
    ],
    []
  );

  // ========================================
  // CELL RENDERER
  // ========================================

  const renderCell = useCallback(
    (batch, column) => {
      if (!batch) return null;

      switch (column.id) {
        case 'batchNumber':
          return (
            <Stack>
              <Typography fontWeight={600} color="primary.main">
                {String(batch.batchNumber || `BATCH-${batch.id}`)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                #{String(batch.id || '-')}
              </Typography>
            </Stack>
          );

        case 'providerName':
          return <Typography fontWeight={500}>{String(batch.providerName || '-')}</Typography>;

        case 'status':
          return <BatchStatusChip status={batch.status} />;

        case 'claimsCount':
          return <Chip label={String(batch.claimsCount || 0)} color="primary" variant="outlined" size="small" />;

        case 'totalAmount':
          return (
            <Typography fontWeight={600} color="primary.main">
              {formatCurrency(batch.totalAmount)}
            </Typography>
          );

        case 'createdAt':
          return <Typography variant="body2">{formatDate(batch.createdAt)}</Typography>;

        case 'paidAt':
          return <Typography variant="body2">{batch.paidAt ? formatDate(batch.paidAt) : '-'}</Typography>;

        case 'actions':
          const batchId = batch?.id;
          const status = batch?.status;

          return (
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
              {/* View Details */}
              <Tooltip title="عرض التفاصيل">
                <IconButton
                  color="primary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewBatch(batchId);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Quick Confirm (DRAFT only) */}
              {status === 'DRAFT' && batch.claimsCount > 0 && (
                <Tooltip title="تأكيد الدفعة">
                  <IconButton
                    color="info"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickConfirm(batch);
                    }}
                  >
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

            </Stack>
          );

        default:
          return null;
      }
    },
    [handleViewBatch, handleQuickConfirm]
  );

  // ========================================
  // BREADCRUMBS
  // ========================================

  const breadcrumbs = [{ label: 'الرئيسية', path: '/' }, { label: 'التسويات', path: '/settlement' }, { label: 'دفعات التسوية' }];

  // ========================================
  // PAGE ACTIONS
  // ========================================

  const pageActions = (
    <Stack direction="row" spacing={1}>
      <PermissionGuard resource="settlements" action="create">
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreateBatch}>
          إنشاء دفعة جديدة
        </Button>
      </PermissionGuard>
      <PermissionGuard resource="settlements" action="pay">
        <Button variant="outlined" color="success" startIcon={<PaidIcon />} onClick={handleOpenPaymentCenter}>
          مركز الدفع
        </Button>
      </PermissionGuard>
      <Tooltip title="طباعة">
        <IconButton onClick={handlePrint} color="primary" disabled={isLoading || batchesData.length === 0}>
          <PrintIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="تصدير Excel">
        <IconButton onClick={handleExportExcel} color="success" disabled={isLoading}>
          <TableChartIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="تصدير PDF">
        <IconButton onClick={handleExportPDF} color="error" disabled={isLoading}>
          <PictureAsPdfIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="تحديث">
        <IconButton onClick={handleRefresh} color="primary" disabled={isLoading}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <PermissionGuard resource="settlements" action="view" fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="دفعات التسوية"
          subtitle="إدارة دفعات التسوية ومتابعة حالتها"
          breadcrumbs={breadcrumbs}
          icon={PaymentsIcon}
          actions={pageActions}
        />

        {/* Error Alert */}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.message || 'حدث خطأ أثناء تحميل البيانات'}
          </Alert>
        )}

        {/* Advanced Filters Card */}
        <MainCard sx={{ mb: 3 }}>
          {/* Filter Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterListIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                فلاتر البحث المتقدم
              </Typography>
              {hasActiveFilters && <Chip label={`${filteredBatches.length} نتيجة`} color="primary" size="small" />}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? 'إخفاء' : 'إظهار'}
              </Button>
              {hasActiveFilters && (
                <Button size="small" color="error" startIcon={<ClearAllIcon />} onClick={handleResetFilters}>
                  مسح الفلاتر
                </Button>
              )}
            </Stack>
          </Stack>

          <Collapse in={showAdvancedFilters}>
            <Grid container spacing={2} alignItems="center">
              {/* Row 1: Provider and Search - Giving Provider maximum space */}
              <Grid item xs={12} md={8}>
                <Autocomplete
                  value={selectedProvider}
                  onChange={(_, newValue) => setSelectedProvider(newValue)}
                  options={providerOptions}
                  getOptionLabel={(option) => option.label || ''}
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="🏥 مقدم الخدمة"
                      placeholder="اختر مقدم الخدمة..."
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <LocalHospitalIcon color="primary" fontSize="small" />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  noOptionsText="لا توجد نتائج"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="🔍 بحث"
                  placeholder="رقم الدفعة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              {/* Row 2: Dates and Actions */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="📅 من تاريخ"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    style: { direction: 'ltr', textAlign: 'right' }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="📅 إلى تاريخ"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    style: { direction: 'ltr', textAlign: 'right' }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SearchIcon />}
                    onClick={() => refetch()}
                    disabled={isLoading}
                    sx={{ px: 4 }}
                  >
                    بحث
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ClearAllIcon />}
                    onClick={handleResetFilters}
                    disabled={!hasActiveFilters}
                    sx={{ px: 4 }}
                  >
                    مسح
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Collapse>
        </MainCard>

        {/* ════════════════════════════════════════════════════════════════════
            💰 FINANCIAL KPIs & STATISTICS - COMPACT VIEW
            ════════════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(7, 1fr)'
            },
            gap: 1.5,
            mb: 2
          }}
        >
          {/* 1. Total Paid Amount */}
          <Card elevation={1} sx={{ borderLeft: '3px solid #4caf50' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: '#4caf50', display: 'flex' }}>
                <PaidIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  إجمالي المدفوع
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {formatCurrency(financialKPIs.totalPaid)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 2. Outstanding Amount */}
          <Card elevation={1} sx={{ borderLeft: '3px solid #ff9800' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: '#ff9800', display: 'flex' }}>
                <PaymentsIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  قيد الدفع
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {formatCurrency(financialKPIs.totalOutstanding)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 3. Total Batches Count */}
          <Card elevation={1} sx={{ borderLeft: '3px solid #2196f3' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: '#2196f3', display: 'flex' }}>
                <AllInboxIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  الدفعات
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {financialKPIs.totalBatches}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 4. Total Claims */}
          <Card elevation={1} sx={{ borderLeft: '3px solid #9c27b0' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: '#9c27b0', display: 'flex' }}>
                <LocalHospitalIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  المطالبات
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {financialKPIs.totalClaimsCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 5. Draft Batches */}
          <Card elevation={1} sx={{ borderLeft: '3px solid #ffc107' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: '#ffc107', display: 'flex' }}>
                <DraftsIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  مسودات
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {statusCounts.DRAFT}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 6. Confirmed Batches */}
          <Card elevation={1} sx={{ borderLeft: '3px solid #03a9f4' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: '#03a9f4', display: 'flex' }}>
                <CheckCircleIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  مؤكدة
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {statusCounts.CONFIRMED}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 7. Paid Batches */}
          <Card elevation={1} sx={{ borderLeft: '3px solid #4caf50' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: '#4caf50', display: 'flex' }}>
                <PaidIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  مدفوعة
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {statusCounts.PAID}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Status Filter Toggle */}
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="filter by status" size="small">
            {STATUS_FILTERS.map((filter) => {
              const Icon = filter.icon;
              return (
                <ToggleButton key={filter.value} value={filter.value}>
                  <Icon fontSize="small" sx={{ mr: 0.5 }} />
                  {filter.label}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>

        {/* Data Table */}
        <MainCard>
          <Box ref={printRef} sx={{ width: '100%' }}>
            <UnifiedMedicalTable
              columns={columns}
              data={filteredBatches}
              loading={isLoading}
              error={isError ? error : null}
              onErrorClose={() => {}}
              renderCell={renderCell}
              totalItems={filteredBatches.length}
              page={paginationModel.page}
              rowsPerPage={paginationModel.pageSize}
              onPageChange={(event, newPage) => setPaginationModel((prev) => ({ ...prev, page: newPage }))}
              onRowsPerPageChange={(event) => setPaginationModel({ page: 0, pageSize: parseInt(event.target.value, 10) })}
              emptyStateConfig={{
                icon: PaymentsIcon,
                title: 'لا توجد دفعات تسوية',
                description: 'لا توجد دفعات تسوية مسجلة حالياً'
              }}
            />
          </Box>
        </MainCard>

        {/* ════════════════════════════════════════════════════════════════════
            🔔 QUICK ACTION DIALOGS
            ════════════════════════════════════════════════════════════════════ */}

        {/* Confirm Batch Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CheckCircleIcon color="info" />
              <Typography variant="h6">تأكيد الدفعة</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              سيتم تأكيد الدفعة وتجميدها للدفع. لن تتمكن من إضافة أو حذف مطالبات بعد التأكيد.
            </Alert>
            {selectedBatchForAction && (
              <Stack spacing={1}>
                <Typography>
                  <strong>رقم الدفعة:</strong> {selectedBatchForAction.batchNumber}
                </Typography>
                <Typography>
                  <strong>مقدم الخدمة:</strong> {selectedBatchForAction.providerName}
                </Typography>
                <Typography>
                  <strong>عدد المطالبات:</strong> {selectedBatchForAction.claimsCount}
                </Typography>
                <Typography>
                  <strong>إجمالي المبلغ:</strong> {formatCurrency(selectedBatchForAction.totalAmount)}
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} disabled={confirmMutation.isPending}>
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmBatch}
              variant="contained"
              color="info"
              disabled={confirmMutation.isPending}
              startIcon={<CheckCircleIcon />}
            >
              {confirmMutation.isPending ? 'جاري التأكيد...' : 'تأكيد الدفعة'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </PermissionGuard>
  );
};

export default SettlementBatchesList;
