const { Op } = require('sequelize');
const { Producto, Proveedor } = require('../models');

const DEFAULT_PER_PAGE = 25;
const MIN_PER_PAGE = 5;
const MAX_PER_PAGE = 100;

/**
 * Listado paginado: solo carga una página en memoria (evita listas de cientos de filas).
 */
async function index(req, res, next) {
  try {
    let perPage = parseInt(req.query.perPage, 10) || DEFAULT_PER_PAGE;
    if (!Number.isFinite(perPage)) perPage = DEFAULT_PER_PAGE;
    perPage = Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, perPage));

    const q = (req.query.q || '').trim();
    const where = {};
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${q}%` } },
        { codigo_barras: { [Op.like]: `%${q}%` } },
      ];
    }

    const total = await Producto.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    let page = parseInt(req.query.page, 10) || 1;
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const offset = (page - 1) * perPage;

    const productos = await Producto.findAll({
      where,
      include: [{ model: Proveedor, as: 'proveedores', attributes: ['id', 'nombre'], through: { attributes: [] }, required: false }],
      limit: perPage,
      offset,
      order: [['nombre', 'ASC']],
    });

    res.render('productos/index', {
      title: 'Productos',
      activeNav: 'productos',
      productos,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        q,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { index };
