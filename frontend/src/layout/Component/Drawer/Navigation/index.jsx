import PropTypes from 'prop-types';
import { useDeferredValue, useMemo } from 'react';

// material-ui
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import NavGroup from './NavGroup';
import menuItem, { filterMenuItemsByRole } from 'menu-items/components';
import useAuth from 'hooks/useAuth';

// ==============================|| DRAWER - NAVIGATION ||============================== //

export default function Navigation({ searchValue }) {
  const deferredSearch = useDeferredValue(searchValue?.trim().toLowerCase() ?? '');
  const { user } = useAuth();
  const role = user?.role || (Array.isArray(user?.roles) && user.roles[0]) || 'DATA_ENTRY';

  const filteredMenuItems = useMemo(() => {
    const providerScopedMenu = filterMenuItemsByRole(menuItem, role);

    // Then, filter by search value
    if (!deferredSearch) return providerScopedMenu;

    const result = [];
    providerScopedMenu.forEach((parentMenu) => {
      const matchedChildren = parentMenu.children?.filter((child) => child.search?.toLowerCase().includes(deferredSearch));

      if (matchedChildren && matchedChildren.length > 0) {
        result.push({ ...parentMenu, children: matchedChildren });
      }
    });

    return result;
  }, [deferredSearch, role]);

  const navGroups = filteredMenuItems.map((item) => {
    switch (item.type) {
      case 'group':
        return <NavGroup key={item.id} item={item} />;
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Fix - Navigation Group
          </Typography>
        );
    }
  });

  return <Box sx={{ pt: 1 }}>{navGroups}</Box>;
}

Navigation.propTypes = { searchValue: PropTypes.string };
