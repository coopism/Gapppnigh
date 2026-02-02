import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Warning: STRIPE_SECRET_KEY not set. Payment processing will not work.");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

/**
 * Create a payment intent for a booking
 * @param amount Amount in cents (e.g., $299 = 29900)
 * @param currency Currency code (e.g., "aud")
 * @param metadata Additional metadata for the payment
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = "aud",
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    console.error("Stripe not configured");
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return paymentIntent;
  } catch (error) {
    console.error("Failed to create payment intent:", error);
    throw error;
  }
}

/**
 * Retrieve a payment intent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    console.error("Stripe not configured");
    return null;
  }

  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error("Failed to retrieve payment intent:", error);
    throw error;
  }
}

/**
 * Confirm payment was successful
 */
export async function confirmPaymentSuccess(
  paymentIntentId: string
): Promise<boolean> {
  if (!stripe) {
    return false;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status === "succeeded";
  } catch (error) {
    console.error("Failed to confirm payment:", error);
    return false;
  }
}

/**
 * Create a refund for a payment intent
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.Refund | null> {
  if (!stripe) {
    console.error("Stripe not configured");
    return null;
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount && { amount }),
    });

    return refund;
  } catch (error) {
    console.error("Failed to create refund:", error);
    throw error;
  }
}
