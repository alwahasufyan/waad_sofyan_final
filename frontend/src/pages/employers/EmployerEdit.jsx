import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, FormControlLabel, Grid, Stack, Switch, TextField, Divider, CircularProgress, Alert } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Edit as EditIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { useEmployerDetails } from 'hooks/useEmployers';
import { updateEmployer } from 'services/api/employers.service';

const LABELS = {
  list: 'الشركاء',
  edit: 'تعديل شريك',
  back: 'رجوع',
  backToList: 'رجوع إلى القائمة',
  code: 'الرمز',
  codePlaceholder: 'أدخل الرمز',
  name: 'اسم الشريك',
  namePlaceholder: 'أدخل اسم الشريك (عربي أو إنجليزي)',
  active: 'نشط',
  cancel: 'إلغاء',
  save: 'حفظ',
  saving: 'جار الحفظ...',
  required: 'مطلوب',
  fixErrors: 'الرجاء تصحيح الأخطاء',
  updatedSuccess: 'تم تحديث الشريك بنجاح',
  saveError: 'فشل في تحديث الشريك',
  notFound: 'لم يتم العثور على الشريك',
  codeWarning: 'تغيير الرمز غير مستحسن - الرمز تم توليده تلقائياً'
};

const EmployerEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: employerData, loading: loadingEmployer, error: fetchError } = useEmployerDetails(id);
  const [employer, setEmployer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (employerData) {
      setEmployer(employerData);
    }
  }, [employerData]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setEmployer((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    if (!employer) return false;
    const newErrors = {};
    if (!employer.code?.trim()) {
      newErrors.code = LABELS.required;
    }
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
      await updateEmployer(id, employer);
      enqueueSnackbar(LABELS.updatedSuccess, { variant: 'success' });
      navigate('/employers');
    } catch (err) {
      console.error('Failed to update employer:', err);
      enqueueSnackbar(LABELS.saveError, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingEmployer) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError || !employer) {
    return (
      <>
        <ModernPageHeader
          title={LABELS.edit}
          icon={EditIcon}
          breadcrumbs={[
            { label: LABELS.list, path: '/employers' },
            { label: LABELS.edit, path: `/employers/edit/${id}` }
          ]}
        />
        <MainCard>
          <Alert severity="error">{LABELS.notFound}</Alert>
          <Box sx={{ mt: 2 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/employers')} variant="outlined">
              {LABELS.backToList}
            </Button>
          </Box>
        </MainCard>
      </>
    );
  }

  return (
    <>
      <ModernPageHeader
        title={LABELS.edit}
        subtitle={employer.name || employer.code}
        icon={EditIcon}
        breadcrumbs={[
          { label: LABELS.list, path: '/employers' },
          { label: LABELS.edit, path: `/employers/edit/${id}` }
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
                value={employer.name || ''}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                placeholder={LABELS.namePlaceholder}
                autoFocus
              />
            </Grid>

            {/* Code */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                disabled
                label={LABELS.code}
                value={employer.code || ''}
                error={!!errors.code}
                helperText={errors.code || LABELS.codeWarning}
                placeholder={LABELS.codePlaceholder}
              />
            </Grid>

            {/* Active Status */}
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={<Switch checked={employer.active || false} onChange={handleChange('active')} color="primary" />}
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

export default EmployerEdit;
