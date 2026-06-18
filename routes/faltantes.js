const express = require('express');
const faltantesController = require('../controllers/faltantesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', faltantesController.index);

module.exports = router;
