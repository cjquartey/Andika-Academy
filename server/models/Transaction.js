const mongoose = require('mongoose');
const {Schema} = mongoose;

const transactionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    type: {
        type: String,
        enum: ['subscription', 'tip', 'refund'],
        required: true
    },
    amount: {
        type: Number, 
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'GHS',
        uppercase: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded', 'flagged'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['mobile_money', 'card', 'bank_transfer'],
        required: true
    },
    paystackReference: {
        type: String,
        unique: true,
        sparse: true
    },
    authorizationCode: {
        type: String
    },
    channel: {
        type: String
    },
    relatedSubscription: {
        type: Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    relatedWriting: {
        type: Schema.Types.ObjectId,
        ref: 'Writing'
    },
    flagReason: {
        type: String
    },
    flaggedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    flaggedAt: {
        type: Date
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

transactionSchema.index({user: 1, createdAt: -1});
transactionSchema.index({status: 1});
transactionSchema.index({paystackReference: 1});
transactionSchema.index({type: 1, createdAt: -1});

module.exports = mongoose.model('Transaction', transactionSchema);