const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Writing = require('../models/Writing');

// Get all users with pagination and filters
const getAllUsers = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search, 
            role, 
            subscriptionTier,
            accountStatus,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { username: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { firstName: new RegExp(search, 'i') },
                { lastName: new RegExp(search, 'i') }
            ];
        }

        if (role) query.role = role;
        if (subscriptionTier) query.subscriptionTier = subscriptionTier;
        if (accountStatus) query.accountStatus = accountStatus;

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const users = await User.find(query)
            .select('-password')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                users,
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
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Get user details with stats
const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const Comment = require('../models/Comment');

        const user = await User.findById(id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Get user stats
        const [subscriptions, transactions, writingsCount, totalViews, totalComments] = await Promise.all([
            Subscription.find({ user: id }).sort({ createdAt: -1 }).limit(5),
            Transaction.find({ user: id }).sort({ createdAt: -1 }).limit(10),
            Writing.countDocuments({ author: id }),
            // Calculate total views from all user's writings
            Writing.aggregate([
                { $match: { author: user._id } },
                { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
            ]),
            // Count total comments by this user
            Comment.countDocuments({ author: id })
        ]);

        const totalSpent = await Transaction.aggregate([
            { $match: { user: user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            status: 'success',
            data: {
                user,
                stats: {
                    totalWritings: writingsCount,
                    totalViews: totalViews[0]?.totalViews || 0,
                    totalComments: totalComments,
                    totalSpent: totalSpent[0]?.total || 0,
                    activeSubscription: subscriptions.find(s => s.status === 'active'),
                    recentTransactions: transactions,
                    recentSubscriptions: subscriptions
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user details',
            error: error.message
        });
    }
};

// Suspend user
const suspendUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Optional reason
        const reason = req.body?.reason;

        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (user.role === 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Cannot suspend admin users'
            });
        }

        user.accountStatus = 'suspended';
        
        // Optionally store the reason if provided
        if (reason) {
            user.suspensionReason = reason;
        }
        
        await user.save();

        res.json({
            status: 'success',
            message: 'User suspended successfully',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to suspend user',
            error: error.message
        });
    }
};

// Reinstate user
const reinstateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        user.accountStatus = 'active';
        
        // Clear suspension reason if it exists
        if (user.suspensionReason) {
            user.suspensionReason = undefined;
        }
        
        await user.save();

        res.json({
            status: 'success',
            message: 'User reinstated successfully',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to reinstate user',
            error: error.message
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (user.role === 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Cannot delete admin users'
            });
        }

        // Soft delete - mark as deleted
        user.accountStatus = 'suspended';
        user.email = `deleted_${Date.now()}_${user.email}`;
        user.username = `deleted_${Date.now()}_${user.username}`;
        await user.save();

        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete user',
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserDetails,
    suspendUser,
    reinstateUser,
    deleteUser
};