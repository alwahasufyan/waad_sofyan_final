import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, Typography } from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LinkIcon from '@mui/icons-material/Link';

import MainCard from 'components/MainCard';
import PermissionGuard from 'components/PermissionGuard';
import { ModernPageHeader } from 'components/tba';
import { UnifiedMedicalTable } from 'components/common';
import usersService from 'services/rbac/users.service';

const hasMedicalReviewerRole = (user) => {
  if (user?.role === 'MEDICAL_REVIEWER') {
    return true;
  }

  const roles = user?.roles || [];
  return roles.some((role) => {
    if (typeof role === 'string') {
      return role === 'MEDICAL_REVIEWER';
    }
    return role?.name === 'MEDICAL_REVIEWER' || role?.code === 'MEDICAL_REVIEWER';
  });
};

const MedicalReviewersAdminPage = () => {
  const navigate = useNavigate();

  const { data: reviewers = [], isLoading } = useQuery({
    queryKey: ['admin-medical-reviewers'],
    queryFn: async () => {
      const users = await usersService.getAllUsers();
      return (Array.isArray(users) ? users : []).filter(hasMedicalReviewerRole);
    }
  });

  const columns = useMemo(
    () => [
      { id: 'fullName', label: 'اسم المراجع', minWidth: 220, sortable: false },
      { id: 'username', label: 'اسم المستخدم', minWidth: 180, sortable: false },
      { id: 'email', label: 'البريد الإلكتروني', minWidth: 240, sortable: false },
      { id: 'status', label: 'الحالة', minWidth: 120, align: 'center', sortable: false },
      { id: 'actions', label: 'الإجراءات', minWidth: 120, align: 'center', sortable: false }
    ],
    []
  );

  const renderCell = (reviewer, column) => {
    switch (column.id) {
      case 'fullName':
        return <Typography variant="body2" fontWeight={600}>{reviewer.fullName || '-'}</Typography>;
      case 'username':
        return <Typography variant="body2">{reviewer.username || '-'}</Typography>;
      case 'email':
        return <Typography variant="body2">{reviewer.email || '-'}</Typography>;
      case 'status':
        return (
          <Chip
            size="small"
            color={reviewer.active ? 'success' : 'default'}
            label={reviewer.active ? 'نشط' : 'غير نشط'}
          />
        );
      case 'actions':
        return (
          <Button
              variant="outlined"
              size="small"
              startIcon={<LinkIcon fontSize="small" />}
              onClick={() => navigate(`/admin/medical-reviewers/${reviewer.id}/providers`)}
          >
            Manage Provider Assignments
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <PermissionGuard permission="MANAGE_REVIEWER" isRouteGuard>
      <Box>
        <ModernPageHeader
          title="إدارة المراجعين الطبيين"
          subtitle="إدارة ربط المراجعين الطبيين بمقدمي الخدمة"
          icon={ManageAccountsIcon}
        />

        <MainCard title="قائمة المراجعين الطبيين">
          <UnifiedMedicalTable
            columns={columns}
            rows={reviewers}
            loading={isLoading}
            renderCell={renderCell}
            totalCount={reviewers.length}
            emptyIcon={ManageAccountsIcon}
            emptyMessage="لا يوجد مستخدمون بدور المراجع الطبي"
          />
        </MainCard>
      </Box>
    </PermissionGuard>
  );
};

export default MedicalReviewersAdminPage;
