import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Typography,
    TextField
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * Reusable Confirmation Dialog for system actions (Delete, Archive, Restore).
 * Replaces the native browser window.confirm().
 */
const ActionConfirmDialog = ({
    open,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'نعم',
    cancelText = 'إلغاء الأمر',
    confirmColor = 'primary',
    icon = null,
    requirePassword = false,
    passwordValue = '',
    onPasswordChange = null,
    passwordLabel = 'كلمة المرور الحالية',
    confirmLoading = false
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon || <WarningAmberIcon color={confirmColor} />}
                <Typography variant="h6" component="span">
                    {title}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>
                    {message}
                </DialogContentText>
                {requirePassword && (
                    <TextField
                        fullWidth
                        margin="normal"
                        type="password"
                        label={passwordLabel}
                        value={passwordValue}
                        onChange={(event) => onPasswordChange?.(event.target.value)}
                        autoComplete="current-password"
                    />
                )}
            </DialogContent>
            <DialogActions sx={{ px: '1.5rem', pb: '1.0rem' }}>
                <Button onClick={onClose} color="inherit" variant="outlined" disabled={confirmLoading}>
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    color={confirmColor}
                    variant="contained"
                    autoFocus
                    disabled={confirmLoading || (requirePassword && !passwordValue.trim())}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ActionConfirmDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    confirmColor: PropTypes.oneOf(['primary', 'secondary', 'error', 'info', 'success', 'warning']),
    icon: PropTypes.node,
    requirePassword: PropTypes.bool,
    passwordValue: PropTypes.string,
    onPasswordChange: PropTypes.func,
    passwordLabel: PropTypes.string,
    confirmLoading: PropTypes.bool
};

export default ActionConfirmDialog;
