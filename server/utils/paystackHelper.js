const axios = require('axios');
const { PAYSTACK_CONFIG } = require('../config/paystack');

// Generate unique transaction reference
const generateReference = (userId) => {
    const timestamp = Date.now();
    return `ANDIKA-${userId}-${timestamp}`;
};

// Initialize Paystack transaction
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

// Verify Paystack transaction
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

// Validate webhook signature
const validateWebhookSignature = (requestBody, signature) => {
    const crypto = require('crypto');
    const hash = crypto
        .createHmac('sha512', PAYSTACK_CONFIG.webhookSecret)
        .update(JSON.stringify(requestBody))
        .digest('hex');
    
    return hash === signature;
};

// Create Paystack customer
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