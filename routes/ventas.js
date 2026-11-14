const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ventasController = require('../controllers/ventasController');

const router = express.Router();
router.use(requireAuth);

// Historial de ventas de la sucursal (paginado, filtros por fecha y tipo de pago)
router.get('/', ventasController.listar);

// Pantalla principal de Caja / POS
router.get('/nueva', ventasController.nueva);

// Búsqueda rápida (JSON) para el buscador y lector de código de barras
router.get('/api/buscar-productos', ventasController.buscarProductosApi);

// Registro de venta (cobro)
router.post('/', ventasController.crear);

// Ticket imprimible de 58mm/80mm
router.get('/:id/ticket', ventasController.ticket);

module.exports = router;
