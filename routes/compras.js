const express = require('express');
const comprasController = require('../controllers/comprasController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', comprasController.index);
router.get('/nueva', comprasController.nueva);
router.post('/', comprasController.crear);
router.get('/:id', comprasController.detalle);

module.exports = router;
