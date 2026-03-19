import React, { Fragment } from 'react';
import {
    TableRow, TableCell, Stack, Autocomplete, TextField, Chip,
    Tooltip, Typography, IconButton, alpha, createFilterOptions, Box
} from '@mui/material';

const serviceFilter = createFilterOptions({
    stringify: (opt) => `${opt.serviceCode || opt.code || ''} ${opt.serviceName || opt.name || ''} ${opt.categoryName || ''} ${opt.subCategoryName || ''}`,
    ignoreAccents: true,
    ignoreCase: true,
    trim: true,
    matchFrom: 'any',
});
import {
    Block as RejectIcon,
    Delete as DeleteIcon,
    WarningAmber as WarningIcon
} from '@mui/icons-material';

const inlineSx = {
    '& .MuiInputBase-root': { fontSize: '0.85rem', fontWeight: 400 },
    '& input': { textAlign: 'center', py: 0.5 }
};

export const ClaimLineRow = ({
    line,
    idx,
    theme,
    serviceOptions,
    serviceCategoryOptions,
    loadingServices,
    updateLine,
    handleServiceChange,
    removeLine,
    openRejectDialog,
    policyInfo,
    readOnly = false
}) => {
    const handleQuantityChange = (value) => {
        const digitsOnly = String(value ?? '').replace(/\D/g, '');
        updateLine(idx, { quantity: digitsOnly });
    };

    const handleApprovedAmountChange = (value) => {
        const sanitized = String(value ?? '').replace(/[^0-9.]/g, '');
        const normalized = sanitized.split('.');
        const formatted = normalized.length > 2
            ? `${normalized[0]}.${normalized.slice(1).join('')}`
            : sanitized;
        updateLine(idx, { approvedAmountInput: formatted });
    };

    const normalizeApprovedAmountOnBlur = () => {
        const maxAllowed = Math.max(0, requestedTotal - limitRefusedAmount);
        const parsed = Number.parseFloat(line.approvedAmountInput);
        const nextValue = Number.isFinite(parsed) && parsed >= 0
            ? Math.min(parsed, maxAllowed).toFixed(2)
            : maxAllowed.toFixed(2);
        updateLine(idx, { approvedAmountInput: nextValue });
    };

    const normalizeQuantityOnBlur = () => {
        const parsed = Number.parseInt(line.quantity, 10);
        updateLine(idx, { quantity: Number.isInteger(parsed) && parsed > 0 ? String(parsed) : '1' });
    };

    const filteredServiceOptions = line.serviceFilterKey
        ? serviceOptions.filter((service) => service.filterCategoryKey === line.serviceFilterKey)
        : serviceOptions;
    const selectedCategory = serviceCategoryOptions.find((category) => category.key === line.serviceFilterKey) || null;
    const requestedTotal = parseFloat(line.requestedTotal ?? line.total ?? 0);
    const limitRefusedAmount = parseFloat(line.limitRefusedAmount || 0);
    const maxApprovedAmount = Math.max(0, requestedTotal - limitRefusedAmount);
    const partialRefusalEnabled = Boolean(line.partialRefusalEnabled);

    const togglePartialRefusal = () => {
        updateLine(idx, {
            partialRefusalEnabled: !partialRefusalEnabled,
            approvedAmountInput: maxApprovedAmount.toFixed(2),
            rejected: false,
            rejectionReason: partialRefusalEnabled ? '' : line.rejectionReason
        });
    };

    return (
        <Fragment>
            <TableRow sx={{ 
                bgcolor: line.rejected ? alpha(theme.palette.error.main, 0.05) : 
                        (line.usageExceeded ? alpha(theme.palette.warning.main, 0.02) : 'transparent')
            }}>
                <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', width: '2.5rem' }}>{idx + 1}</TableCell>
                <TableCell align="right" sx={{ minWidth: '17.5rem' }}>
                    <Stack spacing={0.5}>
                        <Autocomplete
                            size="small"
                            options={serviceCategoryOptions}
                            disabled={readOnly}
                            value={selectedCategory}
                            onChange={(_, value) => updateLine(idx, { serviceFilterKey: value?.key || '' })}
                            getOptionLabel={(option) => option?.label || ''}
                            isOptionEqualToValue={(option, value) => option?.key === value?.key}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    variant="standard"
                                    placeholder="فلتر التصنيف اختياري"
                                    inputProps={{ ...params.inputProps, style: { textAlign: 'right' } }}
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{option.label}</Typography>
                                    <Typography variant="caption" color="text.secondary">{option.count}</Typography>
                                </Box>
                            )}
                            clearOnEscape
                            noOptionsText="لا توجد تصنيفات بالخدمات الحالية"
                        />
                        <Autocomplete
                            size="small"
                            options={filteredServiceOptions}
                            loading={loadingServices}
                            disabled={readOnly}
                            value={line.service || null}
                            onChange={(_, val) => handleServiceChange(idx, val)}
                            filterOptions={serviceFilter}
                            getOptionLabel={o => o.label || o.serviceName || ''}
                            groupBy={(option) => option.categoryName || 'غير مصنف'}
                            isOptionEqualToValue={(opt, val) =>
                                (opt?.pricingItemId != null && opt.pricingItemId === val?.pricingItemId) ||
                                (opt?.serviceCode != null && (opt.serviceCode === val?.serviceCode || opt.serviceCode === val?.medicalServiceCode))
                            }
                            renderOption={(props, option) => (
                                <Box component="li" {...props} sx={{ display: 'block' }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                                        {option.label || option.serviceName || ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {option.subCategoryName
                                            ? `${option.categoryName || 'غير مصنف'} / ${option.subCategoryName}`
                                            : (option.categoryName || 'غير مصنف')}
                                    </Typography>
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField {...params} variant="standard" 
                                    placeholder={loadingServices ? "جاري التحميل..." : "ابحث عن خدمة أو كود أو تصنيف..."}
                                    inputProps={{ ...params.inputProps, style: { textAlign: 'right' } }}
                                />
                            )}
                            noOptionsText={loadingServices
                                ? "جاري تحميل خدمات العقد..."
                                : (line.serviceFilterKey
                                    ? "لا توجد خدمات ضمن هذا التصنيف"
                                    : "لم يتم العثور على خدمات في العقد")}
                        />

                    </Stack>
                </TableCell>
                <TableCell align="center">
                    <TextField
                        variant="standard"
                        type="text"
                        value={line.quantity}
                        disabled={readOnly}
                        onChange={e => handleQuantityChange(e.target.value)}
                        onBlur={normalizeQuantityOnBlur}
                        sx={inlineSx}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 1 }}
                    />
                </TableCell>
                <TableCell align="center">
                    <Tooltip
                        title={line.service?.pricingItemId || line.service?.medicalServiceId
                            ? `سعر العقد ثابت لهذه الخدمة: ${line.contractPrice || line.unitPrice || 0}`
                            : (line.contractAdjustmentAmount > 0
                                ? `سيُحسب بسعر العقد (${line.contractPrice}) بدلاً من السعر المُدخل`
                                : '')}
                        arrow
                    >
                        <TextField variant="standard" type="number" value={line.unitPrice}
                            disabled={readOnly || Boolean(line.service?.pricingItemId || line.service?.medicalServiceId)}
                            sx={{
                                ...inlineSx,
                                '& .MuiInputBase-root.Mui-disabled': {
                                    color: 'text.primary',
                                    WebkitTextFillColor: 'inherit'
                                },
                                '& input': {
                                    ...inlineSx['& input'],
                                    color: (line.service?.pricingItemId || line.service?.medicalServiceId)
                                        ? 'text.primary'
                                        : (line.contractAdjustmentAmount > 0 ? 'warning.dark' : 'inherit'),
                                    fontWeight: (line.service?.pricingItemId || line.service?.medicalServiceId || line.contractAdjustmentAmount > 0)
                                        ? 700
                                        : 'inherit'
                                }
                            }}
                        />
                    </Tooltip>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 400, color: 'text.secondary' }}>
                        {line.coveragePercent !== null ? `${line.coveragePercent}%` : `${policyInfo?.defaultCoveragePercent ?? 100}%`}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    {line.usageDetails && (
                        <Stack spacing={0.3} alignItems="center" justifyContent="center">
                            {line.usageDetails.timesLimit > 0 && (
                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: line.usageDetails.timesExceeded || line.usageDetails.totalUsedCount > line.usageDetails.timesLimit ? 'error.main' : 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    مرات: {line.usageDetails.totalUsedCount}/{line.usageDetails.timesLimit}
                                </Typography>
                            )}
                            {line.usageDetails.amountLimit > 0 && (
                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: line.usageDetails.amountExceeded || line.usageDetails.totalUsedAmount > line.usageDetails.amountLimit ? 'error.main' : 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    د.ل: {(line.usageDetails.totalUsedAmount ?? 0).toFixed(2)}/{line.usageDetails.amountLimit}
                                </Typography>
                            )}
                        </Stack>
                    )}
                </TableCell>
                <TableCell align="center">
                    {line.usageDetails && (
                        <Stack spacing={0.3} alignItems="center" justifyContent="center">
                            {line.usageDetails.timesLimit > 0 && (() => {
                                const remaining = Math.max(0, line.usageDetails.timesLimit - line.usageDetails.totalUsedCount);
                                return (
                                    <Typography variant="caption" sx={{
                                        fontSize: '0.75rem',
                                        color: remaining === 0 ? 'error.main' : 'primary.main',
                                        fontWeight: 600, whiteSpace: 'nowrap'
                                    }}>
                                        مرات: {remaining}
                                    </Typography>
                                );
                            })()}
                            {line.usageDetails.amountLimit > 0 && (() => {
                                const remaining = line.usageDetails.remainingAmount != null
                                    ? line.usageDetails.remainingAmount
                                    : Math.max(0, line.usageDetails.amountLimit - (line.usageDetails.totalUsedAmount ?? 0));
                                return (
                                    <Typography variant="caption" sx={{
                                        fontSize: '0.75rem',
                                        color: remaining <= 0 ? 'error.main' : 'primary.main',
                                        fontWeight: 600, whiteSpace: 'nowrap'
                                    }}>
                                        د.ل: {remaining.toFixed(2)}
                                    </Typography>
                                );
                            })()}
                        </Stack>
                    )}
                </TableCell>
                <TableCell align="center">
                    {line.rejected ? (
                        <Tooltip title={line.rejectionReason || 'الخدمة مرفوضة بالكامل'} arrow>
                            <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'error.main' }}>
                                {(line.total || 0).toFixed(2)}
                            </Typography>
                        </Tooltip>
                    ) : (
                        <Stack spacing={0.35} alignItems="center">
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>x</Typography>
                                <TextField
                                    variant="standard"
                                    type="text"
                                    value={line.approvedAmountInput ?? ''}
                                    disabled={readOnly || !partialRefusalEnabled}
                                    onChange={(e) => handleApprovedAmountChange(e.target.value)}
                                    onBlur={normalizeApprovedAmountOnBlur}
                                    placeholder="0.00"
                                    sx={{
                                        ...inlineSx,
                                        minWidth: '4.5rem',
                                        '& .MuiInputBase-root.Mui-disabled': {
                                            color: 'text.primary',
                                            WebkitTextFillColor: 'inherit'
                                        },
                                        '& input': {
                                            ...inlineSx['& input'],
                                            color: (line.refusedAmount || 0) > 0 ? 'warning.dark' : 'success.main',
                                            fontWeight: 700
                                        }
                                    }}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                            </Stack>
                            <Chip
                                size="small"
                                clickable={!readOnly}
                                onClick={togglePartialRefusal}
                                disabled={readOnly}
                                color={partialRefusalEnabled ? 'warning' : 'default'}
                                variant={partialRefusalEnabled ? 'filled' : 'outlined'}
                                label={partialRefusalEnabled ? 'إلغاء الرفض الجزئي' : 'رفض جزئي'}
                                sx={{ height: '1.3rem', fontSize: '0.68rem', fontWeight: 600 }}
                            />
                            {line.limitRefusedAmount > 0 && (
                                <Tooltip title={line.rejectionReason || 'جزء من المبلغ مرفوض تلقائياً بسبب سقف المنفعة'} arrow>
                                    <Typography variant="caption" color="warning.dark" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                        تلقائي: {Number(line.limitRefusedAmount || 0).toFixed(2)}
                                    </Typography>
                                </Tooltip>
                            )}
                            {(line.manualRefusedAmount || 0) > 0 && (
                                <Typography variant="caption" color="error.main" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                    مرفوض: {Number(line.manualRefusedAmount || 0).toFixed(2)}
                                </Typography>
                            )}
                        </Stack>
                    )}
                </TableCell>
                <TableCell align="center">
                    <Stack spacing={0} alignItems="center">
                        <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'success.main', lineHeight: 1.2 }}>
                            {line.byCompany?.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'warning.dark', lineHeight: 1.2 }}>
                            {line.byEmployee?.toFixed(2)}
                        </Typography>
                    </Stack>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main' }}>
                        {line.total?.toFixed(2)}
                    </Typography>
                </TableCell>
                <TableCell align="left">
                    <Stack direction="row" spacing={0} justifyContent="flex-start" sx={{ '& .MuiIconButton-root': { p: 0.5 } }}>
                        <IconButton size="small" color={line.rejected ? "error" : "default"}
                            disabled={readOnly}
                            onClick={() => line.rejected
                                ? updateLine(idx, { rejected: false, rejectionReason: '', partialRefusalEnabled: false })
                                : openRejectDialog('line', idx)}>
                            <RejectIcon sx={{ fontSize: '0.9375rem' }} />
                        </IconButton>
                        <IconButton size="small" color="error" disabled={readOnly} onClick={() => removeLine(idx)}>
                            <DeleteIcon sx={{ fontSize: '0.9375rem' }} />
                        </IconButton>
                    </Stack>
                </TableCell>
            </TableRow>
            {line.rejected && (
                <TableRow sx={{ bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                    <TableCell colSpan={11} sx={{ py: 0.5 }}>
                        <Typography variant="caption" color="error" fontWeight={500} sx={{ fontSize: '0.75rem', px: '1.0rem' }}>
                            سبب الرفض: {line.rejectionReason}
                        </Typography>
                    </TableCell>
                </TableRow>
            )}
            {line.usageExceeded && !line.rejected && (
                <TableRow sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                    <TableCell colSpan={11} sx={{ py: 0.5 }}>
                        <Typography variant="caption" color={line.usageExhausted ? "error.main" : "warning.dark"} fontWeight={600} sx={{ fontSize: '0.75rem', px: '1.0rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                            {line.usageExhausted ? <RejectIcon sx={{ fontSize: '0.875rem' }} /> : <WarningIcon sx={{ fontSize: '0.875rem' }} />}
                            {line.usageExhausted ? "⚠️ رصيد المنفعة استنفذ بالكامل: " : "⚠️ تجاوز سقف المنفعة المحدد: "}
                            {line.usageDetails?.timesLimit > 0 && `(سيُّسجَّل ${(line.usageDetails.totalUsedCount || 0) + 1} من أصل ${line.usageDetails.timesLimit} مرّة/سنة)`}
                            {line.usageDetails?.amountLimit > 0 && (() => {
                                const prev = parseFloat(line.usageDetails.totalUsedAmount || 0);
                                const curr = parseFloat(line.usageDetails.currentRequestedAmount || 0);
                                const limit = parseFloat(line.usageDetails.amountLimit || 0);
                                const total = parseFloat((prev + curr).toFixed(2));
                                return ` (مستخدم مسبقاً: ${prev.toFixed(2)} + المطلوب حالياً: ${curr.toFixed(2)} = ${total} د.ل يتجاوز الحد ${limit.toFixed(2)} د.ل)`;
                            })()}
                        </Typography>
                    </TableCell>
                </TableRow>
            )}
        </Fragment>
    );
};





