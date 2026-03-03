/**
 * Medical Service View Page - GOLDEN REFERENCE MODULE
 * Original Mantis Form Architecture - NO custom form abstractions
 *
 * ⚠️ This is the REFERENCE implementation for all CRUD view/detail pages.
 * Pattern: ModernPageHeader → MainCard → Typography(h6) + Divider sections → Read-only display
 *
 * Rules Applied:
 * 1. icon={Component} - NEVER JSX
 * 2. Arabic only - No English labels
 * 3. Array.isArray() for all lists
 * 4. Defensive optional chaining
 * 5. Proper error states (403 صلاحيات, 500 خطأ تقني)
 * 6. Read-only display using Typography
 */

import { useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// MUI Components
import { Box, Button, Grid, Stack, Skeleton, Typography, Divider, Chip } from '@mui/material';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import ModernEmptyState from 'components/tba/ModernEmptyState';

// Hooks
import { useMedicalServiceDetails } from 'hooks/useMedicalServices';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatPrice = (value) => {
  if (value == null || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' د.ل';
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const getErrorInfo = (error) => {
  const status = error?.response?.status || error?.status;

  if (status === 403) {
    return {
      type: 'permission',
      title: 'غير مصرح',
      message: 'ليس لديك صلاحية للوصول إلى هذه الخدمة',
      icon: LockIcon
    };
  }

  if (status === 404) {
    return {
      type: 'notfound',
      title: 'غير موجود',
      message: 'الخدمة المطلوبة غير موجودة',
      icon: ErrorOutlineIcon
    };
  }

  if (status >= 500) {
    return {
      type: 'server',
      title: 'خطأ تقني',
      message: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً',
      icon: ErrorOutlineIcon
    };
  }

  return {
    type: 'generic',
    title: 'خطأ',
    message: error?.message || 'فشل تحميل بيانات الخدمة',
    icon: ErrorOutlineIcon
  };
};

// ============================================================================
// DETAIL ROW COMPONENT
// ============================================================================

/**
 * Simple inline detail row - NOT a reusable abstraction, just code organization.
 * Follows Mantis pattern: Typography label + Typography value
 */
const DetailRow = ({ label, value, fullWidth = false }) => (
  <Grid item xs={12} md={fullWidth ? 12 : 6}>
    <Box sx={{ mb: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="body1">{value ?? '-'}</Typography>
    </Box>
  </Grid>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MedicalServiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ========================================
  // DATA FETCHING
  // ========================================

  const { data: service, loading, error: loadError } = useMedicalServiceDetails(id);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const categoryName = useMemo(() => {
    return service?.categoryName || '-';
  }, [service]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleBack = useCallback(() => {
    navigate('/medical-services');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/medical-services/edit/${id}`);
  }, [navigate, id]);

  // ========================================
  // RENDER - LOADING STATE
  // ========================================

  if (loading) {
    return (
      <Box>
        <ModernPageHeader
          title="عرض خدمة طبية"
          subtitle="عرض تفاصيل الخدمة الطبية"
          icon={MedicalServicesIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الخدمات الطبية', path: '/medical-services' }, { label: 'عرض' }]}
        />
        <MainCard>
          <Stack spacing={2}>
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={80} />
          </Stack>
        </MainCard>
      </Box>
    );
  }

  // ========================================
  // RENDER - ERROR STATE
  // ========================================

  if (loadError || !service) {
    const errorInfo = getErrorInfo(loadError);
    const ErrorIcon = errorInfo.icon;

    return (
      <Box>
        <ModernPageHeader
          title="عرض خدمة طبية"
          subtitle="عرض تفاصيل الخدمة الطبية"
          icon={MedicalServicesIcon}
          breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الخدمات الطبية', path: '/medical-services' }, { label: 'عرض' }]}
        />
        <MainCard>
          <ModernEmptyState
            icon={ErrorIcon}
            title={errorInfo.title}
            description={errorInfo.message}
            action={
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
                رجوع للقائمة
              </Button>
            }
          />
        </MainCard>
      </Box>
    );
  }

  // ========================================
  // RENDER - MAIN VIEW
  // ========================================

  return (
    <Box>
      {/* ====== PAGE HEADER ====== */}
      <ModernPageHeader
        title={service?.name || 'عرض خدمة طبية'}
        subtitle={`رمز الخدمة: ${service?.code || '-'}`}
        icon={MedicalServicesIcon}
        breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الخدمات الطبية', path: '/medical-services' }, { label: 'عرض' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              رجوع
            </Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
              تعديل
            </Button>
          </Stack>
        }
      />

      {/* ====== MAIN CARD ====== */}
      <MainCard>
        {/* ====== BASIC INFORMATION SECTION ====== */}
        <Typography variant="h6" gutterBottom>
          المعلومات الأساسية
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <DetailRow label="الرمز" value={service?.code} />
          <DetailRow label="التصنيف الطبي" value={categoryName} />
          <DetailRow label="الاسم" value={service?.name} />
          <DetailRow label="الوصف" value={service?.description} fullWidth />
        </Grid>

        {/* ====== PRICING SECTION ====== */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          التسعير
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <DetailRow label="السعر الأساسي" value={formatPrice(service?.basePrice)} />
          <DetailRow label="التكلفة" value={formatPrice(service?.cost)} />
        </Grid>

        {/* ====== STATUS SECTION ====== */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          الحالة
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* Active Status */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                حالة التفعيل
              </Typography>
              <Chip
                icon={service?.active ? <CheckCircleIcon /> : <CancelIcon />}
                label={service?.active ? 'نشطة' : 'غير نشطة'}
                color={service?.active ? 'success' : 'error'}
                variant="filled"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>

        {/* ====== TIMESTAMPS SECTION ====== */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          معلومات السجل
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <DetailRow label="تاريخ الإنشاء" value={formatDate(service?.createdAt)} />
          <DetailRow label="آخر تعديل" value={formatDate(service?.updatedAt)} />
        </Grid>

        {/* ====== ACTION BUTTONS ====== */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            رجوع للقائمة
          </Button>
          <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
            تعديل الخدمة
          </Button>
        </Box>
      </MainCard>
    </Box>
  );
};

export default MedicalServiceView;
