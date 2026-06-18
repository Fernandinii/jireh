async function index(req, res) {
  res.render('compras/index', {
    title: 'Compras',
    activeNav: 'compras',
  });
}

module.exports = { index };
