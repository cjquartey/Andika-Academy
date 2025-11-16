const {param, validationResult} = require('express-validator');

const validateWritingId = [
    param('writingId')
        .isMongoId().withMessage('Writing ID must be a valid Mongo ID'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({success: false, message: errorMessages});
        }
        next();
    }
];

module.exports = {validateWritingId};