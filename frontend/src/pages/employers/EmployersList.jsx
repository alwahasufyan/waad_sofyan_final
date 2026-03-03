/**
 * Employers List Page - UNIFIED IMPLEMENTATION
 * Pattern: UnifiedPageHeader → MainCard → GenericDataTable
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// MUI Components
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';

// MUI Icons - Always as Component, NEVER as JSX
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import RestoreIcon from '@mui/icons-material/Restore';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import RefreshIcon from '@mui/icons-material/Refresh';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';
import useTableState from 'hooks/useTableState';

// Services
import { getEmployers, archiveEmployer, restoreEmployer } from 'services/api/employers.service';
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUERY_KEY = 'employers';
const MODULE_NAME = 'employers';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EmployersList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'id', direction: 'desc' },
    initialFilters: {}
  });

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleNavigateAdd = useCallback(() => {
    navigate('/employers/create');
  }, [navigate]);

  const handleNavigateView = useCallback(
    (id) => {
      navigate(`/employers/${id}`);
    },
    [navigate]
  );

  const handleNavigateEdit = useCallback(
    (id) => {
      navigate(`/employers/edit/${id}`);
    },
    [navigate]
  );

  const handleArchive = useCallback(
    async (id, name) => {
      const confirmMessage = `هل أنت متأكد من أرشفة الشريك "${name}"؟\n\nملاحظة: الأرشفة لا تحذف البيانات، بل تخفيها من القوائم مع الحفاظ على جميع العلاقات.`;
      if (!window.confirm(confirmMessage)) return;

      try {
        await archiveEmployer(id);
        openSnackbar({ message: 'تم أرشفة الشريك بنجاح', variant: 'success' });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err) {
        console.error('[Employers] Archive failed:', err);
        openSnackbar({ message: err.message || 'فشل أرشفة الشريك', variant: 'error' });
      }
    },
    [queryClient]
  );

  const handleRestore = useCallback(
    async (id, name) => {
      const confirmMessage = `هل تريد استعادة الشريك "${name}" من الأرشيف؟`;
      if (!window.confirm(confirmMessage)) return;

      try {
        await restoreEmployer(id);
        openSnackbar({ message: 'تم استعادة الشريك بنجاح', variant: 'success' });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err) {
        console.error('[Employers] Restore failed:', err);
        openSnackbar({ message: 'فشل استعادة الشريك', variant: 'error' });
      }
    },
    [queryClient]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize],
    queryFn: async () => {
      const result = await getEmployers();
      if (Array.isArray(result)) {
        return { content: result, totalElements: result.length };
      }
      return result;
    },
    keepPreviousData: true
  });

  // ========================================
  // COLUMN DEFINITIONS
  // ========================================

  const columns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'الرمز',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 100,
        align: 'center',
        meta: { filterType: 'text' },
        cell: ({ row }) => <Chip label={row.original?.code || '-'} size="small" variant="outlined" color="primary" />
      },
      {
        accessorKey: 'name',
        header: 'اسم الشريك',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 250,
        align: 'right',
        meta: { filterType: 'text' },
        cell: ({ row }) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" fontWeight={500}>
              {row.original?.name || '-'}
            </Typography>
            {row.original?.archived && <Chip label="مؤرشف" size="small" color="warning" variant="outlined" />}
          </Stack>
        )
      },
      {
        accessorKey: 'active',
        header: 'الحالة',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 100,
        align: 'center',
        cell: ({ row }) => (
          <Chip
            label={row.original?.active ? 'نشط' : 'غير نشط'}
            color={row.original?.active ? 'success' : 'default'}
            size="small"
            variant="light"
          />
        )
      },

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

            <PermissionGuard resource="employers" action="update">
              <Tooltip title="تعديل">
                <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original?.id)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </PermissionGuard>

            {row.original?.archived ? (
              <Tooltip title="استعادة من الأرشيف">
                <PermissionGuard resource="employers" action="delete">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleRestore(row.original?.id, row.original?.name || row.original?.code)}
                  >
                    <RestoreIcon fontSize="small" />
                  </IconButton>
                </PermissionGuard>
              </Tooltip>
            ) : (
              <Tooltip title="أرشفة">
                <PermissionGuard resource="employers" action="delete">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => handleArchive(row.original?.id, row.original?.name || row.original?.code)}
                  >
                    <ArchiveIcon fontSize="small" />
                  </IconButton>
                </PermissionGuard>
              </Tooltip>
            )}
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit, handleArchive, handleRestore]
  );

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <Box>
      <PermissionGuard resource="employers" action="view">
        <UnifiedPageHeader
          title="الشركاء"
          subtitle="إدارة الشركاء ومعلوماتهم"
          icon={BusinessCenterIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الشركاء' }]}
          showAddButton={true}
          addButtonLabel="إضافة شريك"
          onAddClick={handleNavigateAdd}
          addResource="employers"
          addAction="create"
          additionalActions={
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              تحديث
            </Button>
          }
        />
      </PermissionGuard>
      <MainCard>
        <TableErrorBoundary>
          <GenericDataTable
            columns={columns}
            data={data?.content || []}
            totalCount={data?.totalElements || 0}
            isLoading={isLoading}
            tableState={tableState}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={true}
            stickyHeader={true}
            minHeight={400}
            maxHeight="calc(100vh - 300px)"
            onRowClick={(row) => handleNavigateView(row.id)}
            emptyMessage="لا توجد شركاء"
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableErrorBoundary>
      </MainCard>
    </Box>
  );
};

export default EmployersList;
