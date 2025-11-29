const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Get all transactions with filters
const getAllTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            type,
            paymentMethod,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            userId,
            flagged,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const query = {};

        if (status) query.status = status;
        if (type) query.type = type;
        if (paymentMethod) query.paymentMethod = paymentMethod;
        if (userId) query.user = userId;
        if (flagged === 'true') query.status = 'flagged';

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = parseFloat(minAmount);
            if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const transactions = await Transaction.find(query)
            .populate('user', 'username email firstName lastName')
            .populate('flaggedBy', 'user')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch transactions',
            error: error.message
        });
    }
};

// Get transaction details
const getTransactionDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id)
            .populate('user', 'username email firstName lastName accountStatus')
            .populate('relatedSubscription')
            .populate('relatedWriting', 'title')
            .populate('flaggedBy');

        if (!transaction) {
            return res.status(404).json({
                status: 'error',
                message: 'Transaction not found'
            });
        }

        res.json({
            status: 'success',
            data: { transaction }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch transaction details',
            error: error.message
        });
    }
};

// Flag transaction as suspicious
const flagTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                status: 'error',
                message: 'Flag reason is required'
            });
        }

        const transaction = await Transaction.findById(id);

        if (!transaction) {
            return res.status(404).json({
                status: 'error',
                message: 'Transaction not found'
            });
        }

        transaction.status = 'flagged';
        transaction.flagReason = reason;
        transaction.flaggedBy = req.admin._id;
        transaction.flaggedAt = new Date();
        await transaction.save();

        res.json({
            status: 'success',
            message: 'Transaction flagged successfully',
            data: { transaction }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to flag transaction',
            error: error.message
        });
    }
};

// Unflag transaction
const unflagTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id);

        if (!transaction) {
            return res.status(404).json({
                status: 'error',
                message: 'Transaction not found'
            });
        }

        // Restore to previous status or set to completed
        transaction.status = transaction.status === 'flagged' ? 'completed' : transaction.status;
        transaction.flagReason = undefined;
        transaction.flaggedBy = undefined;
        transaction.flaggedAt = undefined;
        await transaction.save();

        res.json({
            status: 'success',
            message: 'Transaction unflagged successfully',
            data: { transaction }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to unflag transaction',
            error: error.message
        });
    }
};

// Get transaction statistics
const getTransactionStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateQuery = {};
        if (startDate || endDate) {
            dateQuery.createdAt = {};
            if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
            if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
        }

        const [
            totalStats,
            statusBreakdown,
            typeBreakdown,
            recentFlagged
        ] = await Promise.all([
            Transaction.aggregate([
                { $match: { ...dateQuery } },
                {
                    $group: {
                        _id: null,
                        totalTransactions: { $sum: 1 },
                        totalRevenue: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
                            }
                        },
                        avgTransaction: { $avg: '$amount' }
                    }
                }
            ]),
            Transaction.aggregate([
                { $match: { ...dateQuery } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Transaction.aggregate([
                { $match: { ...dateQuery } },
                { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }
            ]),
            Transaction.find({ status: 'flagged' })
                .populate('user', 'username email')
                .sort({ flaggedAt: -1 })
                .limit(10)
        ]);

        res.json({
            status: 'success',
            data: {
                overview: totalStats[0] || { totalTransactions: 0, totalRevenue: 0, avgTransaction: 0 },
                byStatus: statusBreakdown,
                byType: typeBreakdown,
                recentFlagged
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch transaction stats',
            error: error.message
        });
    }
};

module.exports = {
    getAllTransactions,
    getTransactionDetails,
    flagTransaction,
    unflagTransaction,
    getTransactionStats
};