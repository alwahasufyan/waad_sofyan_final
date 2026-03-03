/**
 * Provider Accounts List Page - Phase 3B Settlement (Fixed)
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              PROVIDER ACCOUNTS LIST - UNIFIED DESIGN                          ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ This page uses the same DataGrid design as SettlementInbox                    ║
 * ║ Connected to NEW Backend APIs (ProviderAccountController)                     ║
 * ║                                                                               ║
 * ║ Features:                                                                     ║
 * ║ ✅ MUI DataGrid (same as old settlement inbox)                                ║
 * ║ ✅ Backend-only calculations                                                  ║
 * ║ ✅ Filters (status, hasBalance)                                               ║
 * ║ ✅ Export to Excel/PDF                                                        ║
 * ║ ✅ Click to view account details                                              ║
 * ║                                                                               ║
 * ║ BUG FIXES:                                                                    ║
 * ║ ✅ Fixed: providerId undefined - now uses row.id || row.providerId            ║
 * ║ ✅ Fixed: Objects as React children - proper string rendering                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';

// MUI Components
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

// MUI Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedIcon from '@mui/icons-material/Verified';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PaymentsIcon from '@mui/icons-material/Payments';

// MUI DataGrid - REMOVED, using UnifiedMedicalTable instead

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import PermissionGuard from 'components/PermissionGuard';
import { UnifiedMedicalTable } from 'components/common';

// Services
import { providerAccountsService } from 'services/api/settlement.service';
import { providersService } from 'services/api';

// Utils
import { exportToExcel, exportToPDF } from 'utils/exportUtils';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency with LYD
 * @param {number} value - Amount to format
 * @returns {string} Formatted amount
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 د.ل';
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

/**
 * Get balance color based on amount
 * @param {number} balance - Account balance
 * @returns {string} MUI color
 */
const getBalanceColor = (balance) => {
  if (balance > 0) return 'error'; // Outstanding debt (we owe them)
  if (balance < 0) return 'success'; // Overpaid (they owe us)
  return 'default'; // Zero balance
};

/**
 * Get status chip color
 * @param {string} status - Account status
 * @returns {string} MUI color
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'SUSPENDED':
      return 'warning';
    case 'CLOSED':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get status Arabic label
 * @param {string} status - Account status
 * @returns {string} Arabic label
 */
const getStatusLabel = (status) => {
  switch (status) {
    case 'ACTIVE':
      return 'نشط';
    case 'SUSPENDED':
      return 'معلق';
    case 'CLOSED':
      return 'مغلق';
    default:
      return status || '-';
  }
};

/**
 * Safely extract provider ID from row data
 * Handles both ProviderAccount entity and AccountSummaryDTO
 * @param {object} row - Row data
 * @returns {number|string} Provider ID
 */
const getProviderId = (row) => {
  // Try different possible field names
  return row?.providerId || row?.id || row?.accountId || null;
};

/**
 * Safely extract provider name
 * @param {object} row - Row data
 * @returns {string} Provider name
 */
const getProviderName = (row) => {
  if (row?.providerName) return String(row.providerName);
  if (row?.provider?.name) return String(row.provider.name);
  const id = getProviderId(row);
  return id ? `مقدم خدمة #${id}` : '-';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProviderAccountsList = () => {
  const navigate = useNavigate();
  const printRef = useRef(null);

  // ========================================
  // PRINT HANDLER
  // ========================================

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `حسابات_مقدمي_الخدمة_${new Date().toISOString().split('T')[0]}`,
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

  // ========================================
  // STATE
  // ========================================

  // Pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20
  });

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hasBalanceFilter, setHasBalanceFilter] = useState('ALL'); // Changed to string for more options
  const [searchTerm, setSearchTerm] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');

  // ========================================
  // DATA FETCHING
  // ========================================

  const {
    data: rawAccountsData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['provider-accounts'],
    queryFn: () => providerAccountsService.getAll(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false
  });

  // Fetch total outstanding summary
  const { data: summaryData } = useQuery({
    queryKey: ['provider-accounts', 'summary'],
    queryFn: () => providerAccountsService.getTotalOutstanding(),
    staleTime: 1000 * 60 * 2
  });

  // Fetch providers selector for filter (independent from accounts list)
  const { data: providersSelectorData } = useQuery({
    queryKey: ['providers-selector', 'settlement-provider-accounts'],
    queryFn: () => providersService.getSelector(),
    staleTime: 1000 * 60 * 5
  });

  // ========================================
  // PROCESS DATA - Map raw data to safe format
  // ========================================

  const accountsData = useMemo(() => {
    if (!rawAccountsData) return [];

    // Handle different response formats
    const rawList = Array.isArray(rawAccountsData) ? rawAccountsData : rawAccountsData?.items || rawAccountsData?.content || [];

    // Map to consistent format with safe ID extraction
    return rawList.map((account, index) => {
      const providerId = getProviderId(account);
      return {
        // Use providerId as the unique row ID for DataGrid
        id: providerId || `row-${index}`,
        providerId: providerId,
        accountId: account.id || account.accountId,
        providerName: getProviderName(account),
        providerType: account.providerType || account.provider?.type || null,
        runningBalance: Number(account.runningBalance) || 0,
        totalApproved: Number(account.totalApproved) || 0,
        totalPaid: Number(account.totalPaid) || 0,
        status: account.status || 'ACTIVE',
        pendingClaimsCount: Number(account.pendingClaimsCount) || 0,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    });
  }, [rawAccountsData]);

  // ========================================
  // PROVIDERS LIST FOR AUTOCOMPLETE
  // ========================================

  const providerOptions = useMemo(() => {
    const balanceByProviderId = new Map(accountsData.map((account) => [account.providerId, account.runningBalance]));

    if (Array.isArray(providersSelectorData) && providersSelectorData.length > 0) {
      return providersSelectorData.map((provider) => ({
        id: provider.id,
        label: provider.label || provider.name || `مقدم خدمة #${provider.id}`,
        balance: Number(balanceByProviderId.get(provider.id)) || 0
      }));
    }

    return accountsData.map((account) => ({
      id: account.providerId,
      label: account.providerName,
      balance: account.runningBalance
    }));
  }, [providersSelectorData, accountsData]);

  const totalOutstandingAmount = useMemo(() => {
    return Number(summaryData?.totalOutstandingBalance ?? summaryData?.totalOutstanding ?? 0) || 0;
  }, [summaryData]);

  // ========================================
  // FILTERED DATA
  // ========================================

  const filteredData = useMemo(() => {
    return accountsData.filter((account) => {
      // Selected Provider filter (exact match)
      if (selectedProvider && account.providerId !== selectedProvider.id) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && account.status !== statusFilter) {
        return false;
      }

      // Balance filter
      if (hasBalanceFilter === 'HAS_BALANCE' && account.runningBalance <= 0) {
        return false;
      }
      if (hasBalanceFilter === 'NO_BALANCE' && account.runningBalance > 0) {
        return false;
      }

      // Min Balance filter
      if (minBalance && account.runningBalance < Number(minBalance)) {
        return false;
      }

      // Max Balance filter
      if (maxBalance && account.runningBalance > Number(maxBalance)) {
        return false;
      }

      // Search filter (for additional text search)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = (account.providerName || '').toLowerCase().includes(searchLower);
        const idMatch = String(account.providerId || '').includes(searchTerm);
        if (!nameMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [accountsData, selectedProvider, statusFilter, hasBalanceFilter, minBalance, maxBalance, searchTerm]);

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleViewAccount = useCallback(
    (providerId) => {
      if (!providerId) {
        console.error('handleViewAccount: providerId is undefined');
        openSnackbar({
          message: 'خطأ: معرف مقدم الخدمة غير متوفر',
          variant: 'error'
        });
        return;
      }
      navigate(`/settlement/provider-accounts/${providerId}`);
    },
    [navigate]
  );

  /**
   * Navigate to create batch page with pre-selected provider
   */
  const handleCreateBatch = useCallback(
    (providerId) => {
      if (!providerId) {
        openSnackbar({
          message: 'خطأ: معرف مقدم الخدمة غير متوفر',
          variant: 'error'
        });
        return;
      }
      // Navigate to create batch with providerId as query param
      navigate(`/settlement/batches/create?providerId=${providerId}`);
    },
    [navigate]
  );

  const handleRowClick = useCallback(
    (params) => {
      // params.row contains the full row data (DataGrid format)
      const providerId = params?.row?.providerId || params?.row?.id;
      if (providerId) {
        handleViewAccount(providerId);
      }
    },
    [handleViewAccount]
  );

  const handleRefresh = useCallback(() => {
    refetch();
    openSnackbar({
      message: 'جاري تحديث البيانات...',
      variant: 'info'
    });
  }, [refetch]);

  const handleResetFilters = useCallback(() => {
    setSelectedProvider(null);
    setStatusFilter('ALL');
    setHasBalanceFilter('ALL');
    setSearchTerm('');
    setMinBalance('');
    setMaxBalance('');
  }, []);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return selectedProvider || statusFilter !== 'ALL' || hasBalanceFilter !== 'ALL' || searchTerm || minBalance || maxBalance;
  }, [selectedProvider, statusFilter, hasBalanceFilter, searchTerm, minBalance, maxBalance]);

  const handleExportExcel = useCallback(() => {
    const exportData = filteredData.map((acc) => ({
      'مقدم الخدمة': acc.providerName || '',
      'الرصيد الحالي': acc.runningBalance || 0,
      'إجمالي المعتمد': acc.totalApproved || 0,
      'إجمالي المدفوع': acc.totalPaid || 0,
      الحالة: getStatusLabel(acc.status)
    }));
    exportToExcel(exportData, `حسابات_مقدمي_الخدمة_${new Date().toISOString().split('T')[0]}`);
  }, [filteredData]);

  const handleExportPDF = useCallback(() => {
    exportToPDF(filteredData, `تقرير حسابات مقدمي الخدمة - ${new Date().toLocaleDateString('ar-LY')}`);
  }, [filteredData]);

  // ========================================
  // TABLE COLUMNS DEFINITION (DataGrid Format)
  // ========================================

  const columns = useMemo(
    () => [
      {
        id: 'providerId',
        label: '#',
        minWidth: 80,
        sortable: false
      },
      {
        id: 'providerName',
        label: 'مقدم الخدمة',
        minWidth: 200,
        sortable: false
      },
      {
        id: 'runningBalance',
        label: 'الرصيد المستحق',
        minWidth: 150,
        align: 'center',
        sortable: false
      },
      {
        id: 'totalApproved',
        label: 'إجمالي المعتمد',
        minWidth: 140,
        align: 'right',
        sortable: false
      },
      {
        id: 'totalPaid',
        label: 'إجمالي المدفوع',
        minWidth: 140,
        align: 'right',
        sortable: false
      },
      {
        id: 'pendingClaimsCount',
        label: 'معلقات',
        minWidth: 100,
        align: 'center',
        sortable: false
      },
      {
        id: 'status',
        label: 'الحالة',
        minWidth: 100,
        align: 'center',
        sortable: false
      },
      {
        id: 'actions',
        label: 'الإجراءات',
        minWidth: 150,
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
    (account, column) => {
      if (!account) return null;

      switch (column.id) {
        case 'providerId':
          return (
            <Typography variant="body2" fontWeight={600}>
              {String(account.providerId || account.id || '-')}
            </Typography>
          );

        case 'providerName':
          return (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography fontWeight={600}>{String(account.providerName || '-')}</Typography>
              {account.providerType && (
                <Chip
                  label={account.providerType === 'HOSPITAL' ? 'مستشفى' : 'عيادة'}
                  size="small"
                  color={account.providerType === 'HOSPITAL' ? 'primary' : 'secondary'}
                  variant="outlined"
                />
              )}
            </Stack>
          );

        case 'runningBalance':
          const balance = Number(account.runningBalance) || 0;
          return (
            <Chip
              label={formatCurrency(balance)}
              color={getBalanceColor(balance)}
              variant="filled"
              size="small"
              sx={{ fontWeight: 700, minWidth: 100 }}
            />
          );

        case 'totalApproved':
          return (
            <Typography variant="body2" color="primary.main" fontWeight={600}>
              {formatCurrency(account.totalApproved)}
            </Typography>
          );

        case 'totalPaid':
          return (
            <Typography variant="body2" color="success.main" fontWeight={600}>
              {formatCurrency(account.totalPaid)}
            </Typography>
          );

        case 'pendingClaimsCount':
          const count = Number(account.pendingClaimsCount) || 0;
          return <Chip label={String(count)} color={count > 0 ? 'warning' : 'default'} variant="outlined" size="small" />;

        case 'status':
          return <Chip label={getStatusLabel(account.status)} color={getStatusColor(account.status)} size="small" variant="filled" />;

        case 'actions':
          const providerId = account.providerId || account.id;
          const hasBalance = (account.runningBalance || 0) > 0;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="عرض التفاصيل">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAccount(providerId);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {/* زر إنشاء دفعة تسوية - يظهر فقط إذا كان هناك رصيد مستحق */}
              {hasBalance && (
                <Tooltip title="إنشاء دفعة تسوية">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateBatch(providerId);
                    }}
                  >
                    <PaymentsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
      }
    },
    [handleViewAccount, handleCreateBatch]
  );

  // ========================================
  // BREADCRUMBS
  // ========================================

  const breadcrumbs = [{ label: 'الرئيسية', path: '/' }, { label: 'التسويات', path: '/settlement' }, { label: 'حسابات مقدمي الخدمة' }];

  // ========================================
  // PAGE ACTIONS
  // ========================================

  const pageActions = (
    <Stack direction="row" spacing={1}>
      <Tooltip title="طباعة">
        <IconButton onClick={handlePrint} color="primary" disabled={isLoading || filteredData.length === 0}>
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
      <Tooltip title="تحديث البيانات">
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
    <PermissionGuard resource="provider_accounts" action="view" fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="حسابات مقدمي الخدمة"
          subtitle="عرض أرصدة حسابات مقدمي الخدمة وحركاتهم المالية"
          breadcrumbs={breadcrumbs}
          icon={AccountBalanceWalletIcon}
          actions={pageActions}
        />

        {/* Error Alert */}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => { }}>
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
              {hasActiveFilters && <Chip label={`${filteredData.length} نتيجة`} color="primary" size="small" />}
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
            <Grid container spacing={2} alignItems="flex-end">
              {/* Row 1: Primary Search & Basics */}
              <Grid item xs={12} md={5}>
                <Autocomplete
                  value={selectedProvider}
                  onChange={(_, newValue) => setSelectedProvider(newValue)}
                  options={providerOptions}
                  getOptionLabel={(option) => option.label || ''}
                  isOptionEqualToValue={(option, value) => option.id === value?.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="🏛️ مقدم الخدمة"
                      placeholder="البحث بالاسم..."
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...restProps } = props;
                    return (
                      <li key={key} {...restProps}>
                        <Stack direction="row" justifyContent="space-between" width="100%">
                          <Typography variant="body2">{option.label}</Typography>
                          <Typography variant="caption" color="primary" fontWeight={600}>
                            {formatCurrency(option.balance)}
                          </Typography>
                        </Stack>
                      </li>
                    );
                  }}
                  noOptionsText="لا توجد نتائج"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="🔍 بحث سريع"
                  placeholder="الاسم أو رقم الحساب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select value={statusFilter} label="الحالة" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="ALL">الكل</MenuItem>
                    <MenuItem value="ACTIVE">نشط</MenuItem>
                    <MenuItem value="SUSPENDED">معلق</MenuItem>
                    <MenuItem value="CLOSED">مغلق</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Row 2: Financial Filters */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>نوع الرصيد</InputLabel>
                  <Select value={hasBalanceFilter} label="نوع الرصيد" onChange={(e) => setHasBalanceFilter(e.target.value)}>
                    <MenuItem value="ALL">الكل</MenuItem>
                    <MenuItem value="HAS_BALANCE">أرصدة مستحقة</MenuItem>
                    <MenuItem value="NO_BALANCE">رصيد صفري</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="الحد الأدنى للمستحق"
                  placeholder="0.00"
                  type="number"
                  value={minBalance}
                  onChange={(e) => setMinBalance(e.target.value)}
                  size="small"
                />
              </Grid>

              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  label="الحد الأقصى للمستحق"
                  placeholder="999999"
                  type="number"
                  value={maxBalance}
                  onChange={(e) => setMaxBalance(e.target.value)}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="contained" color="primary" onClick={() => refetch()} disabled={isLoading}>
                    تطبيق
                  </Button>
                  <Button variant="outlined" color="secondary" onClick={handleResetFilters} disabled={!hasActiveFilters}>
                    مسح
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Collapse>
        </MainCard>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <MainCard sx={{ bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light', position: 'relative', overflow: 'hidden' }}>
              <Stack spacing={0.5} sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="subtitle2" color="error.dark" fontWeight={700}>إجمالي المستحقات</Typography>
                <Typography variant="h3" color="error.dark" fontWeight={800}>{formatCurrency(totalOutstandingAmount)}</Typography>
              </Stack>
              <AccountBalanceWalletIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, opacity: 0.08, color: 'error.main' }} />
            </MainCard>
          </Grid>
          <Grid item xs={12} sm={4}>
            <MainCard sx={{ bgcolor: 'secondary.lighter', border: '1px solid', borderColor: 'secondary.light', position: 'relative', overflow: 'hidden' }}>
              <Stack spacing={0.5} sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="subtitle2" color="secondary.dark" fontWeight={700}>عدد الحسابات</Typography>
                <Typography variant="h3" color="secondary.dark" fontWeight={800}>{accountsData.length}</Typography>
              </Stack>
              <VerifiedIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, opacity: 0.08, color: 'secondary.main' }} />
            </MainCard>
          </Grid>
          <Grid item xs={12} sm={4}>
            <MainCard sx={{ bgcolor: 'primary.lighter', border: '1px solid', borderColor: 'primary.light', position: 'relative', overflow: 'hidden' }}>
              <Stack spacing={0.5} sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="subtitle2" color="primary.dark" fontWeight={700}>حسابات معروضة</Typography>
                <Typography variant="h3" color="primary.dark" fontWeight={800}>{filteredData.length}</Typography>
              </Stack>
              <WarningIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, opacity: 0.08, color: 'primary.main' }} />
            </MainCard>
          </Grid>
        </Grid>

        {/* Data Grid */}
        <MainCard>
          <Box ref={printRef} sx={{ width: '100%' }}>
            <UnifiedMedicalTable
              columns={columns}
              data={filteredData}
              loading={isLoading}
              error={isError ? error : null}
              onErrorClose={() => { }}
              renderCell={renderCell}
              totalItems={filteredData.length}
              page={paginationModel.page}
              rowsPerPage={paginationModel.pageSize}
              onPageChange={(event, newPage) => setPaginationModel((prev) => ({ ...prev, page: newPage }))}
              onRowsPerPageChange={(event) => setPaginationModel({ page: 0, pageSize: parseInt(event.target.value, 10) })}
              emptyStateConfig={{
                icon: AccountBalanceWalletIcon,
                title: 'لا توجد حسابات لعرضها',
                description: 'لا توجد حسابات مسجلة لمقدمي الخدمة'
              }}
            />
          </Box>
        </MainCard>
      </Box>
    </PermissionGuard >
  );
};

export default ProviderAccountsList;
