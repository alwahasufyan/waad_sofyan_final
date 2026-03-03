/**
 * Medical Specialties Management Page
 *
 * Features:
 * - Filter by category
 * - Inline add/edit via dialog
 * - Toggle active/deleted state
 * - Status chip display
 */

import { useMemo, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable';
import TableErrorBoundary from 'components/TableErrorBoundary';
import useTableState from 'hooks/useTableState';
import {
  getMedicalSpecialties,
  createMedicalSpecialty,
  updateMedicalSpecialty,
  toggleMedicalSpecialty
} from 'services/api/medical-specialties.service';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';
import { openSnackbar } from 'api/snackbar';

const QUERY_KEY = 'medical-specialties';
const EMPTY_FORM = { code: '', nameAr: '', nameEn: '', categoryId: '' };

const MedicalSpecialtiesManagement = () => {
  const queryClient = useQueryClient();
  const tableState = useTableState({ initialPageSize: 15, defaultSort: { field: 'nameAr', direction: 'asc' } });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  // ── Fetch parent categories (for filter + form dropdown) ──────────────────

  const { data: allCategories = [] } = useQuery({
    queryKey: ['medical-categories-all'],
    queryFn: getAllMedicalCategories,
    staleTime: 5 * 60 * 1000
  });

  // ── Fetch specialties ─────────────────────────────────────────────────────

  const { data: specialties = [], isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, categoryFilter],
    queryFn: () => getMedicalSpecialties(categoryFilter ? { categoryId: categoryFilter } : {}),
    staleTime: 2 * 60 * 1000
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createMedicalSpecialty,
    onSuccess: () => {
      openSnackbar({ message: 'تم إضافة التخصص بنجاح', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'فشل إضافة التخصص';
      openSnackbar({ message: msg, variant: 'error' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateMedicalSpecialty(id, payload),
    onSuccess: () => {
      openSnackbar({ message: 'تم تحديث التخصص بنجاح', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'فشل تحديث التخصص';
      openSnackbar({ message: msg, variant: 'error' });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: toggleMedicalSpecialty,
    onSuccess: (data) => {
      const isActive = !data?.deleted;
      openSnackbar({ message: isActive ? 'تم تفعيل التخصص' : 'تم إلغاء تفعيل التخصص', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'فشل تغيير حالة التخصص';
      openSnackbar({ message: msg, variant: 'error' });
    }
  });

  // ── Dialog Handlers ───────────────────────────────────────────────────────

  const openAddDialog = useCallback(() => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryId: categoryFilter || '' });
    setFormErrors({});
    setDialogOpen(true);
  }, [categoryFilter]);

  const openEditDialog = useCallback((row) => {
    setEditingId(row.id);
    setForm({ code: row.code || '', nameAr: row.nameAr || '', nameEn: row.nameEn || '', categoryId: row.categoryId || '' });
    setFormErrors({});
    setDialogOpen(true);
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!form.nameAr?.trim()) errors.nameAr = 'الاسم بالعربية مطلوب';
    if (!form.categoryId) errors.categoryId = 'التصنيف مطلوب';
    if (!editingId && !form.code?.trim()) errors.code = 'الرمز مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const payload = { nameAr: form.nameAr.trim(), nameEn: form.nameEn?.trim() || null, categoryId: Number(form.categoryId) };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate({ ...payload, code: form.code.trim() });
    }
  };

  // ── Column definitions ────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'الرمز',
        minWidth: 120,
        cell: ({ getValue }) => (
          <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
            {getValue() || '-'}
          </Typography>
        )
      },
      {
        accessorKey: 'nameAr',
        header: 'الاسم بالعربية',
        minWidth: 180,
        cell: ({ getValue }) => <Typography variant="body2">{getValue() || '-'}</Typography>
      },
      {
        accessorKey: 'nameEn',
        header: 'الاسم بالإنجليزية',
        minWidth: 180,
        cell: ({ getValue }) => (
          <Typography variant="body2" color="text.secondary">
            {getValue() || '-'}
          </Typography>
        )
      },
      {
        accessorKey: 'categoryNameAr',
        header: 'التصنيف',
        minWidth: 160,
        cell: ({ getValue }) => (
          <Chip label={getValue() || '-'} size="small" variant="outlined" color="primary" />
        )
      },
      {
        accessorKey: 'deleted',
        header: 'الحالة',
        minWidth: 100,
        align: 'center',
        cell: ({ row }) => (
          <Chip
            label={row.original?.deleted ? 'معطّل' : 'نشط'}
            color={row.original?.deleted ? 'default' : 'success'}
            size="small"
            variant="light"
          />
        )
      },
      {
        id: 'actions',
        header: 'الإجراءات',
        minWidth: 120,
        align: 'center',
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} justifyContent="center">
            <Tooltip title="تعديل">
              <IconButton size="small" color="info" onClick={() => openEditDialog(row.original)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={row.original?.deleted ? 'تفعيل' : 'إلغاء تفعيل'}>
              <IconButton
                size="small"
                color={row.original?.deleted ? 'success' : 'warning'}
                onClick={() => toggleMutation.mutate(row.original?.id)}
                disabled={toggleMutation.isPending}
              >
                <PowerSettingsNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      }
    ],
    [openEditDialog, toggleMutation]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <UnifiedPageHeader
        title="إدارة التخصصات الطبية"
        subtitle="إضافة وتعديل وتفعيل التخصصات الطبية"
        icon={MedicalServicesIcon}
        breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'التخصصات الطبية' }]}
        showAddButton={false}
      />

      {/* Filter bar */}
      <MainCard sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>فلترة حسب التصنيف</InputLabel>
            <Select
              value={categoryFilter}
              label="فلترة حسب التصنيف"
              onChange={(e) => { setCategoryFilter(e.target.value); tableState.setPage(0); }}
            >
              <MenuItem value=""><em>جميع التصنيفات</em></MenuItem>
              {allCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.nameAr || cat.name || cat.code}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Chip label={`الإجمالي: ${specialties.length}`} size="small" variant="outlined" />

          <Box sx={{ flexGrow: 1 }} />

          <Button variant="outlined" startIcon={<RefreshIcon />} size="small" onClick={() => refetch()} disabled={isLoading}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openAddDialog}>
            إضافة تخصص
          </Button>
        </Stack>
      </MainCard>

      {/* Table */}
      <MainCard>
        <TableErrorBoundary>
          <GenericDataTable
            columns={columns}
            data={specialties}
            totalCount={specialties.length}
            isLoading={isLoading}
            tableState={tableState}
            enableFiltering={false}
            enableSorting={true}
            enablePagination={true}
            stickyHeader={true}
            minHeight={350}
            maxHeight="calc(100vh - 380px)"
            emptyMessage="لا توجد تخصصات طبية"
            rowsPerPageOptions={[10, 25, 50]}
          />
        </TableErrorBoundary>
      </MainCard>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'تعديل التخصص' : 'إضافة تخصص جديد'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!editingId && (
              <TextField
                label="الرمز"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                error={!!formErrors.code}
                helperText={formErrors.code || 'مثال: SP-CARDIO'}
                fullWidth
                size="small"
                required
              />
            )}
            <TextField
              label="الاسم بالعربية"
              value={form.nameAr}
              onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              error={!!formErrors.nameAr}
              helperText={formErrors.nameAr}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="الاسم بالإنجليزية"
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small" error={!!formErrors.categoryId} required>
              <InputLabel>التصنيف</InputLabel>
              <Select
                value={form.categoryId}
                label="التصنيف"
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                {allCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.nameAr || cat.name || cat.code}</MenuItem>
                ))}
              </Select>
              {formErrors.categoryId && <Typography variant="caption" color="error">{formErrors.categoryId}</Typography>}
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingId ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicalSpecialtiesManagement;
