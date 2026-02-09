import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Star, MapPin, Calendar, CreditCard, User, Mail, Phone,
  MessageSquare, ChevronDown, ChevronUp, Check, Shield, Clock, AlertCircle, Loader, Users, Heart,
  ScanFace, ExternalLink, RefreshCw, CheckCircle2, XCircle
} from "lucide-react";
import { StripePaymentForm } from "@/components/StripePaymentForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";

function formatReadableDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd" : "th";
  const month = date.toLocaleDateString("en-AU", { month: "long" });
  const year = date.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

const bookingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Valid phone number is required").regex(/^[0-9]+$/, "Phone must contain only numbers"),
  countryCode: z.string().default("+61"),
  guests: z.number().min(1).default(1),
  guestMessage: z.string().optional(),
  specialRequests: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export default function PropertyBooking() {
  const [, params] = useRoute("/booking/property/:propertyId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const propertyId = params?.propertyId || "";

  const [property, setProperty] = useState<any>(null);
  const [hostData, setHostData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSpecialRequests, setShowSpecialRequests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [guestDetailsValid, setGuestDetailsValid] = useState(false);

  // ID Verification state
  const [idStatus, setIdStatus] = useState<"loading" | "unverified" | "pending" | "verified" | "failed">("loading");
  const [verifyingId, setVerifyingId] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  // Parse query params for dates
  const urlParams = new URLSearchParams(window.location.search);
  const checkInDate = urlParams.get("checkIn") || "";
  const checkOutDate = urlParams.get("checkOut") || "";
  const nightsParam = parseInt(urlParams.get("nights") || "1");

  // Fetch property
  useEffect(() => {
    if (propertyId) {
      fetch(`/api/properties/${propertyId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setProperty(data.property);
            setHostData(data.host);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [propertyId]);

  // Check ID verification status on load
  useEffect(() => {
    if (!user) {
      setIdStatus("unverified");
      return;
    }
    fetch("/api/auth/verify-identity/status", { credentials: "include" })
      .then(r => r.ok ? r.json() : { status: "unverified" })
      .then(data => {
        setIdStatus(data.status === "verified" ? "verified" : data.status === "pending" ? "pending" : data.status === "failed" ? "failed" : "unverified");
      })
      .catch(() => setIdStatus("unverified"));
  }, [user]);

  const handleStartVerification = async () => {
    if (!user) return;
    setVerifyingId(true);
    try {
      const res = await fetch("/api/auth/verify-identity", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start verification");

      if (data.status === "verified") {
        setIdStatus("verified");
        toast({ title: "Already Verified", description: "Your ID has already been verified." });
      } else if (data.clientSecret) {
        // Stripe Identity uses a hosted verification page
        setIdStatus("pending");
        setVerificationUrl(data.clientSecret);
        toast({
          title: "Verification Started",
          description: "Please complete the ID verification. This page will update once done.",
        });
      }
    } catch (err: any) {
      toast({ title: "Verification Error", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingId(false);
    }
  };

  const handleRefreshVerification = async () => {
    try {
      const res = await fetch("/api/auth/verify-identity/status", { credentials: "include" });
      const data = await res.json();
      const newStatus = data.status === "verified" ? "verified" : data.status === "pending" ? "pending" : data.status === "failed" ? "failed" : "unverified";
      setIdStatus(newStatus);
      if (newStatus === "verified") {
        toast({ title: "ID Verified!", description: "You can now proceed with your booking." });
      } else if (newStatus === "pending") {
        toast({ title: "Still Processing", description: "Your verification is still being reviewed. Please check back in a moment." });
      }
    } catch {
      toast({ title: "Error", description: "Could not check verification status.", variant: "destructive" });
    }
  };

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
      phone: "",
      countryCode: "+61",
      guests: 1,
      guestMessage: "",
      specialRequests: "",
    },
  });

  const watchedFields = form.watch(["firstName", "lastName", "email", "phone"]);

  useEffect(() => {
    const [firstName, lastName, email, phone] = watchedFields;
    const isValid =
      (firstName?.length || 0) > 0 &&
      (lastName?.length || 0) > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") &&
      /^[0-9]{8,}$/.test(phone || "");
    setGuestDetailsValid(isValid);
  }, [watchedFields]);

  // Calculate pricing
  const nightlyRate = property?.baseNightlyRate || 0;
  const totalNightly = nightlyRate * nightsParam;
  const cleaningFee = property?.cleaningFee || 0;
  const serviceFee = Math.round(totalNightly * 0.08);
  const grandTotal = totalNightly + cleaningFee + serviceFee;

  const handlePaymentSuccess = async (intentId: string) => {
    setPaymentIntentId(intentId);
    setPaymentComplete(true);

    const formData = form.getValues();
    if (property && formData.firstName && formData.lastName && formData.email && formData.phone) {
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/properties/${propertyId}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            checkInDate,
            checkOutDate,
            guests: formData.guests,
            guestFirstName: formData.firstName,
            guestLastName: formData.lastName,
            guestEmail: formData.email,
            guestPhone: formData.phone,
            guestMessage: formData.guestMessage,
            specialRequests: formData.specialRequests,
            paymentIntentId: intentId,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to create booking");

        setBookingRef(result.booking.id);
        setBookingComplete(true);
        toast({
          title: "Booking Request Submitted!",
          description: `Your booking reference is ${result.booking.id}`,
        });
      } catch (error: any) {
        toast({
          title: "Booking Failed",
          description: error.message || "Something went wrong.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePaymentError = (error: string) => {
    toast({ title: "Payment Error", description: error, variant: "destructive" });
  };

  const onSubmit = async (data: BookingForm) => {
    if (!property || !paymentComplete || !paymentIntentId) {
      toast({ title: "Payment Required", description: "Please complete payment first.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          checkInDate,
          checkOutDate,
          guests: data.guests,
          guestFirstName: data.firstName,
          guestLastName: data.lastName,
          guestEmail: data.email,
          guestPhone: data.phone,
          guestMessage: data.guestMessage,
          specialRequests: data.specialRequests,
          paymentIntentId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create booking");

      setBookingRef(result.booking.id);
      setBookingComplete(true);
      toast({ title: "Booking Request Submitted!", description: `Reference: ${result.booking.id}` });
    } catch (error: any) {
      toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state - matches Booking.tsx
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

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 border border-border/50 text-center w-full">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Property Not Found</h1>
            <p className="text-muted-foreground mb-8">Sorry, we couldn't find this property.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/deals">
                <Button><ArrowLeft className="w-4 h-4 mr-2" /> Back to Deals</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Booking complete - matches Booking.tsx
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
              Your request has been sent to {hostData?.name || "the host"}. They'll review it and respond soon.
            </p>

            <div className="bg-muted rounded-xl p-6 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Booking Reference</div>
                  <div className="font-bold text-foreground">{bookingRef}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Property</div>
                  <div className="font-semibold text-foreground">{property.title}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Check-in</div>
                  <div className="font-semibold text-foreground">{formatReadableDate(checkInDate)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Check-out</div>
                  <div className="font-semibold text-foreground">{formatReadableDate(checkOutDate)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Nights</div>
                  <div className="font-semibold text-foreground">{nightsParam}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-bold text-primary">{formatPrice(grandTotal / 100, "AUD")}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setLocation("/deals")}>Browse More Deals</Button>
              <Button variant="outline" onClick={() => setLocation("/")}>Go to Homepage</Button>
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
        <Link href={`/stays/${propertyId}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to property</span>
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
            <span className="text-sm font-medium text-primary">Your Details</span>
          </div>
          <div className={`h-px w-8 ${idStatus === "verified" ? "bg-primary" : "bg-border"}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idStatus === "verified" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
            <span className={`text-sm font-medium ${idStatus === "verified" ? "text-primary" : "text-muted-foreground"}`}>Verify ID</span>
          </div>
          <div className={`h-px w-8 ${paymentComplete ? "bg-primary" : "bg-border"}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${paymentComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</div>
            <span className={`text-sm font-medium ${paymentComplete ? "text-primary" : "text-muted-foreground"}`}>Payment</span>
          </div>
          <div className={`h-px w-8 ${bookingComplete ? "bg-primary" : "bg-border"}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${bookingComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>4</div>
            <span className={`text-sm font-medium ${bookingComplete ? "text-primary" : "text-muted-foreground"}`}>Confirmation</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-amber-500 text-white">Gap Night Deal</Badge>
                    <Badge variant="secondary" className="text-primary">
                      <Clock className="w-3 h-3 mr-1" />
                      Host Approval Required
                    </Badge>
                  </div>
                </div>

                {/* Login prompt for non-authed users */}
                {!user && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">Sign in to book</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          You need an account with verified ID to book properties. Create one now to continue.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/login?redirect=/booking/property/${propertyId}?checkIn=${checkInDate}&checkOut=${checkOutDate}&nights=${nightsParam}`}>
                            <Button size="sm">Sign in</Button>
                          </Link>
                          <Link href={`/signup?redirect=/booking/property/${propertyId}?checkIn=${checkInDate}&checkOut=${checkOutDate}&nights=${nightsParam}`}>
                            <Button size="sm" variant="outline">Create account</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guest details - matches Booking.tsx */}
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Who's staying?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Guest names must match valid ID for check-in.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Given name(s)" autoComplete="given-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Surname" autoComplete="family-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="you@example.com" className="pl-9" autoComplete="email" {...field} />
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Booking confirmation will be sent here</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select value={form.watch("countryCode")} onValueChange={(v) => form.setValue("countryCode", v)}>
                              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="+61">+61</SelectItem>
                                <SelectItem value="+1">+1</SelectItem>
                                <SelectItem value="+44">+44</SelectItem>
                                <SelectItem value="+64">+64</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="relative flex-1">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input type="tel" placeholder="Phone number" className="pl-9" autoComplete="tel-national" {...field} />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Message to host */}
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Message to Host
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Introduce yourself and let the host know why you're visiting.
                  </p>
                  <FormField control={form.control} name="guestMessage" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea placeholder="Hi! We're visiting for a weekend getaway..." className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Special requests */}
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <button type="button" onClick={() => setShowSpecialRequests(!showSpecialRequests)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Special Requests</h2>
                      <span className="text-sm text-muted-foreground">(Optional)</span>
                    </div>
                    {showSpecialRequests ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {showSpecialRequests && (
                    <div className="mt-4">
                      <FormField control={form.control} name="specialRequests" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea placeholder="E.g. early check-in, extra towels, cot for baby..." className="min-h-[100px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}
                </div>

                {/* ID Verification Step */}
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <ScanFace className="w-5 h-5 text-primary" />
                    Identity Verification
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    For the safety of our hosts and guests, ID verification is required before booking a property.
                  </p>

                  {idStatus === "loading" && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Checking verification status...</span>
                    </div>
                  )}

                  {idStatus === "verified" && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold">Identity Verified</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your identity has been verified. You're all set to proceed with payment.
                      </p>
                    </div>
                  )}

                  {idStatus === "unverified" && user && (
                    <div className="space-y-3">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                          <Shield className="w-5 h-5" />
                          <span className="font-semibold">Verification Required</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You'll need to verify your identity with a government-issued photo ID and a selfie. This is a one-time process that protects both hosts and guests.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleStartVerification}
                        disabled={verifyingId}
                        className="w-full h-11"
                        variant="outline"
                      >
                        {verifyingId ? (
                          <><Loader className="w-4 h-4 mr-2 animate-spin" /> Starting Verification...</>
                        ) : (
                          <><ScanFace className="w-4 h-4 mr-2" /> Verify My Identity</>
                        )}
                      </Button>
                    </div>
                  )}

                  {idStatus === "unverified" && !user && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                        <Shield className="w-5 h-5" />
                        <span className="font-semibold">Sign In Required</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Please sign in first, then verify your identity to book this property.
                      </p>
                    </div>
                  )}

                  {idStatus === "pending" && (
                    <div className="space-y-3">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                          <Clock className="w-5 h-5" />
                          <span className="font-semibold">Verification In Progress</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your ID verification is being processed. This usually takes a few minutes. Click refresh to check the latest status.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleRefreshVerification}
                        variant="outline"
                        className="w-full h-11"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh Verification Status
                      </Button>
                    </div>
                  )}

                  {idStatus === "failed" && (
                    <div className="space-y-3">
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <XCircle className="w-5 h-5" />
                          <span className="font-semibold">Verification Failed</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your previous verification attempt was unsuccessful. Please try again with a clear photo of your ID.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleStartVerification}
                        disabled={verifyingId}
                        className="w-full h-11"
                        variant="outline"
                      >
                        {verifyingId ? (
                          <><Loader className="w-4 h-4 mr-2 animate-spin" /> Starting Verification...</>
                        ) : (
                          <><ScanFace className="w-4 h-4 mr-2" /> Try Again</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Payment - gated behind ID verification */}
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    How would you like to pay?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    A temporary hold is placed on your card. You are only charged when the host approves.
                  </p>

                  {idStatus !== "verified" && (
                    <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Please complete ID verification above before proceeding to payment.
                      </p>
                    </div>
                  )}

                  {idStatus === "verified" && !guestDetailsValid && (
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
                        <span className="font-semibold">Payment Authorized</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your card has been authorized. Click below to submit your booking request.
                      </p>
                    </div>
                  ) : idStatus === "verified" ? (
                    <StripePaymentForm
                      amount={grandTotal}
                      currency="AUD"
                      dealId={propertyId}
                      hotelName={property.title}
                      guestEmail={form.watch("email") || ""}
                      onBeforePayment={() => {
                        localStorage.setItem(`booking_form_prop_${propertyId}`, JSON.stringify(form.getValues()));
                      }}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      disabled={!guestDetailsValid}
                    />
                  ) : null}
                </div>

                {paymentComplete && (
                  <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader className="w-4 h-4 mr-2 animate-spin" /> Submitting Request...</>
                    ) : (
                      <><Check className="w-4 h-4 mr-2" /> Submit Booking Request</>
                    )}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this request, you agree to our Terms of Service and Privacy Policy.
                  You won't be charged until the host approves your booking.
                </p>
              </form>
            </Form>
          </div>

          {/* Right sidebar - Property summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden sticky top-6">
              <div className="flex gap-4 p-4 border-b border-border/50">
                <div className="w-24 h-20 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
                    alt={property.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{property.title}</h3>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-foreground font-medium">{Number(property.averageRating) > 0 ? property.averageRating : "New"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{property.city}, {property.state}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-border/50">
                <h4 className="font-bold text-foreground mb-2">
                  {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""} · {property.bathrooms} bath
                </h4>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Up to {property.maxGuests} guests</span>
                </div>
              </div>

              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {formatReadableDate(checkInDate)} - {formatReadableDate(checkOutDate)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Check-in</div>
                    <div className="font-medium text-foreground">{property.checkInTime || "15:00"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Check-out</div>
                    <div className="font-medium text-foreground">{property.checkOutTime || "10:00"}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{nightsParam} night{nightsParam > 1 ? "s" : ""}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Heart className="w-3 h-3 mr-1 fill-primary text-primary" />
                    Gap Night Deal
                  </Badge>
                </div>
              </div>

              <div className="p-4 border-b border-border/50">
                <h4 className="font-bold text-foreground mb-3">Price Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{nightsParam} night{nightsParam > 1 ? "s" : ""}</span>
                    <span className="text-foreground">{formatPrice(totalNightly / 100, "AUD")}</span>
                  </div>
                  {cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cleaning fee</span>
                      <span className="text-foreground">{formatPrice(cleaningFee / 100, "AUD")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GapNight service fee (8%)</span>
                    <span className="text-foreground">{formatPrice(serviceFee / 100, "AUD")}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                  <span className="font-bold text-lg text-foreground">Total</span>
                  <span className="font-bold text-xl text-foreground">{formatPrice(grandTotal / 100, "AUD")}</span>
                </div>
              </div>

              <div className="p-4">
                <h4 className="font-bold text-foreground mb-2">How it works</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary shrink-0" /> Your card is authorized but not charged</p>
                  <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary shrink-0" /> Host reviews your request within 24h</p>
                  <p className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Payment captured only when approved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
