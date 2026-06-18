async function index(req, res) {
  res.render('reportes/index', {
    title: 'Reportes',
    activeNav: 'reportes',
  });
}

module.exports = { index };
