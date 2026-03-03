/**
 * Medical Service Edit Page - GOLDEN REFERENCE MODULE
 * Original Mantis Form Architecture - NO custom form abstractions
 *
 * ⚠️ This is the REFERENCE implementation for all CRUD edit pages.
 * Pattern: ModernPageHeader → MainCard → Typography(h6) + Divider sections → MUI inputs
 *
 * Rules Applied:
 * 1. icon={Component} - NEVER JSX
 * 2. Arabic only - No English labels
 * 3. Array.isArray() for all lists
 * 4. Defensive optional chaining
 * 5. Proper error states (403 صلاحيات, 500 خطأ تقني)
 * 6. TableRefreshContext for post-edit refresh
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// MUI Components
import {
  Box,
  Button,
  Grid,
  Stack,
  Alert,
  Skeleton,
  TextField,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  InputAdornment
} from '@mui/material';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import ModernEmptyState from 'components/tba/ModernEmptyState';

// Contexts
import { useTableRefresh } from 'contexts/TableRefreshContext';

// Hooks & Services
import { useMedicalServiceDetails } from 'hooks/useMedicalServices';
import { useAllMedicalCategories } from 'hooks/useMedicalCategories';
import { updateMedicalService } from 'services/api/medical-services.service';

// Snackbar
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_FORM_STATE = {
  code: '',
  name: '',
  categoryId: '',
  description: '',
  basePrice: '',
  requiresPA: false,
  active: true
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
// MAIN COMPONENT
// ============================================================================

const MedicalServiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { triggerRefresh } = useTableRefresh();

  // ========================================
  // DATA FETCHING
  // ========================================

  const { data: service, loading: loadingService, error: loadError } = useMedicalServiceDetails(id);
  const { data: categories, loading: categoriesLoading } = useAllMedicalCategories();

  const categoryList = useMemo(() => {
    if (!categories) return [];
    return Array.isArray(categories) ? categories : [];
  }, [categories]);

  // ========================================
  // STATE
  // ========================================

  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // ========================================
  // EFFECTS
  // ========================================

  useEffect(() => {
    if (service) {
      setForm({
        code: service?.code || '',
        name: service?.name || '',
        categoryId: service?.categoryId || '',
        description: service?.description || '',
        basePrice: service?.basePrice ?? '',
        requiresPA: Boolean(service?.requiresPA),
        active: service?.active !== undefined ? service.active : true
      });
    }
  }, [service]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleChange = useCallback(
    (field) => (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [errors]
  );

  const validate = useCallback(() => {
    const newErrors = {};

    if (!form.code?.trim()) newErrors.code = 'الرمز مطلوب';
    if (!form.name?.trim()) newErrors.name = 'الاسم مطلوب';
    if (!form.categoryId) newErrors.categoryId = 'التصنيف مطلوب';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validate()) return;

      setSubmitting(true);
      setApiError(null);

      try {
        const payload = {
          name: form.name?.trim() || '',
          categoryId: form.categoryId ? parseInt(form.categoryId, 10) : null,
          description: form.description?.trim() || null,
          basePrice: form.basePrice ? parseFloat(form.basePrice) : null,
          requiresPA: Boolean(form.requiresPA),
          active: Boolean(form.active)
        };

        await updateMedicalService(id, payload);

        openSnackbar({
          message: 'تم تحديث الخدمة بنجاح',
          variant: 'success'
        });

        triggerRefresh();
        navigate('/medical-services');
      } catch (err) {
        console.error('[MedicalServiceEdit] Submit failed:', err);
        setApiError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تحديث الخدمة');
      } finally {
        setSubmitting(false);
      }
    },
    [form, id, navigate, validate, triggerRefresh]
  );

  const handleBack = useCallback(() => navigate('/medical-services'), [navigate]);

  // ========================================
  // RENDER - LOADING STATE
  // ========================================

  if (loadingService) {
    return (
      <Box>
        <ModernPageHeader
          title="تعديل خدمة طبية"
          subtitle="تحديث بيانات الخدمة الطبية"
          icon={MedicalServicesIcon}
          breadcrumbs={[{ label: 'الخدمات الطبية', path: '/medical-services' }, { label: 'تعديل' }]}
        />
        <MainCard>
          <Stack spacing={2}>
            <Skeleton variant="rectangular" height={56} />
            <Skeleton variant="rectangular" height={56} />
            <Skeleton variant="rectangular" height={56} />
            <Skeleton variant="rectangular" height={120} />
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
    return (
      <Box>
        <ModernPageHeader
          title="تعديل خدمة طبية"
          subtitle="تحديث بيانات الخدمة الطبية"
          icon={MedicalServicesIcon}
          breadcrumbs={[{ label: 'الخدمات الطبية', path: '/medical-services' }, { label: 'تعديل' }]}
        />
        <MainCard>
          <ModernEmptyState
            icon={errorInfo.icon}
            title={errorInfo.title}
            description={errorInfo.message}
            action={
              <Button variant="outlined" onClick={handleBack}>
                رجوع للقائمة
              </Button>
            }
          />
        </MainCard>
      </Box>
    );
  }

  // ========================================
  // RENDER - MAIN FORM
  // ========================================

  return (
    <Box>
      <ModernPageHeader
        title="تعديل خدمة طبية"
        subtitle={`تحديث بيانات: ${service?.name || ''}`}
        icon={MedicalServicesIcon}
        breadcrumbs={[{ label: 'الخدمات الطبية', path: '/medical-services' }, { label: 'تعديل' }]}
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            إلغاء
          </Button>
        }
      />

      <MainCard>
        <Box component="form" onSubmit={handleSubmit}>
          {apiError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {apiError}
            </Alert>
          )}

          {/* BASIC INFO */}
          <Typography variant="h6" gutterBottom>
            المعلومات الأساسية
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Code */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="الرمز"
                value={form.code}
                onChange={handleChange('code')}
                error={!!errors.code}
                helperText={errors.code}
                required
                disabled={submitting}
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={!!errors.categoryId} required disabled={submitting || categoriesLoading}>
                <InputLabel>التصنيف الطبي</InputLabel>
                <Select value={form.categoryId} onChange={handleChange('categoryId')} label="التصنيف الطبي">
                  <MenuItem value="">-- اختر التصنيف --</MenuItem>
                  {categoryList.map((cat) => (
                    <MenuItem key={cat?.id} value={cat?.id}>
                      {cat?.name || '-'}
                    </MenuItem>
                  ))}
                </Select>
                {errors.categoryId && <FormHelperText>{errors.categoryId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Name */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="الاسم"
                value={form.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                required
                disabled={submitting}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={form.description}
                onChange={handleChange('description')}
                multiline
                rows={2}
                disabled={submitting}
              />
            </Grid>
          </Grid>

          {/* PRICING */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            التسعير
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="السعر الأساسي (د.ل)"
                type="number"
                value={form.basePrice}
                onChange={handleChange('basePrice')}
                InputProps={{ startAdornment: <InputAdornment position="start">د.ل</InputAdornment> }}
                helperText="سعر مرجعي فقط - لا يُستخدم للحساب النهائي"
                disabled={submitting}
              />
            </Grid>
          </Grid>

          {/* SETTINGS */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            الإعدادات
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="body1">تفعيل الخدمة</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {form.active ? 'نشط' : 'غير نشط'}
                  </Typography>
                </Box>
                <Switch checked={form.active} onChange={handleChange('active')} disabled={submitting} />
              </Box>
            </Grid>
          </Grid>

          {/* ACTIONS */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={handleBack} disabled={submitting}>
              إلغاء
            </Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={submitting}>
              حفظ التعديلات
            </Button>
          </Box>
        </Box>
      </MainCard>
    </Box>
  );
};

export default MedicalServiceEdit;
