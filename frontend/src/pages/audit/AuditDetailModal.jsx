import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Chip,
  Typography,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Box
} from '@mui/material';
import { Close as CloseIcon, OpenInNew as OpenIcon, Person as PersonIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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
 * Audit Detail Modal Component
 * عرض التفاصيل الكاملة لسجل التدقيق
 */
const AuditDetailModal = ({ open, onClose, audit }) => {
  const navigate = useNavigate();

  if (!audit) return null;

  const handleNavigateToEntity = () => {
    if (audit.preAuthorizationId) {
      navigate(`/pre-approvals/${audit.preAuthorizationId}`);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={600}>
              📋 تفاصيل سجل التدقيق
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* الإجراء ورقم المرجع */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              الإجراء ورقم المرجع
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={getActionLabel(audit.action)} color={getActionColor(audit.action)} size="medium" />
              <Chip label={audit.referenceNumber || `#${audit.preAuthorizationId}`} variant="outlined" size="medium" />
            </Stack>
          </Box>

          <Divider />

          {/* معلومات المستخدم والتاريخ */}
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ width: '40%', fontWeight: 600 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" color="action" />
                    <span>المستخدم</span>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {audit.changedBy}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="action" />
                    <span>التاريخ والوقت</span>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(audit.changeDate)}</Typography>
                </TableCell>
              </TableRow>
              {audit.notes && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>الملاحظات</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {audit.notes}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* التغييرات في الحقول */}
          {audit.fieldName && (
            <>
              <Divider />
              <Box
                sx={{
                  bgcolor: 'action.hover',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  📝 التغييرات في الحقول
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
                  الحقل: {audit.fieldName}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      القيمة القديمة
                    </Typography>
                    <Chip label={audit.oldValue || 'لا يوجد'} size="medium" variant="outlined" sx={{ width: '100%' }} />
                  </Box>
                  <Typography variant="h5" color="primary">
                    →
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      القيمة الجديدة
                    </Typography>
                    <Chip label={audit.newValue || 'لا يوجد'} size="medium" color="primary" sx={{ width: '100%' }} />
                  </Box>
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          إغلاق
        </Button>
        {audit.preAuthorizationId && (
          <Button variant="contained" startIcon={<OpenIcon />} onClick={handleNavigateToEntity}>
            عرض الطلب الأصلي
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AuditDetailModal;
