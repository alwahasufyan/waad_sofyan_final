/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED MEMBERS LIST - FINAL STANDARD TABLE DESIGN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Displays all members (Principals and Dependents) with pagination, sorting, and filtering.
 * Based on: "Visits Log" table reference design
 *
 * MANDATORY STANDARDS:
 * ✅ UnifiedMedicalTable component
 * ✅ Soft medical green header (#E8F5F1)
 * ✅ Full-width table (100%)
 * ✅ Filters ABOVE table only
 * ✅ Sort arrows in header cells
 * ✅ Desktop-first professional design
 * ✅ No MUI DataGrid
 *
 * @module UnifiedMembersList
 * @version 2.0.0 - Final UI Standard
 * @since 2026-02-08
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Tooltip,
  InputAdornment,
  Collapse,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  FilterAltOff as FilterAltOffIcon,
  Person as PersonIcon,
  CreditCard as CreditCardIcon,
  Business as BusinessIcon,
  Star as VIPIcon,
  Bolt as FlashIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  FileDownload as FileDownloadIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import { ModernPageHeader, MemberAvatar } from 'components/tba';
import { UnifiedMedicalTable } from 'components/common';
import MembersBulkUploadDialog from 'components/members/MembersBulkUploadDialog';
import DataExportWizard from 'components/tba/DataExportWizard';
import {
  getAllMembers,
  downloadTemplate,
  exportMembers,
  deleteMember,
  restoreMember,
  hardDeleteMember,
  MEMBER_TYPES,
  MEMBER_STATUSES
} from 'services/api/unified-members.service';
import axiosClient from 'utils/axios';

/**
 * Unified Members List Component
 */
const UnifiedMembersList = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // ════════════════════════════════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════════════════════════════════
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Filters
  const [showFilters, setShowFilters] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    organizationId: '',
    type: '',
    status: ''
  });

  // Import/Export Dialogs
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportWizardOpen, setExportWizardOpen] = useState(false);

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    severity: 'warning',
    confirmText: 'نعم',
    cancelText: 'إلغاء',
    onConfirm: null
  });

  // Lookups
  const [employers, setEmployers] = useState([]);

  // ════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════════════════════════════════════════
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: rowsPerPage,
        sort: sortBy,
        direction: sortDirection.toUpperCase(),
        deleted: showDeleted,
        ...(filters.organizationId && { organizationId: filters.organizationId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(searchTerm.trim() && { fullName: searchTerm.trim() })
      };

      const response = await getAllMembers(params);
      const pageData = response?.data || response;

      setMembers(pageData?.content || []);
      setTotalCount(pageData?.totalElements || 0);
    } catch (error) {
      console.error('Error fetching members:', error);
      enqueueSnackbar('خطأ في جلب المستفيدين', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployers = async () => {
    try {
      const response = await axiosClient.get('/employers/selectors');
      setEmployers(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching employers:', error);
    }
  };

  useEffect(() => {
    fetchEmployers();
  }, []);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filters, searchTerm, sortBy, sortDirection, showDeleted]);

  // ════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════
  const handleSort = (columnId, direction) => {
    setSortBy(columnId);
    setSortDirection(direction);
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters({ organizationId: '', type: '', status: '' });
    setSearchTerm('');
    setPage(0);
  };

  // Import/Export Handlers
  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'members_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      enqueueSnackbar('تم تحميل القالب بنجاح', { variant: 'success' });
    } catch (error) {
      console.error('Error downloading template:', error);
      enqueueSnackbar('فشل تحميل القالب', { variant: 'error' });
    }
  };

  const handleImportClick = () => {
    setImportDialogOpen(true);
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    fetchMembers();
  };

  const performExport = async (params) => {
    return await exportMembers(params);
  };

  // Delete/Restore Handlers
  const closeDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  const handleConfirmAction = async (actionFn, successMessage, errorMessage) => {
    try {
      await actionFn();
      enqueueSnackbar(successMessage, { variant: 'success' });
      fetchMembers();
      closeDialog();
    } catch (error) {
      console.error(errorMessage, error);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleDeleteClick = (member) => {
    setConfirmDialog({
      open: true,
      title: 'هل أنت متأكد؟',
      content:
        member.type === 'PRINCIPAL'
          ? `سيتم حذف المستفيد ${member.fullName}. سيتم حذف جميع التابعين المرتبطين به أيضاً!`
          : `سيتم حذف المستفيد ${member.fullName}.`,
      severity: 'error',
      confirmText: 'نعم، احذفه',
      onConfirm: () => handleConfirmAction(() => deleteMember(member.id), 'تم حذف المستفيد بنجاح', 'خطأ في حذف المستفيد')
    });
  };

  const handleRestoreClick = (member) => {
    setConfirmDialog({
      open: true,
      title: 'استعادة المستفيد؟',
      content: `سيتم استعادة المستفيد ${member.fullName} وإعادته للقائمة النشطة.`,
      severity: 'success',
      confirmText: 'نعم، استعده',
      onConfirm: () => handleConfirmAction(() => restoreMember(member.id), 'تم استعادة المستفيد بنجاح', 'خطأ في استعادة المستفيد')
    });
  };

  const handleHardDeleteClick = (member) => {
    setConfirmDialog({
      open: true,
      title: 'حذف نهائي؟',
      content: `سيتم حذف المستفيد ${member.fullName} نهائياً من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه!`,
      severity: 'error',
      confirmText: 'نعم، احذف نهائياً',
      onConfirm: () => handleConfirmAction(() => hardDeleteMember(member.id), 'تم الحذف النهائي بنجاح', 'خطأ في الحذف النهائي')
    });
  };

  // ════════════════════════════════════════════════════════════════════════
  // TABLE COLUMNS DEFINITION
  // ════════════════════════════════════════════════════════════════════════
  const columns = [
    { id: 'avatar', label: 'الصورة', minWidth: 80, sortable: false },
    {
      id: 'cardNumber',
      label: 'رقم البطاقة',
      minWidth: 130,
      icon: <CreditCardIcon fontSize="small" />,
      sortable: true
    },
    {
      id: 'fullName',
      label: 'الاسم',
      minWidth: 180,
      icon: <PersonIcon fontSize="small" />,
      sortable: true
    },
    { id: 'type', label: 'النوع', minWidth: 100, sortable: true },
    { id: 'status', label: 'الحالة', minWidth: 100, sortable: true },
    {
      id: 'employerName',
      label: 'جهة العمل',
      minWidth: 150,
      icon: <BusinessIcon fontSize="small" />,
      sortable: true
    },
    { id: 'dependentsCount', label: 'التابعون', minWidth: 90, sortable: false },
    { id: 'actions', label: 'إجراءات', minWidth: 150, sortable: false }
  ];

  // ════════════════════════════════════════════════════════════════════════
  // TABLE CELL RENDERER
  // ════════════════════════════════════════════════════════════════════════
  const renderCell = (member, column) => {
    switch (column.id) {
      case 'avatar':
        return <MemberAvatar member={member} size={36} />;

      case 'cardNumber':
        return (
          <Chip
            label={member.cardNumber || '-'}
            variant="outlined"
            size="small"
            color="secondary"
            sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}
          />
        );

      case 'fullName':
        return (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight="500">
                {member.fullName || '-'}
              </Typography>
              {member.isVip && (
                <Tooltip title="VIP member">
                  <VIPIcon sx={{ color: '#ffc107', fontSize: 18 }} />
                </Tooltip>
              )}
              {member.isUrgent && (
                <Tooltip title="Urgent case">
                  <FlashIcon sx={{ color: '#ff5722', fontSize: 18 }} />
                </Tooltip>
              )}
            </Stack>
          </Box>
        );

      case 'type':
        return member.type === MEMBER_TYPES.PRINCIPAL ? (
          <Chip label="رئيسي" color="primary" size="small" />
        ) : (
          <Chip label="تابع" color="secondary" size="small" />
        );

      case 'status':
        const statusConfig = {
          ACTIVE: { label: 'نشط', color: 'success' },
          SUSPENDED: { label: 'معلق', color: 'warning' },
          TERMINATED: { label: 'منتهي', color: 'error' },
          PENDING: { label: 'قيد المراجعة', color: 'warning' }
        };
        const config = statusConfig[member.status] || { label: member.status, color: 'default' };
        return <Chip label={config.label} color={config.color} size="small" />;

      case 'employerName':
        return <Typography variant="body2">{member.employerName || '-'}</Typography>;

      case 'dependentsCount':
        return (
          <Chip
            label={member.dependentsCount || 0}
            size="small"
            variant="outlined"
            sx={{
              minWidth: 28,
              height: 20,
              borderRadius: '6px',
              bgcolor: member.dependentsCount > 0 ? 'secondary.lighter' : 'transparent',
              borderColor: member.dependentsCount > 0 ? 'secondary.light' : 'divider',
              color: member.dependentsCount > 0 ? 'secondary.main' : 'text.disabled',
              fontWeight: member.dependentsCount > 0 ? 600 : 400
            }}
          />
        );

      case 'actions':
        if (showDeleted) {
          // Actions for deleted members
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="استعادة">
                <IconButton size="small" color="success" onClick={() => handleRestoreClick(member)}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف نهائي">
                <IconButton size="small" color="error" onClick={() => handleHardDeleteClick(member)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        }

        // Actions for active members
        return (
          <Stack direction="row" spacing={0.5}>
            {member.status === MEMBER_STATUSES.PENDING && (
              <Tooltip title="اعتماد العضوية">
                <IconButton size="small" color="success">
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="عرض التفاصيل">
              <IconButton size="small" color="info" onClick={() => navigate(`/members/${member.id}`)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="تعديل">
              <IconButton size="small" color="primary" onClick={() => navigate(`/members/${member.id}/edit`)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" onClick={() => handleDeleteClick(member)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );

      default:
        return member[column.id];
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <Box>
      {/* Page Header */}
      <ModernPageHeader
        title="قائمة المستفيدين"
        subtitle="المعيار الموحد لجميع الجداول في النظام"
        icon={<PersonIcon />}
        breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'المستفيدين' }]}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {/* Excel Buttons Group */}
            <Button
              variant="outlined"
              onClick={handleDownloadTemplate}
              startIcon={<DownloadIcon />}
              sx={{
                minWidth: '155px',
                color: '#1b5e20',
                borderColor: '#1b5e20',
                '&:hover': {
                  backgroundColor: '#1b5e2010',
                  borderColor: '#1b5e20'
                }
              }}
            >
              تحميل القالب
            </Button>
            <Button
              variant="outlined"
              onClick={handleImportClick}
              startIcon={<UploadFileIcon />}
              sx={{
                minWidth: '155px',
                color: '#1b5e20',
                borderColor: '#1b5e20',
                '&:hover': {
                  backgroundColor: '#1b5e2010',
                  borderColor: '#1b5e20'
                }
              }}
            >
              استيراد من إكسل
            </Button>
            <Button
              variant="outlined"
              onClick={() => setExportWizardOpen(true)}
              startIcon={<FileDownloadIcon />}
              sx={{
                minWidth: '155px',
                color: '#1b5e20',
                borderColor: '#1b5e20',
                '&:hover': {
                  backgroundColor: '#1b5e2010',
                  borderColor: '#1b5e20'
                }
              }}
            >
              تصدير لإكسل
            </Button>

            {/* Deleted Members Toggle */}
            <Button
              variant={showDeleted ? 'contained' : 'outlined'}
              startIcon={showDeleted ? <VisibilityIcon /> : <DeleteIcon />}
              onClick={() => setShowDeleted(!showDeleted)}
              color={showDeleted ? 'error' : 'inherit'}
              sx={{
                minWidth: '155px',
                ...(showDeleted && {
                  bgcolor: '#d32f2f',
                  '&:hover': { bgcolor: '#b71c1c' }
                })
              }}
            >
              {showDeleted ? 'عرض النشطة' : 'سجل المحذوفات'}
            </Button>

            <Tooltip title={showFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر'}>
              <Button
                variant="outlined"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={showFilters ? <FilterAltOffIcon /> : <FilterListIcon />}
              >
                {showFilters ? 'إخفاء الفلاتر' : 'الفلاتر'}
              </Button>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/members/add')}>
              إضافة مستفيد
            </Button>
          </Stack>
        }
        sx={{ mb: 0.5 }}
      />

      <MainCard>
        {/* FILTERS ROW - ABOVE TABLE */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="بحث بالاسم أو رقم البطاقة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ bgcolor: 'background.paper' }}
          />
        </Box>

        {/* Advanced Filters */}
        <Collapse in={showFilters}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fafafa' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>جهة العمل</InputLabel>
                  <Select
                    value={filters.organizationId}
                    onChange={(e) => handleFilterChange('organizationId', e.target.value)}
                    label="جهة العمل"
                  >
                    <MenuItem value="">
                      <em>الكل</em>
                    </MenuItem>
                    {employers.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>النوع</InputLabel>
                  <Select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} label="النوع">
                    <MenuItem value="">
                      <em>الكل</em>
                    </MenuItem>
                    <MenuItem value={MEMBER_TYPES.PRINCIPAL}>رئيسي</MenuItem>
                    <MenuItem value={MEMBER_TYPES.DEPENDENT}>تابع</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} label="الحالة">
                    <MenuItem value="">
                      <em>الكل</em>
                    </MenuItem>
                    <MenuItem value={MEMBER_STATUSES.ACTIVE}>نشط</MenuItem>
                    <MenuItem value={MEMBER_STATUSES.SUSPENDED}>معلق</MenuItem>
                    <MenuItem value={MEMBER_STATUSES.TERMINATED}>منتهي</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <Button fullWidth variant="outlined" color="secondary" onClick={handleResetFilters} startIcon={<FilterAltOffIcon />}>
                  إعادة ضبط
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Stats Summary */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <Chip icon={<PersonIcon />} label={`إجمالي: ${totalCount} مستفيد`} variant="outlined" color="primary" />
            {searchTerm && <Chip label={`نتائج البحث: "${searchTerm}"`} onDelete={() => setSearchTerm('')} color="info" size="small" />}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="تحديث">
              <IconButton onClick={fetchMembers} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* UNIFIED MEDICAL TABLE - FINAL STANDARD                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <UnifiedMedicalTable
          columns={columns}
          rows={members}
          loading={loading}
          totalCount={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(newSize) => setRowsPerPage(newSize)}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
          renderCell={renderCell}
          getRowKey={(member) => member.id}
          emptyMessage={showDeleted ? 'لا توجد مستفيدين محذوفين' : 'لا توجد مستفيدين'}
          loadingMessage="جارِ التحميل..."
        />
      </MainCard>

      {/* Import Dialog */}
      <MembersBulkUploadDialog open={importDialogOpen} onClose={handleCloseImportDialog} />

      {/* Export Wizard */}
      <DataExportWizard
        open={exportWizardOpen}
        onClose={() => setExportWizardOpen(false)}
        onExport={performExport}
        title="تصدير بيانات المستفيدين"
        fileName={`members-export-${new Date().toISOString().split('T')[0]}.xlsx`}
        params={{
          searchTerm,
          organizationId: filters.organizationId || undefined,
          status: filters.status || undefined,
          type: filters.type || undefined,
          deleted: showDeleted
        }}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeDialog}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.content}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit">
            {confirmDialog.cancelText}
          </Button>
          <Button onClick={confirmDialog.onConfirm} color={confirmDialog.severity === 'error' ? 'error' : 'primary'} autoFocus>
            {confirmDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UnifiedMembersList;
