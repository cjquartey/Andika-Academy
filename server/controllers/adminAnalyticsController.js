const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Writing = require('../models/Writing');
const Dispute = require('../models/Dispute');

// Get dashboard overview
const getDashboardOverview = async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const [
            totalUsers,
            activeSubscribers,
            totalRevenue,
            recentTransactions,
            pendingDisputes,
            flaggedTransactions,
            newUsersCount,
            platformGrowth
        ] = await Promise.all([
            User.countDocuments(),
            Subscription.countDocuments({ status: 'active' }),
            Transaction.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]),
            Transaction.countDocuments({
                createdAt: { $gte: startDate }
            }),
            Dispute.countDocuments({
                status: { $in: ['open', 'in_progress'] }
            }),
            Transaction.countDocuments({ status: 'flagged' }),
            User.countDocuments({
                createdAt: { $gte: startDate }
            }),
            User.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        res.json({
            status: 'success',
            data: {
                overview: {
                    totalUsers,
                    activeSubscribers,
                    totalRevenue: totalRevenue[0]?.total || 0,
                    recentTransactions,
                    pendingDisputes,
                    flaggedTransactions,
                    newUsers: newUsersCount
                },
                growth: platformGrowth
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dashboard overview',
            error: error.message
        });
    }
};

// Get revenue analytics
const getRevenueAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        const dateQuery = {};
        if (startDate || endDate) {
            dateQuery.createdAt = {};
            if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
            if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
        }

        const groupByFormat = {
            day: '%Y-%m-%d',
            week: '%Y-W%V',
            month: '%Y-%m'
        };

        const [revenueByPeriod, revenueByType, revenueByPaymentMethod] = await Promise.all([
            Transaction.aggregate([
                {
                    $match: {
                        status: 'completed',
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: groupByFormat[groupBy] || groupByFormat.day,
                                date: '$createdAt'
                            }
                        },
                        revenue: { $sum: '$amount' },
                        transactions: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        status: 'completed',
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        revenue: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        status: 'completed',
                        ...dateQuery
                    }
                },
                {
                    $group: {
                        _id: '$paymentMethod',
                        revenue: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        res.json({
            status: 'success',
            data: {
                byPeriod: revenueByPeriod,
                byType: revenueByType,
                byPaymentMethod: revenueByPaymentMethod
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch revenue analytics',
            error: error.message
        });
    }
};

// Get user analytics
const getUserAnalytics = async (req, res) => {
    try {
        const [
            usersByTier,
            usersByStatus,
            userGrowth,
            topWriters,
            topSpenders
        ] = await Promise.all([
            User.aggregate([
                {
                    $group: {
                        _id: '$subscriptionTier',
                        count: { $sum: 1 }
                    }
                }
            ]),
            User.aggregate([
                {
                    $group: {
                        _id: '$accountStatus',
                        count: { $sum: 1 }
                    }
                }
            ]),
            User.aggregate([
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m',
                                date: '$createdAt'
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 12 }
            ]),
            Writing.aggregate([
                {
                    $group: {
                        _id: '$author',
                        publicationCount: { $sum: 1 }
                    }
                },
                { $sort: { publicationCount: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' }
            ]),
            Transaction.aggregate([
                {
                    $match: { status: 'completed' }
                },
                {
                    $group: {
                        _id: '$user',
                        totalSpent: { $sum: '$amount' },
                        transactionCount: { $sum: 1 }
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' }
            ])
        ]);

        res.json({
            status: 'success',
            data: {
                byTier: usersByTier,
                byStatus: usersByStatus,
                growth: userGrowth,
                topWriters,
                topSpenders
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user analytics',
            error: error.message
        });
    }
};

// Get content analytics
const getContentAnalytics = async (req, res) => {
    try {
        const [totalWritings, writingsByCategory, recentPublications] = await Promise.all([
            Writing.countDocuments(),
            Writing.aggregate([
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            Writing.find()
                .populate('author', 'username')
                .sort({ publishDate: -1 })
                .limit(10)
        ]);

        res.json({
            status: 'success',
            data: {
                totalWritings,
                byCategory: writingsByCategory,
                recentPublications
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch content analytics',
            error: error.message
        });
    }
};

// Export data as CSV
const exportData = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;

        if (!type) {
            return res.status(400).json({
                status: 'error',
                message: 'Export type is required'
            });
        }

        const dateQuery = {};
        if (startDate || endDate) {
            dateQuery.createdAt = {};
            if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
            if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
        }

        let data;
        let headers;

        switch (type) {
            case 'users':
                data = await User.find(dateQuery).select('-password').lean();
                headers = ['_id', 'username', 'email', 'firstName', 'lastName', 'role', 'subscriptionTier', 'accountStatus', 'createdAt'];
                break;

            case 'transactions':
                data = await Transaction.find(dateQuery).populate('user', 'username email').lean();
                headers = ['_id', 'user', 'type', 'amount', 'currency', 'status', 'paymentMethod', 'createdAt'];
                break;

            case 'disputes':
                data = await Dispute.find(dateQuery).populate('user', 'username email').lean();
                headers = ['_id', 'user', 'type', 'status', 'priority', 'subject', 'createdAt'];
                break;

            default:
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid export type'
                });
        }

        // Convert to CSV
        const csv = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    let value = row[header];
                    if (typeof value === 'object' && value !== null) {
                        value = value.username || value.email || JSON.stringify(value);
                    }
                    return `"${value || ''}"`;
                }).join(',')
            )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to export data',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardOverview,
    getRevenueAnalytics,
    getUserAnalytics,
    getContentAnalytics,
    exportData
};