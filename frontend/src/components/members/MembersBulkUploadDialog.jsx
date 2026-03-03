import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { downloadTemplate, importMembers } from 'services/api/unified-members.service';

// Static Arabic labels
const LABELS = {
  title: 'استيراد الأعضاء (Excel)',
  close: 'إغلاق',
  downloadTemplate: 'تحميل القالب',
  info: 'قم بتحميل القالب المعتمد، تعبئة بيانات الأعضاء، ثم إعادة رفعه هنا.',
  invalidFileType: 'الرجاء اختيار ملف Excel (.xlsx)',
  selectFile: 'الرجاء اختيار ملف أولاً',
  clickToUpload: 'اضغط هنا لاختيار ملف Excel المعبأ',
  dragDrop: 'أو قم بسحب وإسقاط الملف هنا',
  uploading: 'جار الرفع والمعالجة...',
  cancel: 'إلغاء',
  upload: 'رفع واستيراد',
  success: 'تم استيراد الأعضاء بنجاح',
  successSummary: 'تم إضافة {count} عضو',
  error: 'فشل في استيراد الملف'
};

const MembersBulkUploadDialog = ({ open, onClose, onSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        enqueueSnackbar(LABELS.invalidFileType, { variant: 'error' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Members_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      enqueueSnackbar('تم تحميل القالب بنجاح', { variant: 'success' });
    } catch (error) {
      console.error('Template download failed:', error);
      enqueueSnackbar('فشل تحميل القالب', { variant: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      enqueueSnackbar(LABELS.selectFile, { variant: 'warning' });
      return;
    }

    setUploading(true);
    try {
      const response = await importMembers(selectedFile);
      const result = response?.data || response;
      const successCount = result?.summary?.created || 0;
      const message = `${LABELS.success}. ${LABELS.successSummary.replace('{count}', successCount)}`;

      enqueueSnackbar(message, { variant: 'success' });

      if (onSuccess) onSuccess(result);
      handleClose();
    } catch (error) {
      console.error('Upload failed:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || LABELS.error;
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      onClose();
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEnforceFocus>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5">{LABELS.title}</Typography>
          {!uploading && (
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info" icon={<DownloadIcon />}>
            {LABELS.info}
            <Box mt={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleDownloadTemplate}
                disabled={downloading || uploading}
                startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
              >
                {downloading ? 'جار التحميل...' : LABELS.downloadTemplate}
              </Button>
            </Box>
          </Alert>

          <Box
            component="label"
            sx={{
              border: '2px dashed',
              borderColor: selectedFile ? 'success.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              backgroundColor: selectedFile ? 'success.lighter' : 'background.paper',
              cursor: uploading ? 'default' : 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                borderColor: uploading ? undefined : 'primary.main',
                backgroundColor: uploading ? undefined : 'primary.lighter'
              },
              position: 'relative'
            }}
          >
            <input type="file" hidden accept=".xlsx,.xls" onChange={handleFileChange} disabled={uploading} />

            <Stack spacing={2} alignItems="center">
              {selectedFile ? (
                <>
                  <FileIcon color="success" sx={{ fontSize: 48 }} />
                  <Typography variant="h6" color="success.dark">
                    {selectedFile.name}
                  </Typography>
                  <Button color="error" size="small" onClick={handleRemoveFile} disabled={uploading}>
                    إزالة الملف
                  </Button>
                </>
              ) : (
                <>
                  <CloudUploadIcon color="action" sx={{ fontSize: 48 }} />
                  <Typography variant="body1" color="textSecondary">
                    {LABELS.clickToUpload}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {LABELS.dragDrop}
                  </Typography>
                </>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={uploading} color="inherit">
          {LABELS.cancel}
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          variant="contained"
          color="primary"
          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        >
          {uploading ? LABELS.uploading : LABELS.upload}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MembersBulkUploadDialog;
