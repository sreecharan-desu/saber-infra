import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

// Export a robust instance or separate config
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.error("Razorpay keys are missing. Payment features will fail.");
}

export const razorpay =
  key_id && key_secret
    ? new Razorpay({ key_id, key_secret })
    : ({
        orders: {
          create: async () => {
            throw new Error("Razorpay not configured");
          },
        },
      } as any);
