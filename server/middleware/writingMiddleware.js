const {body, validationResult} = require('express-validator');

const validateCreate = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({min:1, max:100}),
    
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['prose', 'poetry', 'drama']).withMessage('Valid categories are: prose, poetry, and drama'),
    
    // Custom validation for category-specific content
    body().custom((value, { req }) => {
        const category = req.body.category;
        
        if (category === 'prose') {
            if (!req.body.content || req.body.content.trim() === '') {
                throw new Error('Content is required for prose');
            }
        } else if (category === 'poetry') {
            if (!req.body.stanzas || !Array.isArray(req.body.stanzas) || req.body.stanzas.length === 0) {
                throw new Error('At least one stanza is required for poetry');
            }
            // Validate each stanza has lines
            for (let stanza of req.body.stanzas) {
                if (!stanza.lines || !Array.isArray(stanza.lines) || stanza.lines.length === 0) {
                    throw new Error('Each stanza must have at least one line');
                }
            }
        } else if (category === 'drama') {
            if (!req.body.dialogues || !Array.isArray(req.body.dialogues) || req.body.dialogues.length === 0) {
                throw new Error('At least one dialogue entry is required for drama');
            }
            // Validate each dialogue has speaker and text
            for (let dialogue of req.body.dialogues) {
                if (!dialogue.speaker || !dialogue.text) {
                    throw new Error('Each dialogue must have a speaker and text');
                }
            }
        }
        
        return true;
    }),
    
    body('description')
        .optional()
        .isLength({max: 500}).withMessage('Description cannot exceed 500 characters'),
    
    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array')
        .custom((value) => {
            if (value && value.length > 10) throw new Error('A maximum of 10 tags allowed!')
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
    
    // Custom validation for category-specific content when updating
    body().custom((value, { req }) => {
        const category = req.body.category;
        
        if (!category) return true; // Skip if category not being updated
        
        if (category === 'prose') {
            if (req.body.content !== undefined && req.body.content.trim() === '') {
                throw new Error('Content cannot be empty for prose');
            }
        } else if (category === 'poetry') {
            if (req.body.stanzas !== undefined) {
                if (!Array.isArray(req.body.stanzas) || req.body.stanzas.length === 0) {
                    throw new Error('At least one stanza is required for poetry');
                }
                for (let stanza of req.body.stanzas) {
                    if (!stanza.lines || !Array.isArray(stanza.lines) || stanza.lines.length === 0) {
                        throw new Error('Each stanza must have at least one line');
                    }
                }
            }
        } else if (category === 'drama') {
            if (req.body.dialogues !== undefined) {
                if (!Array.isArray(req.body.dialogues) || req.body.dialogues.length === 0) {
                    throw new Error('At least one dialogue entry is required for drama');
                }
                for (let dialogue of req.body.dialogues) {
                    if (!dialogue.speaker || !dialogue.text) {
                        throw new Error('Each dialogue must have a speaker and text');
                    }
                }
            }
        }
        
        return true;
    }),
    
    body('description')
        .optional()
        .isLength({max: 500}).withMessage('Description cannot exceed 500 characters'),
    
    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array')
        .custom((value) => {
            if (value && value.length > 10) throw new Error('A maximum of 10 tags allowed!')
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
            return res.status(400).json({success: false, message: errorMessages})
        };
        next();
    }
];

module.exports = {validateCreate, validateUpdate};