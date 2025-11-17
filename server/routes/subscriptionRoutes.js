const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');
const subscriptionMiddleware = require('../middleware/subscriptionMiddleware');

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);

// Protected routes
router.post('/activate-free',
    authMiddleware.verifyToken,
    subscriptionController.activateFreePlan
);
router.post('/initialize',
    authMiddleware.verifyToken,
    subscriptionMiddleware.validateSubscription,
    subscriptionController.initializeSubscription
);
router.get('/callback', subscriptionController.handleCallback);
router.get('/verify', subscriptionController.verifySubscription);
router.get('/history',
    authMiddleware.verifyToken,
    subscriptionController.getSubscriptionHistory
);
router.post('/cancel',
    authMiddleware.verifyToken,
    subscriptionController.cancelSubscription
);

module.exports = router;