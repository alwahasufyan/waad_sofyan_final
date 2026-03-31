import React, { useState, useRef, useMemo, useEffect } from 'react';
import axiosClient from 'utils/axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Box,
  Button,
  Card,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Typography,
  InputAdornment,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  Avatar,
  Chip,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  TableSortLabel,
  Skeleton,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icons
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
// import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // PDF export disabled - Excel is the official format
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import BadgeIcon from '@mui/icons-material/Badge';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import NumbersIcon from '@mui/icons-material/Numbers';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import PreviewIcon from '@mui/icons-material/Preview';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import { CardStatusBadge, MemberTypeIndicator } from 'components/insurance';
import EmployerFilterSelector from 'components/tba/EmployerFilterSelector';
import { MemberAvatar } from 'components/tba';
import DownloadIcon from '@mui/icons-material/Download';
import CircularLoader from 'components/CircularLoader';

// Company Settings - SINGLE SOURCE OF TRUTH for branding
import { useCompanySettings } from 'contexts/CompanySettingsContext';

// API
import { getAllMembers } from 'services/api/unified-members.service';
import { claimsService } from 'services/api/claims.service';
import useTableState from 'hooks/useTableState';
import { formatCurrency } from 'utils/formatters';

// ============================================================================
// HELPER: Highlight Search Matches
// ============================================================================
const HighlightText = ({ text, searchTerm }) => {
  if (!searchTerm || !text) return <>{text || '-'}</>;

  const lowerText = String(text).toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerSearch);

  if (index === -1) return <>{text}</>;

  const before = String(text).substring(0, index);
  const match = String(text).substring(index, index + searchTerm.length);
  const after = String(text).substring(index + searchTerm.length);

  return (
    <>
      {before}
      <Box component="span" sx={{ bgcolor: 'warning.light', px: 0.3, borderRadius: 0.5, fontWeight: 'bold' }}>
        {match}
      </Box>
      {after}
    </>
  );
};

// ============================================================================
// HELPER: Business Icon Component
// ============================================================================
const BusinessIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);

// ============================================================================
// COMPONENT: BeneficiariesReports
// ============================================================================

const BeneficiariesReports = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const printRef = useRef();

  // --- State ---
  const [selectedEmployerId, setSelectedEmployerId] = useState(null);

  const [filters, setFilters] = useState({
    search: '', // Smart search (Name, Card, National ID)
    cardStatus: 'ALL',
    memberType: 'ALL',
    startDate: '', // Join Date From
    endDate: '' // Join Date To
  });

  const [activeFilters, setActiveFilters] = useState({});
  const [liveSearch, setLiveSearch] = useState(''); // Live search for instant filtering

  // Single View State
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'SINGLE' | 'PRINT_PREVIEW'
  const [selectedMember, setSelectedMember] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [memberActivity, setMemberActivity] = useState({ claims: [], preAuths: [] });
  const [loadingActivity, setLoadingActivity] = useState(false);

  // PDF Modal State - disabled, Excel is the official format
  // const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  // Pagination state (client-side)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Sorting state
  const [orderBy, setOrderBy] = useState('fullName');
  const [order, setOrder] = useState('asc');

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'createdAt', direction: 'desc' }
  });

  // --- Handlers ---

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Live search handler - instant filtering
  const handleLiveSearchChange = (event) => {
    setLiveSearch(event.target.value);
    setPage(0); // Reset pagination on search change
  };

  const handleApplyFilters = () => {
    const newActiveFilters = {};
    if (filters.search) newActiveFilters.search = filters.search;
    if (filters.cardStatus && filters.cardStatus !== 'ALL') newActiveFilters.cardStatus = filters.cardStatus;
    if (filters.memberType && filters.memberType !== 'ALL') newActiveFilters.memberType = filters.memberType;
    if (filters.startDate) newActiveFilters.startDate = filters.startDate;
    if (filters.endDate) newActiveFilters.endDate = filters.endDate;
    if (selectedEmployerId) newActiveFilters.employerId = selectedEmployerId;

    setActiveFilters(newActiveFilters);
    setLiveSearch(filters.search); // Sync live search with applied search
    setPage(0);
    tableState.setPage(0);
    setViewMode('TABLE'); // Reset to table view on new search
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      cardStatus: 'ALL',
      memberType: 'ALL',
      startDate: '',
      endDate: ''
    });
    setSelectedEmployerId(null);
    setActiveFilters({});
    setLiveSearch('');
    setPage(0);
    tableState.setPage(0);
    setViewMode('TABLE');
  };

  // Sorting handler
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewSingleReport = async (member) => {
    setSelectedMember(member);
    setViewMode('SINGLE');
    setLoadingStats(true);
    setLoadingActivity(true);

    try {
      const [financialSummaryResult, statementResult, claimsResult, preAuthResult] = await Promise.allSettled([
        axiosClient.get(`/unified-members/${member.id}/financial-summary`),
        claimsService.getMemberStatement(member.id),
        axiosClient.get(`/claims/member/${member.id}`),
        axiosClient.get(`/pre-authorizations/member/${member.id}?page=0&size=500&sortBy=requestDate&sortDirection=DESC`)
      ]);

      const financialSummaryPayload =
        financialSummaryResult.status === 'fulfilled'
          ? financialSummaryResult.value?.data?.data || financialSummaryResult.value?.data || financialSummaryResult.value
          : null;

      const statementPayload = statementResult.status === 'fulfilled' ? statementResult.value : null;
      setFinancialStats(normalizeFinancialSnapshot(financialSummaryPayload, statementPayload));

      const claimsPayload =
        claimsResult.status === 'fulfilled' ? claimsResult.value?.data?.data || claimsResult.value?.data || claimsResult.value : [];
      const preAuthPayload =
        preAuthResult.status === 'fulfilled'
          ? preAuthResult.value?.data?.data || preAuthResult.value?.data || preAuthResult.value
          : [];

      setMemberActivity({
        claims: normalizeClaims(claimsPayload),
        preAuths: normalizePreAuths(preAuthPayload)
      });
    } catch (error) {
      console.error('Failed to load financial stats', error);
      setFinancialStats(normalizeFinancialSnapshot(null, null));
      setMemberActivity({ claims: [], preAuths: [] });
    } finally {
      setLoadingStats(false);
      setLoadingActivity(false);
    }
  };

  const handleBackToTable = () => {
    setViewMode('TABLE');
    setSelectedMember(null);
    setFinancialStats(null);
    setMemberActivity({ claims: [], preAuths: [] });
  };

  // --- Print Handlers (Backend PDF) ---

  const buildBeneficiariesPdfParams = () => {
    const params = new URLSearchParams();

    if (activeFilters.employerId) params.append('organizationId', activeFilters.employerId);
    if (activeFilters.cardStatus && activeFilters.cardStatus !== 'ALL') params.append('status', activeFilters.cardStatus);
    if (activeFilters.memberType && activeFilters.memberType !== 'ALL') params.append('type', activeFilters.memberType);
    if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
    if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);

    if (liveSearch && liveSearch.trim()) {
      params.append('nameAr', liveSearch.trim());
    }

    return params;
  };

  const handlePrintTable = async () => {
    const params = buildBeneficiariesPdfParams();
    params.append('autoPrint', '1');
    navigate(`/reports/beneficiaries/statement-preview?${params.toString()}`);
  };

  // Show print preview
  const handleShowPrintPreview = () => {
    const params = buildBeneficiariesPdfParams();
    navigate(`/reports/beneficiaries/statement-preview?${params.toString()}`);
  };

  const handlePreviewSingleMemberPdf = async (memberId) => {
    if (!memberId) return;
    navigate(`/reports/beneficiaries/statement-preview?memberId=${memberId}`);
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (activeFilters.employerId) params.append('employerId', activeFilters.employerId);
    if (activeFilters.cardStatus && activeFilters.cardStatus !== 'ALL') params.append('status', activeFilters.cardStatus);
    if (activeFilters.memberType && activeFilters.memberType !== 'ALL') params.append('type', activeFilters.memberType);
    if (activeFilters.search) params.append('searchQuery', activeFilters.search);

    try {
      const response = await axiosClient.get(`/unified-members/export/excel?${params.toString()}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data || response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Beneficiaries_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel Export failed", error);
    }
  };

  // --- Data Fetching ---

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['beneficiaries-report', page, rowsPerPage, orderBy, order, activeFilters, liveSearch],
    queryFn: async () => {
      const params = {
        page: page, // Backend uses 0-based pagination
        size: rowsPerPage // server-side sizing
      };

      // Map Sort (from UI state)
      if (orderBy) {
        let sortField = orderBy;

        // Map frontend ID to backend field if necessary
        if (sortField === 'memberType') sortField = 'type';
        if (sortField === 'cardStatus') sortField = 'status';
        if (sortField === 'joinDate') sortField = 'createdAt';

        params.sort = sortField;
        params.direction = order.toUpperCase();
      } else {
        params.sort = 'createdAt';
        params.direction = 'DESC';
      }

      // Map Filters
      if (activeFilters.employerId) {
        params.employerId = activeFilters.employerId;
      }
      if (activeFilters.cardStatus && activeFilters.cardStatus !== 'ALL') {
        params.status = activeFilters.cardStatus;
      }
      if (activeFilters.memberType && activeFilters.memberType !== 'ALL') {
        params.type = activeFilters.memberType;
      }
      if (activeFilters.startDate) {
        params.startDate = activeFilters.startDate;
      }
      if (activeFilters.endDate) {
        params.endDate = activeFilters.endDate;
      }
      if (liveSearch && liveSearch.trim()) {
        params.fullName = liveSearch.trim();
      }

      const response = await getAllMembers(params);

      // Map Spring Page response to expected format
      return {
        items: response?.content || [],
        total: response?.totalElements || 0,
        page: response?.number || 0,
        size: response?.size || params.size
      };
    },
    keepPreviousData: true
  });

  // For BeneficiariesReports, we use the server-side pagination entirely
  const paginatedData = data?.items || [];

  // Total counts from server
  const totalFetched = data?.total || 0;
  const totalFiltered = data?.total || 0;

  // --- Columns ---

  const columns = useMemo(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        width: '3.125rem',
        align: 'center',
        cell: ({ row }) => page * rowsPerPage + row.index + 1
      },
      {
        accessorKey: 'fullName',
        header: 'اسم المنتفع',
        minWidth: '12.5rem',
        cell: ({ row }) => (
          <Stack direction="row" alignItems="center" spacing={1}>
            <MemberAvatar member={row.original} size={32} />
            <Box>
              <Typography variant="subtitle2" fontWeight="600">
                <HighlightText text={row.original.fullName} searchTerm={liveSearch} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.original.gender === 'MALE' ? 'ذكر' : 'أنثى'} - {row.original.age || '?'} سنة
              </Typography>
            </Box>
          </Stack>
        )
      },
      {
        accessorKey: 'barcode',
        header: 'المعرف البصري (QR)',
        minWidth: '10.0rem',
        cell: ({ row }) => (
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <QrCode2Icon sx={{ fontSize: '1.0rem', color: theme.palette.primary.main }} />
              <Typography variant="body2" fontFamily="monospace" fontWeight="bold" color="primary">
                <HighlightText text={row.original.barcode} searchTerm={liveSearch} />
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <BusinessIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.original.employerName || row.original.partnerNane || '-'}
              </Typography>
            </Stack>
          </Stack>
        )
      },
      {
        accessorKey: 'cardNumber',
        header: 'رقم البطاقة',
        minWidth: '8.75rem',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <CreditCardIcon sx={{ fontSize: '0.875rem', color: theme.palette.warning.main }} />
            <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
              <HighlightText text={row.original.cardNumber} searchTerm={liveSearch} />
            </Typography>
          </Stack>
        )
      },
      {
        accessorKey: 'nationalNumber',
        header: 'رقم الهوية',
        minWidth: '8.125rem',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <BadgeIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
            <Typography variant="body2" fontFamily="monospace">
              <HighlightText text={row.original.nationalNumber} searchTerm={liveSearch} />
            </Typography>
          </Stack>
        )
      },
      {
        accessorKey: 'memberType',
        header: 'نوع العضوية',
        minWidth: '7.5rem',
        cell: ({ row }) => <MemberTypeIndicator type={row.original.type} size="small" />
      },
      {
        accessorKey: 'joinDate',
        header: 'تاريخ الانضمام',
        minWidth: '7.5rem',
        cell: ({ getValue }) => getValue() || '-'
      },
      {
        accessorKey: 'cardStatus',
        header: 'الحالة',
        minWidth: '6.25rem',
        align: 'center',
        cell: ({ row }) => <CardStatusBadge status={row.original.cardStatus || 'ACTIVE'} size="small" language="ar" />
      },
      {
        id: 'actions',
        header: 'عرض',
        align: 'center',
        cell: ({ row }) => (
          <Tooltip title="تقرير تفصيلي">
            <IconButton size="small" color="primary" onClick={() => handleViewSingleReport(row.original)}>
              <AssignmentIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )
      }
    ],
    [page, rowsPerPage, liveSearch, theme]
  );

  // ========================================================================
  // VIEW RENDER
  // ========================================================================

  return (
    <Box>
      <UnifiedPageHeader
        title="تقارير المنتفعين"
        subtitle="تحليل بيانات المنتفعين والسجل المالي"
        icon={MedicalServicesIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/' },
          { label: 'التقارير' },
          { label: viewMode === 'SINGLE' ? 'تفاصيل المنتفع' : 'المنتفعين' }
        ]}
        additionalActions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              color="primary"
            >
              تصدير إكسيل
            </Button>
            {viewMode === 'SINGLE' && (
              <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBackToTable} color="secondary">
                عودة للقائمة
              </Button>
            )}
          </Stack>
        }
      />

      {/* --- Filter Section (Only in Table Mode) --- */}
      {viewMode === 'TABLE' && (
        <Card sx={{ mb: '1.5rem', p: '1.0rem', bgcolor: 'background.paper', borderRadius: '0.25rem', border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <FilterAltIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              خيارات الفلترة المتقدمة
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            {/* 1. Partner Filter */}
            <Grid size={{ xs: 12, md: 4 }}>
              <EmployerFilterSelector
                selectedEmployerId={selectedEmployerId}
                onEmployerChange={(emp) => {
                  const newEmployerId = emp?.id || null;
                  setSelectedEmployerId(newEmployerId);
                  // Auto-apply employer filter immediately
                  setActiveFilters((prev) => ({
                    ...prev,
                    employerId: newEmployerId
                  }));
                  setPage(0);
                  tableState.setPage(0);
                }}
                showAllOption={true}
              />
            </Grid>

            {/* 2. Smart Search */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="بحث ذكي (الاسم، البطاقة، الهوية)"
                value={filters.search}
                onChange={handleFilterChange('search')}
                placeholder="ابحث هنا..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
                size="small"
              />
            </Grid>

            {/* 3. Member Type */}
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                select
                fullWidth
                label="نوع العضوية"
                value={filters.memberType}
                onChange={handleFilterChange('memberType')}
                size="small"
              >
                <MenuItem value="ALL">الكل</MenuItem>
                <MenuItem value="PRINCIPAL">مشترك أساسي</MenuItem>
                <MenuItem value="DEPENDENT">تابع</MenuItem>
              </TextField>
            </Grid>

            {/* 4. Status */}
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                select
                fullWidth
                label="الحالة"
                value={filters.cardStatus}
                onChange={handleFilterChange('cardStatus')}
                size="small"
              >
                <MenuItem value="ALL">الكل</MenuItem>
                <MenuItem value="ACTIVE">نشط</MenuItem>
                <MenuItem value="EXPIRED">منتهي الصلاحية</MenuItem>
                <MenuItem value="SUSPENDED">موقوف</MenuItem>
              </TextField>
            </Grid>

            {/* 5. Date From */}
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                type="date"
                fullWidth
                label="تاريخ الانضمام (من)"
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>

            {/* 6. Date To */}
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                type="date"
                fullWidth
                label="تاريخ الانضمام (إلى)"
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>

            <Grid sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }} size={{ xs: 12, md: 6 }}>
              <Button variant="outlined" color="inherit" onClick={handleResetFilters} startIcon={<RefreshIcon />}>
                إعادة تعيين
              </Button>
              <Button variant="contained" color="primary" onClick={handleApplyFilters} startIcon={<SearchIcon />}>
                تطبيق البحث
              </Button>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* --- Main Content Switcher --- */}

      {viewMode === 'TABLE' ? (
        <>
          <MainCard content={false}>
            {/* Live Search Bar with Stats */}
            <Box sx={{ p: '1.0rem', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  size="small"
                  placeholder="بحث فوري بالاسم، رقم البطاقة، الهوية، الباركود..."
                  value={liveSearch}
                  onChange={handleLiveSearchChange}
                  sx={{ minWidth: '20.0rem' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: liveSearch && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setLiveSearch('');
                            setPage(0);
                          }}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <Box sx={{ flexGrow: 1 }} />

                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    الإجمالي: <strong>{totalFetched}</strong>
                    {liveSearch && ` | المطابق: `}
                    {liveSearch && <strong style={{ color: totalFiltered === 0 ? 'red' : 'green' }}>{totalFiltered}</strong>}
                  </Typography>

                  <Tooltip title="طباعة">
                    <IconButton color="primary" onClick={handlePrintTable}>
                      <PrintIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>

            {/* Error State */}
            {!isLoading && !isFetching && totalFetched === 0 && (
              <Alert severity="info" sx={{ m: '1.0rem' }} icon={<ErrorOutlineIcon />}>
                لا توجد بيانات مطابقة للفلاتر المحددة. جرّب تغيير معايير البحث.
              </Alert>
            )}

            {/* No Search Results */}
            {liveSearch && totalFiltered === 0 && totalFetched > 0 && (
              <Alert severity="warning" sx={{ m: '1.0rem' }}>
                لم يتم العثور على نتائج مطابقة لـ "{liveSearch}". جرّب كلمات بحث مختلفة.
              </Alert>
            )}

            {/* Loading Skeleton */}
            {(isLoading || isFetching) && (
              <Box sx={{ p: '1.0rem' }}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </Box>
            )}

            {/* Data Table */}
            {!isLoading && !isFetching && paginatedData.length > 0 && (
              <>
                <TableContainer ref={printRef}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                        {columns.map((col) => (
                          <TableCell
                            key={col.id || col.accessorKey}
                            align={col.align || 'right'}
                            sx={{ minWidth: col.minWidth, width: col.width }}
                          >
                            {col.accessorKey && col.enableSorting !== false ? (
                              <TableSortLabel
                                active={orderBy === col.accessorKey}
                                direction={orderBy === col.accessorKey ? order : 'asc'}
                                onClick={() => handleRequestSort(col.accessorKey)}
                              >
                                {col.header}
                              </TableSortLabel>
                            ) : (
                              col.header
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.map((member, idx) => (
                        <TableRow
                          key={member.id || member.barcode || idx}
                          hover
                          sx={{
                            '&:nth-of-type(odd)': { bgcolor: 'grey.50' },
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          {columns.map((col) => (
                            <TableCell key={col.id || col.accessorKey} align={col.align || 'right'}>
                              {col.cell
                                ? col.cell({ row: { original: member, index: idx }, getValue: () => member[col.accessorKey] })
                                : member[col.accessorKey] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={data?.total || 0}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage="عدد الصفوف:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`}
                  sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                />
              </>
            )}
          </MainCard>
        </>
      ) : viewMode === 'PRINT_PREVIEW' ? (
        /* --- Print Preview Mode --- */
        <MainCard
          title="معاينة الطباعة"
          secondary={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBackToTable}>
                عودة
              </Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintTable}>
                طباعة
              </Button>
            </Stack>
          }
        >
          <Box ref={printRef} sx={{ p: '1.0rem' }}>
            {/* Print Header */}
            <Box sx={{ textAlign: 'center', mb: '1.5rem', pb: '1.0rem', borderBottom: '2px solid #1976d2' }}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                تقرير المنتفعين
              </Typography>
              <Typography variant="body2" color="text.secondary">
                تاريخ الطباعة: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </Typography>
              {liveSearch && (
                <Typography variant="body2" color="primary">
                  نتائج البحث عن: "{liveSearch}"
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                إجمالي السجلات: {totalFiltered}
              </Typography>
            </Box>

            {/* Print Table - Show ALL current page data */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.100', border: '1px solid #ddd' } }}>
                    {columns
                      .filter((c) => c.id !== 'actions')
                      .map((col) => (
                        <TableCell
                          key={col.id || col.accessorKey}
                          align={col.align || 'right'}
                          sx={{ minWidth: col.minWidth, fontSize: '0.85rem' }}
                        >
                          {col.header}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((member, idx) => (
                    <TableRow
                      key={member.id || member.barcode || idx}
                      sx={{
                        '& td': { border: '1px solid #ddd', fontSize: '0.8rem' },
                        pageBreakInside: 'avoid'
                      }}
                    >
                      {columns
                        .filter((c) => c.id !== 'actions')
                        .map((col) => (
                          <TableCell key={col.id || col.accessorKey} align={col.align || 'right'}>
                            {col.cell
                              ? col.cell({ row: { original: member, index: idx }, getValue: () => member[col.accessorKey] })
                              : member[col.accessorKey] || '-'}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Print Footer */}
            <Box sx={{ mt: '1.5rem', pt: '1.0rem', borderTop: '1px solid #ddd', textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                نظام إدارة التأمين الصحي - تقرير مُنشأ آلياً
              </Typography>
            </Box>
          </Box>
        </MainCard>
      ) : (
        /* --- Single Report View --- */
        <SingleBeneficiaryReport
          member={selectedMember}
          financialStats={financialStats}
          loadingStats={loadingStats}
          loadingActivity={loadingActivity}
          memberActivity={memberActivity}
          onBack={handleBackToTable}
          onPreviewPdf={handlePreviewSingleMemberPdf}
        />
      )}

      {/* --- Hidden Components --- */}
      {/* PDF export disabled - Excel is the official reporting format
      <PdfPreviewModal
        open={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        title="تقرير المنتفعين الاجمالي"
        data={data?.items || []}
        columns={columns.filter(c => c.id !== 'actions')}
        partnerName={selectedEmployerId ? 'حسب الشريك المحدد' : 'كافة الشركاء'}
      />
      */}
    </Box>
  );
};

// --- Sub-components ---

const InfoRow = ({ icon, label, value, isMono }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom="1px solid #f0f0f0">
    <Stack direction="row" spacing={1} alignItems="center">
      {React.cloneElement(icon, { color: 'action', fontSize: 'small' })}
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
    <Typography variant="body2" fontWeight="medium" fontFamily={isMono ? 'monospace' : 'inherit'}>
      {value || '-'}
    </Typography>
  </Box>
);

const extractCollection = (payload) => {
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.content,
    payload?.items,
    payload?.data?.content,
    payload?.data?.items,
    payload?.data,
    payload?.results
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const normalizeCurrencyValue = (value) => {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
};

const formatCoverageAmountEnglish = (value) => {
  const normalized = normalizeCurrencyValue(value);
  return `${normalized.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
};

const normalizeFinancialSnapshot = (summary, statement) => {
  const annualLimit = normalizeCurrencyValue(summary?.annualLimit);
  const totalClaimed = normalizeCurrencyValue(summary?.totalClaimed ?? statement?.totalRequested);
  const totalApproved = normalizeCurrencyValue(summary?.totalApproved ?? statement?.totalNetPayable);
  const totalNetPayable = normalizeCurrencyValue(summary?.totalNetPayable ?? statement?.totalNetPayable ?? totalApproved);
  const totalPatientCoPay = normalizeCurrencyValue(summary?.totalPatientCoPay ?? statement?.totalPatientCoPay);
  const remainingCoverage = normalizeCurrencyValue(
    summary?.remainingCoverage ?? summary?.remainingBalance ?? (annualLimit > 0 ? Math.max(annualLimit - totalApproved, 0) : 0)
  );
  const utilizationPercent =
    annualLimit > 0
      ? Math.max(0, Math.min(100, normalizeCurrencyValue(summary?.utilizationPercent ?? (totalApproved / annualLimit) * 100)))
      : 0;

  return {
    annualLimit,
    totalClaimed,
    totalApproved,
    totalNetPayable,
    totalPatientCoPay,
    remainingCoverage,
    utilizationPercent,
    claimsCount: Number(summary?.claimsCount ?? statement?.totalClaims ?? 0),
    approvedClaimsCount: Number(summary?.approvedClaimsCount ?? statement?.approvedClaims ?? 0),
    pendingClaimsCount: Number(summary?.pendingClaimsCount ?? statement?.pendingClaims ?? 0),
    rejectedClaimsCount: Number(summary?.rejectedClaimsCount ?? statement?.rejectedClaims ?? 0),
    lastClaimDate: summary?.lastClaimDate || null
  };
};

const normalizeClaims = (payload) => {
  const claims = extractCollection(payload)
    .map((item) => ({
      id: item?.id,
      reference: item?.claimNumber || (item?.id ? `#${item.id}` : '-'),
      date: item?.serviceDate || item?.createdAt || item?.updatedAt || null,
      status: item?.statusLabel || item?.status || '-',
      requestedAmount: normalizeCurrencyValue(item?.requestedAmount ?? item?.totalAmount),
      approvedAmount: normalizeCurrencyValue(item?.approvedAmount ?? item?.netProviderAmount),
      copayAmount: normalizeCurrencyValue(item?.patientCoPay),
      providerName: item?.providerName || '-',
      diagnosis: item?.diagnosisDescription || item?.diagnosisCode || '-'
    }))
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return claims;
};

const normalizePreAuths = (payload) => {
  const preAuths = extractCollection(payload)
    .map((item) => ({
      id: item?.id,
      reference: item?.referenceNumber || item?.preAuthNumber || (item?.id ? `#${item.id}` : '-'),
      date: item?.requestDate || item?.createdAt || item?.updatedAt || null,
      status: item?.status || '-',
      requestedAmount: normalizeCurrencyValue(item?.contractPrice ?? item?.requestedAmount),
      approvedAmount: normalizeCurrencyValue(item?.approvedAmount),
      copayAmount: normalizeCurrencyValue(item?.copayAmount),
      serviceName: item?.serviceName || '-',
      providerName: item?.providerName || '-'
    }))
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return preAuths;
};

const mapStatusChipColor = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (['APPROVED', 'SETTLED', 'PAID', 'USED', 'ACKNOWLEDGED'].includes(normalized)) return 'success';
  if (['REJECTED', 'CANCELLED', 'EXPIRED', 'REFUSED'].includes(normalized)) return 'error';
  if (['PENDING', 'UNDER_REVIEW', 'APPROVAL_IN_PROGRESS', 'NEEDS_CORRECTION', 'SUBMITTED'].includes(normalized)) return 'warning';
  return 'default';
};

// --- Single Report Component ---
const SingleBeneficiaryReport = ({ member, financialStats, loadingStats, loadingActivity, memberActivity, onBack, onPreviewPdf }) => {
  const theme = useTheme();
  const [activityViewMode, setActivityViewMode] = useState('LAST_5');
  const [activityFromDate, setActivityFromDate] = useState('');
  const [activityToDate, setActivityToDate] = useState('');

  // Get company branding from SSOT
  const { getLogoSrc, companyName, hasLogo } = useCompanySettings();

  useEffect(() => {
    setActivityViewMode('LAST_5');
    setActivityFromDate('');
    setActivityToDate('');
  }, [member?.id]);

  const isDateInSelectedRange = (dateValue) => {
    if (!dateValue) return false;
    const value = new Date(dateValue);
    if (Number.isNaN(value.getTime())) return false;

    const from = activityFromDate ? new Date(activityFromDate) : null;
    const to = activityToDate ? new Date(activityToDate) : null;

    if (from && !Number.isNaN(from.getTime()) && value < from) return false;
    if (to && !Number.isNaN(to.getTime())) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      if (value > endOfDay) return false;
    }
    return true;
  };

  const handlePdfPreview = () => {
    if (onPreviewPdf) {
      onPreviewPdf(member?.id);
    }
  };

  const allClaimsRows = memberActivity?.claims || [];
  const allPreAuthRows = memberActivity?.preAuths || [];

  const claimsRows = useMemo(() => {
    if (activityViewMode === 'ALL') return allClaimsRows;
    if (activityViewMode === 'DATE_RANGE') {
      return allClaimsRows.filter((item) => isDateInSelectedRange(item.date));
    }
    return allClaimsRows.slice(0, 5);
  }, [allClaimsRows, activityViewMode, activityFromDate, activityToDate]);

  const preAuthRows = useMemo(() => {
    if (activityViewMode === 'ALL') return allPreAuthRows;
    if (activityViewMode === 'DATE_RANGE') {
      return allPreAuthRows.filter((item) => isDateInSelectedRange(item.date));
    }
    return allPreAuthRows.slice(0, 5);
  }, [allPreAuthRows, activityViewMode, activityFromDate, activityToDate]);

  const memberIdentityDetails = [
    { label: 'رقم البطاقة', value: member?.cardNumber || '-', mono: true, color: 'primary.main' },
    { label: 'الباركود', value: member?.barcode || '-', mono: true },
    { label: 'رقم الهوية', value: member?.nationalNumber || '-', mono: true },
    { label: 'الشركة/الشريك', value: member?.employerName || '-' },
    { label: 'النوع', value: member?.type === 'PRINCIPAL' ? 'مشترك أساسي' : member?.type ? 'تابع' : '-' },
    { label: 'الجنس والعمر', value: `${member?.gender === 'MALE' ? 'ذكر' : 'أنثى'} / ${member?.age || '-'} سنة` },
    { label: 'تاريخ الانضمام', value: member?.joinDate || '-' }
  ];

  const coverageHighlights = [
    {
      label: 'الحد السنوي',
      value: formatCoverageAmountEnglish(financialStats?.annualLimit || 0),
      accent: theme.palette.primary.main,
      background: theme.palette.primary.lighter
    },
    {
      label: 'إجمالي المطالبات',
      value: formatCoverageAmountEnglish(financialStats?.totalClaimed || 0),
      accent: theme.palette.info.main,
      background: theme.palette.info.lighter
    },
    {
      label: 'المعتمد',
      value: formatCoverageAmountEnglish(financialStats?.totalApproved || 0),
      accent: theme.palette.success.main,
      background: theme.palette.success.lighter
    },
    {
      label: 'التحمل',
      value: formatCoverageAmountEnglish(financialStats?.totalPatientCoPay || 0),
      accent: theme.palette.warning.dark,
      background: theme.palette.warning.lighter
    },
    {
      label: 'المتبقي',
      value: formatCoverageAmountEnglish(financialStats?.remainingCoverage || 0),
      accent: theme.palette.secondary.main,
      background: theme.palette.secondary.lighter
    },
    {
      label: 'نسبة الاستخدام',
      value: `${Number(financialStats?.utilizationPercent || 0).toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}%`,
      accent: theme.palette.error.main,
      background: theme.palette.error.lighter
    }
  ];

  if (loadingStats) {
    return (
      <Stack alignItems="center" justifyContent="center" height={300}>
        <CircularLoader />
        <Typography mt={2}>جاري تحميل البيانات المالية...</Typography>
      </Stack>
    );
  }

  return (
    <Box>
      {/* Printable Area */}
      <Box className="print-root" sx={{ p: '0.75rem', bgcolor: 'background.paper', borderRadius: '0.25rem' }}>
        {/* Report Header */}
        <Box
          sx={{ borderBottom: '2px solid #eee', mb: '0.75rem', pb: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box>
            <Typography variant="h4" color="primary.main" fontWeight="bold">
              تقرير تفاصيل المنتفع
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تاريخ التقرير: {new Date().toLocaleDateString('en-US')}
            </Typography>
          </Box>
          {hasLogo() ? (
            <img src={getLogoSrc()} alt={companyName} style={{ height: '3.125rem', opacity: 0.8 }} />
          ) : (
            <Typography variant="h6" color="primary.main" fontWeight="bold">
              {companyName}
            </Typography>
          )}
        </Box>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="بيانات المنتفع والهوية" className="print-card" contentSX={{ p: '0.75rem' }}>
              <Grid container spacing={1.5} alignItems="stretch">
                <Grid size={{ xs: 12, lg: 4 }}>
                  <Paper
                    sx={{
                      p: 1.5,
                      height: '100%',
                      borderRadius: 3,
                      color: 'common.white',
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                    }}
                  >
                    <Stack spacing={1.5} height="100%" justifyContent="space-between">
                      <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.5} alignItems="center">
                        <MemberAvatar member={member} size={72} />
                        <Box textAlign={{ xs: 'center', sm: 'right' }}>
                          <Typography variant="h5" fontWeight={700}>
                            {member?.fullName || '-'}
                          </Typography>
                          <Box mt={0.75} display="flex" justifyContent={{ xs: 'center', sm: 'flex-start' }}>
                            <MemberTypeIndicator type={member?.type} />
                          </Box>
                        </Box>
                      </Stack>

                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.12)',
                          border: '1px solid rgba(255,255,255,0.18)'
                        }}
                      >
                        <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.5} alignItems="center">
                          <Box p={1} bgcolor="common.white" borderRadius={2} boxShadow={2}>
                            {member?.barcode ? (
                              <QRCodeCanvas value={member.barcode} size={116} level={'H'} includeMargin={true} />
                            ) : (
                              <Typography variant="caption" color="error.main">
                                BARCODE MISSING
                              </Typography>
                            )}
                          </Box>
                          <Stack spacing={0.75} width="100%">
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                              معرف الهوية السريع
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace" fontWeight={700} sx={{ direction: 'ltr', unicodeBidi: 'embed' }}>
                              {member?.barcode || '-'}
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace" sx={{ direction: 'ltr', unicodeBidi: 'embed', opacity: 0.92 }}>
                              {member?.cardNumber || '-'}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                  <Grid container spacing={1.25}>
                    {memberIdentityDetails.map((detail) => (
                      <Grid key={detail.label} size={{ xs: 12, sm: 6 }}>
                        <Paper
                          sx={{
                            p: 1.25,
                            borderRadius: 2,
                            height: '100%',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'grey.50'
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                            {detail.label}
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            color={detail.color || 'text.primary'}
                            sx={detail.mono ? { fontFamily: 'monospace', direction: 'ltr', unicodeBidi: 'embed' } : undefined}
                          >
                            {detail.value}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}

                    <Grid size={{ xs: 12 }}>
                      <Paper
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper'
                        }}
                      >
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              حالة البطاقة
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              بيانات الهوية مرتبة للطباعة والقراءة السريعة
                            </Typography>
                          </Box>
                          <CardStatusBadge status={member?.cardStatus} />
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <MainCard
              title="كشف استخدام التغطية"
              className="print-card"
              contentSX={{ p: '0.75rem' }}
              secondary={<Chip label="للقراءة فقط" size="small" variant="outlined" />}
            >
              <Grid container spacing={1.25}>
                {coverageHighlights.map((item) => (
                  <Grid key={item.label} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Paper
                      className="print-card"
                      sx={{
                        p: 1.25,
                        height: '100%',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: item.background
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        {item.label}
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: item.accent, direction: 'ltr', unicodeBidi: 'embed' }}>
                        {item.value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}

                <Grid size={{ xs: 12 }}>
                  <Paper className="print-card" sx={{ p: '0.9rem', bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight="bold">
                          نسبة استخدام الحد السنوي
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ direction: 'ltr', unicodeBidi: 'embed' }}>
                          {Number(financialStats?.utilizationPercent || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1
                          })}
                          %
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.max(0, Number(financialStats?.utilizationPercent || 0)))}
                        sx={{ height: '0.7rem', borderRadius: 99 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        إجمالي عدد المطالبات: {Number(financialStats?.claimsCount || 0).toLocaleString('en-US')} | معتمد:{' '}
                        {Number(financialStats?.approvedClaimsCount || 0).toLocaleString('en-US')} | قيد المعالجة:{' '}
                        {Number(financialStats?.pendingClaimsCount || 0).toLocaleString('en-US')} | مرفوض:{' '}
                        {Number(financialStats?.rejectedClaimsCount || 0).toLocaleString('en-US')}
                      </Typography>
                    </Stack>
                  </Paper>

                  <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                    هذا الكشف يوضح ما تم استخدامه من التغطية، وما تبقى، وحصة التحمل على المنتفع بشكل مباشر.
                  </Alert>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>

          <Grid size={{ xs: 12 }} className="print-hide">
            <MainCard title="خيارات عرض نشاط المنتفع" className="print-card" contentSX={{ p: '0.75rem' }}>
              <Grid container spacing={1.5} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="activity-view-mode-label">نمط العرض</InputLabel>
                    <Select
                      labelId="activity-view-mode-label"
                      value={activityViewMode}
                      label="نمط العرض"
                      onChange={(event) => setActivityViewMode(event.target.value)}
                    >
                      <MenuItem value="LAST_5">آخر 5</MenuItem>
                      <MenuItem value="ALL">عرض كامل</MenuItem>
                      <MenuItem value="DATE_RANGE">من تاريخ إلى تاريخ</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="من تاريخ"
                    value={activityFromDate}
                    onChange={(event) => setActivityFromDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    disabled={activityViewMode !== 'DATE_RANGE'}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="إلى تاريخ"
                    value={activityToDate}
                    onChange={(event) => setActivityToDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    disabled={activityViewMode !== 'DATE_RANGE'}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <Alert severity="info" sx={{ py: 0 }}>
                    المطالبات: {claimsRows.length} | الموافقات: {preAuthRows.length}
                  </Alert>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <MainCard
              title={
                activityViewMode === 'ALL'
                  ? 'كامل مطالبات المنتفع'
                  : activityViewMode === 'DATE_RANGE'
                    ? 'مطالبات المنتفع ضمن الفترة'
                    : 'آخر 5 مطالبات للمنتفع'
              }
              className="print-card"
              contentSX={{ p: '0.75rem' }}
            >
              {loadingActivity ? (
                <Stack spacing={1}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
                  ))}
                </Stack>
              ) : claimsRows.length === 0 ? (
                <Alert severity="info">لا توجد مطالبات حديثة لهذا المنتفع.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small" className="print-table">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                        <TableCell>رقم المطالبة</TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>مقدم الخدمة</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>المطلوب</TableCell>
                        <TableCell>المعتمد</TableCell>
                        <TableCell>التحمل</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {claimsRows.map((claim) => (
                        <TableRow key={claim.id || claim.reference}>
                          <TableCell>{claim.reference}</TableCell>
                          <TableCell>{claim.date ? new Date(claim.date).toLocaleDateString('en-US') : '-'}</TableCell>
                          <TableCell>{claim.providerName || '-'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={claim.status} color={mapStatusChipColor(claim.status)} variant="outlined" />
                          </TableCell>
                          <TableCell>{formatCurrency(claim.requestedAmount)}</TableCell>
                          <TableCell>{formatCurrency(claim.approvedAmount)}</TableCell>
                          <TableCell>{formatCurrency(claim.copayAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </MainCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <MainCard
              title={
                activityViewMode === 'ALL'
                  ? 'كامل الموافقات المسبقة للمنتفع'
                  : activityViewMode === 'DATE_RANGE'
                    ? 'الموافقات المسبقة ضمن الفترة'
                    : 'آخر 5 موافقات مسبقة للمنتفع'
              }
              className="print-card"
              contentSX={{ p: '0.75rem' }}
            >
              {loadingActivity ? (
                <Stack spacing={1}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
                  ))}
                </Stack>
              ) : preAuthRows.length === 0 ? (
                <Alert severity="info">لا توجد موافقات مسبقة حديثة لهذا المنتفع.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small" className="print-table">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                        <TableCell>رقم الموافقة</TableCell>
                        <TableCell>تاريخ الطلب</TableCell>
                        <TableCell>الخدمة</TableCell>
                        <TableCell>مقدم الخدمة</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>القيمة</TableCell>
                        <TableCell>المعتمد</TableCell>
                        <TableCell>التحمل</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preAuthRows.map((preAuth) => (
                        <TableRow key={preAuth.id || preAuth.reference}>
                          <TableCell>{preAuth.reference}</TableCell>
                          <TableCell>{preAuth.date ? new Date(preAuth.date).toLocaleDateString('en-US') : '-'}</TableCell>
                          <TableCell>{preAuth.serviceName || '-'}</TableCell>
                          <TableCell>{preAuth.providerName || '-'}</TableCell>
                          <TableCell>
                            <Chip size="small" label={preAuth.status} color={mapStatusChipColor(preAuth.status)} variant="outlined" />
                          </TableCell>
                          <TableCell>{formatCurrency(preAuth.requestedAmount)}</TableCell>
                          <TableCell>{formatCurrency(preAuth.approvedAmount)}</TableCell>
                          <TableCell>{formatCurrency(preAuth.copayAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </MainCard>
          </Grid>
        </Grid>
      </Box>

      {/* Footer Actions (Outside Print Area) */}
      <Box mt={2} display="flex" justifyContent="flex-end" gap={2} className="print-hide">
        <Button variant="outlined" color="inherit" onClick={onBack} startIcon={<ArrowBackIcon />}>
          عودة
        </Button>
        {/* PDF export disabled - Excel is the official reporting format
                <Button variant="outlined" color="primary" onClick={handlePdfPreview} startIcon={<PictureAsPdfIcon />}>
                   معاينة PDF
                </Button>
                */}
        <Button variant="contained" color="secondary" startIcon={<PrintIcon />} onClick={handlePdfPreview}>
          طباعة فقط
        </Button>
      </Box>
    </Box>
  );
};

export default BeneficiariesReports;
