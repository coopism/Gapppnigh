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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

const bookingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Valid phone number is required").regex(/^[0-9]+$/, "Phone must contain only numbers"),
  countryCode: z.string().default("+61"),
  specialRequests: z.string().optional(),
  cardNumber: z.string()
    .transform(val => val.replace(/\s/g, ""))
    .refine(val => /^\d{16}$/.test(val), "Card number must be 16 digits"),
  cardholderName: z.string().min(1, "Cardholder name is required"),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, "Use MM/YY format"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits"),
});

type BookingForm = z.infer<typeof bookingSchema>;

export default function Booking() {
  const [, params] = useRoute("/booking/:dealId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const dealId = params?.dealId || "";
  const { data: deal, isLoading } = useDeal(dealId);
  
  const [showSpecialRequests, setShowSpecialRequests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      countryCode: "+61",
      specialRequests: "",
      cardNumber: "",
      cardholderName: "",
      expiryDate: "",
      cvv: "",
    },
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const onSubmit = async (data: BookingForm) => {
    if (!deal) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Skeleton className="h-6 w-32 mb-6" />
          
          {/* Progress indicator skeleton */}
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-px w-8" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-px w-8" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Badges skeleton */}
              <div className="bg-card rounded-xl p-6 border border-border/50">
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-7 w-40" />
                </div>
              </div>

              {/* Guest info section skeleton */}
              <div className="bg-card rounded-xl p-6 border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-4 w-80 mb-6" />
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* Special requests skeleton */}
              <div className="bg-card rounded-xl p-6 border border-border/50">
                <Skeleton className="h-6 w-full mb-4" />
              </div>

              {/* Payment skeleton */}
              <div className="bg-card rounded-xl p-6 border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* Submit button skeleton */}
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            {/* Booking summary skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden sticky top-6">
                {/* Hotel image and info */}
                <div className="flex gap-4 p-4 border-b border-border/50">
                  <Skeleton className="h-20 w-24 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>

                {/* Room type */}
                <div className="p-4 border-b border-border/50">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>

                {/* Dates */}
                <div className="p-4 border-b border-border/50 space-y-3">
                  <Skeleton className="h-5 w-64" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>

                {/* Price details */}
                <div className="p-4 border-b border-border/50 space-y-2">
                  <Skeleton className="h-5 w-32 mb-3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <div className="border-t border-border/50 mt-4 pt-4">
                    <Skeleton className="h-6 w-48" />
                  </div>
                </div>

                {/* Cancellation policy */}
                <div className="p-4">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 border border-border/50 text-center w-full">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Deal Not Found</h1>
            <p className="text-muted-foreground mb-8">
              Sorry, we couldn't find the deal you're looking for. It may have been removed or the link might be incorrect.
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

                  <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-lg">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Credit/Debit Card</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs font-bold">VISA</Badge>
                      <Badge variant="outline" className="text-xs font-bold">MC</Badge>
                      <Badge variant="outline" className="text-xs font-bold">AMEX</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="1234 5678 9012 3456"
                              maxLength={19}
                              data-testid="input-card-number"
                              autoComplete="cc-number"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCardNumber(e.target.value);
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardholderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cardholder Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Name as shown on card"
                              data-testid="input-cardholder-name"
                              autoComplete="cc-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="expiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="MM/YY"
                                maxLength={5}
                                data-testid="input-expiry"
                                autoComplete="cc-exp"
                                {...field}
                                onChange={(e) => {
                                  const formatted = formatExpiryDate(e.target.value);
                                  field.onChange(formatted);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cvv"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVV *</FormLabel>
                            <FormControl>
                              <Input 
                                type="password"
                                placeholder="123"
                                maxLength={4}
                                data-testid="input-cvv"
                                autoComplete="cc-csc"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-6 p-3 bg-muted/50 rounded-lg">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Your payment is protected by 256-bit SSL encryption
                    </span>
                  </div>
                </div>

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
                      Processing...
                    </>
                  ) : (
                    `Complete Booking - ${formatPrice(grandTotal, deal.currency)}`
                  )}
                </Button>

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
