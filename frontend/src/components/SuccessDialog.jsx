/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SUCCESS DIALOG - Central Notification                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Created: 2026-01-23                                                         ║
 * ║  Purpose: Display success message in center with auto-redirect               ║
 * ║  Features:                                                                    ║
 * ║  ✅ Centered modal with celebration animation                                ║
 * ║  ✅ Auto-redirect countdown timer                                            ║
 * ║  ✅ Reference number display                                                 ║
 * ║  ✅ Optional attachments count                                               ║
 * ║  ✅ Manual redirect button                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  Stack,
  LinearProgress,
  Paper,
  Grid,
  Fade,
  Zoom
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Attachment as AttachmentIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as ViewIcon,
  LocalHospital as VisitIcon
} from '@mui/icons-material';

/**
 * SuccessDialog Component
 *
 * @param {boolean} open - Whether dialog is open
 * @param {string} type - 'claim' | 'preauth' - Type of submission
 * @param {string} title - Main title (e.g. "تم تقديم المطالبة بنجاح")
 * @param {string} subtitle - Subtitle (e.g. "تم إرسال المطالبة للمراجعة")
 * @param {string|number} referenceNumber - Reference/ID number to display
 * @param {number} attachmentsCount - Number of uploaded attachments
 * @param {string} redirectPath - Path to redirect after countdown
 * @param {string} redirectLabel - Label for redirect button (e.g. "العودة لسجل الزيارات")
 * @param {number} countdownSeconds - Seconds before auto-redirect (default: 5)
 * @param {object} additionalInfo - Extra info to display { label, value }[]
 * @param {string} viewDetailsPath - Optional path to view details
 */
const SuccessDialog = ({
  open,
  type = 'claim',
  title,
  subtitle,
  referenceNumber,
  attachmentsCount = 0,
  redirectPath = '/provider/visits',
  redirectLabel = 'العودة لسجل الزيارات',
  countdownSeconds = 5,
  additionalInfo = [],
  viewDetailsPath = null
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [paused, setPaused] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!open || paused) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [open, paused, navigate, redirectPath]);

  useEffect(() => {
    if (!open || paused) return;
    if (countdown !== 0) return;

    navigate(redirectPath);
  }, [countdown, open, paused, navigate, redirectPath]);

  // Reset countdown when dialog opens
  useEffect(() => {
    if (open) {
      setCountdown(countdownSeconds);
      setPaused(false);
    }
  }, [open, countdownSeconds]);

  const handlePause = () => {
    setPaused(true);
  };

  const handleRedirectNow = () => {
    navigate(redirectPath);
  };

  const handleViewDetails = () => {
    if (viewDetailsPath) {
      navigate(viewDetailsPath);
    }
  };

  const progress = ((countdownSeconds - countdown) / countdownSeconds) * 100;

  const typeConfig = {
    claim: {
      color: 'success',
      icon: CheckCircleIcon,
      bgColor: 'success.lighter',
      iconColor: 'success.main'
    },
    preauth: {
      color: 'primary',
      icon: CheckCircleIcon,
      bgColor: 'primary.lighter',
      iconColor: 'primary.main'
    }
  };

  const config = typeConfig[type] || typeConfig.claim;
  const Icon = config.icon;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
      TransitionComponent={Zoom}
      transitionDuration={300}
    >
      {/* Progress bar for countdown */}
      <LinearProgress variant="determinate" value={progress} color={config.color} sx={{ height: 4 }} />

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ textAlign: 'center', py: 5, px: 3 }}>
          {/* Success Icon with Animation */}
          <Fade in={open} timeout={500}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: config.bgColor,
                mx: 'auto',
                mb: 3,
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', boxShadow: `0 0 0 0 rgba(76, 175, 80, 0.4)` },
                  '50%': { transform: 'scale(1.05)', boxShadow: `0 0 0 15px rgba(76, 175, 80, 0)` },
                  '100%': { transform: 'scale(1)', boxShadow: `0 0 0 0 rgba(76, 175, 80, 0)` }
                }
              }}
            >
              <Icon sx={{ fontSize: 56, color: config.iconColor }} />
            </Avatar>
          </Fade>

          {/* Title */}
          <Typography variant="h4" color={`${config.color}.main`} fontWeight="bold" gutterBottom>
            {title}
          </Typography>

          {/* Subtitle */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>

          {/* Reference Number */}
          {referenceNumber && (
            <Paper
              elevation={0}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 3,
                py: 1.5,
                bgcolor: 'grey.100',
                borderRadius: 2,
                mb: 3
              }}
            >
              <Typography variant="body2" color="text.secondary">
                رقم المرجع:
              </Typography>
              <Typography variant="h5" color={`${config.color}.main`} fontWeight="bold">
                #{referenceNumber}
              </Typography>
            </Paper>
          )}

          {/* Attachments Chip */}
          {attachmentsCount > 0 && (
            <Box sx={{ mb: 3 }}>
              <Chip icon={<AttachmentIcon />} label={`تم رفع ${attachmentsCount} مرفق`} color="info" variant="outlined" />
            </Box>
          )}

          {/* Additional Info */}
          {additionalInfo.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
                mb: 3,
                maxWidth: 400,
                mx: 'auto'
              }}
            >
              <Grid container spacing={2}>
                {additionalInfo.map((info, index) => (
                  <Grid item xs={6} key={index}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {info.label}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {info.value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Countdown Message */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 3,
              py: 1,
              px: 2,
              bgcolor: paused ? 'warning.lighter' : 'grey.100',
              borderRadius: 1,
              display: 'inline-block'
            }}
          >
            {paused ? (
              'تم إيقاف العد التنازلي مؤقتاً'
            ) : (
              <>
                سيتم العودة تلقائياً خلال <strong>{countdown}</strong> ثانية
              </>
            )}
          </Typography>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            {viewDetailsPath && (
              <Button variant="outlined" startIcon={<ViewIcon />} onClick={handleViewDetails} onMouseEnter={handlePause}>
                عرض التفاصيل
              </Button>
            )}
            <Button
              variant="contained"
              size="large"
              color={config.color}
              startIcon={<VisitIcon />}
              onClick={handleRedirectNow}
              sx={{ minWidth: 200 }}
            >
              {redirectLabel}
            </Button>
          </Stack>

          {/* Pause hint */}
          {!paused && (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block', cursor: 'pointer' }} onClick={handlePause}>
              (انقر لإيقاف العد التنازلي)
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessDialog;
