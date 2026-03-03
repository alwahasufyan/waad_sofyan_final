import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Chip, IconButton, Stack, Tooltip, Typography, Alert, Button } from '@mui/material';
import dayjs from 'dayjs';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PolicyIcon from '@mui/icons-material/Policy';
import RefreshIcon from '@mui/icons-material/Refresh';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import useTableState from 'hooks/useTableState';
import { getBenefitPolicies } from 'services/api/benefit-policies.service';

const QUERY_KEY = 'benefit-policies';
const MODULE_NAME = 'benefit-policies';

const STATUS_CONFIG = {
  DRAFT: { label: 'مسودة', color: 'default' },
  ACTIVE: { label: 'نشط', color: 'success' },
  INACTIVE: { label: 'غير نشط', color: 'default' },
  SUSPENDED: { label: 'موقوف', color: 'warning' },
  EXPIRED: { label: 'منتهي', color: 'error' },
  CANCELLED: { label: 'ملغي', color: 'error' }
};

const BenefitPoliciesList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tableState = useTableState({
    initialPageSize: 20,
    defaultSort: { field: 'createdAt', direction: 'desc' },
    initialFilters: {}
  });

  const handleNavigateAdd = useCallback(() => navigate('/benefit-policies/create'), [navigate]);
  const handleNavigateView = useCallback((id) => navigate(`/benefit-policies/${id}`), [navigate]);
  const handleNavigateEdit = useCallback((id) => navigate(`/benefit-policies/edit/${id}`), [navigate]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, tableState.page, tableState.pageSize, tableState.sorting, tableState.columnFilters],
    queryFn: async () => {
      const params = { page: tableState.page, size: tableState.pageSize };
      if (tableState.sorting.length > 0) {
        const sort = tableState.sorting[0];
        params.sort = `${sort.id},${sort.desc ? 'desc' : 'asc'}`;
      }
      Object.entries(tableState.columnFilters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) params[key] = value;
      });
      return await getBenefitPolicies(params);
    },
    keepPreviousData: true
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: 'policyCode',
        header: 'رمز السياسة',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 120,
        align: 'right',
        meta: { filterType: 'text' },
        cell: ({ getValue }) => <Chip label={getValue() || '-'} size="small" variant="outlined" color="primary" />
      },
      {
        accessorKey: 'name',
        header: 'اسم السياسة',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 250,
        align: 'right',
        meta: { filterType: 'text' },
        cell: ({ getValue }) => (
          <Typography variant="body2" fontWeight={500}>
            {getValue() || '-'}
          </Typography>
        )
      },
      {
        accessorKey: 'employerName',
        header: 'الشريك',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 200,
        align: 'right',
        meta: { filterType: 'text' },
        cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
      },
      {
        accessorKey: 'startDate',
        header: 'تاريخ البدء',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 120,
        align: 'center',
        cell: ({ getValue }) => {
          const date = getValue();
          return date ? <Chip label={dayjs(date).format('YYYY-MM-DD')} size="small" variant="outlined" /> : '-';
        }
      },
      {
        accessorKey: 'endDate',
        header: 'تاريخ الانتهاء',
        enableSorting: true,
        enableColumnFilter: false,
        minWidth: 120,
        align: 'center',
        cell: ({ getValue }) => {
          const date = getValue();
          return date ? <Chip label={dayjs(date).format('YYYY-MM-DD')} size="small" variant="outlined" /> : '-';
        }
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        enableSorting: true,
        enableColumnFilter: true,
        minWidth: 120,
        align: 'center',
        meta: { filterType: 'text' },
        cell: ({ getValue }) => {
          const status = getValue();
          const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
          return <Chip label={config.label} color={config.color} size="small" />;
        }
      },
      {
        id: 'actions',
        header: 'الإجراءات',
        enableSorting: false,
        enableColumnFilter: false,
        minWidth: 120,
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
              
          </Stack>
        )
      }
    ],
    [handleNavigateView, handleNavigateEdit]
  );

  return (
    <>
      <Box>
        <UnifiedPageHeader
          title="سياسات المنافع"
          subtitle="إدارة سياسات المنافع والتغطية التأمينية"
          icon={PolicyIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/dashboard' }, { label: 'سياسات المنافع' }]}
          showAddButton={true}
          addButtonLabel="إنشاء سياسة جديدة"
          onAddClick={handleNavigateAdd}
          requires="benefit_policies.create"
          additionalActions={
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              تحديث
            </Button>
          }
        />
        <MainCard>
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              فشل تحميل البيانات: {error?.response?.data?.message || error?.message || 'خطأ غير معروف'}
            </Alert>
          )}
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
              emptyMessage="لا توجد سياسات"
              rowsPerPageOptions={[10, 20, 50]}
            />
          </TableErrorBoundary>
        </MainCard>
      </Box>
    </>
  );
};

export default BenefitPoliciesList;
