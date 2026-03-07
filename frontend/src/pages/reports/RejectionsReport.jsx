import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
    TextField,
    Button,
    IconButton,
    Tooltip,
    Alert,
    Skeleton,
    Chip
} from '@mui/material';

// icons
import {
    Refresh as RefreshIcon,
    TableChart as ExcelIcon,
    Print as PrintIcon,
    ErrorOutline as ErrorIcon,
    LocalHospital as ProviderIcon
} from '@mui/icons-material';

// project imports
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { reportsService, providersService } from 'services/api';
import { exportToExcel } from 'utils/exportUtils';

/**
 * تقرير المرفوضات التفصيلي
 * يركز فقط على الخدمات التي تم رفضها مع ذكر الأسباب والمبالغ
 */
const RejectionsReport = () => {
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Fetch providers for filter
    const { data: providers } = useQuery({
        queryKey: ['providers-selector'],
        queryFn: async () => {
            const response = await providersService.getSelector();
            return response?.data || response || [];
        }
    });

    // Fetch rejections
    const { data: rejectionsData, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['rejections-detailed', selectedProviderId, dateFrom, dateTo],
        queryFn: async () => {
            const response = await reportsService.getDetailedRejections({
                providerId: selectedProviderId || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            });
            return response?.data || response || [];
        }
    });

    const formatLYD = (val) => `${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ل`;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

    const handleExportExcel = () => {
        exportToExcel(rejectionsData, `تقرير_المرفوضات_${new Date().toISOString().split('T')[0]}`, {
            columnLabels: {
                claimNumber: 'رقم المطالبة',
                patientName: 'اسم المريض',
                providerName: 'المزود',
                serviceName: 'الخدمة',
                rejectedAmount: 'المبلغ المرفوض',
                rejectionReason: 'سبب الرفض'
            }
        });
    };

    return (
        <MainCard>
            <ModernPageHeader
                titleKey="تقرير المرفوضات التفصيلي"
                titleIcon={<ErrorIcon color="error" />}
                subtitleKey="قائمة تفصيلية بجميع الخدمات المرفوضة مع أسباب الرفض"
                actions={
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="تحديث">
                            <IconButton onClick={() => refetch()} disabled={isLoading || isFetching}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="تصدير Excel">
                            <IconButton onClick={handleExportExcel} disabled={!rejectionsData?.length}>
                                <ExcelIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                }
            />

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="مقدم الخدمة"
                                value={selectedProviderId}
                                onChange={(e) => setSelectedProviderId(e.target.value)}
                                SelectProps={{ native: true }}
                            >
                                <option value="">جميع مقدمي الخدمة</option>
                                {providers?.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="من تاريخ"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="إلى تاريخ"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button fullWidth variant="contained" color="error" onClick={() => refetch()} startIcon={<RefreshIcon />}>
                                بحث المرفوضات
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Table */}
            <TableContainer component={Paper} sx={{ border: '1px solid #ffccbc' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#fff3e0' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>رقم المطالبة</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>المريض</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>المزود</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>الخدمة المرفوضة</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>المبلغ المرفوض</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>سبب الرفض</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                    <TableCell><Skeleton /></TableCell>
                                </TableRow>
                            ))
                        ) : rejectionsData?.length > 0 ? (
                            rejectionsData.map((row, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell fontWeight="bold">{row.claimNumber}</TableCell>
                                    <TableCell>{row.patientName || row.patientNameArabic}</TableCell>
                                    <TableCell>{row.providerName}</TableCell>
                                    <TableCell>{row.serviceName || row.serviceNameArabic}</TableCell>
                                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>{formatLYD(row.rejectedAmount)}</TableCell>
                                    <TableCell>
                                        <Chip label={row.rejectionReason} size="small" variant="outlined" color="error" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" sx={{ py: 3, color: 'text.secondary' }}>
                                        لا توجد مرفوضات مسجلة لهذه الفترة
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </MainCard>
    );
};

export default RejectionsReport;
