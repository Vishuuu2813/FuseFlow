import AuditLog from '../models/AuditLog.js';

export const writeAuditLog = async (req, details = {}) => {
  try {
    const actor = req?.user || null;
    await AuditLog.create({
      tenantId: details.tenantId ?? req?.tenantId ?? actor?.tenantId ?? null,
      actorId: actor?._id || null,
      actorEmail: actor?.email || '',
      actorRole: actor?.role || '',
      action: details.action,
      entityType: details.entityType || '',
      entityId: details.entityId || null,
      status: details.status || 'SUCCESS',
      ip: req?.ip || req?.socket?.remoteAddress || '',
      userAgent: req?.get?.('user-agent') || '',
      metadata: details.metadata || {},
    });
  } catch (error) {
    // Audit logging should never block the user-facing workflow.
  }
};
