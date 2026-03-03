/**
 * Claims Review List - قائمة المطالبات للمراجعة
 *
 * ARCHITECTURAL LAW: Claims creation happens ONLY from Provider Portal
 * This page is for REVIEWERS to view and process claims created by providers
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Alert,
  Card,
  Chip,
  Stack,
  Button,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Assignment as ClaimIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { UnifiedMedicalTable } from 'components/common';
import { claimsService, medicalReviewersService } from 'services/api';
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
 * Claims Review List
 * Shows pending claims for medical reviewers
 */
export default function ClaimsReviewList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState(null);

  const userRoles = getCurrentUserRoles(user);
  const isMedicalReviewer = userRoles.includes('MEDICAL_REVIEWER');

  // ========================================
  // DATA FETCHING
  // ========================================

  const fetchClaims = async () => {
    if (isMedicalReviewer && !selectedProviderId) {
      setClaims([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const params = {
        page: 0,
        size: 100,
        ...(selectedProviderId && { providerId: selectedProviderId }),
        ...(statusFilter && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      };

      const response = await claimsService.getPendingClaims(params);
      const items = response?.items || response?.content || response?.data || [];
      setClaims(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to fetch claims:', err);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadReviewerProviders = async () => {
      if (!isMedicalReviewer) {
        return;
      }

      setProvidersLoading(true);
      try {
        const providers = await medicalReviewersService.getMyProviders();
        const normalizedProviders = Array.isArray(providers) ? providers : [];
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
      } catch (error) {
        console.error('Failed to load reviewer providers:', error);
        setProviders([]);
        setSelectedProviderId(null);
      } finally {
        setProvidersLoading(false);
      }
    };

    loadReviewerProviders();
  }, [isMedicalReviewer]);

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, selectedProviderId]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleSearch = () => {
    fetchClaims();
  };

  const handleViewClaim = (claimId) => {
    navigate(`/claims/${claimId}/medical-review`);
  };

  const handleProviderChange = (e) => {
    const numericProviderId = Number(e.target.value);
    if (!numericProviderId) return;

    if (selectedProviderId) {
      const confirmed = window.confirm('سيتم إعادة تحميل قائمة المطالبات حسب مقدم الخدمة الجديد. هل تريد المتابعة؟');
      if (!confirmed) {
        return;
      }
    }

    setSelectedProviderId(numericProviderId);
    localStorage.setItem(SELECTED_PROVIDER_STORAGE_KEY, String(numericProviderId));
  };

  const claimsCount = claims.length;

  // ========================================
  // TABLE COLUMNS DEFINITION
  // ========================================

  const columns = [
    {
      id: 'claimNumber',
      label: 'رقم المطالبة',
      minWidth: 150,
      icon: <ReceiptIcon fontSize="small" />,
      sortable: false
    },
    {
      id: 'member',
      label: 'اسم المنتفع',
      minWidth: 180,
      icon: <PersonIcon fontSize="small" />,
      sortable: false
    },
    {
      id: 'provider',
      label: 'مقدم الخدمة',
      minWidth: 180,
      sortable: false
    },
    {
      id: 'claimedAmount',
      label: 'المبلغ المطلوب',
      minWidth: 120,
      align: 'right',
      sortable: false
    },
    {
      id: 'status',
      label: 'الحالة',
      minWidth: 140,
      align: 'center',
      sortable: false
    },
    {
      id: 'submittedDate',
      label: 'تاريخ التقديم',
      minWidth: 130,
      sortable: false
    },
    {
      id: 'actions',
      label: 'الإجراءات',
      minWidth: 100,
      align: 'center',
      sortable: false
    }
  ];

  // ========================================
  // TABLE CELL RENDERER
  // ========================================

  const getStatusChip = (status) => {
    const statusConfig = {
      SUBMITTED: { label: 'مقدمة', color: 'info' },
      UNDER_REVIEW: { label: 'قيد المراجعة', color: 'warning' },
      APPROVAL_IN_PROGRESS: { label: 'جاري معالجة الموافقة', color: 'warning' },
      APPROVED: { label: 'موافق عليها', color: 'success' },
      BATCHED: { label: 'ضمن دفعة تسوية', color: 'secondary' },
      NEEDS_CORRECTION: { label: 'تحتاج تصحيح', color: 'warning' },
      REJECTED: { label: 'مرفوضة', color: 'error' },
      PAID: { label: 'مدفوعة', color: 'default' }
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const renderCell = (claim, column) => {
    if (!claim) return null;

    switch (column.id) {
      case 'claimNumber':
        return (
          <Typography variant="body2" fontWeight={600}>
            {claim.claimNumber || '—'}
          </Typography>
        );

      case 'member':
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{claim.memberName || '—'}</Typography>
          </Stack>
        );

      case 'provider':
        return <Typography variant="body2">{claim.providerName || '—'}</Typography>;

      case 'claimedAmount':
        {
          const amount = claim.claimedAmount ?? claim.totalAmount ?? claim.requestedAmount ?? 0;
          return (
            <Typography variant="body2" fontWeight={500}>
              {new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(Number(amount) || 0)}{' '}
              د.ل
            </Typography>
          );
        }

      case 'status':
        return getStatusChip(claim.status);

      case 'submittedDate':
        {
          const submittedAt = claim.submittedDate || claim.submissionDate || claim.createdAt || claim.claimDate || null;
          return <Typography variant="body2">{submittedAt ? new Date(submittedAt).toLocaleDateString('en-CA') : '—'}</Typography>;
        }

      case 'actions':
        return (
          <Tooltip title="مراجعة المطالبة">
            <IconButton size="small" color="primary" onClick={() => handleViewClaim(claim.claimId || claim.id)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );

      default:
        return null;
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Box>
      <ModernPageHeader
        title="مراجعة المطالبات"
        subtitle="مراجعة ومعالجة المطالبات المقدمة من مقدمي الخدمة"
        icon={<ClaimIcon />}
        breadcrumbs={[{ label: 'الرئيسية', path: '/dashboard' }, { label: 'مراجعة المطالبات' }]}
      />

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          البحث والفلترة
        </Typography>

        {isMedicalReviewer && providers.length === 0 && !providersLoading && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            لا توجد جهات مقدمة خدمة مرتبطة بحسابك حالياً. يرجى التواصل مع مدير النظام.
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="بحث برقم المطالبة أو اسم المنتفع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>حالة المطالبة</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="حالة المطالبة">
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="SUBMITTED">مقدمة</MenuItem>
                <MenuItem value="UNDER_REVIEW">قيد المراجعة</MenuItem>
                <MenuItem value="APPROVED">موافق عليها</MenuItem>
                <MenuItem value="REJECTED">مرفوضة</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" color="primary" startIcon={<SearchIcon />} onClick={handleSearch} sx={{ height: '56px' }}>
              بحث
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Table */}
      <MainCard
        title="قائمة المطالبات"
        secondary={
          <Button variant="outlined" color="primary" startIcon={<RefreshIcon />} onClick={fetchClaims} disabled={loading || providersLoading}>
            تحديث
          </Button>
        }
      >
        {isMedicalReviewer && providers.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">فلترة حسب مقدم الخدمة:</Typography>

            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel>مقدم الخدمة</InputLabel>
              <Select value={selectedProviderId || ''} label="مقدم الخدمة" onChange={handleProviderChange}>
                {providers.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedProviderId && <Chip label={`عدد المطالبات: ${claimsCount}`} color="primary" size="small" />}
          </Box>
        )}

        {isMedicalReviewer && providers.length > 1 && !selectedProviderId ? (
          <Alert severity="info">يرجى اختيار مقدم خدمة لعرض المطالبات.</Alert>
        ) : (
          <UnifiedMedicalTable
            columns={columns}
            rows={claims}
            loading={loading}
            renderCell={renderCell}
            totalCount={claims.length}
            emptyIcon={ClaimIcon}
            emptyMessage="لا توجد مطالبات مقدمة للمراجعة حالياً"
          />
        )}
      </MainCard>
    </Box>
  );
}
