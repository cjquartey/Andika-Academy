# Paystack Integration for Andika Academy - Complete Guide

## Overview
This guide details the implementation of Paystack payment integration for Andika Academy's subscription-based platform. Unlike the previous e-commerce implementation, this focuses on recurring subscription payments.

## Project Structure

```
andika-academy/
├── server/
│   ├── config/
│   │   ├── database.js
│   │   └── paystack.js          # NEW - Paystack configuration
│   ├── models/
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   └── Writing.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── subscriptionController.js  # NEW - Subscription logic
│   │   └── paystackController.js      # NEW - Paystack handlers
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── subscriptionMiddleware.js  # NEW - Subscription checks
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── subscriptionRoutes.js      # NEW - Subscription routes
│   └── utils/
│       ├── paystackHelper.js          # NEW - Paystack utilities
│       └── emailHelper.js             # NEW - Email notifications
├── .env
└── server.js
```

## Files to Create

### 1. Paystack Configuration (`server/config/paystack.js`)

```javascript
require('dotenv').config();

const PAYSTACK_CONFIG = {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    baseUrl: 'https://api.paystack.co',
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:5000/api/subscriptions/callback'
};

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
    basic: {
        name: 'Basic Plan',
        amount: 299, // 2.99 GHS in pesewas
        currency: 'GHS',
        interval: 'monthly',
        features: [
            'Unlimited publications',
            'Basic analytics',
            'Community support'
        ]
    },
    premium: {
        name: 'Premium Plan',
        amount: 599, // 5.99 GHS in pesewas
        currency: 'GHS',
        interval: 'monthly',
        features: [
            'Unlimited publications',
            'Advanced analytics',
            'Premium formatting tools',
            'Priority support',
            'Ad-free experience'
        ]
    }
};

// Helper function to convert GHS to pesewas
const convertToPesewas = (amount) => {
    return Math.round(amount * 100);
};

// Helper function to convert pesewas to GHS
const convertToGHS = (pesewas) => {
    return (pesewas / 100).toFixed(2);
};

module.exports = {
    PAYSTACK_CONFIG,
    SUBSCRIPTION_PLANS,
    convertToPesewas,
    convertToGHS
};
```

### 2. Paystack Helper Utilities (`server/utils/paystackHelper.js`)

```javascript
const axios = require('axios');
const { PAYSTACK_CONFIG } = require('../config/paystack');

/**
 * Generate unique transaction reference
 * Format: ANDIKA-{userId}-{timestamp}
 */
const generateReference = (userId) => {
    const timestamp = Date.now();
    return `ANDIKA-${userId}-${timestamp}`;
};

/**
 * Initialize Paystack transaction
 */
const initializeTransaction = async (email, amount, reference, metadata = {}) => {
    try {
        const response = await axios.post(
            `${PAYSTACK_CONFIG.baseUrl}/transaction/initialize`,
            {
                email,
                amount, // Amount in pesewas
                reference,
                currency: 'GHS',
                callback_url: PAYSTACK_CONFIG.callbackUrl,
                metadata: {
                    ...metadata,
                    custom_fields: [
                        {
                            display_name: "Platform",
                            variable_name: "platform",
                            value: "Andika Academy"
                        }
                    ]
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data
        };
    } catch (error) {
        console.error('Paystack initialization error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to initialize transaction'
        };
    }
};

/**
 * Verify Paystack transaction
 */
const verifyTransaction = async (reference) => {
    try {
        const response = await axios.get(
            `${PAYSTACK_CONFIG.baseUrl}/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`
                }
            }
        );

        return {
            success: true,
            data: response.data.data
        };
    } catch (error) {
        console.error('Paystack verification error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to verify transaction'
        };
    }
};

/**
 * Validate webhook signature
 */
const validateWebhookSignature = (requestBody, signature) => {
    const crypto = require('crypto');
    const hash = crypto
        .createHmac('sha512', PAYSTACK_CONFIG.webhookSecret)
        .update(JSON.stringify(requestBody))
        .digest('hex');
    
    return hash === signature;
};

/**
 * Create Paystack customer
 */
const createCustomer = async (email, firstName, lastName) => {
    try {
        const response = await axios.post(
            `${PAYSTACK_CONFIG.baseUrl}/customer`,
            {
                email,
                first_name: firstName,
                last_name: lastName
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_CONFIG.secretKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data
        };
    } catch (error) {
        // Customer might already exist
        if (error.response?.data?.message?.includes('already')) {
            return {
                success: true,
                exists: true
            };
        }
        
        console.error('Paystack customer creation error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to create customer'
        };
    }
};

module.exports = {
    generateReference,
    initializeTransaction,
    verifyTransaction,
    validateWebhookSignature,
    createCustomer
};
```

### 3. Subscription Controller (`server/controllers/subscriptionController.js`)

```javascript
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { 
    generateReference, 
    initializeTransaction, 
    verifyTransaction 
} = require('../utils/paystackHelper');
const { SUBSCRIPTION_PLANS, convertToPesewas, convertToGHS } = require('../config/paystack');

/**
 * Get available subscription plans
 */
const getSubscriptionPlans = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: SUBSCRIPTION_PLANS
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Initialize subscription payment
 */
const initializeSubscription = async (req, res) => {
    try {
        const { planType, paymentMethod } = req.body; // planType: 'basic' or 'premium'
        const userId = req.user.id;

        // Validate plan type
        if (!SUBSCRIPTION_PLANS[planType]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan'
            });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
            user: userId,
            status: 'active'
        });

        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active subscription'
            });
        }

        // Get plan details
        const plan = SUBSCRIPTION_PLANS[planType];
        const amount = plan.amount; // Already in pesewas

        // Generate unique reference
        const reference = generateReference(userId);

        // Initialize Paystack transaction
        const paystackResult = await initializeTransaction(
            user.email,
            amount,
            reference,
            {
                user_id: userId,
                plan_type: planType,
                payment_method: paymentMethod || 'card'
            }
        );

        if (!paystackResult.success) {
            return res.status(400).json({
                success: false,
                message: paystackResult.message
            });
        }

        // Create pending subscription record
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 30 days subscription

        await Subscription.create({
            user: userId,
            amount: convertToGHS(amount),
            currency: plan.currency,
            status: 'pending',
            paymentMethod: paymentMethod || 'card',
            transactionId: reference,
            startDate,
            endDate
        });

        return res.status(200).json({
            success: true,
            message: 'Transaction initialized successfully',
            data: {
                authorization_url: paystackResult.data.authorization_url,
                access_code: paystackResult.data.access_code,
                reference: paystackResult.data.reference
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Handle Paystack callback
 */
const handleCallback = async (req, res) => {
    try {
        const { reference, trxref } = req.query;
        const transactionRef = reference || trxref;

        if (!transactionRef) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Error</title>
                    <style>
                        body { font-family: Arial; text-align: center; padding: 50px; }
                        .error { color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Payment Error</h1>
                    <p>No transaction reference provided</p>
                    <a href="/">Return to Home</a>
                </body>
                </html>
            `);
        }

        // Render processing page with redirect to verification
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Processing Payment</title>
                <style>
                    body { 
                        font-family: Arial; 
                        text-align: center; 
                        padding: 50px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .spinner {
                        border: 4px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        border-top: 4px solid white;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <h1>Processing Your Payment</h1>
                <div class="spinner"></div>
                <p>Please wait while we verify your payment...</p>
                <script>
                    // Redirect to verification endpoint
                    setTimeout(() => {
                        window.location.href = '/api/subscriptions/verify?reference=${transactionRef}';
                    }, 2000);
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Error</title>
            </head>
            <body>
                <h1>Error Processing Payment</h1>
                <p>${error.message}</p>
                <a href="/">Return to Home</a>
            </body>
            </html>
        `);
    }
};

/**
 * Verify subscription payment
 */
const verifySubscription = async (req, res) => {
    try {
        const { reference } = req.query;

        if (!reference) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Verification Error</title></head>
                <body>
                    <h1>Error</h1>
                    <p>No reference provided</p>
                </body>
                </html>
            `);
        }

        // Verify transaction with Paystack
        const verificationResult = await verifyTransaction(reference);

        if (!verificationResult.success) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Failed</title>
                    <style>
                        body { font-family: Arial; text-align: center; padding: 50px; }
                        .error { color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Payment Verification Failed</h1>
                    <p>${verificationResult.message}</p>
                    <a href="/">Return to Home</a>
                </body>
                </html>
            `);
        }

        const transaction = verificationResult.data;

        // Check payment status
        if (transaction.status !== 'success') {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Failed</title>
                    <style>
                        body { font-family: Arial; text-align: center; padding: 50px; }
                        .error { color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Payment Not Successful</h1>
                    <p>Payment status: ${transaction.status}</p>
                    <a href="/">Return to Home</a>
                </body>
                </html>
            `);
        }

        // Find subscription by transaction reference
        const subscription = await Subscription.findOne({ 
            transactionId: reference 
        }).populate('user', 'username email firstName lastName');

        if (!subscription) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Subscription not found</h1>
                    <a href="/">Return to Home</a>
                </body>
                </html>
            `);
        }

        // Validate amount (allow 1 pesewa tolerance for rounding)
        const expectedAmount = convertToPesewas(subscription.amount);
        const paidAmount = transaction.amount;
        
        if (Math.abs(paidAmount - expectedAmount) > 1) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>Amount Mismatch</title></head>
                <body>
                    <h1>Payment Amount Mismatch</h1>
                    <p>Expected: ${convertToGHS(expectedAmount)} GHS</p>
                    <p>Paid: ${convertToGHS(paidAmount)} GHS</p>
                </body>
                </html>
            `);
        }

        // Update subscription status
        subscription.status = 'active';
        await subscription.save();

        // Update user subscription tier
        const user = await User.findById(subscription.user._id);
        const planType = transaction.metadata.plan_type || 'basic';
        
        user.subscriptionTier = planType;
        user.subscriptionStatus = 'active';
        user.subscriptionStartDate = subscription.startDate;
        user.subscriptionEndDate = subscription.endDate;
        await user.save();

        // Render success page
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Successful</title>
                <style>
                    body { 
                        font-family: Arial; 
                        text-align: center; 
                        padding: 50px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .success-card {
                        background: white;
                        color: #333;
                        padding: 40px;
                        border-radius: 10px;
                        max-width: 500px;
                        margin: 0 auto;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    }
                    .checkmark {
                        color: #4caf50;
                        font-size: 60px;
                        margin-bottom: 20px;
                    }
                    .detail { margin: 10px 0; }
                    .btn {
                        display: inline-block;
                        padding: 12px 30px;
                        margin: 10px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                    }
                    .btn:hover { background: #5568d3; }
                </style>
            </head>
            <body>
                <div class="success-card">
                    <div class="checkmark">✓</div>
                    <h1>Payment Successful!</h1>
                    <p>Your subscription has been activated</p>
                    
                    <div style="margin: 30px 0; text-align: left;">
                        <div class="detail"><strong>Plan:</strong> ${planType.charAt(0).toUpperCase() + planType.slice(1)}</div>
                        <div class="detail"><strong>Amount:</strong> ${subscription.amount} ${subscription.currency}</div>
                        <div class="detail"><strong>Reference:</strong> ${reference}</div>
                        <div class="detail"><strong>Valid Until:</strong> ${subscription.endDate.toDateString()}</div>
                    </div>

                    <a href="/" class="btn">Go to Dashboard</a>
                    <a href="/profile" class="btn">View Profile</a>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Error</title></head>
            <body>
                <h1>Verification Error</h1>
                <p>${error.message}</p>
                <a href="/">Return to Home</a>
            </body>
            </html>
        `);
    }
};

/**
 * Get user's subscription history
 */
const getSubscriptionHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const subscriptions = await Subscription.find({ user: userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: subscriptions.length,
            data: subscriptions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        const subscription = await Subscription.findOne({
            user: userId,
            status: 'active'
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No active subscription found'
            });
        }

        subscription.status = 'cancelled';
        await subscription.save();

        // Update user status
        const user = await User.findById(userId);
        user.subscriptionStatus = 'cancelled';
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getSubscriptionPlans,
    initializeSubscription,
    handleCallback,
    verifySubscription,
    getSubscriptionHistory,
    cancelSubscription
};
```

### 4. Subscription Routes (`server/routes/subscriptionRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
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

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);

// Protected routes
router.post('/initialize',
    authMiddleware.verifyToken,
    validateSubscription,
    subscriptionController.initializeSubscription
);

router.get('/callback', subscriptionController.handleCallback);
router.get('/verify', subscriptionController.verifySubscription);

router.get('/history',
    authMiddleware.verifyToken,
    subscriptionController.getSubscriptionHistory
);

router.post('/cancel',
    authMiddleware.verifyToken,
    subscriptionController.cancelSubscription
);

module.exports = router;
```

### 5. Environment Variables (`.env`)

```env
# Existing variables
PORT=5000
DATABASE_URI=mongodb://localhost:27017/andika-academy
JWT_SECRET=your_jwt_secret_here

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_CALLBACK_URL=http://localhost:5000/api/subscriptions/callback
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
```

### 6. Update server.js

```javascript
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const connectDB = require('./server/config/database');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const app = express();

// Import routes
const authRoutes = require('./server/routes/authRoutes');
const writingRoutes = require('./server/routes/writingRoutes');
const commentRoutes = require('./server/routes/commentRoutes');
const bookmarkRoutes = require('./server/routes/bookmarkRoutes');
const subscriptionRoutes = require('./server/routes/subscriptionRoutes'); // NEW

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(helmet());

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/writings', writingRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/subscriptions', subscriptionRoutes); // NEW

app.get('/', (req, res) => {
    res.send('Welcome to Andika Academy API!');
});

const startServer = async () => {
    try{
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}...`);
        });
    }catch(error){
        console.log(`Failed to start server, ${error.message}`);
        process.exit(1);
    }
};

startServer();
```

## Payment Flow Diagram

```
USER JOURNEY
─────────────

1. User Registration/Login
   └→ Default: subscriptionTier = 'basic' (free)

2. User Browses Platform
   └→ Can publish up to 5 writings/month (basic tier)

3. User Clicks "Upgrade to Premium"
   └→ Views subscription plans
   └→ Selects plan (Basic Unlimited or Premium)

4. Initialize Payment
   POST /api/subscriptions/initialize
   {
     "planType": "premium",
     "paymentMethod": "card"
   }
   └→ Backend generates reference
   └→ Calls Paystack API
   └→ Returns authorization_url

5. Redirect to Paystack
   └→ User enters card details
   └→ Completes 3D Secure
   └→ Payment processed

6. Paystack Callback
   GET /api/subscriptions/callback?reference=ANDIKA-123-1699876543
   └→ Shows "Verifying..." page
   └→ Auto-redirects to verify endpoint

7. Verify Payment
   GET /api/subscriptions/verify?reference=ANDIKA-123-1699876543
   └→ Verifies with Paystack API
   └→ Updates Subscription status to 'active'
   └→ Updates User subscriptionTier
   └→ Shows success page

8. Access Premium Features
   └→ User can now publish unlimited content
   └→ Access to premium-only features
```

## Database Flow

```
SUBSCRIPTION COLLECTION
───────────────────────
{
  user: ObjectId("..."),
  amount: 5.99,
  currency: "GHS",
  status: "pending" → "active",
  paymentMethod: "card",
  transactionId: "ANDIKA-123-1699876543",
  startDate: ISODate("2024-01-15"),
  endDate: ISODate("2024-02-15"),
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}

USER COLLECTION (Updated Fields)
─────────────────────────────────
{
  subscriptionTier: "basic" → "premium",
  subscriptionStatus: "active",
  subscriptionStartDate: ISODate("2024-01-15"),
  subscriptionEndDate: ISODate("2024-02-15")
}
```

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/subscriptions/plans` | No | Get available plans |
| POST | `/api/subscriptions/initialize` | Yes | Initialize payment |
| GET | `/api/subscriptions/callback` | No | Paystack callback |
| GET | `/api/subscriptions/verify` | No | Verify payment |
| GET | `/api/subscriptions/history` | Yes | Get user's subscriptions |
| POST | `/api/subscriptions/cancel` | Yes | Cancel subscription |

## Testing with Postman

### 1. Initialize Subscription Payment

```
POST http://localhost:5000/api/subscriptions/initialize
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "planType": "premium",
  "paymentMethod": "card"
}

Expected Response:
{
  "success": true,
  "message": "Transaction initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "...",
    "reference": "ANDIKA-123-1699876543"
  }
}
```

### 2. Get Subscription Plans

```
GET http://localhost:5000/api/subscriptions/plans

Expected Response:
{
  "success": true,
  "data": {
    "basic": {
      "name": "Basic Plan",
      "amount": 299,
      "currency": "GHS",
      "interval": "monthly",
      "features": [...]
    },
    "premium": {
      "name": "Premium Plan",
      "amount": 599,
      "currency": "GHS",
      "interval": "monthly",
      "features": [...]
    }
  }
}
```

## Security Considerations

1. **Amount Validation**: Server-side validation ensures payment amount matches subscription plan
2. **Reference Uniqueness**: Each transaction has a unique reference
3. **Status Verification**: Only 'success' transactions activate subscriptions
4. **Webhook Security**: Validate webhook signatures (for future webhook implementation)
5. **JWT Protection**: All subscription endpoints require authentication

## Next Steps

1. Install required package: `npm install axios`
2. Create all files listed above
3. Add environment variables to `.env`
4. Test with Paystack test keys
5. Implement subscription expiry checker (cron job)
6. Add email notifications for payment confirmations
7. Implement webhook handler for automated renewals

## Notes

- Use Paystack test cards for testing (4123450131001381)
- Test OTP: 123456
- Remember to switch to live keys in production
- Consider implementing subscription renewal reminders
- Add subscription expiry checker for automatic downgrades
