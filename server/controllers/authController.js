const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try{
        const {username, firstName, lastName, email, password} = req.body;

        const existingUser = await User.findOne({$or: [{email}, {username}]});

        if (existingUser){
            if (existingUser.email === email){
                return res.status(409).json({'message': 'Email already exists'});
            }
            if (existingUser.username === username){
                return res.status(409).json({'message': 'Username already taken'});
            }
        }

        const hashedPwd = await bcrypt.hash(password, 10);

        const result = await User.create({
            username,
            firstName,
            lastName,
            email,
            'password': hashedPwd
        });

        console.log(result);
        res.status(201).json({
            message:`New User ${username} registered!`,
            success: true,
            user: {username, firstName, lastName, email}
        });
    }catch(err){
        res.status(500).json({'message': err.message});
    }
}

const login = async (req, res) => {
    try{
        const {email, password} = req.body;

        const foundUser = await User.findOne({email: email}).select('+password');
        if (!foundUser) return res.status(401).json({'message': 'Invalid credentials'});

        const match = await bcrypt.compare(password, foundUser.password);
        if (!match) return res.status(401).json({'message': 'Invalid credentials'});  

        const accessToken = jwt.sign(
            {'userId': foundUser._id}, 
            process.env.JWT_SECRET, 
            {expiresIn: '7d'}
        );

        res.status(200).json({accessToken});
        
    } catch(err){
        return res.status(500).json({message: err.message});
    }
}

const getCurrentUser = async (req, res) => {
    try {
        const id = req.user.id;
        const foundUser = await User.findOne({_id: id});
        if(!foundUser) return res.status(404).json({'message': 'User not found'});

        const {username, email, firstName, lastName, bio, role, subscriptionTier, profilePictureURL} = foundUser;

        return res.status(200).json({
            success: true,
            user: {id, username, email, firstName, lastName, bio, role, subscriptionTier, profilePictureURL}
        })
    } catch(err){
        res.status(500).json({message: err.message});
    }
}

module.exports = {register, login, getCurrentUser};