export const authorize = (roles = []) => {
  // string input can be converted to array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. Authenticate first.' });
    }

    // Super Admin has universal access
    if (req.user.role === 'Super Admin') {
      return next();
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permissions for this action.' });
    }

    next();
  };
};
