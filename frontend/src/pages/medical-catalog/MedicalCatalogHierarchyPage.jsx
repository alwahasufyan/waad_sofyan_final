/**
 * Medical Catalog Hierarchy Page
 *
 * Displays the 3-level taxonomy tree: Category → Specialty → Service
 * Uses Accordion for collapsible navigation.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CategoryIcon from '@mui/icons-material/Category';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';

import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import { getCatalogHierarchy } from 'services/api/medical-catalog.service';

const QUERY_KEY = 'catalog-hierarchy';

const MedicalCatalogHierarchyPage = () => {
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState(false);

  const { data: tree = [], isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: getCatalogHierarchy,
    staleTime: 5 * 60 * 1000
  });

  // ── Filter tree by search term ────────────────────────────────────────────

  const filteredTree = search.trim()
    ? tree
        .map((cat) => {
          const q = search.trim().toLowerCase();
          const catMatch = (cat.nameAr || '').toLowerCase().includes(q)
            || (cat.code || '').toLowerCase().includes(q);

          const filteredSpecialties = (cat.specialties || [])
            .map((sp) => {
              const spMatch = (sp.nameAr || '').toLowerCase().includes(q)
                || (sp.code || '').toLowerCase().includes(q);

              const filteredServices = (sp.services || []).filter(
                (svc) => (svc.nameAr || '').toLowerCase().includes(q)
                  || (svc.code || '').toLowerCase().includes(q)
              );

              if (spMatch || filteredServices.length) {
                return { ...sp, services: spMatch ? sp.services : filteredServices };
              }
              return null;
            })
            .filter(Boolean);

          if (catMatch || filteredSpecialties.length) {
            return { ...cat, specialties: catMatch ? cat.specialties : filteredSpecialties };
          }
          return null;
        })
        .filter(Boolean)
    : tree;

  // ── Summary counts ────────────────────────────────────────────────────────

  const totalSpecialties = tree.reduce((acc, c) => acc + (c.specialtyCount || 0), 0);
  const totalServices    = tree.reduce((acc, c) => acc + (c.serviceCount    || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <UnifiedPageHeader
        title="شجرة الكتالوج الطبي"
        subtitle="عرض هرمي: تصنيف → تخصص → خدمة"
        icon={CategoryIcon}
        breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الكتالوج الطبي' }]}
        showAddButton={false}
      />

      {/* Summary bar */}
      <MainCard sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Chip icon={<CategoryIcon />}       label={`${tree.length} تصنيف`}        color="primary" variant="outlined" />
          <Chip icon={<LocalHospitalIcon />}   label={`${totalSpecialties} تخصص`}     color="info"    variant="outlined" />
          <Chip icon={<MedicalServicesIcon />} label={`${totalServices} خدمة`}        color="success" variant="outlined" />

          <Box sx={{ flexGrow: 1 }} />

          <TextField
            size="small"
            placeholder="بحث في الكتالوج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 250 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <Button variant="outlined" startIcon={<RefreshIcon />} size="small" onClick={() => refetch()} disabled={isLoading}>
            تحديث
          </Button>
        </Stack>
      </MainCard>

      {/* Loading */}
      {isLoading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Tree */}
      {!isLoading && (
        <Stack spacing={1}>
          {filteredTree.length === 0 && (
            <MainCard>
              <Typography align="center" color="text.secondary" py={3}>
                {search ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد بيانات في الكتالوج'}
              </Typography>
            </MainCard>
          )}

          {filteredTree.map((category) => (
            <Accordion
              key={category.id}
              expanded={expandedCat === category.id}
              onChange={(_, isExp) => setExpandedCat(isExp ? category.id : false)}
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                  <CategoryIcon color="primary" />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {category.nameAr || category.nameEn}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.code}
                      {category.nameEn && ` · ${category.nameEn}`}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label={`${category.specialtyCount} تخصص`} size="small" color="info"    variant="outlined" />
                    <Chip label={`${category.serviceCount} خدمة`}    size="small" color="success" variant="outlined" />
                  </Stack>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0 }}>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {(category.specialties || []).map((specialty) => (
                    <Grid key={specialty.id} size={12}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        {/* Specialty header */}
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <LocalHospitalIcon fontSize="small" color="info" />
                          <Typography variant="subtitle2" fontWeight="bold">
                            {specialty.nameAr || specialty.nameEn}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({specialty.code})
                          </Typography>
                          {specialty.nameEn && (
                            <Typography variant="caption" color="text.secondary">
                              · {specialty.nameEn}
                            </Typography>
                          )}
                          <Chip label={`${specialty.serviceCount} خدمة`} size="small" variant="outlined" color="success" />
                        </Stack>

                        {/* Service table */}
                        {(specialty.services || []).length > 0 && (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell align="right" sx={{ fontWeight: 'bold', width: 140 }}>الرمز</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>الاسم بالعربية</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>الاسم بالإنجليزية</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', width: 90 }}>الحالة</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(specialty.services || []).map((svc) => (
                                <TableRow key={svc.id} hover>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontFamily="monospace">{svc.code}</Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">{svc.nameAr || '-'}</Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" color="text.secondary">{svc.nameEn || '-'}</Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={svc.status === 'ACTIVE' ? 'نشط' : svc.status || 'نشط'}
                                      size="small"
                                      color={svc.status === 'ARCHIVED' ? 'default' : 'success'}
                                      variant="light"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {(specialty.services || []).length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ pl: 3 }}>
                            لا توجد خدمات مرتبطة بهذا التخصص
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                  {(category.specialties || []).length === 0 && (
                    <Grid size={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                        لا توجد تخصصات مرتبطة بهذا التصنيف
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default MedicalCatalogHierarchyPage;
