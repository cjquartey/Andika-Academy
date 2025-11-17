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
        amount: 0, // Free
        currency: 'GHS',
        interval: 'monthly',
        features: [
            'Up to 5 publications per month',
            'Basic analytics',
            'Community support'
        ]
    },
    premium: {
        name: 'Premium Plan',
        amount: 3000, // 30 GHS in pesewas
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