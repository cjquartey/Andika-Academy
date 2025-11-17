# Andika Academy - Paystack Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    ANDIKA ACADEMY SUBSCRIPTION SYSTEM             │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/Mobile)                      │
├─────────────────────────────────────────────────────────────────────┤
│  - Browse writings                                                   │
│  - View subscription plans                                           │
│  - Click "Subscribe" button                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ POST /api/subscriptions/initialize
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS BACKEND SERVER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  subscriptionController.initializeSubscription()           │    │
│  │  ─────────────────────────────────────────────             │    │
│  │  1. Validate user authentication (JWT)                     │    │
│  │  2. Check for existing active subscription                 │    │
│  │  3. Get subscription plan details                          │    │
│  │  4. Generate unique reference                              │    │
│  │  5. Call paystackHelper.initializeTransaction()            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│                               │ POST https://api.paystack.co/        │
│                               │      transaction/initialize          │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         PAYSTACK HELPER (paystackHelper.js)                │    │
│  │  ──────────────────────────────────────────────            │    │
│  │  - Makes API call to Paystack                              │    │
│  │  - Includes: email, amount, reference, callback_url        │    │
│  │  - Returns: authorization_url, access_code                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         CREATE PENDING SUBSCRIPTION                        │    │
│  │  ──────────────────────────────────────────────            │    │
│  │  Subscription.create({                                     │    │
│  │    user: userId,                                           │    │
│  │    amount: 5.99,                                           │    │
│  │    status: 'pending',                                      │    │
│  │    transactionId: 'ANDIKA-123-1699876543',                │    │
│  │    startDate: now,                                         │    │
│  │    endDate: now + 30 days                                  │    │
│  │  })                                                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                │ Return authorization_url
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REDIRECT TO PAYSTACK CHECKOUT                     │
│          https://checkout.paystack.com/access_code               │
├─────────────────────────────────────────────────────────────────────┤
│  - Customer enters card details                                     │
│  - Customer completes 3D Secure verification                        │
│  - Paystack processes payment                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Redirect with reference
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│     CALLBACK PAGE (/api/subscriptions/callback?reference=XXX)       │
├─────────────────────────────────────────────────────────────────────┤
│  - Shows "Verifying Payment..." spinner                             │
│  - Auto-redirects to /api/subscriptions/verify?reference=XXX        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ GET /api/subscriptions/verify
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS BACKEND SERVER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  subscriptionController.verifySubscription()               │    │
│  │  ───────────────────────────────────────────               │    │
│  │  1. Extract reference from query params                    │    │
│  │  2. Call paystackHelper.verifyTransaction()                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│                               │ GET https://api.paystack.co/         │
│                               │     transaction/verify/:reference    │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         PAYSTACK API VERIFICATION                          │    │
│  │  ──────────────────────────────────────────────            │    │
│  │  Returns transaction details:                              │    │
│  │  - status: 'success' | 'failed' | 'pending'               │    │
│  │  - amount: 59900 (in pesewas)                             │    │
│  │  - customer: { email: '...', ... }                        │    │
│  │  - metadata: { plan_type: 'premium', ... }               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         VALIDATE TRANSACTION                               │    │
│  │  ──────────────────────────────────────────────            │    │
│  │  ✓ Check status === 'success'                             │    │
│  │  ✓ Validate amount matches subscription                   │    │
│  │  ✓ Find subscription by transactionId                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         UPDATE DATABASE                                    │    │
│  │  ──────────────────────────────────────────────            │    │
│  │  1. Update Subscription                                    │    │
│  │     - status: 'pending' → 'active'                        │    │
│  │                                                            │    │
│  │  2. Update User                                            │    │
│  │     - subscriptionTier: 'basic' → 'premium'              │    │
│  │     - subscriptionStatus: 'active'                        │    │
│  │     - subscriptionStartDate: now                          │    │
│  │     - subscriptionEndDate: now + 30 days                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                │ Return success HTML page
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUCCESS PAGE                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ✓ Payment Successful!                                              │
│  Plan: Premium                                                       │
│  Amount: 5.99 GHS                                                    │
│  Reference: ANDIKA-123-1699876543                                   │
│  Valid Until: Feb 15, 2024                                          │
│                                                                      │
│  [Go to Dashboard] [View Profile]                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
┌────────┐      ┌────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│ Client │      │ Server │      │ Paystack │      │ MongoDB │      │   User   │
└───┬────┘      └───┬────┘      └────┬─────┘      └────┬────┘      └────┬─────┘
    │               │                 │                 │                │
    │ Subscribe     │                 │                 │                │
    ├──────────────>│                 │                 │                │
    │               │                 │                 │                │
    │               │ Verify JWT      │                 │                │
    │               │ Check User      │                 │                │
    │               ├────────────────────────────────────>                │
    │               │                 │                 │                │
    │               │ Generate Ref    │                 │                │
    │               │ ANDIKA-X-TIME   │                 │                │
    │               │                 │                 │                │
    │               │ Initialize      │                 │                │
    │               ├────────────────>│                 │                │
    │               │                 │                 │                │
    │               │ Auth URL        │                 │                │
    │               │<────────────────┤                 │                │
    │               │                 │                 │                │
    │               │ Create Pending  │                 │                │
    │               │ Subscription    │                 │                │
    │               ├────────────────────────────────────>                │
    │               │                 │                 │                │
    │ Redirect URL  │                 │                 │                │
    │<──────────────┤                 │                 │                │
    │               │                 │                 │                │
    │──────────────────────────────────>                │                │
    │               │       Enter Card Details          │                │
    │               │       Complete 3DS                │                │
    │<──────────────────────────────────┤                │                │
    │  Callback URL │                 │                 │                │
    │               │                 │                 │                │
    │ Verify Pay    │                 │                 │                │
    ├──────────────>│                 │                 │                │
    │               │                 │                 │                │
    │               │ Verify API      │                 │                │
    │               ├────────────────>│                 │                │
    │               │                 │                 │                │
    │               │ Transaction     │                 │                │
    │               │ Details         │                 │                │
    │               │<────────────────┤                 │                │
    │               │                 │                 │                │
    │               │ Update Sub      │                 │                │
    │               │ to 'active'     │                 │                │
    │               ├────────────────────────────────────>                │
    │               │                 │                 │                │
    │               │ Update User     │                 │                │
    │               │ Tier & Status   │                 │                │
    │               ├────────────────────────────────────>                │
    │               │                 │                 │                │
    │ Success Page  │                 │                 │                │
    │<──────────────┤                 │                 │                │
    │               │                 │                 │                │
```

## File Structure Map

```
andika-academy/
│
├── server/
│   ├── config/
│   │   ├── database.js         [Existing - MongoDB connection]
│   │   └── paystack.js          [NEW - Paystack config & plans]
│   │
│   ├── models/
│   │   ├── User.js              [Existing - Has subscription fields]
│   │   ├── Subscription.js      [Existing - Subscription schema]
│   │   └── Writing.js           [Existing]
│   │
│   ├── controllers/
│   │   ├── authController.js    [Existing]
│   │   └── subscriptionController.js [NEW - All subscription logic]
│   │
│   ├── routes/
│   │   ├── authRoutes.js        [Existing]
│   │   └── subscriptionRoutes.js [NEW - Subscription endpoints]
│   │
│   ├── middleware/
│   │   └── authMiddleware.js    [Existing - JWT verification]
│   │
│   └── utils/
│       └── paystackHelper.js    [NEW - Paystack API functions]
│
├── .env                          [UPDATE - Add Paystack keys]
└── server.js                     [UPDATE - Register subscription routes]
```

## Reference Generation Flow

```
User Login
    │
    └─> User ID: 507f1f77bcf86cd799439011
        Current Time: 1699876543
        │
        └─> generateReference(userId)
            │
            └─> Combines:
                - Prefix: "ANDIKA"
                - User ID: "507f1f77bcf86cd799439011"
                - Timestamp: "1699876543"
                │
                └─> Result: "ANDIKA-507f1f77bcf86cd799439011-1699876543"
                    │
                    └─> Stored in:
                        1. Subscription.transactionId
                        2. Sent to Paystack
                        3. Used for verification
```

## Amount Conversion Flow

```
Subscription Plan: Premium
─────────────────────────

Plan Configuration (paystack.js):
├─> Name: "Premium Plan"
├─> Price: 5.99 GHS
└─> Amount: 599 pesewas (stored)

Initialize Payment:
├─> Send to Paystack: 599 pesewas
└─> Store in DB: 5.99 GHS

Paystack Processes:
└─> Charges: 599 pesewas (5.99 GHS)

Verification:
├─> Paystack returns: 599 pesewas
├─> Convert to GHS: 5.99
├─> Compare with stored: 5.99 GHS
└─> ✓ Match confirmed
```

## Error Handling Flow

```
                    Initialize Payment
                            │
                ┌───────────┴───────────┐
                │                       │
         Success Path             Error Path
                │                       │
                │               ┌───────┴────────┐
                │               │                │
                │         Network Error   Validation Error
                │               │                │
                │               ▼                ▼
                │        Return JSON       Return JSON
                │        {success:false}   {success:false}
                │        {message:...}     {message:...}
                │
                ▼
        Redirect to Paystack
                │
        ┌───────┴───────┐
        │               │
  User Completes   User Cancels
        │               │
        ▼               ▼
   Callback Page   Redirect Back
        │          (No reference)
        │
  Verify Payment
        │
    ┌───┴────┐
    │        │
 Success  Failed
    │        │
    ▼        ▼
 Update   Show Error
   DB      Message
    │
    └─> Success Page
```

## Database Schema After Payment

```
BEFORE PAYMENT
──────────────

User Document:
{
  _id: ObjectId("..."),
  username: "john_doe",
  email: "john@example.com",
  subscriptionTier: "basic",         ← Free tier
  subscriptionStatus: "active",
  monthlyPublications: 3,            ← Limited
  ...
}

Subscription: (none)


AFTER PAYMENT
─────────────

User Document:
{
  _id: ObjectId("..."),
  username: "john_doe",
  email: "john@example.com",
  subscriptionTier: "premium",       ← UPGRADED
  subscriptionStatus: "active",
  subscriptionStartDate: ISODate("2024-01-15"),
  subscriptionEndDate: ISODate("2024-02-15"),
  monthlyPublications: 50,           ← Unlimited (tracked)
  ...
}

Subscription Document:
{
  _id: ObjectId("..."),
  user: ObjectId("..."),
  amount: 5.99,
  currency: "GHS",
  status: "active",                  ← Changed from 'pending'
  paymentMethod: "card",
  transactionId: "ANDIKA-...",
  startDate: ISODate("2024-01-15"),
  endDate: ISODate("2024-02-15"),
  createdAt: ISODate("2024-01-15"),
  updatedAt: ISODate("2024-01-15")
}
```

## API Call Details

```
1. INITIALIZE TRANSACTION
──────────────────────────

Request to Paystack:
POST https://api.paystack.co/transaction/initialize
Headers:
  Authorization: Bearer sk_test_xxxxx
  Content-Type: application/json
Body:
{
  "email": "john@example.com",
  "amount": 599,                    // in pesewas
  "reference": "ANDIKA-123-1699876543",
  "currency": "GHS",
  "callback_url": "http://localhost:5000/api/subscriptions/callback",
  "metadata": {
    "user_id": "507f1f77bcf86cd799439011",
    "plan_type": "premium",
    "payment_method": "card"
  }
}

Response from Paystack:
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123",
    "access_code": "abc123xyz",
    "reference": "ANDIKA-123-1699876543"
  }
}


2. VERIFY TRANSACTION
──────────────────────

Request to Paystack:
GET https://api.paystack.co/transaction/verify/ANDIKA-123-1699876543
Headers:
  Authorization: Bearer sk_test_xxxxx

Response from Paystack:
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "status": "success",
    "reference": "ANDIKA-123-1699876543",
    "amount": 599,
    "currency": "GHS",
    "customer": {
      "email": "john@example.com"
    },
    "metadata": {
      "user_id": "507f1f77bcf86cd799439011",
      "plan_type": "premium"
    },
    "paid_at": "2024-01-15T10:30:00.000Z"
  }
}
```

## Security Layers

```
┌──────────────────────────────────────────┐
│         SECURITY MEASURES                │
├──────────────────────────────────────────┤
│                                          │
│ 1. JWT Authentication                    │
│    └─> All endpoints protected          │
│                                          │
│ 2. Unique References                     │
│    └─> Prevents replay attacks          │
│                                          │
│ 3. Amount Validation                     │
│    └─> Server-side verification         │
│    └─> Tolerance: ±1 pesewa             │
│                                          │
│ 4. Status Checking                       │
│    └─> Only 'success' accepted          │
│                                          │
│ 5. HTTPS Communication                   │
│    └─> All Paystack API calls           │
│                                          │
│ 6. Environment Variables                 │
│    └─> Secret keys never exposed        │
│                                          │
│ 7. Database Transactions                 │
│    └─> Atomic operations                │
│    └─> Rollback on failure              │
│                                          │
└──────────────────────────────────────────┘
```
