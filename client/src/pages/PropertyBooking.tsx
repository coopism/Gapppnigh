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
  ScanFace, ExternalLink, RefreshCw, CheckCircle2, XCircle, FileText
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
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0); // in cents
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Server-authoritative pricing (fix #11)
  const [priceQuote, setPriceQuote] = useState<any>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  // ID Verification state
  const [idStatus, setIdStatus] = useState<"loading" | "unverified" | "pending" | "verified" | "failed">("loading");
  const [verifyingId, setVerifyingId] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  // Parse query params for dates
  const urlParams = new URLSearchParams(window.location.search);
  const checkInDate = urlParams.get("checkIn") || "";
  const checkOutDate = urlParams.get("checkOut") || "";
  const nightsParam = parseInt(urlParams.get("nights") || "1");

  // Fetch property and server-authoritative price quote
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

      // Fetch server-authoritative price quote
      if (checkInDate && checkOutDate) {
        setPriceLoading(true);
        fetch(`/api/properties/${propertyId}/price-quote?checkIn=${checkInDate}&checkOut=${checkOutDate}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data) setPriceQuote(data); })
          .catch(() => {})
          .finally(() => setPriceLoading(false));
      } else {
        setPriceLoading(false);
      }
    }
  }, [propertyId, checkInDate, checkOutDate]);

  // Fetch user credit balance
  useEffect(() => {
    if (!user) return;
    fetch("/api/auth/rewards", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.rewards?.creditBalance) {
          setCreditBalance(data.rewards.creditBalance);
        }
      })
      .catch(() => {});
  }, [user]);

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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start verification");

      if (data.status === "verified") {
        setIdStatus("verified");
        toast({ title: "Already Verified", description: "Your ID has already been verified." });
      } else if (data.url) {
        // Save form data to localStorage before redirecting so it's not lost
        const currentFormData = form.getValues();
        localStorage.setItem(`booking_form_${propertyId}`, JSON.stringify(currentFormData));
        setIdStatus("pending");
        window.location.href = data.url;
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

  // Restore saved form data if returning from ID verification redirect
  const getSavedFormData = () => {
    try {
      const saved = localStorage.getItem(`booking_form_${propertyId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.removeItem(`booking_form_${propertyId}`);
        return parsed;
      }
    } catch {}
    return null;
  };
  const savedFormData = getSavedFormData();

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: savedFormData || {
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

  // Server-authoritative pricing (fix #11 — discount now applied correctly)
  const baseNightlyTotal = priceQuote?.baseNightlyTotal || (property?.baseNightlyRate || 0) * nightsParam;
  const nightlyRate = priceQuote?.avgNightlyRate || property?.baseNightlyRate || 0;
  const totalNightly = priceQuote?.discountedNightlyTotal || baseNightlyTotal;
  const discountPercent = priceQuote?.discountPercent || 0;
  const isGapNight = priceQuote?.isGapNight || false;
  const cleaningFee = priceQuote?.cleaningFee || 0;
  const serviceFee = priceQuote?.serviceFee || 0;
  const creditApplied = Math.min(creditBalance, totalNightly);
  const subtotal = totalNightly + cleaningFee + serviceFee - creditApplied;
  const stripeFee = priceQuote?.stripeFee || (subtotal > 0 ? Math.round(subtotal * 1.75 / 100) + 30 : 0);
  const grandTotal = priceQuote?.grandTotal || (subtotal + stripeFee);

  const handlePaymentSuccess = async (intentId: string) => {
    setPaymentIntentId(intentId);
    setPaymentComplete(true);

    // Fix #8: Enforce policy checkbox before submitting booking
    if (!policyAgreed) {
      setPolicyError(true);
      toast({ title: "Policy Required", description: "Please agree to the Booking & Liability Policy before submitting.", variant: "destructive" });
      // Scroll to policy checkbox
      document.getElementById("policy-agree")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

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
            policyAccepted: true,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          // Fix #9: Show modal instead of auto-redirecting to contact page
          if (result.error === "Name mismatch") {
            setShowVerificationModal(true);
            return;
          }
          throw new Error(result.message || result.error || "Failed to create booking");
        }

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
    if (!policyAgreed) {
      toast({ title: "Policy Required", description: "Please agree to the Booking & Liability Policy before submitting.", variant: "destructive" });
      return;
    }
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
      if (!response.ok) {
        if (result.error === "Name mismatch") {
          setShowVerificationModal(true);
          return;
        }
        throw new Error(result.message || result.error || "Failed to create booking");
      }

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

            {/* Fix #12: Prominent post-booking signup prompt for guest users */}
            {!user && (
              <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-6 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-1">Create your account now</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign up with <span className="font-semibold text-foreground">{form.getValues("email")}</span> to:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Track your booking status in real time</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Message the host directly</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Get exclusive gap night deal alerts</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Download your booking receipt</li>
                    </ul>
                    <Link href={`/signup?email=${encodeURIComponent(form.getValues("email"))}&redirect=/account`}>
                      <Button className="font-bold w-full sm:w-auto">Create Free Account</Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

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

                {/* Guest info banner for non-logged-in users */}
                {!user && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Booking as a guest</p>
                      <p className="text-xs text-muted-foreground">You can book without an account. Create one after to manage your booking.</p>
                    </div>
                    <Link href={`/login?redirect=${encodeURIComponent(`/booking/property/${propertyId}?checkIn=${checkInDate}&checkOut=${checkOutDate}&nights=${nightsParam}`)}`}>
                      <Button size="sm" variant="outline" className="shrink-0 text-xs">Sign In</Button>
                    </Link>
                  </div>
                )}

                {/* Guest details */}
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Who's staying?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    Guest names must match valid ID for check-in.
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Full name must match your government ID exactly.
                    </p>
                  </div>

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
                              <Input type="tel" inputMode="tel" placeholder="Phone number" className="pl-9" autoComplete="tel-national" {...field} />
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

                {/* ID Verification Step - only for authenticated users */}
                {user && (
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
                )}

                {/* Payment - gated behind ID verification for logged-in users, open for guests */}
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    How would you like to pay?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    A temporary hold is placed on your card. You are only charged when the host approves.
                  </p>

                  {user && idStatus !== "verified" && (
                    <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Please complete ID verification above before proceeding to payment.
                      </p>
                    </div>
                  )}

                  {((!user) || idStatus === "verified") && !guestDetailsValid && (
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
                  ) : (!user || idStatus === "verified") ? (
                    <StripePaymentForm
                      amount={grandTotal / 100}
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

                {/* Booking Policy Agreement */}
                <div className={`bg-card rounded-xl p-5 border transition-colors ${policyError && !policyAgreed ? "border-destructive ring-2 ring-destructive/20" : "border-border/50"}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="policy-agree"
                      checked={policyAgreed}
                      onChange={e => { setPolicyAgreed(e.target.checked); if (e.target.checked) setPolicyError(false); }}
                      className={`mt-1 h-4 w-4 rounded border-border accent-primary shrink-0 ${policyError && !policyAgreed ? "ring-2 ring-destructive" : ""}`}
                    />
                    <label htmlFor="policy-agree" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I have read and agree to the <Link href="/booking-policy" className="text-primary font-medium hover:underline">GapNight Booking & Liability Policy</Link>, including the guest responsibilities, damage liability, cancellation terms, and dispute resolution process. I understand that I am financially responsible for any damage caused to the property during my stay.
                    </label>
                  </div>
                  {policyError && !policyAgreed && (
                    <p className="text-xs text-destructive mt-2 ml-7 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> You must agree to the policy before booking
                    </p>
                  )}
                </div>

                {paymentComplete && (
                  <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting || !policyAgreed}>
                    {isSubmitting ? (
                      <><Loader className="w-4 h-4 mr-2 animate-spin" /> Submitting Request...</>
                    ) : (
                      <><Check className="w-4 h-4 mr-2" /> Submit Booking Request</>
                    )}
                  </Button>
                )}

                {!policyAgreed && paymentComplete && (
                  <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Please agree to the Booking Policy to continue
                  </p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this request, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>, <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and <Link href="/booking-policy" className="text-primary hover:underline">Booking & Liability Policy</Link>.
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
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-lg text-foreground">Total</span>
                  <span className="font-bold text-2xl text-foreground">{priceLoading ? "..." : formatPrice(grandTotal / 100, "AUD")}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  {/* Base price line */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{nightsParam} night{nightsParam > 1 ? "s" : ""} × {formatPrice((property?.baseNightlyRate || nightlyRate) / 100, "AUD")}</span>
                    <span className="text-foreground">{formatPrice(baseNightlyTotal / 100, "AUD")}</span>
                  </div>
                  {/* Gap night discount */}
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Gap Night discount ({discountPercent}% off)</span>
                      <span>−{formatPrice((baseNightlyTotal - totalNightly) / 100, "AUD")}</span>
                    </div>
                  )}
                  {/* Cleaning fee */}
                  {cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cleaning fee</span>
                      <span className="text-foreground">{formatPrice(cleaningFee / 100, "AUD")}</span>
                    </div>
                  )}
                  {/* Service fee */}
                  {serviceFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service fee</span>
                      <span className="text-foreground">{formatPrice(serviceFee / 100, "AUD")}</span>
                    </div>
                  )}
                  {creditApplied > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Credit applied</span>
                      <span>−{formatPrice(creditApplied / 100, "AUD")}</span>
                    </div>
                  )}
                  {stripeFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment processing</span>
                      <span className="text-foreground">{formatPrice(stripeFee / 100, "AUD")}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">All fees shown upfront — the price you see is the price you pay.</p>
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

      {/* Fix #9: Verification Failure Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Verification Failed</h2>
              <p className="text-sm text-muted-foreground mb-1">
                The name you entered doesn't match your verified government ID.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 my-3 w-full">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Your full name must match your government ID exactly.
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                Please correct your first and last name in the form above, or contact support if you believe this is an error.
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  className="flex-1 font-semibold"
                  onClick={() => {
                    setShowVerificationModal(false);
                    // Scroll to name fields
                    document.getElementById("firstName")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  Try Again
                </Button>
                <Link href="/contact" className="flex-1">
                  <Button variant="outline" className="w-full font-semibold">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
