const { body, validationResult } = require('express-validator');

const validateSubscription = [
    body('planType')
        .notEmpty().withMessage('Plan type is required')
        .isIn(['basic', 'premium']).withMessage('Invalid plan type'),
    
    body('paymentMethod')
        .optional()
        .isIn(['mobile_money', 'card']).withMessage('Invalid payment method'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg)
            });
        }
        next();
    }
];

module.exports = {validateSubscription};