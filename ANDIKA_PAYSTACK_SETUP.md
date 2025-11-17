# Andika Academy Paystack - Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js project already initialized ✓
- [ ] MongoDB connected ✓
- [ ] Express.js server running ✓
- [ ] User authentication working (JWT) ✓
- [ ] User and Subscription models exist ✓

## Step-by-Step Implementation

### Step 1: Install Required Package
```bash
npm install axios
```

### Step 2: Get Paystack API Keys

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Create account or login
3. Navigate to Settings > API Keys & Webhooks
4. Copy:
   - **Test Secret Key** (sk_test_...)
   - **Test Public Key** (pk_test_...)

### Step 3: Update Environment Variables

Add to your `.env` file:
```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_CALLBACK_URL=http://localhost:5000/api/subscriptions/callback
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 4: Create New Files

Create these files in order:

#### 4.1 Create Config File
```bash
touch server/config/paystack.js
```
Copy content from `ANDIKA_PAYSTACK_INTEGRATION.md` Section 1

#### 4.2 Create Helper Utilities
```bash
touch server/utils/paystackHelper.js
```
Copy content from `ANDIKA_PAYSTACK_INTEGRATION.md` Section 2

#### 4.3 Create Subscription Controller
```bash
touch server/controllers/subscriptionController.js
```
Copy content from `ANDIKA_PAYSTACK_INTEGRATION.md` Section 3

#### 4.4 Create Subscription Routes
```bash
touch server/routes/subscriptionRoutes.js
```
Copy content from `ANDIKA_PAYSTACK_INTEGRATION.md` Section 4

### Step 5: Update server.js

Add this line after other route imports:
```javascript
const subscriptionRoutes = require('./server/routes/subscriptionRoutes');
```

Add this line after other route registrations:
```javascript
app.use('/api/subscriptions', subscriptionRoutes);
```

### Step 6: Test the Implementation

#### 6.1 Start Your Server
```bash
npm start
```

#### 6.2 Test with Postman

**A. Get Subscription Plans**
```
GET http://localhost:5000/api/subscriptions/plans
```
Expected: List of available plans

**B. Initialize Payment** (requires login)
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
```
Expected: Authorization URL and reference

**C. Test Payment Flow**
1. Copy the `authorization_url` from response
2. Open it in browser
3. Use Paystack test card:
   - Card: 4123 4501 3100 1381
   - Expiry: Any future date (12/25)
   - CVV: 123
   - OTP: 123456
4. Complete payment
5. You'll be redirected to callback page
6. Then to verification page
7. Should see success page

**D. Check Subscription Created**
```
GET http://localhost:5000/api/subscriptions/history
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
```
Expected: Your subscription with status 'active'

**E. Verify User Upgraded**
```
GET http://localhost:5000/api/auth/me
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
```
Expected: User with subscriptionTier = 'premium'

## Testing Checklist

- [ ] Can get subscription plans without authentication
- [ ] Cannot initialize payment without authentication (401 error)
- [ ] Can initialize payment with valid JWT token
- [ ] Receives valid authorization URL from Paystack
- [ ] Can complete payment on Paystack checkout
- [ ] Redirected to callback page after payment
- [ ] Callback page shows "Verifying..." spinner
- [ ] Automatically redirected to verify endpoint
- [ ] Verification succeeds for successful payment
- [ ] Subscription status changes from 'pending' to 'active'
- [ ] User subscriptionTier upgraded to 'premium'
- [ ] Success page displays correct details
- [ ] Can view subscription history
- [ ] Can cancel subscription

## Common Issues & Solutions

### Issue 1: "Authorization header not found"
**Solution**: Make sure you're including the JWT token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Issue 2: "Invalid plan type"
**Solution**: Use only 'basic' or 'premium' (lowercase)

### Issue 3: "Paystack initialization failed"
**Solution**: 
- Check your secret key is correct in .env
- Make sure you're using sk_test_ (not pk_test_) for backend
- Verify amount is greater than 0

### Issue 4: "Reference not found during verification"
**Solution**:
- The reference must match exactly
- Don't manually create subscriptions - let the initialize endpoint do it
- Check MongoDB for pending subscription with that reference

### Issue 5: "Amount mismatch"
**Solution**:
- This is a security feature
- Make sure you're not manually editing amounts
- The system validates Paystack amount matches subscription amount

### Issue 6: Callback page shows forever
**Solution**:
- Check browser console for JavaScript errors
- Verify the verify endpoint is accessible
- Check server logs for any errors

## Production Checklist

Before going live:

- [ ] Switch to Paystack live keys in .env
- [ ] Update PAYSTACK_CALLBACK_URL to production domain
- [ ] Test with real (small amount) transactions
- [ ] Implement webhook handler for automated events
- [ ] Add email notifications for successful payments
- [ ] Implement subscription expiry checker (cron job)
- [ ] Add logging for all payment events
- [ ] Set up monitoring/alerts for failed payments
- [ ] Create admin dashboard to view subscriptions
- [ ] Implement refund functionality if needed
- [ ] Add subscription cancellation workflow
- [ ] Test subscription renewal flow
- [ ] Implement "upgrade/downgrade" functionality
- [ ] Add invoice generation
- [ ] Set up automatic email reminders for expiring subscriptions

## Next Features to Implement

### 1. Subscription Expiry Checker
Create a cron job that runs daily:
```javascript
// Check for expired subscriptions
const checkExpiredSubscriptions = async () => {
  const now = new Date();
  const expiredSubscriptions = await Subscription.find({
    status: 'active',
    endDate: { $lt: now }
  });
  
  for (let sub of expiredSubscriptions) {
    sub.status = 'expired';
    await sub.save();
    
    // Downgrade user
    const user = await User.findById(sub.user);
    user.subscriptionTier = 'basic';
    user.subscriptionStatus = 'expired';
    await user.save();
  }
};
```

### 2. Email Notifications
Install nodemailer and send emails for:
- Payment confirmation
- Subscription expiring (7 days before)
- Subscription expired
- Payment failed

### 3. Webhook Handler
Handle Paystack webhook events:
- charge.success
- subscription.create
- subscription.disable
```javascript
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  
  if (!validateWebhookSignature(req.body, signature)) {
    return res.sendStatus(400);
  }
  
  const event = req.body;
  
  switch(event.event) {
    case 'charge.success':
      // Handle successful charge
      break;
    // ... other events
  }
  
  res.sendStatus(200);
});
```

### 4. Admin Dashboard
Create routes for admins to:
- View all subscriptions
- See revenue statistics
- Handle refunds
- Monitor payment failures

## Support Resources

- **Paystack Documentation**: https://paystack.com/docs/
- **Paystack API Reference**: https://paystack.com/docs/api/
- **Test Cards**: https://paystack.com/docs/payments/test-payments/
- **Paystack Support**: support@paystack.com

## Summary

You've now integrated Paystack payment processing into Andika Academy! Users can:
1. View subscription plans
2. Choose and pay for a plan
3. Get automatically upgraded to premium tier
4. Enjoy unlimited publications and premium features
5. View their subscription history

The system is secure, validates all payments, and maintains data integrity throughout the payment flow.

## Need Help?

If you encounter issues:
1. Check the server console for error messages
2. Review Paystack dashboard for transaction details
3. Verify all environment variables are set correctly
4. Test with Paystack test cards first
5. Check MongoDB for created records

Good luck with your implementation! 🚀
