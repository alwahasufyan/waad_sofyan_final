/**
 * Provider Account View Page - Phase 3B Settlement (FIXED)
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              PROVIDER ACCOUNT VIEW - FIXED VERSION                            ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Shows provider account details with transaction history                       ║
 * ║ Uses MUI DataGrid instead of GenericDataTable to avoid React errors           ║
 * ║                                                                               ║
 * ║ BUG FIXES:                                                                    ║
 * ║ ✅ Fixed: Objects are not valid as React child                                ║
 * ║ ✅ Fixed: All values converted to strings                                     ║
 * ║ ✅ Fixed: Safe optional chaining for all nested properties                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// MUI Components
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PrintIcon from '@mui/icons-material/Print';
import TableChartIcon from '@mui/icons-material/TableChart';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import PermissionGuard from 'components/PermissionGuard';
import { UnifiedMedicalTable } from 'components/common';

// Services
import { providerAccountsService, providerPaymentsService } from 'services/api/settlement.service';

// Utils
import { exportProviderAccountTransactionsToExcel } from 'utils/settlementExcelExport';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const AR_MONTH_LABELS = ['يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو', 'يوليو', 'اغسطس', 'سبتمبر', 'اكتوبر', 'نوفمبر', 'ديسمبر'];
const PRINT_BRAND = {
  companyName: 'وعد لإدارة النفقات الطبية',
  systemName: 'نظام تسويات مقدمي الخدمة',
  logoPath: '/waad-icon.png',
  primaryColor: '#0b7285',
  accentColor: '#0f9d58',
  qrApiBase: 'https://api.qrserver.com/v1/create-qr-code/',
  qrSize: 220
};

// Transaction type labels in Arabic
const TRANSACTION_TYPE_LABELS = {
  CREDIT: 'دائن',
  DEBIT: 'مدين',
  PAYMENT: 'خصم (مدين)',
  ADJUSTMENT: 'تسوية'
};

// Transaction type colors
const TRANSACTION_TYPE_COLORS = {
  CREDIT: 'success',
  DEBIT: 'error',
  PAYMENT: 'primary',
  ADJUSTMENT: 'warning'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency with LYD - ALWAYS returns string
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0 د.ل';
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

/**
 * Format datetime for display - ALWAYS returns string
 */
const formatDateTime = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(date);
  }
};

/**
 * Get balance color based on amount
 */
const getBalanceColor = (balance) => {
  if (balance > 0) return 'error.main';
  if (balance < 0) return 'success.main';
  return 'text.primary';
};

/**
 * Safely get provider name from various data structures
 */
const getProviderName = (account) => {
  if (!account) return 'مقدم الخدمة';
  return (
    account.providerName || account.provider?.name || account.provider?.nameArabic || `مقدم خدمة #${account.providerId || account.id || ''}`
  );
};

const resolveDebitCredit = (transactionType, amount) => {
  const numericAmount = Number(amount) || 0;
  const absAmount = Math.abs(numericAmount);

  if (transactionType === 'CREDIT') return { creditAmount: absAmount, debitAmount: 0 };
  if (transactionType === 'DEBIT' || transactionType === 'PAYMENT') return { creditAmount: 0, debitAmount: absAmount };

  if (transactionType === 'ADJUSTMENT') {
    return numericAmount >= 0 ? { creditAmount: absAmount, debitAmount: 0 } : { creditAmount: 0, debitAmount: absAmount };
  }

  return numericAmount >= 0 ? { creditAmount: absAmount, debitAmount: 0 } : { creditAmount: 0, debitAmount: absAmount };
};

const calculateTransactionTotals = (transactions) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      totalCredit: 0,
      totalDebit: 0,
      netMovement: 0
    };
  }

  const totalCredit = transactions.reduce((sum, tx) => sum + (Number(tx.creditAmount) || 0), 0);
  const totalDebit = transactions.reduce((sum, tx) => sum + (Number(tx.debitAmount) || 0), 0);
  const netMovement = totalCredit - totalDebit;

  return {
    totalCredit,
    totalDebit,
    netMovement
  };
};

const applyFallbackRunningBalance = (transactions, currentRunningBalance, isFirstPage = true) => {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const hasRealRunningBalance = transactions.some((tx) => {
    const value = Number(tx.runningBalanceAfter);
    return Number.isFinite(value) && value !== 0;
  });

  if (hasRealRunningBalance) return transactions;
  if (!isFirstPage) return transactions;

  const currentBalance = Number(currentRunningBalance) || 0;
  const parseTime = (value) => {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : null;
  };

  const firstTime = parseTime(transactions[0]?.createdAt);
  const lastTime = parseTime(transactions[transactions.length - 1]?.createdAt);
  const isDescending = firstTime !== null && lastTime !== null ? firstTime >= lastTime : true;

  if (isDescending) {
    let rollingBalance = currentBalance;
    return transactions.map((tx) => {
      const txWithBalance = { ...tx, runningBalanceAfter: rollingBalance };
      const effect = (Number(tx.creditAmount) || 0) - (Number(tx.debitAmount) || 0);
      rollingBalance -= effect;
      return txWithBalance;
    });
  }

  const totalEffect = transactions.reduce((sum, tx) => sum + (Number(tx.creditAmount) || 0) - (Number(tx.debitAmount) || 0), 0);
  let rollingBalance = currentBalance - totalEffect;

  return transactions.map((tx) => {
    const effect = (Number(tx.creditAmount) || 0) - (Number(tx.debitAmount) || 0);
    rollingBalance += effect;
    return { ...tx, runningBalanceAfter: rollingBalance };
  });
};

const appendTotalsRow = (transactions, totals, suffix) => {
  const rows = Array.isArray(transactions) ? transactions : [];
  return [
    ...rows,
    {
      id: `totals-row-${suffix}`,
      isTotalsRow: true,
      creditAmount: Number(totals?.totalCredit) || 0,
      debitAmount: Number(totals?.totalDebit) || 0,
      runningBalanceAfter: Number(totals?.netMovement) || 0
    }
  ];
};

const buildPrintVerificationPayload = ({ title, providerName, providerId, docCode, amount, period, issuedAt }) => {
  return JSON.stringify({
    system: 'WAAD_MEDICAL_EXPENSES',
    title,
    providerName,
    providerId,
    docCode,
    amount,
    period,
    issuedAt
  });
};

const buildQrCodeImageUrl = (value) => {
  const encoded = encodeURIComponent(value || 'WAAD');
  return `${PRINT_BRAND.qrApiBase}?size=${PRINT_BRAND.qrSize}x${PRINT_BRAND.qrSize}&margin=0&data=${encoded}`;
};

// ============================================================================
// TAB PANEL COMPONENT
// ============================================================================

const TabPanel = ({ children, value, index, ...other }) => (
  <Box role="tabpanel" hidden={value !== index} id={`account-tabpanel-${index}`} aria-labelledby={`account-tab-${index}`} {...other}>
    {value === index && <Box sx={{ pt: '1.0rem' }}>{children}</Box>}
  </Box>
);

// ============================================================================
// ACCOUNT SUMMARY CARD
// ============================================================================

const AccountSummaryCard = ({ account, isLoading }) => {
  if (isLoading) {
    return (
      <Card sx={{ mb: '1.5rem' }}>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={40} />
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Skeleton variant="rectangular" height={100} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Alert severity="warning" sx={{ mb: '1.5rem' }}>
        لم يتم العثور على بيانات الحساب
      </Alert>
    );
  }

  const providerName = getProviderName(account);
  const providerId = account?.providerId || account?.id || '';
  const runningBalance = Number(account?.runningBalance) || 0;
  const totalApproved = Number(account?.totalApproved) || 0;
  const totalPaid = Number(account?.totalPaid) || 0;
  const transactionCount = Number(account?.transactionCount) || 0;

  return (
    <Card sx={{ mb: '1.5rem' }}>
      <CardContent>
        {/* Provider Name */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: '1.5rem' }}>
          <AccountBalanceWalletIcon sx={{ fontSize: '2.5rem', color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {String(providerName)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`حساب مقدم الخدمة #${String(providerId)}`}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: '1.5rem' }} />

        {/* Financial Summary */}
        <Grid container spacing={3}>
          {/* Running Balance */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: '1.0rem',
                bgcolor: runningBalance > 0 ? 'error.lighter' : 'success.lighter',
                borderRadius: '0.25rem',
                textAlign: 'center'
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                الرصيد الحالي
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: getBalanceColor(runningBalance) }}>
                {formatCurrency(runningBalance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {runningBalance > 0 ? 'مستحق للمقدم' : runningBalance < 0 ? 'مستحق على المقدم' : 'لا رصيد'}
              </Typography>
            </Paper>
          </Grid>

          {/* Total Approved */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: '1.0rem', bgcolor: 'primary.lighter', borderRadius: '0.25rem', textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                إجمالي المعتمد
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {formatCurrency(totalApproved)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                مجموع المطالبات المعتمدة
              </Typography>
            </Paper>
          </Grid>

          {/* Total Paid */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: '1.0rem', bgcolor: 'success.lighter', borderRadius: '0.25rem', textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                إجمالي المدفوع
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <TrendingDownIcon color="success" />
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {formatCurrency(totalPaid)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                مجموع المدفوعات المحولة
              </Typography>
            </Paper>
          </Grid>

          {/* Transaction Count */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: '1.0rem', bgcolor: 'grey.100', borderRadius: '0.25rem', textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                عدد الحركات
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <HistoryIcon color="action" />
                <Typography variant="h4" fontWeight={700}>
                  {String(transactionCount)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                إجمالي الحركات المالية
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProviderAccountView = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Guard: providerId must be a valid integer. If not (e.g. "actions" from a mismatched route),
  // skip all API calls and redirect back to the list page.
  const isValidProvider = !!providerId && !isNaN(Number(providerId)) && Number.isInteger(Number(providerId));

  useEffect(() => {
    if (providerId && !isValidProvider) {
      navigate('/settlement/provider-payments', { replace: true });
    }
  }, [providerId, isValidProvider, navigate]);

  const [activeTab, setActiveTab] = useState(0);
  const [verificationResult, setVerificationResult] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isMonthlyDocModalOpen, setIsMonthlyDocModalOpen] = useState(false);
  const [editingMonthlyDoc, setEditingMonthlyDoc] = useState(null);
  const [monthlyDocForm, setMonthlyDocForm] = useState({
    documentType: 'PAYMENT_VOUCHER',
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReference: '',
    notes: ''
  });
  const [unlockReason, setUnlockReason] = useState('');

  // ========================================
  // DATA FETCHING
  // ========================================

  // Fetch account summary
  const {
    data: accountData,
    isLoading: isLoadingAccount,
    isError: isAccountError,
    error: accountError
  } = useQuery({
    queryKey: ['provider-account', providerId],
    queryFn: () => providerAccountsService.getByProviderId(providerId),
    enabled: isValidProvider,
    staleTime: 1000 * 60 * 2
  });

  // Fetch transactions
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions
  } = useQuery({
    queryKey: ['provider-account', providerId, 'transactions', paginationModel.page, paginationModel.pageSize],
    queryFn: () =>
      providerAccountsService.getTransactions(providerId, {
        page: paginationModel.page,
        size: paginationModel.pageSize
      }),
    enabled: isValidProvider,
    staleTime: 1000 * 60 * 2
  });

  // Fetch recent transactions for quick view
  const { data: recentTransactionsRaw, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['provider-account', providerId, 'recent'],
    queryFn: () => providerAccountsService.getRecentTransactions(providerId),
    enabled: isValidProvider,
    staleTime: 1000 * 60 * 2
  });

  const currentYear = new Date().getFullYear();
  const {
    data: monthlySummaryRaw,
    isLoading: isLoadingMonthlySummary,
    isError: isMonthlySummaryError,
    error: monthlySummaryError
  } = useQuery({
    queryKey: ['provider-account', providerId, 'monthly-summary', currentYear],
    queryFn: () => providerPaymentsService.getProviderMonthlySummary(providerId, currentYear),
    enabled: isValidProvider,
    staleTime: 1000 * 60 * 2
  });

  const {
    data: monthlyPaymentsRaw,
    isLoading: isLoadingMonthlyPayments,
    isError: isMonthlyPaymentsError,
    error: monthlyPaymentsError
  } = useQuery({
    queryKey: ['provider-account', providerId, 'monthly-payments', currentYear, selectedMonth],
    queryFn: () => providerPaymentsService.listMonthlyPayments(providerId, currentYear, selectedMonth),
    enabled: isValidProvider,
    staleTime: 1000 * 60 * 2
  });

  useEffect(() => {
    if (isMonthlySummaryError) {
      openSnackbar({ message: monthlySummaryError?.message || 'تعذر تحميل ملخص الأشهر', variant: 'error' });
    }
  }, [isMonthlySummaryError, monthlySummaryError]);

  useEffect(() => {
    if (isMonthlyPaymentsError) {
      openSnackbar({ message: monthlyPaymentsError?.message || 'تعذر تحميل السندات الشهرية', variant: 'error' });
    }
  }, [isMonthlyPaymentsError, monthlyPaymentsError]);

  // ========================================
  // PROCESS TRANSACTIONS DATA
  // ========================================

  const processTransactions = useCallback((rawData) => {
    if (!rawData) return [];
    const list = Array.isArray(rawData) ? rawData : rawData?.content || [];
    return list.map((tx, index) => {
      const transactionType = tx.transactionType || 'UNKNOWN';
      const amount = Number(tx.amount) || 0;
      const { creditAmount, debitAmount } = resolveDebitCredit(transactionType, amount);

      return {
        id: tx.id || `tx-${index}`,
        createdAt: tx.createdAt,
        transactionType,
        amount,
        creditAmount,
        debitAmount,
        runningBalanceAfter: Number(tx.runningBalanceAfter) || 0,
        referenceType: tx.referenceType || '-',
        referenceId: tx.referenceId || '',
        description: tx.description || ''
      };
    });
  }, []);

  const recentTransactions = useMemo(() => {
    const processed = processTransactions(recentTransactionsRaw);
    return applyFallbackRunningBalance(processed, accountData?.runningBalance, true);
  }, [recentTransactionsRaw, processTransactions, accountData]);

  const allTransactions = useMemo(() => {
    const content = transactionsData?.items || transactionsData?.content || transactionsData;
    const processed = processTransactions(content);
    return applyFallbackRunningBalance(processed, accountData?.runningBalance, paginationModel.page === 0);
  }, [transactionsData, processTransactions, accountData, paginationModel.page]);

  const totalTransactions = transactionsData?.total || transactionsData?.totalElements || allTransactions.length;
  const monthlySummary = useMemo(() => {
    const listCandidate =
      (Array.isArray(monthlySummaryRaw) && monthlySummaryRaw) ||
      (Array.isArray(monthlySummaryRaw?.months) && monthlySummaryRaw.months) ||
      (Array.isArray(monthlySummaryRaw?.content) && monthlySummaryRaw.content) ||
      (Array.isArray(monthlySummaryRaw?.items) && monthlySummaryRaw.items) ||
      [];

    const byMonth = new Map();
    listCandidate.forEach((row) => {
      const monthNumber = Number(row?.month);
      if (Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
        byMonth.set(monthNumber, row || {});
      }
    });

    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const row = byMonth.get(month) || {};
      return {
        providerId: row.providerId ?? Number(providerId),
        year: row.year ?? currentYear,
        month,
        approvedAmount: Number(row.approvedAmount) || 0,
        paidAmount: Number(row.paidAmount) || 0,
        remainingAmount: Number(row.remainingAmount) || 0,
        locked: Boolean(row.locked),
        monthLabel: AR_MONTH_LABELS[index] || `شهر ${month}`
      };
    });
  }, [monthlySummaryRaw, providerId, currentYear]);
  const selectedMonthSummary = useMemo(
    () =>
      monthlySummary.find((row) => Number(row.month) === Number(selectedMonth)) || {
        providerId: Number(providerId),
        year: currentYear,
        month: Number(selectedMonth),
        approvedAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        locked: false,
        monthLabel: AR_MONTH_LABELS[Math.max(0, Math.min(11, Number(selectedMonth || 1) - 1))] || `شهر ${selectedMonth}`
      },
    [monthlySummary, selectedMonth, providerId, currentYear]
  );
  const monthlyPayments = useMemo(() => (Array.isArray(monthlyPaymentsRaw) ? monthlyPaymentsRaw : []), [monthlyPaymentsRaw]);
  const recentTotals = useMemo(() => calculateTransactionTotals(recentTransactions), [recentTransactions]);
  const allTotals = useMemo(() => calculateTransactionTotals(allTransactions), [allTransactions]);
  const recentRowsWithTotals = useMemo(() => appendTotalsRow(recentTransactions, recentTotals, 'recent'), [recentTransactions, recentTotals]);
  const allRowsWithTotals = useMemo(() => appendTotalsRow(allTransactions, allTotals, `all-${paginationModel.page}`), [allTransactions, allTotals, paginationModel.page]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleBack = useCallback(() => {
    navigate('/settlement/provider-payments');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    // Invalidate ALL queries related to this provider account in one call.
    // This covers: account summary, paginated transactions, AND recent transactions.
    queryClient.invalidateQueries({ queryKey: ['provider-account', providerId] });
    openSnackbar({
      message: 'جاري تحديث البيانات...',
      variant: 'info'
    });
  }, [queryClient, providerId]);

  const handleVerifyBalance = useCallback(async () => {
    const accountId = accountData?.accountId || accountData?.id;
    if (!accountId) return;

    try {
      const result = await providerAccountsService.verifyBalance(accountId);
      setVerificationResult(result);
      const isValid = result?.balanceVerified ?? result?.isValid;
      openSnackbar({
        message: isValid ? 'الرصيد متطابق ✓' : 'يوجد فرق في الرصيد!',
        variant: isValid ? 'success' : 'warning'
      });
    } catch (error) {
      openSnackbar({
        message: error?.message || 'فشل التحقق من الرصيد',
        variant: 'error'
      });
    }
  }, [accountData]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  const invalidateMonthlyQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['provider-account', providerId, 'monthly-summary'] });
    queryClient.invalidateQueries({ queryKey: ['provider-account', providerId, 'monthly-payments'] });
    queryClient.invalidateQueries({ queryKey: ['provider-account', providerId] });
  }, [queryClient, providerId]);

  const handleCreateMonthlyDocument = async () => {
    try {
      const payload = {
        year: currentYear,
        month: selectedMonth,
        documentType: monthlyDocForm.documentType,
        amount: Number(monthlyDocForm.amount),
        paymentDate: monthlyDocForm.paymentDate,
        paymentReference: monthlyDocForm.paymentReference,
        notes: monthlyDocForm.notes
      };

      if (!payload.amount || payload.amount <= 0) {
        openSnackbar({ message: 'قيمة السند مطلوبة', variant: 'warning' });
        return;
      }

      if (editingMonthlyDoc?.id) {
        await providerPaymentsService.updateMonthlyPayment(providerId, editingMonthlyDoc.id, {
          amount: payload.amount,
          paymentDate: payload.paymentDate,
          paymentReference: payload.paymentReference,
          notes: payload.notes
        });
        openSnackbar({ message: 'تم تعديل السند مع قيد تصحيح', variant: 'success' });
      } else {
        await providerPaymentsService.createMonthlyPayment(providerId, payload);
        openSnackbar({ message: 'تم إنشاء السند الشهري', variant: 'success' });
      }

      setIsMonthlyDocModalOpen(false);
      setEditingMonthlyDoc(null);
      setMonthlyDocForm({
        documentType: 'PAYMENT_VOUCHER',
        amount: '',
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentReference: '',
        notes: ''
      });
      invalidateMonthlyQueries();
    } catch (error) {
      openSnackbar({ message: error?.message || 'تعذر حفظ السند', variant: 'error' });
    }
  };

  const handleLockOrUnlockMonth = async () => {
    try {
      const isLocked = Boolean(selectedMonthSummary?.locked);

      if (isLocked) {
        if (!unlockReason.trim()) {
          openSnackbar({ message: 'سبب فك القفل مطلوب', variant: 'warning' });
          return;
        }
        await providerPaymentsService.unlockMonth(providerId, currentYear, selectedMonth, unlockReason.trim());
        setUnlockReason('');
        openSnackbar({ message: 'تم فك قفل الشهر', variant: 'success' });
      } else {
        await providerPaymentsService.lockMonth(providerId, currentYear, selectedMonth);
        openSnackbar({ message: 'تم قفل الشهر بنجاح', variant: 'success' });
      }

      invalidateMonthlyQueries();
    } catch (error) {
      openSnackbar({ message: error?.message || 'تعذر تنفيذ العملية', variant: 'error' });
    }
  };

  const renderBrandedPrintDocument = ({ title, subtitle, contentHtml, verificationMeta }) => {
    const issuedAt = verificationMeta?.issuedAt || new Date().toLocaleString('ar-LY');
    const logoUrl = `${window.location.origin}${PRINT_BRAND.logoPath}`;
    const qrValue = verificationMeta?.qrValue || 'WAAD';
    const qrImageUrl = buildQrCodeImageUrl(qrValue);
    const docCode = verificationMeta?.docCode || 'DOC-UNSPECIFIED';
    const providerCode = verificationMeta?.providerId ? `#${verificationMeta.providerId}` : '-';

    return `
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          :root {
            --brand-primary: ${PRINT_BRAND.primaryColor};
            --brand-accent: ${PRINT_BRAND.accentColor};
            --brand-border: #d8e2e7;
            --brand-muted: #5f7380;
            --page-bg: #f6fafb;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 10px;
            font-family: "Tahoma", "Arial", sans-serif;
            background: var(--page-bg);
            color: #1f2933;
            direction: rtl;
          }
          .sheet {
            position: relative;
            border: 1px solid var(--brand-border);
            border-radius: 12px;
            background: #fff;
            overflow: hidden;
          }
          .watermark {
            position: absolute;
            top: 45%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-16deg);
            font-size: 40px;
            font-weight: 800;
            color: rgba(11, 114, 133, 0.05);
            letter-spacing: 2px;
            pointer-events: none;
            user-select: none;
            white-space: nowrap;
          }
          .sheet-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--brand-border);
            background: linear-gradient(135deg, #edf7f9 0%, #ffffff 60%);
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .brand img {
            width: 46px;
            height: 46px;
            object-fit: contain;
            border: 1px solid #d5e6ea;
            border-radius: 10px;
            padding: 3px;
            background: #fff;
          }
          .brand-title {
            margin: 0;
            font-size: 18px;
            color: var(--brand-primary);
            font-weight: 800;
          }
          .brand-subtitle {
            margin: 4px 0 0;
            font-size: 12px;
            color: var(--brand-muted);
          }
          .doc-title {
            text-align: left;
          }
          .doc-title h2 {
            margin: 0;
            font-size: 18px;
            color: #0f172a;
            font-weight: 800;
          }
          .doc-title p {
            margin: 4px 0 0;
            font-size: 12px;
            color: var(--brand-muted);
          }
          .verify-box {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--brand-border);
            border-radius: 10px;
            padding: 6px;
            background: #fff;
            min-width: 300px;
          }
          .verify-box img {
            width: 96px;
            height: 96px;
            border: 1px solid #dbe6eb;
            border-radius: 8px;
            background: #fff;
            flex-shrink: 0;
          }
          .verify-meta {
            font-size: 12px;
            color: var(--brand-muted);
            line-height: 1.45;
          }
          .verify-meta strong {
            color: #1f2933;
            font-size: 12px;
          }
          .sheet-body {
            padding: 10px 12px;
            position: relative;
            z-index: 1;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(120px, 1fr));
            gap: 8px;
            margin: 10px 0 14px;
          }
          .summary-item {
            border: 1px solid var(--brand-border);
            border-radius: 8px;
            padding: 6px;
            background: #fbfdfe;
          }
          .summary-label {
            display: block;
            font-size: 11px;
            color: var(--brand-muted);
            margin-bottom: 4px;
          }
          .summary-value {
            font-size: 14px;
            font-weight: 700;
            color: #102a43;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #d9e3e8;
            padding: 6px;
            vertical-align: top;
          }
          th {
            background: #eaf4f6;
            color: #124559;
            font-weight: 700;
          }
          .sheet-footer {
            border-top: 1px solid var(--brand-border);
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--brand-muted);
            background: #fcfeff;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            background: #e9f7ef;
            color: var(--brand-accent);
            font-weight: 700;
            font-size: 11px;
            border: 1px solid #cdeed9;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .sheet { border: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="watermark">${PRINT_BRAND.companyName}</div>
          <div class="sheet-header">
            <div class="brand">
              <img src="${logoUrl}" alt="WAAD" />
              <div>
                <h1 class="brand-title">${PRINT_BRAND.companyName}</h1>
                <p class="brand-subtitle">${PRINT_BRAND.systemName}</p>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="doc-title">
                <h2>${title}</h2>
                <p>${subtitle || ''}</p>
              </div>
              <div class="verify-box">
                <img src="${qrImageUrl}" alt="QR" />
                <div class="verify-meta">
                  <div><strong>رمز المستند:</strong> ${docCode}</div>
                  <div><strong>مقدم الخدمة:</strong> ${providerCode}</div>
                  <div><strong>وقت الإصدار:</strong> ${issuedAt}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="sheet-body">
            ${contentHtml}
          </div>

          <div class="sheet-footer">
            <span>${PRINT_BRAND.companyName}</span>
            <span>تاريخ الإصدار: ${issuedAt}</span>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintReceipt = async (paymentId) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      openSnackbar({ message: 'تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة', variant: 'warning' });
      return;
    }

    try {
      const preview = await providerPaymentsService.previewPaymentReceipt(providerId, paymentId);
      const doc = preview?.document;
      const issuedAt = new Date().toLocaleString('ar-LY');
      const docCode = doc?.receiptNumber || `PAY-${providerId}-${paymentId}`;
      const verificationMeta = {
        issuedAt,
        docCode,
        providerId,
        qrValue: buildPrintVerificationPayload({
          title: preview?.printTitle || 'إيصال',
          providerName: preview?.providerName || '-',
          providerId,
          docCode,
          amount: doc?.amount,
          period: doc?.paymentDate,
          issuedAt
        })
      };

      const contentHtml = `
        <div class="summary-grid">
          <div class="summary-item"><span class="summary-label">رقم الإيصال</span><span class="summary-value">${doc?.receiptNumber || '-'}</span></div>
          <div class="summary-item"><span class="summary-label">التاريخ</span><span class="summary-value">${doc?.paymentDate || '-'}</span></div>
          <div class="summary-item"><span class="summary-label">المرجع</span><span class="summary-value">${doc?.paymentReference || '-'}</span></div>
          <div class="summary-item"><span class="summary-label">النوع</span><span class="summary-value">${doc?.documentType === 'PAYMENT_VOUCHER' ? 'سند صرف' : 'سند قبض'}</span></div>
          <div class="summary-item"><span class="summary-label">القيمة</span><span class="summary-value">${formatCurrency(doc?.amount)}</span></div>
          <div class="summary-item"><span class="summary-label">الحالة</span><span class="summary-value"><span class="badge">معتمد</span></span></div>
        </div>
        <table>
          <thead><tr><th>البيان</th><th>القيمة</th></tr></thead>
          <tbody>
            <tr><td>البيان</td><td>${doc?.documentType === 'PAYMENT_VOUCHER' ? 'سند صرف لمقدم الخدمة' : 'سند قبض من مقدم الخدمة'}</td></tr>
            <tr><td>القيمة</td><td>${formatCurrency(doc?.amount)}</td></tr>
            <tr><td>مقدم الخدمة</td><td>${preview?.providerName || '-'}</td></tr>
            <tr><td>الملاحظات</td><td>${doc?.notes || '-'}</td></tr>
          </tbody>
        </table>
      `;

      printWindow.document.write(
        renderBrandedPrintDocument({
          title: preview?.printTitle || 'إيصال',
          subtitle: `مقدم الخدمة: ${preview?.providerName || '-'}`,
          contentHtml,
          verificationMeta
        })
      );
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      printWindow.close();
      openSnackbar({ message: error?.message || 'تعذر معاينة الإيصال', variant: 'error' });
    }
  };

  const handlePrintMonthlyStatement = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      openSnackbar({ message: 'تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة', variant: 'warning' });
      return;
    }

    try {
      const data = await providerPaymentsService.previewMonthlyStatement(providerId, currentYear, selectedMonth);
      const rows = Array.isArray(data?.documents)
        ? data.documents
            .map(
              (d) => `<tr><td>${d.receiptNumber || '-'}</td><td>${d.documentType === 'PAYMENT_VOUCHER' ? 'صرف' : 'قبض'}</td><td>${d.paymentDate || '-'}</td><td>${formatCurrency(d.amount)}</td><td>${d.paymentReference || '-'}</td></tr>`
            )
            .join('')
        : '';
      const issuedAt = new Date().toLocaleString('ar-LY');
      const docCode = `MST-${providerId}-${currentYear}${String(selectedMonth).padStart(2, '0')}`;
      const verificationMeta = {
        issuedAt,
        docCode,
        providerId,
        qrValue: buildPrintVerificationPayload({
          title: 'كشف شهر مقدم الخدمة',
          providerName: data?.providerName || '-',
          providerId,
          docCode,
          amount: data?.summary?.remainingAmount,
          period: `${selectedMonth}/${currentYear}`,
          issuedAt
        })
      };

      const contentHtml = `
        <div class="summary-grid">
          <div class="summary-item"><span class="summary-label">مقدم الخدمة</span><span class="summary-value">${data?.providerName || '-'}</span></div>
          <div class="summary-item"><span class="summary-label">المعتمد</span><span class="summary-value">${formatCurrency(data?.summary?.approvedAmount)}</span></div>
          <div class="summary-item"><span class="summary-label">المدفوع</span><span class="summary-value">${formatCurrency(data?.summary?.paidAmount)}</span></div>
          <div class="summary-item"><span class="summary-label">المتبقي</span><span class="summary-value">${formatCurrency(data?.summary?.remainingAmount)}</span></div>
          <div class="summary-item"><span class="summary-label">عدد السندات</span><span class="summary-value">${Array.isArray(data?.documents) ? data.documents.length : 0}</span></div>
          <div class="summary-item"><span class="summary-label">الحالة</span><span class="summary-value"><span class="badge">كشف شهري</span></span></div>
        </div>
        <table>
          <thead><tr><th>الإيصال</th><th>النوع</th><th>التاريخ</th><th>القيمة</th><th>المرجع</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      printWindow.document.write(
        renderBrandedPrintDocument({
          title: 'كشف شهر مقدم الخدمة',
          subtitle: `الفترة: ${selectedMonth}/${currentYear}`,
          contentHtml,
          verificationMeta
        })
      );
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      printWindow.close();
      openSnackbar({ message: error?.message || 'تعذر طباعة كشف الشهر', variant: 'error' });
    }
  };

  const handlePrintYearlyStatement = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      openSnackbar({ message: 'تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة', variant: 'warning' });
      return;
    }

    try {
      const data = await providerPaymentsService.previewYearlyStatement(providerId, currentYear);
      const rows = Array.isArray(data?.months)
        ? data.months
            .map(
              (m) => `<tr><td>${m.month}</td><td>${formatCurrency(m.approvedAmount)}</td><td>${formatCurrency(m.paidAmount)}</td><td>${formatCurrency(m.remainingAmount)}</td><td>${m.locked ? 'مقفل' : 'مفتوح'}</td></tr>`
            )
            .join('')
        : '';
      const issuedAt = new Date().toLocaleString('ar-LY');
      const docCode = `YST-${providerId}-${currentYear}`;
      const verificationMeta = {
        issuedAt,
        docCode,
        providerId,
        qrValue: buildPrintVerificationPayload({
          title: 'الملخص السنوي لمقدم الخدمة',
          providerName: data?.providerName || '-',
          providerId,
          docCode,
          amount: data?.totals?.remainingTotal,
          period: String(currentYear),
          issuedAt
        })
      };

      const contentHtml = `
        <div class="summary-grid">
          <div class="summary-item"><span class="summary-label">مقدم الخدمة</span><span class="summary-value">${data?.providerName || '-'}</span></div>
          <div class="summary-item"><span class="summary-label">إجمالي المعتمد</span><span class="summary-value">${formatCurrency(data?.totals?.approvedTotal)}</span></div>
          <div class="summary-item"><span class="summary-label">إجمالي المدفوع</span><span class="summary-value">${formatCurrency(data?.totals?.paidTotal)}</span></div>
          <div class="summary-item"><span class="summary-label">إجمالي المتبقي</span><span class="summary-value">${formatCurrency(data?.totals?.remainingTotal)}</span></div>
          <div class="summary-item"><span class="summary-label">عدد الأشهر</span><span class="summary-value">${Array.isArray(data?.months) ? data.months.length : 0}</span></div>
          <div class="summary-item"><span class="summary-label">الحالة</span><span class="summary-value"><span class="badge">ملخص سنوي</span></span></div>
        </div>
        <table>
          <thead><tr><th>الشهر</th><th>المعتمد</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      printWindow.document.write(
        renderBrandedPrintDocument({
          title: 'الملخص السنوي لمقدم الخدمة',
          subtitle: `السنة: ${currentYear}`,
          contentHtml,
          verificationMeta
        })
      );
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      printWindow.close();
      openSnackbar({ message: error?.message || 'تعذر طباعة الملخص السنوي', variant: 'error' });
    }
  };

  const buildPrintableRows = useCallback((rows) => {
    const safeRows = Array.isArray(rows) ? rows.filter((row) => !row.isTotalsRow) : [];
    return safeRows
      .map(
        (tx) => `
          <tr>
            <td>${formatDateTime(tx.createdAt)}</td>
            <td>${TRANSACTION_TYPE_LABELS[tx.transactionType] || String(tx.transactionType || '-')}</td>
            <td>${Number(tx.creditAmount) > 0 ? formatCurrency(tx.creditAmount) : '-'}</td>
            <td>${Number(tx.debitAmount) > 0 ? formatCurrency(tx.debitAmount) : '-'}</td>
            <td>${formatCurrency(tx.runningBalanceAfter)}</td>
            <td>${String(tx.referenceType || '-')}${tx.referenceId ? ` #${String(tx.referenceId)}` : ''}</td>
            <td>${String(tx.description || '-')}</td>
          </tr>
        `
      )
      .join('');
  }, []);

  const handlePrint = useCallback(() => {
    const providerName = getProviderName(accountData);
    const rows = activeTab === 0 ? recentTransactions : allTransactions;
    const totals = activeTab === 0 ? recentTotals : allTotals;
    const title = activeTab === 0 ? 'آخر الحركات' : 'كل الحركات';

    const tableRows = buildPrintableRows(rows);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const issuedAt = new Date().toLocaleString('ar-LY');
    const docCode = `TRX-${providerId}-${Date.now()}`;
    const html = renderBrandedPrintDocument({
      title: 'تفاصيل حساب مقدم الخدمة',
      subtitle: `${providerName} - ${title}`,
      verificationMeta: {
        issuedAt,
        docCode,
        providerId,
        qrValue: buildPrintVerificationPayload({
          title: 'تفاصيل حساب مقدم الخدمة',
          providerName,
          providerId,
          docCode,
          amount: totals?.netMovement,
          period: title,
          issuedAt
        })
      },
      contentHtml: `
        <div class="summary-grid">
          <div class="summary-item"><span class="summary-label">مقدم الخدمة</span><span class="summary-value">${providerName}</span></div>
          <div class="summary-item"><span class="summary-label">إجمالي الدائن</span><span class="summary-value">${formatCurrency(totals.totalCredit)}</span></div>
          <div class="summary-item"><span class="summary-label">إجمالي المدين</span><span class="summary-value">${formatCurrency(totals.totalDebit)}</span></div>
          <div class="summary-item"><span class="summary-label">صافي الحركة</span><span class="summary-value">${formatCurrency(totals.netMovement)}</span></div>
          <div class="summary-item"><span class="summary-label">عدد الحركات</span><span class="summary-value">${Array.isArray(rows) ? rows.length : 0}</span></div>
          <div class="summary-item"><span class="summary-label">نوع التقرير</span><span class="summary-value"><span class="badge">${title}</span></span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>نوع الحركة</th>
              <th>الدائن</th>
              <th>المدين</th>
              <th>رصيد الحركة</th>
              <th>المرجع</th>
              <th>الوصف</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td></td>
              <td>${formatCurrency(totals.totalCredit)}</td>
              <td>${formatCurrency(totals.totalDebit)}</td>
              <td>${formatCurrency(totals.netMovement)}</td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      `
    });

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }, [accountData, activeTab, recentTransactions, allTransactions, recentTotals, allTotals, buildPrintableRows]);

  // Export to Excel
  const handleExportExcel = useCallback(async () => {
    const dataToExport = activeTab === 0 ? recentTransactions : allTransactions;
    if (!dataToExport.length) return;

    try {
      const transactions = dataToExport
        .filter((tx) => !tx.isTotalsRow)
        .map((tx) => ({
          createdAt: formatDateTime(tx.createdAt),
          transactionTypeLabel: TRANSACTION_TYPE_LABELS[tx.transactionType] || tx.transactionType,
          creditAmount: Number(tx.creditAmount) || 0,
          debitAmount: Number(tx.debitAmount) || 0,
          runningBalanceAfter: Number(tx.runningBalanceAfter) || 0,
          reference: `${String(tx.referenceType || '-')}${tx.referenceId ? ` #${String(tx.referenceId)}` : ''}`,
          description: tx.description || '-'
        }));

      await exportProviderAccountTransactionsToExcel({
        providerName: getProviderName(accountData),
        transactions,
        exportDate: new Date().toLocaleString('ar-LY')
      });

      openSnackbar({ message: 'تم تصدير ملف Excel بنجاح', variant: 'success' });
    } catch (error) {
      openSnackbar({ message: error?.message || 'فشل تصدير ملف Excel', variant: 'error' });
    }
  }, [accountData, activeTab, recentTransactions, allTransactions]);

  // ========================================
  // TABLE COLUMNS (UnifiedMedicalTable format)
  // ========================================

  const transactionColumns = useMemo(
    () => [
      {
        id: 'createdAt',
        label: 'التاريخ',
        minWidth: '9.0625rem',
        align: 'right',
        sortable: false
      },
      {
        id: 'transactionType',
        label: 'نوع الحركة',
        minWidth: '6.875rem',
        align: 'center',
        sortable: false
      },
      {
        id: 'creditAmount',
        label: 'الدائن',
        minWidth: '7.5rem',
        align: 'right',
        sortable: false
      },
      {
        id: 'debitAmount',
        label: 'المدين',
        minWidth: '7.5rem',
        align: 'right',
        sortable: false
      },
      {
        id: 'runningBalanceAfter',
        label: 'رصيد الحركة',
        minWidth: '7.8125rem',
        align: 'right',
        sortable: false
      },
      {
        id: 'referenceType',
        label: 'المرجع',
        minWidth: '6.5625rem',
        align: 'center',
        sortable: false
      },
      {
        id: 'description',
        label: 'الوصف',
        minWidth: '23.75rem',
        width: '40%',
        sortable: false
      }
    ],
    []
  );

  const renderTransactionCell = useCallback((transaction, column) => {
    if (!transaction) return null;

    if (transaction.isTotalsRow) {
      if (column.id === 'creditAmount') {
        return (
          <Typography fontWeight={700} color="success.main">
            {formatCurrency(transaction.creditAmount)}
          </Typography>
        );
      }
      if (column.id === 'debitAmount') {
        return (
          <Typography fontWeight={700} color="error.main">
            {formatCurrency(transaction.debitAmount)}
          </Typography>
        );
      }
      if (column.id === 'runningBalanceAfter') {
        return (
          <Typography fontWeight={700} color={Number(transaction.runningBalanceAfter) >= 0 ? 'success.main' : 'error.main'}>
            {formatCurrency(transaction.runningBalanceAfter)}
          </Typography>
        );
      }
      return '';
    }

    switch (column.id) {
      case 'createdAt':
        return <Typography variant="body2">{formatDateTime(transaction.createdAt)}</Typography>;

      case 'transactionType':
        return (
          <Chip
            label={TRANSACTION_TYPE_LABELS[transaction.transactionType] || String(transaction.transactionType || '-')}
            color={TRANSACTION_TYPE_COLORS[transaction.transactionType] || 'default'}
            size="small"
            variant="filled"
          />
        );

      case 'creditAmount':
        return (
          <Typography fontWeight={600} color="success.main">
            {Number(transaction.creditAmount) > 0 ? `+ ${formatCurrency(transaction.creditAmount)}` : '-'}
          </Typography>
        );

      case 'debitAmount':
        return (
          <Typography fontWeight={600} color="error.main">
            {Number(transaction.debitAmount) > 0 ? `- ${formatCurrency(transaction.debitAmount)}` : '-'}
          </Typography>
        );

      case 'runningBalanceAfter':
        return <Typography fontWeight={600}>{formatCurrency(transaction.runningBalanceAfter)}</Typography>;

      case 'referenceType':
        return (
          <Stack spacing={0.25}>
            <Typography variant="body2">{String(transaction.referenceType || '-')}</Typography>
            {transaction.referenceId ? (
              <Typography variant="caption" color="text.secondary">
                {`#${String(transaction.referenceId)}`}
              </Typography>
            ) : null}
          </Stack>
        );

      case 'description':
        return <Typography variant="body2" sx={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.5 }}>{String(transaction.description || '-')}</Typography>;

      default:
        return String(transaction[column.id] || '-');
    }
  }, []);

  // ========================================
  // BREADCRUMBS
  // ========================================

  const breadcrumbs = [
    { label: 'الرئيسية', path: '/' },
    { label: 'التسويات', path: '/settlement' },
    { label: 'حسابات مقدمي الخدمة', path: '/settlement/provider-accounts' },
    { label: getProviderName(accountData) }
  ];

  // ========================================
  // PAGE ACTIONS
  // ========================================

  const pageActions = (
    <Stack direction="row" spacing={1}>
      <Tooltip title="التحقق من الرصيد">
        <Button variant="outlined" color="info" startIcon={<VerifiedIcon />} onClick={handleVerifyBalance} disabled={!accountData}>
          التحقق من الرصيد
        </Button>
      </Tooltip>
      <Tooltip title="تصدير Excel">
        <IconButton onClick={handleExportExcel} color="success">
          <TableChartIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="طباعة">
        <IconButton onClick={handlePrint} color="primary">
          <PrintIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="تحديث">
        <IconButton onClick={handleRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="رجوع">
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  // ========================================
  // RENDER
  // ========================================

  if (isAccountError) {
    return (
      <Box>
        <UnifiedPageHeader
          title="تفاصيل الحساب"
          breadcrumbs={breadcrumbs}
          icon={AccountBalanceWalletIcon}
          actions={
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
          }
        />
        <Alert severity="error">{accountError?.message || 'فشل في تحميل بيانات الحساب'}</Alert>
      </Box>
    );
  }

  return (
    <PermissionGuard resource="provider_accounts" action="view" fallback={<Alert severity="error">ليس لديك صلاحية لعرض هذه الصفحة</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="تفاصيل حساب مقدم الخدمة"
          subtitle={String(getProviderName(accountData))}
          breadcrumbs={breadcrumbs}
          icon={AccountBalanceWalletIcon}
          actions={pageActions}
        />

        {/* Persistent balance mismatch warning (server-detected) */}
        {accountData && accountData.balanceVerified === false && (
          <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: '1.0rem' }}>
            ⚠️ <strong>تحذير:</strong> الرصيد المحسوب لا يتطابق مع مجموع حركات الحساب. يرجى التحقق من الحركات المالية أو التواصل مع الدعم الفني.
          </Alert>
        )}

        {/* Verification Result */}
        {verificationResult && (
          (() => {
            const isValid = verificationResult.balanceVerified ?? verificationResult.isValid;
            return (
          <Alert
            severity={isValid ? 'success' : 'warning'}
            icon={isValid ? <CheckCircleIcon /> : <ErrorIcon />}
            sx={{ mb: '1.0rem' }}
            onClose={() => setVerificationResult(null)}
          >
            {isValid ? 'الرصيد متطابق مع مجموع الحركات' : 'يوجد عدم تطابق في الرصيد، يرجى مراجعة الحركات المالية.'}
          </Alert>
            );
          })()
        )}

        {/* Account Summary */}
        <AccountSummaryCard account={accountData} isLoading={isLoadingAccount} />

        {/* Yearly Monthly Summary (Phase 1 implementation) */}
        <MainCard sx={{ mb: '1.5rem' }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="h6" fontWeight={700}>ملخص الأشهر - {currentYear}</Typography>
              <Typography variant="caption" color="text.secondary">المعتمد | المدفوع | المتبقي | حالة القفل</Typography>
            </Stack>

            <Grid container spacing={1.25}>
              {isLoadingMonthlySummary &&
                Array.from({ length: 12 }).map((_, idx) => (
                  <Grid key={`summary-skeleton-${idx}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
                  </Grid>
                ))}

              {!isLoadingMonthlySummary && monthlySummary.map((monthRow) => (
                <Grid key={`summary-month-${monthRow.month}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: '0.75rem',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: monthRow.locked ? 'success.main' : 'divider',
                      bgcolor: monthRow.locked ? 'success.lighter' : 'background.paper'
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700}>{monthRow.monthLabel}</Typography>
                        <Chip
                          label={monthRow.locked ? 'مقفل' : 'مفتوح'}
                          size="small"
                          color={monthRow.locked ? 'success' : 'default'}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">المعتمد: {formatCurrency(monthRow.approvedAmount)}</Typography>
                      <Typography variant="caption" color="text.secondary">المدفوع: {formatCurrency(monthRow.paidAmount)}</Typography>
                      <Typography variant="caption" sx={{ color: Number(monthRow.remainingAmount) > 0 ? 'error.main' : 'success.main', fontWeight: 700 }}>
                        المتبقي: {formatCurrency(monthRow.remainingAmount)}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </MainCard>

        {/* Monthly payments management */}
        <MainCard sx={{ mb: '1.5rem' }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <TextField select size="small" label="الشهر" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} sx={{ minWidth: 140 }}>
                {AR_MONTH_LABELS.map((label, idx) => (
                  <MenuItem key={label} value={idx + 1}>{label}</MenuItem>
                ))}
              </TextField>
              <Button variant="contained" onClick={() => setIsMonthlyDocModalOpen(true)} disabled={selectedMonthSummary?.locked}>إضافة سند شهري</Button>
              <Button variant={selectedMonthSummary?.locked ? 'outlined' : 'contained'} color={selectedMonthSummary?.locked ? 'warning' : 'success'} onClick={handleLockOrUnlockMonth}>
                {selectedMonthSummary?.locked ? 'فك قفل الشهر' : 'قفل الشهر'}
              </Button>
              {selectedMonthSummary?.locked && (
                <TextField size="small" label="سبب فك القفل" value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} sx={{ minWidth: 220 }} />
              )}
              <Button variant="outlined" onClick={handlePrintMonthlyStatement}>طباعة كشف الشهر</Button>
              <Button variant="outlined" onClick={handlePrintYearlyStatement}>طباعة الملخص السنوي</Button>
            </Stack>

            {isLoadingMonthlyPayments ? (
              <Skeleton variant="rectangular" height={120} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: 8 }}>الإيصال</th>
                      <th style={{ border: '1px solid #ddd', padding: 8 }}>النوع</th>
                      <th style={{ border: '1px solid #ddd', padding: 8 }}>التاريخ</th>
                      <th style={{ border: '1px solid #ddd', padding: 8 }}>القيمة</th>
                      <th style={{ border: '1px solid #ddd', padding: 8 }}>المرجع</th>
                      <th style={{ border: '1px solid #ddd', padding: 8 }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyPayments.map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{doc.receiptNumber}</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{doc.documentType === 'PAYMENT_VOUCHER' ? 'صرف' : 'قبض'}</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{doc.paymentDate}</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatCurrency(doc.amount)}</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{doc.paymentReference || '-'}</td>
                        <td style={{ border: '1px solid #ddd', padding: 8 }}>
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" variant="outlined" onClick={() => handlePrintReceipt(doc.id)}>طباعة</Button>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={selectedMonthSummary?.locked}
                              onClick={() => {
                                setEditingMonthlyDoc(doc);
                                setMonthlyDocForm({
                                  documentType: doc.documentType,
                                  amount: doc.amount,
                                  paymentDate: doc.paymentDate,
                                  paymentReference: doc.paymentReference || '',
                                  notes: doc.notes || ''
                                });
                                setIsMonthlyDocModalOpen(true);
                              }}
                            >
                              تعديل
                            </Button>
                          </Stack>
                        </td>
                      </tr>
                    ))}
                    {!monthlyPayments.length && (
                      <tr>
                        <td colSpan={6} style={{ border: '1px solid #ddd', padding: 12, textAlign: 'center' }}>لا توجد سندات لهذا الشهر</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>
            )}
          </Stack>
        </MainCard>

        {/* Tabs */}
        <MainCard>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="آخر الحركات" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="كل الحركات" icon={<AccountBalanceWalletIcon />} iconPosition="start" />
          </Tabs>

          {/* Recent Transactions Tab */}
          <TabPanel value={activeTab} index={0}>
            <UnifiedMedicalTable
              columns={transactionColumns}
              data={recentRowsWithTotals}
              loading={isLoadingRecent}
              renderCell={renderTransactionCell}
              totalItems={recentTransactions.length}
              page={0}
              rowsPerPage={Math.max(recentTransactions.length, 10)}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              emptyStateConfig={{
                icon: HistoryIcon,
                title: 'لا توجد حركات مالية',
                description: 'لا توجد حركات مالية حديثة'
              }}
            />
          </TabPanel>

          {/* All Transactions Tab */}
          <TabPanel value={activeTab} index={1}>
            <UnifiedMedicalTable
              columns={transactionColumns}
              data={allRowsWithTotals}
              loading={isLoadingTransactions}
              renderCell={renderTransactionCell}
              totalItems={totalTransactions}
              page={paginationModel.page}
              rowsPerPage={paginationModel.pageSize}
              onPageChange={(newPage) => setPaginationModel((prev) => ({ ...prev, page: newPage }))}
              onRowsPerPageChange={(newSize) => setPaginationModel({ page: 0, pageSize: newSize })}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              emptyStateConfig={{
                icon: AccountBalanceWalletIcon,
                title: 'لا توجد حركات مالية',
                description: 'لا توجد حركات مالية لعرضها'
              }}
            />
          </TabPanel>
        </MainCard>

        {/* Monthly payment document modal */}
        <Dialog open={isMonthlyDocModalOpen} onClose={() => setIsMonthlyDocModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingMonthlyDoc ? 'تعديل سند شهري' : 'إضافة سند شهري'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: '1.0rem' }}>
              {!editingMonthlyDoc && (
                <TextField select label="نوع السند" fullWidth value={monthlyDocForm.documentType} onChange={(e) => setMonthlyDocForm((prev) => ({ ...prev, documentType: e.target.value }))}>
                  <MenuItem value="PAYMENT_VOUCHER">إيصال صرف (PAY)</MenuItem>
                  <MenuItem value="RECEIPT_VOUCHER">إيصال قبض (RCV)</MenuItem>
                </TextField>
              )}
              <TextField label="القيمة" type="number" fullWidth value={monthlyDocForm.amount} onChange={(e) => setMonthlyDocForm((prev) => ({ ...prev, amount: e.target.value }))} />
              <TextField label="التاريخ" type="date" fullWidth value={monthlyDocForm.paymentDate} onChange={(e) => setMonthlyDocForm((prev) => ({ ...prev, paymentDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="مرجع الدفع" fullWidth value={monthlyDocForm.paymentReference} onChange={(e) => setMonthlyDocForm((prev) => ({ ...prev, paymentReference: e.target.value }))} />
              <TextField label="ملاحظات" fullWidth multiline rows={3} value={monthlyDocForm.notes} onChange={(e) => setMonthlyDocForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsMonthlyDocModalOpen(false)} color="inherit">إلغاء</Button>
            <Button onClick={handleCreateMonthlyDocument} variant="contained">{editingMonthlyDoc ? 'حفظ التعديل' : 'إنشاء السند'}</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </PermissionGuard>
  );
};

export default ProviderAccountView;

