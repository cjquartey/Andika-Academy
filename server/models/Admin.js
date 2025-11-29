const mongoose = require('mongoose');
const {Schema} = mongoose;

const adminSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true
    },
    permissions: [{
        type: String,
        enum: [
            'user_management',
            'transaction_monitoring', 
            'dispute_resolution',
            'analytics_view',
            'platform_settings'
        ]
    }],
    isSuperAdmin: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    loginHistory: [{
        timestamp: Date,
        ipAddress: String,
        userAgent: String
    }]
}, {
    timestamps: true
});

adminSchema.index({user: 1});

module.exports = mongoose.model('Admin', adminSchema);