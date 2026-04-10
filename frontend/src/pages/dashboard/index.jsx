import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Grid,
  Stack,
  Typography,
  Card,
  CardContent,
  Paper,
  Button,
  Chip,
  IconButton,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  alpha
} from '@mui/material';

import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';
import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';

import EmployerFilterSelector from 'components/tba/EmployerFilterSelector';
import { useEmployerFilter } from 'contexts/EmployerFilterContext';
import { useRBAC } from 'api/rbac';
import { useDashboardStats } from 'hooks/useDashboardStats';
import { useClaimsList } from 'hooks/useClaims';
import { getDefaultRouteForRole } from 'utils/roleRoutes';
import useAuth from 'hooks/useAuth';
import menuItem, { filterMenuItemsByRole } from 'menu-items/components';

const navItems = [
  { key: 'overview', label: 'نظرة عامة', icon: DashboardOutlinedIcon },
  { key: 'claims', label: 'مراقبة المطالبات', icon: QueryStatsOutlinedIcon },
  { key: 'provider', label: 'أداء مقدمي الخدمة', icon: LocalHospitalOutlinedIcon },
  { key: 'insights', label: 'تحليلات ذكية', icon: InsightsOutlinedIcon },
  { key: 'control', label: 'التحكم بالنظام', icon: SettingsSuggestOutlinedIcon }
];

const shortcutConfig = {
  overview: {
    title: 'كل اختصارات النظام',
    subtitle: 'تنقل بسرعة إلى أي صفحة متاحة لك ضمن القائمة المصرح بها.',
    matcher: () => true
  },
  claims: {
    title: 'المطالبات والموافقات',
    subtitle: 'راجع المطالبات والدفعات ومسارات الموافقات المسبقة.',
    matcher: (entry) => entry.url.includes('/claims') || entry.url.includes('/pre-approvals') || entry.url.includes('/approvals')
  },
  provider: {
    title: 'عمليات مقدمي الخدمة',
    subtitle: 'افتح صفحات شبكة مقدمي الخدمة والعقود والتسويات.',
    matcher: (entry) => entry.url.includes('/provider') || entry.url.includes('/providers') || entry.url.includes('/provider-contracts') || entry.url.includes('/settlement')
  },
  insights: {
    title: 'تحليلات المستفيدين',
    subtitle: 'وصول سريع للمستفيدين وتقاريرهم وملخصهم المالي.',
    matcher: () => true
  },
  control: {
    title: 'التحكم بالنظام',
    subtitle: 'الوصول إلى الحوكمة والإعدادات والمستخدمين ومكتبة المستندات.',
    matcher: (entry) => entry.url.includes('/settings') || entry.url.includes('/rbac') || entry.url.includes('/documents') || entry.url.includes('/medical-categories')
  }
};

const formatNumberEn = (value) => Number(value || 0).toLocaleString('en-US');

const getClaimStatusLabelAr = (status) => {
  const normalized = String(status || 'SUBMITTED').toUpperCase();
  const labels = {
    SUBMITTED: 'مُرسلة',
    RECEIVED: 'مستلمة',
    UNDER_REVIEW: 'قيد المراجعة',
    MEDICAL_REVIEW: 'مراجعة طبية',
    FINANCIAL_REVIEW: 'مراجعة مالية',
    APPROVED: 'موافق عليها',
    PARTIALLY_APPROVED: 'موافقة جزئية',
    REJECTED: 'مرفوضة',
    PENDING: 'معلقة',
    DRAFT: 'مسودة',
    CANCELLED: 'ملغاة',
    PAID: 'مدفوعة'
  };

  return labels[normalized] || status || 'مُرسلة';
};

const SidebarItem = ({ item, active, onClick }) => {
  const Icon = item.icon;

  return (
    <ListItemButton
      disableRipple
      onClick={onClick}
      sx={{
        borderRadius: 2.5,
        mb: 1,
        px: 1.5,
        minHeight: 44,
        color: active ? '#00353b' : alpha('#ffffff', 0.9),
        bgcolor: active ? '#ffffff' : alpha('#ffffff', 0.08),
        border: '1px solid',
        borderColor: active ? alpha('#ffffff', 0.65) : alpha('#ffffff', 0.15),
        '&:hover': {
          bgcolor: active ? '#ffffff' : alpha('#ffffff', 0.14)
        }
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: 13,
          fontWeight: active ? 800 : 600,
          letterSpacing: 0.2
        }}
      />
      <KeyboardArrowLeftRoundedIcon sx={{ color: 'inherit', opacity: active ? 1 : 0.5 }} />
    </ListItemButton>
  );
};

const MetricCard = ({ title, value, subtitle, icon: Icon, accent, loading = false }) => {
  return (
    <Card
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: alpha('#006064', 0.12),
        boxShadow: '0 18px 40px rgba(0, 96, 100, 0.08)',
        backgroundColor: '#ffffff',
        animation: 'riseIn 520ms ease both'
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={1.1}>
            <Typography sx={{ color: alpha('#002a2e', 0.68), fontWeight: 700, fontSize: 13, letterSpacing: 0.2 }}>
              {title}
            </Typography>
            <Typography sx={{ color: '#002a2e', fontWeight: 900, fontSize: { xs: 28, sm: 34 }, lineHeight: 1 }}>
              {loading ? '...' : value}
            </Typography>
            <Typography sx={{ color: alpha('#002a2e', 0.66), fontSize: 13, fontWeight: 600 }}>
              {subtitle}
            </Typography>
          </Stack>

          <Avatar
            variant="rounded"
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              color: accent,
              bgcolor: alpha(accent, 0.12),
              border: '1px solid',
              borderColor: alpha(accent, 0.3)
            }}
          >
            <Icon />
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedEmployerId } = useEmployerFilter();
  const { isSuperAdmin } = useRBAC();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [activeShortcutKey, setActiveShortcutKey] = useState('overview');
  const [shortcutSearch, setShortcutSearch] = useState('');

  const getCurrentUserRoles = useCallback(() => {
    try {
      const currentUser = user || {};
      const roles = [];

      if (Array.isArray(currentUser?.roles)) {
        roles.push(...currentUser.roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean));
      }

      if (typeof currentUser?.role === 'string' && currentUser.role.trim()) {
        roles.push(currentUser.role.trim());
      }

      return [...new Set(roles.map((role) => role.toUpperCase()))];
    } catch {
      return [];
    }
  }, [user]);

  const userRoles = useMemo(() => getCurrentUserRoles(), [getCurrentUserRoles]);
  const isMedicalReviewer = userRoles.includes('MEDICAL_REVIEWER');
  const isProviderRole = userRoles.includes('PROVIDER_STAFF') || userRoles.includes('PROVIDER');
  const effectiveRole = userRoles[0] || 'SUPER_ADMIN';

  useEffect(() => {
    if (isMedicalReviewer) {
      navigate(getDefaultRouteForRole('MEDICAL_REVIEWER'), { replace: true });
      return;
    }
    if (isProviderRole) {
      navigate(getDefaultRouteForRole('PROVIDER_STAFF'), { replace: true });
    }
  }, [isMedicalReviewer, isProviderRole, navigate]);

  const { summary, loading: summaryLoading, refresh: refreshSummary } = useDashboardStats({
    enabled: !isMedicalReviewer && !isProviderRole,
    silentOnForbidden: true
  });

  const { data: claimsData, refresh: refreshClaims } = useClaimsList({
    page: 0,
    size: 10,
    sortBy: 'createdAt',
    sortDir: 'desc'
  });

  const pendingClaims = summary?.openClaims || 0;
  const activeApprovals = summary?.approvedClaims || 0;
  const providerNetwork = summary?.activeProviders || 0;
  const totalProviders = summary?.totalProviders || 0;
  const totalMembers = summary?.totalMembers || 0;
  const activeContracts = summary?.activeContracts || 0;
  const totalClaims = summary?.totalClaims || 0;

  const approvalRate = useMemo(() => {
    if (!totalClaims) return 0;
    return Math.min(100, Math.round((activeApprovals / totalClaims) * 100));
  }, [activeApprovals, totalClaims]);

  const recentClaims = useMemo(() => {
    if (Array.isArray(claimsData)) return claimsData;
    if (Array.isArray(claimsData?.items)) return claimsData.items;
    if (Array.isArray(claimsData?.content)) return claimsData.content;
    return [];
  }, [claimsData]);

  const handleRefreshAll = useCallback(() => {
    refreshSummary();
    refreshClaims();
  }, [refreshSummary, refreshClaims]);

  const shortcutEntries = useMemo(() => {
    const filteredMenu = filterMenuItemsByRole(menuItem, effectiveRole, user);
    const collected = [];

    const walk = (items, trail = []) => {
      items.forEach((entry) => {
        if (!entry || entry.type === 'divider') return;

        const currentTrail = entry.title || entry.titleEn ? [...trail, entry.title || entry.titleEn] : trail;

        if (entry.type === 'item' && entry.url) {
          collected.push({
            id: entry.id,
            title: entry.title || entry.titleEn,
            subtitle: entry.titleEn || entry.title,
            url: entry.url,
            group: trail[0] || 'عام'
          });
        }

        if (Array.isArray(entry.children) && entry.children.length) {
          walk(entry.children, currentTrail);
        }
      });
    };

    walk(filteredMenu);
    return collected;
  }, [effectiveRole, user]);

  const filteredShortcutEntries = useMemo(() => {
    const config = shortcutConfig[activeShortcutKey] || shortcutConfig.overview;
    const search = shortcutSearch.trim().toLowerCase();
    const safeLower = (value) => String(value || '').toLowerCase();

    const beneficiaryShortcutEntries = [
      {
        id: 'members-list-shortcut',
        title: 'قائمة المستفيدين',
        subtitle: 'عرض بيانات المستفيدين',
        url: '/members',
        group: 'المستفيدون'
      },
      {
        id: 'beneficiaries-report-shortcut',
        title: 'تقرير المستفيدين',
        subtitle: 'مؤشرات وتقارير المستفيدين',
        url: '/reports/beneficiaries',
        group: 'تقارير المستفيدين'
      },
      {
        id: 'beneficiaries-financial-shortcut',
        title: 'الملخص المالي للمستفيدين',
        subtitle: 'سجل الملخصات المالية',
        url: '/members/financial-register',
        group: 'تقارير المستفيدين'
      }
    ];

    const sourceEntries = activeShortcutKey === 'insights' ? beneficiaryShortcutEntries : shortcutEntries;

    return sourceEntries.filter((entry) => {
      if (!config.matcher(entry)) return false;
      if (!search) return true;

      return (
        safeLower(entry.title).includes(search) ||
        safeLower(entry.subtitle).includes(search) ||
        safeLower(entry.url).includes(search) ||
        safeLower(entry.group).includes(search)
      );
    });
  }, [shortcutEntries, activeShortcutKey, shortcutSearch]);

  const handleOpenLauncher = useCallback((key) => {
    setActiveShortcutKey(key);
    setShortcutSearch('');
    setLauncherOpen(true);
  }, []);

  const handleNavigateFromLauncher = useCallback(
    (url) => {
      setLauncherOpen(false);
      navigate(url);
    },
    [navigate]
  );

  const activeShortcut = shortcutConfig[activeShortcutKey] || shortcutConfig.overview;

  return (
    <Box
      sx={{
        direction: 'rtl',
        minHeight: 'calc(100vh - 96px)',
        p: { xs: 1.5, md: 2.5, xl: 3.5 },
        fontFamily: "Manrope, 'Noto Sans Arabic', sans-serif",
        background: `
          radial-gradient(circle at 15% 2%, ${alpha('#006064', 0.12)} 0%, transparent 32%),
          radial-gradient(circle at 96% 0%, ${alpha('#006064', 0.08)} 0%, transparent 28%),
          #f6f9fa
        `
      }}
    >
      <Grid container spacing={{ xs: 1.5, md: 2.5 }}>
        <Grid size={{ xs: 12, lg: 3, xl: 2.6 }}>
          <Paper
            elevation={0}
            sx={{
              position: { lg: 'sticky' },
              top: { lg: 14 },
              borderRadius: 5,
              p: { xs: 2, md: 2.5 },
              background: 'linear-gradient(170deg, #006064 0%, #00747c 62%, #00585d 100%)',
              border: '1px solid',
              borderColor: alpha('#ffffff', 0.2),
              boxShadow: '0 20px 55px rgba(0, 96, 100, 0.32)',
              minHeight: { lg: 'calc(100vh - 130px)' },
              color: '#ffffff',
              overflow: 'hidden'
            }}
          >
            <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    bgcolor: '#FFD54F',
                    color: '#123236',
                    fontWeight: 900
                  }}
                >
                  TBA
                </Avatar>
                <Stack>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.2 }}>WAAD</Typography>
                  <Typography sx={{ fontSize: 12, opacity: 0.86 }}>مركز عمليات التأمين</Typography>
                </Stack>
              </Stack>

              <Divider sx={{ borderColor: alpha('#ffffff', 0.2) }} />

              <List disablePadding>
                {navItems.map((item) => (
                  <SidebarItem
                    key={item.key}
                    item={item}
                    active={activeShortcutKey === item.key}
                    onClick={() => handleOpenLauncher(item.key)}
                  />
                ))}
              </List>

              <Card
                sx={{
                  mt: 'auto',
                  borderRadius: 3,
                  bgcolor: alpha('#ffffff', 0.12),
                  border: '1px solid',
                  borderColor: alpha('#ffffff', 0.3),
                  color: '#ffffff'
                }}
              >
                <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>System Reliability</Typography>
                  <Typography sx={{ fontSize: 12, opacity: 0.92 }}>Uptime 99.98% with secure claim processing and continuous provider sync.</Typography>
                </CardContent>
              </Card>
            </Stack>

            <Box
              sx={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: '50%',
                right: -80,
                top: -80,
                bgcolor: alpha('#ffffff', 0.08),
                animation: 'floatAura 7s ease-in-out infinite'
              }}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 9, xl: 9.4 }}>
          <Stack spacing={{ xs: 1.5, md: 2.5 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 5,
                p: { xs: 2, sm: 3, xl: 3.5 },
                background: `linear-gradient(125deg, #006064 0%, #00767e 56%, #008890 100%)`,
                color: '#ffffff',
                border: '1px solid',
                borderColor: alpha('#ffffff', 0.15),
                boxShadow: '0 24px 60px rgba(0, 96, 100, 0.26)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 7.6 }}>
                  <Typography sx={{ fontSize: { xs: 28, sm: 36, xl: 44 }, fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5 }}>
                    ادارة التأمين الطبي
                  </Typography>
                  <Typography sx={{ mt: 1.5, maxWidth: 650, fontSize: { xs: 14, sm: 15, xl: 17 }, opacity: 0.93 }}>
                    تحكم لحظي بالمطالبات والموافقات وعمليات مقدمي الخدمة عبر لوحة تشغيل طبية مالية موحدة.
                  </Typography>
                  <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 2.25, flexWrap: 'wrap', rowGap: 1 }}>
                    <Button
                      variant="contained"
                      disableElevation
                      onClick={() => navigate('/claims/batches')}
                      sx={{
                        px: 2.4,
                        py: 1,
                        borderRadius: 99,
                        fontWeight: 900,
                        color: '#2e2300',
                        bgcolor: '#FFD54F',
                        '&:hover': { bgcolor: '#ffca2d' }
                      }}
                    >
                      مراجعة المطالبات ذات الأولوية
                    </Button>
                    <Chip label={`نسبة الموافقة ${approvalRate}%`} sx={{ bgcolor: alpha('#ffffff', 0.18), color: '#ffffff', fontWeight: 800 }} />
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4.4 }}>
                  <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} spacing={1.2} alignItems="center">
                    {isSuperAdmin && (
                      <Box
                        sx={{
                          minWidth: { xs: 220, md: 250 },
                          '& .MuiInputBase-root': {
                            borderRadius: 2.5,
                            backgroundColor: alpha('#ffffff', 0.17),
                            color: '#ffffff'
                          }
                        }}
                      >
                        <EmployerFilterSelector size="small" />
                      </Box>
                    )}
                    <IconButton
                      onClick={handleRefreshAll}
                      sx={{
                        bgcolor: alpha('#ffffff', 0.2),
                        color: '#ffffff',
                        border: '1px solid',
                        borderColor: alpha('#ffffff', 0.25),
                        '&:hover': { bgcolor: alpha('#ffffff', 0.3) }
                      }}
                    >
                      <RefreshRoundedIcon />
                    </IconButton>
                  </Stack>
                </Grid>
              </Grid>

              <Box
                sx={{
                  position: 'absolute',
                  right: -70,
                  bottom: -70,
                  width: 230,
                  height: 230,
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: alpha('#ffffff', 0.14),
                  bgcolor: alpha('#ffffff', 0.06)
                }}
              />
            </Paper>

            <Grid container spacing={{ xs: 1.5, md: 2.2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <MetricCard
                  title="المطالبات المعلقة"
                  value={summaryLoading ? '...' : formatNumberEn(pendingClaims)}
                  subtitle="بانتظار المراجعة الطبية والاعتماد المالي"
                  icon={PendingActionsOutlinedIcon}
                  accent="#e68500"
                  loading={summaryLoading}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <MetricCard
                  title="الموافقات النشطة"
                  value={summaryLoading ? '...' : formatNumberEn(activeApprovals)}
                  subtitle="تمت الموافقة ضمن دورة التشغيل الحالية"
                  icon={FactCheckOutlinedIcon}
                  accent="#006064"
                  loading={summaryLoading}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <MetricCard
                  title="شبكة مقدمي الخدمة"
                  value={summaryLoading ? '...' : formatNumberEn(providerNetwork)}
                  subtitle={`نشط ${formatNumberEn(providerNetwork)} من أصل ${formatNumberEn(totalProviders)} مقدم خدمة`}
                  icon={LocalHospitalOutlinedIcon}
                  accent="#008d95"
                  loading={summaryLoading}
                />
              </Grid>
            </Grid>

            <Grid container spacing={{ xs: 1.5, md: 2.2 }}>
              <Grid size={{ xs: 12, xl: 7.2 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    p: { xs: 2, md: 2.5 },
                    border: '1px solid',
                    borderColor: alpha('#006064', 0.12),
                    boxShadow: '0 16px 42px rgba(0, 96, 100, 0.08)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 18, color: '#002a2e' }}>ملخص الشبكة والطاقة التشغيلية</Typography>
                    <Chip label="مباشر" size="small" sx={{ fontWeight: 700, bgcolor: alpha('#00a86b', 0.12), color: '#00774c' }} />
                  </Stack>

                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: alpha('#006064', 0.12), boxShadow: 'none' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha('#006064', 0.12), color: '#006064' }}>
                              <ApartmentOutlinedIcon />
                            </Avatar>
                            <Stack>
                              <Typography sx={{ fontSize: 13, color: alpha('#002a2e', 0.7), fontWeight: 700 }}>العقود النشطة</Typography>
                              <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#002a2e' }}>{formatNumberEn(activeContracts)}</Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: alpha('#006064', 0.12), boxShadow: 'none' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha('#006064', 0.12), color: '#006064' }}>
                              <GroupsOutlinedIcon />
                            </Avatar>
                            <Stack>
                              <Typography sx={{ fontSize: 13, color: alpha('#002a2e', 0.7), fontWeight: 700 }}>المستفيدون المشمولون</Typography>
                              <Typography sx={{ fontSize: 24, fontWeight: 900, color: '#002a2e' }}>{formatNumberEn(totalMembers)}</Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2.2 }}>
                    <Typography sx={{ fontSize: 13, color: alpha('#002a2e', 0.66), fontWeight: 700, mb: 1 }}>معدل إنجاز الموافقات</Typography>
                    <Box
                      sx={{
                        height: 12,
                        borderRadius: 99,
                        bgcolor: alpha('#006064', 0.1),
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${approvalRate}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #006064 0%, #00a3ad 100%)',
                          transition: 'width 520ms ease'
                        }}
                      />
                    </Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                      <Typography sx={{ fontSize: 12, color: alpha('#002a2e', 0.62), fontWeight: 700 }}>المستهدف 95%</Typography>
                      <Typography sx={{ fontSize: 12, color: '#006064', fontWeight: 900 }}>{approvalRate}%</Typography>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, xl: 4.8 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    p: { xs: 2, md: 2.5 },
                    border: '1px solid',
                    borderColor: alpha('#006064', 0.12),
                    boxShadow: '0 16px 42px rgba(0, 96, 100, 0.08)',
                    backgroundColor: '#ffffff',
                    height: '100%'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 18, color: '#002a2e' }}>آخر نشاط للمطالبات</Typography>
                    <AssignmentOutlinedIcon sx={{ color: alpha('#006064', 0.7) }} />
                  </Stack>
                  <Divider sx={{ mb: 1.2 }} />

                  <Stack spacing={0.7}>
                    {recentClaims.length === 0 && (
                      <Typography sx={{ fontSize: 13, color: alpha('#002a2e', 0.58), py: 2 }}>لا توجد مطالبات حديثة ضمن النطاق المحدد.</Typography>
                    )}

                    {recentClaims.slice(0, 6).map((claim) => (
                      <Stack
                        key={claim.id || claim.claimNumber}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          p: 1.15,
                          borderRadius: 2,
                          bgcolor: alpha('#006064', 0.035),
                          border: '1px solid',
                          borderColor: alpha('#006064', 0.09)
                        }}
                      >
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 800, color: '#002a2e' }}>
                            {claim.claimNumber || `مطالبة ${claim.id || '-'}`}
                          </Typography>
                          <Typography noWrap sx={{ fontSize: 12, color: alpha('#002a2e', 0.62), fontWeight: 600 }}>
                            {claim.providerName || claim.memberName || 'بدون مقدم خدمة محدد'}
                          </Typography>
                        </Stack>

                        <Chip
                          size="small"
                          label={getClaimStatusLabelAr(claim.status)}
                          sx={{
                            ml: 1,
                            maxWidth: 120,
                            fontWeight: 800,
                            color: '#005055',
                            bgcolor: alpha('#00838f', 0.13),
                            '& .MuiChip-label': { px: 1.1 }
                          }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Grid>
      </Grid>

      <Dialog
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '1px solid',
            borderColor: alpha('#006064', 0.16)
          }
        }}
      >
        <DialogTitle sx={{ pb: 1.2 }}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <TravelExploreRoundedIcon sx={{ color: '#006064' }} />
            <Box>
              <Typography sx={{ fontWeight: 900, color: '#002a2e' }}>{activeShortcut.title}</Typography>
              <Typography sx={{ fontSize: 12.5, color: alpha('#002a2e', 0.65) }}>{activeShortcut.subtitle}</Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            placeholder="ابحث في صفحات القائمة بالاسم أو المسار"
            value={shortcutSearch}
            onChange={(event) => setShortcutSearch(event.target.value)}
            size="small"
            sx={{ mb: 2 }}
          />

          <Grid container spacing={1.2}>
            {filteredShortcutEntries.length === 0 && (
              <Grid size={12}>
                <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha('#006064', 0.04), border: '1px dashed', borderColor: alpha('#006064', 0.2) }}>
                  <Typography sx={{ fontWeight: 700, color: alpha('#002a2e', 0.7) }}>لا توجد صفحات نشطة تطابق هذا الفلتر.</Typography>
                </Paper>
              </Grid>
            )}

            {filteredShortcutEntries.map((entry) => (
              <Grid key={entry.id} size={{ xs: 12, sm: 6 }}>
                <Paper
                  sx={{
                    p: 1.3,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: alpha('#006064', 0.14),
                    bgcolor: '#ffffff',
                    transition: 'all 160ms ease',
                    '&:hover': {
                      borderColor: alpha('#006064', 0.35),
                      boxShadow: '0 8px 24px rgba(0, 96, 100, 0.12)'
                    }
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, color: '#002a2e', fontSize: 14.2 }} noWrap>
                        {entry.title}
                      </Typography>
                      <Typography sx={{ color: alpha('#002a2e', 0.62), fontSize: 12.2 }} noWrap>
                        {entry.group}
                      </Typography>
                    </Box>

                    <Button
                      onClick={() => handleNavigateFromLauncher(entry.url)}
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        borderRadius: 99,
                        borderColor: alpha('#006064', 0.35),
                        color: '#006064',
                        minWidth: 88,
                        '&:hover': { borderColor: '#006064', bgcolor: alpha('#006064', 0.06) }
                      }}
                    >
                      فتح
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLauncherOpen(false)} variant="text" sx={{ color: alpha('#002a2e', 0.72), fontWeight: 700 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floatAura {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(10px);
          }
        }
      `}</style>
    </Box>
  );
}
