import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

// Export a robust instance or separate config
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

console.log(
  `Razorpay Config: ID present=${!!key_id}, Secret present=${!!key_secret}`,
);

if (!key_id || !key_secret) {
  console.error("Razorpay keys are missing. Payment features will fail.");
}

export const razorpay =
  key_id && key_secret
    ? new Razorpay({ key_id, key_secret })
    : ({
        orders: {
          create: async () => {
            console.error(
              "Attempted to create order but Razorpay keys are missing.",
            );
            throw new Error(
              "Razorpay not configured: Keys are missing from environment",
            );
          },
        },
      } as any);
