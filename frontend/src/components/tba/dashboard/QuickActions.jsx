import { Link } from 'react-router-dom';

// material-ui
import { Box, Card, CardContent, Grid, Typography, useTheme } from '@mui/material';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import UserAddOutlined from '@ant-design/icons/UserAddOutlined';
import MedicineBoxOutlined from '@ant-design/icons/MedicineBoxOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';

/**
 * QuickActions Component
 * Phase B3 - Modern Dashboard Quick Action Cards
 *
 * Displays 3 quick action cards for common create operations:
 * - Add Member
 * - Add Visit
 * - Add Claim
 *
 * Each card links to the respective create page
 */
export default function QuickActions() {
  const theme = useTheme();

  const actions = [
    {
      title: 'إضافة عضو جديد',
      description: 'تسجيل عضو جديد في النظام',
      icon: UserAddOutlined,
      color: 'primary',
      link: '/members/add'
    },
    {
      title: 'إضافة زيارة طبية',
      description: 'تسجيل زيارة طبية جديدة',
      icon: MedicineBoxOutlined,
      color: 'success',
      link: '/provider/eligibility-check'
    },
    {
      title: 'إضافة مطالبة',
      description: 'تقديم مطالبة تأمينية جديدة',
      icon: FileTextOutlined,
      color: 'warning',
      link: '/provider/visits'
    }
  ];

  const getColor = (colorKey) => {
    const colors = {
      primary: theme.palette.primary.main,
      success: theme.palette.success.main,
      warning: theme.palette.warning.main,
      info: theme.palette.info.main,
      error: theme.palette.error.main
    };
    return colors[colorKey] || colors.primary;
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        إجراءات سريعة
      </Typography>
      <Grid container spacing={3}>
        {actions.map((action) => {
          const mainColor = getColor(action.color);
          const Icon = action.icon;

          return (
            <Grid key={action.title} size={{ xs: 12, md: 4 }}>
              <Card
                component={Link}
                to={action.link}
                sx={{
                  height: '100%',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: theme.shadows[8]
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: mainColor
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${mainColor}15`,
                        color: mainColor
                      }}
                    >
                      <Icon style={{ fontSize: 28 }} />
                    </Box>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: mainColor,
                        color: 'white',
                        ml: 'auto'
                      }}
                    >
                      <PlusOutlined style={{ fontSize: 20 }} />
                    </Box>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 1,
                      fontWeight: 600,
                      color: 'text.primary'
                    }}
                  >
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
