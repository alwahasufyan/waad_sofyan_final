import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Tab,
    Tabs,
    Typography,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Alert,
    CircularProgress,
    Divider,
    Chip,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    History as HistoryIcon,
    Receipt as ReceiptIcon,
    Person as PersonIcon,
    LocalHospital as HospitalIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import MainCard from 'components/MainCard';
import { ModernPageHeader } from 'components/tba';
import { backlogService, membersService, providersService } from 'services/api';
import unifiedMembersService from 'services/api/unified-members.service';
import { getBenefitPoliciesSelector } from 'services/api/benefit-policies.service';
import { getActiveContractByProvider, getContractPricingItems } from 'services/api/provider-contracts.service';
import useAuth from 'hooks/useAuth';
import MedicalServiceSelector from 'components/tba/MedicalServiceSelector';
import { uploadFile } from 'services/api/files.service';

// ==============================|| BACKLOG CLAIMS PAGE ||============================== //

export default function BacklogClaims() {
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [benefitPolicies, setBenefitPolicies] = useState([]);
    const [policiesLoading, setPoliciesLoading] = useState(false);
    const [selectedPolicyId, setSelectedPolicyId] = useState('');

    // Tabs state
    const [tabValue, setTabValue] = useState(0);

    // Manual Entry States
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [providerPricing, setProviderPricing] = useState([]);
    const [pricingLoading, setPricingLoading] = useState(false);

    // Add Service Modal
    const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
    const [newServiceForm, setNewServiceForm] = useState({
        medicalService: null,
        grossAmount: ''
    });

    // Attachments
    const [attachments, setAttachments] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [memberOptions, setMemberOptions] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);

    const [providerOptions, setProviderOptions] = useState([]);
    const [providersLoading, setProvidersLoading] = useState(false);

    const [form, setForm] = useState({
        memberId: '',
        providerId: '',
        serviceDate: new Date().toISOString().split('T')[0],
        legacyReferenceNumber: '',
        notes: '',
        doctorName: '',
        diagnosis: '',
        networkStatus: 'IN_NETWORK',
        lines: [{ serviceCode: '', serviceName: '', quantity: 1, grossAmount: 0, coveredAmount: 0 }]
    });

    const [submitting, setSubmitting] = useState(false);

    // Excel Import States
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // Load providers on mount
    useEffect(() => {
        const fetchProviders = async () => {
            setProvidersLoading(true);
            try {
                const data = await providersService.getSelector();
                setProviderOptions(data || []);
            } catch (err) {
                enqueueSnackbar('فشل تحميل قائمة موفري الخدمة', { variant: 'error' });
            } finally {
                setProvidersLoading(false);
            }
        };
        fetchProviders();
    }, []);

    // Member search handler
    useEffect(() => {
        if (!memberSearchQuery || memberSearchQuery.length < 3) {
            setMemberOptions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setMembersLoading(true);
            try {
                const criteria = {
                    fullName: memberSearchQuery,
                    page: 0,
                    size: 50
                };
                if (selectedPolicyId) {
                    criteria.benefitPolicyId = selectedPolicyId;
                }
                // Using unifiedMembersService for advanced filtering
                const response = await unifiedMembersService.searchMembers(criteria);
                // Unified members search returns a Page object or data content
                const content = response.content || response.data?.content || response.data || response || [];
                setMemberOptions(Array.isArray(content) ? content : []);
            } catch (err) {
                console.error('Member search failed:', err);
                setMemberOptions([]);
            } finally {
                setMembersLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [memberSearchQuery, selectedPolicyId]);

    // Load benefit policies on mount
    useEffect(() => {
        const fetchPolicies = async () => {
            setPoliciesLoading(true);
            try {
                const policies = await getBenefitPoliciesSelector();
                setBenefitPolicies(policies || []);
            } catch (err) {
                console.error('Failed to fetch policies:', err);
                enqueueSnackbar('فشل تحميل وثائق التغطية', { variant: 'error' });
            } finally {
                setPoliciesLoading(false);
            }
        };
        fetchPolicies();
    }, []);

    // Handlers
    const handleTabChange = (event, newValue) => setTabValue(newValue);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Fetch provider pricing when provider changes
    useEffect(() => {
        const fetchPricing = async () => {
            if (!form.providerId) {
                setProviderPricing([]);
                return;
            }

            setPricingLoading(true);
            try {
                const contract = await getActiveContractByProvider(form.providerId);
                const contractId = contract?.id || contract?.data?.id;
                if (contractId) {
                    const pricing = await getContractPricingItems(contractId, { size: 1000 });
                    setProviderPricing(pricing.content || pricing || []);
                } else {
                    setProviderPricing([]);
                }
            } catch (err) {
                console.error('Failed to fetch pricing:', err);
                setProviderPricing([]);
            } finally {
                setPricingLoading(false);
            }
        };

        fetchPricing();
    }, [form.providerId]);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingFiles(true);
        try {
            const uploaded = [];
            for (const file of files) {
                const res = await uploadFile(file, 'backlog_claims');
                uploaded.push({
                    id: res.id || res.uuid,
                    name: file.name,
                    size: file.size,
                    url: res.url
                });
            }
            setAttachments((prev) => [...prev, ...uploaded]);
            enqueueSnackbar(`تم رفع ${files.length} ملفات بنجاح`, { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('فشل رفع الملفات', { variant: 'error' });
        } finally {
            setUploadingFiles(false);
        }
    };

    const removeAttachment = (id) => {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...form.lines];
        newLines[index][field] = value;
        setForm((prev) => ({ ...prev, lines: newLines }));
    };

    const addLine = (serviceData = null) => {
        const newLine = serviceData ? {
            serviceCode: serviceData.code || serviceData.medicalService?.code,
            serviceName: serviceData.name || serviceData.medicalService?.name,
            quantity: 1,
            grossAmount: serviceData.contractPrice || 0,
            coveredAmount: serviceData.contractPrice || 0
        } : { serviceCode: '', serviceName: '', quantity: 1, grossAmount: 0, coveredAmount: 0 };

        setForm((prev) => ({
            ...prev,
            lines: [...prev.lines, newLine]
        }));
    };

    const removeLine = (index) => {
        const newLines = form.lines.filter((_, i) => i !== index);
        setForm((prev) => ({ ...prev, lines: newLines }));
    };

    const handleSubmitManual = async () => {
        if (!form.memberId || !form.providerId || form.lines.some(l => !l.serviceCode || l.grossAmount <= 0)) {
            enqueueSnackbar('يرجى إكمال جميع الحقول المطلوبة', { variant: 'warning' });
            return;
        }

        setSubmitting(true);
        try {
            await backlogService.createManual(form);
            enqueueSnackbar('تم إنشاء المطالبة المتراكمة بنجاح', { variant: 'success' });
            // Reset form
            setForm({
                memberId: '',
                providerId: '',
                serviceDate: new Date().toISOString().split('T')[0],
                legacyReferenceNumber: '',
                notes: '',
                doctorName: '',
                diagnosis: '',
                networkStatus: 'IN_NETWORK',
                lines: [{ serviceCode: '', serviceName: '', quantity: 1, grossAmount: 0, coveredAmount: 0 }]
            });
            setSelectedMember(null);
        } catch (err) {
            enqueueSnackbar(err.message || 'فشل إنشاء المطالبة', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setImportResult(null);
        }
    };

    const handleImportExcel = async () => {
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const result = await backlogService.importExcel(formData);
            setImportResult(result);
            enqueueSnackbar('اكتملت عملية الاستيراد', { variant: 'info' });
        } catch (err) {
            enqueueSnackbar(err.message || 'فشل استيراد الملف', { variant: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const totalAmount = form.lines.reduce((sum, line) => sum + (Number(line.grossAmount) || 0), 0);

    return (
        <Box>
            <ModernPageHeader
                title="المطالبـات المتراكمـة (Backlog)"
                subtitle="إدخال ومعالجة المطالبات الورقية القديمة للمنظومة"
                icon={<HistoryIcon />}
                breadcrumbs={[{ label: 'الرئيسية', path: '/dashboard' }, { label: 'المطالبات المتراكمة' }]}
            />

            <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tab label="إدخال يدوي (Manual Entry)" id="backlog-tab-0" />
                <Tab label="استيراد من Excel (Excel Import)" id="backlog-tab-1" />
            </Tabs>

            {/* Manual Entry Tab */}
            {tabValue === 0 && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <MainCard title="بيانات المطالبة الأساسية">
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <FormControl fullWidth required>
                                        <InputLabel>وثيقة التغطية (Document)</InputLabel>
                                        <Select
                                            value={selectedPolicyId}
                                            onChange={(e) => {
                                                setSelectedPolicyId(e.target.value);
                                                // Reset member if policy changes
                                                setSelectedMember(null);
                                                setForm(prev => ({ ...prev, memberId: '' }));
                                            }}
                                            label="وثيقة التغطية (Document)"
                                            startAdornment={<AssignmentIcon color="action" sx={{ mr: 1, ml: 1 }} />}
                                        >
                                            <MenuItem value="">-- اختر الوثيقة --</MenuItem>
                                            {policiesLoading ? (
                                                <MenuItem disabled>جاري التحميل...</MenuItem>
                                            ) : (
                                                benefitPolicies.map((p) => (
                                                    <MenuItem key={p.id} value={p.id}>
                                                        {p.label} ({p.policyCode})
                                                    </MenuItem>
                                                ))
                                            )}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Autocomplete
                                        options={memberOptions}
                                        getOptionLabel={(option) => `${option.fullName} (${option.cardNumber || 'N/A'}) - ${option.civilId || ''}`}
                                        loading={membersLoading}
                                        onInputChange={(e, value) => {
                                            setMemberSearchQuery(value);
                                        }}
                                        onChange={(e, value) => {
                                            setSelectedMember(value);
                                            setForm(prev => ({ ...prev, memberId: value?.id || '' }));
                                        }}
                                        value={selectedMember}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="ابحث عن المنتفع (الاسم أو الرقم)"
                                                required
                                                placeholder={selectedPolicyId ? "أدخل 3 أحرف للبحث..." : "يرجى اختيار الوثيقة أولاً..."}
                                                disabled={!selectedPolicyId}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <PersonIcon color="action" />
                                                            {params.InputProps.startAdornment}
                                                        </Stack>
                                                    ),
                                                    endAdornment: (
                                                        <>
                                                            {membersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    )
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FormControl fullWidth required>
                                        <InputLabel>مقدم الخدمة</InputLabel>
                                        <Select
                                            name="providerId"
                                            value={form.providerId}
                                            onChange={handleInputChange}
                                            label="مقدم الخدمة"
                                            startAdornment={<HospitalIcon color="action" sx={{ mr: 1, ml: 1 }} />}
                                        >
                                            {providersLoading ? (
                                                <MenuItem disabled>جاري التحميل...</MenuItem>
                                            ) : (
                                                providerOptions.map((p) => (
                                                    <MenuItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </MenuItem>
                                                ))
                                            )}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="تاريخ الخدمة"
                                        type="date"
                                        name="serviceDate"
                                        value={form.serviceDate}
                                        onChange={handleInputChange}
                                        required
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="رقم المرجع (الرقم الورقي)"
                                        name="legacyReferenceNumber"
                                        value={form.legacyReferenceNumber}
                                        onChange={handleInputChange}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="اسم الطبيب"
                                        name="doctorName"
                                        value={form.doctorName}
                                        onChange={handleInputChange}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="التشخيص"
                                        name="diagnosis"
                                        value={form.diagnosis}
                                        onChange={handleInputChange}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>حالة الشبكة</InputLabel>
                                        <Select
                                            name="networkStatus"
                                            value={form.networkStatus}
                                            onChange={handleInputChange}
                                            label="حالة الشبكة"
                                        >
                                            <MenuItem value="IN_NETWORK">داخل الشبكة (In-Network)</MenuItem>
                                            <MenuItem value="OUT_OF_NETWORK">خارج الشبكة (Out-of-Network)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid size={12}>
                                    <TextField
                                        fullWidth
                                        label="ملاحظات"
                                        name="notes"
                                        value={form.notes}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={2}
                                    />
                                </Grid>
                            </Grid>
                        </MainCard>

                        <MainCard sx={{ mt: 3 }}>
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h5">بنود الخدمات</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        startIcon={<AddIcon />}
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => setAddServiceDialogOpen(true)}
                                        size="small"
                                        disabled={!form.providerId}
                                    >
                                        إضافة خدمة من النظام
                                    </Button>
                                    <Button startIcon={<AddIcon />} variant="outlined" onClick={() => addLine()} size="small">
                                        إضافة بند يدوي
                                    </Button>
                                </Stack>
                            </Box>

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow><TableCell width="60%">الخدمة (من قائمة أسعار الجهة)</TableCell><TableCell width="10%" align="center">الكمية</TableCell><TableCell width="25%" align="right">المبلغ المطلوب</TableCell><TableCell width="5%" align="center"></TableCell></TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {form.lines.map((line, index) => (
                                            <TableRow key={index}><TableCell><Autocomplete
                                                size="small"
                                                options={providerPricing}
                                                getOptionLabel={(option) => `[${option.code || option.medicalService?.code}] ${option.name || option.medicalService?.nameAr || option.medicalService?.nameEn || ''}`}
                                                loading={pricingLoading}
                                                onChange={(e, value) => {
                                                    if (value) {
                                                        handleLineChange(index, 'serviceCode', value.code || value.medicalService?.code);
                                                        handleLineChange(index, 'serviceName', value.name || value.medicalService?.nameAr || value.medicalService?.nameEn);
                                                        handleLineChange(index, 'grossAmount', value.contractPrice || 0);
                                                        handleLineChange(index, 'coveredAmount', value.contractPrice || 0);
                                                    }
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        placeholder="اختر الخدمة..."
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            endAdornment: (
                                                                <>
                                                                    {pricingLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                                    {params.InputProps.endAdornment}
                                                                </>
                                                            )
                                                        }}
                                                    />
                                                )}
                                            /></TableCell><TableCell align="center"><TextField
                                                type="number"
                                                size="small"
                                                value={line.quantity}
                                                onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                                                sx={{ width: 70 }}
                                            /></TableCell><TableCell align="right"><TextField
                                                type="number"
                                                size="small"
                                                value={line.grossAmount}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    const newLines = [...form.lines];
                                                    newLines[index].grossAmount = val;
                                                    newLines[index].coveredAmount = val;
                                                    setForm(prev => ({ ...prev, lines: newLines }));
                                                }}
                                                sx={{ width: 120 }}
                                                InputProps={{
                                                    endAdornment: <Typography variant="caption" sx={{ ml: 0.5 }}>د.ل</Typography>
                                                }}
                                            /></TableCell><TableCell align="center"><IconButton size="small" color="error" onClick={() => removeLine(index)}><DeleteIcon fontSize="small" /></IconButton></TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <Typography variant="h5" sx={{ mr: 2 }}>إجمالي المطالبة:</Typography>
                                <Typography variant="h4" color="primary" fontWeight={700}>{totalAmount.toFixed(2)} د.ل</Typography>
                            </Box>
                        </MainCard>

                        <MainCard title="الوثائق والمرفقات" sx={{ mt: 3 }}>
                            <Box sx={{ mb: 2 }}>
                                <input
                                    type="file"
                                    multiple
                                    hidden
                                    id="claim-attachments"
                                    onChange={handleFileChange}
                                    disabled={uploadingFiles}
                                />
                                <label htmlFor="claim-attachments">
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        startIcon={uploadingFiles ? <CircularProgress size={20} /> : <UploadIcon />}
                                        disabled={uploadingFiles}
                                    >
                                        {uploadingFiles ? 'جاري الرفع...' : 'إرفاق وثائق (صور، PDF)'}
                                    </Button>
                                </label>
                            </Box>

                            {attachments.length > 0 && (
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {attachments.map((file) => (
                                        <Chip
                                            key={file.id}
                                            label={file.name}
                                            onDelete={() => removeAttachment(file.id)}
                                            color="primary"
                                            variant="outlined"
                                            sx={{ mb: 1 }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </MainCard>

                        <Box sx={{ mt: 4 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="large"
                                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                onClick={handleSubmitManual}
                                disabled={submitting}
                            >
                                {submitting ? 'جاري الحفظ...' : 'حفظ المطالبة المتراكمة'}
                            </Button>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 4 }}>
                        <MainCard title="معلومات هامة">
                            <Stack spacing={2}>
                                <Alert severity="info" variant="outlined">
                                    <b>Visit-Centric:</b> سيقوم النظام تلقائياً بإنشاء "زيارة ظل" (Shadow Visit) لربط هذه المطالبة بها، لضمان توافق البيانات.
                                </Alert>
                                <Alert severity="warning" variant="outlined">
                                    <b>الوضع المالي:</b> سيتم إنشاء المطالبة بحالة "SETTLED" (مسواة) مباشرة لأنها مطالبة قديمة مدفوعة مسبقاً، ولن تمر عبر دورة المراجعة الطبية الحالية.
                                </Alert>
                                <Divider />
                                <Typography variant="subtitle2" color="text.secondary">
                                    - تأكد من صحة رقم المرجع الورقي لسهولة العودة للملفات الحقيقية.
                                    <br />
                                    - رمز الخدمة يساعد في التبويب الإحصائي للخدمات المقدمة قديماً.
                                </Typography>
                            </Stack>
                        </MainCard>
                    </Grid>
                </Grid>
            )}

            {/* Excel Import Tab */}
            {tabValue === 1 && (
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <MainCard title="رفع ملف Excel">
                            <Box
                                sx={{
                                    border: '2px dashed',
                                    borderColor: file ? 'primary.main' : 'divider',
                                    borderRadius: 2,
                                    p: 4,
                                    textAlign: 'center',
                                    bgcolor: 'grey.50',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    '&:hover': { bgcolor: 'grey.100', borderColor: 'primary.main' }
                                }}
                                onClick={() => document.getElementById('excel-upload').click()}
                            >
                                <input
                                    type="file"
                                    id="excel-upload"
                                    hidden
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                />
                                <UploadIcon sx={{ fontSize: 48, color: file ? 'primary.main' : 'text.secondary', mb: 2 }} />
                                <Typography variant="h6">
                                    {file ? file.name : 'اضغط هنا أو اسحب الملف لرفعه'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    يدعم التنسيقات .xlsx, .xls فقط
                                </Typography>
                            </Box>

                            <Box sx={{ mt: 3 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="primary"
                                    startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                                    onClick={handleImportExcel}
                                    disabled={!file || uploading}
                                >
                                    {uploading ? 'جاري الاستيراد...' : 'بدء عملية الاستيراد'}
                                </Button>
                            </Box>
                        </MainCard>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <MainCard title="تنسيق الملف المطلوب">
                            <Typography variant="body2" paragraph>
                                يجب أن يحتوي ملف Excel على الأعمدة التالية بالترتيب:
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell>العمود</TableCell>
                                            <TableCell>الوصف</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow><TableCell>A: Member Code</TableCell><TableCell>رقم البطاقة أو الرقم المدني</TableCell></TableRow>
                                        <TableRow><TableCell>B: Provider ID/Name</TableCell><TableCell>معرف مقدم الخدمة أو اسمه</TableCell></TableRow>
                                        <TableRow><TableCell>C: Service Date</TableCell><TableCell>تاريخ الخدمة (YYYY-MM-DD)</TableCell></TableRow>
                                        <TableRow><TableCell>D: Doctor Name</TableCell><TableCell>اسم الطبيب</TableCell></TableRow>
                                        <TableRow><TableCell>E: Diagnosis</TableCell><TableCell>التشخيص</TableCell></TableRow>
                                        <TableRow><TableCell>F: Legacy Ref</TableCell><TableCell>رقم المرجع الورقي القديم</TableCell></TableRow>
                                        <TableRow><TableCell>G: Service Code</TableCell><TableCell>رمز الخدمة (CPT/Internal)</TableCell></TableRow>
                                        <TableRow><TableCell>H: Quantity</TableCell><TableCell>الكمية (رقم)</TableCell></TableRow>
                                        <TableRow><TableCell>I: Gross Amount</TableCell><TableCell>المبلغ المطلوب للوحدة</TableCell></TableRow>
                                        <TableRow><TableCell>J: Approved Amount</TableCell><TableCell>المبلغ المعتمد للوحدة</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </MainCard>
                    </Grid>

                    {importResult && (
                        <Grid size={12}>
                            <MainCard title="نتائج الاستيراد">
                                <Box sx={{ mb: 3, display: 'flex', gap: 3 }}>
                                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', flex: 1, borderColor: 'success.main' }}>
                                        <Typography color="success.main" variant="h3">{importResult.successCount}</Typography>
                                        <Typography variant="subtitle2">عمليات ناجحة</Typography>
                                    </Paper>
                                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', flex: 1, borderColor: 'error.main' }}>
                                        <Typography color="error.main" variant="h3">{importResult.failureCount}</Typography>
                                        <Typography variant="subtitle2">عمليات فاشلة</Typography>
                                    </Paper>
                                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', flex: 1 }}>
                                        <Typography variant="h3">{importResult.totalProcessed}</Typography>
                                        <Typography variant="subtitle2">إجمالي ما تمت معالجته</Typography>
                                    </Paper>
                                </Box>

                                {importResult.errors && importResult.errors.length > 0 && (
                                    <>
                                        <Typography variant="h6" gutterBottom color="error">تفاصيل الأخطاء:</Typography>
                                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow><TableCell>السطر</TableCell><TableCell>الخطأ</TableCell></TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {importResult.errors.map((err, i) => (
                                                        <TableRow key={i}><TableCell>{err.rowNumber}</TableCell><TableCell>{err.errorMessage}</TableCell></TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </>
                                )}
                            </MainCard>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Add Service Dialog */}
            <Dialog
                open={addServiceDialogOpen}
                onClose={() => setAddServiceDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>إضافة خدمة طبية من النظام</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <MedicalServiceSelector
                            onChange={(service) => setNewServiceForm(prev => ({ ...prev, medicalService: service }))}
                            value={newServiceForm.medicalService}
                        />
                        <TextField
                            label="المبلغ المطلوب (د.ل)"
                            type="number"
                            fullWidth
                            value={newServiceForm.grossAmount}
                            onChange={(e) => setNewServiceForm(prev => ({ ...prev, grossAmount: e.target.value }))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddServiceDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (newServiceForm.medicalService && newServiceForm.grossAmount) {
                                addLine({
                                    code: newServiceForm.medicalService.code,
                                    name: newServiceForm.medicalService.name,
                                    contractPrice: Number(newServiceForm.grossAmount)
                                });
                                setAddServiceDialogOpen(false);
                                setNewServiceForm({ medicalService: null, grossAmount: '' });
                            }
                        }}
                        disabled={!newServiceForm.medicalService || !newServiceForm.grossAmount}
                    >
                        إضافة للجدول
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}
