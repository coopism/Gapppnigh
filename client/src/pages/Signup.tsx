import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, User, Check, X, ArrowLeft, UserPlus } from "lucide-react";
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Create account</h1>
            <p className="text-muted-foreground mt-2">Join GapNight to unlock exclusive hotel deals</p>
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
