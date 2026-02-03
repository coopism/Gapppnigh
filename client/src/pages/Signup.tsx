import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, User, Check, X, ArrowLeft } from "lucide-react";
import { signup, validatePassword, getPasswordStrength } from "@/hooks/useAuth";
import { GapNightLogo } from "@/components/GapNightLogo";
import { Footer } from "@/components/Footer";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Initialize Google Sign-In when script loads
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      // @ts-ignore
      if (window.google?.accounts?.id) {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            console.log('Google callback triggered', response);
            setIsLoading(true);
            setError(null);
            try {
              const params = new URLSearchParams(window.location.search);
              const redirect = params.get("redirect") || "/account";
              console.log('Sending credential to server...');
              const res = await fetch("/api/auth/oauth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ credential: response.credential, redirectUrl: redirect }),
              });
              console.log('Server response status:', res.status);
              const data = await res.json();
              console.log('Server response data:', data);
              if (data.success) {
                console.log('Redirecting to:', data.redirectUrl || "/account");
                window.location.href = data.redirectUrl || "/account";
              } else {
                console.error('OAuth failed:', data.message);
                setError(data.message || "Google sign-up failed");
              }
            } catch (err) {
              console.error('OAuth error:', err);
              setError("Google sign-up failed: " + (err instanceof Error ? err.message : String(err)));
            }
            setIsLoading(false);
          },
        });

        if (googleButtonRef.current) {
          // @ts-ignore
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: googleButtonRef.current.offsetWidth,
            text: "signup_with",
            shape: "rectangular",
            logo_alignment: "left",
          });
        }
        setGoogleLoaded(true);
      }
    };

    // Wait for script to load with event listener
    const handleGoogleLoad = () => {
      // @ts-ignore
      if (window.google?.accounts?.id) {
        initGoogle();
      }
    };

    // Check if already loaded
    // @ts-ignore
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      // Try multiple approaches
      window.addEventListener('load', handleGoogleLoad);
      
      const checkGoogle = setInterval(() => {
        // @ts-ignore
        if (window.google?.accounts?.id) {
          clearInterval(checkGoogle);
          window.removeEventListener('load', handleGoogleLoad);
          initGoogle();
        }
      }, 100);

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkGoogle);
        window.removeEventListener('load', handleGoogleLoad);
        setGoogleFailed(true);
      }, 10000);
      
      return () => {
        clearInterval(checkGoogle);
        clearTimeout(timeout);
        window.removeEventListener('load', handleGoogleLoad);
      };
    }
  }, [setLocation]);

  const passwordValidation = validatePassword(password);
  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (!passwordValidation.valid) {
      setError("Password does not meet requirements");
      setFieldError("password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setFieldError("confirmPassword");
      return;
    }

    setIsLoading(true);

    const result = await signup(email, password, name || undefined);

    setIsLoading(false);

    if (result.success) {
      setLocation("/account?verified=pending");
    } else {
      setError(result.error || "Signup failed");
      setFieldError(result.field || null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="group-hover:scale-110 transition-transform">
                <GapNightLogo size={32} />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">GapNight</span>
            </Link>
            <Link href="/deals">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to deals
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Create account</h1>
            <p className="text-muted-foreground">Join GapNight to unlock exclusive hotel deals</p>
          </div>

          {/* Signup Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-10 h-11 rounded-xl ${fieldError === "email" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-10 h-11 rounded-xl ${fieldError === "password" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {password && (
                  <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-16">{passwordStrength.label}</span>
                    </div>
                    <ul className="text-xs space-y-1.5 mt-2">
                      <li className={`flex items-center gap-2 ${password.length >= 10 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {password.length >= 10 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        At least 10 characters
                      </li>
                      <li className={`flex items-center gap-2 ${passwordValidation.valid ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {passwordValidation.valid ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        Include 3 of: uppercase, lowercase, number, symbol
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 h-11 rounded-xl ${fieldError === "confirmPassword" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <X className="h-3 w-3" /> Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                    <Check className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all mt-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>

            {/* OAuth Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              {/* Google Sign-In Button - rendered by Google */}
              <div 
                ref={googleButtonRef} 
                className="w-full [&>div]:w-full [&>div>div]:w-full [&>div>div]:!h-11 [&>div>div]:!rounded-xl [&>div>div]:!border-input"
              />
              {!googleLoaded && !googleFailed && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl font-medium"
                  disabled
                >
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading Google Sign-In...
                </Button>
              )}
              {googleFailed && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl font-medium text-muted-foreground"
                  disabled
                >
                  <svg className="w-5 h-5 mr-2 opacity-50" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google Sign-In unavailable
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl font-medium"
                onClick={() => {
                  setError("Apple Sign-In coming soon");
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-medium text-center text-muted-foreground">Why create an account?</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                "Track all your bookings in one place",
                "Get personalized deal alerts",
                "Faster checkout on future bookings",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
