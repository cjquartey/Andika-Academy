const mongoose = require('mongoose');
const {Schema} = mongoose;

const auditLogSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'user_suspended',
            'user_deleted',
            'user_reinstated',
            'transaction_flagged',
            'transaction_unflagged',
            'dispute_assigned',
            'dispute_resolved',
            'dispute_rejected',
            'refund_processed',
            'settings_updated'
        ]
    },
    targetModel: {
        type: String,
        enum: ['User', 'Transaction', 'Dispute', 'Settings']
    },
    targetId: {
        type: Schema.Types.ObjectId
    },
    details: {
        type: Map,
        of: Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

auditLogSchema.index({admin: 1, createdAt: -1});
auditLogSchema.index({action: 1, createdAt: -1});
auditLogSchema.index({targetModel: 1, targetId: 1});

module.exports = mongoose.model('AuditLog', auditLogSchema);