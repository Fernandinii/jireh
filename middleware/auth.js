/**
 * Protección de rutas: sesión obligatoria y roles permitidos.
 */

/** Redirige a login si no hay sesión */
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.flash = { error: 'Debe iniciar sesión para continuar' };
    return res.redirect('/login');
  }
  next();
}

/**
 * Solo permite roles listados (p. ej. requireRole('administrador')).
 * Debe usarse después de requireAuth en la ruta.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      req.session.flash = { error: 'Debe iniciar sesión' };
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.rol)) {
      return res.status(403).render('errors/403', {
        title: 'Acceso denegado',
        message: 'No tiene permisos para ver esta sección.',
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
