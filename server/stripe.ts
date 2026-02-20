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
 * Create a SetupIntent to tokenise a card without charging
 * Used at booking submission — no charge, no hold
 */
export async function createSetupIntent(
  customerId: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.SetupIntent | null> {
  if (!stripe) {
    console.error("Stripe not configured");
    return null;
  }
  try {
    return await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata,
    });
  } catch (error) {
    console.error("Failed to create setup intent:", error);
    throw error;
  }
}

/**
 * Find or create a Stripe Customer for a user
 */
export async function findOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string | null> {
  if (!stripe) return null;
  try {
    const existing = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });
    if (existing.data.length > 0) return existing.data[0].id;
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { userId },
    });
    return customer.id;
  } catch (error) {
    console.error("Failed to find/create Stripe customer:", error);
    return null;
  }
}

/**
 * Charge a stored payment method off-session (used when host approves booking)
 */
export async function chargeStoredPaymentMethod(
  customerId: string,
  paymentMethodId: string,
  amount: number,
  currency: string = "aud",
  metadata: Record<string, string> = {},
  idempotencyKey?: string
): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    console.error("Stripe not configured");
    return null;
  }
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency: currency.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata,
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );
    return intent;
  } catch (error) {
    console.error("Failed to charge stored payment method:", error);
    throw error;
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
