const express = require('express');
const reportesController = require('../controllers/reportesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', reportesController.index);

module.exports = router;
