import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useDeal } from "@/hooks/use-deals";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, Star, MapPin, Calendar, CreditCard, User, Mail, Phone, 
  MessageSquare, ChevronDown, ChevronUp, Check, Shield, Clock, AlertCircle, Loader
} from "lucide-react";
import { StripePaymentForm } from "@/components/StripePaymentForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";

const bookingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Valid phone number is required").regex(/^[0-9]+$/, "Phone must contain only numbers"),
  countryCode: z.string().default("+61"),
  specialRequests: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export default function Booking() {
  const [, params] = useRoute("/booking/:dealId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const dealId = params?.dealId || "";
  const { data: deal, isLoading } = useDeal(dealId);
  const { user } = useAuthStore();
  
  const [showSpecialRequests, setShowSpecialRequests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [guestDetailsValid, setGuestDetailsValid] = useState(false);
  const [redirectHandled, setRedirectHandled] = useState(false);
  const [dealUnavailable, setDealUnavailable] = useState(false);

  // Create hold when entering booking page (5 minute reservation)
  useEffect(() => {
    if (!dealId || bookingComplete) return;
    
    const createHold = async () => {
      try {
        const response = await fetch(`/api/deals/${dealId}/hold`, { method: "POST" });
        if (!response.ok) {
          const data = await response.json();
          if (response.status === 409) {
            setDealUnavailable(true);
            toast({
              title: "Deal Unavailable",
              description: data.message || "This deal is no longer available",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Failed to create hold:", error);
      }
    };
    
    createHold();
    
    // Release hold when leaving page
    return () => {
      if (!bookingComplete) {
        fetch(`/api/deals/${dealId}/hold`, { method: "DELETE" }).catch(() => {});
      }
    };
  }, [dealId, bookingComplete, toast]);

  // Handle Stripe redirect - check URL for payment_intent on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get("payment_intent");
    const redirectStatus = urlParams.get("redirect_status");
    
    if (paymentIntent && redirectStatus === "succeeded" && !redirectHandled && deal) {
      setRedirectHandled(true);
      setPaymentIntentId(paymentIntent);
      setPaymentComplete(true);
      
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      
      // Get saved form data and auto-submit booking
      const savedData = localStorage.getItem(`booking_form_${dealId}`);
      if (savedData) {
        const formData = JSON.parse(savedData);
        const gstAmount = deal.dealPrice * 0.1;
        const total = deal.dealPrice + gstAmount;
        
        // Auto-submit booking
        setIsSubmitting(true);
        fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dealId: deal.id,
            hotelName: deal.hotelName,
            roomType: deal.roomType,
            checkInDate: deal.checkInDate,
            checkOutDate: deal.checkOutDate,
            nights: deal.nights,
            guestFirstName: formData.firstName,
            guestLastName: formData.lastName,
            guestEmail: formData.email,
            guestPhone: formData.phone,
            guestCountryCode: formData.countryCode || "+61",
            specialRequests: formData.specialRequests || "",
            totalPrice: total,
            currency: deal.currency,
            paymentIntentId: paymentIntent,
          }),
        })
          .then(res => res.json())
          .then(result => {
            if (result.booking) {
              setBookingRef(result.booking.id);
              setBookingComplete(true);
              localStorage.removeItem(`booking_form_${dealId}`);
              toast({
                title: "Booking Confirmed!",
                description: `Your booking reference is ${result.booking.id}`,
              });
            } else {
              throw new Error(result.message || "Failed to create booking");
            }
          })
          .catch(error => {
            toast({
              title: "Booking Failed",
              description: error.message || "Something went wrong.",
              variant: "destructive",
            });
          })
          .finally(() => setIsSubmitting(false));
      } else {
        toast({
          title: "Payment Successful",
          description: "Please click Complete Booking to finalize.",
        });
      }
    }
  }, [redirectHandled, toast, deal, dealId]);

  // Restore form data from localStorage if returning from Stripe redirect
  const getSavedFormData = () => {
    try {
      const saved = localStorage.getItem(`booking_form_${dealId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const savedFormData = getSavedFormData();

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: savedFormData || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      countryCode: "+61",
      specialRequests: "",
    },
  });

  // Watch form fields to validate guest details before payment
  const watchedFields = form.watch(["firstName", "lastName", "email", "phone"]);
  
  useEffect(() => {
    const [firstName, lastName, email, phone] = watchedFields;
    const isValid = 
      firstName?.length > 0 && 
      lastName?.length > 0 && 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") && 
      /^[0-9]{8,}$/.test(phone || "");
    setGuestDetailsValid(isValid);
  }, [watchedFields]);

  const handlePaymentSuccess = async (intentId: string) => {
    setPaymentIntentId(intentId);
    setPaymentComplete(true);
    
    // Auto-submit the booking after payment success
    const formData = form.getValues();
    if (deal && formData.firstName && formData.lastName && formData.email && formData.phone) {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dealId: deal.id,
            hotelName: deal.hotelName,
            roomType: deal.roomType,
            checkInDate: deal.checkInDate,
            checkOutDate: deal.checkOutDate,
            nights: deal.nights,
            guestFirstName: formData.firstName,
            guestLastName: formData.lastName,
            guestEmail: formData.email,
            guestPhone: formData.phone,
            guestCountryCode: formData.countryCode,
            specialRequests: formData.specialRequests,
            totalPrice: grandTotal,
            currency: deal.currency,
            paymentIntentId: intentId,
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || "Failed to create booking");
        }
        
        setBookingRef(result.booking.id);
        setBookingComplete(true);
        
        toast({
          title: "Booking Confirmed!",
          description: `Your booking reference is ${result.booking.id}`,
        });
      } catch (error: any) {
        toast({
          title: "Booking Failed",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive",
    });
  };

  const onSubmit = async (data: BookingForm) => {
    if (!deal) return;
    
    // Require payment to be completed first
    if (!paymentComplete || !paymentIntentId) {
      toast({
        title: "Payment Required",
        description: "Please complete payment before finalizing your booking.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dealId: deal.id,
          hotelName: deal.hotelName,
          roomType: deal.roomType,
          checkInDate: deal.checkInDate,
          checkOutDate: deal.checkOutDate,
          nights: deal.nights,
          guestFirstName: data.firstName,
          guestLastName: data.lastName,
          guestEmail: data.email,
          guestPhone: data.phone,
          guestCountryCode: data.countryCode,
          specialRequests: data.specialRequests,
          totalPrice: grandTotal,
          currency: deal.currency,
          paymentIntentId: paymentIntentId,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to create booking");
      }
      
      setBookingRef(result.booking.id);
      setBookingComplete(true);
      
      toast({
        title: "Booking Confirmed!",
        description: `Your booking reference is ${result.booking.id}`,
      });
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <GapNightLogoLoader size={64} className="mb-4" />
          <p className="text-muted-foreground text-sm animate-pulse">Preparing your booking...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!deal || dealUnavailable) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 border border-border/50 text-center w-full">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {dealUnavailable ? "Deal Unavailable" : "Deal Not Found"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {dealUnavailable 
                ? "This deal has already been booked or is currently being reserved by another user. Please try a different deal."
                : "Sorry, we couldn't find the deal you're looking for. It may have been removed or the link might be incorrect."}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/deals">
                <Button data-testid="button-back-to-deals">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Deals
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" data-testid="button-back-home">
                  Back to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const discountPercent = Math.round(
    ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
  );
  
  const checkInDate = parseISO(deal.checkInDate);
  const checkOutDate = parseISO(deal.checkOutDate);
  const totalPrice = deal.dealPrice * deal.nights;
  const gstIncluded = Math.round(totalPrice / 11); // GST is 1/11 of GST-inclusive price
  const gapNightFee = Math.round(totalPrice * 0.03); // 3% Gap Night Fee (crossed out as promotion)
  const grandTotal = totalPrice; // Total is just the room price - GST is included, fee is waived

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-card rounded-2xl p-8 border border-border/50 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking Request Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Your booking request has been sent to {deal.hotelName}. You'll receive a confirmation email shortly.
            </p>
            
            <div className="bg-muted rounded-xl p-6 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Booking Reference</div>
                  <div className="font-bold text-foreground">{bookingRef}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Hotel</div>
                  <div className="font-semibold text-foreground">{deal.hotelName}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Check-in</div>
                  <div className="font-semibold text-foreground">{format(checkInDate, "EEE, MMM d, yyyy")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Check-out</div>
                  <div className="font-semibold text-foreground">{format(checkOutDate, "EEE, MMM d, yyyy")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Room Type</div>
                  <div className="font-semibold text-foreground">{deal.roomType}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-bold text-primary">{formatPrice(grandTotal, deal.currency)}</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setLocation("/deals")} data-testid="button-browse-more">
                Browse More Deals
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
                Go to Homepage
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Link href={`/deal/${dealId}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to deal</span>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
            <span className="text-sm font-medium text-primary">Your Selection</span>
          </div>
          <div className="h-px w-8 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
            <span className="text-sm font-medium text-primary">Your Details</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">3</div>
            <span className="text-sm font-medium text-muted-foreground">Confirmation</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-amber-500 text-white">Limited Availability</Badge>
                    <Badge variant="secondary" className="text-primary">
                      <Clock className="w-3 h-3 mr-1" />
                      Instant Confirmation
                    </Badge>
                  </div>
                </div>

                {/* Account prompt for non-logged-in users */}
                {!user && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">Sign in to track your bookings</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Create an account to view your booking history, manage reservations, and get exclusive deal alerts.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/login?redirect=/booking/${dealId}`}>
                            <Button size="sm" variant="default">Sign in</Button>
                          </Link>
                          <Link href={`/signup?redirect=/booking/${dealId}`}>
                            <Button size="sm" variant="outline">Create account</Button>
                          </Link>
                          <span className="text-xs text-muted-foreground self-center ml-2">
                            or continue as guest below
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Who's staying?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Guest names must match the valid ID which will be used at check-in.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Given name(s)" 
                              data-testid="input-first-name"
                              autoComplete="given-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Surname" 
                              data-testid="input-last-name"
                              autoComplete="family-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="email"
                                placeholder="you@example.com" 
                                className="pl-9"
                                data-testid="input-email"
                                autoComplete="email"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Booking confirmation will be sent to this email
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Select 
                                value={form.watch("countryCode")} 
                                onValueChange={(v) => form.setValue("countryCode", v)}
                              >
                                <SelectTrigger className="w-24" data-testid="select-country-code">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="+61">+61</SelectItem>
                                  <SelectItem value="+1">+1</SelectItem>
                                  <SelectItem value="+44">+44</SelectItem>
                                  <SelectItem value="+64">+64</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="relative flex-1">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="tel"
                                  placeholder="Phone number" 
                                  className="pl-9"
                                  data-testid="input-phone"
                                  autoComplete="tel-national"
                                  {...field} 
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <button 
                    type="button"
                    onClick={() => setShowSpecialRequests(!showSpecialRequests)}
                    className="w-full flex items-center justify-between"
                    data-testid="button-toggle-special-requests"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Special Requests</h2>
                      <span className="text-sm text-muted-foreground">(Optional)</span>
                    </div>
                    {showSpecialRequests ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  
                  {showSpecialRequests && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        The property will do its best, but cannot guarantee to fulfil all requests.
                      </p>
                      <FormField
                        control={form.control}
                        name="specialRequests"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="E.g. early check-in, high floor, quiet room, etc."
                                className="min-h-[100px]"
                                data-testid="input-special-requests"
                                autoComplete="off"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    How would you like to pay?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your payment details are encrypted and secure.
                  </p>

                  {!guestDetailsValid && (
                    <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Please fill in your guest details above before proceeding to payment.
                      </p>
                    </div>
                  )}

                  {paymentComplete ? (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Check className="w-5 h-5" />
                        <span className="font-semibold">Payment Successful</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your payment has been processed. Click below to complete your booking.
                      </p>
                    </div>
                  ) : (
                    <StripePaymentForm
                      amount={grandTotal}
                      currency={deal.currency}
                      dealId={deal.id}
                      hotelName={deal.hotelName}
                      guestEmail={form.watch("email") || ""}
                      onBeforePayment={() => {
                        // Save form data to localStorage before payment redirect
                        localStorage.setItem(`booking_form_${deal.id}`, JSON.stringify(form.getValues()));
                      }}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      disabled={!guestDetailsValid}
                    />
                  )}
                </div>

                {paymentComplete && (
                  <Button 
                    type="submit" 
                    size="lg"
                    className="w-full font-bold"
                    disabled={isSubmitting}
                    data-testid="button-complete-booking"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Confirming Booking...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Complete Booking
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  By completing this booking, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </Form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden sticky top-6">
              <div className="flex gap-4 p-4 border-b border-border/50">
                <div className="w-24 h-20 rounded-lg overflow-hidden shrink-0">
                  <img 
                    src={deal.imageUrl} 
                    alt={deal.hotelName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="font-bold text-foreground truncate">{deal.hotelName}</h3>
                    <span className="text-xs text-muted-foreground">{"★".repeat(deal.stars)}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                      {deal.rating}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({deal.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{deal.location}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-border/50">
                <h4 className="font-bold text-foreground mb-2">{deal.roomType}</h4>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>1 room</span>
                  <span>·</span>
                  <span>Non-smoking</span>
                </div>
              </div>

              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {format(checkInDate, "EEE, MMM d")} - {format(checkOutDate, "EEE, MMM d")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Check-in</div>
                    <div className="font-medium text-foreground">15:00 - 23:00</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Check-out</div>
                    <div className="font-medium text-foreground">Before 11:00</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{deal.nights} night{deal.nights > 1 ? "s" : ""}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Gap Night Deal
                  </Badge>
                </div>
              </div>

              <div className="p-4 border-b border-border/50">
                <h4 className="font-bold text-foreground mb-3">Price Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">1 room × {deal.nights} night{deal.nights > 1 ? "s" : ""}</span>
                    <span className="text-foreground">{formatPrice(totalPrice, deal.currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Includes GST ({formatPrice(gstIncluded, deal.currency)})</span>
                    <span className="text-green-600">Included</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gap Night Fee (3%)</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through">{formatPrice(gapNightFee, deal.currency)}</span>
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        Promotion - Waived
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                  <span className="font-bold text-lg text-foreground">Total</span>
                  <span className="font-bold text-xl text-foreground">{formatPrice(grandTotal, deal.currency)}</span>
                </div>
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <span className="text-xs line-through text-muted-foreground">
                    Was {formatPrice(deal.normalPrice * deal.nights, deal.currency)}
                  </span>
                  <Badge className="bg-amber-500 text-white text-xs">
                    {discountPercent}% off
                  </Badge>
                </div>
              </div>

              <div className="p-4">
                <h4 className="font-bold text-foreground mb-2">Cancellation Policy</h4>
                <p className="text-sm text-muted-foreground">
                  {deal.cancellation}. This is a gap night deal with special pricing - 
                  please check the property's specific cancellation terms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
