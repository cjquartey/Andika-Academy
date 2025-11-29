const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/User');
const Admin = require('../models/Admin');

const createSuperAdmin = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.DATABASE_URI);

        console.log('Connected to MongoDB');

        const email = process.env.SUPER_ADMIN_EMAIL || 'admin@andikaacademy.com';
        const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';

        // Check if super admin already exists
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            console.log('Super admin already exists with email:', email);
            
            // Check if admin profile exists
            const existingAdmin = await Admin.findOne({ user: existingUser._id });
            
            if (existingAdmin) {
                console.log('Admin profile already exists');
            } else {
                // Create admin profile
                const admin = new Admin({
                    user: existingUser._id,
                    permissions: [
                        'user_management',
                        'transaction_monitoring',
                        'dispute_resolution',
                        'analytics_view',
                        'platform_settings'
                    ],
                    isSuperAdmin: true
                });
                
                await admin.save();
                console.log('Admin profile created for existing user');
            }
            
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create super admin user
        const user = new User({
            firstName: 'Super',
            lastName: 'Admin',
            username: 'superadmin',
            email: email,
            password: hashedPassword,
            role: 'admin',
            subscriptionTier: 'premium',
            subscriptionStatus: 'active',
            accountStatus: 'active'
        });

        await user.save();
        console.log('Super admin user created');

        // Create admin profile
        const admin = new Admin({
            user: user._id,
            permissions: [
                'user_management',
                'transaction_monitoring',
                'dispute_resolution',
                'analytics_view',
                'platform_settings'
            ],
            isSuperAdmin: true
        });

        await admin.save();
        console.log('Admin profile created');

        console.log('Super Admin Created Successfully!');

        console.log('Email:', email);
        console.log('Password:', password);

        process.exit(0);
    } catch (error) {
        console.error('Error creating super admin:', error);
        process.exit(1);
    }
};

createSuperAdmin();