import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Skeleton,
  Divider,
  Checkbox,
  ListItemText,
  Paper
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon, Inventory as InventoryIcon, Category as CategoryIcon } from '@mui/icons-material';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { updateMedicalPackage } from 'services/api/medical-packages.service';
import { useMedicalPackageDetails } from 'hooks/useMedicalPackages';
import { getAllMedicalCategories } from 'services/api/medical-categories.service';
import { getAllMedicalServices } from 'services/api/medical-services.service';

/**
 * Medical Package Edit Page - Simplified Version
 *
 * Features:
 * - Select Medical Categories instead of individual services
 * - Categories are linked to services automatically
 * - Simpler UX for managing large service lists
 */
const MedicalPackageEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: pkg, loading: loadingPackage, error: packageError } = useMedicalPackageDetails(id);

  // Fetch all categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['medical-categories-all'],
    queryFn: getAllMedicalCategories,
    staleTime: 5 * 60 * 1000
  });

  // Fetch all services (to map categories to services)
  const { data: allServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['medical-services-all'],
    queryFn: getAllMedicalServices,
    staleTime: 5 * 60 * 1000
  });

  // Form state
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    categoryIds: [], // Selected category IDs
    totalCoverageLimit: '',
    active: true
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Map categories to their services count
  const categoriesWithServiceCount = useMemo(() => {
    return categories.map((cat) => {
      const servicesInCategory = allServices.filter((s) => s.categoryId === cat.id);
      return {
        ...cat,
        servicesCount: servicesInCategory.length
      };
    });
  }, [categories, allServices]);

  // Calculate serviceIds from selected categories
  const selectedServiceIds = useMemo(() => {
    if (form.categoryIds.length === 0) return [];

    const serviceIds = allServices.filter((service) => form.categoryIds.includes(service.categoryId)).map((service) => service.id);

    return [...new Set(serviceIds)];
  }, [form.categoryIds, allServices]);

  // Get selected categories info
  const selectedCategoriesInfo = useMemo(() => {
    return categories.filter((cat) => form.categoryIds.includes(cat.id));
  }, [form.categoryIds, categories]);

  // Populate form from package data - derive categoryIds from services
  useEffect(() => {
    if (pkg && allServices.length > 0) {
      // Get existing service IDs from package
      const existingServiceIds = pkg.services?.map((s) => s.id) || [];

      // Derive category IDs from existing services
      const categoryIdsFromServices = [
        ...new Set(
          allServices
            .filter((s) => existingServiceIds.includes(s.id))
            .map((s) => s.categoryId)
            .filter(Boolean)
        )
      ];

      setForm({
        code: pkg.code || '',
        name: pkg.name || '',
        description: pkg.description || '',
        categoryIds: categoryIdsFromServices,
        totalCoverageLimit: pkg.totalCoverageLimit || '',
        active: pkg.active !== undefined ? pkg.active : true
      });
    }
  }, [pkg, allServices]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      categoryIds: typeof value === 'string' ? value.split(',').map(Number) : value
    }));
  };

  const handleRemoveCategory = (categoryId) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.filter((id) => id !== categoryId)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.code.trim()) newErrors.code = 'الكود مطلوب';
    if (!form.name.trim()) newErrors.name = 'الاسم مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim()
      };

      if (form.description?.trim()) payload.description = form.description.trim();
      // Send serviceIds derived from selected categories
      if (selectedServiceIds.length > 0) payload.serviceIds = selectedServiceIds;
      if (form.totalCoverageLimit) payload.totalCoverageLimit = parseFloat(form.totalCoverageLimit);
      payload.active = form.active;

      await updateMedicalPackage(id, payload);
      navigate('/medical-packages');
    } catch (err) {
      console.error('Failed to update package:', err);
      setApiError(err.response?.data?.message || err.message || 'فشل تحديث الباقة');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigate('/medical-packages');

  const isDataLoading = categoriesLoading || servicesLoading;

  if (loadingPackage || isDataLoading) {
    return (
      <Box>
        <ModernPageHeader
          title="تعديل باقة طبية"
          subtitle="تحميل بيانات الباقة..."
          icon={InventoryIcon}
          breadcrumbs={[{ label: 'الباقات الطبية', path: '/medical-packages' }, { label: 'تعديل' }]}
        />
        <MainCard>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Grid item xs={12} key={i}>
                <Skeleton variant="rectangular" height={56} />
              </Grid>
            ))}
          </Grid>
        </MainCard>
      </Box>
    );
  }

  if (packageError || !pkg) {
    return (
      <Box>
        <ModernPageHeader
          title="خطأ"
          subtitle="فشل تحميل بيانات الباقة"
          icon={InventoryIcon}
          breadcrumbs={[{ label: 'الباقات الطبية', path: '/medical-packages' }, { label: 'تعديل' }]}
        />
        <MainCard>
          <Alert severity="error">
            {packageError?.message || 'لم يتم العثور على الباقة'}
            <Button onClick={() => navigate('/medical-packages')} sx={{ mt: 2 }}>
              العودة إلى القائمة
            </Button>
          </Alert>
        </MainCard>
      </Box>
    );
  }

  return (
    <Box>
      <ModernPageHeader
        title="تعديل باقة طبية"
        subtitle={`تعديل: ${pkg.name || ''}`}
        icon={InventoryIcon}
        breadcrumbs={[{ label: 'الباقات الطبية', path: '/medical-packages' }, { label: 'تعديل' }]}
      />

      <form onSubmit={handleSubmit}>
        {/* Basic Info Card */}
        <MainCard sx={{ mb: 2 }}>
          {apiError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiError(null)}>
              {apiError}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📋 المعلومات الأساسية
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="الكود *"
                value={form.code}
                onChange={handleChange('code')}
                error={!!errors.code}
                helperText={errors.code}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="الاسم *"
                value={form.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="الوصف" value={form.description} onChange={handleChange('description')} />
            </Grid>
          </Grid>
        </MainCard>

        {/* Categories Selection Card */}
        <MainCard sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon color="primary" />
            التصنيفات الطبية المشمولة
            <Chip label={form.categoryIds.length + ' تصنيف'} size="small" color={form.categoryIds.length > 0 ? 'primary' : 'default'} />
            {selectedServiceIds.length > 0 && (
              <Chip label={selectedServiceIds.length + ' خدمة'} size="small" color="success" variant="outlined" />
            )}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            اختر التصنيفات الطبية وسيتم تضمين جميع الخدمات المرتبطة بها تلقائياً في الباقة.
          </Alert>

          {/* Category Selection */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>اختر التصنيفات الطبية</InputLabel>
                <Select
                  multiple
                  value={form.categoryIds}
                  onChange={handleCategoryChange}
                  input={<OutlinedInput label="اختر التصنيفات الطبية" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((catId) => {
                        const cat = categories.find((c) => c.id === catId);
                        return <Chip key={catId} label={cat?.name || catId} size="small" color="primary" />;
                      })}
                    </Box>
                  )}
                >
                  {categoriesWithServiceCount.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Checkbox checked={form.categoryIds.includes(cat.id)} />
                      <ListItemText primary={cat.name} secondary={`${cat.servicesCount} خدمة`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Selected Categories Display */}
          {selectedCategoriesInfo.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                التصنيفات المختارة ({selectedCategoriesInfo.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {selectedCategoriesInfo.map((cat) => {
                  const servicesCount = allServices.filter((s) => s.categoryId === cat.id).length;
                  return (
                    <Chip
                      key={cat.id}
                      label={`${cat.name} (${servicesCount} خدمة)`}
                      onDelete={() => handleRemoveCategory(cat.id)}
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="success.main">
                ✅ إجمالي الخدمات المشمولة: {selectedServiceIds.length} خدمة
              </Typography>
            </Paper>
          ) : (
            <Alert severity="warning" variant="outlined">
              لم يتم اختيار أي تصنيفات. اختر التصنيفات الطبية لتضمين خدماتها في الباقة.
            </Alert>
          )}
        </MainCard>

        {/* Coverage & Status Card */}
        <MainCard>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            💰 حد التغطية والحالة
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="حد التغطية الإجمالي"
                value={form.totalCoverageLimit}
                onChange={handleChange('totalCoverageLimit')}
                inputProps={{ step: 0.01, min: 0 }}
                InputProps={{ endAdornment: <InputAdornment position="end">د.ل</InputAdornment> }}
                helperText="الحد الأقصى للتغطية التأمينية"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Switch checked={form.active} onChange={handleChange('active')} color="success" />}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>{form.active ? 'نشطة' : 'غير نشطة'}</Typography>
                    <Chip label={form.active ? 'مفعّلة' : 'معطّلة'} size="small" color={form.active ? 'success' : 'default'} />
                  </Stack>
                }
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
              {loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </Box>
        </MainCard>
      </form>
    </Box>
  );
};

export default MedicalPackageEdit;
