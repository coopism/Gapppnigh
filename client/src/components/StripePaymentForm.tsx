import { useState, useEffect, useRef } from "react";
import {
  CardElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader, CreditCard, Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  dealId: string;
  hotelName: string;
  guestEmail: string;
  onBeforePayment?: () => void;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  disabled?: boolean;
}

interface PaymentFormInnerProps {
  clientSecret: string;
  onBeforePayment?: () => void;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  disabled?: boolean;
}

function PaymentFormInner({ clientSecret, onBeforePayment, onPaymentSuccess, onPaymentError, disabled }: PaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    onBeforePayment?.();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Use confirmCardPayment which doesn't redirect
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
        onPaymentError(error.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onPaymentSuccess(paymentIntent.id);
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed.",
        });
      } else if (paymentIntent && paymentIntent.status === "requires_action") {
        // Handle 3D Secure - Stripe will show modal automatically
        toast({
          title: "Additional Verification Required",
          description: "Please complete the verification...",
        });
      }
    } catch (err: any) {
      const message = err.message || "An unexpected error occurred";
      setErrorMessage(message);
      onPaymentError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        fontSize: "16px",
        color: "#1e293b",
        fontFamily: "system-ui, sans-serif",
        "::placeholder": {
          color: "#94a3b8",
        },
      },
      invalid: {
        color: "#ef4444",
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border border-border">
        <label className="block text-sm font-medium text-foreground mb-2">
          Card Details
        </label>
        <div className="p-3 border border-input rounded-md bg-background">
          <CardElement options={cardStyle} />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Your payment is secured with 256-bit SSL encryption</span>
      </div>

      <Button
        type="button"
        onClick={handlePayment}
        disabled={!stripe || isProcessing || disabled}
        className="w-full h-12 text-base font-semibold"
        data-testid="button-pay"
      >
        {isProcessing ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay Now
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>Secure Payment</span>
        </div>
        <div className="flex items-center gap-1">
          <img src="https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg" alt="Visa" className="h-4" />
          <img src="https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg" alt="Mastercard" className="h-4" />
          <img src="https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46c5cd6a96a6e418a6ca1717c.svg" alt="Amex" className="h-4" />
        </div>
      </div>
    </div>
  );
}

export function StripePaymentForm({
  amount,
  currency,
  dealId,
  hotelName,
  guestEmail,
  onBeforePayment,
  onPaymentSuccess,
  onPaymentError,
  disabled,
}: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initRef = useRef(false);

  // Validate email format
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Only initialize once when not disabled and has valid email
  useEffect(() => {
    // Don't initialize if disabled, no email, invalid email, or already initialized
    if (disabled || !guestEmail || !isValidEmail(guestEmail) || initRef.current) {
      return;
    }

    const initStripe = async () => {
      // Prevent duplicate calls
      if (initRef.current) return;
      initRef.current = true;
      
      setIsLoading(true);
      
      try {
        // Get Stripe config
        const configResponse = await fetch("/api/stripe/config");
        const config = await configResponse.json();

        if (!config.configured || !config.publishableKey) {
          setError("Payment processing is not configured");
          setIsLoading(false);
          return;
        }

        setStripePromise(loadStripe(config.publishableKey));

        // Create payment intent
        const intentResponse = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase() === "aud" || currency === "$" ? "aud" : currency.toLowerCase(),
            dealId,
            hotelName,
            guestEmail,
          }),
        });

        if (!intentResponse.ok) {
          const errorData = await intentResponse.json();
          throw new Error(errorData.message || "Failed to initialize payment");
        }

        const { clientSecret: secret } = await intentResponse.json();
        setClientSecret(secret);
        setIsInitialized(true);
      } catch (err: any) {
        setError(err.message || "Failed to initialize payment");
        onPaymentError(err.message || "Failed to initialize payment");
        // Allow retry on error
        initRef.current = false;
      } finally {
        setIsLoading(false);
      }
    };

    if (amount > 0 && guestEmail && !disabled) {
      initStripe();
    }
  }, [disabled, guestEmail]); // Only depend on disabled and guestEmail presence

  // Show waiting state if disabled (guest details not complete)
  if (disabled && !isInitialized) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
        <CreditCard className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Complete guest details above to enable payment
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Initializing secure payment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
        <p className="font-medium">Payment Unavailable</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!stripePromise || !clientSecret) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center text-muted-foreground">
        <p>Unable to load payment form. Please try again.</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0f172a",
            colorBackground: "#ffffff",
            colorText: "#1e293b",
            colorDanger: "#ef4444",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "8px",
          },
        },
      }}
    >
      <PaymentFormInner
        clientSecret={clientSecret}
        onBeforePayment={onBeforePayment}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={disabled}
      />
    </Elements>
  );
}

export default StripePaymentForm;
