import { isPlatformAdmin } from './access.js';

export const requireTenant = (req, res, next) => {
  if (isPlatformAdmin(req.user)) {
    // Platform admins can explicitly pass tenantId in query/headers for tenant-specific actions.
    const tenantIdHeader = req.headers['x-tenant-id'];
    const tenantIdQuery = req.query.tenantId;
    req.tenantId = tenantIdHeader || tenantIdQuery;
    if (!req.tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required for this workspace action.' });
    }
    return next();
  }

  if (!req.user.tenantId) {
    return res.status(400).json({ message: 'Tenant ID context missing. Contact support.' });
  }

  // Bind tenantId to request object for easy query usage
  req.tenantId = req.user.tenantId;
  next();
};

// Middleware to validate that dynamic model lookups match the current tenant
export const checkTenantMatch = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      if (!resourceId) return next();

      if (isPlatformAdmin(req.user)) return next();

      const doc = await model.findById(resourceId);
      if (!doc) {
        return res.status(404).json({ message: 'Resource not found.' });
      }

      if (doc.tenantId.toString() !== req.tenantId.toString()) {
        return res.status(403).json({ message: 'Access denied. Resource belongs to another workspace.' });
      }

      req.resource = doc; // Cache resource to avoid double lookup in controllers
      next();
    } catch (error) {
      next(error);
    }
  };
};
