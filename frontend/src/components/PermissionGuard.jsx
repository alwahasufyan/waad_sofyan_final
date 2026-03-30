import useAuth from 'hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { getDefaultRouteForRole } from 'utils/roleRoutes';
import { ROLE_RESOURCE_ACCESS } from 'config/roleAccessMap';

/**
 * Get user's primary role from user object
 */
const getUserRole = (user) => {
  if (!user) return null;
  if (user.role) return user.role.toString().trim().toUpperCase().replace(/\s+/g, '_');
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const r = user.roles[0];
    return (typeof r === 'string' ? r : r?.name || '').toString().trim().toUpperCase().replace(/\s+/g, '_');
  }
  return null;
};

const isSuperAdminUser = (user) => getUserRole(user) === 'SUPER_ADMIN';

const hasResourceByRole = (role, resource) => {
  if (!resource) return true;
  const allowedResources = ROLE_RESOURCE_ACCESS[role] || [];
  return allowedResources.includes('*') || allowedResources.includes(resource);
};

const canEmployerAdminAccessByToggle = (user, resource, action) => {
  if (!resource) return true;

  const canViewClaims = user?.canViewClaims !== false;
  const canViewVisits = user?.canViewVisits !== false;
  const canViewReports = user?.canViewReports !== false;
  const canViewMembers = user?.canViewMembers !== false;
  const canViewBenefitPolicies = user?.canViewBenefitPolicies !== false;

  if (resource === 'claims') {
    // Employer admin can view claim data/reporting only, never manage claim operations.
    return action === 'view' ? canViewClaims : false;
  }

  if (resource === 'visits') {
    // Visits for employer admin are read-only scope.
    return action === 'view' ? canViewVisits : false;
  }

  if (resource === 'members') {
    return canViewMembers;
  }

  if (resource === 'benefit_policies') {
    return canViewBenefitPolicies;
  }

  if (resource === 'documents') {
    return canViewBenefitPolicies || canViewClaims;
  }

  if (resource === 'report_claims') {
    return canViewReports && canViewClaims;
  }

  if (resource === 'report_beneficiaries') {
    return canViewReports && canViewMembers;
  }

  if (resource.startsWith('report_')) {
    return canViewReports;
  }

  return true;
};

const canAccessResource = (user, role, resource, action) => {
  if (!resource) return true;
  if (isSuperAdminUser(user)) return true;

  if (!hasResourceByRole(role, resource)) {
    return false;
  }

  if (role === 'EMPLOYER_ADMIN') {
    return canEmployerAdminAccessByToggle(user, resource, action);
  }

  return true;
};

/**
 * RoleGuard — Phase 5 Static Role-Based Authorization
 *
 * Replaces PermissionGuard. All checks are role-based only.
 * SUPER_ADMIN bypasses all role checks.
 *
 * Usage:
 *
 * 1. Route protection (redirect if unauthorized):
 *    <RoleGuard allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT']} isRouteGuard>
 *      <SettlementPage />
 *    </RoleGuard>
 *
 * 2. Component protection (hide if unauthorized):
 *    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
 *      <DeleteButton />
 *    </RoleGuard>
 *
 * 3. Any authenticated user:
 *    <RoleGuard isRouteGuard>
 *      <DashboardPage />
 *    </RoleGuard>
 *
 */
const RoleGuard = ({
  allowedRoles,
  resource,
  action = 'view',
  isRouteGuard = false,
  children,
  fallback = null
}) => {
  const { user } = useAuth();

  if (!user) {
    return isRouteGuard ? <Navigate to="/login" replace /> : fallback;
  }

  const userRole = getUserRole(user);

  // SUPER_ADMIN bypasses all role checks
  if (isSuperAdminUser(user)) {
    return children;
  }

  // If no specific roles required → any authenticated user can access
  if (!allowedRoles || allowedRoles.length === 0) {
    return canAccessResource(user, userRole, resource, action) ? children : isRouteGuard ? <Navigate to={getDefaultRouteForRole(userRole)} replace /> : fallback;
  }

  // Check if user's role is in the allowed list
  if (allowedRoles.includes(userRole)) {
    if (canAccessResource(user, userRole, resource, action)) {
      return children;
    }
  }

  // Unauthorized
  if (isRouteGuard) {
    const redirectPath = getDefaultRouteForRole(userRole);
    return <Navigate to={redirectPath} replace />;
  }

  return fallback;
};

/**
 * Hook: check if current user has one of the allowed roles
 * SUPER_ADMIN always returns true.
 */
export const useHasRole = (allowedRoles) => {
  const { user } = useAuth();
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const userRole = getUserRole(user);
  return allowedRoles.includes(userRole);
};

// Default export = RoleGuard
// Also export as PermissionGuard for backward compatibility
export default RoleGuard;
