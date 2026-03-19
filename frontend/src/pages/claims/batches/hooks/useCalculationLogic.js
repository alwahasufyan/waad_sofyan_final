import { useCallback } from 'react';

export function useCalculationLogic({ applyBenefits, policyInfo }) {
    const normalizeQuantity = (quantity) => {
        if (quantity === '' || quantity === null || quantity === undefined) return 0;
        const parsed = Number.parseInt(quantity, 10);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
    };

    const normalizeAmount = (amount) => {
        const parsed = Number.parseFloat(amount);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    };

    const normalizeNonNegativeAmount = (amount) => {
        if (amount === '' || amount === null || amount === undefined) return null;
        const parsed = Number.parseFloat(amount);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    
    const recompute = useCallback((line, idx = null, currentBatch = null) => {
        if (!line) return line;

        const qty = normalizeQuantity(line.quantity);
        const enteredPrice = Math.max(0, parseFloat(line.unitPrice) || 0);
        const requestedTotal = parseFloat((enteredPrice * qty).toFixed(2));

        if (line.rejected) {
            return {
                ...line,
                byCompany: 0,
                byEmployee: 0,
                total: requestedTotal,
                requestedTotal,
                contractAdjustmentAmount: 0,
                approvedAmountInput: '0.00',
                manualRefusedAmount: requestedTotal,
                limitRefusedAmount: 0,
                refusedAmount: requestedTotal
            };
        }

        const contractPrice = parseFloat(line.contractPrice || 0);
        const effectivePrice = (contractPrice > 0 && enteredPrice > contractPrice) ? contractPrice : enteredPrice;
        const effectiveTotal = parseFloat((effectivePrice * qty).toFixed(2));
        const contractAdjustmentAmount = Math.max(0, requestedTotal - effectiveTotal);

        let limitRefused = 0;
        let usageExceeded = false;
        const usage = line.usageDetails;

        let batchUsedTimes = 0;
        let batchUsedAmount = 0;
        let totalUsedCount = 0;
        let totalUsedAmount = 0;

        if (usage && usage.hasLimit) {
            const currentRuleId = usage.ruleId;
            if (currentRuleId && currentBatch && idx !== null) {
                currentBatch.forEach((l, i) => {
                    if (i < idx && !l.rejected && l.service && l.usageDetails?.ruleId === currentRuleId) {
                        // Calculate how many were approved in this previous line
                        const lQty = parseInt(l.quantity) || 0;
                        const lEffectivePrice = Math.min(parseFloat(l.unitPrice || 0), parseFloat(l.contractPrice || 0) || Infinity);
                        const lEffectiveTotal = parseFloat((lEffectivePrice * lQty).toFixed(2));
                        
                        // We only track actual limit refusals here. Contract adjustments
                        // are informational and should not consume the benefit limit.
                        const lLimitRefused = Math.max(0, parseFloat(l.refusedAmount) || 0);
                        
                        const lApprovedAmount = Math.max(0, lEffectiveTotal - lLimitRefused);
                        const lApprovedQty = lEffectiveTotal > 0 ? (lApprovedAmount / lEffectivePrice) : 0;
                        
                        batchUsedTimes += lApprovedQty;
                        batchUsedAmount += lApprovedAmount;
                    }
                });
            }

            // timesLimit = عدد المطالبات/الزيارات المسموح بها، وليس عدد الوحدات.
            // totalUsedCount = عدد المطالبات السابقة فقط (الزيارة الحالية لم تُحسب بعد).
            totalUsedCount = (usage?.usedCount || 0);
            totalUsedAmount = (usage?.usedAmount || 0) + batchUsedAmount;

            if (usage.timesLimit > 0) {
                // إذا استنفد المستفيد عدد الزيارات المسموح بها → نرفض كامل الخدمة
                if (totalUsedCount >= usage.timesLimit) {
                    limitRefused = effectiveTotal;
                    usageExceeded = true;
                }
                // أما إذا لم يستنفد → نسمح بكامل الكمية بغض النظر عنها
            }
            
            if (usage.amountLimit > 0) {
                // Adjust remaining based on what we already refused from timesLimit (to avoid double deduction if both exist)
                const currentApprovedBeforeAmount = effectiveTotal - limitRefused;
                const remainingAmount = Math.max(0, usage.amountLimit - totalUsedAmount);
                
                if (currentApprovedBeforeAmount > remainingAmount) {
                    const extraRefused = currentApprovedBeforeAmount - remainingAmount;
                    limitRefused += parseFloat(extraRefused.toFixed(2));
                    usageExceeded = true;
                }
            }
        }

        const maxApprovedAmount = Math.max(0, effectiveTotal - limitRefused);
        const allowManualPartialRefusal = Boolean(line.partialRefusalEnabled);
        const requestedApprovedAmount = allowManualPartialRefusal
            ? normalizeNonNegativeAmount(line.approvedAmountInput)
            : null;
        const approvedAmountInput = requestedApprovedAmount === null
            ? maxApprovedAmount
            : Math.min(requestedApprovedAmount, maxApprovedAmount);
        const manualRefusedAmount = allowManualPartialRefusal
            ? Math.max(0, parseFloat((maxApprovedAmount - approvedAmountInput).toFixed(2)))
            : 0;
        const totalRefused = parseFloat((limitRefused + manualRefusedAmount).toFixed(2));
        const approvedTotalForCoverage = Math.max(0, effectiveTotal - totalRefused);

        let byCompany, byEmployee;
        const defaultCov = policyInfo?.defaultCoveragePercent ?? 100;
        const cov = (line.coveragePercent !== null && line.coveragePercent !== undefined) ? line.coveragePercent : defaultCov;

        if (applyBenefits) {
            byCompany = parseFloat((approvedTotalForCoverage * cov / 100).toFixed(2));
            // التوزيع من المبلغ الصافي المعتمد (بعد خصم المرفوض) لا من كامل مبلغ العقد
            byEmployee = parseFloat((approvedTotalForCoverage - byCompany).toFixed(2));
        } else {
            byEmployee = Math.max(0, parseFloat(line.byEmployee) || 0);
            byCompany = parseFloat(Math.max(0, approvedTotalForCoverage - byEmployee).toFixed(2));
        }

        // تعيين سبب الرفض تلقائياً فقط عند الرفض الفعلي/استنفاد السقف
        const AUTO_LIMIT_REASON = 'المستفيد استهلك رصيده';
        const isAutoReason = (r) => r === AUTO_LIMIT_REASON;

        let autoRejectionReason = line.rejectionReason || '';
        if (usageExceeded && (!autoRejectionReason || isAutoReason(autoRejectionReason))) {
            autoRejectionReason = AUTO_LIMIT_REASON;
        } else if (!usageExceeded && isAutoReason(autoRejectionReason)) {
            autoRejectionReason = '';
        }

        return {
            ...line,
            total: effectiveTotal,
            requestedTotal,
            byCompany,
            byEmployee,
            contractAdjustmentAmount: parseFloat(contractAdjustmentAmount.toFixed(2)),
            partialRefusalEnabled: allowManualPartialRefusal,
            approvedAmountInput: approvedAmountInput.toFixed(2),
            manualRefusedAmount: parseFloat(manualRefusedAmount.toFixed(2)),
            limitRefusedAmount: parseFloat(limitRefused.toFixed(2)),
            refusedAmount: totalRefused,
            rejectionReason: autoRejectionReason,
            usageExceeded: usageExceeded || (usage && usage.exceeded),
            usageExhausted: limitRefused >= effectiveTotal && effectiveTotal > 0,
            usageDetails: usage ? {
                ...usage,
                totalUsedCount,
                totalUsedAmount,
                currentRequestedAmount: effectiveTotal,
                remainingAmount: usage.amountLimit > 0 ? Math.max(0, usage.amountLimit - totalUsedAmount - approvedTotalForCoverage) : null
            } : null
        };
    }, [applyBenefits, policyInfo?.defaultCoveragePercent]);

    return { recompute };
}
