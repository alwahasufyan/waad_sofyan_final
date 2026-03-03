import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

import MainCard from 'components/MainCard';
import PermissionGuard from 'components/PermissionGuard';
import { ModernPageHeader } from 'components/tba';
import { UnifiedMedicalTable } from 'components/common';
import { openSnackbar } from 'api/snackbar';
import { medicalReviewersService, providersService } from 'services/api';
import usersService from 'services/rbac/users.service';

const ReviewerProviderAssignmentsPage = () => {
  const { reviewerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const parsedReviewerId = Number(reviewerId);

  const [selectedProviderIds, setSelectedProviderIds] = useState(new Set());

  const { data: reviewer, isLoading: reviewerLoading } = useQuery({
    queryKey: ['admin-medical-reviewer', parsedReviewerId],
    queryFn: async () => usersService.getUserById(parsedReviewerId).then((response) => response?.data?.data || response?.data),
    enabled: Number.isFinite(parsedReviewerId)
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['admin-reviewer-assignment-providers'],
    queryFn: async () => {
      const list = await providersService.getSelector();
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: assignmentData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['admin-reviewer-provider-assignments', parsedReviewerId],
    queryFn: async () => medicalReviewersService.getReviewerAssignments(parsedReviewerId),
    enabled: Number.isFinite(parsedReviewerId)
  });

  useEffect(() => {
    const ids = assignmentData?.assignedProviderIds || [];
    setSelectedProviderIds(new Set(ids));
  }, [assignmentData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return medicalReviewersService.updateReviewerAssignments(parsedReviewerId, Array.from(selectedProviderIds));
    },
    onSuccess: async (result) => {
      const persistedIds = Array.isArray(result?.assignedProviderIds) ? result.assignedProviderIds : Array.from(selectedProviderIds);
      setSelectedProviderIds(new Set(persistedIds));

      await queryClient.invalidateQueries({ queryKey: ['admin-reviewer-provider-assignments', parsedReviewerId] });
      await queryClient.refetchQueries({ queryKey: ['admin-reviewer-provider-assignments', parsedReviewerId], type: 'active' });

      openSnackbar({
        open: true,
        message: 'تم حفظ تعيينات مقدمي الخدمة بنجاح',
        variant: 'alert',
        alert: { color: 'success' }
      });
    },
    onError: (error) => {
      openSnackbar({
        open: true,
        message: error?.message || 'فشل حفظ التعيينات',
        variant: 'alert',
        alert: { color: 'error' }
      });
    }
  });

  const toggleProvider = (providerId) => {
    setSelectedProviderIds((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const columns = useMemo(
    () => [
      { id: 'selected', label: '', minWidth: 60, align: 'center', sortable: false },
      { id: 'name', label: 'اسم مقدم الخدمة', minWidth: 260, sortable: false },
      { id: 'code', label: 'الكود/الترخيص', minWidth: 180, sortable: false }
    ],
    []
  );

  const renderCell = (provider, column) => {
    switch (column.id) {
      case 'selected':
        return (
          <Checkbox
            checked={selectedProviderIds.has(provider.id)}
            onChange={() => toggleProvider(provider.id)}
          />
        );
      case 'name':
        return <Typography variant="body2" fontWeight={600}>{provider.name || '-'}</Typography>;
      case 'code':
        return <Typography variant="body2">{provider.code || provider.licenseNumber || '-'}</Typography>;
      default:
        return null;
    }
  };

  const loading = reviewerLoading || providersLoading || assignmentsLoading;

  return (
    <PermissionGuard permission="MANAGE_REVIEWER" isRouteGuard>
      <Box>
        <ModernPageHeader
          title="تعيينات مقدمي الخدمة للمراجع"
          subtitle={reviewer ? `المراجع: ${reviewer.fullName || reviewer.username || reviewer.id}` : 'تحميل بيانات المراجع...'}
          icon={LocalHospitalIcon}
          actions={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/medical-reviewers')}>
                رجوع
              </Button>
              <Button
                variant="contained"
                startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || loading}
              >
                Save
              </Button>
            </Stack>
          }
        />

        <MainCard
          title="Provider Assignments"
          secondary={
            <Typography variant="subtitle2" color="text.secondary">
              Assigned Count: {selectedProviderIds.size}
            </Typography>
          }
        >
          <UnifiedMedicalTable
            columns={columns}
            rows={providers}
            loading={loading}
            renderCell={renderCell}
            totalCount={providers.length}
            emptyIcon={LocalHospitalIcon}
            emptyMessage="لا يوجد مقدمو خدمة متاحون"
          />
        </MainCard>
      </Box>
    </PermissionGuard>
  );
};

export default ReviewerProviderAssignmentsPage;
