const express = require('express');
const { requireAuth } = require('../middleware/auth');
const productosController = require('../controllers/productosController');

const router = express.Router();
router.use(requireAuth);
router.get('/', productosController.index);

module.exports = router;
