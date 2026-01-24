import { Request, Response, NextFunction } from "express";
import { razorpay } from "../config/razorpay";
import prisma from "../config/prisma";
import crypto from "crypto";
import { z } from "zod";

const createOrderSchema = z.object({
  plan: z.enum(["premium", "pro"]),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  plan: z.enum(["premium", "pro"]),
});

const PLAN_PRICES = {
  premium: 2000, // 20 INR in paise
  pro: 5000, // 50 INR in paise
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { plan } = createOrderSchema.parse(req.body);
    const userId = (req.user as any)?.id;

    const amount = PLAN_PRICES[plan];
    const currency = "INR";

    const options = {
      amount,
      currency,
      receipt: `receipt_order_${userId}_${Date.now()}`,
      notes: {
        userId,
        plan,
      },
    };

    const order = await razorpay.orders.create(options);

    // Initial Payment Record (Pending)
    await prisma.payment.create({
      data: {
        user_id: userId,
        amount: amount / 100, // Store in INR
        currency,
        status: "created",
        razorpay_order_id: order.id,
      },
    });

    res.json({
      order_id: order.id,
      amount,
      currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      plan,
      user_email: (req.user as any)?.email,
      user_name: (req.user as any)?.name,
      user_contact: "9999999999", // Should be from profile if available
    });
  } catch (err) {
    console.error("DEBUG: createOrder failed", {
      err,
      env_key_id_present: !!process.env.RAZORPAY_KEY_ID,
    });
    next(err);
  }
};

export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      verifyPaymentSchema.parse(req.body);
    const userId = (req.user as any)?.id;

    // Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Update Payment Status
    await prisma.payment.updateMany({
      where: { razorpay_order_id },
      data: {
        status: "captured",
        razorpay_payment_id,
      },
    });

    // Upgrade User Tier
    // The requirement implies these plans increase limits.
    // If they buy 'premium', they get 50 swipes/day.
    // If they buy 'pro', they get 100 swipes/day.
    // We update the user's subscription_tier.

    // Note: If a user is already pro and buys premium, they downgrade?
    // Assuming upgrade logic only, or simple replacement as per "pack purchase".
    // Since it's a tier system, we overwrite.

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscription_tier: plan,
      },
    });

    res.json({ success: true, message: `Upgraded to ${plan} successfully` });
  } catch (err) {
    next(err);
  }
};
