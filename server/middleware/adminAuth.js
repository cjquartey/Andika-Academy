const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Verify user is authenticated
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (user.accountStatus === 'suspended') {
            return res.status(403).json({
                status: 'error',
                message: 'Account suspended'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token'
        });
    }
};

// Verify user is admin
const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Admin access required'
            });
        }

        const admin = await Admin.findOne({ user: req.user._id });
        
        if (!admin) {
            return res.status(403).json({
                status: 'error',
                message: 'Admin profile not found'
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Authorization check failed'
        });
    }
};

// Check if admin has specific permission
const hasPermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (req.admin.isSuperAdmin) {
                return next();
            }

            if (!req.admin.permissions.includes(permission)) {
                return res.status(403).json({
                    status: 'error',
                    message: `Permission denied: ${permission} required`
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                message: 'Permission check failed'
            });
        }
    };
};

// Log admin actions
const logAction = (action) => {
    return async (req, res, next) => {
        const AuditLog = require('../models/AuditLog');
        
        // Store original json function
        const originalJson = res.json.bind(res);
        
        // Override res.json to log after response
        res.json = function(data) {
            // Only log if successful
            if (data.status === 'success') {
                AuditLog.create({
                    admin: req.admin._id,
                    action: action,
                    targetModel: req.body.targetModel,
                    targetId: req.body.targetId || req.params.id,
                    details: new Map(Object.entries(req.body)),
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }).catch(err => console.error('Audit log failed:', err));
            }
            
            return originalJson(data);
        };
        
        next();
    };
};

module.exports = {
    authenticate,
    isAdmin,
    hasPermission,
    logAction
};