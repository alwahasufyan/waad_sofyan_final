import React from 'react';
import {
    Box, Paper, Stack, Typography, Button, Divider, CircularProgress,
    IconButton, Tooltip, Pagination, alpha
} from '@mui/material';
import {
    History as HistoryIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    DeleteForever as DeleteForeverIcon,
    RestoreFromTrash as RestoreFromTrashIcon,
    Receipt as ReceiptIcon,
    Close as CloseIcon
} from '@mui/icons-material';

export const BatchHistorySidebar = ({
    loadingBatch,
    batchContent,
    editingClaimId,
    onSwitchClaim,
    handleDeleteClaim,
    deletedContent,
    loadingDeleted,
    onRestoreClaim,
    onHardDeleteClaim,
    batchData,
    deletedData,
    page,
    setPage,
    deletedPage,
    setDeletedPage,
    monthLabel,
    year,
    theme,
    navigate,
    detailUrl,
    currentBatch,
    isBatchOpen,
    showDeletedLog,
    setShowDeletedLog,
    readOnly = false,
    t,
    onClose,
    containerSx
}) => {
    const isFinanciallySettled = (claim) => (
        claim?.status === 'SETTLED' ||
        Boolean(claim?.settledAt) ||
        Boolean(claim?.paymentReference)
    );

    const isPartiallyRefused = (claim) => (
        claim?.status !== 'REJECTED' && Number(claim?.refusedAmount || 0) > 0
    );

    return (
        <Box sx={{ width: '17.5rem', flexShrink: 0, display: 'flex', flexDirection: 'column', ...containerSx }}>
            <Paper variant="outlined" sx={{
                flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                borderRadius: '0.75rem', p: '0.75rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: '0.75rem' }}>
                    <HistoryIcon sx={{ fontSize: '1.0rem', color: 'text.secondary' }} />
                    <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.9rem', flex: 1 }}>
                        {currentBatch ? `الدفعة: ${currentBatch.batchCode}` : t('claimEntry.batchHistory')}
                    </Typography>
                    {onClose && (
                        <Tooltip title="إخفاء السجل">
                            <IconButton size="small" onClick={onClose}>
                                <CloseIcon sx={{ fontSize: '0.95rem' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {/* FIX: Disable New button if batch is not open (closed or expired) */}
                    <Tooltip title={!isBatchOpen ? 'الدفعة مغلقة — لا يمكن إضافة مطالبات جديدة' : ''}>
                        <span>
                            <Button size="small" variant="contained" color="primary" startIcon={<AddIcon sx={{ fontSize: '0.8125rem' }} />}
                                onClick={() => onSwitchClaim(null)}
                                disabled={!isBatchOpen || readOnly}
                                sx={{ height: '1.5rem', fontSize: '0.75rem', fontWeight: 500, borderRadius: '0.075rem' }}>
                                جديد
                            </Button>
                        </span>
                    </Tooltip>
                    <Button
                        size="small"
                        variant={showDeletedLog ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={() => setShowDeletedLog(!showDeletedLog)}
                        sx={{ height: '1.5rem', fontSize: '0.75rem', fontWeight: 500, borderRadius: '0.075rem' }}
                    >
                        {showDeletedLog ? 'الدفعة الحالية' : 'سجل المحذوفات'}
                    </Button>
                </Stack>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem', mb: 1, display: 'block' }}>
                    {showDeletedLog
                        ? `محذوفات ${monthLabel} ${year} — ${deletedData?.totalElements || deletedData?.data?.totalElements || 0} مطالبة`
                        : (currentBatch ? `${currentBatch.monthLabel} ${currentBatch.batchYear} — ${currentBatch.claimsCount || 0} مطالبة` : `${monthLabel} ${year}`)}
                </Typography>
                <Divider sx={{ mb: 1 }} />

                {(showDeletedLog ? loadingDeleted : loadingBatch) ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: '2.0rem' }}>
                        <CircularProgress size={20} thickness={4} />
                    </Box>
                ) : (
                    <Stack spacing={0.5} sx={{ flex: 1, overflowY: 'auto' }}>
                        {showDeletedLog ? (deletedContent || []).map(c => (
                            <Paper key={c.id} variant="outlined" sx={{
                                p: 0.75, borderRadius: '0.375rem', flexShrink: 0,
                                borderColor: alpha(theme.palette.warning.main, 0.35),
                                bgcolor: alpha(theme.palette.warning.main, 0.04)
                            }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.5}>
                                    <Typography variant="caption" fontWeight={600}
                                        sx={{ fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.memberName}
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={0.25}>
                                        <Tooltip title="استرجاع المطالبة">
                                            <IconButton size="small" color="success"
                                                disabled={readOnly}
                                                onClick={(e) => onRestoreClaim(c.id, e)} sx={{ p: 0.25 }}>
                                                <RestoreFromTrashIcon sx={{ fontSize: '0.9rem' }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="حذف نهائي">
                                            <IconButton size="small" color="error"
                                                disabled={readOnly}
                                                onClick={(e) => onHardDeleteClaim(c.id, e)} sx={{ p: 0.25 }}>
                                                <DeleteForeverIcon sx={{ fontSize: '0.9rem' }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, fontSize: '0.72rem' }}>
                                    سبب الحذف: {c.deletionReason || 'غير محدد'}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.1, fontSize: '0.72rem' }}>
                                    #{c.id} — {c.deletedAt ? String(c.deletedAt).replace('T', ' ').slice(0, 16) : '-'}
                                </Typography>
                            </Paper>
                        )) : batchContent.map(c => (
                            <Paper key={c.id} variant="outlined"
                                onClick={() => onSwitchClaim(c.id)}
                                sx={{
                                    p: 0.75, borderRadius: '0.375rem', cursor: 'pointer', flexShrink: 0,
                                    transition: 'all 0.15s',
                                    bgcolor: editingClaimId === c.id ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                    borderColor: editingClaimId === c.id ? 'primary.main' : 'divider',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        borderColor: 'primary.light',
                                        transform: 'translateX(2px)'
                                    }
                                }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.5}>
                                    <Typography variant="caption" fontWeight={500}
                                        sx={{ fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.memberName}
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={0.25}>
                                        <Typography variant="caption" fontWeight={600} sx={{
                                            color: c.status === 'REJECTED' ? 'error.dark' : 'success.dark',
                                            bgcolor: c.status === 'REJECTED' ? alpha('#d32f2f', 0.09) : alpha('#2e7d32', 0.09),
                                            px: 0.7, py: 0.3, borderRadius: 1, fontSize: '0.85rem'
                                        }}>
                                            {c.status === 'REJECTED'
                                                ? (c.requestedAmount || 0).toFixed(2)
                                                : (c.approvedAmount || c.requestedAmount || 0).toFixed(2)}
                                        </Typography>
                                        {(c.refusedAmount > 0) && (
                                            <Typography variant="caption" fontWeight={600} sx={{
                                                color: '#d32f2f', bgcolor: alpha('#d32f2f', 0.09),
                                                px: 0.7, py: 0.3, borderRadius: 1, fontSize: '0.85rem'
                                            }}>
                                                {(c.refusedAmount || 0).toFixed(2)}
                                            </Typography>
                                        )}
                                        <Tooltip title={isFinanciallySettled(c) ? 'لا يمكن حذف مطالبة تمت عليها تسوية مالية' : 'إلغاء المطالبة'}>
                                            <span>
                                                <IconButton size="small" color="error"
                                                    disabled={isFinanciallySettled(c) || readOnly}
                                                    onClick={(e) => handleDeleteClaim(c.id, e)}
                                                    sx={{ p: 0.25, opacity: (isFinanciallySettled(c) || readOnly) ? 0.2 : 0.5, '&:hover': { opacity: 1 } }}>
                                                    <DeleteIcon sx={{ fontSize: '0.75rem' }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.3 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="caption" color="text.disabled"
                                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                            #{c.id}
                                        </Typography>
                                        <Typography variant="caption" sx={{
                                            fontSize: '0.75rem', fontWeight: 500, px: 0.6, py: 0.1, borderRadius: 1,
                                            color: c.status === 'REJECTED' ? 'error.dark'
                                                : isPartiallyRefused(c) ? 'warning.dark'
                                                : c.status === 'NEEDS_CORRECTION' ? 'warning.dark'
                                                : c.status === 'DRAFT' ? 'text.secondary'
                                                : 'success.dark',
                                            bgcolor: c.status === 'REJECTED' ? alpha('#d32f2f', 0.1)
                                                : isPartiallyRefused(c) ? alpha('#ed6c02', 0.1)
                                                : c.status === 'NEEDS_CORRECTION' ? alpha('#ed6c02', 0.1)
                                                : c.status === 'DRAFT' ? alpha('#9e9e9e', 0.1)
                                                : alpha('#2e7d32', 0.1)
                                        }}>
                                            {c.status === 'REJECTED' ? 'مرفوضة'
                                            : isPartiallyRefused(c) ? 'اعتماد جزئي'
                                            : c.status === 'NEEDS_CORRECTION' ? 'معلقة'
                                            : c.status === 'DRAFT' ? 'مسودة'
                                            : c.status === 'PENDING' ? 'انتظار'
                                            : c.status === 'UNDER_REVIEW' ? 'مراجعة'
                                            : 'معتمدة'}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                        {c.serviceDate}
                                    </Typography>
                                </Stack>
                            </Paper>
                        ))}
                        {(showDeletedLog ? (deletedData?.totalPages > 1) : (batchData?.totalPages > 1)) && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, py: 1, borderTop: '1px solid #eee', mb: 1 }}>
                                <Pagination
                                    count={showDeletedLog ? deletedData.totalPages : batchData.totalPages}
                                    page={(showDeletedLog ? deletedPage : page) + 1}
                                    onChange={(e, v) => {
                                        if (showDeletedLog) {
                                            setDeletedPage(v - 1);
                                        } else {
                                            setPage(v - 1);
                                        }
                                    }}
                                    size="small"
                                    siblingCount={0}
                                    boundaryCount={1}
                                    shape="rounded"
                                    color="primary"
                                />
                            </Box>
                        )}
                        {!(showDeletedLog ? (deletedContent || []).length : batchContent.length) && (
                            <Box sx={{ textAlign: 'center', py: '1.5rem', opacity: 0.3 }}>
                                <ReceiptIcon sx={{ fontSize: '1.75rem', mb: 0.5 }} />
                                <Typography variant="caption" display="block" fontWeight={400} sx={{ fontSize: '0.75rem' }}>
                                    {showDeletedLog ? 'لا توجد مطالبات محذوفة' : t('claimEntry.noHistoryYet')}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                )}

                <Divider sx={{ mt: 1, mb: 1 }} />
                <Button fullWidth variant="text" size="small" color="primary"
                    onClick={() => navigate(detailUrl)} sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    {t('claimEntry.viewAllBatch')}
                </Button>
            </Paper>
        </Box>
    );
};






