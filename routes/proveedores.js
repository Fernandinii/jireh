const express = require('express');
const { requireAuth } = require('../middleware/auth');
const proveedoresController = require('../controllers/proveedoresController');

const router = express.Router();
router.use(requireAuth);
router.get('/', proveedoresController.index);

module.exports = router;
