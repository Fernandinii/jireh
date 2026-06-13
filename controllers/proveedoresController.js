async function index(req, res) {
  res.render('proveedores/index', { title: 'Proveedores', activeNav: 'proveedores' });
}

module.exports = { index };
