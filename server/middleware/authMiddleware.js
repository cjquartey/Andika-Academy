const {body, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');

const validateRegister = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required'),
    
    body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required'),
    
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required'),
    
    body('email')
        .trim().toLowerCase()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({'message': errorMessages});
        }
        next();
    }
];

const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required'),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            const errorMessages = errors.array().map(err => err.msg);
            return res.status(400).json({'message': errorMessages});
        }
        next();
    }
];

const verifyToken = (req, res, next) => {
    try{
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401);

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {id: decoded.userId};
        next();
    } catch(err){
        return res.status(401).json({message: 'Invalid or expired token'});
    }
}

module.exports = {validateRegister, validateLogin, verifyToken}