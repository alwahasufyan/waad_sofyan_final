/**
 * Medical Services List Page - UNIFIED REFERENCE IMPLEMENTATION
 *
 * ⭐ This is the GOLDEN REFERENCE for all List Pages
 *
 * Pattern: UnifiedPageHeader → MainCard → GenericDataTable
 *
 * Architecture Rules:
 * ✅ GenericDataTable = UI-only component
 * ✅ Excel export button for data export
 * ✅ Company branding in Excel (header/footer)
 * ❌ NO PDF export (not working with Arabic)
 * ❌ NO frontend PDF generation
 * ❌ NO html2canvas/jsPDF
 *
 * Features:
 * - Multi-column sorting
 * - Sticky headers
 * - Pagination
 * - Professional Excel export with company branding
 */

import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// MUI Components
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';

// MUI Icons - Always as Component, NEVER as JSX
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';
import ExcelImportButton from 'components/ExcelImport/ExcelImportButton';

// Custom Hooks
import useTableState from 'hooks/useTableState';

// Contexts
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Services
import {
  getMedicalServices,
  deleteMedicalService,
  deleteAllMedicalServices,
  deactivateAllMedicalServices,
  activateAllMedicalServices,
  getMedicalServicesStats,
  updateServiceCategory,
  getAllMedicalServices
} from 'services/api/medical-services.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';

// Excel Export
import { exportMedicalServicesToExcel } from 'utils/excelExport';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'medical-services';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format price with LYD currency
 */
const formatPrice = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(2)} د.ل`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MedicalServicesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ========================================
  // LOCAL STATE
  // ========================================

  // Status filter: null = all, true = active, false = inactive
  const [statusFilter, setStatusFilter] = useState(null);

  // Excel export loading state
  const [isExporting, setIsExporting] = useState(false);

  // Bulk operations dialogs
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deactivateAllDialogOpen, setDeactivateAllDialogOpen] = useState(false);
  const [activateAllDialogOpen, setActivateAllDialogOpen] = useState(false);

  // ========================================
  // CATEGORIES DATA (for inline edit dropdown)
  // ========================================

  const { data: categories = [] } = useQuery({
    queryKey: ['medical-categories-all'],
    queryFn: getAllMedicalCategories,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Quick category update mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ serviceId, categoryId }) => updateServiceCategory(serviceId, categoryId),
    onSuccess: (result, { serviceName }) => {
      openSnackbar({
        message: `تم تحديث تصنيف "${serviceName}" بنجاح`,
        variant: 'success'
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (err, { serviceName }) => {
      console.error('[MedicalServices] Category update failed:', err);
      openSnackbar({
        message: `فشل تحديث تصنيف "${serviceName}": ${err.message || 'خطأ غير معروف'}`,
        variant: 'error'
      });
    }
  });

  // ========================================
  // TABLE REFRESH CONTEXT
  // ========================================

  const { refreshKey, triggerRefresh } = useTableRefresh();

  // ========================================
  // TABLE STATE MANAGEMENT
  // ========================================

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'code', direction: 'asc' },
    initialFilters: {}
  });

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleNavigateAdd = useCallback(() => {
    navigate('/medical-services/add');
  }, [navigate]);

  const handleNavigateView = useCallback(
    (id) => {
      navigate(`/medical-services/${id}`);
    },
    [navigate]
  );

  const handleNavigateEdit = useCallback(
    (id) => {
      navigate(`/medical-services/edit/${id}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id, name) => {
      const confirmMessage = `هل أنت متأكد من حذف الخدمة "${name}"؟`;
      if (!window.confirm(confirmMessage)) return;

      try {
        await deleteMedicalService(id);
        openSnackbar({
          message: 'تم حذف الخدمة بنجاح',
          variant: 'success'
        });
        // Refresh table data
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err) {
        console.error('[MedicalServices] Delete failed:', err);
        openSnackbar({
          message: 'فشل حذف الخدمة. يرجى المحاولة لاحقاً',
          variant: 'error'
        });
      }
    },
    [queryClient]
  );

  // ========================================
  // BULK OPERATIONS MUTATIONS
  // ========================================

  // Permanent Delete All
  const deleteAllMutation = useMutation({
    mutationFn: deleteAllMedicalServices,
    onSuccess: (count) => {
      openSnackbar({
        message: `⚠️ تم حذف ${count} خدمة طبية نهائياً`,
        variant: 'success'
      });
      setDeleteAllDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['medical-services-stats'] });
    },
    onError: (err) => {
      console.error('[MedicalServices] Delete all failed:', err);
      openSnackbar({
        message: 'فشل حذف الخدمات. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    }
  });

  // Deactivate All
  const deactivateAllMutation = useMutation({
    mutationFn: deactivateAllMedicalServices,
    onSuccess: (count) => {
      openSnackbar({
        message: `تم إلغاء تنشيط ${count} خدمة طبية`,
        variant: 'success'
      });
      setDeactivateAllDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['medical-services-stats'] });
    },
    onError: (err) => {
      console.error('[MedicalServices] Deactivate all failed:', err);
      openSnackbar({
        message: 'فشل إلغاء التنشيط. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    }
  });

  // Activate All
  const activateAllMutation = useMutation({
    mutationFn: activateAllMedicalServices,
    onSuccess: (count) => {
      openSnackbar({
        message: `تم تنشيط ${count} خدمة طبية`,
        variant: 'success'
      });
      setActivateAllDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['medical-services-stats'] });
    },
    onError: (err) => {
      console.error('[MedicalServices] Activate all failed:', err);
      openSnackbar({
        message: 'فشل التنشيط. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    }
  });

  const handleDeleteAll = useCallback(() => {
    setDeleteAllDialogOpen(true);
  }, []);

  const handleConfirmDeleteAll = useCallback(() => {
    deleteAllMutation.mutate();
  }, [deleteAllMutation]);

  const handleDeactivateAll = useCallback(() => {
    setDeactivateAllDialogOpen(true);
  }, []);

  const handleConfirmDeactivateAll = useCallback(() => {
    deactivateAllMutation.mutate();
  }, [deactivateAllMutation]);

  const handleActivateAll = useCallback(() => {
    setActivateAllDialogOpen(true);
  }, []);

  const handleConfirmActivateAll = useCallback(() => {
    activateAllMutation.mutate();
  }, [activateAllMutation]);

  // ========================================
  // DATA FETCHING WITH REACT QUERY
  // ========================================

  // Fetch stats for status filter badges
  const { data: stats } = useQuery({
    queryKey: ['medical-services-stats', refreshKey],
    queryFn: getMedicalServicesStats,
    staleTime: 30000 // Cache for 30 seconds
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters, statusFilter, refreshKey],
    queryFn: async () => {
      // Build query parameters from table state
      const params = {
        page: tableState.page,
        size: tableState.pageSize
      };

      // Add status filter
      if (statusFilter !== null) {
        params.active = statusFilter;
      }

      // Add sorting - Use sortBy and sortDir for Spring Boot
      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sortBy = sort.id;
        params.sortDir = sort.desc ? 'DESC' : 'ASC';
      }

      // Add filters
      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params[key] = value;
        }
      });

      const response = await getMedicalServices(params);
      return response;
    },
    keepPreviousData: true
  });

  // ========================================
  // COLUMN DEFINITIONS
  // ========================================

  const columns = useMemo(
    () => [
      // Code Column
      {
        accessorKey: 'code',
        header: 'الرمز',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 100,
        align: 'right',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight="medium">
            {getValue() || '-'}
          </Typography>
        )
      },

      // Name Column
      {
        accessorKey: 'name',
        header: 'الاسم',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 200,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
      },

      // Category Column - INLINE EDITABLE
      {
        accessorKey: 'categoryName',
        header: 'التصنيف ✏️',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 200,
        align: 'right',
        cell: ({ row }) => {
          const currentCategoryId = row.original?.categoryId;
          const serviceName = row.original?.name || row.original?.code;
          const serviceId = row.original?.id;

          return (
            <FormControl size="small" fullWidth sx={{ minWidth: 150 }}>
              <Select
                value={currentCategoryId || ''}
                onChange={(e) => {
                  const newCategoryId = e.target.value || null;
                  updateCategoryMutation.mutate({
                    serviceId,
                    categoryId: newCategoryId,
                    serviceName
                  });
                }}
                displayEmpty
                sx={{
                  '& .MuiSelect-select': {
                    py: 0.5,
                    fontSize: '0.875rem'
                  }
                }}
                disabled={updateCategoryMutation.isPending}
              >
                <MenuItem value="">
                  <em style={{ color: '#999' }}>-- بدون تصنيف --</em>
                </MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
      },

      // Price Column
      {
        accessorKey: 'basePrice',
        header: 'السعر (د.ل)',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 120,
        align: 'center',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight="medium" color="primary">
            {formatPrice(getValue())}
          </Typography>
        )
      },

      // Status Column
      {
        accessorKey: 'active',
        header: 'الحالة',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 100,
        align: 'center',
        cell: ({ getValue }) => (
          <Chip label={getValue() ? 'نشط' : 'غير نشط'} color={getValue() ? 'success' : 'default'} size="small" variant="light" />
        )
      },

      // Actions Column
      {
        id: 'actions',
        header: 'الإجراءات',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 130,
        align: 'center',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="عرض">
              <IconButton size="small" color="primary" onClick={() => handleNavigateView(row.original?.id)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="تعديل">
              <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original?.id)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="حذف">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(row.original?.id, row.original?.name || row.original?.code)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit, handleDelete, categories, updateCategoryMutation]
  );

  // ========================================
  // MAIN RENDER
  // ========================================

  // Excel Export Handler - Export ALL data, not just visible
  const handleExcelExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch ALL medical services for export (not just the visible page)
      const allServices = await getAllMedicalServices();
      await exportMedicalServicesToExcel(allServices || []);
      openSnackbar({
        message: `تم تصدير ${allServices?.length || 0} خدمة بنجاح`,
        variant: 'success'
      });
    } catch (error) {
      console.error('[MedicalServices] Excel export failed:', error);
      openSnackbar({
        message: 'فشل تصدير البيانات. يرجى المحاولة لاحقاً',
        variant: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <Box>
      {/* ====== UNIFIED PAGE HEADER ====== */}
      <UnifiedPageHeader
        title="الخدمات الطبية"
        subtitle="إدارة الخدمات الطبية في النظام"
        icon={MedicalServicesIcon}
        breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الخدمات الطبية' }]}
        // Add Button
        showAddButton={true}
        addButtonLabel="إضافة خدمة جديدة"
        onAddClick={handleNavigateAdd}
        additionalActions={
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Excel Export Button */}
            <Tooltip title="تصدير إلى Excel">
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={isExporting ? null : <FileDownloadIcon />}
                onClick={handleExcelExport}
                disabled={isExporting || !data?.items?.length}
              >
                {isExporting ? 'جاري التصدير...' : 'تصدير Excel'}
              </Button>
            </Tooltip>

            <PermissionGuard requires="medical-services.add">
              <ExcelImportButton module="medical-services" onImportComplete={triggerRefresh} />
            </PermissionGuard>

            {/* Bulk Activate Button */}
            <PermissionGuard allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT']}>
              <Tooltip title="تنشيط جميع الخدمات">
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  startIcon={<ToggleOnIcon />}
                  onClick={handleActivateAll}
                  disabled={!stats?.inactive || stats.inactive === 0}
                >
                  تنشيط الكل ({stats?.inactive || 0})
                </Button>
              </Tooltip>
            </PermissionGuard>

            {/* Bulk Deactivate Button */}
            <PermissionGuard allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT']}>
              <Tooltip title="إلغاء تنشيط جميع الخدمات">
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<ToggleOffIcon />}
                  onClick={handleDeactivateAll}
                  disabled={!stats?.active || stats.active === 0}
                >
                  إلغاء تنشيط الكل ({stats?.active || 0})
                </Button>
              </Tooltip>
            </PermissionGuard>

            {/* Bulk Permanent Delete Button */}
            <PermissionGuard allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT']}>
              <Tooltip title="⚠️ حذف جميع الخدمات نهائياً">
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleDeleteAll}
                  disabled={!stats?.total || stats.total === 0}
                >
                  حذف الكل ({stats?.total || 0})
                </Button>
              </Tooltip>
            </PermissionGuard>
          </Stack>
        }
      />

      {/* ====== FILTER BAR ====== */}
      <MainCard sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="status-filter-label">فلترة حسب الحالة</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter === null ? 'all' : statusFilter ? 'active' : 'inactive'}
              label="فلترة حسب الحالة"
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') setStatusFilter(null);
                else if (val === 'active') setStatusFilter(true);
                else setStatusFilter(false);
                // Reset to first page when filter changes
                tableState.setPage(0);
              }}
            >
              <MenuItem value="all">الكل {stats?.total ? `(${stats.total})` : ''}</MenuItem>
              <MenuItem value="active">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon fontSize="small" color="success" />
                  <span>نشط {stats?.active ? `(${stats.active})` : ''}</span>
                </Stack>
              </MenuItem>
              <MenuItem value="inactive">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CancelIcon fontSize="small" color="disabled" />
                  <span>غير نشط {stats?.inactive ? `(${stats.inactive})` : ''}</span>
                </Stack>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Status Summary Chips */}
          <Stack direction="row" spacing={1}>
            <Chip label={`الإجمالي: ${stats?.total || 0}`} size="small" variant="outlined" />
            <Chip label={`نشط: ${stats?.active || 0}`} size="small" color="success" variant="light" />
            <Chip label={`غير نشط: ${stats?.inactive || 0}`} size="small" color="default" variant="light" />
          </Stack>
        </Stack>
      </MainCard>

      {/* ====== MAIN CARD WITH TABLE ====== */}
      <MainCard>
        <TableErrorBoundary>
          <GenericDataTable
            columns={columns}
            data={data?.items || []}
            totalCount={data?.total || 0}
            isLoading={isLoading}
            tableState={tableState}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={true}
            stickyHeader={true}
            minHeight={400}
            maxHeight="calc(100vh - 400px)"
            onRowClick={(row) => handleNavigateView(row.id)}
            emptyMessage="لا توجد خدمات طبية"
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
          />
        </TableErrorBoundary>
      </MainCard>

      {/* ====== DELETE ALL CONFIRMATION DIALOG ====== */}
      <Dialog open={deleteAllDialogOpen} onClose={() => setDeleteAllDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>🚨 تأكيد الحذف النهائي لجميع الخدمات الطبية</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>تحذير!</strong> هذا الإجراء لا يمكن التراجع عنه!
            <br />
            سيتم حذف ({stats?.total || 0}) خدمة طبية نهائياً من قاعدة البيانات.
          </Alert>
          <DialogContentText>
            سيتم حذف جميع الخدمات الطبية بشكل دائم ولا يمكن استرجاعها.
            <br />
            <br />
            <strong style={{ color: 'red' }}>⚠️ هل أنت متأكد تماماً من المتابعة؟</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)} color="inherit" disabled={deleteAllMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmDeleteAll}
            color="error"
            variant="contained"
            disabled={deleteAllMutation.isPending}
            startIcon={<DeleteSweepIcon />}
          >
            {deleteAllMutation.isPending ? 'جاري الحذف...' : '🗑️ تأكيد الحذف النهائي'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====== DEACTIVATE ALL CONFIRMATION DIALOG ====== */}
      <Dialog open={deactivateAllDialogOpen} onClose={() => setDeactivateAllDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'warning.main' }}>تأكيد إلغاء تنشيط جميع الخدمات الطبية</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم إلغاء تنشيط ({stats?.active || 0}) خدمة طبية نشطة.
          </Alert>
          <DialogContentText>
            سيتم وضع علامة "غير نشط" على جميع الخدمات الطبية النشطة. يمكنك إعادة تنشيطها لاحقاً باستخدام زر "تنشيط الكل".
            <br />
            <br />
            <strong>هل أنت متأكد من المتابعة؟</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateAllDialogOpen(false)} color="inherit" disabled={deactivateAllMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmDeactivateAll}
            color="warning"
            variant="contained"
            disabled={deactivateAllMutation.isPending}
            startIcon={<ToggleOffIcon />}
          >
            {deactivateAllMutation.isPending ? 'جاري الإلغاء...' : 'تأكيد إلغاء التنشيط'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====== ACTIVATE ALL CONFIRMATION DIALOG ====== */}
      <Dialog open={activateAllDialogOpen} onClose={() => setActivateAllDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'success.main' }}>تأكيد تنشيط جميع الخدمات الطبية</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            سيتم تنشيط ({stats?.inactive || 0}) خدمة طبية غير نشطة.
          </Alert>
          <DialogContentText>
            سيتم وضع علامة "نشط" على جميع الخدمات الطبية غير النشطة.
            <br />
            <br />
            <strong>هل أنت متأكد من المتابعة؟</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivateAllDialogOpen(false)} color="inherit" disabled={activateAllMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handleConfirmActivateAll}
            color="success"
            variant="contained"
            disabled={activateAllMutation.isPending}
            startIcon={<ToggleOnIcon />}
          >
            {activateAllMutation.isPending ? 'جاري التنشيط...' : 'تأكيد التنشيط'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicalServicesList;
