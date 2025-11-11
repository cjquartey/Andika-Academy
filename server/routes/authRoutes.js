const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (no authentication needed)
router.post('/login', authMiddleware.validateLogin, authController.login);
router.post('/register', authMiddleware.validateRegister, authController.register);

// Protected routes (require authentication)
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);

module.exports = router;