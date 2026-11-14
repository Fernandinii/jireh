const express = require('express');
const { requireAuth } = require('../middleware/auth');
const productosController = require('../controllers/productosController');
const categoriasController = require('../controllers/categoriasController');

const router = express.Router();
router.use(requireAuth);

// Categorías (montadas bajo /productos/categorias para no romper el sidebar)
router.get('/categorias', categoriasController.index);
router.post('/categorias', categoriasController.crear);
router.put('/categorias/:id', categoriasController.actualizar);
router.delete('/categorias/:id', categoriasController.eliminar);

// Productos
router.get('/', productosController.index);
router.get('/nuevo', productosController.nuevo);
router.post('/', productosController.crear);
router.get('/:id/editar', productosController.editar);
router.put('/:id', productosController.actualizar);
router.delete('/:id', productosController.eliminar);

module.exports = router;
