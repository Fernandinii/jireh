const express = require('express');
const faltantesController = require('../controllers/faltantesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', faltantesController.index);
router.post('/', faltantesController.crear);
router.post('/:id/resolver', faltantesController.resolver);
router.patch('/:id/resolver', faltantesController.resolver);
router.delete('/:id', faltantesController.eliminar);

module.exports = router;
