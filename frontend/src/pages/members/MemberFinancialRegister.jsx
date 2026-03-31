import { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  InputAdornment
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import axiosClient from 'utils/axios';
import { openWaadPrintWindow } from 'utils/printLayout';
import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { getFinancialRegister, exportFinancialRegisterExcel } from 'services/api/unified-members.service';

const formatMoney = (value) => `${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;

export default function MemberFinancialRegister() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [employerId, setEmployerId] = useState('');
  const [employers, setEmployers] = useState([]);

  const fetchEmployers = async () => {
    try {
      const response = await axiosClient.get('/employers/selectors');
      setEmployers(response.data?.data || []);
    } catch {
      setEmployers([]);
    }
  };

  const fetchRegister = async () => {
    setLoading(true);
    try {
      const response = await getFinancialRegister({
        page,
        size: rowsPerPage,
        sort: 'fullName',
        direction: 'ASC',
        employerId: employerId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search || undefined
      });

      const pageData = response?.data || response;
      setRows(pageData?.content || []);
      setTotalCount(pageData?.totalElements || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployers();
  }, []);

  useEffect(() => {
    fetchRegister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, employerId, fromDate, toDate, search]);

  const handleExport = async () => {
    const blob = await exportFinancialRegisterExcel({
      employerId: employerId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: search || undefined
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `beneficiaries_financial_register_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const handlePrint = () => {
    const safeRows = Array.isArray(rows) ? rows : [];

    const tableRows = safeRows
      .map((row, index) => `
        <tr>
          <td>${page * rowsPerPage + index + 1}</td>
          <td>${row.fullName || '-'}</td>
          <td>${row.cardNumber || '-'}</td>
          <td>${row.employerName || '-'}</td>
          <td class="mono">${formatMoney(row.annualLimit)}</td>
          <td class="mono">${formatMoney(row.usedAmount)}</td>
          <td class="mono">${formatMoney(row.remainingAmount)}</td>
        </tr>
      `)
      .join('');

    const activeFilters = [
      employerId ? `جهة العمل: ${employers.find((e) => String(e.id) === String(employerId))?.label || employerId}` : null,
      fromDate ? `من: ${fromDate}` : null,
      toDate ? `إلى: ${toDate}` : null,
      search ? `بحث: ${search}` : null
    ]
      .filter(Boolean)
      .join(' | ');

    openWaadPrintWindow({
      title: 'الملخص المالي للمستفيدين',
      subtitle: `عدد السجلات: ${totalCount}`,
      verificationMeta: {
        docCode: `FIN-REG-${Date.now()}`,
        providerCode: 'BENEFICIARIES',
        qrValue: JSON.stringify({
          title: 'members-financial-register',
          rows: safeRows.length,
          printedAt: new Date().toISOString()
        }),
        qrSize: 170
      },
      contentHtml: `
        <style>
          .financial-register-report { direction: rtl; }
          .financial-register-report .meta { margin-bottom: 12px; color: #4b5563; font-size: 12px; }
          .financial-register-report table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .financial-register-report th, .financial-register-report td { border: 1px solid #e5e7eb; padding: 8px; text-align: right; }
          .financial-register-report th { background: #f3f8f6; font-weight: 700; }
          .financial-register-report tr:nth-child(even) { background: #fafafa; }
          .financial-register-report .mono { direction: ltr; unicode-bidi: plaintext; font-family: Consolas, monospace; white-space: nowrap; }
        </style>
        <div class="financial-register-report">
          <div class="meta">${activeFilters || 'الفلاتر: الكل'}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>رقم البطاقة</th>
                <th>جهة العمل</th>
                <th>الحد السنوي</th>
                <th>المستخدم</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || '<tr><td colspan="7" style="text-align:center">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      `
    });
  };

  return (
    <Box sx={{ p: 1 }}>
      <ModernPageHeader
        title="سجل الملخص المالي للمستفيدين"
        subtitle="الاسم، البطاقة، الحد السنوي، المستخدم، والمتبقي"
        icon={<AccountBalanceWalletIcon />}
        breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'المستفيدين', href: '/members' }, { label: 'السجل المالي' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="contained" color="primary" startIcon={<PrintIcon />} onClick={handlePrint}>
              طباعة
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
              تصدير إكسل
            </Button>
            <IconButton onClick={fetchRegister} color="primary" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        }
      />

      <MainCard sx={{ mt: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="بحث بالاسم أو رقم البطاقة"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearch('');
                      setPage(0);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          <TextField
            select
            size="small"
            label="جهة العمل"
            value={employerId}
            onChange={(e) => {
              setEmployerId(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {employers.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            type="date"
            label="من تاريخ"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            type="date"
            label="إلى تاريخ"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#E8F5F1' }}>
                <TableCell align="center">#</TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell>رقم البطاقة</TableCell>
                <TableCell>جهة العمل</TableCell>
                <TableCell align="right">الحد السنوي</TableCell>
                <TableCell align="right">المستخدم</TableCell>
                <TableCell align="right">المتبقي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    لا توجد بيانات
                  </TableCell>
                </TableRow>
              )}

              {rows.map((row, index) => (
                <TableRow key={row.memberId || `${row.cardNumber}-${index}`} hover>
                  <TableCell align="center">{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{row.fullName || '-'}</TableCell>
                  <TableCell>{row.cardNumber || '-'}</TableCell>
                  <TableCell>{row.employerName || '-'}</TableCell>
                  <TableCell align="right">{formatMoney(row.annualLimit)}</TableCell>
                  <TableCell align="right">{formatMoney(row.usedAmount)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={formatMoney(row.remainingAmount)}
                      color={Number(row.remainingAmount || 0) > 0 ? 'success' : 'error'}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="صفوف لكل صفحة"
        />
      </MainCard>
    </Box>
  );
}
