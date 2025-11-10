const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    firstName: {type: String, required: [true, 'First name is required']},
    lastName: {type:String, required: [true, 'Last name is required']},
    username: {type: String, required: [true, 'Username is required'], unique: true, trim: true},
    email: {
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {type: String, required: [true, 'Password is required']},
    profilePictureURL: {type: String},
    bio: {type: String, maxlength: [500, 'Bio cannot exceed 500 characters']},
    role: {type: String, enum: ['user', 'admin'], default: 'user'},
    subscriptionTier: {type: String, enum: ['basic', 'premium'], default: 'basic'},
    subscriptionStatus: {type: String, enum: ['active', 'expired', 'cancelled'], default: 'active'},
    subscriptionStartDate: {type: Date},
    subscriptionEndDate: {type: Date},
    monthlyPublications: {type: Number, default: 0},
    lastPublicationReset: {type: Date, default: Date.now},
    accountStatus: {type: String, enum: ['active', 'suspended'], default: 'active'},
}, {
    timestamps: true
});

userSchema.index({email: 1});
userSchema.index({username: 1});

module.exports = mongoose.model('User', userSchema);