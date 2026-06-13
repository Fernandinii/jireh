/**
 * Rutas públicas de autenticación y cierre de sesión.
 */
const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/login', authController.getLogin);
router.post('/login', ...authController.loginValidators(), authController.postLogin);
router.post('/logout', requireAuth, authController.postLogout);

module.exports = router;
