/**
 * Add Claims to Batch Page - Phase 3B Settlement
 * Add more claims to an existing DRAFT batch
 *
 * Features:
 * - Shows available claims for the batch's provider
 * - Multi-select claims
 * - Add to batch
 *
 * NOTE: Only works for DRAFT batches
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// MUI Components
import { Alert, Box, Button, Checkbox, Divider, IconButton, Paper, Stack, Typography } from '@mui/material';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';

// Services
import { settlementBatchesService } from 'services/api/settlement.service';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0 د.ل';
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AddClaimsToBatch = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedClaims, setSelectedClaims] = useState([]);

  // ========================================
  // DATA FETCHING
  // ========================================

  // Fetch batch details
  const {
    data: batchData,
    isLoading: isLoadingBatch,
    isError: isBatchError,
    error: batchError
  } = useQuery({
    queryKey: ['settlement-batch', batchId],
    queryFn: () => settlementBatchesService.getById(batchId),
    enabled: !!batchId
  });

  // Fetch available claims for the batch's provider
  const { data: availableClaims, isLoading: isLoadingClaims } = useQuery({
    queryKey: ['available-claims', batchData?.providerId],
    queryFn: () => settlementBatchesService.getAvailableClaims(batchData?.providerId),
    enabled: !!batchData?.providerId
  });

  // ========================================
  // MUTATION
  // ========================================

  const addClaimsMutation = useMutation({
    mutationFn: (claimIds) => settlementBatchesService.addClaims(batchId, claimIds),
    onSuccess: () => {
      queryClient.invalidateQueries(['settlement-batch', batchId]);
      queryClient.invalidateQueries(['available-claims']);
      openSnackbar({
        message: 'تم إضافة المطالبات بنجاح',
        variant: 'success'
      });
      navigate(`/settlement/batches/${batchId}`);
    },
    onError: (error) => {
      openSnackbar({
        message: error.message || 'فشل في إضافة المطالبات',
        variant: 'error'
      });
    }
  });

  // ========================================
  // HANDLERS
  // ========================================

  const handleBack = useCallback(() => {
    navigate(`/settlement/batches/${batchId}`);
  }, [navigate, batchId]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedClaims(availableClaims?.map((c) => c.id) || []);
    } else {
      setSelectedClaims([]);
    }
  };

  const handleSelectOne = (claimId) => {
    if (selectedClaims.includes(claimId)) {
      setSelectedClaims(selectedClaims.filter((id) => id !== claimId));
    } else {
      setSelectedClaims([...selectedClaims, claimId]);
    }
  };

  const handleAddClaims = useCallback(() => {
    if (selectedClaims.length === 0) {
      openSnackbar({
        message: 'يرجى اختيار مطالبة واحدة على الأقل',
        variant: 'warning'
      });
      return;
    }
    addClaimsMutation.mutate(selectedClaims);
  }, [selectedClaims, addClaimsMutation]);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  /**
   * ⚠️ UX-ONLY CALCULATION - NOT SENT TO BACKEND
   *
   * This total is for DISPLAY PURPOSES ONLY to help users preview the batch.
   * The authoritative total is calculated by the backend when claims are added.
   *
   * SAFETY NOTES:
   * - This value is NEVER sent in API requests
   * - Backend ignores any frontend-calculated totals
   * - Real total comes from backend response after adding claims
   */
  const selectedTotal = useMemo(() => {
    if (!availableClaims || !selectedClaims.length) return 0;
    return availableClaims.filter((c) => selectedClaims.includes(c.id)).reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
  }, [availableClaims, selectedClaims]);

  // ========================================
  // TABLE COLUMNS
  // ========================================

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={availableClaims?.length > 0 && selectedClaims.length === availableClaims?.length}
            indeterminate={selectedClaims.length > 0 && selectedClaims.length < (availableClaims?.length || 0)}
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
      }
    ],
    [availableClaims, selectedClaims]
  );

  // ========================================
  // BREADCRUMBS
  // ========================================

  const breadcrumbs = [
    { label: 'الرئيسية', path: '/' },
    { label: 'التسويات', path: '/settlement' },
    { label: 'دفعات التسوية', path: '/settlement/batches' },
    { label: batchData?.batchNumber || `دفعة #${batchId}`, path: `/settlement/batches/${batchId}` },
    { label: 'إضافة مطالبات' }
  ];

  // ========================================
  // RENDER
  // ========================================

  // Check if batch is not DRAFT
  if (batchData && batchData.status !== 'DRAFT') {
    return (
      <Box>
        <UnifiedPageHeader
          title="إضافة مطالبات"
          breadcrumbs={breadcrumbs}
          icon={PaymentsIcon}
          actions={
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
          }
        />
        <Alert severity="error">لا يمكن إضافة مطالبات لهذه الدفعة - الدفعة ليست في حالة مسودة</Alert>
      </Box>
    );
  }

  if (isBatchError) {
    return (
      <Box>
        <UnifiedPageHeader
          title="إضافة مطالبات"
          breadcrumbs={breadcrumbs}
          icon={PaymentsIcon}
          actions={
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
          }
        />
        <Alert severity="error">{batchError?.message || 'فشل في تحميل بيانات الدفعة'}</Alert>
      </Box>
    );
  }

  return (
    <PermissionGuard resource="settlements" action="create" fallback={<Alert severity="error">ليس لديك صلاحية لتعديل دفعات التسوية</Alert>}>
      <Box>
        {/* Page Header */}
        <UnifiedPageHeader
          title="إضافة مطالبات للدفعة"
          subtitle={`${batchData?.batchNumber || ''} - ${batchData?.providerName || ''}`}
          breadcrumbs={breadcrumbs}
          icon={PaymentsIcon}
          actions={
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddClaims}
                disabled={selectedClaims.length === 0 || addClaimsMutation.isPending}
              >
                {addClaimsMutation.isPending ? 'جاري الإضافة...' : `إضافة (${selectedClaims.length})`}
              </Button>
              <IconButton onClick={handleBack}>
                <ArrowBackIcon />
              </IconButton>
            </Stack>
          }
        />

        {/* Selection Summary */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter', borderRadius: 2 }}>
          <Stack direction="row" spacing={3} alignItems="center" justifyContent="center">
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                تم اختيار
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {selectedClaims.length}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                إجمالي المبلغ
              </Typography>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {formatCurrency(selectedTotal)}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Claims Table */}
        <MainCard title="المطالبات المتاحة">
          <TableErrorBoundary>
            <GenericDataTable
              columns={columns}
              data={availableClaims || []}
              totalCount={availableClaims?.length || 0}
              isLoading={isLoadingBatch || isLoadingClaims}
              enableFiltering={true}
              enableSorting={true}
              enablePagination={true}
              stickyHeader
              emptyMessage="لا توجد مطالبات متاحة للإضافة"
            />
          </TableErrorBoundary>
        </MainCard>
      </Box>
    </PermissionGuard>
  );
};

export default AddClaimsToBatch;
