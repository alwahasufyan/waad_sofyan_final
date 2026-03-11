import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// MUI
import { Box, Stack, Typography, Alert, Button, Chip, TextField, MenuItem, Grid } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Project Components
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { UnifiedMedicalTable } from 'components/common';
import { AccountBalanceWallet as WalletIcon, Payments as PaymentsIcon, TrendingDown as DownIcon } from '@mui/icons-material';

// Services
import { providerAccountsService } from 'services/api/settlement.service';

// Utils
import { exportAccountsListToExcel } from 'utils/settlementExcelExport';

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00 د.ل';
  return `${Number(value).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

const getBalanceColor = (balance) => {
  if (balance > 0) return 'error.main';
  if (balance < 0) return 'success.main';
  return 'text.primary';
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'الكل' },
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'SUSPENDED', label: 'موقوف' },
  { value: 'CLOSED', label: 'مغلق' }
];

const STATUS_LABELS = {
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف',
  CLOSED: 'مغلق'
};

export default function ProviderPaymentsList() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    hasBalance: false
  });

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: 'ALL',
    hasBalance: false
  });

  const { data: accountsRaw, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['provider-accounts-list', appliedFilters],
    queryFn: () =>
      providerAccountsService.getAll({
        status: appliedFilters.status !== 'ALL' ? appliedFilters.status : undefined,
        hasBalance: appliedFilters.hasBalance
      }),
    staleTime: 1000 * 60 * 5
  });

  const accountsData = useMemo(() => {
    if (!accountsRaw) return [];
    const list = Array.isArray(accountsRaw) ? accountsRaw : accountsRaw.content || accountsRaw.items || [];

    const search = (appliedFilters.search || '').trim().toLowerCase();
    if (!search) return list;

    return list.filter((row) => {
      const providerName = String(row.providerName || '').toLowerCase();
      const providerCode = String(row.providerCode || '').toLowerCase();
      const providerId = String(row.providerId || '');
      return providerName.includes(search) || providerCode.includes(search) || providerId.includes(search);
    });
  }, [accountsRaw, appliedFilters]);

  const totals = useMemo(
    () => ({
      outstanding: accountsData.reduce((acc, curr) => acc + (Number(curr.runningBalance) || 0), 0),
      paid: accountsData.reduce((acc, curr) => acc + (Number(curr.totalPaid) || 0), 0)
    }),
    [accountsData]
  );

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    const reset = { search: '', status: 'ALL', hasBalance: false };
    setFilters(reset);
    setAppliedFilters(reset);
  };

  const handleViewTransactions = (row) => {
    const providerId = row.providerId || row.id;
    if (providerId) {
      navigate(`/settlement/provider-payments/${providerId}`);
    }
  };

  const handleExportExcel = () => {
    exportAccountsListToExcel({ accounts: accountsData });
  };

  const columns = useMemo(
    () => [
      {
        id: 'providerName',
        label: 'مقدم الخدمة',
        minWidth: 220,
        renderCell: ({ row }) => (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
            <Typography variant="body2" fontWeight={600}>
              {row.providerName || `مقدم خدمة #${row.providerId || row.id}`}
            </Typography>
          </Stack>
        )
      },
      {
        id: 'providerType',
        label: 'النوع',
        minWidth: 120,
        renderCell: ({ row }) => row.providerType || 'غير متوفر'
      },
      {
        id: 'status',
        label: 'الحالة',
        minWidth: 120,
        align: 'center',
        renderCell: ({ row }) => STATUS_LABELS[row.status] || row.status || '-'
      },
      {
        id: 'runningBalance',
        label: 'الرصيد الحالي',
        minWidth: 160,
        align: 'right',
        renderCell: ({ row }) => {
          const balance = Number(row.runningBalance) || 0;
          return (
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: getBalanceColor(balance) }}>
              {formatCurrency(balance)}
            </Typography>
          );
        }
      },
      {
        id: 'totalApproved',
        label: 'إجمالي المعتمد',
        minWidth: 150,
        align: 'right',
        renderCell: ({ row }) => formatCurrency(row.totalApproved)
      },
      {
        id: 'totalPaid',
        label: 'إجمالي المدفوع',
        minWidth: 150,
        align: 'right',
        renderCell: ({ row }) => formatCurrency(row.totalPaid)
      },
      {
        id: 'pendingClaimsCount',
        label: 'مطالبات معلقة',
        minWidth: 120,
        align: 'center',
        renderCell: ({ row }) => row.pendingClaimsCount || 0
      },
      {
        id: 'actions',
        label: 'إجراءات',
        minWidth: 130,
        align: 'center',
        sortable: false,
        renderCell: ({ row }) => (
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AccountBalanceWalletIcon />}
            onClick={() => handleViewTransactions(row)}
            sx={{ borderRadius: 2 }}
          >
            الدفعات
          </Button>
        )
      }
    ],
    [navigate]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ModernPageHeader
        title="الدفعات المالية لمقدمي الخدمة"
        subtitle="متابعة الأرصدة وتسجيل الدفعات المالية للمحاسبين"
        icon={<WalletIcon />}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'التسويات المالية', href: '/settlement' },
          { label: 'الدفعات المالية' }
        ]}
        actions={
          <Button variant="outlined" color="success" onClick={handleExportExcel} disabled={!accountsData.length} startIcon={<PaymentsIcon />}>
            تصدير تقرير مالي
          </Button>
        }
      />

      <MainCard sx={{ mb: 1.5 }}>
        <Grid container spacing={1.5} alignItems="flex-end">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="بحث باسم مقدم الخدمة أو الرقم"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="حالة الحساب"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="الرصيد"
              value={filters.hasBalance ? 'HAS_BALANCE' : 'ALL'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  hasBalance: e.target.value === 'HAS_BALANCE'
                }))
              }
            >
              <MenuItem value="ALL">الكل</MenuItem>
              <MenuItem value="HAS_BALANCE">فقط بحسابات مستحقة</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={handleApplyFilters} fullWidth>
                بحث
              </Button>
              <Button variant="outlined" color="inherit" startIcon={<ClearIcon />} onClick={handleClearFilters}>
                مسح
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </MainCard>

      <MainCard sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            icon={<DownIcon />}
            label={`إجمالي المستحق للمستشفيات: ${formatCurrency(totals.outstanding)}`}
            color="error"
            variant="outlined"
            sx={{ height: 40, fontWeight: 'bold' }}
          />
          <Chip
            icon={<PaymentsIcon />}
            label={`إجمالي المدفوعات المسجلة: ${formatCurrency(totals.paid)}`}
            color="success"
            variant="outlined"
            sx={{ height: 40, fontWeight: 'bold' }}
          />
        </Stack>
      </MainCard>

      <MainCard content={false} sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ p: 0, height: '100%' }}>
          {isError && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error?.message || 'فشل جلب بيانات الدفعات'}
              </Alert>
            </Box>
          )}

          <UnifiedMedicalTable
            rows={accountsData}
            columns={columns}
            loading={isLoading}
            onRefresh={refetch}
            emptyMessage="لا توجد حسابات تطابق الفلاتر الحالية"
            getRowKey={(row) => row.id || row.providerId}
          />
        </Box>
      </MainCard>
    </Box>
  );
}
