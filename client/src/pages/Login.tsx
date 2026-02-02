import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import { login } from "@/hooks/useAuth";
import { GapNightLogo } from "@/components/GapNightLogo";
import { Footer } from "@/components/Footer";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
            setIsLoading(true);
            setError(null);
            try {
              const params = new URLSearchParams(window.location.search);
              const redirect = params.get("redirect") || "/account";
              const res = await fetch("/api/auth/oauth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ credential: response.credential, redirectUrl: redirect }),
              });
              const data = await res.json();
              if (data.success) {
                setLocation(data.redirectUrl || "/account");
              } else {
                setError(data.message || "Google sign-in failed");
              }
            } catch (err) {
              setError("Google sign-in failed");
            }
            setIsLoading(false);
          },
        });

        // Render the Google button
        if (googleButtonRef.current) {
          // @ts-ignore
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with",
            shape: "pill",
          });
        }
        setGoogleLoaded(true);
      }
    };

    // Check if already loaded
    // @ts-ignore
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      // Wait for script to load
      const checkGoogle = setInterval(() => {
        // @ts-ignore
        if (window.google?.accounts?.id) {
          clearInterval(checkGoogle);
          initGoogle();
        }
      }, 100);

      // Timeout after 5 seconds - show manual button
      const timeout = setTimeout(() => {
        clearInterval(checkGoogle);
        setGoogleFailed(true);
      }, 5000);
      return () => {
        clearInterval(checkGoogle);
        clearTimeout(timeout);
      };
    }
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setIsLoading(true);

    const result = await login(email, password, rememberMe);

    setIsLoading(false);

    if (result.success) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/account";
      setLocation(redirect);
    } else {
      setError(result.error || "Login failed");
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
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to access your bookings and saved deals</p>
          </div>

          {/* Login Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-10 h-11 rounded-xl ${fieldError === "password" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="rounded"
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-muted-foreground">
                  Keep me signed in for 30 days
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* OAuth Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              {/* Google Sign-In Button - rendered by Google */}
              <div 
                ref={googleButtonRef} 
                className="w-full flex justify-center [&>div]:w-full [&>div>div]:w-full"
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
                  // Apple Sign-In requires additional setup
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
                New to GapNight?{" "}
                <Link href="/signup" className="text-primary hover:underline font-semibold">
                  Create an account
                </Link>
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">50%+</div>
              <div className="text-xs text-muted-foreground">Average savings</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">4.8★</div>
              <div className="text-xs text-muted-foreground">Hotel quality</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">24hr</div>
              <div className="text-xs text-muted-foreground">Last-minute deals</div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
