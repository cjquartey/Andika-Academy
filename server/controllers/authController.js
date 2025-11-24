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
};

const getUserById = async (req, res) => {
    try {
        const userId = req.params.userId;
        const foundUser = await User.findById(userId);
        
        if(!foundUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const {_id, username, firstName, lastName, bio, subscriptionTier, profilePictureURL, createdAt} = foundUser;

        return res.status(200).json({
            success: true,
            user: {
                id: _id,
                username,
                firstName,
                lastName,
                bio,
                subscriptionTier,
                profilePictureURL,
                createdAt
            }
        });
    } catch(err){
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const userId = req.user.id;
        const imageUrl = `/public/uploads/profiles/${req.file.filename}`;

        // Update user's profile picture URL
        await User.findByIdAndUpdate(userId, {
            profilePictureURL: imageUrl
        });

        return res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            message: 'Profile picture uploaded successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, bio, profilePictureURL } = req.body;

        const updateData = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (bio !== undefined) updateData.bio = bio;
        if (profilePictureURL !== undefined) updateData.profilePictureURL = profilePictureURL;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { username, email, firstName: fName, lastName: lName, bio: userBio, role, subscriptionTier, profilePictureURL: picURL } = updatedUser;

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: userId,
                username,
                email,
                firstName: fName,
                lastName: lName,
                bio: userBio,
                role,
                subscriptionTier,
                profilePictureURL: picURL
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    register,
    login, 
    getCurrentUser,
    getUserById,
    uploadProfilePicture,
    updateProfile,
    updatePassword
};