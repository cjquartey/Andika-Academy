const {body, validationResult} = require('express-validator');

const validateCreateComment = [
    body('content')
        .trim()
        .notEmpty().withMessage('Content is required')
        .isLength({max: 1000}),

    body('rating')
        .optional()
        .isInt({min: 1, max: 5}).withMessage('Rating must be a whole number between 1 and 5 (inclusive)'),

    body('parentComment')
        .optional()
        .isMongoId().withMessage('Parent comment must be a valid Mongo ID'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({success: false, message: errorMessages});
        }
        next();
    }
];

const validateUpdateComment = [
    body('content')
        .optional()
        .trim()
        .notEmpty().withMessage('Content is required')
        .isLength({max: 1000}),

    body('rating')
        .optional()
        .isInt({min: 1, max: 5}).withMessage('Rating must be a whole number between 1 and 5 (inclusive)'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({success: false, message: errorMessages});
        }
        next();
    }
];

const validateModerateComment = [
    body('status')
        .trim()
        .notEmpty().withMessage('Status is required')
        .toLowerCase()
        .isIn(['approved', 'flagged', 'deleted']),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({success: false, message: errorMessages});
        }
        next();
    }
];

module.exports = {
    validateCreateComment,
    validateUpdateComment,
    validateModerateComment
}