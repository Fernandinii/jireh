async function index(req, res) {
  res.render('clientes/index', { title: 'Clientes', activeNav: 'clientes' });
}

module.exports = { index };
