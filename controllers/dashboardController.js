const { Op, Sequelize } = require('sequelize');
const { Producto, Cliente, Venta, InventarioSucursal } = require('../models');

async function index(req, res, next) {
  try {
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const user = req.session.user || {};
    const empresaId = user.empresa_id || null;
    const sucursalId = user.sucursal_id || null;

    const whereEmpresa = empresaId ? { empresa_id: empresaId } : {};
    const whereSucursal = sucursalId ? { sucursal_id: sucursalId } : {};

    const bajoStock = Sequelize.where(
      Sequelize.col('stock'),
      Op.lte,
      Sequelize.col('stock_minimo')
    );

    const [totalProductos, productosBajosStock, totalClientes, ventasHoy, bajosStock] = await Promise.all([
      Producto.count({ where: whereEmpresa }),
      InventarioSucursal.count({ where: { ...whereSucursal, [Op.and]: bajoStock } }),
      Cliente.count({ where: { ...whereEmpresa, activo: true } }),
      Venta.sum('total', {
        where: { ...whereSucursal, fecha_venta: { [Op.gte]: inicioDelDia } },
      }),
      InventarioSucursal.findAll({
        where: { ...whereSucursal, [Op.and]: bajoStock },
        include: [
          { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'unidad_medida', 'es_granel'] },
        ],
        order: [['stock', 'ASC']],
        limit: 10,
      }),
    ]);

    res.render('dashboard/index', {
      title: 'Inicio',
      activeNav: 'dashboard',
      esAdmin: user.rol === 'admin',
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
