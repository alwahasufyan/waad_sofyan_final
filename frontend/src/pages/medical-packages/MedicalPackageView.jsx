import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  Typography,
  Chip,
  Stack,
  Alert,
  Skeleton,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { useMedicalPackageDetails } from 'hooks/useMedicalPackages';

/**
 * Medical Package View Page
 * Displays read-only details of a medical package
 */
const MedicalPackageView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: pkg, loading, error } = useMedicalPackageDetails(id);

  const handleEdit = () => {
    navigate(`/medical-packages/edit/${id}`);
  };

  const handleBack = () => {
    navigate('/medical-packages');
  };

  const breadcrumbs = [{ title: 'الباقات الطبية', path: '/medical-packages' }, { title: 'تفاصيل الباقة' }];

  // Loading skeleton
  if (loading) {
    return (
      <>
        <ModernPageHeader title="تفاصيل الباقة" subtitle="تحميل البيانات..." icon={InventoryIcon} breadcrumbs={breadcrumbs} />
        <MainCard>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} md={6} key={i}>
                <Skeleton variant="rectangular" height={60} />
              </Grid>
            ))}
          </Grid>
        </MainCard>
      </>
    );
  }

  // Error state
  if (error || !pkg) {
    return (
      <>
        <ModernPageHeader title="خطأ" subtitle="فشل تحميل بيانات الباقة" icon={InventoryIcon} breadcrumbs={breadcrumbs} />
        <MainCard>
          <Alert severity="error">
            {error?.message || 'لم يتم العثور على الباقة'}
            <Button onClick={handleBack} sx={{ mt: 2 }}>
              العودة إلى القائمة
            </Button>
          </Alert>
        </MainCard>
      </>
    );
  }

  return (
    <>
      <ModernPageHeader
        title="تفاصيل الباقة"
        subtitle={pkg.name}
        icon={InventoryIcon}
        breadcrumbs={breadcrumbs}
        actions={
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              رجوع
            </Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
              تعديل
            </Button>
          </Stack>
        }
      />

      <MainCard>
        <Grid container spacing={3}>
          {/* Basic Information Section */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              المعلومات الأساسية
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                الكود
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {pkg.code || '-'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                الاسم
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {pkg.name || '-'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                الوصف
              </Typography>
              <Typography variant="body1">{pkg.description || '-'}</Typography>
            </Paper>
          </Grid>

          {/* Pricing & Validity Section */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
              السعر والصلاحية
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                السعر
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {pkg.priceLyd ? `${pkg.priceLyd.toFixed(2)} LYD` : '-'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                صلاحية الباقة
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {pkg.validityDays ? `${pkg.validityDays} يوم` : '-'}
              </Typography>
            </Paper>
          </Grid>

          {/* Services Section */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
              الخدمات المشمولة
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12}>
            {Array.isArray(pkg.services) && pkg.services.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الكود</TableCell>
                      <TableCell>الاسم</TableCell>
                      <TableCell align="center">التصنيف</TableCell>
                      <TableCell align="right">السعر</TableCell>
                      <TableCell align="center">يتطلب موافقة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pkg.services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>{service.code}</TableCell>
                        <TableCell>{service.name || '-'}</TableCell>
                        <TableCell align="center">{service.category?.name || '-'}</TableCell>
                        <TableCell align="right">{service.priceLyd ? `${service.priceLyd.toFixed(2)}` : '-'}</TableCell>
                        <TableCell align="center">
                          {service.requiresApproval ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <CancelIcon color="disabled" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">لا توجد خدمات مشمولة في هذه الباقة</Alert>
            )}
          </Grid>

          {/* Status Section */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
              الحالة
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                حالة الباقة
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip label={pkg.active ? 'نشط' : 'غير نشط'} color={pkg.active ? 'success' : 'default'} />
              </Box>
            </Paper>
          </Grid>

          {/* System Metadata Section */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
              معلومات النظام
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                تاريخ الإنشاء
              </Typography>
              <Typography variant="body1">{pkg.createdAt ? new Date(pkg.createdAt).toLocaleString('en-US') : '-'}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                تاريخ آخر تحديث
              </Typography>
              <Typography variant="body1">{pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleString('en-US') : '-'}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                أنشئ بواسطة
              </Typography>
              <Typography variant="body1">{pkg.createdBy || '-'}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                آخر تحديث بواسطة
              </Typography>
              <Typography variant="body1">{pkg.updatedBy || '-'}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </MainCard>
    </>
  );
};

export default MedicalPackageView;
