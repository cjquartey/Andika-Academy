const Dispute = require('../models/Dispute');
const Transaction = require('../models/Transaction');

// Get all disputes with filters
const getAllDisputes = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            type,
            priority,
            assignedTo,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const query = {};

        if (status) query.status = status;
        if (type) query.type = type;
        if (priority) query.priority = priority;
        if (assignedTo) {
            query.assignedTo = assignedTo === 'unassigned' ? null : assignedTo;
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const disputes = await Dispute.find(query)
            .populate('user', 'username email firstName lastName')
            .populate('transaction')
            .populate('assignedTo')
            .populate('resolvedBy')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Dispute.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                disputes,
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
            message: 'Failed to fetch disputes',
            error: error.message
        });
    }
};

// Get dispute details
const getDisputeDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const dispute = await Dispute.findById(id)
            .populate('user', 'username email firstName lastName accountStatus')
            .populate('transaction')
            .populate('assignedTo')
            .populate('resolvedBy')
            .populate('comments.author');

        if (!dispute) {
            return res.status(404).json({
                status: 'error',
                message: 'Dispute not found'
            });
        }

        res.json({
            status: 'success',
            data: { dispute }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dispute details',
            error: error.message
        });
    }
};

// Assign dispute to admin
const assignDispute = async (req, res) => {
    try {
        const { id } = req.params;

        const dispute = await Dispute.findById(id);

        if (!dispute) {
            return res.status(404).json({
                status: 'error',
                message: 'Dispute not found'
            });
        }

        dispute.assignedTo = req.admin._id;
        dispute.assignedAt = new Date();
        dispute.status = 'in_progress';
        await dispute.save();

        await dispute.populate('assignedTo');

        res.json({
            status: 'success',
            message: 'Dispute assigned successfully',
            data: { dispute }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to assign dispute',
            error: error.message
        });
    }
};

// Add comment to dispute
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, isInternal } = req.body;

        if (!content) {
            return res.status(400).json({
                status: 'error',
                message: 'Comment content is required'
            });
        }

        const dispute = await Dispute.findById(id);

        if (!dispute) {
            return res.status(404).json({
                status: 'error',
                message: 'Dispute not found'
            });
        }

        dispute.comments.push({
            author: req.admin._id,
            authorModel: 'Admin',
            content,
            isInternal: isInternal || false,
            createdAt: new Date()
        });

        await dispute.save();
        await dispute.populate('comments.author');

        res.json({
            status: 'success',
            message: 'Comment added successfully',
            data: { dispute }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to add comment',
            error: error.message
        });
    }
};

// Resolve dispute
const resolveDispute = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, refundAmount } = req.body;

        if (!resolution) {
            return res.status(400).json({
                status: 'error',
                message: 'Resolution details are required'
            });
        }

        const dispute = await Dispute.findById(id);

        if (!dispute) {
            return res.status(404).json({
                status: 'error',
                message: 'Dispute not found'
            });
        }

        dispute.status = 'resolved';
        dispute.resolution = resolution;
        dispute.resolvedBy = req.admin._id;
        dispute.resolvedAt = new Date();

        if (refundAmount && refundAmount > 0) {
            dispute.refundAmount = refundAmount;
            
            // Create refund transaction
            const refundTransaction = new Transaction({
                user: dispute.user,
                type: 'refund',
                amount: refundAmount,
                currency: 'GHS',
                status: 'pending',
                paymentMethod: 'refund',
                metadata: new Map([
                    ['disputeId', dispute._id.toString()],
                    ['originalTransactionId', dispute.transaction.toString()]
                ])
            });
            await refundTransaction.save();

            dispute.refundProcessed = true;
        }

        await dispute.save();
        await dispute.populate(['resolvedBy', 'user', 'transaction']);

        res.json({
            status: 'success',
            message: 'Dispute resolved successfully',
            data: { dispute }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to resolve dispute',
            error: error.message
        });
    }
};

// Reject dispute
const rejectDispute = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body;

        if (!resolution) {
            return res.status(400).json({
                status: 'error',
                message: 'Rejection reason is required'
            });
        }

        const dispute = await Dispute.findById(id);

        if (!dispute) {
            return res.status(404).json({
                status: 'error',
                message: 'Dispute not found'
            });
        }

        dispute.status = 'rejected';
        dispute.resolution = resolution;
        dispute.resolvedBy = req.admin._id;
        dispute.resolvedAt = new Date();

        await dispute.save();
        await dispute.populate(['resolvedBy', 'user']);

        res.json({
            status: 'success',
            message: 'Dispute rejected successfully',
            data: { dispute }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to reject dispute',
            error: error.message
        });
    }
};

// Update dispute priority
const updatePriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid priority value'
            });
        }

        const dispute = await Dispute.findById(id);

        if (!dispute) {
            return res.status(404).json({
                status: 'error',
                message: 'Dispute not found'
            });
        }

        dispute.priority = priority;
        await dispute.save();

        res.json({
            status: 'success',
            message: 'Priority updated successfully',
            data: { dispute }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to update priority',
            error: error.message
        });
    }
};

// Get dispute statistics
const getDisputeStats = async (req, res) => {
    try {
        const [
            statusBreakdown,
            typeBreakdown,
            priorityBreakdown,
            avgResolutionTime,
            recentDisputes
        ] = await Promise.all([
            Dispute.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Dispute.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            Dispute.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            Dispute.aggregate([
                {
                    $match: {
                        status: { $in: ['resolved', 'rejected'] },
                        resolvedAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        resolutionTime: {
                            $divide: [
                                { $subtract: ['$resolvedAt', '$createdAt'] },
                                1000 * 60 * 60 // Convert to hours
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgHours: { $avg: '$resolutionTime' }
                    }
                }
            ]),
            Dispute.find()
                .populate('user', 'username email')
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        res.json({
            status: 'success',
            data: {
                byStatus: statusBreakdown,
                byType: typeBreakdown,
                byPriority: priorityBreakdown,
                avgResolutionTime: avgResolutionTime[0]?.avgHours || 0,
                recentDisputes
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dispute stats',
            error: error.message
        });
    }
};

module.exports = {
    getAllDisputes,
    getDisputeDetails,
    assignDispute,
    addComment,
    resolveDispute,
    rejectDispute,
    updatePriority,
    getDisputeStats
};