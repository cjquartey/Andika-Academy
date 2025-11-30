const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { 
    generateReference, 
    initializeTransaction, 
    verifyTransaction 
} = require('../utils/paystackHelper');
const { SUBSCRIPTION_PLANS, convertToPesewas, convertToGHS } = require('../config/paystack');

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

const initializeSubscription = async (req, res) => {
    try {
        const { planType, paymentMethod } = req.body;
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

        // Skip payment initializtion for free plan
        if (planType === 'basic' || amount === 0){
            return res.status(400).json({
                success: false,
                message: 'Basic plan is free. No payment required'
            });
        }

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
            paymentMethod: paymentMethod || 'mobile_money',
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

const activateFreePlan = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status.json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.subscriptionTier === 'basic'){
            return res.status(400).json({
                success: false,
                message: 'You already have the basic plan'
            });
        }

        user.subscriptionStatus = 'basic';
        user.subscriptionTier = 'active';
        user.monthlyPublications = 0;

        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Successfully switched to the basic plan'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
};

const handleCallback = async (req, res) => {
    try {
        const { reference } = req.query;

        if (!reference) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Invalid Request</h1>
                    <p>No payment reference provided</p>
                    <a href="/">Return to Home</a>
                </body>
                </html>
            `);
        }

        // Verify transaction with Paystack
        const transaction = await verifyPaystackTransaction(reference);

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

        // Validate amount
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
        await user.save();

        // Success page with auto-refresh trigger
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Subscription Activated</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        color: #333;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 3rem;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        max-width: 500px;
                    }
                    .success-icon {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 1.5rem;
                        background: #4CAF50;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 3rem;
                    }
                    h1 {
                        color: #4CAF50;
                        margin-bottom: 1rem;
                    }
                    .detail {
                        margin: 0.75rem 0;
                        color: #666;
                    }
                    .detail strong {
                        color: #333;
                    }
                    .btn {
                        display: inline-block;
                        margin: 1rem 0.5rem 0;
                        padding: 0.75rem 1.5rem;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        transition: background 0.3s;
                    }
                    .btn:hover {
                        background: #5568d3;
                    }
                    .redirect-message {
                        margin-top: 1.5rem;
                        color: #666;
                        font-size: 0.9rem;
                    }
                    .loader {
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #667eea;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        animation: spin 1s linear infinite;
                        display: inline-block;
                        margin-left: 10px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                <script>
                    // Redirect to subscription page with refresh flag
                    window.addEventListener('load', function() {
                        setTimeout(function() {
                            // This will trigger Auth.refreshUser() in subscription.js
                            window.location.href = '/views/subscription.html?refresh=true';
                        }, 3000);
                    });
                </script>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✓</div>
                    <h1>Subscription Activated!</h1>
                    <p>Your ${planType} subscription has been successfully activated.</p>
                    
                    <div style="margin: 2rem 0; padding: 1.5rem; background: #f5f5f5; border-radius: 10px;">
                        <div class="detail"><strong>Plan:</strong> ${planType.charAt(0).toUpperCase() + planType.slice(1)}</div>
                        <div class="detail"><strong>Amount:</strong> GHS ${subscription.amount.toFixed(2)}</div>
                        <div class="detail"><strong>Reference:</strong> ${reference}</div>
                        <div class="detail"><strong>Valid Until:</strong> ${subscription.endDate.toDateString()}</div>
                    </div>

                    <div class="redirect-message">
                        Redirecting to your subscription page<span class="loader"></span>
                    </div>
                    
                    <a href="/views/subscription.html?refresh=true" class="btn">Go to Subscription Page</a>
                    <a href="/views/dashboard.html" class="btn">Go to Dashboard</a>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <style>
                    body {
                        font-family: Arial;
                        text-align: center;
                        padding: 50px;
                    }
                    .error {
                        color: #d32f2f;
                    }
                </style>
            </head>
            <body>
                <h1 class="error">Verification Error</h1>
                <p>${error.message}</p>
                <a href="/">Return to Home</a>
            </body>
            </html>
        `);
    }
};


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
    activateFreePlan,
    handleCallback,
    verifySubscription,
    getSubscriptionHistory,
    cancelSubscription
};