const express = require('express');
const { requireAuth } = require('../middleware/auth');
const clientesController = require('../controllers/clientesController');

const router = express.Router();
router.use(requireAuth);
router.get('/', clientesController.index);

module.exports = router;
