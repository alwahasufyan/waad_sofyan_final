import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import PermissionGuard from 'components/PermissionGuard';
import useTableState from 'hooks/useTableState';
import { getMedicalPackages, deleteMedicalPackage } from 'services/api/medical-packages.service';
import { openSnackbar } from 'api/snackbar';

const QUERY_KEY = 'medical-packages';
const MODULE_NAME = 'medical-packages';

const formatPrice = (value) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(2)} د.ل`;
};

const MedicalPackagesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tableState = useTableState({
    initialPageSize: 10,
    defaultSort: { field: 'createdAt', direction: 'desc' },
    initialFilters: {}
  });

  const handleNavigateAdd = useCallback(() => navigate('/medical-packages/add'), [navigate]);
  const handleNavigateView = useCallback((id) => navigate(`/medical-packages/${id}`), [navigate]);
  const handleNavigateEdit = useCallback((id) => navigate(`/medical-packages/edit/${id}`), [navigate]);

  const handleDelete = useCallback(
    async (id, name) => {
      if (!window.confirm(`هل أنت متأكد من حذف الباقة "${name}"؟`)) return;
      try {
        await deleteMedicalPackage(id);
        openSnackbar({ message: 'تم حذف الباقة بنجاح', variant: 'success' });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      } catch (err) {
        console.error('[MedicalPackages] Delete failed:', err);
        openSnackbar({ message: 'فشل حذف الباقة', variant: 'error' });
      }
    },
    [queryClient]
  );

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters],
    queryFn: async () => {
      const params = { page: tableState.page + 1, size: tableState.pageSize };
      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sortBy = sort.id;
        params.sortDir = sort.desc ? 'desc' : 'asc';
      }
      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) params[key] = value;
      });
      return await getMedicalPackages(params);
    },
    keepPreviousData: true
  });

  const columns = useMemo(
    () => [
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
      {
        accessorKey: 'name',
        header: 'الاسم',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 180,
        align: 'right',
        cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
      },
      {
        accessorKey: 'description',
        header: 'الوصف',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 200,
        align: 'right',
        cell: ({ getValue }) => (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
            {getValue() || '-'}
          </Typography>
        )
      },
      {
        accessorKey: 'totalCoverageLimit',
        header: 'حد التغطية',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 120,
        align: 'right',
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight="medium">
            {formatPrice(getValue())}
          </Typography>
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
            <Tooltip title="تعديل">
              <IconButton size="small" color="info" onClick={() => handleNavigateEdit(row.original?.id)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <PermissionGuard requires="medical-packages.delete">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(row.original?.id, row.original?.name || row.original?.code)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </PermissionGuard>
            </Tooltip>
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit, handleDelete]
  );

  return (
    <Box>
      <PermissionGuard requires="medical-packages.view">
        <UnifiedPageHeader
          title="الباقات الطبية"
          subtitle="إدارة الباقات الطبية الشاملة"
          icon={InventoryIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الباقات الطبية' }]}
          showAddButton={true}
          addButtonLabel="إضافة باقة جديدة"
          onAddClick={handleNavigateAdd}
        />
      </PermissionGuard>
      <MainCard>
        <TableErrorBoundary>
          <GenericDataTable
            columns={columns}
            data={data?.items || []}
            totalCount={data?.total || 0}
            isLoading={isLoading}
            tableState={tableState}
            enableFiltering={false}
            enableSorting={true}
            enablePagination={true}
            stickyHeader={true}
            minHeight={400}
            maxHeight="calc(100vh - 300px)"
            onRowClick={(row) => handleNavigateView(row.id)}
            emptyMessage="لا توجد باقات طبية"
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableErrorBoundary>
      </MainCard>
    </Box>
  );
};

export default MedicalPackagesList;
