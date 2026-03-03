import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, FormControlLabel, Grid, Stack, Switch, TextField, Divider } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Business as BusinessIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { createEmployer } from 'services/api/employers.service';

// Static Arabic labels
const LABELS = {
  list: 'الشركاء',
  add: 'إضافة شريك',
  back: 'رجوع',
  code: 'الرمز (اختياري - يتم التوليد تلقائياً)',
  codePlaceholder: 'اترك فارغاً للتوليد التلقائي',
  name: 'اسم الشريك',
  namePlaceholder: 'أدخل اسم الشريك (عربي أو إنجليزي)',
  active: 'نشط',
  cancel: 'إلغاء',
  save: 'حفظ',
  saving: 'جار الحفظ...',
  required: 'مطلوب',
  fixErrors: 'الرجاء تصحيح الأخطاء',
  createdSuccess: 'تم إنشاء الشريك بنجاح',
  saveError: 'فشل في حفظ الشريك',
  autoCode: 'سيتم توليد الرمز تلقائياً'
};

// Tip message for auto-generated code
const CODE_HELPER_TEXT = 'يمكنك ترك هذا الحقل فارغاً ليتم توليد رمز تلقائي بسيط (مثل: EMP-01, EMP-02, ...)';

const emptyEmployer = {
  code: '',
  name: '',
  active: true
};

const EmployerCreate = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [employer, setEmployer] = useState(emptyEmployer);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setEmployer((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    // code is now optional - will be auto-generated if empty
    if (!employer.name?.trim()) {
      newErrors.name = LABELS.required;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      enqueueSnackbar(LABELS.fixErrors, { variant: 'warning' });
      return;
    }

    try {
      setSaving(true);
      await createEmployer(employer);
      enqueueSnackbar(LABELS.createdSuccess, { variant: 'success' });
      navigate('/employers');
    } catch (err) {
      console.error('Failed to create employer:', err);
      enqueueSnackbar(LABELS.saveError, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModernPageHeader
        title={LABELS.add}
        icon={BusinessIcon}
        breadcrumbs={[
          { label: LABELS.list, path: '/employers' },
          { label: LABELS.add, path: '/employers/create' }
        ]}
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/employers')} variant="outlined">
            {LABELS.back}
          </Button>
        }
      />

      <MainCard>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2.5}>
            {/* Name - Primary Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label={LABELS.name}
                value={employer.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                placeholder={LABELS.namePlaceholder}
                autoFocus
              />
            </Grid>

            {/* Code - Optional */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label={LABELS.code}
                value={employer.code}
                onChange={handleChange('code')}
                error={!!errors.code}
                helperText={errors.code || CODE_HELPER_TEXT}
                placeholder={LABELS.codePlaceholder}
              />
            </Grid>

            {/* Active Status */}
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={<Switch checked={employer.active} onChange={handleChange('active')} color="primary" />}
                label={LABELS.active}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>

          {/* Form Actions */}
          <Divider sx={{ my: 3 }} />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => navigate('/employers')} disabled={saving}>
              {LABELS.cancel}
            </Button>
            
              <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
                {saving ? LABELS.saving : LABELS.save}
              </Button>
              
          </Stack>
        </Box>
      </MainCard>
    </>
  );
};

export default EmployerCreate;
