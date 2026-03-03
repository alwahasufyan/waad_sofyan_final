import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Assignment as ClaimIcon,
  MedicalServices as PreApprovalIcon,
  Visibility as ViewIcon,
  PlayArrow as StartReviewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { DataGrid } from '@mui/x-data-grid';
import { claimsService, medicalReviewersService, preApprovalsService } from 'services/api';
import useAuth from 'hooks/useAuth';

const SELECTED_PROVIDER_STORAGE_KEY = 'reviewer_selected_provider';

const getCurrentUserRoles = (user) => {
  try {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = user || localUser;
    const roles = [];

    if (Array.isArray(currentUser?.roles)) {
      roles.push(...currentUser.roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean));
    }

    if (typeof currentUser?.role === 'string' && currentUser.role.trim()) {
      roles.push(currentUser.role.trim());
    }

    return [...new Set(roles.map((role) => role.toUpperCase()))];
  } catch {
    return [];
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED APPROVALS DASHBOARD (CANONICAL)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aggregates pending tasks from:
 * 1. Claims (Canonical ClaimService)
 * 2. Pre-Authorizations (Canonical PreAuthorizationService)
 */
const ApprovalsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [claims, setClaims] = useState([]);
  const [preApprovals, setPreApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);

  const userRoles = getCurrentUserRoles(user);
  const isMedicalReviewer = userRoles.includes('MEDICAL_REVIEWER');

  // Stats
  const [stats, setStats] = useState({
    pendingClaims: 0,
    pendingPreAuths: 0,
    totalPending: 0
  });

  const fetchData = useCallback(async () => {
    if (isMedicalReviewer && !selectedProviderId) {
      setClaims([]);
      setPreApprovals([]);
      setStats({
        pendingClaims: 0,
        pendingPreAuths: 0,
        totalPending: 0
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const commonParams = {
        page: 1,
        size: 10,
        ...(isMedicalReviewer && selectedProviderId ? { providerId: selectedProviderId } : {})
      };

      // 1. Fetch Pending Claims (SUBMITTED, UNDER_REVIEW)
      // Using Canonical /api/claims/inbox/pending endpoint
      const claimsPromise = claimsService.getPendingClaims(commonParams);

      // 2. Fetch Pending Pre-Authorizations (PENDING)
      // Using Canonical /api/pre-authorizations endpoint
      const preAuthPromise = preApprovalsService.getPending(commonParams);

      const [claimsRes, preAuthRes] = await Promise.allSettled([claimsPromise, preAuthPromise]);

      const loadedClaims = claimsRes.status === 'fulfilled' ? claimsRes.value.items || claimsRes.value.content || [] : [];
      const loadedPreAuths = preAuthRes.status === 'fulfilled' ? preAuthRes.value.items || preAuthRes.value.content || [] : [];

      setClaims(loadedClaims);
      setPreApprovals(loadedPreAuths);

      setStats({
        pendingClaims: claimsRes.status === 'fulfilled' ? labelsCount(claimsRes.value) : 0,
        pendingPreAuths: preAuthRes.status === 'fulfilled' ? preAuthRes.value.total || preAuthRes.value.totalElements || 0 : 0,
        totalPending:
          (claimsRes.status === 'fulfilled' ? labelsCount(claimsRes.value) : 0) +
          (preAuthRes.status === 'fulfilled' ? preAuthRes.value.total || preAuthRes.value.totalElements || 0 : 0)
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('فشل في تحميل بيانات لوحة الموافقات');
    } finally {
      setLoading(false);
    }
  }, [isMedicalReviewer, selectedProviderId]);

  const labelsCount = (res) => res.total || res.totalElements || 0;

  useEffect(() => {
    const loadReviewerProviders = async () => {
      if (!isMedicalReviewer) {
        return;
      }

      setProvidersLoading(true);
      try {
        const assignedProviders = await medicalReviewersService.getMyProviders();
        const normalizedProviders = Array.isArray(assignedProviders) ? assignedProviders : [];
        setProviders(normalizedProviders);

        if (normalizedProviders.length === 0) {
          setSelectedProviderId(null);
          return;
        }

        if (normalizedProviders.length === 1) {
          const autoProviderId = normalizedProviders[0].id;
          setSelectedProviderId(autoProviderId);
          localStorage.setItem(SELECTED_PROVIDER_STORAGE_KEY, String(autoProviderId));
          return;
        }

        const storedProviderId = Number(localStorage.getItem(SELECTED_PROVIDER_STORAGE_KEY));
        const hasStoredProvider = normalizedProviders.some((provider) => provider.id === storedProviderId);

        if (hasStoredProvider) {
          setSelectedProviderId(storedProviderId);
        } else {
          setSelectedProviderId(null);
        }
      } catch (loadError) {
        console.error('Failed to load reviewer providers:', loadError);
        setProviders([]);
        setSelectedProviderId(null);
      } finally {
        setProvidersLoading(false);
      }
    };

    loadReviewerProviders();
  }, [isMedicalReviewer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProviderChange = (event) => {
    const numericProviderId = Number(event.target.value);
    if (!numericProviderId) return;

    setSelectedProviderId(numericProviderId);
    localStorage.setItem(SELECTED_PROVIDER_STORAGE_KEY, String(numericProviderId));
  };

  // Columns for Pre-Approvals
  const preAuthColumns = [
    {
      field: 'id',
      headerName: 'رقم الطلب',
      width: 100,
      valueGetter: (value, row) => row?.referenceNumber || `PA-${row?.id}` || row?.id || '-'
    },
    {
      field: 'memberName',
      headerName: 'المؤمن عليه',
      width: 200,
      valueGetter: (value, row) => row?.memberName || row?.member?.name || '-'
    },
    {
      field: 'providerName',
      headerName: 'مقدم الخدمة',
      width: 200,
      valueGetter: (value, row) => row?.providerName || row?.provider?.name || '-'
    },
    {
      field: 'serviceName',
      headerName: 'الخدمة',
      width: 180,
      valueGetter: (value, row) => row?.serviceName || row?.serviceCode || '-'
    },
    {
      field: 'serviceDate',
      headerName: 'تاريخ الخدمة',
      width: 120,
      valueGetter: (value, row) => row?.requestDate || row?.visitDate || row?.serviceDate || '-'
    },
    {
      field: 'status',
      headerName: 'الحالة',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params?.value === 'PENDING' ? 'معلق' : params?.value || '-'}
          color={params?.value === 'PENDING' ? 'warning' : params?.value === 'APPROVED' ? 'success' : 'default'}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'إجراءات',
      width: 150,
      renderCell: (params) =>
        params?.row?.id ? (
          <Tooltip title="المراجعة">
            <IconButton color="primary" onClick={() => navigate(`/pre-approvals/${params.row.id}`)}>
              <ViewIcon />
            </IconButton>
          </Tooltip>
        ) : null
    }
  ];

  // Columns for Claims
  const claimColumns = [
    {
      field: 'claimNumber',
      headerName: 'رقم المطالبة',
      width: 150,
      valueGetter: (value, row) => row?.claimNumber || `CLM-${row?.id}` || '-'
    },
    {
      field: 'memberName',
      headerName: 'المؤمن عليه',
      width: 200,
      valueGetter: (value, row) => row?.memberName || row?.memberFullName || '-'
    },
    {
      field: 'providerName',
      headerName: 'مقدم الخدمة',
      width: 200,
      valueGetter: (value, row) => row?.providerName || '-'
    },
    {
      field: 'doctorName',
      headerName: 'الطبيب',
      width: 150,
      valueGetter: (value, row) => row?.doctorName || '-'
    },
    {
      field: 'totalAmount',
      headerName: 'المبلغ',
      width: 120,
      valueGetter: (value, row) => {
        const amount = row?.totalAmount || row?.requestedAmount;
        return amount ? `${Number(amount).toLocaleString()} د.ل` : '-';
      }
    },
    {
      field: 'serviceDate',
      headerName: 'التاريخ',
      width: 120,
      valueGetter: (value, row) => row?.serviceDate || row?.visitDate || '-'
    },
    {
      field: 'status',
      headerName: 'الحالة',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params?.row?.statusLabel || params?.value || '-'}
          color={params?.value === 'SUBMITTED' ? 'info' : params?.value === 'UNDER_REVIEW' ? 'warning' : 'default'}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'إجراءات',
      width: 150,
      renderCell: (params) =>
        params?.row?.id ? (
          <Tooltip title="المراجعة">
            <IconButton color="primary" onClick={() => navigate(`/claims/${params.row.id}/medical-review`)}>
              <ViewIcon />
            </IconButton>
          </Tooltip>
        ) : null
    }
  ];

  return (
    <>
      <ModernPageHeader
        title="لوحة الموافقات الموحدة"
        subtitle="متابعة المطالبات والموافقات المسبقة المعلقة"
        icon={DashboardIcon}
        actions={
          <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined">
            تحديث
          </Button>
        }
      />

      <MainCard>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isMedicalReviewer && providers.length === 0 && !providersLoading && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            لا يوجد مقدم خدمة معيّن لهذا المراجع الطبي. يرجى تعيين مقدم خدمة أولًا.
          </Alert>
        )}

        {isMedicalReviewer && providers.length > 1 && (
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel id="reviewer-provider-select-label">مقدم الخدمة</InputLabel>
              <Select
                labelId="reviewer-provider-select-label"
                value={selectedProviderId || ''}
                label="مقدم الخدمة"
                onChange={handleProviderChange}
              >
                {providers.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name || provider.providerName || `Provider #${provider.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {providersLoading && <CircularProgress size={22} />}
          </Stack>
        )}

        {/* SUMMARY CARDS */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Pre-Approvals Stats */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.main' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="warning.dark" gutterBottom>
                    موافقات مسبقة معلقة
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.pendingPreAuths}
                  </Typography>
                  <Button size="small" endIcon={<PreApprovalIcon />} onClick={() => navigate('/pre-approvals/inbox')} sx={{ mt: 1 }}>
                    عرض الصندوق
                  </Button>
                </Box>
                <PreApprovalIcon sx={{ fontSize: 60, color: 'warning.light', opacity: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>

          {/* Claims Stats */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" color="info.dark" gutterBottom>
                    مطالبات للمراجعة
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.pendingClaims}
                  </Typography>
                  <Button size="small" endIcon={<ClaimIcon />} onClick={() => navigate('/claims')} sx={{ mt: 1 }}>
                    عرض الصندوق
                  </Button>
                </Box>
                <ClaimIcon sx={{ fontSize: 60, color: 'info.light', opacity: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* TABLES */}
        <Stack spacing={4}>
          {/* Section 1: Pre-Approvals */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <PreApprovalIcon color="warning" />
              <Typography variant="h5">آخر طلبات الموافقة المسبقة</Typography>
            </Stack>
            <Box sx={{ height: 350, width: '100%' }}>
              <DataGrid
                rows={preApprovals}
                columns={preAuthColumns}
                loading={loading}
                pageSize={5}
                rowsPerPageOptions={[5]}
                disableSelectionOnClick
                autoHeight={false}
                sx={{ bgcolor: 'background.paper' }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Section 2: Claims */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ClaimIcon color="info" />
              <Typography variant="h5">آخر المطالبات الواردة</Typography>
            </Stack>
            <Box sx={{ height: 350, width: '100%' }}>
              <DataGrid
                rows={claims}
                columns={claimColumns}
                loading={loading}
                pageSize={5}
                rowsPerPageOptions={[5]}
                disableSelectionOnClick
                autoHeight={false}
                sx={{ bgcolor: 'background.paper' }}
              />
            </Box>
          </Box>
        </Stack>
      </MainCard>
    </>
  );
};

export default ApprovalsDashboard;
