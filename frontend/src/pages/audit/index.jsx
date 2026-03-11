import { useState } from 'react';
import {
  Button,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip,
  Avatar,
  Card,
  CardContent,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Skeleton,
  Menu
} from '@mui/material';
import {
  Timeline,
  Refresh,
  Download,
  Search,
  FilterList,
  Person,
  CalendarToday,
  ChevronRight,
  FileDownload,
  Lock
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MainCard from 'components/MainCard';
import { ModernPageHeader, ModernEmptyState } from 'components/tba';
import { usePreAuthAudit, usePreAuthAuditSearch, usePreAuthAuditStats } from 'hooks/usePreAuthAudit';
import { useAuth } from 'contexts/AuthContext';
import { exportToExcel } from 'utils/exportUtils';
import AuditDetailModal from './AuditDetailModal';
import { exportToPDF } from './export-utils';

/**
 * Get action color based on type
 */
const getActionColor = (action) => {
  const colors = {
    CREATE: 'success',
    UPDATE: 'info',
    APPROVE: 'success',
    REJECT: 'error',
    CANCEL: 'warning',
    DELETE: 'error',
    STATUS_CHANGE: 'info'
  };
  return colors[action] || 'default';
};

/**
 * Get action label in Arabic
 */
const getActionLabel = (action) => {
  const labels = {
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    APPROVE: 'موافقة',
    REJECT: 'رفض',
    CANCEL: 'إلغاء',
    DELETE: 'حذف',
    STATUS_CHANGE: 'تغيير الحالة'
  };
  return labels[action] || action;
};

/**
 * Format date to Arabic
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Format date to relative (e.g., "منذ ساعتين")
 */
const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return formatDate(dateString);
};

/**
 * Audit Timeline Item Component
 * عنصر Timeline قابل للنقر لعرض التفاصيل
 */
const AuditTimelineItem = ({ audit, isLast, onClick }) => {
  const navigate = useNavigate();

  const handleNavigate = (e) => {
    e.stopPropagation();
    if (audit.preAuthorizationId) {
      navigate(`/pre-approvals/${audit.preAuthorizationId}`);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        pb: 3,
        position: 'relative',
        cursor: 'pointer',
        '&:hover': {
          '& .audit-card': {
            boxShadow: 3,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out'
          }
        }
      }}
      onClick={onClick}
    >
      {/* Timeline connector */}
      {!isLast && (
        <Box
          sx={{
            position: 'absolute',
            right: 19,
            top: 40,
            bottom: -12,
            width: 2,
            bgcolor: 'divider'
          }}
        />
      )}

      {/* Action indicator */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: `${getActionColor(audit.action)}.main`,
            color: 'white'
          }}
        >
          <Timeline />
        </Avatar>
      </Box>

      {/* Content */}
      <Card className="audit-card" sx={{ flex: 1, transition: 'all 0.2s' }}>
        <CardContent>
          <Stack spacing={1}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={getActionLabel(audit.action)} color={getActionColor(audit.action)} size="small" />
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    '&:hover': { color: 'primary.dark' }
                  }}
                  onClick={handleNavigate}
                >
                  {audit.referenceNumber || `#${audit.preAuthorizationId}`}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" title={formatDate(audit.changeDate)}>
                {formatRelativeDate(audit.changeDate)}
              </Typography>
            </Box>

            {/* User info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" color="action" />
              <Typography variant="body2" fontWeight="medium">
                {audit.changedBy}
              </Typography>
            </Box>

            {/* Notes */}
            {audit.notes && (
              <Typography variant="body2" color="text.secondary">
                {audit.notes}
              </Typography>
            )}

            {/* Field changes (for UPDATE action) */}
            {audit.fieldName && (
              <Box
                sx={{
                  bgcolor: 'action.hover',
                  p: 1.5,
                  borderRadius: 1,
                  mt: 1
                }}
              >
                <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                  {audit.fieldName}:
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={audit.oldValue || '-'} size="small" variant="outlined" />
                  <ChevronRight fontSize="small" />
                  <Chip label={audit.newValue || '-'} size="small" color="primary" />
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Statistics Card Component
 * بطاقة إحصائيات
 */
const StatCard = ({ title, value, color, icon, loading }) => (
  <Card>
    <CardContent>
      {loading ? (
        <>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="80%" />
        </>
      ) : (
        <>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {icon}
            <Typography variant="h4" color={color}>
              {value || 0}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </>
      )}
    </CardContent>
  </Card>
);

/**
 * Audit Log Page - Enhanced Version
 * صفحة سجل التدقيق - نسخة محسنة
 *
 * Features:
 * - RBAC protected
 * - Statistics dashboard
 * - Detail modal
 * - Export to PDF/Excel
 * - Advanced filters
 * - Interactive timeline
 * - Entity navigation
 */
const AuditPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Filters state
  const [filterAction, setFilterAction] = useState('');
  const [filterDays, setFilterDays] = useState(7);
  const [searchMode, setSearchMode] = useState(false);

  // Detail modal state
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const exportMenuOpen = Boolean(exportAnchorEl);

  // Fetch audit data
  const {
    data: auditData,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  } = usePreAuthAudit({
    action: filterAction || undefined,
    days: filterDays
  });

  // Search functionality
  const { query: searchQuery, setQuery: setSearchQuery, data: searchResults, loading: searchLoading } = usePreAuthAuditSearch();

  // Statistics
  const { stats, loading: statsLoading, error: statsError } = usePreAuthAuditStats();

  const displayData = searchMode ? searchResults : auditData;
  const isLoading = searchMode ? searchLoading : loading;

  // Permission checks - simplified: role-based system
  const canExport = () => {
    if (!user) return false;
    return ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.roles?.[0]);
  };

  const canViewStats = () => {
    if (!user) return false;
    return true; // Stats visible to all authenticated users
  };

  // Handlers
  const handleRefresh = () => {
    setSearchMode(false);
    setSearchQuery('');
    refresh();
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchMode(value.length >= 2);
  };

  const handleViewDetails = (audit) => {
    setSelectedAudit(audit);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedAudit(null);
  };

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = async (format) => {
    if (!canExport()) {
      alert('⚠️ ليس لديك صلاحية التصدير');
      return;
    }

    setExportLoading(true);
    handleExportClose();

    try {
      if (format === 'pdf') {
        exportToPDF(displayData);
      } else if (format === 'excel') {
        const exportData = displayData.map((audit, index) => ({
          index: index + 1,
          action: getActionLabel(audit.action),
          reference: audit.referenceNumber || audit.preAuthorizationId || '-',
          user: audit.changedBy || '-',
          date: formatDate(audit.changeDate),
          notes: audit.notes || '-',
          field: audit.fieldName || '-',
          oldValue: audit.oldValue || '-',
          newValue: audit.newValue || '-'
        }));

        await exportToExcel(exportData, `audit-log-${new Date().toISOString().split('T')[0]}`, {
          reportTitle: 'سجل التدقيق',
          columns: [
            { key: 'index', header: '#', width: 8, type: 'number' },
            { key: 'action', header: 'الإجراء', width: 18, type: 'string' },
            { key: 'reference', header: 'الرقم المرجعي', width: 24, type: 'string' },
            { key: 'user', header: 'المستخدم', width: 20, type: 'string' },
            { key: 'date', header: 'التاريخ', width: 20, type: 'string' },
            { key: 'notes', header: 'الملاحظات', width: 36, type: 'string' },
            { key: 'field', header: 'الحقل', width: 18, type: 'string' },
            { key: 'oldValue', header: 'القيمة القديمة', width: 24, type: 'string' },
            { key: 'newValue', header: 'القيمة الجديدة', width: 24, type: 'string' }
          ]
        });
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('❌ فشل التصدير. يرجى المحاولة مرة أخرى.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <Box>
        <ModernPageHeader
          title="سجل التدقيق"
          subtitle="سجل التغييرات والنشاطات على طلبات الموافقة المسبقة"
          icon={Timeline}
          breadcrumbs={[{ label: 'سجل التدقيق' }]}
          actions={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh} disabled={loading}>
                تحديث
              </Button>
              <Button
                variant="outlined"
                startIcon={exportLoading ? <CircularProgress size={20} /> : <Download />}
                disabled={!canExport() || exportLoading || displayData.length === 0}
                onClick={handleExportClick}
              >
                تصدير
              </Button>
              <Menu anchorEl={exportAnchorEl} open={exportMenuOpen} onClose={handleExportClose}>
                <MenuItem onClick={() => handleExport('pdf')}>
                  <FileDownload sx={{ mr: 1 }} />
                  تصدير PDF
                </MenuItem>
                <MenuItem onClick={() => handleExport('excel')}>
                  <FileDownload sx={{ mr: 1 }} />
                  تصدير Excel
                </MenuItem>
              </Menu>
            </Stack>
          }
        />

        {/* Statistics Cards */}
        {canViewStats() && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="إجمالي الإجراءات"
                value={stats?.totalActions}
                color="primary.main"
                icon={<Timeline color="primary" />}
                loading={statsLoading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="موافقات"
                value={stats?.approvals}
                color="success.main"
                icon={<Timeline color="success" />}
                loading={statsLoading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="رفض" value={stats?.rejections} color="error.main" icon={<Timeline color="error" />} loading={statsLoading} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="تعديلات" value={stats?.updates} color="info.main" icon={<Timeline color="info" />} loading={statsLoading} />
            </Grid>
          </Grid>
        )}

        <MainCard>
          {/* Filters */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            {/* Search */}
            <TextField
              fullWidth
              placeholder="البحث في سجل التدقيق..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            {/* Action & Date filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>نوع الإجراء</InputLabel>
                <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} label="نوع الإجراء" disabled={searchMode}>
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="CREATE">إنشاء</MenuItem>
                  <MenuItem value="UPDATE">تعديل</MenuItem>
                  <MenuItem value="APPROVE">موافقة</MenuItem>
                  <MenuItem value="REJECT">رفض</MenuItem>
                  <MenuItem value="CANCEL">إلغاء</MenuItem>
                  <MenuItem value="DELETE">حذف</MenuItem>
                  <MenuItem value="STATUS_CHANGE">تغيير الحالة</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>الفترة الزمنية</InputLabel>
                <Select value={filterDays} onChange={(e) => setFilterDays(e.target.value)} label="الفترة الزمنية" disabled={searchMode}>
                  <MenuItem value={1}>اليوم</MenuItem>
                  <MenuItem value={7}>آخر 7 أيام</MenuItem>
                  <MenuItem value={30}>آخر 30 يوم</MenuItem>
                  <MenuItem value={90}>آخر 90 يوم</MenuItem>
                </Select>
              </FormControl>

              {searchMode && (
                <Chip
                  label="وضع البحث نشط"
                  color="primary"
                  onDelete={() => {
                    setSearchMode(false);
                    setSearchQuery('');
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Results */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {statsError && canViewStats() && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              تعذر تحميل الإحصائيات: {statsError}
            </Alert>
          )}

          {!isLoading && displayData.length === 0 && (
            <ModernEmptyState
              icon={Timeline}
              title={searchMode ? 'لا توجد نتائج' : 'لا توجد سجلات'}
              description={searchMode ? 'لم يتم العثور على نتائج للبحث' : 'لا توجد سجلات تدقيق في الفترة المحددة'}
              height={300}
            />
          )}

          {/* Loading skeleton */}
          {isLoading && displayData.length === 0 && (
            <Box sx={{ mt: 2 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={2}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          )}

          {/* Timeline */}
          {displayData.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {displayData.map((audit, index) => (
                <AuditTimelineItem
                  key={audit.id || index}
                  audit={audit}
                  isLast={index === displayData.length - 1}
                  onClick={() => handleViewDetails(audit)}
                />
              ))}

              {/* Load more button */}
              {!searchMode && hasMore && !isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button variant="outlined" onClick={loadMore}>
                    تحميل المزيد
                  </Button>
                </Box>
              )}

              {/* Loading indicator */}
              {isLoading && displayData.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <CircularProgress />
                </Box>
              )}
            </Box>
          )}
        </MainCard>

        {/* Detail Modal */}
        <AuditDetailModal open={detailModalOpen} onClose={handleCloseDetailModal} audit={selectedAudit} />
      </Box>
    </>
  );
};

export default AuditPage;
