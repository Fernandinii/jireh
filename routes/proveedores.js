const express = require('express');
const { requireAuth } = require('../middleware/auth');
const proveedoresController = require('../controllers/proveedoresController');

const router = express.Router();
router.use(requireAuth);

router.get('/', proveedoresController.index);
router.get('/nuevo', proveedoresController.nuevo);
router.post('/', proveedoresController.crear);
router.get('/:id/editar', proveedoresController.editar);
router.put('/:id', proveedoresController.actualizar);
router.delete('/:id', proveedoresController.eliminar);

module.exports = router;
