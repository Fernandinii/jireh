const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ventasController = require('../controllers/ventasController');

const router = express.Router();
router.use(requireAuth);
router.get('/', ventasController.index);

module.exports = router;
