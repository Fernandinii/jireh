const express = require('express');
const { requireAuth } = require('../middleware/auth');
const clientesController = require('../controllers/clientesController');

const router = express.Router();
router.use(requireAuth);

router.get('/', clientesController.index);
router.get('/nuevo', clientesController.nuevo);
router.post('/', clientesController.crear);

// Control de abonos (antes de :id para no colisionar)
router.get('/abonos', clientesController.abonos);

router.get('/:id/editar', clientesController.editar);
router.put('/:id', clientesController.actualizar);
router.post('/:id/abonos', clientesController.registrarAbono);
router.get('/:id', clientesController.detalle);

module.exports = router;
