const { Op, Sequelize } = require('sequelize');
const { Producto, Cliente, Venta } = require('../models');

async function index(req, res, next) {
  try {
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const [totalProductos, productosBajosStock, totalClientes, ventasHoy, bajosStock] = await Promise.all([
      Producto.count(),
      Producto.count({
        where: Sequelize.where(
          Sequelize.col('stock'),
          Op.lte,
          Sequelize.col('stock_minimo')
        ),
      }),
      Cliente.count({ where: { activo: true } }),
      Venta.sum('total', {
        where: { fecha_venta: { [Op.gte]: inicioDelDia } },
      }),
      Producto.findAll({
        where: Sequelize.where(
          Sequelize.col('stock'),
          Op.lte,
          Sequelize.col('stock_minimo')
        ),
        order: [['stock', 'ASC']],
        limit: 10,
      }),
    ]);

    res.render('dashboard/index', {
      title: 'Inicio',
      activeNav: 'dashboard',
      esAdmin: req.session.rol === 'administrador',
      totalProductos: totalProductos || 0,
      productosBajosStock: productosBajosStock || 0,
      totalClientes: totalClientes || 0,
      ventasHoy: ventasHoy ? Number(ventasHoy) : 0,
      bajosStock: bajosStock || [],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { index };
