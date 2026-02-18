import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CheckCircle, Mail, User, Lock, Phone, Home, Calendar, TrendingUp, Shield, KeyRound } from "lucide-react";

const AUS_PHONE_REGEX = /^(04\d{2}\s?\d{3}\s?\d{3}|\+614\d{8})$/;

export default function HostLogin() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [resendMsg, setResendMsg] = useState("");

  // Email verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/host/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Login failed"); return; }
      setLocation("/host/dashboard");
    } catch {
      setLoginError("Failed to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (regPassword !== regConfirmPassword) { setRegisterError("Passwords don't match"); return; }
    if (regPassword.length < 8) { setRegisterError("Password must be at least 8 characters"); return; }
    if (regPhone && !AUS_PHONE_REGEX.test(regPhone.replace(/\s/g, ""))) {
      setPhoneError("Enter a valid Australian mobile number (04XX XXX XXX)");
      return;
    }
    setPhoneError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/host/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone || undefined, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setRegisterError(data.error || "Registration failed"); return; }
      setShowVerification(true);
    } catch {
      setRegisterError("Failed to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/host/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Invalid code");
        return;
      }
      setLocation("/host/onboarding");
    } catch {
      setVerifyError("Failed to verify. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setResendMsg("");
    try {
      const res = await fetch("/api/host/resend-verification", { method: "POST", credentials: "include" });
      setResendMsg(res.ok ? "New code sent — check your email." : "Failed to resend. Please try again.");
    } catch {
      setResendMsg("Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left: Pitch Content - matching ListYourHotel style */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-primary/20">
                <Home className="w-3 h-3" />
                Become a Host
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight mb-4">
                Earn more from your <span className="text-primary">gap nights</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Got empty nights between bookings? GapNight connects you with quality guests looking for short stays at a discount — turning your idle property into income.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: TrendingUp,
                  title: "Maximize Occupancy",
                  desc: "Fill the gaps between bookings that would otherwise earn nothing. Every night counts.",
                },
                {
                  icon: Calendar,
                  title: "You Set the Terms",
                  desc: "Choose which dates to list, set your own discounts, and approve every booking request.",
                },
                {
                  icon: Shield,
                  title: "Verified Guests Only",
                  desc: "Every guest must verify their identity before booking. Your property stays protected.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 bg-primary/10 p-2 rounded-full h-fit">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              Looking to book a stay instead?{" "}
              <Link href="/deals" className="text-primary hover:underline font-medium">Browse deals</Link>
            </p>
          </div>

          {/* Right: Login/Register Card - matching ListYourHotel style */}
          <div className="relative">
            {/* Decorative background blob */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-[2rem] blur-2xl opacity-50 z-0"></div>

            <Card className="relative z-10 border-border/50 shadow-xl backdrop-blur-sm bg-card">
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 m-0 rounded-b-none">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Host Sign In</CardTitle>
                    <CardDescription>Access your hosting dashboard to manage properties, bookings, and availability.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      {loginError && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{loginError}</p>}
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            className="pl-9 bg-background"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-9 bg-background"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full text-lg font-bold h-12 shadow-lg shadow-primary/25 mt-4" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </CardContent>
                </TabsContent>

                <TabsContent value="register">
                  {showVerification ? (
                    <>
                      <CardHeader>
                        <CardTitle className="font-display text-2xl">Verify your email</CardTitle>
                        <CardDescription>
                          We sent a 6-digit code to <strong>{regEmail}</strong>. Enter it below to activate your account.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleVerifyEmail} className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Verification code</label>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="123456"
                                className="pl-9 bg-background text-center text-2xl font-mono tracking-widest h-14"
                                value={verifyCode}
                                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                maxLength={6}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                required
                              />
                            </div>
                            {verifyError && <p className="text-xs text-destructive mt-1">{verifyError}</p>}
                          </div>
                          <Button type="submit" className="w-full h-12 font-bold" disabled={verifyLoading || verifyCode.length !== 6}>
                            {verifyLoading ? "Verifying..." : "Verify Email"}
                          </Button>
                          <div className="text-center">
                            <button type="button" onClick={handleResendCode} disabled={resendLoading} className="text-xs text-primary hover:underline">
                              {resendLoading ? "Sending..." : "Didn't receive a code? Resend"}
                            </button>
                            {resendMsg && <p className="text-xs text-muted-foreground mt-1">{resendMsg}</p>}
                          </div>
                        </form>
                      </CardContent>
                    </>
                  ) : (
                  <>
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Become a Host</CardTitle>
                    <CardDescription>Create your account and start listing your property on GapNight.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      {registerError && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{registerError}</p>}
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="John Smith"
                            className="pl-9 bg-background"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            className="pl-9 bg-background"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Mobile number <span className="text-muted-foreground text-xs">(Australian, 04XX XXX XXX)</span></label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="0412 345 678"
                            className={`pl-9 bg-background ${phoneError ? "border-destructive" : ""}`}
                            value={regPhone}
                            inputMode="tel"
                            onChange={(e) => { setRegPhone(e.target.value); setPhoneError(""); }}
                          />
                        </div>
                        {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Min 8 characters"
                            className="pl-9 bg-background"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                            minLength={8}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Confirm your password"
                            className="pl-9 bg-background"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full text-lg font-bold h-12 shadow-lg shadow-primary/25 mt-4" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create Host Account"}
                      </Button>
                    </form>
                  </CardContent>
                  </>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
