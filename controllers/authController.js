/**
 * Login, logout y carga de sesión con bcrypt.
 */
const { validationResult, body } = require('express-validator');
const { Usuario } = require('../models');

function loginValidators() {
  return [
    body('nombre_usuario').trim().notEmpty().withMessage('Usuario obligatorio'),
    body('password').notEmpty().withMessage('Contraseña obligatoria'),
  ];
}

async function getLogin(req, res) {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', {
    title: 'Iniciar sesión',
    errors: [],
    body: {},
  });
}

async function postLogin(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      title: 'Iniciar sesión',
      errors: errors.array(),
      body: req.body,
    });
  }

  const { nombre_usuario, password } = req.body;

  try {
    const user = await Usuario.scope('withPassword').findOne({
      where: { nombre_usuario: nombre_usuario.trim(), activo: true },
    });

    if (!user || !(await user.validarPassword(password))) {
      req.session.flash = { error: 'Usuario o contraseña incorrectos' };
      return res.redirect('/login');
    }

    req.session.user = {
      id: user.id,
      empresa_id: user.empresa_id,
      sucursal_id: user.sucursal_id,
      rol: user.rol,
      nombre_usuario: user.nombre_usuario,
      nombre: user.nombre_completo || user.nombre_usuario,
    };

    req.session.flash = { success: `Bienvenido, ${req.session.user.nombre}` };
    return res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.session.flash = { error: 'No se pudo iniciar sesión' };
    return res.redirect('/login');
  }
}

function postLogout(req, res) {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/login');
  });
}

module.exports = {
  loginValidators,
  getLogin,
  postLogin,
  postLogout,
};
