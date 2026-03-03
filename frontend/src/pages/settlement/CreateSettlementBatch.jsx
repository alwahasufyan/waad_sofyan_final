/**
 * Create Settlement Batch Page - Phase 3B Settlement
 * Wizard for creating a new settlement batch with claim selection
 *
 * Flow:
 * 1. Select Provider
 * 2. Select APPROVED claims (multi-select)
 * 3. Review and create batch
 *
 * Features:
 * - Provider selector
 * - Multi-select claims table
 * - Filter by date, amount
 * - Real-time total calculation (from selected items, not frontend math)
 * - Batch creation
 *
 * Architecture:
 * ✅ All totals calculated from selected claims (no separate math)
 * ❌ NO frontend financial calculations
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// MUI Components
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from '@mui/material';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';

// Services
import { settlementBatchesService, providerAccountsService } from 'services/api/settlement.service';
import { medicalReviewersService } from 'services/api';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = ['اختيار مقدم الخدمة', 'اختيار المطالبات', 'مراجعة وإنشاء'];
const SELECTED_PROVIDER_STORAGE_KEY = 'reviewer_selected_provider';

const getCurrentUserRoles = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
    return roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean);
  } catch {
    return [];
  }
};

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
// STEP 1: PROVIDER SELECTION
// ============================================================================

const ProviderSelectionStep = ({ providers, selectedProvider, onSelect, isLoading }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        اختر مقدم الخدمة
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        اختر مقدم الخدمة الذي تريد إنشاء دفعة تسوية له
      </Typography>

      <FormControl fullWidth>
        <InputLabel id="provider-select-label">مقدم الخدمة</InputLabel>
        <Select
          labelId="provider-select-label"
          value={selectedProvider || ''}
          label="مقدم الخدمة"
          onChange={(e) => onSelect(e.target.value)}
          disabled={isLoading}
        >
          {providers?.map((provider) => (
            <MenuItem key={provider.id} value={provider.id}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocalHospitalIcon fontSize="small" color="primary" />
                <Typography>{provider.name || provider.providerName}</Typography>
                {provider.runningBalance > 0 && (
                  <Chip label={formatCurrency(provider.runningBalance)} color="error" size="small" variant="outlined" />
                )}
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedProvider && providers && (
        <Card sx={{ mt: 3, bgcolor: 'primary.lighter' }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              مقدم الخدمة المختار
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {providers.find((p) => p.id === selectedProvider)?.name || providers.find((p) => p.id === selectedProvider)?.providerName}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// ============================================================================
// STEP 2: CLAIMS SELECTION
// ============================================================================

const ClaimsSelectionStep = ({ claims, selectedClaims, onSelectionChange, isLoading, providerName }) => {
  // Handle select all
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      onSelectionChange(claims?.map((c) => c.id) || []);
    } else {
      onSelectionChange([]);
    }
  };

  // Handle individual selection
  const handleSelectOne = (claimId) => {
    if (selectedClaims.includes(claimId)) {
      onSelectionChange(selectedClaims.filter((id) => id !== claimId));
    } else {
      onSelectionChange([...selectedClaims, claimId]);
    }
  };

  // Calculate totals from selected claims
  /**
   * ⚠️ UX-ONLY CALCULATION - NOT SENT TO BACKEND
   *
   * This total is for DISPLAY PURPOSES ONLY to help users preview the batch.
   * The authoritative total is calculated by the backend when the batch is created.
   *
   * SAFETY NOTES:
   * - This value is NEVER sent in API requests
   * - Backend ignores any frontend-calculated totals
   * - Real total comes from backend response after batch creation
   *
   * @see settlement.service.js - create() method (only sends providerId, claimIds)
   * @see CreateSettlementBatchRequest contract (NO amount fields allowed)
   */
  const selectedTotal = useMemo(() => {
    if (!claims || !selectedClaims.length) return 0;
    return claims.filter((c) => selectedClaims.includes(c.id)).reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
  }, [claims, selectedClaims]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={claims?.length > 0 && selectedClaims.length === claims?.length}
            indeterminate={selectedClaims.length > 0 && selectedClaims.length < (claims?.length || 0)}
            onChange={handleSelectAll}
          />
        ),
        cell: ({ row }) => (
          <Checkbox checked={selectedClaims.includes(row.original.id)} onChange={() => handleSelectOne(row.original.id)} />
        ),
        size: 60,
        enableSorting: false,
        enableColumnFilter: false
      },
      {
        id: 'claimNumber',
        header: 'رقم المطالبة',
        accessorKey: 'claimNumber',
        cell: ({ getValue, row }) => (
          <Typography fontWeight={600} color="primary.main">
            {getValue() || `CLM-${row.original.id}`}
          </Typography>
        ),
        size: 140
      },
      {
        id: 'memberName',
        header: 'المستفيد',
        accessorKey: 'memberName',
        size: 160
      },
      {
        id: 'serviceDate',
        header: 'تاريخ الخدمة',
        accessorKey: 'serviceDate',
        cell: ({ getValue }) => formatDate(getValue()),
        size: 120
      },
      {
        id: 'approvedAmount',
        header: 'المبلغ المعتمد',
        accessorKey: 'approvedAmount',
        cell: ({ getValue }) => (
          <Typography fontWeight={600} color="success.main">
            {formatCurrency(getValue())}
          </Typography>
        ),
        meta: { align: 'center' },
        size: 130
      },
      {
        id: 'status',
        header: 'الحالة',
        accessorKey: 'status',
        cell: ({ getValue }) => <Chip label="معتمد" color="success" size="small" variant="outlined" />,
        meta: { align: 'center' },
        size: 100
      }
    ],
    [claims, selectedClaims, handleSelectAll, handleSelectOne]
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            اختر المطالبات المعتمدة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {providerName} - المطالبات الجاهزة للتسوية
          </Typography>
        </Box>

        {/* Selection Summary */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 2 }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                تم اختيار
              </Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {selectedClaims.length}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                الإجمالي
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                {formatCurrency(selectedTotal)}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      {/* Claims Table */}
      <TableErrorBoundary>
        <GenericDataTable
          columns={columns}
          data={claims || []}
          totalCount={claims?.length || 0}
          isLoading={isLoading}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={true}
          stickyHeader
          emptyMessage="لا توجد مطالبات معتمدة جاهزة للتسوية"
        />
      </TableErrorBoundary>
    </Box>
  );
};

// ============================================================================
// STEP 3: REVIEW AND CREATE
// ============================================================================

const ReviewStep = ({ provider, selectedClaims, claims, description, onDescriptionChange, onSubmit, isSubmitting }) => {
  // Calculate totals from selected claims
  const selectedClaimsData = useMemo(() => {
    if (!claims || !selectedClaims.length) return [];
    return claims.filter((c) => selectedClaims.includes(c.id));
  }, [claims, selectedClaims]);

  const totalAmount = useMemo(() => {
    return selectedClaimsData.reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
  }, [selectedClaimsData]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        مراجعة وإنشاء الدفعة
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        راجع تفاصيل الدفعة قبل الإنشاء
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'primary.lighter', borderRadius: 2, textAlign: 'center' }}>
            <LocalHospitalIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              مقدم الخدمة
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {provider?.name || provider?.providerName}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'info.lighter', borderRadius: 2, textAlign: 'center' }}>
            <ReceiptIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              عدد المطالبات
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {selectedClaims.length}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'success.lighter', borderRadius: 2, textAlign: 'center' }}>
            <PaymentsIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              إجمالي المبلغ
            </Typography>
            <Typography variant="h4" fontWeight={700} color="success.main">
              {formatCurrency(totalAmount)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Description Input */}
      <TextField
        label="وصف الدفعة (اختياري)"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        fullWidth
        multiline
        rows={3}
        placeholder="أدخل وصفاً أو ملاحظات للدفعة"
        sx={{ mb: 3 }}
      />

      {/* Selected Claims Preview */}
      <MainCard title="المطالبات المختارة">
        <Stack spacing={1}>
          {selectedClaimsData.slice(0, 5).map((claim) => (
            <Paper key={claim.id} elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={500}>
                  {claim.claimNumber || `CLM-${claim.id}`} - {claim.memberName}
                </Typography>
                <Typography fontWeight={600} color="success.main">
                  {formatCurrency(claim.approvedAmount)}
                </Typography>
              </Stack>
            </Paper>
          ))}
          {selectedClaimsData.length > 5 && (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              و {selectedClaimsData.length - 5} مطالبة أخرى...
            </Typography>
          )}
        </Stack>
      </MainCard>

      {/* Submit Button */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<CheckCircleIcon />}
          onClick={onSubmit}
          disabled={isSubmitting || selectedClaims.length === 0}
          sx={{ minWidth: 200 }}
        >
          {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الدفعة'}
        </Button>
      </Box>
    </Box>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CreateSettlementBatch = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Get providerId from URL query params (for pre-selection)
  const preSelectedProviderId = searchParams.get('providerId');
  const userRoles = getCurrentUserRoles();
  const isMedicalReviewer = userRoles.includes('MEDICAL_REVIEWER');

  // Wizard state
  const [activeStep, setActiveStep] = useState(preSelectedProviderId ? 1 : 0);
  const [selectedProvider, setSelectedProvider] = useState(preSelectedProviderId ? Number(preSelectedProviderId) : null);
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [description, setDescription] = useState('');
  const [reviewerProviders, setReviewerProviders] = useState([]);
  const [isLoadingReviewerProviders, setIsLoadingReviewerProviders] = useState(false);

  // ========================================
  // DATA FETCHING
  // ========================================

  // Fetch providers with accounts
  const { data: providersData, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['providers-with-accounts'],
    queryFn: () => providerAccountsService.getAll(),
    staleTime: 1000 * 60 * 5
  });

  const normalizedProvidersData = useMemo(() => {
    const source = Array.isArray(providersData) ? providersData : [];
    return source
      .map((provider) => ({ ...provider, id: Number(provider.id ?? provider.providerId) }))
      .filter((provider) => Number.isFinite(provider.id));
  }, [providersData]);

  const providerOptions = useMemo(() => {
    if (!isMedicalReviewer) {
      return normalizedProvidersData;
    }

    const reviewerProviderIds = new Set(reviewerProviders.map((provider) => Number(provider.id)).filter((id) => Number.isFinite(id)));
    return normalizedProvidersData.filter((provider) => reviewerProviderIds.has(provider.id));
  }, [isMedicalReviewer, normalizedProvidersData, reviewerProviders]);

  useEffect(() => {
    const loadReviewerProviders = async () => {
      if (!isMedicalReviewer) {
        return;
      }

      setIsLoadingReviewerProviders(true);
      try {
        const response = await medicalReviewersService.getMyProviders();
        setReviewerProviders(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to load reviewer providers for settlement:', error);
        setReviewerProviders([]);
      } finally {
        setIsLoadingReviewerProviders(false);
      }
    };

    loadReviewerProviders();
  }, [isMedicalReviewer]);

  useEffect(() => {
    if (!isMedicalReviewer || isLoadingReviewerProviders) {
      return;
    }

    if (providerOptions.length === 0) {
      setSelectedProvider(null);
      setActiveStep(0);
      return;
    }

    if (providerOptions.length === 1) {
      const onlyProviderId = providerOptions[0].id;
      setSelectedProvider(onlyProviderId);
      setActiveStep(1);
      localStorage.setItem(SELECTED_PROVIDER_STORAGE_KEY, String(onlyProviderId));
      return;
    }

    const fromQuery = Number(preSelectedProviderId);
    const fromStorage = Number(localStorage.getItem(SELECTED_PROVIDER_STORAGE_KEY));
    const selectableIds = new Set(providerOptions.map((provider) => provider.id));

    if (Number.isFinite(fromQuery) && selectableIds.has(fromQuery)) {
      setSelectedProvider(fromQuery);
      setActiveStep(1);
      localStorage.setItem(SELECTED_PROVIDER_STORAGE_KEY, String(fromQuery));
      return;
    }

    if (Number.isFinite(fromStorage) && selectableIds.has(fromStorage)) {
      setSelectedProvider(fromStorage);
      setActiveStep(1);
      return;
    }

    setSelectedProvider(null);
    setActiveStep(0);
  }, [isMedicalReviewer, isLoadingReviewerProviders, providerOptions, preSelectedProviderId]);

  // Fetch available claims for selected provider
  const { data: availableClaims, isLoading: isLoadingClaims } = useQuery({
    queryKey: ['available-claims', selectedProvider],
    queryFn: () => settlementBatchesService.getAvailableClaims(selectedProvider),
    enabled: !!selectedProvider,
    staleTime: 1000 * 60 * 2
  });

  // ========================================
  // MUTATION
  // ========================================

  const createBatchMutation = useMutation({
    mutationFn: (data) => settlementBatchesService.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['settlement-batches']);
      queryClient.invalidateQueries(['available-claims']);
      openSnackbar({
        message: 'تم إنشاء الدفعة بنجاح',
        variant: 'success'
      });
      // Navigate to the created batch (API returns batchId, not id)
      const batchId = result.batchId || result.id;
      if (batchId) {
        navigate(`/settlement/batches/${batchId}`);
      } else {
        navigate('/settlement/batches');
      }
    },
    onError: (error) => {
      openSnackbar({
        message: error.message || 'فشل في إنشاء الدفعة',
        variant: 'error'
      });
    }
  });

  // ========================================
  // HANDLERS
  // ========================================

  const handleBack = useCallback(() => {
    if (activeStep === 0) {
      navigate('/settlement/batches');
    } else {
      setActiveStep((prev) => prev - 1);
    }
  }, [activeStep, navigate]);

  const handleNext = useCallback(() => {
    if (activeStep === 0 && !selectedProvider) {
      openSnackbar({
        message: 'يرجى اختيار مقدم الخدمة',
        variant: 'warning'
      });
      return;
    }

    if (activeStep === 1 && selectedClaims.length === 0) {
      openSnackbar({
        message: 'يرجى اختيار مطالبة واحدة على الأقل',
        variant: 'warning'
      });
      return;
    }

    setActiveStep((prev) => prev + 1);
  }, [activeStep, selectedProvider, selectedClaims]);

  const handleProviderSelect = useCallback((providerId) => {
    const numericProviderId = Number(providerId);
    if (!numericProviderId) return;

    if (selectedProvider && numericProviderId !== selectedProvider) {
      const confirmed = window.confirm('سيتم إعادة تحميل قائمة المطالبات حسب مقدم الخدمة الجديد. هل تريد المتابعة؟');
      if (!confirmed) return;
    }

    setSelectedProvider(numericProviderId);
    localStorage.setItem(SELECTED_PROVIDER_STORAGE_KEY, String(numericProviderId));
    setSelectedClaims([]); // Reset claims when provider changes
  }, [selectedProvider]);

  const handleSubmit = useCallback(() => {
    createBatchMutation.mutate({
      providerId: selectedProvider,
      description: description || undefined,
      claimIds: selectedClaims
    });
  }, [createBatchMutation, selectedProvider, description, selectedClaims]);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const selectedProviderData = useMemo(() => {
    return providerOptions?.find((p) => p.id === selectedProvider || p.providerId === selectedProvider);
  }, [providerOptions, selectedProvider]);

  // ========================================
  // BREADCRUMBS
  // ========================================

  const breadcrumbs = [
    { label: 'الرئيسية', path: '/' },
    { label: 'التسويات', path: '/settlement' },
    { label: 'دفعات التسوية', path: '/settlement/batches' },
    { label: 'إنشاء دفعة جديدة' }
  ];

  // ========================================
  // PAGE ACTIONS
  // ========================================

  const pageActions = (
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
        {activeStep === 0 ? 'إلغاء' : 'السابق'}
      </Button>
      {activeStep < STEPS.length - 1 && (
        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext}>
          التالي
        </Button>
      )}
    </Stack>
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <PermissionGuard resource="settlements" action="create" fallback={<Alert severity="error">ليس لديك صلاحية لإنشاء دفعات تسوية</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="إنشاء دفعة تسوية"
          subtitle="معالج إنشاء دفعة تسوية جديدة"
          breadcrumbs={breadcrumbs}
          icon={PaymentsIcon}
          actions={pageActions}
        />

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <MainCard>
          {activeStep === 0 && (
            <ProviderSelectionStep
              providers={providerOptions}
              selectedProvider={selectedProvider}
              onSelect={handleProviderSelect}
              isLoading={isLoadingProviders || isLoadingReviewerProviders}
            />
          )}

          {activeStep === 1 && (
            <ClaimsSelectionStep
              claims={availableClaims}
              selectedClaims={selectedClaims}
              onSelectionChange={setSelectedClaims}
              isLoading={isLoadingClaims}
              providerName={selectedProviderData?.name || selectedProviderData?.providerName}
            />
          )}

          {activeStep === 2 && (
            <ReviewStep
              provider={selectedProviderData}
              selectedClaims={selectedClaims}
              claims={availableClaims}
              description={description}
              onDescriptionChange={setDescription}
              onSubmit={handleSubmit}
              isSubmitting={createBatchMutation.isPending}
            />
          )}
        </MainCard>
      </Box>
    </PermissionGuard>
  );
};

export default CreateSettlementBatch;
