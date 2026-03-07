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
    Skeleton
} from '@mui/material';

// icons
import {
    Refresh as RefreshIcon,
    TableChart as ExcelIcon,
    Print as PrintIcon,
    BarChart as SummaryIcon,
    TrendingDown as RejectedIcon
} from '@mui/icons-material';

// project imports
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { providersService, reportsService } from 'services/api';
import { exportToExcel } from 'utils/exportUtils';

/**
 * تقرير كشف حساب المزودين (ملخص مالي)
 * يعرض قائمة بكل المزودين مع إجمالي المبالغ والمرفوضات ونسبة الخصم
 */
const ProviderAccountSummary = () => {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Fetch summary data
    const { data: summaryData, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['provider-account-summary', dateFrom, dateTo],
        queryFn: async () => {
            // Typically this calls an endpoint that returns a list of providers with their totals
            // For now, we'll fetch general stats or a dedicated summary endpoint
            const response = await reportsService.getProviderFinancialPerformance({
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            });
            return response?.data || response || [];
        }
    });

    const formatLYD = (val) => `${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ل`;

    const handleExportExcel = () => {
        exportToExcel(summaryData, `كشف_حساب_المزودين_${new Date().toISOString().split('T')[0]}`, {
            columnLabels: {
                providerName: 'المزود',
                totalRequested: 'إجمالي المطلوب (له)',
                totalRejected: 'المستبعد (عليه)',
                totalApproved: 'الصافي المستحق',
                rejectionRate: 'نسبة الخصم %'
            }
        });
    };

    return (
        <MainCard>
            <ModernPageHeader
                titleKey="كشف حساب المزودين (ملخص مالي)"
                titleIcon={<SummaryIcon />}
                subtitleKey="تقرير إجمالي لمقارنة أداء مقدمي الخدمة والمبالغ المستحقة"
                actions={
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="تحديث">
                            <IconButton onClick={() => refetch()} disabled={isLoading || isFetching}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="تصدير Excel">
                            <IconButton onClick={handleExportExcel} disabled={!summaryData?.length}>
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
                        <Grid size={{ xs: 12, md: 4 }}>
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
                        <Grid size={{ xs: 12, md: 4 }}>
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
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Button fullWidth variant="contained" onClick={() => refetch()} startIcon={<RefreshIcon />}>
                                تحديث البيانات
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Table */}
            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #eee' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>اسم مقدم الخدمة</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>المطلوب (له)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>المستقطع (عليه)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>الصافي المستحق</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>نسبة الخصم %</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton width="60%" /></TableCell>
                                    <TableCell align="right"><Skeleton width="40%" /></TableCell>
                                    <TableCell align="right"><Skeleton width="40%" /></TableCell>
                                    <TableCell align="right"><Skeleton width="40%" /></TableCell>
                                    <TableCell align="right"><Skeleton width="40%" /></TableCell>
                                </TableRow>
                            ))
                        ) : summaryData?.length > 0 ? (
                            summaryData.map((row, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell>{row.providerName}</TableCell>
                                    <TableCell align="right">{formatLYD(row.totalRequested)}</TableCell>
                                    <TableCell align="right" sx={{ color: 'error.main' }}>{formatLYD(row.totalRejected)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                        {formatLYD(row.totalApproved)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                                            <Typography variant="body2" fontWeight="bold">
                                                {((row.totalRejected / row.totalRequested) * 100 || 0).toFixed(1)}%
                                            </Typography>
                                            <RejectedIcon sx={{ fontSize: 14, color: 'error.main', opacity: 0.7 }} />
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="body2" sx={{ py: 3, color: 'text.secondary' }}>
                                        لا توجد بيانات لهذه الفترة
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

export default ProviderAccountSummary;
