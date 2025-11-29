const mongoose = require('mongoose');
const {Schema} = mongoose;

const disputeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transaction: {
        type: Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    type: {
        type: String,
        enum: ['payment_issue', 'refund_request', 'unauthorized_charge', 'service_complaint', 'other'],
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'rejected', 'escalated'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    subject: {
        type: String,
        required: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    resolution: {
        type: String,
        maxlength: 2000
    },
    refundAmount: {
        type: Number,
        min: 0
    },
    refundProcessed: {
        type: Boolean,
        default: false
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    assignedAt: {
        type: Date
    },
    resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    resolvedAt: {
        type: Date
    },
    attachments: [{
        url: String,
        filename: String,
        uploadedAt: Date
    }],
    comments: [{
        author: {
            type: Schema.Types.ObjectId,
            refPath: 'comments.authorModel'
        },
        authorModel: {
            type: String,
            enum: ['User', 'Admin']
        },
        content: String,
        isInternal: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

disputeSchema.index({user: 1, createdAt: -1});
disputeSchema.index({status: 1, priority: -1});
disputeSchema.index({assignedTo: 1, status: 1});
disputeSchema.index({transaction: 1});

module.exports = mongoose.model('Dispute', disputeSchema);