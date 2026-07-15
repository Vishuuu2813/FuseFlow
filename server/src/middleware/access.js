import Tenant from '../models/Tenant.js';

export const isPlatformAdmin = (user) => {
  return Boolean(user && (user.role === 'Super Admin' || (user.role === 'Admin' && !user.tenantId)));
};

export const isWorkspaceAdmin = (user) => {
  return Boolean(user && user.role === 'Admin' && user.tenantId);
};

export const requirePlatformAdmin = (req, res, next) => {
  if (!isPlatformAdmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden. Platform administrator access required.' });
  }
  next();
};

export const requireWorkspaceAdmin = (req, res, next) => {
  if (!isWorkspaceAdmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden. Workspace administrator access required.' });
  }
  next();
};

export const requireTenantAdminOrPlatformAdmin = (req, res, next) => {
  if (!isPlatformAdmin(req.user) && !isWorkspaceAdmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden. Workspace administrator access required.' });
  }
  next();
};

export const requireActiveTenant = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      return next();
    }

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({ message: 'Workspace is suspended. Contact support.' });
    }

    if (tenant.planExpiresAt && new Date(tenant.planExpiresAt).getTime() < Date.now()) {
      return res.status(403).json({ message: 'Workspace subscription has expired. Please renew your plan.' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
};

export const requirePlanFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (!featureKey || isPlatformAdmin(req.user)) {
        return next();
      }

      const tenant = req.tenant || await Tenant.findById(req.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: 'Workspace not found.' });
      }

      if (tenant.limits?.[featureKey] === false) {
        return res.status(403).json({ message: 'This feature is disabled for your current plan.' });
      }

      req.tenant = tenant;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireUserPermission = (permissionKey) => {
  return (req, res, next) => {
    if (!permissionKey || isPlatformAdmin(req.user)) {
      return next();
    }

    const permissions = req.user?.permissions || {};
    const allowed = permissions[permissionKey] !== false;
    const expiryValue = permissions[`${permissionKey}ExpiresAt`];
    const expiry = expiryValue ? new Date(expiryValue) : null;
    const expired = expiry && expiry.getTime() < Date.now();

    if (!allowed || expired) {
      return res.status(403).json({
        message: expired
          ? 'Your access to this feature has expired.'
          : 'Your account does not have permission to access this feature.'
      });
    }

    next();
  };
};
