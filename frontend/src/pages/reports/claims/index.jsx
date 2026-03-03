import { useState, useEffect } from 'react';
import useEmployerScope from 'hooks/useEmployerScope';
import useClaimsReport, { DEFAULT_FILTERS, CLAIM_STATUS_LABELS } from 'hooks/useClaimsReport';
import { formatNumber } from 'utils/formatters';
import { providersService } from 'services/api/providers.service';
import { exportToExcel } from 'utils/exportUtils';
import { useCompanySettings } from 'contexts/CompanySettingsContext';

// MUI Components
import { Box, Stack, Typography, IconButton, Tooltip, Alert, Chip, AlertTitle, Button } from '@mui/material';

// MUI Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Components
import MainCard from 'components/MainCard';
import { ClaimsFilters, ClaimsTable } from 'components/reports/claims';

/**
 * Claims Operational Report
 *
 * READ-ONLY operational view of claims.
 * All filtering is handled server-side for financial integrity.
 *
 * Architecture: Employer → Member → Claim
 *
 * RBAC:
 * - SUPER_ADMIN / ADMIN → All partners, partner selector enabled
 * - EMPLOYER_ADMIN / REVIEWER → Own partner only, selector disabled
 * - PROVIDER → No access (blocked by route guard)
 */
const ClaimsReport = () => {
  // Company branding from SSOT
  const { companyName } = useCompanySettings();

  // Use centralized employer scope hook (RBAC enforcement)
  const [selectedEmployerId, setSelectedEmployerId] = useState(null);
  const { canSelectEmployer, effectiveEmployerId, employers, isEmployerLocked, userEmployerId } = useEmployerScope(selectedEmployerId);

  // Initialize selected employer for locked roles
  useEffect(() => {
    if (isEmployerLocked && userEmployerId && !selectedEmployerId) {
      setSelectedEmployerId(userEmployerId);
    }
  }, [isEmployerLocked, userEmployerId, selectedEmployerId]);

  // State: Provider filter
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [providers, setProviders] = useState([]);

  // Fetch providers list on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await providersService.getSelector();
        const providersList = data ?? [];
        setProviders(Array.isArray(providersList) ? providersList : []);
      } catch (err) {
        console.error('Failed to fetch providers:', err);
        setProviders([]);
      }
    };
    fetchProviders();
  }, []);

  // State: Filters
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // State: Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Fetch claims data with both employer and provider filters
  const { claims, totalCount, totalFetched, loading, error, pagination, refetch } = useClaimsReport({
    employerId: effectiveEmployerId,
    providerId: selectedProviderId,
    filters
  });

  // Check if we have partial data (large dataset warning)
  const hasPartialData = pagination.totalElements > totalFetched;

  // Handlers
  const handleEmployerChange = (employerId) => {
    if (canSelectEmployer) {
      setSelectedEmployerId(employerId);
      setPage(0); // Reset pagination on employer change
    }
  };

  const handleProviderChange = (providerId) => {
    setSelectedProviderId(providerId);
    setPage(0); // Reset pagination on provider change
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset pagination on filter change
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newSize) => {
    setRowsPerPage(newSize);
    setPage(0);
  };

  /**
    * Export claims to Excel (XLSX format with Arabic support)
    * Uses the unified XLSX export utility.
   */
  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData = claims.map((claim) => ({
        'رقم المطالبة': claim._raw?.claimNumber || claim.id,
        'اسم المؤمن عليه': claim.memberName,
        الشريك: claim.employerName,
        'مقدم الخدمة': claim.providerName,
        الحالة: CLAIM_STATUS_LABELS[claim.status] || claim.status,
        'المبلغ المطلوب': claim.requestedAmount,
        'المبلغ المعتمد': claim.approvedAmount || '-',
        'تاريخ الزيارة': claim.visitDate || '-',
        'آخر تحديث': claim.updatedAt ? new Date(claim.updatedAt).toLocaleDateString('en-US') : '-'
      }));

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `تقرير_المطالبات_${timestamp}`;

      // Export using unified utility with company branding
      exportToExcel(exportData, filename, { companyName });
    } catch (error) {
      console.error('Failed to export Excel:', error);
    }
  };

  return (
    <MainCard
      title="تقرير المطالبات التشغيلي"
      secondary={
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Record count badge */}
          <Chip label={`${totalCount} مطالبة`} size="small" color="primary" variant="outlined" />

          {/* Export Excel Button */}
          <Tooltip title="تصدير Excel">
            <Button
              variant="outlined"
              size="small"
              color="success"
              onClick={handleExportExcel}
              disabled={loading || totalCount === 0}
              startIcon={<FileDownloadIcon />}
            >
              Excel
            </Button>
          </Tooltip>

          {/* Refresh Button */}
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={refetch} disabled={loading} color="primary">
              <RefreshIcon
                sx={{
                  fontSize: 20,
                  animation: loading ? 'spin 1s linear infinite' : 'none'
                }}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {/* Error Alert */}
      {error && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Large Dataset Warning */}
      {hasPartialData && (
        <Alert severity="warning" icon={<ErrorOutlineIcon />} sx={{ mb: 2 }}>
          <AlertTitle>تحذير: بيانات جزئية</AlertTitle>
          <Typography variant="body2">
            تم تحميل {formatNumber(totalFetched)} سجل من أصل {formatNumber(pagination.totalElements)} سجل. الفلاتر تطبق على البيانات
            المحمّلة فقط. النتائج قد تكون غير شاملة.
          </Typography>
        </Alert>
      )}

      {/* Filters - Single unified filter panel with Employer, Provider, and other filters */}
      <ClaimsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        employers={employers}
        canSelectEmployer={canSelectEmployer}
        selectedEmployerId={selectedEmployerId}
        onEmployerChange={handleEmployerChange}
        providers={providers}
        selectedProviderId={selectedProviderId}
        onProviderChange={handleProviderChange}
      />

      {/* Data Summary */}
      {!loading && totalFetched > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            إجمالي السجلات: <strong>{totalFetched}</strong>
          </Typography>
          {totalCount !== totalFetched && (
            <Typography variant="body2" color="text.secondary">
              | بعد الفلترة: <strong>{totalCount}</strong>
            </Typography>
          )}
        </Box>
      )}

      {/* Claims Table */}
      <ClaimsTable
        claims={claims}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </MainCard>
  );
};

export default ClaimsReport;
