/**
 * Aplicación Express: middleware global, vistas EJS, sesiones y montaje de rutas.
 * Exporta startServer() para que Electron espere a que el puerto esté listo.
 */
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');

const { sequelize } = require('./database/connection');
// Modelos primero (seed y rutas dependen de ellos)
require('./models');
const { ensureSeed } = require('./database/seed');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const clientesRoutes = require('./routes/clientes');
const proveedoresRoutes = require('./routes/proveedores');

const app = express();

// Vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos (Bootstrap/CSS/JS propios)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// PUT/DELETE desde formularios (_method)
app.use(methodOverride('_method'));

// Sesiones (clave en .env para producción local)
app.use(
  session({
    name: 'jireh.pos.sid',
    secret: process.env.SESSION_SECRET || 'cambiar-en-produccion-local-jireh-pos',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
      sameSite: 'lax',
    },
  })
);

// Middleware para exponer usuario en vistas (se completará con auth)
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, rol: req.session.rol, nombre: req.session.nombreUsuario }
    : null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'jireh-pos' });
});

// Raíz: sin sesión → login (no hay página de bienvenida pública)
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  return res.redirect('/login');
});

app.use('/dashboard', dashboardRoutes);
app.use('/productos', productosRoutes);
app.use('/ventas', ventasRoutes);
app.use('/clientes', clientesRoutes);
app.use('/proveedores', proveedoresRoutes);
app.use('/', authRoutes);

// Manejo de errores básico
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'No encontrado' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).render('errors/500', {
    title: 'Error',
    message: process.env.NODE_ENV === 'production' ? 'Error interno' : err.message,
  });
});

/**
 * Inicia HTTP y sincroniza modelos con SQLite.
 * @param {number} port
 * @param {string} host
 * @returns {Promise<import('http').Server>}
 */
function startServer(port = 3000, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    sequelize
      .authenticate()
      .then(() => sequelize.sync({ alter: false }))
      .then(() => ensureSeed())
      .then(() => {
        const server = app.listen(port, host, () => {
          console.log(`Express escuchando en http://${host}:${port}`);
          resolve(server);
        });
        server.on('error', reject);
      })
      .catch(reject);
  });
}

// Ejecutar solo con `node app.js` (sin Electron)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  startServer(PORT, HOST).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
