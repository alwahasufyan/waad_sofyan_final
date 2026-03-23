/**
 * صفحة إدخال الدفعة — تخطيط RTL يملأ الشاشة
 * ✅ الجدول والفورم من اليمين لليسار
 * ✅ الشريط الجانبي (المطالبات) من اليسار
 * ✅ زر الحفظ مرئي دون scroll
 * ✅ كل النصوص من ar.js (لا hardcode)
 */
import { useState, useMemo, useRef, useCallback, useEffect, Fragment } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box, Stack, Typography, Button, TextField, Autocomplete,
    Divider, CircularProgress, IconButton, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, Paper,
    Checkbox, FormControlLabel, Tooltip, alpha, TableFooter,
    InputAdornment, Alert, Dialog, DialogTitle, DialogContent,
    DialogActions, Pagination, Drawer
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Save as SaveIcon, Add as AddIcon, Delete as DeleteIcon,
    Receipt as ReceiptIcon,
    ArrowBack as BackIcon, Close as DiscardIcon, History as HistoryIcon,
    Search as SearchIcon, WarningAmber as WarningIcon,
    VerifiedUser as PolicyIcon, Info as InfoIcon, Block as RejectIcon,
    Cancel as CancelIcon, AttachFile as AttachFileIcon,
    Lock as LockIcon, AddCircleOutline as AddReasonIcon
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import useLocale from 'hooks/useLocale';

import unifiedMembersService from 'services/api/unified-members.service';
import providersService from 'services/api/providers.service';
import employersService from 'services/api/employers.service';
import claimsService from 'services/api/claims.service';
import preApprovalsService from 'services/api/pre-approvals.service';
import visitsService from 'services/api/visits.service';
import benefitPoliciesService from 'services/api/benefit-policies.service';
import * as medicalCategoriesService from 'services/api/medical-categories.service';
import providerContractsService from 'services/api/provider-contracts.service';
import claimBatchesService from 'services/api/claim-batches.service';
import { claimRejectionReasonsService } from 'services/api/claim-rejection-reasons.service';
import systemSettingsService from 'services/api/systemSettings.service';

import { useCalculationLogic } from './hooks/useCalculationLogic';
import { useCoverageLogic } from './hooks/useCoverageLogic';

import { BatchHistorySidebar } from './components/BatchHistorySidebar';
import { ClaimHeaderFields } from './components/ClaimHeaderFields';
import { ClaimLineRow } from './components/ClaimLineRow';
import { ClaimTotalsFooter } from './components/ClaimTotalsFooter';

// ── أسماء الشهور ─────────────────────────────────────────────────────────────
const MONTHS_AR = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const newLine = () => ({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
    service: null, serviceName: '', serviceCode: '',
    serviceFilterKey: '',
    quantity: 1, unitPrice: 0, contractPrice: 0, byCompany: 0, byEmployee: 0,
    refusalTypes: '', total: 0, coveragePercent: null,
    partialRefusalEnabled: false,
    approvedAmountInput: '', manualRefusedAmount: '', limitRefusedAmount: 0, refusedAmount: 0,
    notes: '',
    requiresPreApproval: false, notCovered: false,
    rejected: false, rejectionReason: ''
});

const normalizePositiveInteger = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isPopulatedClaimLine = (line) => Boolean(
    line?.service?.medicalServiceId ||
    line?.service?.pricingItemId ||
    line?.serviceName ||
    line?.serviceCode
);

const getCanonicalUnitPrice = (line) => {
    const enteredPrice = Math.max(0, parseFloat(line?.unitPrice) || 0);
    const contractPrice = Math.max(0, parseFloat(line?.contractPrice) || 0);
    return contractPrice > 0 ? Math.min(enteredPrice, contractPrice) : enteredPrice;
};

const FINALIZED_CLAIM_STATUSES = new Set(['APPROVED', 'REJECTED', 'BATCHED', 'SETTLED', 'PAID']);

// أنماط حقول الجدول القابلة للتعديل
const inlineSx = {
    '& .MuiInput-root::before': { display: 'none' },
    '& .MuiInput-root::after': { borderBottomColor: '#1b5e20', borderBottomWidth: 1 },
    '& input': { fontSize: '0.8rem', fontWeight: 500, textAlign: 'center' }
};

// رأس عمود الجدول
const TH = ({ children, align = 'center', w, sx: sxOver = {} }) => (
    <TableCell align={align} sx={{
        bgcolor: '#E8F5F1', color: '#0D4731', fontWeight: 500,
        fontSize: '0.75rem', py: 0.8, px: '0.6rem', whiteSpace: 'nowrap',
        borderBottom: '2px solid #c8e6c9',
        ...(w && { width: w, minWidth: w }),
        ...sxOver
    }}>
        {children}
    </TableCell>
);

// ══════════════════════════════════════════════════════════════════════════════
export default function ClaimBatchEntry() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const { t } = useLocale();

    const employerId = searchParams.get('employerId');
    const providerId = searchParams.get('providerId');
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    const initialClaimId = searchParams.get('claimId');

    // ── حالة النموذج ─────────────────────────────────────────────────────────
    const [member, setMember] = useState(null);
    const [memberInput, setMemberInput] = useState('');
    const [debouncedMemberInput, setDebouncedMemberInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedMemberInput(memberInput), 350);
        return () => clearTimeout(t);
    }, [memberInput]);
    const [diagnosis, setDiagnosis] = useState('');
    const [applyBenefits, setApplyBenefits] = useState(true);
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([newLine()]);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [policyId, setPolicyId] = useState(null);
    const [policyInfo, setPolicyInfo] = useState(null);
    const [memberFinancialSummary, setMemberFinancialSummary] = useState(null);

    // Rejection State
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectType, setRejectType] = useState('claim'); // 'claim' or 'line'
    const [rejectIdx, setRejectIdx] = useState(null);
    const [rejectionInput, setRejectionInput] = useState('');
    const [isClaimRejected, setIsClaimRejected] = useState(false);
    const [page, setPage] = useState(0);
    const [deletedPage, setDeletedPage] = useState(0);
    const [attachments, setAttachments] = useState([]);
    const [editingClaimId, setEditingClaimId] = useState(initialClaimId);
    const [preAuthId, setPreAuthId] = useState('');
    const [preAuthSearch, setPreAuthSearch] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmRestoreId, setConfirmRestoreId] = useState(null);
    const [confirmHardDeleteId, setConfirmHardDeleteId] = useState(null);
    const [deleteReasonInput, setDeleteReasonInput] = useState('');
    const [showDeletedLog, setShowDeletedLog] = useState(false);
    const [batchSidebarOpen, setBatchSidebarOpen] = useState(false);

    // ✅ Claim Category Context (Manual Rule Selection)
    const [manualCategoryEnabled, setManualCategoryEnabled] = useState(true);
    const [primaryCategoryCode, setPrimaryCategoryCode] = useState('CAT-OUTPAT');

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

    const [serviceDate, setServiceDate] = useState('');

    const memberRef = useRef(null);
    const linesRef = useRef(lines);

    // Keep linesRef in sync
    useEffect(() => {
        linesRef.current = lines;
    }, [lines]);

    // ── الاستعلامات الأساسية اللازمة للمنطق ──────────────────────────────────────
    const { data: rootCategories } = useQuery({
        queryKey: ['medical-categories-root'],
        queryFn: () => medicalCategoriesService.getAllMedicalCategories(),
        select: (data) => data.filter(c => !c.parentId),
        staleTime: Infinity
    });

    // ── المنطق المالي وتغطية الخدمات (المرحلة 3: Hooks المستخرجة) ─────────────────
    const { recompute } = useCalculationLogic({ applyBenefits, policyInfo });
    
    const { fetchCoverage, refetchAllLinesCoverage } = useCoverageLogic({
        policyId, policyInfo, member, applyBenefits, rootCategories, primaryCategoryCode,
        setLines, recompute,
        serviceYear: serviceDate ? new Date(serviceDate).getFullYear() : new Date().getFullYear(),
        currentClaimId: editingClaimId
    });

    const refetchAllLinesCoverageCallback = useCallback(async (newCategoryCode) => {
        const updated = await refetchAllLinesCoverage(newCategoryCode, linesRef.current);
        if (updated) setLines(updated);
    }, [refetchAllLinesCoverage]);

    // ✅ FIX: Ref that always points to the LATEST refetchAllLinesCoverageCallback
    // This prevents stale-closure bugs in setTimeout calls
    const refetchCoverageOnEditRef = useRef(refetchAllLinesCoverageCallback);
    useEffect(() => {
        refetchCoverageOnEditRef.current = refetchAllLinesCoverageCallback;
    }, [refetchAllLinesCoverageCallback]);

    const isSavingRef = useRef(false);

    // ── الاستعلامات ──────────────────────────────────────────────────────────
    const { data: employer } = useQuery({
        queryKey: ['employer', employerId],
        queryFn: () => employersService.getById(employerId),
        enabled: !!employerId
    });
    const { data: provider } = useQuery({
        queryKey: ['provider', providerId],
        queryFn: () => providersService.getById(providerId),
        enabled: !!providerId
    });
    const { data: currentBatch, isLoading: loadingBatchMeta, error: batchError } = useQuery({
        queryKey: ['claim-batch-current', providerId, employerId, month, year],
        // FIX: Read-only GET — does NOT auto-create a batch on page load
        queryFn: () => claimBatchesService.getCurrentBatch(providerId, employerId, year, month),
        enabled: !!providerId && !!employerId && !isNaN(month) && !isNaN(year),
        retry: false
    });

    const { data: batchData, isLoading: loadingBatch } = useQuery({
        queryKey: ['batch-claims-entry', employerId, providerId, month, year, page],
        queryFn: async () => {
            if (!employerId || !providerId || isNaN(month) || isNaN(year)) return null;
            const lastDay = new Date(year, month, 0).getDate();
            return claimsService.list({
                employerId, providerId,
                dateFrom: `${year}-${String(month).padStart(2, '0')}-01`,
                dateTo: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
                size: 20, page, sortBy: 'createdAt', sortDir: 'desc'
            });
        },
        enabled: !!employerId && !!providerId
    });
    const { data: deletedBatchData, isLoading: loadingDeletedBatch } = useQuery({
        queryKey: ['batch-claims-deleted-entry', employerId, providerId, month, year, deletedPage],
        queryFn: async () => {
            if (!employerId || !providerId || isNaN(month) || isNaN(year)) return null;
            const lastDay = new Date(year, month, 0).getDate();
            return claimsService.listDeleted({
                employerId,
                providerId,
                dateFrom: `${year}-${String(month).padStart(2, '0')}-01`,
                dateTo: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
                size: 20,
                page: deletedPage,
                sortBy: 'createdAt',
                sortDir: 'desc'
            });
        },
        enabled: !!employerId && !!providerId
    });
    const { data: contractedRaw, isLoading: loadingServices } = useQuery({
        queryKey: ['contracted-services', providerId],
        queryFn: () => providerContractsService.getAllContractedServices(providerId),
        enabled: !!providerId,
        staleTime: 0
    });
    const { data: activeContract, isLoading: loadingContract } = useQuery({
        queryKey: ['provider-active-contract', providerId],
        queryFn: () => providerContractsService.getActiveContractByProvider(providerId),
        enabled: !!providerId
    });
    const memberSearchParams = useMemo(() => {
        const q = debouncedMemberInput.trim();
        // Smart detection: Arabic → fullName, digits → cardNumber, barcode pattern → barcode
        if (/^[\u0600-\u06FF]/.test(q)) return { fullName: q };
        if (/^[A-Z]{2,4}-\d{4}-\d+/i.test(q)) return { barcode: q };
        if (/^\d+$/.test(q)) return { cardNumber: q };
        return { fullName: q };
    }, [debouncedMemberInput]);

    const { data: memberResults, isFetching: searchingMember } = useQuery({
        queryKey: ['member-search', debouncedMemberInput, employerId],
        queryFn: () => unifiedMembersService.searchMembers({
            ...memberSearchParams,
            employerId,
            status: 'ACTIVE',
            size: 20
        }),
        enabled: debouncedMemberInput.length >= 2,
        staleTime: 10000
    });
    const { data: summaryData } = useQuery({
        queryKey: ['batch-stats', employerId, providerId, month, year],
        queryFn: () => {
            if (!employerId || !providerId || isNaN(month) || isNaN(year)) return null;
            const lastDay = new Date(year, month, 0).getDate();
            return claimsService.getFinancialSummary({
                employerId,
                providerId,
                dateFrom: `${year}-${String(month).padStart(2, '0')}-01`,
                dateTo: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
            });
        },
        enabled: !!employerId && !!providerId
    });

    const { data: backdatedMonthsSetting } = useQuery({
        queryKey: ['system-setting-backdated-months'],
        queryFn: () => systemSettingsService.getAll().then(settings => {
            const s = settings?.find(x => x.settingKey === 'CLAIM_BACKDATED_MONTHS');
            return s ? parseInt(s.settingValue, 10) : 3;
        }),
        staleTime: 5 * 60 * 1000,
    });
    const allowedBackdatedMonths = backdatedMonthsSetting ?? 3;

    const isExpiredBatch = useMemo(() => {
        if (!month || !year) return false;
        const now = new Date();
        const currentYM = now.getFullYear() * 12 + now.getMonth();
        const targetYM = year * 12 + (month - 1);
        const diff = currentYM - targetYM;
        if (allowedBackdatedMonths === 0) return diff > 0;
        return diff > allowedBackdatedMonths;
    }, [month, year, allowedBackdatedMonths]);

    const { data: preAuthResults, isFetching: searchingPreAuth } = useQuery({
        queryKey: ['preauth-search', preAuthSearch, member?.id],
        queryFn: () => preApprovalsService.search({ q: preAuthSearch, size: 20 }),
        enabled: preAuthSearch.length >= 1,
        staleTime: 5000
    });


    // ── Helper to refresh all batch related views ───────────────────────────
    const invalidateBatchData = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['batch-claims-entry'] });
        queryClient.invalidateQueries({ queryKey: ['batch-claims-deleted-entry'] });
        queryClient.invalidateQueries({ queryKey: ['batch-claims-detail'] });
        queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
        queryClient.invalidateQueries({ queryKey: ['claim-batch-current'] });
        queryClient.invalidateQueries({ queryKey: ['member-financial-summary'] });
        // Invalidate cached claim detail so re-opening a claim always triggers a fresh
        // coverage/usage fetch (ensures سقف المنفعة reflects the latest consumed amounts)
        queryClient.invalidateQueries({ queryKey: ['claim'] });
    }, [queryClient]);

    // الوثيقة التأمينية والمنافع (PHASE 5.6 - Decoupled from Member)
    useEffect(() => {
        if (!employerId) {
            setPolicyId(null);
            setPolicyInfo(null);
            return;
        }
        // Load the effective policy for this employer as soon as we have the ID
        // This ensures the "Document" context is set before searching for members
        benefitPoliciesService.getEffectiveBenefitPolicy(employerId)
            .then(p => {
                if (p) {
                    setPolicyId(p.id);
                    setPolicyInfo(p);
                } else {
                    setPolicyId(null);
                    setPolicyInfo(null);
                }
            })
            .catch(() => {
                setPolicyId(null);
                setPolicyInfo(null);
            });
    }, [employerId]);

    // ── Member Financial Summary (PHASE 1 - Single Source of Truth) ──────
    const { data: financialSummary, isFetching: loadingSummary, refetch: refetchFinancialSummary } = useQuery({
        queryKey: ['member-financial-summary', member?.id],
        queryFn: () => unifiedMembersService.getFinancialSummary(member.id),
        enabled: !!member?.id,
        staleTime: 30000 // 30 seconds
    });

    useEffect(() => {
        if (financialSummary) {
            setMemberFinancialSummary(financialSummary);
        }
    }, [financialSummary]);

    // ── Load Existing Claim for Edit ───────────────────────────────────────
    const { data: editingClaim, isLoading: loadingClaim } = useQuery({
        queryKey: ['claim', editingClaimId],
        queryFn: () => claimsService.getById(editingClaimId),
        enabled: !!editingClaimId,
        staleTime: 0
    });

    const isReadOnlyClaim = useMemo(() => {
        if (!editingClaimId || !editingClaim?.status) return false;
        return FINALIZED_CLAIM_STATUSES.has(String(editingClaim.status).toUpperCase());
    }, [editingClaimId, editingClaim?.status]);

    useEffect(() => {
        if (editingClaim) {
            setMember({ id: editingClaim.memberId, fullName: editingClaim.memberName, cardNumber: editingClaim.memberNationalNumber });
            setDiagnosis(editingClaim.diagnosisCode || '');
            setIsClaimRejected(editingClaim.status === 'REJECTED');
            setRejectionInput(editingClaim.reviewerComment || '');

            setLines(editingClaim.lines.map(l => {
                // المطابقة: 1) pricingItemId (الأدق)
                //             2) serviceCode أو medicalServiceCode كاحتياط
                const lineCode = l.medicalServiceCode || l.serviceCode;
                const lineName = l.medicalServiceName || l.serviceName;
                const svc = serviceOptions.find(s =>
                    (s.pricingItemId != null && l.pricingItemId != null && s.pricingItemId === l.pricingItemId) ||
                    (s.serviceCode && lineCode && s.serviceCode === lineCode)
                );
                // سعر العقد الحي من بيانات العقد — 65 بدلاً من 70 المدخل
                const cp = svc ? (svc.contractPrice || 0) : 0;

                // السعر المُدخل = requestedUnitPrice إذا متوفر، وإلا unitPrice
                const enteredPrice = l.requestedUnitPrice != null
                    ? parseFloat(l.requestedUnitPrice) || 0
                    : parseFloat(l.unitPrice) || 0;

                const serviceObj = svc || {
                    medicalServiceId: l.medicalServiceId || null,
                    categoryId: l.serviceCategoryId || l.appliedCategoryId || null,
                    pricingItemId: l.pricingItemId || null,
                    serviceCode: lineCode,
                    serviceName: lineName,
                    label: `${lineCode ? '[' + lineCode + '] ' : ''}${lineName || ''}`
                };
                const line = {
                    id: l.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
                    service: serviceObj,
                    serviceFilterKey: serviceObj.filterCategoryKey || '',
                    quantity: l.quantity,
                    unitPrice: cp > 0 ? cp : enteredPrice,
                    contractPrice: cp,
                    coveragePercent: l.coveragePercent,
                    partialRefusalEnabled: !l.rejected && Number(l.refusedAmount || 0) > 0,
                    approvedAmountInput: l.rejected
                        ? '0.00'
                        : Math.max(0, ((enteredPrice * (l.quantity || 1)) - (parseFloat(l.refusedAmount) || 0))).toFixed(2),
                    manualRefusedAmount: l.rejected ? '' : (l.refusedAmount != null ? String(l.refusedAmount) : ''),
                    notes: l.notes || l.reviewerNotes || '',
                    rejected: l.rejected,
                    rejectionReason: l.rejectionReason
                };
                return recompute(line);
            }));
            setServiceDate(editingClaim.serviceDate || '');
            setPreAuthId(editingClaim.preAuthorizationId || '');
            setManualCategoryEnabled(editingClaim.manualCategoryEnabled ?? true);
            setPrimaryCategoryCode(editingClaim.primaryCategoryCode || 'CAT-OUTPAT');
            setIsDirty(false);

            // المرحلة 1.3: إعادة جلب التغطية والسقوف للمطالبة المحملة لضمان دقة العرض
            // يستخدم الـ ref لضمان استخدام النسخة الأحدث دائماً (تجنّب stale closure)
            if (policyId && editingClaim.memberId) {
                setTimeout(() => {
                    refetchCoverageOnEditRef.current(editingClaim.primaryCategoryCode || 'CAT-OUTPAT');
                }, 300);
            }
        }
    }, [editingClaim, contractedRaw]);

    const memberOptions = useMemo(() => {
        const c = memberResults?.data?.content ?? memberResults?.content;
        const list = Array.isArray(c) ? c : [];
        // Always include the currently selected member (for edit mode where no search is active)
        if (member?.id && !list.find(m => m.id === member.id)) {
            return [member, ...list];
        }
        return list;
    }, [memberResults, member]);

    const serviceOptions = useMemo(() => {
        const items = Array.isArray(contractedRaw) ? contractedRaw : (contractedRaw?.items || []);
        return items.map(s => {
            const code = s.serviceCode || s.code || '';
            const name = s.serviceName || s.name || '';
            const categoryName = s.categoryName || 'غير مصنف';
            const subCategoryName = s.subCategoryName || s.subcategoryName || '';
            const filterCategoryKey = s.categoryId != null ? `id:${s.categoryId}` : `name:${categoryName}`;
            return {
                ...s,
                label: `${code ? '[' + code + '] ' : ''}${name}`,
                medicalServiceId: s.medicalServiceId ?? null,
                serviceName: name,
                serviceCode: code,
                categoryId: s.categoryId ?? s.medicalCategoryId ?? null,
                categoryName,
                subCategoryName,
                filterCategoryKey,
                pricingItemId: s.pricingItemId,
                contractPrice: s.contractPrice || 0
            };
        }).sort((left, right) => {
            const leftCategory = left.categoryName || '';
            const rightCategory = right.categoryName || '';
            if (leftCategory !== rightCategory) {
                return leftCategory.localeCompare(rightCategory, 'ar');
            }
            return (left.serviceName || '').localeCompare(right.serviceName || '', 'ar');
        });
    }, [contractedRaw]);

    const serviceCategoryOptions = useMemo(() => {
        const categoryMap = new Map();
        serviceOptions.forEach((service) => {
            const key = service.filterCategoryKey || `name:${service.categoryName || 'غير مصنف'}`;
            if (!categoryMap.has(key)) {
                categoryMap.set(key, {
                    key,
                    id: service.categoryId ?? null,
                    label: service.categoryName || 'غير مصنف',
                    count: 0
                });
            }
            categoryMap.get(key).count += 1;
        });
        return Array.from(categoryMap.values()).sort((left, right) =>
            left.label.localeCompare(right.label, 'ar')
        );
    }, [serviceOptions]);

    const batchContent = useMemo(() =>
        batchData?.data?.items ?? batchData?.items ?? batchData?.data?.content ?? batchData?.content ?? [], [batchData]);
    const deletedBatchContent = useMemo(() =>
        deletedBatchData?.data?.items ?? deletedBatchData?.items ?? deletedBatchData?.data?.content ?? deletedBatchData?.content ?? [], [deletedBatchData]);
    const batchTotal = batchData?.data?.total ?? batchData?.total ?? batchData?.data?.totalElements ?? batchData?.totalElements ?? 0;

    // ── المنطق المالي وتغطية الخدمات (مطبق في الأعلى) ───────────────────────────

    const updateLine = useCallback((idx, patch) => {
        setLines(prev => {
            const n = [...prev];
            n[idx] = { ...n[idx], ...patch };
            return n.map((line, i) => recompute(line, i, n));
        });
        setIsDirty(true);
    }, [recompute]);

    const handleServiceChange = useCallback(async (idx, val) => {
        if (!val) {
            updateLine(idx, { service: null, serviceName: '', serviceCode: '', unitPrice: 0, contractPrice: 0 });
            return;
        }

        let svc = val;
        let isFreeText = false;
        if (typeof val === 'string') {
            svc = { serviceName: val, label: val, mapped: false, isFreeText: true };
            isFreeText = true;
        }

        const newName = svc.serviceName || svc.name;
        
        const isDuplicate = lines.some((l, i) => {
            if (i === idx) return false;
            const existingName = l.serviceName || l.service?.serviceName || l.service?.name;
            return newName && existingName && existingName === newName;
        });

        if (isDuplicate) {
            enqueueSnackbar('هذه الخدمة مضافة بالفعل في بند آخر', { variant: 'error' });
            return;
        }

        let cov = { coveragePercent: policyInfo?.defaultCoveragePercent ?? 100, requiresPreApproval: false, notCovered: false };
        if (!isFreeText) {
            cov = await fetchCoverage(svc, primaryCategoryCode);
        }

        const price = svc?.contractPrice ?? 0;
        updateLine(idx, {
            service: svc,
            serviceName: svc.serviceName || (typeof val === 'string' ? val : ''),
            serviceCode: svc.serviceCode || '',
            serviceFilterKey: svc.filterCategoryKey || '',
            unitPrice: price,
            contractPrice: price,
            ...cov
        });
    }, [fetchCoverage, updateLine, lines, enqueueSnackbar, primaryCategoryCode, policyInfo]);

    useEffect(() => {
        if (!policyId || !member?.id) return;
        
        // Force refetch usage/limits for ALL lines when member or policy changes
        refetchAllLinesCoverage(primaryCategoryCode, linesRef.current).then(updated => {
            if (updated) setLines(updated);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [policyId, member?.id, primaryCategoryCode]);

    // ✅ FIX: Refetch coverage when editing a DIFFERENT claim of the SAME member
    // The member useEffect above won't fire if member?.id didn't change, so we need this
    useEffect(() => {
        if (!editingClaimId || !policyId || !member?.id) return;
        const timer = setTimeout(() => {
            refetchCoverageOnEditRef.current(primaryCategoryCode);
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingClaimId]);

    const addLine = useCallback(() => { setLines(p => [...p, newLine()]); setIsDirty(true); }, []);
    const removeLine = useCallback((idx) => {
        setLines(p => p.length === 1 ? [newLine()] : p.filter((_, i) => i !== idx));
        setIsDirty(true);
    }, []);

    const totals = useMemo(() => {
        return lines.reduce((acc, l) => ({
            total: acc.total + (parseFloat(l.total) || 0),
            company: acc.company + (parseFloat(l.byCompany) || 0),
            employee: acc.employee + (parseFloat(l.byEmployee) || 0),
            refused: acc.refused + (l.rejected ? (parseFloat(l.total) || 0) : (parseFloat(l.refusedAmount) || 0))
        }), { total: 0, company: 0, employee: 0, refused: 0 });
    }, [lines]);

    const resetForm = useCallback(() => {
        setMember(null); setMemberInput(''); setDiagnosis('');
        setNotes(''); setLines([newLine()]);
        setApplyBenefits(true); setIsDirty(false);
        setServiceDate(''); setPreAuthId('');
        setManualCategoryEnabled(true); setPrimaryCategoryCode('CAT-OUTPAT');
        setIsClaimRejected(false); setRejectionInput('');
        setAttachments([]);
        // FIX: resetForm must also clear the editing state
        setEditingClaimId(null);
        setTimeout(() => memberRef.current?.focus(), 120);
    }, []);

    // ── أسباب الرفض من قاعدة البيانات ─────────────────────────────────────
    const { data: rejectionReasons = [], refetch: refetchReasons } = useQuery({
        queryKey: ['claim-rejection-reasons'],
        queryFn: claimRejectionReasonsService.getAll,
        staleTime: 60000
    });
    const [isSavingNewReason, setIsSavingNewReason] = useState(false);

    const openRejectDialog = (type, idx = null) => {
        if (isReadOnlyClaim) {
            enqueueSnackbar('المطالبة في وضع العرض فقط', { variant: 'info' });
            return;
        }
        setRejectType(type);
        setRejectIdx(idx);
        setRejectionInput(type === 'line' ? (lines[idx].rejectionReason || '') : (rejectionInput || ''));
        setRejectDialogOpen(true);
    };

    const saveNewReason = async () => {
        if (!rejectionInput?.trim()) return;
        const alreadyExists = rejectionReasons.some(r => r.reasonText === rejectionInput.trim());
        if (alreadyExists) return;
        setIsSavingNewReason(true);
        try {
            await claimRejectionReasonsService.create(rejectionInput.trim());
            await refetchReasons();
            enqueueSnackbar('✅ تم حفظ السبب الجديد في القائمة', { variant: 'success' });
        } catch {
            enqueueSnackbar('فشل حفظ السبب الجديد', { variant: 'error' });
        } finally {
            setIsSavingNewReason(false);
        }
    };

    const confirmRejection = () => {
        if (isReadOnlyClaim) {
            enqueueSnackbar('المطالبة في وضع العرض فقط', { variant: 'info' });
            return;
        }
        if (rejectType === 'claim') {
            if (!rejectionInput?.trim()) {
                enqueueSnackbar('يجب إدخال سبب الرفض', { variant: 'warning' });
                return;
            }
            setIsClaimRejected(true);
            setIsDirty(true);
        } else {
            if (!rejectionInput?.trim()) {
                enqueueSnackbar('يجب إدخال سبب رفض البند', { variant: 'warning' });
                return;
            }
            updateLine(rejectIdx, {
                rejected: true,
                rejectionReason: rejectionInput,
                partialRefusalEnabled: false,
                approvedAmountInput: '0.00'
            });
        }
        setRejectDialogOpen(false);
    };

    const handleSave = async ({ resetAfter = false, targetStatus = null } = {}) => {
        if (isReadOnlyClaim) {
            enqueueSnackbar('لا يمكن تعديل مطالبة معتمدة/مقفلة', { variant: 'warning' });
            return;
        }
        if (isSavingRef.current) return;
        if (!member) { enqueueSnackbar(t('claimEntry.validationMember'), { variant: 'error' }); return; }
        if (lines.some(l => !l.service && !l.serviceName)) { enqueueSnackbar(t('claimEntry.validationService'), { variant: 'error' }); return; }
        if (!isClaimRejected && lines.some(l => !l.rejected && (parseFloat(l.unitPrice) || 0) <= 0)) {
            enqueueSnackbar('يجب أن يكون سعر الوحدة أكبر من صفر لكل بند غير مرفوض', { variant: 'error' }); return;
        }

        isSavingRef.current = true;
        setSaving(true);
        try {
            const actualDate = serviceDate || todayIso;
            const activeLines = lines.filter(isPopulatedClaimLine);

            if (!activeLines.length) {
                enqueueSnackbar('أضف خدمة واحدة على الأقل قبل الحفظ', { variant: 'error' });
                setSaving(false);
                isSavingRef.current = false;
                return;
            }

            const invalidQuantityLine = activeLines.find((line) => !normalizePositiveInteger(line.quantity));
            if (invalidQuantityLine) {
                enqueueSnackbar('الكمية يجب أن تكون عدداً صحيحاً موجباً فقط مثل 1 أو 2 أو 3', { variant: 'error' });
                setSaving(false);
                isSavingRef.current = false;
                return;
            }

            const unresolvedLine = activeLines.find((line) => !line.service?.pricingItemId && !line.service?.medicalServiceId);
            if (unresolvedLine) {
                enqueueSnackbar('اختر الخدمة من قائمة العقد قبل الحفظ', { variant: 'error' });
                setSaving(false);
                isSavingRef.current = false;
                return;
            }

            // المرحلة 2.2: التحقق من انتهاء صلاحية الوثيقة
            if (policyInfo?.endDate && new Date(actualDate) > new Date(policyInfo.endDate)) {
                enqueueSnackbar(`⚠️ تاريخ الخدمة (${actualDate}) يتجاوز نهاية الوثيقة المحددة (${policyInfo.endDate}) — لا يمكن الحفظ`,
                    { variant: 'error', autoHideDuration: 6000 });
                setSaving(false);
                isSavingRef.current = false;
                return;
            }

            // المطالبة تعتبر REJECTED فقط عند رفض المطالبة ككل أو رفض جميع البنود بالكامل.
            const anyLineRejected = activeLines.some(l => l.rejected);
            const allLinesRejected = activeLines.length > 0 && activeLines.every(l => l.rejected);
            const effectivelyRejected = isClaimRejected || allLinesRejected;

            // إذا كانت المطالبة مرفوضة كلياً — يجب إدخال سبب رفض
            let effectiveRejectionReason = rejectionInput?.trim() || null;
            if (isClaimRejected && !effectiveRejectionReason) {
                enqueueSnackbar('يجب إدخال سبب رفض المطالبة قبل الحفظ', { variant: 'error' });
                setSaving(false);
                isSavingRef.current = false;
                return;
            }
            // للبنود المرفوضة كلياً فقط دون رفض المطالبة ككل، نأخذ أول سبب متاح.
            if (effectivelyRejected && !effectiveRejectionReason) {
                const autoReason = activeLines.find(l => l.rejectionReason)?.rejectionReason;
                effectiveRejectionReason = autoReason || 'تم رفض جميع بنود المطالبة';
            }

            const claimData = {
                memberId: member.id,
                providerId: parseInt(providerId),
                claimBatchId: currentBatch?.id, // Phase 11 Link
                serviceDate: actualDate,
                diagnosisDescription: diagnosis,
                notes,
                ...((effectivelyRejected || targetStatus === 'APPROVED')
                    ? { status: effectivelyRejected ? 'REJECTED' : 'APPROVED' }
                    : {}),
                ...(effectivelyRejected ? { rejectionReason: effectiveRejectionReason } : {}),
                preAuthorizationId: preAuthId ? parseInt(preAuthId) : null,
                manualCategoryEnabled,
                // Always send context category so backend can set appliedCategoryId on unmapped services
                primaryCategoryCode: primaryCategoryCode,
                lines: activeLines.map(l => ({
                    medicalServiceId: l.service?.medicalServiceId || null,
                    pricingItemId: l.service?.pricingItemId || null,
                    serviceCategoryId: l.service?.categoryId || null,
                    serviceCategoryName: l.service?.categoryName || null,
                    serviceName: l.serviceName || l.service?.serviceName || '',
                    serviceCode: l.serviceCode || l.service?.serviceCode || '',
                    notes: l.notes?.trim() || null,
                    quantity: normalizePositiveInteger(l.quantity) || 1,
                    unitPrice: getCanonicalUnitPrice(l),
                    refusedAmount: l.rejected ? null : (parseFloat(l.refusedAmount) || 0),
                    rejected: l.rejected || false,
                    rejectionReason: l.rejected ? (l.rejectionReason || null) : null
                }))
            };

            let resultClaimId;
            if (editingClaimId) {
                await claimsService.update(editingClaimId, claimData);
                resultClaimId = editingClaimId;
            } else {
                // FIX: Open/create batch here (on first save), NOT on page load
                // This ensures GET /current is truly read-only
                let batchForSave = currentBatch;
                if (!batchForSave) {
                    try {
                        batchForSave = await claimBatchesService.openOrGetBatch(
                            providerId, employerId, year, month
                        );
                        // Update the query cache so the UI reflects the new batch
                        queryClient.setQueryData(
                            ['claim-batch-current', providerId, employerId, month, year],
                            batchForSave
                        );
                    } catch (batchErr) {
                         enqueueSnackbar(`فشل فتح الدفعة: ${batchErr?.response?.data?.message || batchErr?.message}`, { variant: 'error' });
                         setSaving(false);
                         isSavingRef.current = false;
                         return;
                    }
                    claimData.claimBatchId = batchForSave?.id;
                }

                // 1. Create a Visit automatically for this manual entry (Backlog Flow)
                const visitData = {
                    memberId: member.id,
                    providerId: parseInt(providerId),
                    visitDate: actualDate,
                    doctorName: 'طبيب مناوب', // Mandatory for visit creation
                    visitType: 'LEGACY_BACKLOG', // Correct type for manual entry
                    notes: 'إنشاء تلقائي لمطالبة قديمة (Backlog)'
                };

                const visitResponse = await visitsService.create(visitData);
                const visitId = visitResponse.id;

                // 2. Link Claim to this Visit
                claimData.visitId = visitId;

                let claimResponse;
                try {
                    claimResponse = await claimsService.create(claimData);
                } catch (claimErr) {
                    // Rollback orphan visit if claim creation fails
                    try { await visitsService.remove(visitId); } catch (_) {}
                    throw claimErr;
                }
                resultClaimId = claimResponse.id;
            }

            // Upload attachments if any exist
            if (resultClaimId && attachments.length > 0) {
                for (const file of attachments) {
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('attachmentType', 'MEDICAL_REPORT');
                    try {
                        await claimsService.uploadAttachment(resultClaimId, fd);
                    } catch (attErr) {
                        console.error('Failed to upload attachment', attErr);
                        enqueueSnackbar(`فشل رفع المرفق: ${file.name}`, { variant: 'warning' });
                    }
                }
            }

            enqueueSnackbar(
                `✅ ${t('claimEntry.savedSuccess')} — #${resultClaimId}`,
                { variant: 'success' }
            );
            invalidateBatchData();
            setPage(0);
            if (resetAfter) {
                resetForm();
                setEditingClaimId(null);
            } else {
                setEditingClaimId(resultClaimId);
                // Keep isDirty as false after save
                setIsDirty(false);
            }
        } catch (err) {
            enqueueSnackbar(err.message || t('claimEntry.saveFailed'), { variant: 'error' });
        } finally {
            setSaving(false);
            isSavingRef.current = false;
        }
    };

    // ── حذف مطالبة من الشريط الجانبي ─────────────────────────────────────────
    const handleSwitchClaim = useCallback((claimId) => {
        if (isDirty) {
            if (!window.confirm('يوجد تعديلات غير محفوظة. هل تريد الانتقال بدون حفظ؟')) return;
        }
        if (claimId === null) resetForm();
        setEditingClaimId(claimId);
    }, [isDirty, resetForm]);

    const handleDeleteClaim = async (claimId, e) => {
        e.stopPropagation();
        setDeleteReasonInput('');
        setConfirmDeleteId(claimId);
    };

    const confirmDeleteClaim = async () => {
        const claimId = confirmDeleteId;
        if (!claimId) return;
        try {
            await claimsService.remove(claimId, { reason: deleteReasonInput?.trim() || undefined });
            enqueueSnackbar(`✅ تم نقل المطالبة #${claimId} إلى سجل المحذوفات`, { variant: 'success' });
            setConfirmDeleteId(null);
            setDeleteReasonInput('');
            setShowDeletedLog(true);
            invalidateBatchData();
            // ✅ FIX: Restore ceiling in current form after deletion
            // If the deleted claim used the same service, the remaining should go back up
            if (member?.id && policyId) {
                setTimeout(() => refetchCoverageOnEditRef.current(primaryCategoryCode), 200);
            }
        } catch (err) {
            enqueueSnackbar(err.message || 'فشل إلغاء المطالبة', { variant: 'error' });
        }
    };

    const handleRestoreClaim = (claimId, e) => {
        e.stopPropagation();
        setConfirmRestoreId(claimId);
    };

    const confirmRestoreClaim = async () => {
        const claimId = confirmRestoreId;
        if (!claimId) return;
        try {
            await claimsService.restore(claimId);
            enqueueSnackbar(`✅ تم استرجاع المطالبة #${claimId}`, { variant: 'success' });
            setConfirmRestoreId(null);
            invalidateBatchData();
            if (member?.id && policyId) {
                setTimeout(() => refetchCoverageOnEditRef.current(primaryCategoryCode), 200);
            }
        } catch (err) {
            enqueueSnackbar(err.message || 'فشل استرجاع المطالبة', { variant: 'error' });
        }
    };

    const handleHardDeleteClaim = (claimId, e) => {
        e.stopPropagation();
        setConfirmHardDeleteId(claimId);
    };

    const confirmHardDeleteClaim = async () => {
        const claimId = confirmHardDeleteId;
        if (!claimId) return;
        try {
            await claimsService.hardDelete(claimId);
            enqueueSnackbar(`✅ تم حذف المطالبة #${claimId} نهائياً`, { variant: 'success' });
            setConfirmHardDeleteId(null);
            invalidateBatchData();
            if (member?.id && policyId) {
                setTimeout(() => refetchCoverageOnEditRef.current(primaryCategoryCode), 200);
            }
        } catch (err) {
            enqueueSnackbar(err.message || 'فشل الحذف النهائي', { variant: 'error' });
        }
    };

    const detailUrl = `/claims/batches/detail?employerId=${employerId}&providerId=${providerId}&month=${month}&year=${year}`;
    const monthLabel = MONTHS_AR[(month || 1) - 1];

    return (
        <Box dir="rtl" sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 105px)', overflow: 'hidden' }}>

            {/* ═══ رأس الصفحة المضغوط ═══ */}
            <Box sx={{ flexShrink: 0, mb: 0.5 }}>
                <ModernPageHeader
                    title={`${t('claimEntry.pageTitle')} — ${monthLabel} ${year || ''}`}
                    subtitle={`${t('providers.singular')}: ${provider?.name || '...'} | الوثيقة: ${policyInfo?.name || policyInfo?.policyNumber || '...'} | رقم العقد: ${activeContract?.contractNumber || '—'} | المؤمن عليه: ${member?.fullName || '...'} (${member?.cardNumber || '—'})`}
                    icon={<ReceiptIcon />}
                    actions={
                        <Stack direction="row" spacing={1} alignItems="center">
                            {/* FIX: Back goes to detail page (same month view) */}
                            <Button variant="outlined" size="small" color="secondary"
                                startIcon={<BackIcon sx={{ ml: 1, mr: 0 }} />}
                                onClick={() => navigate(detailUrl)} sx={{}}>
                                {t('claimEntry.backToList')}
                            </Button>
                        </Stack>
                    }
                />
            </Box>

            {/* FIX: Show batch error as visible alert (not silent) */}
            {batchError && (
                <Alert severity="warning" variant="filled" sx={{ mx: '1.0rem', mb: 0.5 }}>
                    ⚠️ تعذّر تحميل بيانات الدفعة: {batchError?.response?.data?.message || batchError?.message || 'خطأ غير معروف'}
                    {batchError?.response?.status === 403 && ' — لا تملك صلاحية الوصول.'}
                </Alert>
            )}

            {/* ═══ المحتوى ═══ */}
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0, gap: '1.0rem', px: '1.0rem', pb: '0.4rem' }}>
                {/* ── النموذج الرئيسي (يمين الشاشة) ── */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    <Paper variant="outlined" sx={{
                        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                         boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                    }}>

                        {/* ── لوحة معلومات التعديل ── */}
                        {editingClaimId && (
                            <Box sx={{
                                px: '1.25rem', py: '0.6rem',
                                bgcolor: alpha(theme.palette.info.main, 0.08),
                                borderBottom: `1.5px solid ${alpha(theme.palette.info.main, 0.3)}`,
                                display: 'flex', alignItems: 'center', gap: '0.75rem'
                            }}>
                                <InfoIcon sx={{ color: 'info.main', fontSize: '1.25rem' }} />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={600} color="info.dark">
                                        {isReadOnlyClaim
                                            ? `أنت الآن في وضع العرض فقط (مطالبة #${editingClaimId})`
                                            : `أنت الآن في وضع التعديل (مطالبة #${editingClaimId})`}
                                    </Typography>
                                    <Typography variant="caption" color="info.main" fontWeight={400}>
                                        {isReadOnlyClaim
                                            ? 'المطالبة معتمدة/مقفلة؛ تم تعطيل جميع إجراءات التعديل.'
                                            : 'جاري تعديل بيانات المطالبة المختارة من الشريط الجانبي.'}
                                    </Typography>
                                </Box>
                                {!isReadOnlyClaim && (
                                    <Button size="small" color="info" variant="outlined"
                                        onClick={() => { resetForm(); setEditingClaimId(null); }}
                                        sx={{}}>
                                        إلغاء وتعديل جديد
                                    </Button>
                                )}
                            </Box>
                        )}

                        {/* ── شريط الحالة ── */}
                        <Box sx={{
                            flexShrink: 0, px: '1.25rem', py: 0.75,
                            bgcolor: isDirty ? alpha(theme.palette.warning.main, 0.07) : alpha(theme.palette.primary.main, 0.04),
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip size="small" variant="filled"
                                    label={isDirty ? t('claimEntry.statusDraft') : t('claimEntry.statusNew')}
                                    color={isDirty ? 'warning' : 'primary'}
                                    sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                                />
                                {policyInfo && (
                                    <Chip icon={<PolicyIcon sx={{ fontSize: '0.75rem' }} />} size="small"
                                        label={`${t('claimEntry.benefitPolicy')}: ${policyInfo.policyNumber || policyInfo.name || 'مفعّلة'}`}
                                        color="success" variant="outlined"
                                        sx={{ fontWeight: 400, fontSize: '0.7rem' }}
                                    />
                                )}
                                {isClaimRejected && (
                                    <Chip icon={<RejectIcon sx={{ fontSize: '0.75rem' }} />} size="small"
                                        label="مطالبة مرفوضة" color="error" variant="filled"
                                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                                    />
                                )}
                                {(isExpiredBatch || (currentBatch && currentBatch.status !== 'OPEN')) && !loadingBatchMeta && (
                                    <Chip icon={<LockIcon sx={{ fontSize: '0.75rem' }} />} size="small"
                                        label={isExpiredBatch ? `فترة منتهية (>${allowedBackdatedMonths} أشهر)` : "الدفعة مغلقة — تعديل فقط"} 
                                        color="secondary" variant="filled"
                                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                                    />
                                )}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<HistoryIcon sx={{ fontSize: '0.8125rem' }} />}
                                    onClick={() => setBatchSidebarOpen(true)}
                                    sx={{ fontWeight: 500, fontSize: '0.75rem', py: 0.3 }}
                                >
                                    سجل الدفعة {batchTotal ? `(${batchTotal})` : ''}
                                </Button>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ minWidth: '16rem', maxWidth: '20rem' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.72rem' }}>
                                        رقم الموافقة
                                    </Typography>
                                    <Autocomplete
                                        size="small"
                                        fullWidth
                                        options={preAuthResults?.items || []}
                                        loading={searchingPreAuth}
                                        disabled={isReadOnlyClaim}
                                        value={preAuthResults?.items?.find(pa => pa.id === parseInt(preAuthId, 10)) || null}
                                        onInputChange={(_, v) => setPreAuthSearch(v)}
                                        onChange={(_, v) => {
                                            setPreAuthId(v?.id || '');
                                            setIsDirty(true);
                                        }}
                                        getOptionLabel={o => `[${o.preAuthNumber || o.id}] ${o.medicalServiceName || ''}`}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                variant="standard"
                                                placeholder="ابحث برقم الموافقة..."
                                                inputProps={{ ...params.inputProps, style: { textAlign: 'right' } }}
                                            />
                                        )}
                                        noOptionsText="لا توجد موافقات مسبقة"
                                    />
                                </Box>

                                <Box sx={{ minWidth: '15rem', maxWidth: '18rem' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.72rem' }}>
                                        سياق التغطية
                                    </Typography>
                                    <Autocomplete
                                        size="small"
                                        options={rootCategories || []}
                                        value={rootCategories?.find(c => c.code === primaryCategoryCode) || null}
                                        disabled={isReadOnlyClaim}
                                        getOptionLabel={(o) => o.name || o.nameAr || o.code || ''}
                                        isOptionEqualToValue={(opt, val) => opt?.code === val?.code}
                                        onChange={(_, v) => {
                                            const newCode = v?.code || 'CAT-OUTPAT';
                                            setPrimaryCategoryCode(newCode);
                                            setManualCategoryEnabled(Boolean(v));
                                            setIsDirty(true);
                                            refetchAllLinesCoverage(newCode, linesRef.current);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                variant="standard"
                                                placeholder="اختر سياق التغطية"
                                                inputProps={{ ...params.inputProps, style: { textAlign: 'right' } }}
                                            />
                                        )}
                                        noOptionsText="لا توجد تصنيفات"
                                    />
                                </Box>

                                <Box sx={{ minWidth: '10.5rem', maxWidth: '12rem' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.72rem' }}>
                                        تاريخ الخدمة
                                    </Typography>
                                    <TextField
                                        size="small"
                                        type="date"
                                        variant="standard"
                                        value={serviceDate || ''}
                                        disabled={isReadOnlyClaim}
                                        onChange={(e) => {
                                            setServiceDate(e.target.value || '');
                                            setIsDirty(true);
                                        }}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.25, fontSize: '0.65rem', color: 'text.secondary' }}>
                                        يترك فارغاً لاستخدام تاريخ الجهاز
                                    </Typography>
                                </Box>

                                <Box sx={{
                                    px: 1.25,
                                    py: 0.6,
                                    minWidth: '16rem',
                                    borderRadius: 1,
                                    bgcolor: alpha('#00867d', 0.06),
                                    border: '1px solid',
                                    borderColor: alpha('#00867d', 0.2)
                                }}>
                                    <Typography variant="caption" sx={{ color: '#004d40', fontWeight: 600, display: 'block', mb: 0.3, fontSize: '0.72rem' }}>
                                        التغطية السنوية المتبقية
                                    </Typography>
                                    {loadingSummary ? (
                                        <Typography variant="caption" color="text.secondary">جاري التحميل...</Typography>
                                    ) : memberFinancialSummary ? (
                                        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#00695c', fontSize: '0.95rem' }}>
                                                {memberFinancialSummary.remainingCoverage?.toFixed(2) || '0.00'} د.ل
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={`${memberFinancialSummary.utilizationPercent?.toFixed(1) || '0.0'}% مستهلك`}
                                                color={memberFinancialSummary.utilizationPercent > 80 ? 'error' : 'success'}
                                                sx={{ height: '1.2rem', fontSize: '0.68rem', fontWeight: 600 }}
                                            />
                                        </Stack>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">— اختر مستفيداً —</Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        {/* ── حقول الرأس (مكون منفصل) ── */}
                        <Box sx={{ flexShrink: 0, px: '1.25rem', py: '0.75rem', bgcolor: 'background.paper' }}>
                            <ClaimHeaderFields
                                member={member}
                                setMember={setMember}
                                memberOptions={memberOptions}
                                searchingMember={searchingMember}
                                setMemberInput={setMemberInput}
                                memberRef={memberRef}
                                diagnosis={diagnosis}
                                setDiagnosis={setDiagnosis}
                                primaryCategoryCode={primaryCategoryCode}
                                setPrimaryCategoryCode={setPrimaryCategoryCode}
                                setManualCategoryEnabled={setManualCategoryEnabled}
                                rootCategories={rootCategories}
                                refetchAllLinesCoverage={refetchAllLinesCoverage}
                                linesRef={linesRef}
                                preAuthResults={preAuthResults}
                                searchingPreAuth={searchingPreAuth}
                                preAuthId={preAuthId}
                                setPreAuthId={setPreAuthId}
                                setPreAuthSearch={setPreAuthSearch}
                                setIsDirty={setIsDirty}
                                financialSummary={memberFinancialSummary}
                                loadingSummary={loadingSummary}
                                showPreAuthSelector={false}
                                showCoverageContext={false}
                                showFinancialSummary={false}
                                readOnly={isReadOnlyClaim}
                                t={t}
                            />
                        </Box>

                        <Divider />

                        <Box sx={{
                            flexShrink: 0, px: '1.25rem', py: 0.75, bgcolor: alpha('#E8F5F1', 0.55),
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderBottom: `1px solid ${theme.palette.divider}`
                        }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" fontWeight={600} color="#0D4731" sx={{ fontSize: '0.85rem' }}>
                                    {t('claimEntry.serviceLines')}
                                </Typography>
                                <Chip size="small" variant="outlined" label={`${serviceOptions.length} خدمة من العقد`} sx={{ fontWeight: 400, fontSize: '0.75rem' }} />
                            </Stack>
                            <Chip size="small" variant="outlined" label={`${lines.length} بند`} sx={{ fontWeight: 400, fontSize: '0.75rem' }} />
                        </Box>

                        <TableContainer dir="rtl" sx={{ flex: 1, overflow: 'auto' }}>
                            <Table dir="rtl" size="small" stickyHeader sx={{ minWidth: '47.5rem' }}>
                                <TableHead>
                                    <TableRow>
                                        <TH align="center" w={40}>#</TH>
                                        <TH align="center" w={280}>الخدمة الطبية</TH>
                                        <TH align="center" w={45}>الكمية</TH>
                                        <TH align="center" w={70}>سعر الوحدة</TH>
                                        <TH align="center" w={60}>التحمل %</TH>
                                        <TH align="center" w={110}>سقف المنفعة</TH>
                                        <TH align="center" w={110}> المتبقي من السقف </TH>
                                        <TH align="center" w={95}>الموافق عليه</TH>
                                        <TH align="center" w={100}>شركة / مشترك</TH>
                                        <TH align="center" w={80}>الإجمالي</TH>
                                        <TH align="center" w={180}>ملاحظات الخدمة</TH>
                                        <TH align="left" w={40}></TH>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {lines.map((line, idx) => (
                                        <ClaimLineRow
                                            key={line.id}
                                            line={line}
                                            idx={idx}
                                            theme={theme}
                                            serviceOptions={serviceOptions}
                                            serviceCategoryOptions={serviceCategoryOptions}
                                            loadingServices={loadingServices}
                                            updateLine={updateLine}
                                            handleServiceChange={handleServiceChange}
                                            removeLine={removeLine}
                                            openRejectDialog={openRejectDialog}
                                            policyInfo={policyInfo}
                                            readOnly={isReadOnlyClaim}
                                        />
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={12} sx={{ py: 1, textAlign: 'center' }}>
                                            {!isReadOnlyClaim && (
                                                <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ fontWeight: 500 }}>
                                                    {t('claimEntry.addLine')}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* ── ذيل المطالبة والمجاميع (مكون منفصل) ── */}
                        <ClaimTotalsFooter
                            isClaimRejected={isClaimRejected}
                            handleSave={handleSave}
                            saving={saving}
                            isDirty={isDirty}
                            setIsClaimRejected={setIsClaimRejected}
                            setIsDirty={setIsDirty}
                            setRejectionInput={setRejectionInput}
                            openRejectDialog={openRejectDialog}
                            totals={totals}
                            theme={theme}
                            lines={lines}
                            readOnly={isReadOnlyClaim}
                            t={t}
                        />
                    </Paper>
                </Box>
            </Box>

            <Drawer
                anchor="left"
                open={batchSidebarOpen}
                onClose={() => setBatchSidebarOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100vw', sm: '24rem' },
                        maxWidth: '100%'
                    }
                }}
            >
                <BatchHistorySidebar
                    loadingBatch={loadingBatch}
                    batchContent={batchContent}
                    loadingDeleted={loadingDeletedBatch}
                    deletedContent={deletedBatchContent}
                    editingClaimId={editingClaimId}
                    onSwitchClaim={(claimId) => {
                        handleSwitchClaim(claimId);
                        setBatchSidebarOpen(false);
                    }}
                    handleDeleteClaim={handleDeleteClaim}
                    onRestoreClaim={handleRestoreClaim}
                    onHardDeleteClaim={handleHardDeleteClaim}
                    batchData={batchData}
                    deletedData={deletedBatchData}
                    page={page}
                    setPage={setPage}
                    deletedPage={deletedPage}
                    setDeletedPage={setDeletedPage}
                    monthLabel={monthLabel}
                    year={year}
                    theme={theme}
                    navigate={navigate}
                    detailUrl={detailUrl}
                    currentBatch={currentBatch}
                    isBatchOpen={!isExpiredBatch && (!currentBatch || currentBatch.status === 'OPEN')}
                    showDeletedLog={showDeletedLog}
                    setShowDeletedLog={setShowDeletedLog}
                    readOnly={isReadOnlyClaim}
                    t={t}
                    onClose={() => setBatchSidebarOpen(false)}
                    containerSx={{ width: '100%', height: '100%' }}
                />
            </Drawer>

            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: '0.375rem' } }}>
                <DialogTitle sx={{ fontWeight: 700, color: 'error.main', pb: 1 }}>
                    {rejectType === 'claim' ? 'رفض المطالبة — تحديد السبب' : 'رفض البند — تحديد السبب'}
                </DialogTitle>
                <DialogContent sx={{ pt: '0.75rem !important' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        اختر سبباً من القائمة أو اكتب سبباً جديداً
                    </Typography>
                    <Autocomplete
                        freeSolo
                        options={rejectionReasons.map(r => r.reasonText)}
                        value={rejectionInput}
                        onChange={(_, val) => setRejectionInput(val || '')}
                        onInputChange={(_, val) => setRejectionInput(val)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                autoFocus
                                fullWidth
                                size="small"
                                label="سبب الرفض"
                                placeholder="اختر أو اكتب سبباً..."
                                error={!rejectionInput?.trim()}
                            />
                        )}
                        noOptionsText="لا توجد أسباب — اكتب سبباً جديداً"
                    />
                    {rejectionInput?.trim() && !rejectionReasons.some(r => r.reasonText === rejectionInput.trim()) && (
                        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                سبب جديد — يمكنك حفظه في القائمة:
                            </Typography>
                            <Button
                                size="small"
                                startIcon={isSavingNewReason ? <CircularProgress size={12} /> : <AddReasonIcon sx={{ fontSize: '0.9rem' }} />}
                                onClick={saveNewReason}
                                disabled={isSavingNewReason}
                                sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                            >
                                حفظ في القائمة
                            </Button>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: '1.0rem', gap: 1 }}>
                    <Button onClick={() => setRejectDialogOpen(false)} color="inherit">إلغاء</Button>
                    <Button onClick={confirmRejection} variant="contained" color="error"
                        disabled={!rejectionInput?.trim()}>
                        تأكيد الرفض
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <DialogTitle sx={{ fontWeight: 600 }}>تأكيد حذف المطالبة (حذف ناعم)</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 1.25 }}>
                        سيتم نقل المطالبة رقم #{confirmDeleteId} إلى سجل المحذوفات ويمكن استرجاعها لاحقاً.
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        label="سبب الحذف"
                        placeholder="اكتب سبب الحذف (اختياري)"
                        value={deleteReasonInput}
                        onChange={(e) => setDeleteReasonInput(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: '1.0rem' }}>
                    <Button onClick={() => setConfirmDeleteId(null)} color="inherit">تراجع</Button>
                    <Button onClick={confirmDeleteClaim} variant="contained" color="error">نقل إلى المحذوفات</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!confirmRestoreId} onClose={() => setConfirmRestoreId(null)}>
                <DialogTitle sx={{ fontWeight: 600 }}>تأكيد استرجاع المطالبة</DialogTitle>
                <DialogContent>
                    هل تريد استرجاع المطالبة رقم #{confirmRestoreId} من سجل المحذوفات؟
                </DialogContent>
                <DialogActions sx={{ p: '1.0rem' }}>
                    <Button onClick={() => setConfirmRestoreId(null)} color="inherit">إلغاء</Button>
                    <Button onClick={confirmRestoreClaim} variant="contained" color="success">استرجاع</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!confirmHardDeleteId} onClose={() => setConfirmHardDeleteId(null)}>
                <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>تأكيد الحذف النهائي</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        سيتم حذف المطالبة رقم #{confirmHardDeleteId} نهائياً من قاعدة البيانات، ولا يمكن التراجع عن هذا الإجراء.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: '1.0rem' }}>
                    <Button onClick={() => setConfirmHardDeleteId(null)} color="inherit">إلغاء</Button>
                    <Button onClick={confirmHardDeleteClaim} variant="contained" color="error">حذف نهائي</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}




