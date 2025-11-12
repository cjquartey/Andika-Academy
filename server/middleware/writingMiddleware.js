const {body, validationResult} = require('express-validator');

const validateCreate = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({min:1, max:100}),
    
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['prose', 'poetry', 'drama']).withMessage('Valid categories are: prose, poetry, and drama'),
    
    body('content')
        .notEmpty().withMessage('Writing content is required'),
    
    body('description')
        .optional()
        .isLength({max: 500}).withMessage('Description cannot exceed 500 characters'),
    
    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array')
        .custom((value) => {
            if (value.length > 10)throw new Error('A maximum of 10 tags allowed!')
            return true;
        }),

    body('accessLevel')
        .isIn(['free', 'premium']).withMessage('Only two valid access levels: free or premium'),

    (req, res, next) => {
        if (req.body.accessLevel === 'premium' && req.user.subscriptionTier !== 'premium'){
            return res.status(403).json({
                success: false,
                message: 'Only premium users can create premium content'
            })
        }
        next();
    },

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({success: false, message: errorMessages})
        };
        next();
    }
];

const validateUpdate = [
    body('title')
        .optional()
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({min:1, max:100}),
    
    body('category')
        .optional()
        .notEmpty().withMessage('Category is required')
        .isIn(['prose', 'poetry', 'drama']).withMessage('Valid categories are: prose, poetry, and drama'),
    
    body('content')
        .optional()
        .notEmpty().withMessage('Writing content is required'),
    
    body('description')
        .optional()
        .isLength({max: 500}).withMessage('Description cannot exceed 500 characters'),
    
    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array')
        .custom((value) => {
            if (value.length > 10)throw new Error('A maximum of 10 tags allowed!')
            return true;
        }),

    body('accessLevel')
        .optional()
        .isIn(['free', 'premium']).withMessage('Only two valid access levels: free or premium'),
    
    (req, res, next) => {
        if (req.body.accessLevel === 'premium' && req.user.subscriptionTier !== 'premium'){
            return res.status(403).json({
                success: false,
                message: 'Only premium users can create premium content'
            })
        }
        next();
    },

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({success: false, message: errorMessages});
        };
        next();
    }
];

module.exports = {
    validateCreate,
    validateUpdate
}