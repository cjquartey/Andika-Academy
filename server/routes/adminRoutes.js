const express = require('express');
const router = express.Router();

const { authenticate, isAdmin, hasPermission, logAction } = require('../middleware/adminAuth');

const userController = require('../controllers/adminUserController');
const transactionController = require('../controllers/adminTransactionController');
const disputeController = require('../controllers/adminDisputeController');
const analyticsController = require('../controllers/adminAnalyticsController');

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// ============ USER MANAGEMENT ROUTES ============
router.get('/users', 
    hasPermission('user_management'), 
    userController.getAllUsers
);

router.get('/users/:id', 
    hasPermission('user_management'), 
    userController.getUserDetails
);

router.patch('/users/:id/suspend', 
    hasPermission('user_management'),
    logAction('user_suspended'),
    userController.suspendUser
);

router.patch('/users/:id/reinstate', 
    hasPermission('user_management'),
    logAction('user_reinstated'),
    userController.reinstateUser
);

router.delete('/users/:id', 
    hasPermission('user_management'),
    logAction('user_deleted'),
    userController.deleteUser
);

// ============ TRANSACTION MONITORING ROUTES ============
router.get('/transactions', 
    hasPermission('transaction_monitoring'), 
    transactionController.getAllTransactions
);

router.get('/transactions/stats', 
    hasPermission('transaction_monitoring'), 
    transactionController.getTransactionStats
);

router.get('/transactions/:id', 
    hasPermission('transaction_monitoring'), 
    transactionController.getTransactionDetails
);

router.patch('/transactions/:id/flag', 
    hasPermission('transaction_monitoring'),
    logAction('transaction_flagged'),
    transactionController.flagTransaction
);

router.patch('/transactions/:id/unflag', 
    hasPermission('transaction_monitoring'),
    logAction('transaction_unflagged'),
    transactionController.unflagTransaction
);

// ============ DISPUTE RESOLUTION ROUTES ============
router.get('/disputes', 
    hasPermission('dispute_resolution'), 
    disputeController.getAllDisputes
);

router.get('/disputes/stats', 
    hasPermission('dispute_resolution'), 
    disputeController.getDisputeStats
);

router.get('/disputes/:id', 
    hasPermission('dispute_resolution'), 
    disputeController.getDisputeDetails
);

router.patch('/disputes/:id/assign', 
    hasPermission('dispute_resolution'),
    logAction('dispute_assigned'),
    disputeController.assignDispute
);

router.post('/disputes/:id/comments', 
    hasPermission('dispute_resolution'),
    disputeController.addComment
);

router.patch('/disputes/:id/resolve', 
    hasPermission('dispute_resolution'),
    logAction('dispute_resolved'),
    disputeController.resolveDispute
);

router.patch('/disputes/:id/reject', 
    hasPermission('dispute_resolution'),
    logAction('dispute_rejected'),
    disputeController.rejectDispute
);

router.patch('/disputes/:id/priority', 
    hasPermission('dispute_resolution'),
    disputeController.updatePriority
);

// ============ ANALYTICS ROUTES ============
router.get('/analytics/dashboard', 
    hasPermission('analytics_view'), 
    analyticsController.getDashboardOverview
);

router.get('/analytics/revenue', 
    hasPermission('analytics_view'), 
    analyticsController.getRevenueAnalytics
);

router.get('/analytics/users', 
    hasPermission('analytics_view'), 
    analyticsController.getUserAnalytics
);

router.get('/analytics/content', 
    hasPermission('analytics_view'), 
    analyticsController.getContentAnalytics
);

router.get('/analytics/export', 
    hasPermission('analytics_view'), 
    analyticsController.exportData
);

module.exports = router;