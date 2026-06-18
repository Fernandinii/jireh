async function index(req, res) {
  res.render('faltantes/index', {
    title: 'Faltantes',
    activeNav: 'faltantes',
  });
}

module.exports = { index };
