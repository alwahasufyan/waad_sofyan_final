import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';
import { Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import UpdateIcon from '@mui/icons-material/Update';

import ClaimStatusChip from './ClaimStatusChip';
import { UnifiedMedicalTable } from 'components/common';

/**
 * Format currency in LYD
 */
const formatCurrency = (amount) => {
  if (amount == null) return '—';
  return (
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' د.ل'
  );
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

/**
 * Safe string renderer with fallback
 */
const safeString = (value) => {
  if (value == null || value === '') return '—';
  return String(value);
};

/**
 * Table columns configuration
 * All columns are null-safe with fallback rendering
 */
const COLUMNS = [
  {
    id: 'id',
    label: 'رقم المطالبة',
    minWidth: 120,
    align: 'center',
    format: safeString,
    sortable: true,
    icon: <ReceiptLongIcon fontSize="small" />
  },
  {
    id: 'memberName',
    label: 'اسم المؤمن عليه',
    minWidth: 180,
    format: safeString,
    sortable: true,
    icon: <PersonIcon fontSize="small" />
  },
  {
    id: 'employerName',
    label: 'الشريك',
    minWidth: 170,
    format: safeString,
    sortable: true,
    icon: <BusinessIcon fontSize="small" />
  },
  {
    id: 'providerName',
    label: 'مقدم الخدمة',
    minWidth: 170,
    format: safeString,
    sortable: true,
    icon: <LocalHospitalIcon fontSize="small" />
  },
  { id: 'status', label: 'الحالة', minWidth: 130, align: 'center', sortable: true },
  {
    id: 'requestedAmount',
    label: 'المبلغ المطلوب',
    minWidth: 140,
    align: 'right',
    format: formatCurrency,
    sortable: true,
    icon: <AttachMoneyIcon fontSize="small" />
  },
  {
    id: 'approvedAmount',
    label: 'المبلغ المعتمد',
    minWidth: 140,
    align: 'right',
    format: formatCurrency,
    sortable: true,
    icon: <AttachMoneyIcon fontSize="small" />
  },
  {
    id: 'visitDate',
    label: 'تاريخ الزيارة',
    minWidth: 130,
    align: 'center',
    format: formatDate,
    sortable: true,
    icon: <EventIcon fontSize="small" />
  },
  {
    id: 'updatedAt',
    label: 'آخر تحديث',
    minWidth: 130,
    align: 'center',
    format: formatDate,
    sortable: true,
    icon: <UpdateIcon fontSize="small" />
  }
];

/**
 * ClaimsTable Component
 *
 * MUI Table for displaying claims with sticky header
 *
 * @param {Array} claims - Claims data
 * @param {boolean} loading - Loading state
 * @param {number} totalCount - Total filtered count
 * @param {number} page - Current page
 * @param {number} rowsPerPage - Rows per page
 * @param {Function} onPageChange - Page change handler
 * @param {Function} onRowsPerPageChange - Rows per page change handler
 */
const ClaimsTable = ({ claims, loading, totalCount, page, rowsPerPage, onPageChange, onRowsPerPageChange }) => {
  // Sorting state
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('desc');

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const descendingComparator = (a, b, orderKey) => {
    const aVal = a[orderKey];
    const bVal = b[orderKey];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return bVal - aVal;
    }

    return String(bVal).localeCompare(String(aVal), 'ar');
  };

  const getComparator = (orderKey, orderDirection) => {
    return orderDirection === 'desc' ? (a, b) => descendingComparator(a, b, orderKey) : (a, b) => -descendingComparator(a, b, orderKey);
  };

  const sortedClaims = useMemo(() => {
    return [...claims].sort(getComparator(orderBy, order));
  }, [claims, orderBy, order]);

  const renderCellValue = (claim, column) => {
    const value = claim[column.id];
    if (column.id === 'status') {
      return <ClaimStatusChip status={value} />;
    }
    if (column.format) {
      return column.format(value);
    }
    return value ?? '—';
  };

  const paginatedClaims = sortedClaims.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <UnifiedMedicalTable
      columns={COLUMNS}
      rows={paginatedClaims}
      loading={loading}
      totalCount={totalCount}
      page={page}
      rowsPerPage={rowsPerPage}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={[10, 25, 50, 100]}
      sortBy={orderBy}
      sortDirection={order}
      onSort={handleSort}
      renderCell={renderCellValue}
      getRowKey={(claim) => claim.id}
      emptyMessage="لا توجد مطالبات مطابقة للفلاتر المحددة"
      emptyIcon={DescriptionIcon}
      loadingMessage="جارِ تحميل المطالبات..."
      size="small"
    />
  );
};

ClaimsTable.propTypes = {
  claims: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  totalCount: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRowsPerPageChange: PropTypes.func.isRequired
};

export default ClaimsTable;
