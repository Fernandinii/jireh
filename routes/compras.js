const express = require('express');
const comprasController = require('../controllers/comprasController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', comprasController.index);

module.exports = router;
