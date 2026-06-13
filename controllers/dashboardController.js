/**
 * Panel principal tras login (admin y vendedor).
 */
async function index(req, res) {
  res.render('dashboard/index', {
    title: 'Inicio',
    activeNav: 'dashboard',
    esAdmin: req.session.rol === 'administrador',
  });
}

module.exports = { index };
