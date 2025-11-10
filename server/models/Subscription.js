const mongoose = require('mongoose');
const {Schema} = mongoose;

const subscriptionSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: [true, 'User is required']},
    amount: {type: Number, required: [true, 'Amount is required'], min: [1, 'Amount must be greater than 0']},
    currency: {type: String, default: 'GHS', uppercase: true},
    status: {
        type: String, 
        enum: ['active', 'pending', 'expired', 'cancelled'],
        default: 'pending',
        required: [true, 'Status is required']
    },
    paymentMethod: {
        type: String,
        enum: ['mobile_money', 'card'],
        required: [true, 'Payment method is required']
    },
    transactionId: {type: String, required: [true, 'TransactionID is required'], unique: true},
    startDate: {type: Date, required: [true, 'Start date is required']},
    endDate: {type: Date, required: [true, 'End date is required']}
}, {
    timestamps: true
});

subscriptionSchema.index({user: 1, createdAt: -1});
subscriptionSchema.index({status: 1, endDate: 1});
subscriptionSchema.index({transactionId: 1});

module.exports = mongoose.model('Subscription', subscriptionSchema);