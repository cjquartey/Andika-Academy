const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes (no authentication needed)
router.post('/login', authMiddleware.validateLogin, authController.login);
router.post('/register', authMiddleware.validateRegister, authController.register);
router.get('/user/:userId', authController.getUserById);

// Protected routes (require authentication)
router.post('/upload-profile-picture',
    authMiddleware.verifyToken,
    upload.single('profilePicture'),
    authController.uploadProfilePicture
);
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);
router.put('/profile',
    authMiddleware.verifyToken,
    authController.updateProfile
);
router.put('/password',
    authMiddleware.verifyToken,
    authController.updatePassword
);

module.exports = router;