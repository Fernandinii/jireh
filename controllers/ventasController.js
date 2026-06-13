async function index(req, res) {
  res.render('ventas/index', { title: 'Ventas', activeNav: 'ventas' });
}

module.exports = { index };
