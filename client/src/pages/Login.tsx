import { useState } from "react";
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
