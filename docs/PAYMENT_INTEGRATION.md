# Payment Integration & Swipe Limits

## Overview

We have introduced a tiered subscription system to limit daily job applications (right swipes) for candidates.

- **Free Tier**: 10 swipes/day (Default)
- **Premium**: 50 swipes/day (20 INR)
- **Pro**: 100 swipes/day (50 INR)

## Backend Implementation

The backend has been updated to support this:

1.  **Database**: Added `SubscriptionTier` enum and `subscription_tier` field to `User`. Added `Payment` model.
2.  **API**:
    - `POST /payments/create-order`: Creates a Razorpay order.
    - `POST /payments/verify`: Verifies payment and upgrades user tier.
3.  **Logic**: `job.controller.ts` now checks the user's tier and enforces limits (10/50/100) before allowing a right swipe.
    - Returns `429 Too Many Requests` with code `SWIPE_LIMIT_REACHED` if limit is exceeded.

## Frontend Implementation Prompt

To implement the frontend part of this feature, use the following instructions:

### 1. Install Razorpay SDK

You need to load the Razorpay checkout script. Add it to `index.html` or load it dynamically.

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Handle Swipe Limit Reached

In your Swipe Card component (where you call `POST /jobs/swipe`):

- Catch `429` errors.
- Check if `error.code === 'SWIPE_LIMIT_REACHED'`.
- If true, trigger the **Pricing/Upgrade Modal**.

### 3. Create Pricing Modal Component

Create a modal that displays the plans:

- **Premium** (20 INR) - 50 Applications/Day
- **Pro** (50 INR) - 100 Applications/Day

**Button Action**:
When a user selects a plan:

1. Call `POST /payments/create-order` with body `{ plan: 'premium' }` (or 'pro').
2. Receive `{ order_id, key_id, amount, ... }`.
3. Open Razorpay Checkout:
   ```javascript
   const options = {
     key: data.key_id,
     amount: data.amount,
     currency: "INR",
     name: "SABER",
     description: `Upgrade to ${plan}`,
     order_id: data.order_id,
     handler: async function (response) {
       // Verify Payment
       const verifyRes = await axios.post("/payments/verify", {
         razorpay_order_id: response.razorpay_order_id,
         razorpay_payment_id: response.razorpay_payment_id,
         razorpay_signature: response.razorpay_signature,
         plan: plan,
       });

       if (verifyRes.data.success) {
         alert("Upgrade Successful! You can now continue swiping.");
         closeModal();
         // Optionally refresh user profile/limits
       }
     },
     prefill: {
       name: data.user_name,
       email: data.user_email,
       contact: data.user_contact,
     },
     theme: {
       color: "#3399cc",
     },
   };
   const rzp1 = new Razorpay(options);
   rzp1.open();
   ```

### 4. API Endpoints Reference

#### Create Order

- **URL**: `/api/payments/create-order`
- **Method**: `POST`
- **Body**: `{ "plan": "premium" | "pro" }`
- **Response**:
  ```json
  {
    "order_id": "order_Ez...",
    "amount": 2000,
    "key_id": "rzp_test...",
    ...
  }
  ```

#### Verify Payment

- **URL**: `/api/payments/verify`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "razorpay_order_id": "...",
    "razorpay_payment_id": "...",
    "razorpay_signature": "...",
    "plan": "premium"
  }
  ```
- **Response**: `{ "success": true, "message": "..." }`
